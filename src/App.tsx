import { useEffect, useState } from 'react'
import { Globe } from './components/Globe'
import { HeaderBar } from './components/HeaderBar'
import { StopList } from './components/StopList'
import { StopPanel } from './components/StopPanel'
import { ScenarioToggle } from './components/ScenarioToggle'
import { loadStops } from './lib/data/loadStops'
import type { Stop, Scenario } from './lib/data/types'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './styles/theme.css'

function App() {
  const [stops, setStops] = useState<Stop[]>([])
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [scenario, setScenario] = useState<Scenario>('base')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="glass-panel p-xl text-center">
          <div className="text-lg text-primary mb-sm">Loading tour data...</div>
          <div className="text-sm text-muted">Please wait while we fetch the latest information</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="glass-panel p-xl text-center">
          <div className="text-lg text-primary mb-sm">⚠️ Error Loading Data</div>
          <div className="text-sm text-muted mb-lg">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="glass-panel-subtle px-lg py-md text-sm hover:border-champagne transition-all"
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
      <Globe />
      
      {/* Header */}
      <HeaderBar 
        stats={{ 
          dates: stops.length, 
          markets: new Set(stops.map(s => s.countryCode)).size 
        }} 
      />
      
      {/* Main UX Overlay */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        <div className="w-full h-full flex">
          {/* Left Panel */}
          <div className="w-80 h-full flex flex-col gap-lg p-xl pointer-events-auto">
            {/* Stop List */}
            <div className="flex-1">
              <StopList 
                stops={stops}
                selectedStopId={selectedStopId}
                onSelectStop={setSelectedStopId}
              />
            </div>
            
            {/* Scenario Toggle */}
            <div className="flex-shrink-0">
              <ScenarioToggle 
                scenario={scenario}
                onScenarioChange={setScenario}
              />
            </div>
          </div>
          
          {/* Right Panel */}
          <div className="flex-1 h-full flex justify-end p-xl pointer-events-auto">
            <div className="w-96">
              <StopPanel 
                stop={selectedStop}
                scenario={scenario}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App