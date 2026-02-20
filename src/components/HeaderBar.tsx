interface HeaderBarProps {
  title?: string
  subtitle?: string
  stats?: {
    dates: number
    markets: number
  }
}

export function HeaderBar({ 
  title = "WORLD TOUR 2026",
  subtitle = "Premium Experience",
  stats = { dates: 2, markets: 2 }
}: HeaderBarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 p-xl animate-fade-in-up">
      <div className="glass-panel-subtle px-xl py-lg">
        <div className="flex items-center justify-between">
          {/* Left: Title Section */}
          <div className="flex flex-col">
            <h1 className="header-title">
              {title}
            </h1>
            <p className="header-subtitle">
              {subtitle}
            </p>
          </div>
          
          {/* Right: Stats Section */}
          <div className="flex items-center gap-md">
            <div className="stat-chip">
              Dates
              <span className="stat-chip-value">{stats.dates}</span>
            </div>
            <div className="stat-chip">
              Markets
              <span className="stat-chip-value">{stats.markets}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}