import { useEffect, useRef, useState } from 'react'
import { Viewer } from 'cesium'
import { createViewer } from '../lib/cesium/createViewer'
import { GlobeControls } from './GlobeControls'

export function Globe() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [viewer, setViewer] = useState<Viewer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create Cesium viewer
    viewerRef.current = createViewer(containerRef.current)
    setViewer(viewerRef.current)

    // Cleanup on unmount
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
        setViewer(null)
      }
    }
  }, [])

  return (
    <>
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
      <GlobeControls viewer={viewer} />
    </>
  )
}