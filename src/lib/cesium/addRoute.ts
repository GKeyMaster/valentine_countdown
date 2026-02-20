import {
  Viewer,
  Entity,
  Cartesian3,
  Color,
  PolylineGlowMaterialProperty,
  ArcType,
  ConstantProperty
} from 'cesium'
import type { Stop } from '../data/types'

/**
 * Premium route visualization utilities for connecting tour stops
 */

/**
 * Creates elegant route polylines connecting tour stops in order
 */
export class RouteManager {
  private viewer: Viewer
  private routeEntities: Entity[] = []

  constructor(viewer: Viewer) {
    this.viewer = viewer
  }

  /**
   * Creates and adds route polylines connecting stops in tour order
   */
  addTourRoute(stops: Stop[]): void {
    this.clearRoutes()

    if (stops.length < 2) {
      console.log('[Route] Need at least 2 stops to create route')
      return
    }

    // Sort stops by order to ensure correct routing
    const sortedStops = [...stops].sort((a, b) => a.order - b.order)
    console.log(`[Route] Creating route for ${sortedStops.length} stops`)

    // Create route segments between consecutive stops
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const fromStop = sortedStops[i]
      const toStop = sortedStops[i + 1]
      
      if (fromStop.lat != null && fromStop.lng != null && 
          toStop.lat != null && toStop.lng != null) {
        
        const routeSegment = this.createRouteSegment(fromStop, toStop, i)
        
        // Add subtle delay for elegant appearance
        setTimeout(() => {
          if (this.viewer && !this.viewer.isDestroyed()) {
            this.viewer.entities.add(routeSegment)
            this.routeEntities.push(routeSegment)
          }
        }, i * 200) // 200ms delay between each segment for smooth appearance
      }
    }

