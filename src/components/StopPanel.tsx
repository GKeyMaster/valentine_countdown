import type { Stop, Scenario } from '../lib/data/types'
import { extractStopDetails } from '../lib/data/loadStops'

interface StopPanelProps {
  stop: Stop | null
  scenario: Scenario
}

export function StopPanel({ stop, scenario }: StopPanelProps) {
  if (!stop) {
    return (
      <div className="glass-panel p-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted text-lg mb-sm">No stop selected</div>
          <div className="text-muted text-sm">Select a stop from the list to view details</div>
        </div>
      </div>
    )
  }

  const details = extractStopDetails(stop, scenario)

  const bulletItems = [
    { label: 'Capacity', value: details.capacity, icon: '👥' },
    { label: 'Ticket Price', value: details.ticketPrice, icon: '🎫' },
    { label: 'Projected Gross', value: details.projectedGross, icon: '💰' },
    { label: 'Net/Guarantee', value: details.netGuarantee, icon: '📊' },
    { label: 'Notes', value: details.notes, icon: '📝' },
    { label: 'Market Rationale', value: details.marketRationale, icon: '🎯' }
  ]

  return (
    <div className="glass-panel p-xl">
      {/* Header */}
      <div className="mb-xl">
        <div className="flex items-center gap-md mb-sm">
          <h2 className="text-2xl font-semibold text-primary">
            {stop.city}
          </h2>
          <span className="text-sm font-mono text-champagne px-sm py-xs glass-panel-subtle rounded">
            {stop.countryCode}
          </span>
        </div>
        <h3 className="text-lg text-champagne-muted font-medium">
          {stop.venue}
        </h3>
        {stop.lat && stop.lng && (
          <div className="text-xs text-muted font-mono mt-sm">
            {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* Scenario Indicator */}
      <div className="mb-lg">
        <div className="flex items-center gap-sm">
          <span className="text-xs text-muted">Viewing:</span>
          <span 
            className="text-xs font-semibold px-sm py-xs rounded-md"
            style={{
              background: scenario === 'upside' 
                ? 'rgba(247, 231, 206, 0.1)' 
                : 'var(--color-glass-bg)',
              color: scenario === 'upside' 
                ? 'var(--color-champagne)' 
                : 'var(--color-text-secondary)',
              border: '1px solid var(--color-glass-border)'
            }}
          >
            {scenario === 'base' ? 'Base Scenario' : 'Upside Scenario'}
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-md">
        {bulletItems.map((item, index) => (
          <div 
            key={index}
            className="glass-panel-subtle p-md hover:border-glass-border-hover transition-all"
          >
            <div className="flex items-start gap-md">
              {/* Icon */}
              <span className="text-lg flex-shrink-0 mt-xs">
                {item.icon}
              </span>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-xs">
                  <span className="text-sm font-medium text-secondary">
                    {item.label}
                  </span>
                  {item.value === 'TBD' && (
                    <span className="text-xs text-muted font-mono px-xs py-xs bg-glass-bg rounded">
                      TBD
                    </span>
                  )}
                </div>
                
                <div className={`text-base ${item.value === 'TBD' ? 'text-muted italic' : 'text-primary'}`}>
                  {item.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-xl pt-lg border-t border-glass-border">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Stop #{stop.order}</span>
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}