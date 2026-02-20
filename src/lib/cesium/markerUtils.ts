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
 * Creates a round PNG marker using SVG data URL
 */
export function createMarkerImage(isSelected = false): string {
  const size = isSelected ? 32 : 24
  const radius = isSelected ? 14 : 10
  const strokeWidth = isSelected ? 3 : 2
  
  // Colors for selected vs unselected state
  const fillColor = isSelected ? '#FFD700' : '#FFA500' // Gold vs Orange
  const strokeColor = isSelected ? '#B8860B' : '#FF8C00' // Dark golden rod vs Dark orange
  const centerColor = isSelected ? '#8B4513' : '#654321' // Dark brown center
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${radius}" 
              fill="${fillColor}" 
              stroke="${strokeColor}" 
              stroke-width="${strokeWidth}"
              filter="url(#glow)"/>
      <circle cx="${size/2}" cy="${size/2}" r="${radius/3}" 
              fill="${centerColor}"/>
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
  const size = isSelected ? 32 : 24
  
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
          const size = isSelected ? 32 : 24
          existingMarker.billboard.width = new ConstantProperty(size)
          existingMarker.billboard.height = new ConstantProperty(size)
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
        const size = isSelected ? 32 : 24
        entity.billboard.width = new ConstantProperty(size)
        entity.billboard.height = new ConstantProperty(size)
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