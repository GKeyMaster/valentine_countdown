import type { Viewer, Entity } from 'cesium'

const CONTROLLER_DEFAULTS = {
  enableTranslate: true,
  enableLook: true,
  enableTilt: true,
  enableRotate: true,
  enableZoom: true,
}

/**
 * Applies hard venue mode camera lock.
 * Camera tracks the entity; user can rotate and zoom but not pan/translate.
 */
export function applyVenueCameraLock(viewer: Viewer, entity: Entity): void {
  const controller = viewer.scene.screenSpaceCameraController

  controller.enableCollisionDetection = false
  viewer.trackedEntity = entity
  controller.enableTranslate = false
  controller.enableLook = false
  controller.enableTilt = true
  controller.enableRotate = true
  controller.enableZoom = true

  if (import.meta.env.DEV) {
    console.log('[VenueCameraLock] trackedEntity set', entity.id)
  }
}

/**
 * Removes venue lock and restores controller defaults for overview mode.
 */
export function removeVenueCameraLock(viewer: Viewer): void {
  const controller = viewer.scene.screenSpaceCameraController

  if (import.meta.env.DEV && viewer.trackedEntity) {
    console.log('[VenueCameraLock] trackedEntity cleared')
  }

  viewer.trackedEntity = undefined
  controller.enableCollisionDetection = true
  controller.enableTranslate = CONTROLLER_DEFAULTS.enableTranslate
  controller.enableLook = CONTROLLER_DEFAULTS.enableLook
  controller.enableTilt = CONTROLLER_DEFAULTS.enableTilt
  controller.enableRotate = CONTROLLER_DEFAULTS.enableRotate
  controller.enableZoom = CONTROLLER_DEFAULTS.enableZoom
}
