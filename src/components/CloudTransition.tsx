import { useEffect, useRef, useState } from 'react'

/** Simple deterministic hash for value noise. */
function hash(x: number, y: number): number {
  const n = x * 374761393 + y * 668265263
  return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff
}

/** Smooth interpolation. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Value noise at (x, y) with integer grid. */
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = smoothstep(fx)
  const sy = smoothstep(fy)

  const n00 = hash(ix, iy)
  const n10 = hash(ix + 1, iy)
  const n01 = hash(ix, iy + 1)
  const n11 = hash(ix + 1, iy + 1)

  const nx0 = n00 + sx * (n10 - n00)
  const nx1 = n01 + sx * (n11 - n01)
  return nx0 + sy * (nx1 - nx0)
}

/** Fractal Brownian motion for cloud-like variation. */
function fbm(x: number, y: number, octaves = 4): number {
  let v = 0
  let f = 1
  let a = 1
  let sumA = 0
  for (let i = 0; i < octaves; i++) {
    v += a * valueNoise(x * f, y * f)
    sumA += a
    a *= 0.5
    f *= 2
  }
  return v / sumA
}

export interface CloudTransitionProps {
  active: boolean
  phase: 'in' | 'out'
}

const FADE_MS = 400
const DRIFT_SPEED = 0.15

export function CloudTransition({ active, phase }: CloudTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [opacity, setOpacity] = useState(0)
  const fadeAnimRef = useRef<number>(0)
  const drawAnimRef = useRef<number>(0)
  const timeRef = useRef(0)
  const opacityRef = useRef(0)
  opacityRef.current = opacity

  useEffect(() => {
    if (!active) {
      setOpacity(0)
      return
    }

    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / FADE_MS)
      const eased = t * t * (3 - 2 * t)
      const next = phase === 'in' ? eased : 1 - eased
      setOpacity(next)
      if (t < 1) fadeAnimRef.current = requestAnimationFrame(tick)
    }
    fadeAnimRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(fadeAnimRef.current)
  }, [active, phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    resize()
    window.addEventListener('resize', resize)

    const scale = 0.003
    const baseAlpha = 0.85

    const draw = () => {
      timeRef.current += 0.016
      const t = timeRef.current * DRIFT_SPEED
      const w = canvas.width
      const h = canvas.height
      const currentOpacity = opacityRef.current

      ctx.clearRect(0, 0, w, h)

      const imageData = ctx.createImageData(w, h)
      const data = imageData.data

      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const x = px * scale + t * 50
          const y = py * scale + t * 30
          const n = fbm(x, y)
          const cloud = Math.pow(Math.max(0, n - 0.35) * 2.5, 1.2)
          const a = Math.min(1, cloud) * baseAlpha * currentOpacity
          const i = (py * w + px) * 4
          data[i] = 255
          data[i + 1] = 255
          data[i + 2] = 255
          data[i + 3] = Math.round(a * 255)
        }
      }
      ctx.putImageData(imageData, 0, 0)
      drawAnimRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(drawAnimRef.current)
    }
  }, [active])

  if (!active) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  )
}
