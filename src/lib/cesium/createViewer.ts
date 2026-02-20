import {
  Viewer,
  EllipsoidTerrainProvider,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  Rectangle,
  Credit,
  JulianDate
} from 'cesium'

export function createViewer(container: HTMLElement): Viewer {
  // Create terrain provider (no Ion required)
  const terrainProvider = new EllipsoidTerrainProvider()

  // Create viewer with minimal configuration
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

  // GUARANTEE no Ion imagery remains
  viewer.imageryLayers.removeAll(true)

  // Create NASA GIBS WMTS REST provider using EPSG:3857 Web Mercator
  const nasaImageryProvider = new UrlTemplateImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    minimumLevel: 1, // GIBS Web Mercator zoom level 0 not supported
    maximumLevel: 8,
    tilingScheme: new WebMercatorTilingScheme(),
    // Limit to Web Mercator valid latitude range
    rectangle: Rectangle.fromDegrees(-180, -85.05112878, 180, 85.05112878),
    credit: new Credit('NASA EOSDIS GIBS')
  })

  // Add NASA day imagery as the base layer
  viewer.imageryLayers.addImageryProvider(nasaImageryProvider)

  // Create NASA night lights imagery provider
  const nightImageryProvider = new UrlTemplateImageryProvider({
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    minimumLevel: 1,
    maximumLevel: 8,
    tilingScheme: new WebMercatorTilingScheme(),
    rectangle: Rectangle.fromDegrees(-180, -85.05112878, 180, 85.05112878),
    credit: new Credit('NASA EOSDIS GIBS')
  })

  // Add night lights layer with day/night blending
  const nightImageryLayer = viewer.imageryLayers.addImageryProvider(nightImageryProvider)
  
  // Configure night lights blending
  nightImageryLayer.dayAlpha = 0.0  // Invisible during day
  nightImageryLayer.nightAlpha = 1.0  // Fully visible at night
  nightImageryLayer.alpha = 0.85  // Overall opacity for tasteful glow
  nightImageryLayer.brightness = 1.1  // Slight brightness boost
  nightImageryLayer.contrast = 1.2  // Enhanced contrast
  nightImageryLayer.gamma = 0.9  // Slight gamma adjustment for glow

  // Enable globe lighting for day/night cycle
  viewer.scene.globe.enableLighting = true
  
  // Enable dynamic atmosphere lighting if available
  if (viewer.scene.globe.dynamicAtmosphereLighting !== undefined) {
    viewer.scene.globe.dynamicAtmosphereLighting = true
  }

  // Premium globe visual settings
  viewer.scene.highDynamicRange = true
  viewer.scene.globe.maximumScreenSpaceError = 1.5 // Higher quality
  
  // Enable FXAA anti-aliasing
  if (viewer.scene.postProcessStages && viewer.scene.postProcessStages.fxaa) {
    viewer.scene.postProcessStages.fxaa.enabled = true
  }

  // Store night layer reference for UI toggle
  ;(viewer as any).nightImageryLayer = nightImageryLayer

  // DEV-ONLY: Verification logging and debug helpers
  if (import.meta.env.DEV) {
    console.log('🌍 Cesium Viewer Initialized - Tokenless EPSG:3857 with Night Lights')
    
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
        const layerType = url.includes('CityLights') ? '🌃 Night' : '🌅 Day'
        console.log(`✅ Layer ${i} ${layerType}: ${provider.constructor.name}`)
        if (url) {
          console.log(`   URL: ${url}`)
        }
        console.log(`   Rectangle: ${provider.rectangle ? 'Custom' : 'Default'}`)
        console.log(`   Tiling Scheme: ${provider.tilingScheme.constructor.name}`)
        if (providerAny.minimumLevel !== undefined) {
          console.log(`   Level Range: ${providerAny.minimumLevel}-${providerAny.maximumLevel}`)
        }
        if (layer.dayAlpha !== undefined) {
          console.log(`   Day/Night Alpha: ${layer.dayAlpha}/${layer.nightAlpha}`)
        }
      }
    }
    
    console.log(`📊 Total imagery layers: ${layers.length}`)
    console.log(`🎨 HDR enabled: ${viewer.scene.highDynamicRange}`)
    console.log(`🌞 Lighting enabled: ${viewer.scene.globe.enableLighting}`)
    console.log(`🌌 Dynamic atmosphere: ${viewer.scene.globe.dynamicAtmosphereLighting || 'N/A'}`)
    console.log(`🔍 Screen space error: ${viewer.scene.globe.maximumScreenSpaceError}`)
    console.log(`✨ FXAA enabled: ${viewer.scene.postProcessStages?.fxaa?.enabled || false}`)

    // Debug helper: Set time to show night side over major cities
    ;(window as any).setNightTime = () => {
      // Set to midnight UTC (shows night over Europe/Africa)
      const currentDate = viewer.clock.currentTime.toString().split('T')[0]
      viewer.clock.currentTime = JulianDate.fromIso8601(`${currentDate}T00:00:00Z`)
      console.log('🌙 Time set to midnight UTC (night over Europe/Africa)')
    }

    // Debug helper: Set time to show day side
    ;(window as any).setDayTime = () => {
      // Set to noon UTC (shows day over Europe/Africa)
      const currentDate = viewer.clock.currentTime.toString().split('T')[0]
      viewer.clock.currentTime = JulianDate.fromIso8601(`${currentDate}T12:00:00Z`)
      console.log('☀️ Time set to noon UTC (day over Europe/Africa)')
    }

    console.log('🔧 Debug helpers available: setNightTime(), setDayTime()')
  }

  return viewer
}