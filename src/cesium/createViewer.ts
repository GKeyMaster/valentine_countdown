import * as Cesium from 'cesium'

export async function createViewer(container: HTMLElement): Promise<Cesium.Viewer> {
  // Set Cesium Ion access token (use default for now)
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk'

  const viewer = new Cesium.Viewer(container, {
    // Disable all UI widgets
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    vrButton: false,
    
    // Scene configuration for premium look
    scene3DOnly: true,
    shouldAnimate: true,
    
    // Terrain and imagery
    terrainProvider: await Cesium.createWorldTerrainAsync({
      requestWaterMask: true,
      requestVertexNormals: true
    }),
    
    // Use high-resolution imagery
    baseLayer: new Cesium.ImageryLayer(
      await Cesium.IonImageryProvider.fromAssetId(3812)
    )
  })

  // Configure scene for premium appearance
  const scene = viewer.scene
  const globe = scene.globe
  
  // Enable atmosphere and lighting
  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.show = true
  }
  scene.fog.enabled = true
  scene.fog.density = 0.0001
  
  // Enhanced lighting
  globe.enableLighting = true
  globe.atmosphereLightIntensity = 20.0
  globe.atmosphereRayleighCoefficient = new Cesium.Cartesian3(5.5e-6, 13.0e-6, 28.4e-6)
  globe.atmosphereMieCoefficient = new Cesium.Cartesian3(21e-6, 21e-6, 21e-6)
  globe.atmosphereRayleighScaleHeight = 10000.0
  globe.atmosphereMieScaleHeight = 3200.0
  
  // Water and terrain effects
  globe.showWaterEffect = true
  globe.showGroundAtmosphere = true
  
  // Enhanced visual quality
  scene.postProcessStages.fxaa.enabled = true
  scene.globe.maximumScreenSpaceError = 1.0
  
  // Set initial camera position (view of Earth from space)
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000),
    orientation: {
      heading: 0.0,
      pitch: -Cesium.Math.PI_OVER_TWO,
      roll: 0.0
    }
  })

  // Smooth camera controls
  viewer.camera.percentageChanged = 0.01
  
  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    viewer.resize()
  })
  resizeObserver.observe(container)
  
  // Store resize observer for cleanup
  ;(viewer as any)._resizeObserver = resizeObserver
  
  // Override destroy to clean up resize observer
  const originalDestroy = viewer.destroy.bind(viewer)
  viewer.destroy = function() {
    if ((this as any)._resizeObserver) {
      ;(this as any)._resizeObserver.disconnect()
    }
    return originalDestroy()
  }

  return viewer
}