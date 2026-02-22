import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { Viewer, ImageryLayer } from 'cesium'
import { 
  Cartesian3, 
  Math as CesiumMath, 
  HeadingPitchRange,
  EasingFunction
} from 'cesium'
import { createViewer, setMapMode } from '../lib/cesium/createViewer'
import { VenueMarkerManager, type MarkerHoverInfo } from '../lib/cesium/markerUtils'
import { PremiumCameraManager } from '../lib/cesium/cameraUtils'
import { RouteManager } from '../lib/cesium/addRoute'
import { BuildingManager } from '../lib/cesium/buildingUtils'
import { AutoRotateController, setOverviewCamera, removeOverviewConstraints, applyOverviewConstraints } from '../lib/cesium/autoRotate'
import { OVERVIEW_DISTANCE_MULTIPLIER } from '../lib/cesium/camera/overview'
import { getEarthRadius, computeEarthCenteredPoseAboveLatLng } from '../lib/cesium/camera/poses'
import type { Stop } from '../lib/data/types'

interface GlobeProps {
  onReady?: (viewer: Viewer, cameraManager: PremiumCameraManager) => void
  onImageryReady?: () => void
  hideUntilReady?: boolean
  stops?: Stop[]
  viewMode?: 'overview' | 'venue'
  selectedStopId?: string | null
  onSelectStop?: (stopId: string) => void
  onFlyToOverview?: (flyToOverviewFn: (stops: Stop[]) => void) => void
  onFlyToOverviewAboveStop?: (flyToOverviewAboveStopFn: (stop: Stop) => Promise<void>) => void
}

