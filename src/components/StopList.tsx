import type { Stop } from '../lib/data/types'

interface StopListProps {
  stops: Stop[]
  selectedStopId: string | null
  onSelectStop: (stopId: string) => void
}

export function StopList({ stops, selectedStopId, onSelectStop }: StopListProps) {
  if (stops.length === 0) {
    return (
      <div className="glass-panel p-xl">
        <div className="text-muted text-sm">No stops available</div>
      </div>
    )
  }

  return (
    <div className="glass-panel p-lg">
      <h3 className="text-lg font-semibold text-primary mb-lg">Tour Stops</h3>
      <div className="flex flex-col gap-sm">
        {stops.map((stop) => {
          const isSelected = stop.id === selectedStopId
          
          return (
            <button
              key={stop.id}
              onClick={() => onSelectStop(stop.id)}
              className={`
                glass-panel-subtle p-md text-left transition-all cursor-pointer
                ${isSelected 
                  ? 'border-champagne bg-champagne/5 shadow-lg' 
                  : 'hover:border-glass-border-hover hover:bg-glass-bg/70'
                }
              `}
              style={{
                boxShadow: isSelected 
                  ? '0 0 20px rgba(247, 231, 206, 0.15), var(--shadow-glass)' 
                  : undefined
              }}
            >
              <div className="flex items-center gap-md">
                {/* Order Number */}
                <div 
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold
                    ${isSelected 
                      ? 'bg-champagne text-dark-primary' 
                      : 'bg-glass-bg text-secondary'
                    }
                  `}
                  style={{
                    background: isSelected 
                      ? 'var(--color-champagne)' 
                      : 'var(--color-glass-bg)',
                    color: isSelected 
                      ? 'var(--color-dark-primary)' 
                      : 'var(--color-text-secondary)'
                  }}
                >
                  {stop.order}
                </div>
                
                {/* Stop Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-sm">
                    <span className={`font-medium ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                      {stop.city}
                    </span>
                    <span className="text-xs text-muted font-mono">
                      {stop.countryCode}
                    </span>
                  </div>
                  <div className={`text-sm mt-xs truncate ${isSelected ? 'text-champagne-muted' : 'text-muted'}`}>
                    {stop.venue}
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--color-champagne)' }}
                  />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}