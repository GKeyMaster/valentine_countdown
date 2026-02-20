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
   * Creates a single route segment between two stops with elevated arc
   */
  private createRouteSegment(fromStop: Stop, toStop: Stop, segmentIndex: number): Entity {
    // Calculate arc positions with elevation for visibility above surface
    const positions = this.createElevatedArcPositions(fromStop, toStop)

    // Create ultra-visible polyline with deep golden color
    const routeEntity = new Entity({
      id: `route-segment-${segmentIndex}`,
      polyline: {
        positions: positions,
        width: 8, // Even wider for maximum visibility
        arcType: ArcType.NONE, // Use custom arc positions instead of geodesic
        clampToGround: false, // Definitely above surface
        material: new PolylineGlowMaterialProperty({
          glowPower: new ConstantProperty(0.8), // Very strong glow
          taperPower: new ConstantProperty(0.3), // Minimal taper for consistent thickness
          color: new ConstantProperty(Color.fromCssColorString('#DAA520').withAlpha(1.0)) // Deep golden rod, full opacity
        }),
        // Render above surface
        // Prevent depth testing issues that cause blinking
        depthFailMaterial: new PolylineGlowMaterialProperty({
          glowPower: new ConstantProperty(0.8),
          taperPower: new ConstantProperty(0.3),
          color: new ConstantProperty(Color.fromCssColorString('#DAA520').withAlpha(1.0))
        }),
        // Make always visible
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
   * Creates elevated arc positions between two cities
   */
  private createElevatedArcPositions(fromStop: Stop, toStop: Stop): Cartesian3[] {
    const startLon = fromStop.lng!
    const startLat = fromStop.lat!
    const endLon = toStop.lng!
    const endLat = toStop.lat!
    
    // Calculate distance to determine arc height
    const distance = Math.sqrt(
      Math.pow(endLon - startLon, 2) + Math.pow(endLat - startLat, 2)
    )
    
    // Arc height based on distance (higher for longer routes)
    const maxHeight = Math.max(200000, distance * 50000) // Minimum 200km elevation
    
    const positions: Cartesian3[] = []
    const segments = 50 // More segments for smoother arc
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      
      // Linear interpolation for lat/lon
      const lon = startLon + (endLon - startLon) * t
      const lat = startLat + (endLat - startLat) * t
      
      // Parabolic arc for height (highest at middle)
      const height = maxHeight * Math.sin(Math.PI * t)
      
      positions.push(Cartesian3.fromDegrees(lon, lat, height))
    }
    
    return positions
  }


  /**
   * Updates route visibility to prevent blinking and ensure stability
   */
  updateRouteVisibility(): void {
    const cameraHeight = this.viewer.camera.positionCartographic.height
    
    // Always show routes when zoomed out enough - no blinking
    const shouldShowRoute = cameraHeight > 300000 // Lower threshold for better visibility
    
    this.routeEntities.forEach(entity => {
      if (entity.polyline) {
        // Stable visibility - no flickering
        entity.show = shouldShowRoute
        
        if (shouldShowRoute) {
          // Keep consistent deep golden color - no opacity changes that cause blinking
          const material = entity.polyline.material as PolylineGlowMaterialProperty
          const depthMaterial = entity.polyline.depthFailMaterial as PolylineGlowMaterialProperty
          
          const deepGolden = Color.fromCssColorString('#DAA520') // Deep golden rod
          
          if (material) {
            material.color = new ConstantProperty(deepGolden.withAlpha(1.0))
          }
          if (depthMaterial) {
            depthMaterial.color = new ConstantProperty(deepGolden.withAlpha(1.0))
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
          material.glowPower = new ConstantProperty(1.0) // Maximum glow when highlighted
          material.color = new ConstantProperty(Color.fromCssColorString('#FFD700').withAlpha(1.0)) // Bright gold when highlighted
        } else {
          material.glowPower = new ConstantProperty(0.8) // Strong normal glow
          material.color = new ConstantProperty(Color.fromCssColorString('#DAA520').withAlpha(1.0)) // Deep golden rod normal
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
 * Utility function to create a simple route between stops
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
      
      // Create elevated arc for simple route too
      const elevatedPositions = [
        Cartesian3.fromDegrees(fromStop.lng, fromStop.lat, 200000), // 200km elevation
        Cartesian3.fromDegrees(toStop.lng, toStop.lat, 200000)
      ]

      const routeEntity = viewer.entities.add({
        id: `simple-route-${i}`,
        polyline: {
          positions: elevatedPositions,
          width: 8,
          arcType: ArcType.NONE, // Use elevated positions
          clampToGround: false,
          material: new PolylineGlowMaterialProperty({
            glowPower: new ConstantProperty(0.8),
            color: new ConstantProperty(Color.fromCssColorString('#DAA520').withAlpha(1.0))
          }),
          depthFailMaterial: new PolylineGlowMaterialProperty({
            glowPower: new ConstantProperty(0.8),
            color: new ConstantProperty(Color.fromCssColorString('#DAA520').withAlpha(1.0))
          })
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