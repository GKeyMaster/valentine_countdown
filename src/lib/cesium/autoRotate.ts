import { Viewer, Cartesian3 } from 'cesium'
import { setOverviewCameraCentered } from './camera/overview'

/**
 * Sets the camera to show the entire Earth centered in the viewport.
 */
export function setOverviewCamera(viewer: Viewer): void {
  setOverviewCameraCentered(viewer)
}

/**
 * Applies overview zoom constraints so the camera stays at whole-globe framing.
 */
export function applyOverviewConstraints(viewer: Viewer): void {
  const controller = viewer.scene.screenSpaceCameraController
  controller.minimumZoomDistance = 20_000_000
  controller.maximumZoomDistance = 40_000_000
}

/**
 * Removes overview constraints (for venue mode - allow free zoom).
 */
export function removeOverviewConstraints(viewer: Viewer): void {
  const controller = viewer.scene.screenSpaceCameraController
  controller.minimumZoomDistance = 1.0
  controller.maximumZoomDistance = Number.POSITIVE_INFINITY
}

const AUTO_ROTATE_SPEED = 0.015 // rad/sec
const WHEEL_COOLDOWN_MS = 1200

export interface AutoRotateControllerOptions {
  onCameraFlightStart?: () => void
  onCameraFlightEnd?: () => void
}

/**
 * Manages auto-rotation and overview camera behavior.
 * - Auto-rotate when viewMode === 'overview'
 * - Disabled when viewMode === 'venue'
 * - Resumes when switching back to overview
 * - Suspends during camera flights
 */
export class AutoRotateController {
  private viewer: Viewer
  private autoRotateEnabled = false
  private isUserInteracting = false
  private lastInteractionTs = 0
  private isCameraAnimating = false
  private preRenderRemoval: (() => void) | null = null
  private boundHandlers: Array<{ el: HTMLElement; type: string; fn: (e: Event) => void }> = []

  constructor(viewer: Viewer, _options?: AutoRotateControllerOptions) {
    this.viewer = viewer
  }

  /**
   * Updates the controller when view mode changes.
   */
  setViewMode(viewMode: 'overview' | 'venue'): void {
    this.autoRotateEnabled = viewMode === 'overview'

    if (viewMode === 'overview') {
      applyOverviewConstraints(this.viewer)
      this.startPreRender()
    } else {
      removeOverviewConstraints(this.viewer)
      this.stopPreRender()
    }
  }

  /**
   * Call when a camera flight starts (suspend auto-rotate).
   */
  onFlightStart(): void {
    this.isCameraAnimating = true
  }

  /**
   * Call when a camera flight completes.
   */
  onFlightEnd(): void {
    this.isCameraAnimating = false
  }

  /**
   * Set initial state: overview camera, constraints, and start auto-rotate + listeners.
   */
  initialize(): void {
    setOverviewCamera(this.viewer)
    applyOverviewConstraints(this.viewer)
    this.autoRotateEnabled = true
    this.attachInteractionListeners()
    this.startPreRender()
  }

  private attachInteractionListeners(): void {
    const canvas = this.viewer.scene.canvas
    if (!canvas) return

    const onPointerDown = () => {
      this.isUserInteracting = true
    }
    const onPointerUp = (e: Event) => {
      if (e.type === 'pointerup' || e.type === 'touchend' || e.type === 'pointercancel') {
        this.isUserInteracting = false
      }
    }
    const onWheel = () => {
      this.lastInteractionTs = performance.now()
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('touchstart', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('touchend', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: true })

    this.boundHandlers = [
      { el: canvas, type: 'pointerdown', fn: onPointerDown },
      { el: canvas, type: 'touchstart', fn: onPointerDown },
      { el: canvas, type: 'pointerup', fn: onPointerUp },
      { el: canvas, type: 'touchend', fn: onPointerUp },
      { el: canvas, type: 'pointercancel', fn: onPointerUp },
      { el: canvas, type: 'wheel', fn: onWheel }
    ]
  }

  private startPreRender(): void {
    if (this.preRenderRemoval) return
    const listener = () => this.tick()
    this.viewer.scene.preRender.addEventListener(listener)
    this.preRenderRemoval = () => {
      this.viewer.scene.preRender.removeEventListener(listener)
      this.preRenderRemoval = null
    }
  }

  private stopPreRender(): void {
    if (this.preRenderRemoval) {
      this.preRenderRemoval()
      this.preRenderRemoval = null
    }
  }

  private lastTickTs = 0

  private tick(): void {
    if (!this.autoRotateEnabled) return
    if (this.isUserInteracting) return
    if (this.isCameraAnimating) return
    const now = performance.now()
    if (now - this.lastInteractionTs < WHEEL_COOLDOWN_MS) return

    const dt = this.lastTickTs ? (now - this.lastTickTs) / 1000 : 1 / 60
    this.lastTickTs = now
    const clampedDt = Math.min(dt, 1 / 30)
    const angle = AUTO_ROTATE_SPEED * clampedDt
    this.viewer.camera.rotate(Cartesian3.UNIT_Z, angle)
  }

  /**
   * Call when switching to overview (e.g. Overview button) - sets camera and enables auto-rotate.
   */
  flyToOverview(): void {
    this.onFlightStart()
    setOverviewCamera(this.viewer)
    applyOverviewConstraints(this.viewer)
    this.autoRotateEnabled = true
    this.startPreRender()
    this.onFlightEnd()
  }

  /**
   * Cleanup listeners.
   */
  destroy(): void {
    this.stopPreRender()
    this.autoRotateEnabled = false
    for (const { el, type, fn } of this.boundHandlers) {
      el.removeEventListener(type, fn as EventListener)
    }
    this.boundHandlers = []
  }
}
