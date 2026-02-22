import {
  ImageMaterialProperty,
  Cartesian2,
  Color,
  ConstantProperty
} from 'cesium'

const FACADE_01 = '/textures/buildings/facade_01.webp'
const FACADE_02 = '/textures/buildings/facade_02.webp'
const ROOF_01 = '/textures/buildings/roof_01.webp'

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
  return (hash % 2) === 0 ? FACADE_01 : FACADE_02
}

/**
 * Tint color for facade: subtle brightness 0.85..1.05
 */
function getFacadeTint(hash: number): Color {
  const t = (hash % 21) / 20 // 0..1
  const brightness = 0.85 + t * 0.2
  const b = Math.round(255 * brightness)
  return Color.fromBytes(b, b, Math.round(b * 0.98), 255)
}

/**
 * Tint color for roof: subtle brightness
 */
function getRoofTint(hash: number): Color {
  const t = ((hash >> 8) % 21) / 20
  const brightness = 0.88 + t * 0.14
  const b = Math.round(255 * brightness)
  return Color.fromBytes(b, b, Math.round(b * 0.96), 255)
}

/**
 * Get facade material for a building. Caches shared image materials; color differs per call.
 */
export function getFacadeMaterial(hash: number): ImageMaterialProperty {
  const path = chooseFacadeTexturePath(hash)
  const tint = getFacadeTint(hash)

  return new ImageMaterialProperty({
    image: path,
    repeat: new Cartesian2(4, 1),
    color: new ConstantProperty(tint),
  })
}

/**
 * Get roof material for a building.
 */
export function getRoofMaterial(hash: number): ImageMaterialProperty {
  const tint = getRoofTint(hash)
  return new ImageMaterialProperty({
    image: ROOF_01,
    repeat: new Cartesian2(2, 2),
    color: new ConstantProperty(tint),
  })
}
