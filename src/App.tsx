import { useEffect, useState, useCallback, useRef } from 'react'
import type { Viewer } from 'cesium'
import type { PremiumCameraManager } from './lib/cesium/cameraUtils'
import { Globe } from './components/Globe'
import { HeaderBar } from './components/HeaderBar'
import { SummaryStrip } from './components/SummaryStrip'
import { StopList } from './components/StopList'
import { StopPanel } from './components/StopPanel'
import { ScenarioToggle } from './components/ScenarioToggle'
import { CreditsPill } from './components/CreditsPill'
import { PremiumLoader, type LoadingStage } from './components/PremiumLoader'
import { loadStops } from './lib/data/loadStops'
import type { Stop, Scenario } from './lib/data/types'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './styles/tokens.css'
import './styles/layout.css'
import './styles/loader.css'

export type ViewMode = 'overview' | 'venue'

function App() {
  const [stops, setStops] = useState<Stop[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [scenario, setScenario] = useState<Scenario>('base')
  const [error, setError] = useState<string | null>(null)
  const [, setViewer] = useState<Viewer | null>(null)
  const [cameraManager, setCameraManager] = useState<PremiumCameraManager | null>(null)
  const flyToOverviewRef = useRef<((stops: Stop[]) => void) | null>(null)
  
  // Premium loading state machine
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('boot')
  const [loadingProgress, setLoadingProgress] = useState(0.05)
  const [showLoader, setShowLoader] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [imageryReady, setImageryReady] = useState(false)
  const [viewerReady, setViewerReady] = useState(false)

  // Load stops data on app start
  useEffect(() => {
    const initializeData = async () => {
      try {
        setError(null)
        setLoadingStage('data')
        setLoadingProgress(0.15)
        
        const stopsData = await loadStops()
        setStops(stopsData)
        // No default stop - start in Overview mode
        setDataLoaded(true)
        setLoadingStage('imagery')
        setLoadingProgress(0.25)
      } catch (err) {
        console.error('Failed to load stops:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    }

    initializeData()
  }, [])

  // Loading stage progression
  useEffect(() => {
    if (dataLoaded && imageryReady && !viewerReady) {
      setLoadingStage('viewer')
      setLoadingProgress(0.60)
    } else if (dataLoaded && imageryReady && viewerReady) {
      setLoadingStage('finalizing')
      setLoadingProgress(0.85)
      
      // Brief finalization phase
      setTimeout(() => {
        setLoadingStage('ready')
        setLoadingProgress(1.0)
        
        // Fade out loader
        setTimeout(() => {
          setShowLoader(false)
        }, 300)
      }, 800)
    }
  }, [dataLoaded, imageryReady, viewerReady])

  const selectedStop = stops.find(stop => stop.id === selectedStopId) || null

  // Selecting a venue: enter venue mode and set selection
  const handleStopSelection = useCallback((stopId: string) => {
    const stop = stops.find(s => s.id === stopId)
    if (stop) {
      console.log(`[App] Selecting stop: ${stop.city} - ${stop.venue}`)
      setSelectedStopId(stopId)
      setViewMode('venue')
      // Camera will fly via the useEffect in Globe.tsx
    } else {
      setSelectedStopId(stopId)
      setViewMode('venue')
    }
  }, [stops])

  // Overview button: enter overview mode and deselect
  const handleOverviewClick = useCallback(() => {
    setViewMode('overview')
    setSelectedStopId(null)
    if (flyToOverviewRef.current && stops.length > 0) {
      console.log('[App] Overview button clicked')
      flyToOverviewRef.current(stops)
    }
  }, [stops])

  const handleImageryReady = useCallback(() => {
    console.log('[App] Imagery preload completed')
    setImageryReady(true)
  }, [])

  // Esc closes panel focus / deselects
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ;(document.activeElement as HTMLElement)?.blur?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleGlobeReady = useCallback((cesiumViewer: Viewer, premiumCameraManager: PremiumCameraManager) => {
    setViewer(cesiumViewer)
    setCameraManager(premiumCameraManager)
    console.log('[App] Globe ready for interactions')
    
    // Listen for first frame rendered
    const onFirstFrame = () => {
      cesiumViewer.scene.postRender.removeEventListener(onFirstFrame)
      console.log('[App] First frame rendered')
      setViewerReady(true)
    }
    
    cesiumViewer.scene.postRender.addEventListener(onFirstFrame)
  }, [])


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
      {/* Premium Loader */}
      <PremiumLoader 
        stage={loadingStage}
        progress={loadingProgress}
        show={showLoader}
      />
      
      {/* Globe Background */}
      <Globe 
        onReady={handleGlobeReady} 
        onImageryReady={handleImageryReady}
        hideUntilReady={showLoader}
        stops={stops}
        viewMode={viewMode}
        selectedStopId={selectedStopId}
        onSelectStop={handleStopSelection}
        onFlyToOverview={(fn) => { flyToOverviewRef.current = fn }}
      />
      
      {/* Premium Layout System */}
      <div 
        className={`app-layout${!selectedStopId ? ' app-layout--panel-closed' : ''}`}
        style={{
          opacity: showLoader ? 0 : 1,
          transform: showLoader ? 'scale(1.02)' : 'scale(1)',
          transition: 'opacity 650ms cubic-bezier(0.23, 1, 0.32, 1), transform 650ms cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      >
        {/* Header */}
        <div className="layout-header">
          <HeaderBar 
            stats={{ 
              dates: stops.length, 
              markets: new Set(stops.map(s => s.countryCode)).size 
            }}
            onOverviewClick={handleOverviewClick}
          />
          <SummaryStrip stops={stops} scenario={scenario} />
        </div>
        
        {/* Left Rail */}
        <div className="layout-left-rail">
          <StopList 
            stops={stops}
            selectedStopId={selectedStopId}
            onSelectStop={handleStopSelection}
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