import type { Viewer } from 'cesium'
import {
  getEarthRadius,
  computeEarthCenteredPoseAboveLatLng,
  applyPose,
} from './poses'

/** Distance from Earth center as multiple of radius. Ensures whole sphere visible with spacing (top/bottom). */
const DISTANCE_MULTIPLIER = 5.0

export interface AnchorLonLat {
  lon: number
  lat: number
}

/** Initial view: from southern side (not northern hemisphere). */
const DEFAULT_ANCHOR: AnchorLonLat = { lon: 0, lat: -80 }

/**
 * Sets the overview camera so the entire Earth disk is centered in the viewport.
 * Camera looks at Earth center from a point above the anchor lat/lng.
 */
export function setOverviewCameraCentered(
  viewer: Viewer,
  anchorLonLat?: AnchorLonLat
): void {
  const radius = getEarthRadius(viewer)
  const distanceFromCenter = radius * DISTANCE_MULTIPLIER
  const anchor = anchorLonLat ?? DEFAULT_ANCHOR
  const ellipsoid = viewer.scene.globe.ellipsoid
  const pose = computeEarthCenteredPoseAboveLatLng(
    anchor.lon,
    anchor.lat,
    distanceFromCenter,
    ellipsoid
  )
  applyPose(viewer, pose)
}
