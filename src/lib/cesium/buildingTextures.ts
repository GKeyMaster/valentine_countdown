import {
  ImageMaterialProperty,
  ColorMaterialProperty,
  Cartesian2,
  Color,
  ConstantProperty,
} from 'cesium'
import type { MaterialProperty } from 'cesium'

import facade1Url from '@/assets/textures/buildings/facade_01.webp?url'
import facade2Url from '@/assets/textures/buildings/facade_02.webp?url'
import roof1Url from '@/assets/textures/buildings/roof_01.webp?url'

console.log('Building texture URLs:', { facade1Url, facade2Url, roof1Url })
if (import.meta.env.DEV && [facade1Url, facade2Url, roof1Url].some((u) => u.startsWith('data:'))) {
  console.warn('Textures are still inlined; check assetsInlineLimit and file sizes')
}

let useFallbackProcedural = false
let preloadPromise: Promise<void> | null = null

/**
 * Preload an image with decode-safe logic. Uses img.decode() when available.
 */
function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    if (typeof img.decode === 'function') {
      img.onload = () => {
        img.decode().then(() => resolve(img)).catch(() => resolve(img))
      }
    } else {
      img.onload = () => resolve(img)
    }
    img.src = url
  })
}

/**
 * Preload all 3 building textures. On any failure, sets useFallbackProcedural=true and logs the failing url.
 */
function preloadTextures(): Promise<void> {
  if (preloadPromise) return preloadPromise
  const urls = [facade1Url, facade2Url, roof1Url] as const
  preloadPromise = Promise.allSettled(urls.map((u) => preloadImage(u))).then((results) => {
    const imgs = results
      .filter((r): r is PromiseFulfilledResult<HTMLImageElement> => r.status === 'fulfilled')
      .map((r) => r.value)
    const failed = results
      .map((r, i) => (r.status === 'rejected' ? urls[i] : null))
      .filter((u): u is string => u != null)
    if (failed.length > 0) {
      failed.forEach((u) => console.warn('[Buildings] Texture preload failed:', u))
      useFallbackProcedural = true
    } else if (imgs.length >= 3) {
      console.log('Texture decoded sizes', {
        facade1: `${imgs[0].width}x${imgs[0].height}`,
        facade2: `${imgs[1].width}x${imgs[1].height}`,
        roof1: `${imgs[2].width}x${imgs[2].height}`,
      })
    }
  })
  return preloadPromise
}

/**
 * Call before creating building materials. Resolves when textures are ready or fallback is active.
 * Does not block camera flight (building load is fire-and-forget).
 */
export function ensureTexturesReady(): Promise<void> {
  return preloadTextures()
}

function getFallbackFacadeColor(hash: number): Color {
  const brightness = 0.92 + ((hash % 1000) / 1000) * 0.12
  const b = Math.min(255, Math.round(255 * brightness))
  return Color.fromBytes(b, b, b, 255)
}

function getFallbackRoofColor(hash: number): Color {
  const brightness = 0.94 + (((hash >> 8) % 1000) / 1000) * 0.1
  const b = Math.min(255, Math.round(255 * brightness))
  return Color.fromBytes(b, b, b, 255)
}

/**
 * Stable uint32 hash from string (FNV-1a style)
 */
export function stableHash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Choose facade texture path based on hash (facade_01 or facade_02)
 */
function chooseFacadeTexturePath(hash: number): string {
  return (hash % 2) === 0 ? facade1Url : facade2Url
}

/** Brightness multiplier: 0.92..1.04, applied to WHITE for neutral texture multiplication */
function getTint(hash: number): Color {
  const brightness = 0.92 + ((hash % 1000) / 1000) * 0.12
  const b = Math.min(255, Math.round(255 * brightness))
  return Color.fromBytes(b, b, b, 255)
}

/**
 * Get facade material. Color.WHITE base; subtle brightness 0.92..1.04 via tint.
 */
export function getFacadeMaterial(hash: number): MaterialProperty {
  if (useFallbackProcedural) {
    return new ColorMaterialProperty(new ConstantProperty(getFallbackFacadeColor(hash)))
  }
  const image = (hash % 2) === 0 ? facade1Url : facade2Url
  return new ImageMaterialProperty({
    image,
    repeat: new Cartesian2(4, 1),
    color: new ConstantProperty(getTint(hash)),
  })
}

/**
 * Get roof material. Same; Color.WHITE base with subtle brightness.
 */
export function getRoofMaterial(hash: number): MaterialProperty {
  if (useFallbackProcedural) {
    return new ColorMaterialProperty(new ConstantProperty(getFallbackRoofColor(hash)))
  }
  return new ImageMaterialProperty({
    image: roof1Url,
    repeat: new Cartesian2(2, 2),
    color: new ConstantProperty(getTint(hash)),
  })
}