    console.log(`[Route] Added ${this.routeEntities.length} route segments`)
  }

  /**
   * Creates a single route segment between two stops with elevation
   */
  private createRouteSegment(fromStop: Stop, toStop: Stop, segmentIndex: number): Entity {
    // Create multiple points for a smooth elevated arc
    const positions = this.createElevatedArc(fromStop, toStop, 50000)

    // Create visible polyline with deeper golden glow
    const routeEntity = new Entity({
      id: `route-segment-${segmentIndex}`,
      polyline: {
        positions: positions,
        width: 6, // Thicker for better visibility
        arcType: ArcType.NONE, // Use our custom arc points
        clampToGround: false,
        material: new PolylineGlowMaterialProperty({
          glowPower: new ConstantProperty(0.3), // More visible glow
          taperPower: new ConstantProperty(1.0), // No taper for consistent visibility
          color: new ConstantProperty(Color.fromCssColorString('#D4AF37').withAlpha(0.95)) // Deeper golden color
        }),
        // Stable rendering properties to prevent blinking
        depthFailMaterial: new PolylineGlowMaterialProperty({
          glowPower: new ConstantProperty(0.2),
          taperPower: new ConstantProperty(1.0),
          color: new ConstantProperty(Color.fromCssColorString('#D4AF37').withAlpha(0.7))
        }),
        zIndex: 1000, // Render above terrain but below markers
        distanceDisplayCondition: undefined
      },
      // Store route metadata
      properties: {
        isRouteSegment: true,
        fromStopId: fromStop.id,
        toStopId: toStop.id,
        segmentIndex: segmentIndex
      }
    })

    return routeEntity
  }
  
  /**
   * Creates an elevated arc between two points for smooth route visualization
   */
  private createElevatedArc(fromStop: Stop, toStop: Stop, baseElevation: number): Cartesian3[] {
    const positions: Cartesian3[] = []
    const steps = 20 // More points for smoother arc
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      
      // Interpolate lat/lng
      const lat = fromStop.lat! + (toStop.lat! - fromStop.lat!) * t
      const lng = fromStop.lng! + (toStop.lng! - fromStop.lng!) * t
      
      // Create arc elevation (higher in the middle)
      const arcHeight = Math.sin(t * Math.PI) * 200000 // Peak at 200km
      const elevation = baseElevation + arcHeight
      
      positions.push(Cartesian3.fromDegrees(lng, lat, elevation))
    }
    
    return positions
  }


  /**
   * Updates route visibility based on camera distance for elegant presentation
   */
  updateRouteVisibility(): void {
    const cameraHeight = this.viewer.camera.positionCartographic.height
    
    // Show route when zoomed out enough to see the tour overview
    // More permissive range to prevent blinking
    const shouldShowRoute = cameraHeight > 500000 // Show when >500km altitude
    
    this.routeEntities.forEach(entity => {
      if (entity.polyline) {
        entity.show = shouldShowRoute
        
        // Stable opacity - no dynamic changes to prevent blinking
        if (shouldShowRoute) {
          const material = entity.polyline.material as PolylineGlowMaterialProperty
          if (material) {
            // Keep consistent deep golden color
            material.color = new ConstantProperty(Color.fromCssColorString('#D4AF37').withAlpha(0.95))
          }
        }
      }
    })
  }

  /**
   * Highlights a specific route segment (for future interactivity)
   */
  highlightSegment(segmentIndex: number, highlight: boolean = true): void {
    const entity = this.routeEntities[segmentIndex]
    if (entity && entity.polyline) {
      const material = entity.polyline.material as PolylineGlowMaterialProperty
      if (material) {
        if (highlight) {
          material.glowPower = new ConstantProperty(0.25) // Stronger glow when highlighted
          material.color = new ConstantProperty(Color.fromCssColorString('#E7D1A7').withAlpha(1.0)) // Full opacity
        } else {
          material.glowPower = new ConstantProperty(0.15) // Normal glow
          material.color = new ConstantProperty(Color.fromCssColorString('#E7D1A7').withAlpha(0.8)) // Normal transparency
        }
      }
    }
  }

  /**
   * Gets all route entities
   */
  getRouteEntities(): Entity[] {
    return [...this.routeEntities]
  }

  /**
   * Removes all route entities
   */
  clearRoutes(): void {
    this.routeEntities.forEach(entity => {
      this.viewer.entities.remove(entity)
    })
    this.routeEntities = []
    console.log('[Route] Cleared all route segments')
  }

  /**
   * Creates a complete tour route with all segments
   */
  static createTourRoute(viewer: Viewer, stops: Stop[]): RouteManager {
    const routeManager = new RouteManager(viewer)
    routeManager.addTourRoute(stops)
    return routeManager
  }

  /**
   * Animates route appearance (for future enhancement)
   */
  animateRouteAppearance(duration: number = 2000): void {
    // Future implementation: animate route segments appearing one by one
    // This could be used when the tour route is first displayed
    console.log(`[Route] Route animation would take ${duration}ms`)
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearRoutes()
  }
}

/**
 * Utility function to create a simple elevated route between stops
 */
export function addSimpleRoute(viewer: Viewer, stops: Stop[]): Entity[] {
  if (stops.length < 2) return []

  const sortedStops = [...stops].sort((a, b) => a.order - b.order)
  const routeEntities: Entity[] = []

  for (let i = 0; i < sortedStops.length - 1; i++) {
    const fromStop = sortedStops[i]
    const toStop = sortedStops[i + 1]
    
    if (fromStop.lat != null && fromStop.lng != null && 
        toStop.lat != null && toStop.lng != null) {
      
      // Create elevated positions
      const positions = [
        Cartesian3.fromDegrees(fromStop.lng, fromStop.lat, 100000), // 100km elevation
        Cartesian3.fromDegrees(toStop.lng, toStop.lat, 100000)
      ]

      const routeEntity = viewer.entities.add({
        id: `simple-route-${i}`,
        polyline: {
          positions: positions,
          width: 4,
          arcType: ArcType.GEODESIC,
          clampToGround: false,
          material: new PolylineGlowMaterialProperty({
            glowPower: new ConstantProperty(0.25),
            color: new ConstantProperty(Color.fromCssColorString('#D4AF37').withAlpha(0.9))
          }),
          zIndex: 1000
        }
      })

      routeEntities.push(routeEntity)
    }
  }

  return routeEntities
}

/**
 * Creates a premium route with enhanced visual effects
 */
export function addPremiumRoute(viewer: Viewer, stops: Stop[]): RouteManager {
  return RouteManager.createTourRoute(viewer, stops)
}