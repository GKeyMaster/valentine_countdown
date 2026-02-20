import { useEffect, useState, useCallback } from 'react'
import type { Viewer } from 'cesium'
import { Globe } from './components/Globe'
import { HeaderBar } from './components/HeaderBar'
import { StopList } from './components/StopList'
import { StopPanel } from './components/StopPanel'
import { ScenarioToggle } from './components/ScenarioToggle'
import { CreditsPill } from './components/CreditsPill'
import { loadStops } from './lib/data/loadStops'
import type { Stop, Scenario } from './lib/data/types'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './styles/tokens.css'
import './styles/layout.css'

function App() {
  const [stops, setStops] = useState<Stop[]>([])
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [scenario, setScenario] = useState<Scenario>('base')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, setViewer] = useState<Viewer | null>(null)

  // Load stops data on app start
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const stopsData = await loadStops()
        setStops(stopsData)
        
        // Default select stop #1
        if (stopsData.length > 0) {
          setSelectedStopId(stopsData[0].id)
        }
      } catch (err) {
        console.error('Failed to load stops:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  const selectedStop = stops.find(stop => stop.id === selectedStopId) || null

  const handleGlobeReady = useCallback((cesiumViewer: Viewer) => {
    setViewer(cesiumViewer)
    console.log('🌍 Globe ready for interactions')
  }, [])

  if (loading) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg)'
      }}>
        <div className="glass-panel" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <div style={{ 
            fontSize: 'var(--font-size-lg)', 
            color: 'var(--text)', 
            marginBottom: 'var(--space-2)' 
          }}>
            Loading tour data...
          </div>
          <div style={{ 
            fontSize: 'var(--font-size-sm)', 
            color: 'var(--text-muted)' 
          }}>
            Please wait while we fetch the latest information
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg)'
      }}>
        <div className="glass-panel" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <div style={{ 
            fontSize: 'var(--font-size-lg)', 
            color: 'var(--text)', 
            marginBottom: 'var(--space-2)' 
          }}>
            ⚠️ Error Loading Data
          </div>
          <div style={{ 
            fontSize: 'var(--font-size-sm)', 
            color: 'var(--text-muted)', 
            marginBottom: 'var(--space-5)' 
          }}>
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="glass-panel-subtle interactive"
            style={{
              padding: 'var(--space-3) var(--space-5)',
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
    )
  }

  return (
    <>
      {/* Globe Background */}
      <Globe onReady={handleGlobeReady} />
      
      {/* Premium Layout System */}
      <div className="app-layout">
        {/* Header */}
        <div className="layout-header">
          <HeaderBar 
            stats={{ 
              dates: stops.length, 
              markets: new Set(stops.map(s => s.countryCode)).size 
            }} 
          />
        </div>
        
        {/* Left Rail */}
        <div className="layout-left-rail">
          <StopList 
            stops={stops}
            selectedStopId={selectedStopId}
            onSelectStop={setSelectedStopId}
          />
          <ScenarioToggle 
            scenario={scenario}
            onScenarioChange={setScenario}
          />
        </div>
        
        {/* Right Rail */}
        <div className="layout-right-rail">
          <StopPanel 
            stop={selectedStop}
            scenario={scenario}
          />
        </div>
        
        {/* Credits */}
        <div className="layout-credits">
          <CreditsPill />
        </div>
      </div>
    </>
  )
}

export default App