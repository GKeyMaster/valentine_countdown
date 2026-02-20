import {
  Viewer,
  EllipsoidTerrainProvider,
  UrlTemplateImageryProvider,
  GeographicTilingScheme
} from 'cesium'

export function createViewer(container: HTMLElement): Viewer {
  // Create terrain provider (no Ion required)
  const terrainProvider = new EllipsoidTerrainProvider()

  // Create imagery provider using NASA GIBS BlueMarble
  const imageryProvider = new UrlTemplateImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default//EPSG4326_500m/{z}/{y}/{x}.jpeg',
    tilingScheme: new GeographicTilingScheme(),
    maximumLevel: 8
  })

  // Create viewer with minimal UI
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

  // Replace the default imagery with NASA GIBS
  viewer.imageryLayers.removeAll()
  viewer.imageryLayers.addImageryProvider(imageryProvider)

  return viewer
}