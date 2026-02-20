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
    <div className="header-container">
      {/* Main Title Header */}
      <div className="main-header">
        <h1 className="main-title">{title}</h1>
        <p className="main-subtitle">{subtitle}</p>
      </div>
      
      {/* Stats Section */}
      <div className="header-stats">
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
  )
}