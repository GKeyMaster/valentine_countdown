import {
  Viewer,
  EllipsoidTerrainProvider,
  WebMapTileServiceImageryProvider,
  GeographicTilingScheme
} from 'cesium'

export function createViewer(container: HTMLElement): Viewer {
  // Create terrain provider (no Ion required)
  const terrainProvider = new EllipsoidTerrainProvider()

  // Create viewer with NO default imagery
  const viewer = new Viewer(container, {
    // Terrain
    terrainProvider,
    
    // Disable UI clutter
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    
    // Keep credit display for attribution
    creditContainer: undefined
  })

  // Remove any existing imagery layers (should be none due to imageryProvider: false)
  viewer.imageryLayers.removeAll(true)

  // Create NASA GIBS WMTS provider using proper KVP endpoint
  const nasaImageryProvider = new WebMapTileServiceImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi',
    layer: 'BlueMarble_ShadedRelief_Bathymetry',
    style: 'default',
    format: 'image/jpeg',
    tileMatrixSetID: '500m',
    tilingScheme: new GeographicTilingScheme(),
    maximumLevel: 8
  })

  // Add NASA imagery as the only base layer
  viewer.imageryLayers.addImageryProvider(nasaImageryProvider)

  // DEV-ONLY: Verification logging
  if (import.meta.env.DEV) {
    console.log('🌍 Cesium Viewer Initialized - Tokenless Configuration')
    
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
        if (providerAny.layer || providerAny._layer) {
          console.log(`   Layer: ${providerAny.layer || providerAny._layer}`)
        }
        if (providerAny.tileMatrixSetID || providerAny._tileMatrixSetID) {
          console.log(`   TileMatrixSet: ${providerAny.tileMatrixSetID || providerAny._tileMatrixSetID}`)
        }
      }
    }
    
    console.log(`📊 Total imagery layers: ${layers.length}`)
  }

  return viewer
}