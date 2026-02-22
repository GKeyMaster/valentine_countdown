import {
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  GeographicTilingScheme,
  Credit,
} from 'cesium'

export interface CreateVenueImageryOptions {
  url: string
  projection?: 'webMercator' | 'geographic'
  credit?: string
  rectangle?: import('cesium').Rectangle
}

function inferProjection(url: string): 'webMercator' | 'geographic' {
  const lower = url.toLowerCase()
  if (lower.includes('openstreetmap') || lower.includes('tile')) {
    return 'webMercator'
  }
  return 'geographic'
}

/**
 * Creates a UrlTemplateImageryProvider for venue overlay imagery.
 * - webMercator: OSM/slippy tiles {z}/{x}/{y}, max level 19
 * - geographic: EPSG:4326-style, max level 8
 */
export function createVenueImageryProvider(
  options: CreateVenueImageryOptions
): UrlTemplateImageryProvider {
  const {
    url,
    projection = inferProjection(options.url),
    credit,
    rectangle,
  } = options

  const tilingScheme =
    projection === 'webMercator'
      ? new WebMercatorTilingScheme()
      : new GeographicTilingScheme()

  const maximumLevel = projection === 'webMercator' ? 19 : 8

  const provider = new UrlTemplateImageryProvider({
    url,
    tilingScheme,
    maximumLevel,
    credit: credit ? new Credit(credit) : undefined,
    rectangle,
  })

  provider.errorEvent.addEventListener((e) => {
    console.warn('Imagery tile error', e)
  })

  return provider
}
