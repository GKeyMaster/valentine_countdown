import type { Scenario } from '../lib/data/types'

interface ScenarioToggleProps {
  scenario: Scenario
  onScenarioChange: (scenario: Scenario) => void
}

export function ScenarioToggle({ scenario, onScenarioChange }: ScenarioToggleProps) {
  const scenarios: { value: Scenario; label: string; description: string }[] = [
    { 
      value: 'base', 
      label: 'Base', 
      description: 'Conservative projections' 
    },
    { 
      value: 'upside', 
      label: 'Upside', 
      description: 'Optimistic scenario' 
    }
  ]

  return (
    <div className="glass-panel p-lg">
      <h3 className="text-lg font-semibold text-primary mb-md">Scenario</h3>
      
      {/* Segmented Control */}
      <div 
        className="relative flex bg-glass-bg rounded-lg p-xs"
        style={{
          background: 'var(--color-glass-bg)',
          border: '1px solid var(--color-glass-border)'
        }}
      >
        {/* Background Slider */}
        <div
          className="absolute top-xs bottom-xs transition-all duration-300 rounded-md"
          style={{
            left: scenario === 'base' ? '4px' : '50%',
            width: 'calc(50% - 4px)',
            background: 'var(--color-champagne)',
            boxShadow: '0 2px 8px rgba(247, 231, 206, 0.3)'
          }}
        />
        
        {/* Toggle Options */}
        {scenarios.map((option) => {
          const isActive = scenario === option.value
          
          return (
            <button
              key={option.value}
              onClick={() => onScenarioChange(option.value)}
              className={`
                relative flex-1 px-md py-sm text-sm font-medium transition-all duration-300 rounded-md
                ${isActive 
                  ? 'text-dark-primary' 
                  : 'text-secondary hover:text-primary'
                }
              `}
              style={{
                color: isActive 
                  ? 'var(--color-dark-primary)' 
                  : undefined
              }}
            >
              <div className="flex flex-col items-center gap-xs">
                <span className="font-semibold">
                  {option.label}
                </span>
                <span 
                  className={`text-xs ${isActive ? 'opacity-70' : 'opacity-50'}`}
                  style={{
                    color: isActive 
                      ? 'var(--color-dark-primary)' 
                      : 'var(--color-text-muted)'
                  }}
                >
                  {option.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      
      {/* Scenario Description */}
      <div className="mt-md p-md glass-panel-subtle">
        <div className="text-xs text-muted">
          {scenario === 'base' 
            ? 'Conservative estimates based on historical performance and market analysis.'
            : 'Optimistic projections assuming strong market conditions and premium positioning.'
          }
        </div>
      </div>
    </div>
  )
}