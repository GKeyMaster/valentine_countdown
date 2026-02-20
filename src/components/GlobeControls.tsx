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
    <div className="absolute right-0 z-40 p-xl" style={{ top: '120px' }}>
      <div className="glass-panel px-lg py-md text-sm">
        <label className="flex items-center gap-sm cursor-pointer">
          <input
            type="checkbox"
            checked={nightLightsEnabled}
            onChange={toggleNightLights}
            className="w-4 h-4 cursor-pointer"
            style={{ width: '16px', height: '16px' }}
          />
          <span className="text-secondary">🌃 Night Lights</span>
        </label>
        
        {import.meta.env.DEV && (
          <div className="mt-md pt-md text-xs text-muted" style={{
            borderTop: '1px solid var(--color-glass-border)'
          }}>
            <div className="mb-xs">Debug:</div>
            <div className="flex gap-xs">
              <button
                onClick={() => (window as any).setNightTime?.()}
                className="glass-panel-subtle px-sm py-xs text-xs cursor-pointer hover:text-primary"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                🌙 Night
              </button>
              <button
                onClick={() => (window as any).setDayTime?.()}
                className="glass-panel-subtle px-sm py-xs text-xs cursor-pointer hover:text-primary"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                ☀️ Day
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}