import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { formatNumber, parseLooseNumber } from '../lib/format'
import { clamp, stepBy } from '../lib/number'

export function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  suffix,
  integer = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step: number
  min: number
  max: number
  suffix?: string
  integer?: boolean
}) {
  const [draft, setDraft] = useState(formatNumber(value))

  useEffect(() => {
    setDraft(formatNumber(value))
  }, [value])

  function commit(raw: string) {
    const parsed = parseLooseNumber(raw)
    if (parsed === null) {
      setDraft(formatNumber(value))
      return
    }
    const next = integer ? clamp(Math.round(parsed), min, max) : clamp(Math.round(parsed * 100) / 100, min, max)
    onChange(next)
    setDraft(formatNumber(next))
  }

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">{label}</p>
      <div className="flex items-center rounded-2xl border border-line bg-ink/50">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          onClick={() => onChange(stepBy(value, -step, min, max))}
          className="grid size-11 shrink-0 place-items-center text-paper"
        >
          <Minus size={16} />
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <input
            aria-label={label}
            inputMode="decimal"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            className="min-w-0 flex-1 bg-transparent text-center text-base font-semibold outline-none"
          />
          {suffix ? <span className="shrink-0 pr-2 text-[11px] text-mist">{suffix}</span> : null}
        </div>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(stepBy(value, step, min, max))}
          className="grid size-11 shrink-0 place-items-center text-paper"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
