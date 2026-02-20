import { useEffect, useRef, useState, useCallback } from 'react'
import type { Viewer } from 'cesium'
import { createViewer } from '../lib/cesium/createViewer'

interface GlobeProps {
  onReady?: (viewer: Viewer) => void
}

export function Globe({ onReady }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const creditContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const initOnceRef = useRef(false)
  const [isReady, setIsReady] = useState(false)

  // Stable callback to avoid recreating the onReady function
  const onReadyCallback = useCallback((viewer: Viewer) => {
    console.log('[Cesium] Globe ready for interactions')
    onReady?.(viewer)
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
        
        // Wait for imagery to be ready
        await result.isReady
        
        // Fade in the globe
        if (containerRef.current) {
          containerRef.current.style.opacity = '1'
          setIsReady(true)
          onReadyCallback(result.viewer)
        }
      } catch (error) {
        console.error('Failed to initialize Cesium viewer:', error)
        setIsReady(true) // Show something even if failed
      }
    }

    initializeViewer()

    // Cleanup on unmount
    return () => {
      console.log('[Cesium] destroy viewer')
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
      initOnceRef.current = false
    }
  }, []) // Empty dependency array - init ONCE only

  // Separate effect to handle onReady callback changes
  useEffect(() => {
    if (isReady && viewerRef.current) {
      console.log('[Cesium] Calling onReady callback (viewer already exists)')
      onReadyCallback(viewerRef.current)
    }
  }, [onReadyCallback, isReady])

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
          opacity: 0, // Start invisible, fade in when ready
          transition: 'opacity 300ms ease-out'
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