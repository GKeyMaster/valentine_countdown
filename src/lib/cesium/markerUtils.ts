import {
  Viewer,
  Entity,
  Cartesian3,
  VerticalOrigin,
  HorizontalOrigin,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  ConstantProperty
} from 'cesium'
import type { Stop } from '../data/types'

/**
 * Creates a perfectly round marker with distinct selected/unselected states
 */
export function createMarkerImage(isSelected = false): string {
  const size = 40 // Fixed size for consistency
  const radius = isSelected ? 18 : 15 // Different sizes for states
  
  // Distinct colors for each state
  const colors = isSelected ? {
    outer: '#FFD700',      // Bright gold
    middle: '#FFA500',     // Orange
    inner: '#FF6347',      // Tomato red
    stroke: '#8B0000',     // Dark red
    glow: '#FFD700'        // Gold glow
  } : {
    outer: '#87CEEB',      // Sky blue
    middle: '#4682B4',     // Steel blue
    inner: '#191970',      // Midnight blue
    stroke: '#000080',     // Navy
    glow: '#87CEEB'        // Blue glow
  }
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad${isSelected ? 'Sel' : 'Unsel'}" cx="50%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:${colors.outer};stop-opacity:1" />
          <stop offset="70%" style="stop-color:${colors.middle};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.inner};stop-opacity:1" />
        </radialGradient>
        <filter id="glow${isSelected ? 'Sel' : 'Unsel'}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Outer glow circle -->
      <circle cx="${size/2}" cy="${size/2}" r="${radius + 4}" 
              fill="${colors.glow}" 
              opacity="0.3"/>
      
      <!-- Main circle with gradient -->
      <circle cx="${size/2}" cy="${size/2}" r="${radius}" 
              fill="url(#grad${isSelected ? 'Sel' : 'Unsel'})" 
              stroke="${colors.stroke}" 
              stroke-width="2"
              filter="url(#glow${isSelected ? 'Sel' : 'Unsel'})"/>
      
      <!-- Inner highlight -->
      <circle cx="${size/2 - 3}" cy="${size/2 - 3}" r="3" 
              fill="white" 
              opacity="0.8"/>
      
      <!-- Center dot -->
      <circle cx="${size/2}" cy="${size/2}" r="4" 
              fill="${colors.stroke}"/>
    </svg>
  `
  
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Legacy function for backward compatibility
 */
export function createMarkerCanvas(): HTMLCanvasElement {
  // Create a simple canvas that will be replaced by the image
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas
}

/**
 * Creates a Cesium Entity for a venue marker
 */
export function createVenueMarker(stop: Stop, isSelected = false): Entity {
  const position = Cartesian3.fromDegrees(stop.lng ?? 0, stop.lat ?? 0)
  const imageUrl = createMarkerImage(isSelected)
  const size = 40 // Consistent size, visual difference is in the marker design
  
  return new Entity({
    id: stop.id,
    position: position,
    billboard: {
      image: new ConstantProperty(imageUrl),
      width: size,
      height: size,
      verticalOrigin: VerticalOrigin.CENTER,
      horizontalOrigin: HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
      scale: 1.0,
      pixelOffset: new Cartesian3(0, 0, 0)
    },
    // Store stop data for easy access
    properties: {
      stopId: stop.id,
      city: stop.city,
      venue: stop.venue,
      isVenueMarker: true
    }
  })
}

/**
 * Manages venue markers on the Cesium globe
 */
export class VenueMarkerManager {
  private viewer: Viewer
  private markers: Map<string, Entity> = new Map()
  private clickHandler: ScreenSpaceEventHandler | null = null
  private onMarkerClick: ((stopId: string) => void) | null = null
  private hoveredEntity: Entity | null = null

  constructor(viewer: Viewer) {
    this.viewer = viewer
    this.setupClickHandler()
  }

  /**
   * Sets up click handling for markers
   */
  private setupClickHandler(): void {
    this.clickHandler = new ScreenSpaceEventHandler(this.viewer.scene.canvas)
    
    // Handle clicks
    this.clickHandler.setInputAction((event: any) => {
      const pickedObject = this.viewer.scene.pick(event.position)
      
      if (defined(pickedObject) && defined(pickedObject.id)) {
        const entity = pickedObject.id as Entity
        
        // Check if this is a venue marker
        if (entity.properties?.isVenueMarker?.getValue()) {
          const stopId = entity.properties.stopId.getValue()
          console.log(`[Markers] Clicked venue marker: ${stopId}`)
          
          if (this.onMarkerClick) {
            this.onMarkerClick(stopId)
          }
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK)

    // Handle mouse move for hover effects
    this.clickHandler.setInputAction((event: any) => {
      const pickedObject = this.viewer.scene.pick(event.endPosition)
      
      if (defined(pickedObject) && defined(pickedObject.id)) {
        const entity = pickedObject.id as Entity
        
        // Check if this is a venue marker
        if (entity.properties?.isVenueMarker?.getValue()) {
          if (this.hoveredEntity !== entity) {
            // Reset previous hovered entity
            if (this.hoveredEntity && this.hoveredEntity.billboard) {
              this.hoveredEntity.billboard.scale = new ConstantProperty(1.0)
            }
            
            // Set new hovered entity
            this.hoveredEntity = entity
            if (entity.billboard) {
              entity.billboard.scale = new ConstantProperty(1.1) // Slight scale up on hover
            }
            
            // Change cursor to pointer
            this.viewer.canvas.style.cursor = 'pointer'
          }
        } else {
          this.clearHover()
        }
      } else {
        this.clearHover()
      }
    }, ScreenSpaceEventType.MOUSE_MOVE)
  }

  /**
   * Clears hover state
   */
  private clearHover(): void {
    if (this.hoveredEntity && this.hoveredEntity.billboard) {
      this.hoveredEntity.billboard.scale = new ConstantProperty(1.0)
    }
    this.hoveredEntity = null
    this.viewer.canvas.style.cursor = 'default'
  }

  /**
   * Sets the callback for when a marker is clicked
   */
  setOnMarkerClick(callback: (stopId: string) => void): void {
    this.onMarkerClick = callback
  }

  /**
   * Adds or updates markers for the given stops
   */
  updateMarkers(stops: Stop[], selectedStopId: string | null): void {
    console.log(`[Markers] Updating markers for ${stops.length} stops`)
    
    // Remove markers that are no longer needed
    const currentStopIds = new Set(stops.map(stop => stop.id))
    for (const [stopId, entity] of this.markers) {
      if (!currentStopIds.has(stopId)) {
        this.viewer.entities.remove(entity)
        this.markers.delete(stopId)
      }
    }

    // Add or update markers for current stops
    for (const stop of stops) {
      const isSelected = stop.id === selectedStopId
      const existingMarker = this.markers.get(stop.id)

      if (existingMarker) {
        // Update existing marker if selection state changed
        if (existingMarker.billboard) {
          existingMarker.billboard.image = new ConstantProperty(createMarkerImage(isSelected))
          // Size stays consistent, only image changes
        }
      } else {
        // Create new marker
        const marker = createVenueMarker(stop, isSelected)
        this.viewer.entities.add(marker)
        this.markers.set(stop.id, marker)
      }
    }
  }

  /**
   * Updates the selection state of markers
   */
  updateSelection(selectedStopId: string | null): void {
    for (const [stopId, entity] of this.markers) {
      const isSelected = stopId === selectedStopId
      if (entity.billboard) {
        entity.billboard.image = new ConstantProperty(createMarkerImage(isSelected))
        // Size stays consistent, only image changes
      }
    }
  }

  /**
   * Gets a marker by stop ID
   */
  getMarker(stopId: string): Entity | undefined {
    return this.markers.get(stopId)
  }

  /**
   * Gets all marker entities
   */
  getAllMarkers(): Entity[] {
    return Array.from(this.markers.values())
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.clearHover()
    
    if (this.clickHandler) {
      this.clickHandler.destroy()
      this.clickHandler = null
    }
    
    // Remove all markers
    for (const entity of this.markers.values()) {
      this.viewer.entities.remove(entity)
    }
    this.markers.clear()
  }
}