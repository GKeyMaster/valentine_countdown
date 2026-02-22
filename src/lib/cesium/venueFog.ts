import type { Viewer } from 'cesium'
import { PostProcessStage, Cartesian3 } from 'cesium'

function getFogDebug(): boolean {
  if (typeof location === 'undefined') return false
  return new URLSearchParams(location.search).has('fogDebug')
}

const FRAGMENT_SHADER = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform vec3 u_venueWC;
uniform float u_fogStart;
uniform float u_fogEnd;
uniform vec3 u_fogColor;
uniform float u_fogDebug;

in vec2 v_textureCoordinates;

void main() {
  vec4 color = texture(colorTexture, v_textureCoordinates);
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);

  if (depth > 0.9999) {
    out_FragColor = color;
    return;
  }

  vec4 eye = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
  vec3 posEC = eye.xyz / eye.w;
  vec3 venueEC = (czm_view * vec4(u_venueWC, 1.0)).xyz;
  float d = length(posEC - venueEC);
  d = min(d, u_fogEnd);

  float fogFactor;
  if (d <= u_fogStart) {
    fogFactor = 0.0;
  } else {
    fogFactor = smoothstep(u_fogStart, u_fogEnd, d);
  }

  if (u_fogDebug > 0.5) {
    out_FragColor = vec4(vec3(fogFactor), 1.0);
    return;
  }

  vec3 rgb = mix(color.rgb, u_fogColor, fogFactor);
  out_FragColor = vec4(rgb, color.a);
}
`

let stage: PostProcessStage | null = null
let viewerRef: Viewer | null = null
let venueWCRef: Cartesian3 | null = null
let fogStartRef = 1200.0
let fogEndRef = 8000.0
let hasLoggedFogEnable = false

const FOG_COLOR = new Cartesian3(0.04, 0.06, 0.09)
/** Slightly lighter than background for fog debug visibility */
const FOG_COLOR_DEBUG = new Cartesian3(0.08, 0.11, 0.15)

export interface VenueFogAPI {
  setEnabled: (enabled: boolean) => void
  setVenue: (positionWC: Cartesian3 | null) => void
  setDistances: (start: number, end: number) => void
}

/**
 * Creates (or returns) the venue-centered radial fog PostProcessStage.
 * No fog inside u_fogStart (1200m); smooth fog from u_fogStart to u_fogEnd (8000m).
 */
export function ensureVenueFog(viewer: Viewer): VenueFogAPI {
  viewerRef = viewer
  if (!stage) {
    stage = viewer.scene.postProcessStages.add(
      new PostProcessStage({
        name: 'venueRadialFog',
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          u_venueWC: () => venueWCRef ?? Cartesian3.ZERO,
          u_fogStart: () => (getFogDebug() ? 1200.0 : fogStartRef),
          u_fogEnd: () => (getFogDebug() ? 8000.0 : fogEndRef),
          u_fogColor: () => (getFogDebug() ? FOG_COLOR_DEBUG : FOG_COLOR),
          u_fogDebug: () => (getFogDebug() ? 1.0 : 0.0),
        },
      })
    )
    stage.enabled = false
  }

  return {
    setEnabled(enabled: boolean) {
      if (stage) {
        stage.enabled = enabled
        if (enabled && viewerRef && !hasLoggedFogEnable) {
          hasLoggedFogEnable = true
          console.log('Fog stage enabled', stage.enabled, 'DepthTexture supported:', viewerRef.scene.context.depthTexture)
        }
      }
    },
    setVenue(positionWC: Cartesian3 | null) {
      venueWCRef = positionWC
    },
    setDistances(start: number, end: number) {
      fogStartRef = start
      fogEndRef = end
    },
  }
}
