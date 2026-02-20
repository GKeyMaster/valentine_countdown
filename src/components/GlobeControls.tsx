import { useState } from 'react'
import { Viewer } from 'cesium'

interface GlobeControlsProps {
  viewer: Viewer | null
}

export function GlobeControls({ viewer }: GlobeControlsProps) {
  const [nightLightsEnabled, setNightLightsEnabled] = useState(true)

  const toggleNightLights = () => {
    if (!viewer) return
    
    const nightLayer = (viewer as any).nightImageryLayer
    if (nightLayer) {
      const newState = !nightLightsEnabled
      nightLayer.show = newState
      setNightLightsEnabled(newState)
      
      if (import.meta.env.DEV) {
        console.log(`🌃 Night lights ${newState ? 'enabled' : 'disabled'}`)
      }
    }
  }

  if (!viewer) return null

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: '8px',
      padding: '12px 16px',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      userSelect: 'none',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={nightLightsEnabled}
          onChange={toggleNightLights}
          style={{
            width: '16px',
            height: '16px',
            cursor: 'pointer'
          }}
        />
        <span>🌃 Night Lights</span>
      </label>
      
      {import.meta.env.DEV && (
        <div style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          fontSize: '12px',
          opacity: 0.8
        }}>
          <div style={{ marginBottom: '4px' }}>Debug:</div>
          <button
            onClick={() => (window as any).setNightTime?.()}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              marginRight: '4px'
            }}
          >
            🌙 Night
          </button>
          <button
            onClick={() => (window as any).setDayTime?.()}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            ☀️ Day
          </button>
        </div>
      )}
    </div>
  )
}