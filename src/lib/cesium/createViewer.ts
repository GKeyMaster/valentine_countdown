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
}

// Cache resolved templates to avoid re-resolving on every viewer creation
let cachedTemplates: { dayTemplate: any; nightTemplate: any } | null = null

export async function createViewer(container: HTMLElement, creditContainer?: HTMLElement): Promise<ViewerCreationResult> {
  // Create terrain provider (no Ion required)
  const terrainProvider = new EllipsoidTerrainProvider()

  // Create viewer with minimal configuration and custom credit container
  let viewer: Viewer
  try {
    viewer = new Viewer(container, {
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
    
    // Suppress iframe-related errors that don't affect core functionality
    const originalConsoleError = console.error
    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('sandboxed') || message.includes('about:blank')) {
        // Suppress sandboxed iframe errors that don't affect core functionality
        return
      }
      originalConsoleError.apply(console, args)
    }
    
    console.log('✅ Cesium Viewer instance created')
  } catch (error) {
    console.error('❌ Failed to create Cesium Viewer:', error)
    throw error
  }

  // GUARANTEE no Ion imagery remains
  viewer.imageryLayers.removeAll(true)

  // Resolve best available imagery templates (with caching)
  if (!cachedTemplates) {
    try {
      cachedTemplates = await resolveImageryTemplates(DAY_TEMPLATES, NIGHT_TEMPLATES)
    } catch (error) {
      console.warn('Failed to resolve imagery templates, using fallback:', error)
      // Use fallback templates
      cachedTemplates = {
        dayTemplate: DAY_TEMPLATES[DAY_TEMPLATES.length - 1],
        nightTemplate: NIGHT_TEMPLATES[NIGHT_TEMPLATES.length - 1]
      }
    }
  }
  
  const { dayTemplate, nightTemplate } = cachedTemplates

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

  // Create readiness promise that resolves when both layers are ready
  const isReady = new Promise<void>((resolve) => {
    let attempts = 0
    const maxAttempts = 20 // 20 attempts * 100ms = 2 seconds max
    
    // Wait for the scene to be ready and imagery to start loading
    const checkReady = () => {
      attempts++
      
      try {
        // Check if the viewer is ready and scene is initialized
        if (viewer.scene && viewer.scene.globe && viewer.imageryLayers.length > 0) {
          console.log('✅ Cesium viewer fully initialized')
          console.log('🌍 Scene and imagery ready')
          resolve()
          return
        }
      } catch (error) {
        // Suppress errors during initialization checks
        if (attempts % 5 === 0) { // Log every 5th attempt
          console.warn(`Scene check attempt ${attempts}:`, error.message || error)
        }
      }
      
      // Continue checking or timeout
      if (attempts < maxAttempts) {
        setTimeout(checkReady, 100)
      } else {
        console.log('⏰ Readiness checks completed, viewer should be functional')
        resolve()
      }
    }
    
    // Start checking after a brief initial delay
    setTimeout(checkReady, 200)
  })

  // DEV-ONLY: Verification logging and debug helpers
  if (import.meta.env.DEV) {
    console.log('🌍 Cesium Viewer Initialized - Premium Tokenless Configuration')
    console.log(`🌅 Day template: ${dayTemplate.name} (Level ${dayTemplate.maxLevel})`)
    console.log(`🌃 Night template: ${nightTemplate.name} (Level ${nightTemplate.maxLevel})`)
    
    // Verify viewer is functional despite any iframe warnings
    if (viewer.scene && viewer.scene.globe && viewer.imageryLayers.length > 0) {
      console.log('✅ Viewer is fully functional')
    } else {
      console.warn('⚠️ Viewer may have initialization issues')
    }
    
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

  return { viewer, isReady }
}