import { useEffect, useRef, useState, useCallback } from 'react'
import type { Viewer } from 'cesium'
import { 
  Cartesian3, 
  Math as CesiumMath, 
  HeadingPitchRange,
  EasingFunction
} from 'cesium'
import { createViewer } from '../lib/cesium/createViewer'
import { VenueMarkerManager } from '../lib/cesium/markerUtils'
import { PremiumCameraManager } from '../lib/cesium/cameraUtils'
import { RouteManager } from '../lib/cesium/addRoute'
import { BuildingManager } from '../lib/cesium/buildingUtils'
import type { Stop } from '../lib/data/types'

interface GlobeProps {
  onReady?: (viewer: Viewer, cameraManager: PremiumCameraManager) => void
  onImageryReady?: () => void
  hideUntilReady?: boolean
  stops?: Stop[]
  selectedStopId?: string | null
  onSelectStop?: (stopId: string) => void
}

export function Globe({ 
  onReady, 
  onImageryReady, 
  hideUntilReady = false, 
  stops = [], 
  selectedStopId = null, 
  onSelectStop 
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const creditContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const markerManagerRef = useRef<VenueMarkerManager | null>(null)
  const cameraManagerRef = useRef<PremiumCameraManager | null>(null)
  const routeManagerRef = useRef<RouteManager | null>(null)
  const buildingManagerRef = useRef<BuildingManager | null>(null)
  const initOnceRef = useRef(false)
  const [isReady, setIsReady] = useState(false)

  // Stable callback to avoid recreating the onReady function
  const onReadyCallback = useCallback((viewer: Viewer, cameraManager: PremiumCameraManager) => {
    console.log('[Cesium] Globe ready for interactions')
    onReady?.(viewer, cameraManager)
  }, [onReady])

  // Initialize Cesium viewer ONCE
  useEffect(() => {
    if (!containerRef.current) return
    if (initOnceRef.current) return
    
    initOnceRef.current = true
    console.log('[Cesium] init viewer')

    const initializeViewer = async () => {
      try {
        // Create Cesium viewer with credit container
        const result = await createViewer(
          containerRef.current!, 
          creditContainerRef.current || undefined
        )

        viewerRef.current = result.viewer
        
        // Set up imagery ready callback
        result.onImageryReady(() => {
          console.log('[Globe] Imagery ready callback triggered')
          onImageryReady?.()
        })
        
        // Wait for imagery to be ready
        await result.isReady
        
        // Fade in the globe (only if not hidden until ready)
        if (containerRef.current && !hideUntilReady) {
          containerRef.current.style.opacity = '1'
        }
        
        setIsReady(true)
        
        // Initialize camera manager
        cameraManagerRef.current = new PremiumCameraManager(result.viewer)
        
        // Initialize route manager
        routeManagerRef.current = new RouteManager(result.viewer)
        
        // Initialize marker manager
        markerManagerRef.current = new VenueMarkerManager(result.viewer)
        if (onSelectStop) {
          markerManagerRef.current.setOnMarkerClick(onSelectStop)
        }

        // Initialize building manager
        buildingManagerRef.current = new BuildingManager(result.viewer)

        // Routes are now always visible - no camera change listener needed
        
        // Set initial camera position if we have stops
        if (stops.length > 0) {
          cameraManagerRef.current.setInitialPosition(stops)
          
          // Initialize markers and routes immediately if stops are available
          console.log('[Globe] Initializing markers and routes on viewer creation')
          markerManagerRef.current.updateMarkers(stops, selectedStopId)
          
          if (stops.length > 1) {
            routeManagerRef.current.addTourRoute(stops)
          }
        }
        
        onReadyCallback(result.viewer, cameraManagerRef.current!)
      } catch (error) {
        console.error('Failed to initialize Cesium viewer:', error)
        setIsReady(true) // Show something even if failed
      }
    }

    initializeViewer()

    // Cleanup on unmount
    return () => {
      console.log('[Cesium] destroy viewer')
      if (cameraManagerRef.current) {
        cameraManagerRef.current.cancelFlight()
        cameraManagerRef.current = null
      }
      if (routeManagerRef.current) {
        routeManagerRef.current.destroy()
        routeManagerRef.current = null
      }
      if (markerManagerRef.current) {
        markerManagerRef.current.destroy()
        markerManagerRef.current = null
      }
      if (buildingManagerRef.current) {
        buildingManagerRef.current.clearAllBuildings()
        buildingManagerRef.current = null
      }
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
      initOnceRef.current = false
    }
  }, []) // Empty dependency array - init ONCE only

  // Separate effect to handle onReady callback changes
  useEffect(() => {
    if (isReady && viewerRef.current && cameraManagerRef.current) {
      console.log('[Cesium] Calling onReady callback (viewer already exists)')
      onReadyCallback(viewerRef.current, cameraManagerRef.current!)
    }
  }, [onReadyCallback, isReady])

  // Update markers and routes when stops change or viewer becomes ready
  useEffect(() => {
    if (markerManagerRef.current && stops.length > 0 && isReady) {
      console.log('[Globe] Updating markers for stops')
      markerManagerRef.current.updateMarkers(stops, selectedStopId)
    }
    
    if (routeManagerRef.current && stops.length > 1 && isReady) {
      console.log('[Globe] Updating route for stops')
      routeManagerRef.current.addTourRoute(stops)
    }
  }, [stops, selectedStopId, isReady])

  // Initialize markers and routes when both viewer is ready and stops are available
  useEffect(() => {
    if (isReady && stops.length > 0) {
      console.log('[Globe] Viewer and stops ready - initializing markers and routes')
      
      // Initialize markers
      if (markerManagerRef.current) {
        markerManagerRef.current.updateMarkers(stops, selectedStopId)
      }
      
      // Initialize routes
      if (routeManagerRef.current && stops.length > 1) {
        routeManagerRef.current.addTourRoute(stops)
      }
    }
  }, [isReady, stops]) // Run when either viewer becomes ready OR stops data arrives

  // Set initial overview position when stops are first loaded
  useEffect(() => {
    if (cameraManagerRef.current && stops.length > 0 && isReady && !selectedStopId) {
      console.log('[Globe] Setting initial overview position for stops')
      // Small delay to ensure everything is initialized
      setTimeout(() => {
        cameraManagerRef.current?.flyToOverview(stops, 2.5)
      }, 500)
    }
  }, [stops, isReady, selectedStopId])

  // Update marker click callback when onSelectStop changes
  useEffect(() => {
    if (markerManagerRef.current && onSelectStop) {
      markerManagerRef.current.setOnMarkerClick(onSelectStop)
    }
  }, [onSelectStop])

  // Fly to selected stop when selection changes (direct viewer.flyTo)
  useEffect(() => {
    if (viewerRef.current && selectedStopId && stops.length > 0 && isReady) {
      const selectedStop = stops.find(stop => stop.id === selectedStopId)
      if (selectedStop && selectedStop.lat && selectedStop.lng) {
        console.log(`[Globe] Flying to selected stop: ${selectedStop.city}`)
        
        // Try to find marker entity first
        const markerEntity = markerManagerRef.current?.getMarkerEntity?.(selectedStopId)
        
        if (markerEntity) {
          // Fly to entity with offset
          const offset = new HeadingPitchRange(
            CesiumMath.toRadians(0),
            CesiumMath.toRadians(-40),
            2500 // range meters
          )
          viewerRef.current.flyTo(markerEntity, { duration: 2.0, offset })
        } else {
          // Fallback to camera.flyTo
          viewerRef.current.camera.flyTo({
            destination: Cartesian3.fromDegrees(selectedStop.lng, selectedStop.lat, 3500),
            orientation: { 
              heading: 0, 
              pitch: CesiumMath.toRadians(-40), 
              roll: 0 
            },
            duration: 2.0,
            easingFunction: EasingFunction.CUBIC_IN_OUT,
          })
        }
      }
    }
  }, [selectedStopId, stops, isReady])

  // Load buildings when a stop is selected (fire-and-forget, never blocks camera)
  useEffect(() => {
    if (buildingManagerRef.current && selectedStopId && stops.length > 0 && isReady) {
      const selectedStop = stops.find(stop => stop.id === selectedStopId)
      if (selectedStop) {
        console.log(`[Globe] Loading buildings for selected stop: ${selectedStop.city}`)
        // Fire-and-forget: never await, never block camera motion
        void buildingManagerRef.current.loadBuildingsForStop(selectedStop).catch(error => {
          console.warn(`[Buildings] Failed to load for ${selectedStop.city}:`, error)
        })
      }
    }
  }, [selectedStopId, stops, isReady])

  // Load buildings for all stops on initial load (optional - for overview)
  useEffect(() => {
    if (buildingManagerRef.current && stops.length > 0 && isReady) {
      console.log('[Globe] Pre-loading buildings for all stops')
      stops.forEach(stop => {
        buildingManagerRef.current?.loadBuildingsForStop(stop).catch(error => {
          console.warn(`[Globe] Failed to pre-load buildings for ${stop.city}:`, error)
        })
      })
    }
  }, [stops, isReady])

  return (
    <>
      {/* Loading Overlay - CSS overlay, not conditional rendering */}
      <div 
        className="loading-overlay"
        style={{ 
          opacity: isReady ? 0 : 1,
          pointerEvents: isReady ? 'none' : 'auto'
        }}
      >
        <div className="glass-panel" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <div 
            style={{ 
              fontSize: 'var(--font-size-lg)', 
              color: 'var(--text)', 
              marginBottom: 'var(--space-2)' 
            }}
          >
            Loading experience...
          </div>
          <div 
            style={{ 
              fontSize: 'var(--font-size-sm)', 
              color: 'var(--text-muted)' 
            }}
          >
            Preparing high-resolution imagery
          </div>
        </div>
      </div>

      {/* Cesium Container - ALWAYS rendered, never conditional */}
      <div 
        ref={containerRef}
        className="cesiumRoot"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: hideUntilReady ? 0 : (isReady ? 1 : 0), // Hide until ready or fade in normally
          transform: hideUntilReady ? 'scale(1.02)' : 'scale(1)',
          transition: 'opacity 650ms cubic-bezier(0.23, 1, 0.32, 1), transform 650ms cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      />

      {/* Hidden Credit Container */}
      <div 
        ref={creditContainerRef}
        style={{ display: 'none' }}
      />
    </>
  )
}