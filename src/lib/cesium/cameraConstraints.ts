import type { Viewer } from 'cesium'
import { Cartesian3, Ellipsoid, Math as CesiumMath } from 'cesium'

export type ViewMode = 'overview' | 'venue' | 'transition'

const VENUE_MIN_ZOOM = 500
const VENUE_MAX_ZOOM = 1500
const OVERVIEW_MIN_ZOOM = 2_000_000
const OVERVIEW_MAX_ZOOM = 30_000_000

const CLAMP_FLY_DURATION = 0.3
const WHEEL_CLAMP_DELAY_MS = 150

let currentViewMode: ViewMode = 'overview'
let lastWheelTs = 0
let clampScheduled = false

/**
 * Applies strict zoom distance limits based on view mode.
 * Enforces mode boundaries: venue stays near-city, overview stays global.
 */
export function applyCameraConstraints(viewer: Viewer, viewMode: ViewMode): void {
  currentViewMode = viewMode
  const controller = viewer.scene.screenSpaceCameraController

  if (viewMode === 'venue') {
    controller.minimumZoomDistance = VENUE_MIN_ZOOM
    controller.maximumZoomDistance = VENUE_MAX_ZOOM
  } else if (viewMode === 'transition') {
    controller.minimumZoomDistance = 1.0
    controller.maximumZoomDistance = Number.POSITIVE_INFINITY
  } else {
    controller.minimumZoomDistance = OVERVIEW_MIN_ZOOM
    controller.maximumZoomDistance = OVERVIEW_MAX_ZOOM
  }
}


/**
 * Clamps camera to zoom bounds with a short flyTo if out of range.
 */
function clampCameraToBounds(viewer: Viewer): void {
  if (currentViewMode === 'transition') return

  const camera = viewer.camera
  const ellipsoid = viewer.scene.globe.ellipsoid

  let minDist: number
  let maxDist: number
  let targetPos: Cartesian3
  let direction: Cartesian3

  if (currentViewMode === 'venue' && viewer.trackedEntity?.position) {
    const pos = viewer.trackedEntity.position.getValue(viewer.clock.currentTime)
    if (!pos) return
    targetPos = pos
    minDist = VENUE_MIN_ZOOM
    maxDist = VENUE_MAX_ZOOM
    direction = Cartesian3.subtract(camera.positionWC, targetPos, new Cartesian3())
  } else {
    // Overview: camera distance from center; height = magnitude - radius
    const camPos = camera.positionWC
    const radius = ellipsoid.maximumRadius
    const centerToCam = Cartesian3.normalize(camPos, new Cartesian3())
    const surfacePoint = Cartesian3.multiplyByScalar(centerToCam, radius, new Cartesian3())
    targetPos = surfacePoint
    minDist = OVERVIEW_MIN_ZOOM
    maxDist = OVERVIEW_MAX_ZOOM
    direction = Cartesian3.clone(centerToCam)
  }

  const currentDist = Cartesian3.distance(camera.positionWC, targetPos)
  if (currentDist >= minDist && currentDist <= maxDist) return

  const clampedDist = CesiumMath.clamp(currentDist, minDist, maxDist)
  let newPos: Cartesian3
  if (currentViewMode === 'venue') {
    newPos = Cartesian3.add(
      targetPos,
      Cartesian3.multiplyByScalar(direction, clampedDist, new Cartesian3()),
      new Cartesian3()
    )
  } else {
    const radius = ellipsoid.maximumRadius
    newPos = Cartesian3.multiplyByScalar(
      direction,
      radius + clampedDist,
      new Cartesian3()
    )
  }

  camera.flyTo({
    destination: newPos,
    duration: CLAMP_FLY_DURATION,
    complete: () => {
      clampScheduled = false
    },
    cancel: () => {
      clampScheduled = false
    },
  })
  clampScheduled = true
}

/**
 * Schedules a clamp check after wheel events.
 */
function scheduleClampCheck(viewer: Viewer): void {
  lastWheelTs = performance.now()
  if (clampScheduled) return

  const check = () => {
    const elapsed = performance.now() - lastWheelTs
    if (elapsed >= WHEEL_CLAMP_DELAY_MS) {
      clampScheduled = true
      clampCameraToBounds(viewer)
      return
    }
    requestAnimationFrame(() => check())
  }
  requestAnimationFrame(check)
}

/**
 * Sets up wheel listener to smoothly clamp camera when zoom exceeds bounds.
 * Call once after viewer creation. Uses current viewMode from applyCameraConstraints.
 */
export function setupZoomClampListener(viewer: Viewer): () => void {
  const canvas = viewer.scene.canvas
  if (!canvas) return () => {}

  const onWheel = () => {
    scheduleClampCheck(viewer)
  }

  canvas.addEventListener('wheel', onWheel, { passive: true })

  return () => {
    canvas.removeEventListener('wheel', onWheel)
  }
}
