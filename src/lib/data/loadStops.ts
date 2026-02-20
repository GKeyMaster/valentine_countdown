import type { Stop } from './types'

export async function loadStops(): Promise<Stop[]> {
  try {
    const response = await fetch('/data/stops.v1.json')
    
    if (!response.ok) {
      throw new Error(`Failed to load stops: ${response.status} ${response.statusText}`)
    }
    
    const stops: Stop[] = await response.json()
    
    // Validate the data structure
    if (!Array.isArray(stops)) {
      throw new Error('Invalid stops data: expected array')
    }
    
    // Basic validation of each stop
    stops.forEach((stop, index) => {
      if (!stop.id || !stop.city || !stop.venue || typeof stop.order !== 'number') {
        throw new Error(`Invalid stop data at index ${index}: missing required fields`)
      }
    })
    
    return stops
  } catch (error) {
    console.error('Error loading stops:', error)
    throw error
  }
}

export function formatCapacity(capacityMin: number | null, capacityMax: number | null): string {
  if (!capacityMin && !capacityMax) {
    return 'TBD'
  }
  
  if (capacityMin === capacityMax) {
    return capacityMin?.toLocaleString() || 'TBD'
  }
  
  if (capacityMin && capacityMax) {
    return `${capacityMin.toLocaleString()} - ${capacityMax.toLocaleString()}`
  }
  
  return capacityMin?.toLocaleString() || capacityMax?.toLocaleString() || 'TBD'
}

export function extractStopDetails(stop: Stop, scenario: 'base' | 'upside'): {
  capacity: string
  ticketPrice: string
  projectedGross: string
  netGuarantee: string
  notes: string
  marketRationale: string
} {
  // Extract details from bullets array
  const bullets = stop.bullets || []
  
  // Helper function to find bullet by prefix
  const findBullet = (prefix: string): string => {
    const bullet = bullets.find(b => b.toLowerCase().startsWith(prefix.toLowerCase()))
    if (!bullet) return 'TBD'
    
    const colonIndex = bullet.indexOf(':')
    if (colonIndex === -1) return bullet
    
    return bullet.substring(colonIndex + 1).trim()
  }
  
  // For now, we'll use the same values for both scenarios
  // In a real app, you might have scenario-specific data
  
  return {
    capacity: formatCapacity(stop.capacityMin, stop.capacityMax),
    ticketPrice: findBullet('Ticket Price'),
    projectedGross: findBullet('Gross Revenue'),
    netGuarantee: findBullet('Net/Guarantee'),
    notes: findBullet('Notes'),
    marketRationale: scenario === 'upside' 
      ? 'Strong market demand, premium positioning'
      : 'Conservative estimates based on historical data'
  }
}