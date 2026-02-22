import type { Viewer } from 'cesium'
import { PostProcessStage, Cartesian3, Color } from 'cesium'

const FOG_FRAGMENT_SHADER = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform vec3 u_venueWC;
uniform float u_startMeters;
uniform float u_endMeters;
uniform float u_strength;
uniform vec4 u_fogColor;

in vec2 v_textureCoordinates;

void main() {
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);
  if (depth >= 1.0) {
    out_FragColor = texture(colorTexture, v_textureCoordinates);
    return;
  }
  vec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
  positionEC = positionEC / positionEC.w;
  vec4 positionWC4 = czm_inverseView * vec4(positionEC.xyz, 1.0);
  vec3 positionWC = positionWC4.xyz;
  float d = distance(positionWC, u_venueWC);
  float t = smoothstep(u_startMeters, u_endMeters, d);
  float fogFactor = clamp(t * u_strength, 0.0, 1.0);
  vec4 sceneColor = texture(colorTexture, v_textureCoordinates);
  vec3 outRgb = mix(sceneColor.rgb, u_fogColor.rgb, fogFactor);
  out_FragColor = vec4(outRgb, sceneColor.a);
}
`

export interface VenueFogOptions {
  startMeters?: number
  endMeters?: number
  color?: Color
  strength?: number
}

let fogStage: PostProcessStage | null = null

/**
 * Enables venue-centered fog post-process.
 * Fog distance is measured from venue world position. No fog inside startMeters.
 */
export function enableVenueFog(
  viewer: Viewer,
  venueWC: Cartesian3,
  opts: VenueFogOptions = {}
): void {
  viewer.scene.fog.enabled = false

  const startMeters = opts.startMeters ?? 2000.0
  const endMeters = opts.endMeters ?? 12000.0
  const strength = opts.strength ?? 0.85
  const fogColor = opts.color ?? new Color(0.78, 0.82, 0.86, 1.0)

  if (fogStage) {
    fogStage.enabled = true
    fogStage.uniforms.u_venueWC = venueWC
    fogStage.uniforms.u_startMeters = startMeters
    fogStage.uniforms.u_endMeters = endMeters
    fogStage.uniforms.u_strength = strength
    fogStage.uniforms.u_fogColor = fogColor
    return
  }

  fogStage = viewer.scene.postProcessStages.add(
    new PostProcessStage({
      name: 'venueFog',
      fragmentShader: FOG_FRAGMENT_SHADER,
      uniforms: {
        u_venueWC: venueWC,
        u_startMeters: startMeters,
        u_endMeters: endMeters,
        u_strength: strength,
        u_fogColor: fogColor,
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
