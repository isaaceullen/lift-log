export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function loadIn(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(clamp(value, 0, 2000) * 100) / 100
}

export function intIn(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return clamp(Math.round(value), min, max)
}

export function stepBy(value: number, delta: number, min: number, max: number): number {
  const next = Math.round((value + delta) * 1000) / 1000
  return clamp(next, min, max)
}
