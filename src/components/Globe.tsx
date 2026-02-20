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
  const onReadyRef = useRef(onReady)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update the onReady ref when it changes, but don't recreate the viewer
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  // Initialize viewer only once
  useEffect(() => {
    if (!containerRef.current || isInitialized) return

    let mounted = true
    setIsInitialized(true)

    const initializeViewer = async () => {
      try {
        console.log('🚀 Initializing Cesium viewer...')
        
        // Create Cesium viewer with credit container
        const result = await createViewer(
          containerRef.current!, 
          creditContainerRef.current || undefined
        )
        
        if (!mounted) {
          result.viewer.destroy()
          return
        }

        viewerRef.current = result.viewer
        
        // Wait for imagery to be ready
        await result.isReady
        
        if (!mounted) return

        // Fade in the globe
        if (containerRef.current) {
          containerRef.current.style.opacity = '0'
          containerRef.current.style.transition = 'opacity 300ms ease-out'
          
          // Small delay to ensure everything is rendered
          setTimeout(() => {
            if (containerRef.current && mounted) {
              containerRef.current.style.opacity = '1'
              setIsLoading(false)
              onReadyRef.current?.(result.viewer)
              console.log('🎉 Globe ready and visible')
            }
          }, 100)
        }
      } catch (err) {
        console.error('❌ Failed to initialize Cesium viewer:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize viewer')
          setIsLoading(false)
          setIsInitialized(false) // Allow retry
        }
      }
    }

    initializeViewer()

    // Cleanup on unmount
    return () => {
      mounted = false
      if (viewerRef.current) {
        console.log('🧹 Cleaning up Cesium viewer')
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [isInitialized])

  const handleRetry = useCallback(() => {
    setError(null)
    setIsLoading(true)
    setIsInitialized(false)
  }, [])

  return (
    <>
      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="loading-overlay">
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
      )}

      {/* Error Overlay */}
      {error && (
        <div className="loading-overlay">
          <div className="glass-panel" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <div 
              style={{ 
                fontSize: 'var(--font-size-lg)', 
                color: 'var(--text)', 
                marginBottom: 'var(--space-2)' 
              }}
            >
              ⚠️ Globe Loading Error
            </div>
            <div 
              style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-4)'
              }}
            >
              {error}
            </div>
            <button
              onClick={handleRetry}
              className="glass-panel-subtle interactive"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--font-size-sm)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--panel)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Cesium Container */}
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0 // Start invisible, fade in when ready
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