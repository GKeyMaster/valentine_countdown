import {
  Viewer,
  EllipsoidTerrainProvider,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  Rectangle,
  Credit,
  JulianDate
} from 'cesium'
import { DAY_TEMPLATES, NIGHT_TEMPLATES } from '../imagery/gibsTemplates'
import { resolveImageryTemplates } from '../imagery/resolveGibsTemplate'

export interface ViewerCreationResult {
  viewer: Viewer
  isReady: Promise<void>
  onImageryReady: (callback: () => void) => void
}

let viewerCreationCount = 0

export async function createViewer(container: HTMLElement, creditContainer?: HTMLElement): Promise<ViewerCreationResult> {
  viewerCreationCount++
  console.log(`[Cesium] createViewer called (count: ${viewerCreationCount})`)
  
  // Create terrain provider (no Ion required)
  const terrainProvider = new EllipsoidTerrainProvider()

  // Create viewer with minimal configuration and custom credit container
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
    
    // Custom credit container for unobtrusive credits
    creditContainer: creditContainer
  })

  // GUARANTEE no Ion imagery remains
  viewer.imageryLayers.removeAll(true)

  // Resolve best available imagery templates
  const { dayTemplate, nightTemplate } = await resolveImageryTemplates(DAY_TEMPLATES, NIGHT_TEMPLATES)

  // Create day imagery provider with resolved template
  const dayImageryProvider = new UrlTemplateImageryProvider({
    url: dayTemplate.url,
    minimumLevel: 1,
    maximumLevel: dayTemplate.maxLevel,
    tilingScheme: new WebMercatorTilingScheme(),
    rectangle: Rectangle.fromDegrees(-180, -85.05112878, 180, 85.05112878),
    credit: new Credit('NASA EOSDIS GIBS')
  })

  // Create night imagery provider with resolved template
  const nightImageryProvider = new UrlTemplateImageryProvider({
    url: nightTemplate.url,
    minimumLevel: 1,
    maximumLevel: nightTemplate.maxLevel,
    tilingScheme: new WebMercatorTilingScheme(),
    rectangle: Rectangle.fromDegrees(-180, -85.05112878, 180, 85.05112878),
    credit: new Credit('NASA EOSDIS GIBS')
  })

  // Add imagery layers
  viewer.imageryLayers.addImageryProvider(dayImageryProvider)
  const nightImageryLayer = viewer.imageryLayers.addImageryProvider(nightImageryProvider)
  
  // Configure night lights blending (tasteful settings)
  nightImageryLayer.dayAlpha = 0.0    // Invisible during day
  nightImageryLayer.nightAlpha = 1.0  // Fully visible at night
  nightImageryLayer.alpha = 0.85      // Overall opacity for tasteful glow
  nightImageryLayer.brightness = 1.05 // Subtle brightness boost
  nightImageryLayer.contrast = 1.15   // Enhanced contrast
  nightImageryLayer.gamma = 0.95      // Slight gamma adjustment

  // Enable globe lighting for day/night cycle
  viewer.scene.globe.enableLighting = true
  
  // Enable dynamic atmosphere lighting if available
  if (viewer.scene.globe.dynamicAtmosphereLighting !== undefined) {
    viewer.scene.globe.dynamicAtmosphereLighting = true
  }

  // Premium globe visual settings
  viewer.scene.highDynamicRange = true
  viewer.scene.globe.maximumScreenSpaceError = 1.2 // Higher quality
  
  // Enable FXAA anti-aliasing
  if (viewer.scene.postProcessStages && viewer.scene.postProcessStages.fxaa) {
    viewer.scene.postProcessStages.fxaa.enabled = true
  }

  // Store references for debugging
  ;(viewer as any).nightImageryLayer = nightImageryLayer
  ;(viewer as any).dayImageryProvider = dayImageryProvider
  ;(viewer as any).nightImageryProvider = nightImageryProvider

  // Track imagery readiness
  let imageryReadyCallback: (() => void) | null = null
  let imageryReady = false

  // Create readiness promise that resolves when both layers are ready
  const isReady = new Promise<void>((resolve) => {
    // Wait for imagery providers to initialize and load initial tiles
    const checkReadiness = () => {
      // Check if both providers have loaded at least one tile
      const dayReady = (dayImageryProvider as any)._ready !== false
      const nightReady = (nightImageryProvider as any)._ready !== false
      
      if (dayReady && nightReady && !imageryReady) {
        imageryReady = true
        console.log('[Cesium] Imagery layers ready')
        
        // Notify callback if set
        if (imageryReadyCallback) {
          imageryReadyCallback()
        }
        
        resolve()
      } else {
        // Check again in a bit
        setTimeout(checkReadiness, 100)
      }
    }
    
    // Start checking after a brief delay
    setTimeout(checkReadiness, 500)
  })

  const onImageryReady = (callback: () => void) => {
    if (imageryReady) {
      callback()
    } else {
      imageryReadyCallback = callback
    }
  }

  // DEV-ONLY: Verification logging and debug helpers
  if (import.meta.env.DEV) {
    console.log('🌍 Cesium Viewer Initialized - Premium Tokenless Configuration')
    console.log(`🌅 Day template: ${dayTemplate.name} (Level ${dayTemplate.maxLevel})`)
    console.log(`🌃 Night template: ${nightTemplate.name} (Level ${nightTemplate.maxLevel})`)
    
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
        console.log(`   Max Level: ${providerAny.maximumLevel}`)
        if (layer.dayAlpha !== undefined) {
          console.log(`   Day/Night Alpha: ${layer.dayAlpha}/${layer.nightAlpha}`)
        }
      }
    }
    
    console.log(`📊 Total imagery layers: ${layers.length}`)
    console.log(`🎨 HDR enabled: ${viewer.scene.highDynamicRange}`)
    console.log(`🌞 Lighting enabled: ${viewer.scene.globe.enableLighting}`)
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

  return { 
    viewer, 
    isReady,
    onImageryReady 
  }
}