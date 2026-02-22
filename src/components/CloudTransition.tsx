import { useRef, useImperativeHandle, forwardRef, useState, useCallback, useEffect } from 'react'

const OPAQUE_THRESHOLD = 0.98
const FADE_MS = 350
const DRIFT_SPEED = 0.03
const OPAQUE_DRIFT_SPEED = 0.02

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Premium cloud layer gradients (no images, GPU-friendly) */
const CLOUD_GRADIENT_1 =
  'radial-gradient(ellipse 90% 60% at 15% 25%, rgba(255,255,255,0.95) 0%, transparent 55%),' +
  'radial-gradient(ellipse 70% 50% at 75% 45%, rgba(255,255,255,0.9) 0%, transparent 50%),' +
  'radial-gradient(ellipse 55% 35% at 45% 75%, rgba(255,255,255,0.85) 0%, transparent 45%)'
const CLOUD_GRADIENT_2 =
  'radial-gradient(ellipse 80% 45% at 85% 30%, rgba(255,255,255,0.92) 0%, transparent 50%),' +
  'radial-gradient(ellipse 65% 55% at 25% 60%, rgba(255,255,255,0.88) 0%, transparent 48%),' +
  'radial-gradient(ellipse 50% 40% at 60% 85%, rgba(255,255,255,0.82) 0%, transparent 42%)'
const VIGNETTE =
  'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.25) 100%)'

export interface CloudTransitionHandle {
  playIn(): Promise<void>
  playOut(): Promise<void>
  isOpaque(): boolean
  onOpaqueOnce(): Promise<void>
}

function easeSmoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export const CloudTransition = forwardRef<CloudTransitionHandle>(function CloudTransition(_, ref) {
  const [visible, setVisible] = useState(false)
  const opacityRef = useRef(0)
  const driftXRef = useRef(0)
  const driftYRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fadeRafRef = useRef<number>(0)
  const driftRafRef = useRef<number>(0)
  const prefersReducedMotion = useRef(false)
  const highDpr = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    highDpr.current = (window.devicePixelRatio || 1) > 1.5
  }, [])

  const updateStyles = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    el.style.opacity = String(opacityRef.current)
    if (!prefersReducedMotion.current) {
      el.style.transform = `translate3d(${driftXRef.current}px, ${driftYRef.current}px, 0)`
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      playIn(): Promise<void> {
        setVisible(true)
        opacityRef.current = 0
        driftXRef.current = 0
        driftYRef.current = 0

        return new Promise<void>((resolve) => {
          const waitForMount = () => {
            if (!containerRef.current) {
              requestAnimationFrame(waitForMount)
              return
            }
            nextFrame().then(() => {
              const start = performance.now()
              const tick = (now: number) => {
                const elapsed = now - start
                const t = Math.min(1, elapsed / FADE_MS)
                const eased = easeSmoothstep(t)
                opacityRef.current = eased
                if (!prefersReducedMotion.current) {
                  driftXRef.current = elapsed * DRIFT_SPEED * 10
                  driftYRef.current = elapsed * DRIFT_SPEED * 6
                }
                updateStyles()
                if (t >= 1) resolve()
                else fadeRafRef.current = requestAnimationFrame(tick)
              }
              fadeRafRef.current = requestAnimationFrame(tick)
            })
          }
          requestAnimationFrame(waitForMount)
        })
      },
      playOut(): Promise<void> {
        return new Promise<void>((resolve) => {
          const start = performance.now()
          const tick = (now: number) => {
            const elapsed = now - start
            const t = Math.min(1, elapsed / FADE_MS)
            const eased = easeSmoothstep(t)
            opacityRef.current = 1 - eased
            if (!prefersReducedMotion.current) {
              const baseX = FADE_MS * DRIFT_SPEED * 10
              const baseY = FADE_MS * DRIFT_SPEED * 6
              driftXRef.current = baseX + elapsed * OPAQUE_DRIFT_SPEED * 10
              driftYRef.current = baseY + elapsed * OPAQUE_DRIFT_SPEED * 6
            }
            updateStyles()
            if (t >= 1) {
              setVisible(false)
              resolve()
            } else {
              fadeRafRef.current = requestAnimationFrame(tick)
            }
          }
          fadeRafRef.current = requestAnimationFrame(tick)
        })
      },
      isOpaque(): boolean {
        return opacityRef.current >= OPAQUE_THRESHOLD
      },
      onOpaqueOnce(): Promise<void> {
        if (opacityRef.current >= OPAQUE_THRESHOLD) return Promise.resolve()
        return new Promise((resolve) => {
          const check = () => {
            if (opacityRef.current >= OPAQUE_THRESHOLD) resolve()
            else requestAnimationFrame(check)
          }
          requestAnimationFrame(check)
        })
      },
    }),
    [updateStyles]
  )

  useEffect(() => {
    return () => {
      cancelAnimationFrame(fadeRafRef.current)
      cancelAnimationFrame(driftRafRef.current)
    }
  }, [])

  if (!visible) return null

  const bgSize = highDpr.current ? '120%' : 'cover'
  const cloudLayerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundSize: bgSize,
    backgroundPosition: 'center',
    willChange: 'opacity, transform',
  }

  return (
    <div
      ref={(el) => {
        containerRef.current = el
      }}
      className="cloud-transition-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: 0,
        willChange: 'opacity, transform',
      }}
    >
      <div
        className="cloudLayer cloudLayer1"
        style={{
          ...cloudLayerStyle,
          backgroundImage: CLOUD_GRADIENT_1,
        }}
      />
      <div
        className="cloudLayer cloudLayer2"
        style={{
          ...cloudLayerStyle,
          backgroundImage: CLOUD_GRADIENT_2,
        }}
      />
      <div
        className="cloudLayer cloudLayerVignette"
        style={{
          ...cloudLayerStyle,
          backgroundImage: VIGNETTE,
          backgroundSize: 'cover',
        }}
      />
    </div>
  )
})