export function Globe({ 
  onReady, 
  onImageryReady, 
  hideUntilReady = false, 
  stops = [], 
  viewMode = 'overview',
  selectedStopId = null, 
  onSelectStop,
  onFlyToOverview,
  onFlyToOverviewAboveStop
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const creditContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const gibsLayerRef = useRef<ImageryLayer | null>(null)
  const osmLayerRef = useRef<ImageryLayer | null>(null)
  const markerManagerRef = useRef<VenueMarkerManager | null>(null)
  const cameraManagerRef = useRef<PremiumCameraManager | null>(null)
  const routeManagerRef = useRef<RouteManager | null>(null)
  const buildingManagerRef = useRef<BuildingManager | null>(null)
  const autoRotateControllerRef = useRef<AutoRotateController | null>(null)
  const initOnceRef = useRef(false)
  const didInitialOverviewRef = useRef(false)
  const allowFlyToSelectedRef = useRef(false)
  const stopsRef = useRef<Stop[]>([])
  stopsRef.current = stops
  const [isReady, setIsReady] = useState(false)
  const [tooltip, setTooltip] = useState<MarkerHoverInfo>(null)

  // Stable callback to avoid recreating the onReady function
  const onReadyCallback = useCallback((viewer: Viewer, cameraManager: PremiumCameraManager) => {
    console.log('[Cesium] Globe ready for interactions')
    onReady?.(viewer, cameraManager)
  }, [onReady])

  // Overview: whole Earth above first venue, auto-rotate, overview constraints
  const flyToOverview = useCallback((stops: Stop[]) => {
    if (!viewerRef.current || !gibsLayerRef.current || !osmLayerRef.current) return
    const viewer = viewerRef.current
    const gibsLayer = gibsLayerRef.current
    const osmLayer = osmLayerRef.current

    setMapMode('overview', viewer, gibsLayer, osmLayer, {
      routeEntities: routeManagerRef.current?.getRouteEntities() ?? undefined
    })

    const firstStop = [...stops].sort((a, b) => a.order - b.order)[0]
    const anchor = firstStop && firstStop.lat != null && firstStop.lng != null
      ? { lon: firstStop.lng, lat: firstStop.lat }
      : undefined

    autoRotateControllerRef.current?.flyToOverview(anchor)
    allowFlyToSelectedRef.current = true
    console.log('[Globe] Overview: whole Earth, auto-rotate active')
  }, [])

  // Fly out to overview pose above the given stop; returns Promise that resolves when flight completes
  const flyToOverviewAboveStop = useCallback((stop: Stop): Promise<void> => {
    const viewer = viewerRef.current
    const gibsLayer = gibsLayerRef.current
    const osmLayer = osmLayerRef.current
    if (!viewer || !gibsLayer || !osmLayer || !stop.lat || !stop.lng) return Promise.resolve()

    setMapMode('overview', viewer, gibsLayer, osmLayer, {
      routeEntities: routeManagerRef.current?.getRouteEntities() ?? undefined
    })
    routeManagerRef.current?.setRouteVisible(true)
    autoRotateControllerRef.current?.onFlightStart()
    applyOverviewConstraints(viewer)

    const radius = getEarthRadius(viewer)
    const distanceFromCenter = radius * OVERVIEW_DISTANCE_MULTIPLIER
    const ellipsoid = viewer.scene.globe.ellipsoid
    const pose = computeEarthCenteredPoseAboveLatLng(stop.lng, stop.lat, distanceFromCenter, ellipsoid)

    const duration = 3.0
    return new Promise<void>((resolve) => {
      viewer.camera.flyTo({
        destination: pose.destination,
        orientation: { direction: pose.direction, up: pose.up },
        duration,
        easingFunction: EasingFunction.QUADRATIC_IN_OUT,
        complete: () => {
          autoRotateControllerRef.current?.onFlightEnd()
          resolve()
        },
        cancel: () => {
          autoRotateControllerRef.current?.onFlightEnd()
          resolve()
        },
      })
    })
  }, [])

  useEffect(() => {
    if (onFlyToOverview) onFlyToOverview(flyToOverview)
  }, [onFlyToOverview, flyToOverview])

  useEffect(() => {
    if (onFlyToOverviewAboveStop) onFlyToOverviewAboveStop(flyToOverviewAboveStop)
  }, [onFlyToOverviewAboveStop, flyToOverviewAboveStop])

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
        gibsLayerRef.current = result.gibsLayer
        osmLayerRef.current = result.osmLayer
        
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
        markerManagerRef.current.setOnMarkerHover(setTooltip)

        // Initialize building manager
        buildingManagerRef.current = new BuildingManager(result.viewer)

        // Initial view: above equator, on same meridian as first stop
        autoRotateControllerRef.current = new AutoRotateController(result.viewer)
        const currentStops = stopsRef.current
        const firstStop = currentStops.length > 0
          ? [...currentStops].sort((a, b) => a.order - b.order)[0]
          : null
        const lon = firstStop && typeof firstStop.lng === 'number' ? firstStop.lng : 0
        const initialAnchor = { lon, lat: 0 }
        autoRotateControllerRef.current.initialize(initialAnchor)

        // Initialize markers and routes if stops are available
        if (stops.length > 0) {
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
      if (autoRotateControllerRef.current) {
        autoRotateControllerRef.current.destroy()
        autoRotateControllerRef.current = null
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
      routeManagerRef.current.setRouteVisible(viewMode === 'overview')
      viewerRef.current?.scene.requestRender()
    }
  }, [stops, selectedStopId, isReady, viewMode])

  // Initialize markers and routes when both viewer is ready and stops are available
  useEffect(() => {
    if (isReady && stops.length > 0) {
      console.log('[Globe] Viewer and stops ready - initializing markers and routes')
      
      // Initialize markers
      if (markerManagerRef.current) {
        markerManagerRef.current.updateMarkers(stops, selectedStopId)
      }
      
      // Initialize routes and sync visibility to current view mode
      if (routeManagerRef.current && stops.length > 1) {
        routeManagerRef.current.addTourRoute(stops)
        routeManagerRef.current.setRouteVisible(viewMode === 'overview')
        viewerRef.current?.scene.requestRender()
      }

      // Initial load: keep southern perspective set by initialize(); don't overwrite with flyToOverview
      if (!didInitialOverviewRef.current) {
        didInitialOverviewRef.current = true
        allowFlyToSelectedRef.current = true
        console.log('[Globe] Initial overview (southern perspective)')
      }
    }
  }, [isReady, stops, flyToOverview, viewMode]) // Run when either viewer becomes ready OR stops data arrives

  // Update marker click callback when it changes
  useEffect(() => {
    if (markerManagerRef.current && onSelectStop) {
      markerManagerRef.current.setOnMarkerClick(onSelectStop)
    }
  }, [onSelectStop])

  // Route arc visibility: overview = visible, venue = hidden
  useEffect(() => {
    if (routeManagerRef.current && isReady) {
      routeManagerRef.current.setRouteVisible(viewMode === 'overview')
      viewerRef.current?.scene.requestRender()
    }
  }, [viewMode, isReady])

  // Auto-rotate: active in overview, disabled in venue
  useEffect(() => {
    if (autoRotateControllerRef.current && isReady) {
      autoRotateControllerRef.current.setViewMode(viewMode)
    }
  }, [viewMode, isReady])

  // Fly to selected stop when selection changes (direct viewer.flyTo)
  useEffect(() => {
    if (!allowFlyToSelectedRef.current) return
    
    const viewer = viewerRef.current
    const gibsLayer = gibsLayerRef.current
    const osmLayer = osmLayerRef.current
    if (!viewer || !gibsLayer || !osmLayer || !selectedStopId || stops.length === 0 || !isReady) return

    const selectedStop = stops.find(stop => stop.id === selectedStopId)
    if (!selectedStop?.lat || !selectedStop?.lng) return

    // Hide route arc immediately when entering venue mode (before flight)
    routeManagerRef.current?.setRouteVisible(false)
    viewer.scene.requestRender()

    // Suspend auto-rotate during flight
    autoRotateControllerRef.current?.onFlightStart()
    removeOverviewConstraints(viewer)

    // Switch to venue mode (street surface) at START of flight
    setMapMode('venue', viewer, gibsLayer, osmLayer, {
      routeEntities: routeManagerRef.current?.getRouteEntities() ?? undefined
    })

    const dest = Cartesian3.fromDegrees(selectedStop.lng, selectedStop.lat, 0)
    const dist = Cartesian3.distance(viewer.camera.positionWC, dest)
    const duration = Math.min(1.15, Math.max(0.45, dist / 3_500_000))
    const range = Math.min(3500, Math.max(2000, 2000 + (dist / 5_000_000) * 1500))
    const offset = new HeadingPitchRange(
      CesiumMath.toRadians(0),
      CesiumMath.toRadians(-40),
      range
    )

    const onFlightComplete = () => {
      autoRotateControllerRef.current?.onFlightEnd()
    }

    const markerEntity = markerManagerRef.current?.getMarkerEntity?.(selectedStopId)

    if (markerEntity) {
      viewer.flyTo(markerEntity, { duration, offset }).then(onFlightComplete).catch(onFlightComplete)
    } else {
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(selectedStop.lng, selectedStop.lat, range),
        orientation: { heading: 0, pitch: CesiumMath.toRadians(-40), roll: 0 },
        duration,
        easingFunction: EasingFunction.QUADRATIC_IN_OUT,
        complete: onFlightComplete,
        cancel: onFlightComplete,
      })
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

      {/* Marker tooltip - glass overlay */}
      {tooltip && (
        <div
          className="marker-tooltip"
          style={{
            left: tooltip.screenX,
            top: tooltip.screenY,
          }}
        >
          <div className="marker-tooltip__city">{tooltip.city}</div>
          <div className="marker-tooltip__venue">{tooltip.venue}</div>
        </div>
      )}

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