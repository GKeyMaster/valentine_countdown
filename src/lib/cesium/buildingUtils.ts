import {
  Viewer,
  Entity,
  Cartesian3,
  PolygonHierarchy,
  ConstantProperty,
  Ellipsoid,
} from 'cesium'
import type { Stop } from '../data/types'
import { stableHash, getFacadeMaterial, getRoofMaterial } from './buildingTextures'

const MAX_BUILDINGS_PER_STOP = 500
const DEBUG_BUILDINGS = true

/**
 * Calculates building height from OSM properties with proper clamping
 */
function calculateBuildingHeight(properties: Record<string, unknown> | undefined): number {
  if (!properties) return 12 + (Math.random() * 48)

  if (properties.height) {
    const heightStr = String(properties.height).toLowerCase()
    const heightMatch = heightStr.match(/(\d+(?:\.\d+)?)/)
    if (heightMatch) {
      const height = parseFloat(heightMatch[1])
      return Math.max(8, Math.min(220, height))
    }
  }

  if (properties['building:levels']) {
    const levels = parseInt(String(properties['building:levels']), 10)
    if (!isNaN(levels) && levels > 0) {
      const height = levels * 3.2
      return Math.max(8, Math.min(160, height))
    }
  }

  return 12 + Math.random() * 48
}

type GeoJSONFeature = {
  type: 'Feature'
  geometry?: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  properties?: Record<string, unknown>
}

type GeoJSONFC = {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

/**
 * Converts GeoJSON ring [[lon,lat],...] to Cartesian3[] at ground level
 */
function ringToCartesian(ring: number[][], ellipsoid: Ellipsoid = Ellipsoid.WGS84): Cartesian3[] {
  const positions: Cartesian3[] = []
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i]
    const h = ring[i].length > 2 ? ring[i][2] : 0
    positions.push(Cartesian3.fromDegrees(lon, lat, h))
  }
  return positions
}

/**
 * Building manager for loading and displaying 3D buildings with photo textures.
 * Uses WallGraphics for facades and PolygonGraphics for roofs (separate materials).
 */
export class BuildingManager {
  private viewer: Viewer
  private entitiesByStop: Map<string, Entity[]> = new Map()
  private loadingPromises: Map<string, Promise<void>> = new Map()

  constructor(viewer: Viewer) {
    this.viewer = viewer
  }

  /**
   * Loads and displays buildings for a stop. Uses walls + roofs with photo textures.
   * Only intended for venue mode.
   * @param isStillRelevant - Optional predicate; if false when load completes, entities are not added
   */
  async loadBuildingsForStop(
    stop: Stop,
    isStillRelevant?: () => boolean
  ): Promise<void> {
    const stopId = stop.id

    // Remove previously loaded buildings for other stops
    for (const [prevStopId, entities] of this.entitiesByStop.entries()) {
      if (prevStopId !== stopId) {
        entities.forEach(e => this.viewer.entities.remove(e))
        this.entitiesByStop.delete(prevStopId)
      }
    }

    if (this.entitiesByStop.has(stopId) || this.loadingPromises.has(stopId)) {
      return this.loadingPromises.get(stopId) ?? Promise.resolve()
    }

    const loadingPromise = this.loadBuildingsInternal(stop, isStillRelevant)
    this.loadingPromises.set(stopId, loadingPromise)

    try {
      await loadingPromise
    } finally {
      this.loadingPromises.delete(stopId)
    }
  }

  private async loadBuildingsInternal(
    stop: Stop,
    isStillRelevant?: () => boolean
  ): Promise<void> {
    const stopId = stop.id
    const buildingUrl = `/data/buildings/${stopId}.geojson`
    const ellipsoid = this.viewer.scene.globe.ellipsoid

    try {
      const response = await fetch(buildingUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: GeoJSONFC = await response.json()
      const features = Array.isArray(data.features) ? data.features : []

      const entities: Entity[] = []
      let wallCount = 0
      let roofCount = 0

      const buildingsToProcess = features.slice(0, MAX_BUILDINGS_PER_STOP)

      for (let i = 0; i < buildingsToProcess.length; i++) {
        const feature = buildingsToProcess[i]
        if (!feature.geometry || feature.geometry.type !== 'Polygon') continue

        const coords = feature.geometry.coordinates
        if (!coords?.[0] || coords[0].length < 3) continue

        const ring = coords[0]
        const height = calculateBuildingHeight(feature.properties)
        const hash = stableHash(`${stopId}-${i}`)

        const positions = ringToCartesian(ring, ellipsoid)
        const minHeights = positions.map(() => 0)
        const maxHeights = positions.map(() => height)

        // 1) Wall entity
        const wallEntity = this.viewer.entities.add({
          name: `building-wall-${stopId}-${i}`,
          wall: {
            positions: new ConstantProperty(positions),
            minimumHeights: new ConstantProperty(minHeights),
            maximumHeights: new ConstantProperty(maxHeights),
            material: getFacadeMaterial(hash),
            outline: false,
          },
        })
        entities.push(wallEntity)
        wallCount++

        // 2) Roof polygon entity
        const roofEntity = this.viewer.entities.add({
          name: `building-roof-${stopId}-${i}`,
          polygon: {
            hierarchy: new ConstantProperty(new PolygonHierarchy(positions)),
            height: new ConstantProperty(height),
            extrudedHeight: new ConstantProperty(height + 0.5),
            material: getRoofMaterial(hash),
            outline: false,
          },
        })
        entities.push(roofEntity)
        roofCount++
      }

      if (isStillRelevant && !isStillRelevant()) {
        entities.forEach(e => this.viewer.entities.remove(e))
        return
      }

      this.entitiesByStop.set(stopId, entities)

      if (DEBUG_BUILDINGS) {
        const total = wallCount + roofCount
        console.log(`[Buildings] Loaded: ${wallCount} walls, ${roofCount} roofs (total entities: ${total}) for ${stop.city}`)
      }
    } catch (error) {
      console.warn(`[Buildings] Failed to load for ${stop.city}:`, error)
    }
  }

  async removeBuildingsForStop(stopId: string): Promise<void> {
    const entities = this.entitiesByStop.get(stopId)
    if (entities) {
      entities.forEach(e => this.viewer.entities.remove(e))
      this.entitiesByStop.delete(stopId)
      console.log(`[Buildings] Removed buildings for stop ${stopId}`)
    }
  }

  setBuildingsVisibility(_stopId: string, _visible: boolean): void {
    // Visibility per-stop could be added via entity.show
  }

  async clearAllBuildings(): Promise<void> {
    const promises = Array.from(this.entitiesByStop.keys()).map(stopId =>
      this.removeBuildingsForStop(stopId)
    )
    await Promise.all(promises)
    console.log('[Buildings] Cleared all buildings')
  }

  getLoadedStops(): string[] {
    return Array.from(this.entitiesByStop.keys())
  }

  areBuildingsLoaded(stopId: string): boolean {
    return this.entitiesByStop.has(stopId)
  }
}
