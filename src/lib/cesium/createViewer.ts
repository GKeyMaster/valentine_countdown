import {
  Viewer,
  EllipsoidTerrainProvider,
  UrlTemplateImageryProvider,
  WebMapTileServiceImageryProvider,
  WebMercatorTilingScheme,
  Credit,
  ConstantProperty,
  ScreenSpaceEventType,
  SunLight
} from 'cesium'
import type { ImageryLayer } from 'cesium'
import { addNightLightsLayer } from './imagery/nightLights'

export interface ViewerCreationResult {
  viewer: Viewer
  gibsLayer: ImageryLayer
  osmLayer: ImageryLayer
  isReady: Promise<void>
  onImageryReady: (callback: () => void) => void
}

export type MapMode = 'overview' | 'venue'

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/** Crossfade imagery layers over 350ms. overview: GIBS visible; venue: OSM visible. */
export function setMapMode(
  mode: MapMode,
  viewer: Viewer,
  gibsLayer: ImageryLayer,
  osmLayer: ImageryLayer,
  options?: { routeEntities?: Array<{ show: unknown }> }
): void {
  const targetGibs = mode === 'overview' ? 1 : 0
  const targetOsm = mode === 'venue' ? 1 : 0
  const startGibs = gibsLayer.alpha
  const startOsm = osmLayer.alpha
  const duration = 350
  const start = performance.now()

  if (options?.routeEntities) {
    const show = mode === 'overview'
    options.routeEntities.forEach((e) => {
      ;(e as { show: unknown }).show = new ConstantProperty(show)
    })
  }

  const tick = () => {
    const elapsed = performance.now() - start
    const t = Math.min(1, elapsed / duration)
    const eased = easeInOutQuad(t)
    gibsLayer.alpha = startGibs + (targetGibs - startGibs) * eased
    osmLayer.alpha = startOsm + (targetOsm - startOsm) * eased
    if (viewer.scene.requestRenderMode) {
      viewer.scene.requestRender()
    }
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

let viewerCreationCount = 0

export async function createViewer(container: HTMLElement, creditContainer?: HTMLElement): Promise<ViewerCreationResult> {
  viewerCreationCount++
  console.log(`[Cesium] createViewer called (count: ${viewerCreationCount})`)
  
  // Create terrain provider (no Ion required)
  const terrainProvider = new EllipsoidTerrainProvider()

  // Create viewer with minimal configuration and custom credit container
  const viewer = new Viewer(container, {
    terrainProvider,
    imageryProvider: false,
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    selectionIndicator: false,
    infoBox: false,
    creditContainer: creditContainer
  })

  viewer.imageryLayers.removeAll(true)

  viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK)
  viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

  // NATURAL global layer (NASA GIBS, Web Mercator)
  const gibs = new WebMapTileServiceImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/default/GoogleMapsCompatible_Level8/{TileMatrix}/{TileRow}/{TileCol}.jpg',
    layer: 'BlueMarble_ShadedRelief_Bathymetry',
    style: 'default',
    format: 'image/jpeg',
    tileMatrixSetID: 'GoogleMapsCompatible_Level8',
    tilingScheme: new WebMercatorTilingScheme(),
    minimumLevel: 1,
    maximumLevel: 8,
    credit: new Credit('NASA GIBS'),
  })
  const gibsLayer = viewer.imageryLayers.addImageryProvider(gibs)
  gibsLayer.alpha = 1.0

  // Night-only city lights (visible only on night side)
  addNightLightsLayer(viewer, gibsLayer)

  // CITY/STREET layer (OSM raster)
  const osm = new UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    tilingScheme: new WebMercatorTilingScheme(),
    maximumLevel: 19,
    credit: new Credit('© OpenStreetMap contributors'),
  })
  const osmLayer = viewer.imageryLayers.addImageryProvider(osm)
  osmLayer.alpha = 0.0

  // Performance: only render when needed (camera/entities change)
  viewer.scene.requestRenderMode = true
  const renderLoop = () => {
    viewer.scene.requestRender()
    requestAnimationFrame(renderLoop)
  }
  requestAnimationFrame(renderLoop)

  // Night side / day-night terminator shading (tokenless)
  viewer.scene.globe.enableLighting = true
  viewer.scene.light = new SunLight()
  viewer.scene.skyAtmosphere.show = true
  const globe = viewer.scene.globe as Record<string, unknown>
  if ('dynamicAtmosphereLighting' in globe) globe.dynamicAtmosphereLighting = true
  if ('dynamicAtmosphereLightingFromSun' in globe) globe.dynamicAtmosphereLightingFromSun = true

  // Premium atmosphere settings (tokenless)
  viewer.scene.globe.show = true
  viewer.scene.fog.enabled = false
  viewer.scene.globe.showGroundAtmosphere = true

  // Premium globe visual settings
  viewer.scene.highDynamicRange = true
  viewer.scene.globe.maximumScreenSpaceError = 1.2 // Higher quality
  
  // Enable FXAA anti-aliasing
  if (viewer.scene.postProcessStages && viewer.scene.postProcessStages.fxaa) {
    viewer.scene.postProcessStages.fxaa.enabled = true
  }

  // Track imagery readiness (GIBS is primary for overview)
  let imageryReadyCallback: (() => void) | null = null
  let imageryReady = false

  const isReady = new Promise<void>((resolve) => {
    const checkReadiness = () => {
      const gibsReady = (gibs as unknown as { _ready?: boolean })._ready !== false
      const osmReady = (osm as unknown as { _ready?: boolean })._ready !== false
      if ((gibsReady || osmReady) && !imageryReady) {
        imageryReady = true
        console.log('[Cesium] Imagery layers ready')
        imageryReadyCallback?.()
        resolve()
      } else {
        setTimeout(checkReadiness, 100)
      }
    }
    setTimeout(checkReadiness, 500)
  })

  const onImageryReady = (callback: () => void) => {
    if (imageryReady) {
      callback()
    } else {
      imageryReadyCallback = callback
    }
  }

  // DEV-ONLY: Verification logging and tokenless check
  if (import.meta.env.DEV) {
    console.log('🌍 Cesium Viewer Initialized - Premium Tokenless Configuration')
    console.log(`[Tokenless] Ion token:`, (window as any).Cesium?.Ion?.defaultAccessToken || 'undefined')
    
    // Check for unwanted providers
    const layers = viewer.imageryLayers
    for (let i = 0; i < layers.length; i++) {
      const layer = layers.get(i)
      const provider = layer.imageryProvider
      
      // Type-safe property access
      const providerAny = provider as any
      const url = providerAny.url || providerAny._url || ''
      
      // Check for banned URLs
      const bannedDomains = [
        'ion.cesium.com',
        'api.cesium.com', 
        'assets.cesium.com',
        'virtualearth',
        'google'
      ]
      
      const hasBannedDomain = bannedDomains.some(domain => url.includes(domain))
      
      if (hasBannedDomain) {
        console.warn('⚠️ UNWANTED IMAGERY PROVIDER DETECTED:', url)
      } else {
        console.log(`✅ Layer ${i}: ${provider.constructor.name}`)
        if (url) {
          console.log(`   URL: ${url}`)
        }
        console.log(`   Max Level: ${providerAny.maximumLevel}`)
      }
    }
    
    console.log(`📊 Total imagery layers: ${layers.length}`)
    console.log(`🎨 HDR enabled: ${viewer.scene.highDynamicRange}`)
    console.log(`🔍 Screen space error: ${viewer.scene.globe.maximumScreenSpaceError}`)
    console.log(`✨ FXAA enabled: ${viewer.scene.postProcessStages?.fxaa?.enabled || false}`)
  }

  return {
    viewer,
    gibsLayer,
    osmLayer,
    isReady,
    onImageryReady
  }
}