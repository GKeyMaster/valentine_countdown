import type { Viewer } from 'cesium'
import { PostProcessStage, Cartesian3 } from 'cesium'

const FOG_FRAGMENT_SHADER = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float fogStart;
uniform float fogDensity;
uniform vec3 fogColor;

in vec2 v_textureCoordinates;

vec4 toEye(vec2 uv, float depth) {
  vec2 xy = vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y) * 2.0 - 1.0));
  vec4 posInCamera = czm_inverseProjection * vec4(xy, depth, 1.0);
  posInCamera = posInCamera / posInCamera.w;
  return posInCamera;
}

void main() {
  vec4 color = texture(colorTexture, v_textureCoordinates);
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);
  vec4 posEC = toEye(v_textureCoordinates, depth);
  float dist = length(posEC.xyz);
  float fogAmount = 1.0 - exp(-fogDensity * max(0.0, dist - fogStart));
  fogAmount = clamp(fogAmount, 0.0, 1.0);
  vec3 rgb = mix(color.rgb, fogColor, fogAmount);
  out_FragColor = vec4(rgb, color.a);
}
`

export interface VenueFogOptions {
  start?: number
  density?: number
  fogColor?: [number, number, number]
}

let fogStage: PostProcessStage | null = null

/**
 * Enables depth-based fog post-process in venue mode.
 * Fades distant geometry into haze. Single pass, cheap.
 */
export function enableVenueFog(viewer: Viewer, opts: VenueFogOptions = {}): void {
  if (fogStage) {
    fogStage.enabled = true
    return
  }

  const start = opts.start ?? 800.0
  const density = opts.density ?? 0.0012
  const raw = opts.fogColor ?? [0.72, 0.78, 0.82]
  const fogColor = new Cartesian3(raw[0] * 0.85, raw[1] * 0.85, raw[2] * 0.85)

  fogStage = viewer.scene.postProcessStages.add(
    new PostProcessStage({
      name: 'venueFog',
      fragmentShader: FOG_FRAGMENT_SHADER,
      uniforms: {
        fogStart: start,
        fogDensity: density,
        fogColor,
      },
    })
  )
}

/**
 * Disables venue fog post-process.
 */
export function disableVenueFog(viewer: Viewer): void {
  if (fogStage) {
    fogStage.enabled = false
  }
}
