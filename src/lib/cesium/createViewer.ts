import {
  Viewer,
  EllipsoidTerrainProvider,
  UrlTemplateImageryProvider,
  GeographicTilingScheme,
  Rectangle,
} from 'cesium';

export interface ViewerOptions {
  container: HTMLElement;
}

export function createViewer({ container }: ViewerOptions): Viewer {
  // Create the NASA GIBS Blue Marble imagery provider
  const imageryProvider = new UrlTemplateImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default//EPSG4326_500m/{z}/{y}/{x}.jpeg',
    tilingScheme: new GeographicTilingScheme(),
    maximumLevel: 8,
    rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
  });

  // Create the terrain provider (ellipsoid - no elevation data)
  const terrainProvider = new EllipsoidTerrainProvider();

  // Create the viewer with minimal UI
  const viewer = new Viewer(container, {
    // Terrain
    terrainProvider,
    
    // Disable UI elements
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    
    // Other settings
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });

  // Remove default imagery layers if any were added
  viewer.imageryLayers.removeAll();
  
  // Add our custom imagery layer
  viewer.imageryLayers.addImageryProvider(imageryProvider);

  return viewer;
}