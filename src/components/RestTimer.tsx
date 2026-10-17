import { useEffect, useRef, useState } from 'react'
import { buzz, playChime } from '../lib/sound'
import { formatClock } from '../lib/format'
import { clamp } from '../lib/number'
import { cn } from './ui'

const PRESETS = [30, 45, 60, 90, 120]

export function RestTimer({
  open,
  initialSeconds,
  soundEnabled,
  onChangeSeconds,
  onClose,
}: {
  open: boolean
  initialSeconds: number
  soundEnabled: boolean
  onChangeSeconds: (seconds: number) => void
  onClose: () => void
}) {
  const [remainingMs, setRemainingMs] = useState(initialSeconds * 1000)
  const [running, setRunning] = useState(true)
  const [done, setDone] = useState(false)
  const endRef = useRef(0)
  const remainingRef = useRef(initialSeconds * 1000)
  const durationRef = useRef(initialSeconds)
  const secondsRef = useRef(initialSeconds)
  const chimed = useRef(false)
  secondsRef.current = initialSeconds

  function begin(seconds: number) {
    const ms = seconds * 1000
    durationRef.current = seconds
    remainingRef.current = ms
    endRef.current = Date.now() + ms
    chimed.current = false
    setDone(false)
    setRunning(true)
    setRemainingMs(ms)
  }

  useEffect(() => {
    if (!open) return
    begin(secondsRef.current)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open || !running || done) return
    const timer = window.setInterval(() => {
      const next = Math.max(0, endRef.current - Date.now())
      remainingRef.current = next
      setRemainingMs(next)
      if (next <= 0) {
        setRunning(false)
        setDone(true)
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [open, running, done])

  useEffect(() => {
    if (!open || !done || chimed.current) return
    chimed.current = true
    if (soundEnabled) playChime()
    buzz()
  }, [open, done, soundEnabled])

  if (!open) return null

  const totalMs = Math.max(durationRef.current * 1000, 1)
  const progress = clamp(remainingMs / totalMs, 0, 1)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  function bump(delta: number) {
    const base = running ? Math.max(0, endRef.current - Date.now()) : remainingRef.current
    const seconds = clamp(Math.round((base + delta * 1000) / 1000), 5, 600)
    onChangeSeconds(seconds)
    begin(seconds)
  }

  function choose(seconds: number) {
    onChangeSeconds(seconds)
    begin(seconds)
  }

  function pause() {
    remainingRef.current = Math.max(0, endRef.current - Date.now())
    setRemainingMs(remainingRef.current)
    setRunning(false)
  }

  function resume() {
    endRef.current = Date.now() + remainingRef.current
    setRunning(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rest-title"
        className="w-full max-w-md rounded-t-3xl border border-line bg-panel px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <p id="rest-title" className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-mist">
          Descanso
        </p>
        <div className="relative mx-auto mt-4 grid size-40 place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={done ? 'var(--heat)' : 'var(--accent)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="text-center">
            <p className="font-display text-5xl tabular-nums leading-none">
              {done ? '00:00' : formatClock(Math.ceil(remainingMs / 1000))}
            </p>
            <p className="mt-1 text-xs text-mist">{done ? 'Concluído' : running ? 'Contando' : 'Pausado'}</p>
          </div>
        </div>
        {done ? <p className="sr-only" aria-live="assertive">Descanso concluído</p> : null}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <TimerChip onClick={() => bump(-10)}>−10s</TimerChip>
          <TimerChip onClick={() => bump(10)}>+10s</TimerChip>
          {PRESETS.map((seconds) => (
            <TimerChip key={seconds} active={durationRef.current === seconds} onClick={() => choose(seconds)}>
              {`${seconds}s`}
            </TimerChip>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-mist">O tempo escolhido vale até o fim desta sessão.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" className="min-h-11 rounded-full border border-line text-sm font-semibold" onClick={running ? pause : resume}>
            {running ? 'Pausar' : 'Retomar'}
          </button>
          <button type="button" className="min-h-11 rounded-full border border-line text-sm font-semibold" onClick={() => begin(durationRef.current)}>
            Resetar
          </button>
          <button type="button" className="min-h-11 rounded-full bg-accent text-sm font-semibold text-accent-ink" onClick={onClose}>
            {done ? 'Continuar' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TimerChip({
  children,
  onClick,
  active = false,
}: {
  children: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-10 rounded-full px-3 text-sm font-semibold',
        active ? 'bg-accent text-accent-ink' : 'bg-raised text-paper',
      )}
    >
      {children}
    </button>
  )
}
