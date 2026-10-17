import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dateKey, formatLongDate, formatSessionWhen, formatTime, monthGrid } from '../lib/dates'
import { formatDuration, formatLoad, formatVolume } from '../lib/format'
import { currentStreak, exerciseStats, loadSeries, sessionsThisWeek } from '../lib/stats'
import { useGym } from '../store/GymProvider'
import { cn } from '../components/ui'

export function HistoryPage() {
  const { state } = useGym()
  const today = new Date()
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedKey, setSelectedKey] = useState(() => dateKey(today))
  const stats = useMemo(() => exerciseStats(state.sessions), [state.sessions])
  const [exerciseId, setExerciseId] = useState<string>('')
  const selectedExercise = exerciseId || [...stats].sort((a, b) => b.count - a.count)[0]?.exerciseId || ''
  const series = loadSeries(state.sessions, selectedExercise)
  const week = sessionsThisWeek(state.sessions, today)
  const weekVolume = week.reduce((sum, session) => sum + session.totalVolume, 0)
  const cells = monthGrid(cursor.getFullYear(), cursor.getMonth())
  const byDay = new Map<string, typeof state.sessions>()
  for (const session of state.sessions) {
    const key = dateKey(session.startedAt)
    byDay.set(key, [...(byDay.get(key) ?? []), session])
  }
  const selectedSessions = byDay.get(selectedKey) ?? []
  const maxVolume = Math.max(1, ...[...byDay.values()].map((list) => list.reduce((sum, session) => sum + session.totalVolume, 0)))

  if (state.sessions.length === 0) {
    return (
      <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">Progresso</p>
        <h1 className="font-display text-5xl uppercase leading-none">Histórico</h1>
        <div className="mt-6 rounded-3xl border border-dashed border-line px-4 py-8">
          <p className="font-semibold">Nenhuma sessão ainda.</p>
          <p className="mt-2 text-sm text-mist">Quando você finalizar um treino, a carga, o volume e o calendário aparecem aqui.</p>
          <Link to="/" className="mt-4 inline-flex text-sm font-semibold text-accent">
            Ir para os treinos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">Progresso</p>
      <h1 className="font-display text-5xl uppercase leading-none">Histórico</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Sessões" value={String(state.sessions.length)} />
        <Metric label="Sequência" value={`${currentStreak(state.sessions, today)}d`} />
        <Metric label="Esta semana" value={String(week.length)} />
        <Metric label="Volume da semana" value={formatVolume(weekVolume)} />
      </div>

      <section className="mt-6 rounded-3xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl uppercase leading-none">Evolução de carga</h2>
          <select
            aria-label="Exercício"
            value={selectedExercise}
            onChange={(event) => setExerciseId(event.target.value)}
            className="min-h-11 rounded-2xl border border-line bg-raised px-3 text-sm"
          >
            {[...stats]
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
              .map((item) => (
                <option key={item.exerciseId} value={item.exerciseId}>
                  {item.name}
                </option>
              ))}
          </select>
        </div>
        <LoadChart points={series} />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Rank title="Mais realizados" empty="Complete uma série para contar.">
          {[...stats]
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
            .map((item) => (
              <li key={item.exerciseId} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 text-sm text-mist">{item.count}x</span>
              </li>
            ))}
        </Rank>
        <Rank title="Maior carga" empty="Ainda sem carga registrada.">
          {[...stats]
            .sort((a, b) => b.maxLoad - a.maxLoad)
            .slice(0, 6)
            .map((item) => (
              <li key={item.exerciseId} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 text-sm font-semibold text-accent">{formatLoad(item.maxLoad)}</span>
              </li>
            ))}
        </Rank>
      </div>

      <section className="mt-4 rounded-3xl border border-line bg-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl uppercase leading-none">
            {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(cursor)}
          </h2>
          <div className="flex gap-1">
            <button type="button" aria-label="Mês anterior" className="grid size-11 place-items-center rounded-full border border-line" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Próximo mês" className="grid size-11 place-items-center rounded-full border border-line" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-mist">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const key = dateKey(cell.date)
            const sessions = byDay.get(key) ?? []
            const volume = sessions.reduce((sum, session) => sum + session.totalVolume, 0)
            const strength = sessions.length === 0 ? 0 : 0.25 + (volume / maxVolume) * 0.75
            const isToday = key === dateKey(today)
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center rounded-xl text-sm',
                  !cell.inMonth && 'opacity-35',
                  selectedKey === key && 'ring-2 ring-accent',
                  isToday && 'border border-accent/50',
                )}
                style={{ background: sessions.length ? `color-mix(in srgb, var(--accent) ${Math.round(strength * 100)}%, var(--raised))` : 'var(--raised)' }}
              >
                <span className={sessions.length ? 'font-semibold text-accent-ink' : ''}>{cell.date.getDate()}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-semibold">{formatLongDate(new Date(`${selectedKey}T12:00:00`))}</h3>
          {selectedSessions.length === 0 ? (
            <p className="mt-2 text-sm text-mist">Sem treino neste dia.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {selectedSessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 font-display text-3xl uppercase">Recentes</h2>
        <div className="space-y-2">
          {state.sessions.slice(0, 8).map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-panel p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">{label}</p>
      <p className="mt-1 font-display text-3xl uppercase leading-none">{value}</p>
    </div>
  )
}

function Rank({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const list = Array.isArray(children) ? children : [children]
  const filled = list.some(Boolean)
  return (
    <section className="rounded-3xl border border-line bg-panel p-4">
      <h2 className="font-display text-3xl uppercase leading-none">{title}</h2>
      {filled ? <ul className="mt-2 divide-y divide-line">{children}</ul> : <p className="mt-3 text-sm text-mist">{empty}</p>}
    </section>
  )
}

function SessionRow({ session }: { session: ReturnType<typeof useGym>['state']['sessions'][number] }) {
  return (
    <Link to={`/historico/${session.id}`} className="block rounded-2xl border border-line bg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl uppercase leading-none">Treino {session.workoutId}</p>
        <p className="text-sm text-mist">
          {formatSessionWhen(session.startedAt)} · {formatTime(session.startedAt)}
        </p>
      </div>
      <p className="mt-1 text-sm text-mist">
        {formatDuration(session.durationSeconds)} · {formatVolume(session.totalVolume)} · {session.exercises.length} exercícios
      </p>
    </Link>
  )
}

function LoadChart({ points }: { points: Array<{ at: string; load: number }> }) {
  if (points.length === 0) return <p className="mt-4 text-sm text-mist">Sem séries concluídas deste exercício.</p>
  const width = 320
  const height = 150
  const pad = 16
  const loads = points.map((point) => point.load)
  const min = Math.min(...loads)
  const max = Math.max(...loads)
  const span = max - min || 1
  const coords = points.map((point, index) => {
    const x = pad + (points.length === 1 ? (width - pad * 2) / 2 : (index / (points.length - 1)) * (width - pad * 2))
    const y = pad + (1 - (point.load - min) / span) * (height - pad * 2)
    return { ...point, x, y }
  })
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="Evolução de carga">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((point) => (
          <circle key={point.at} cx={point.x} cy={point.y} r="4" fill="var(--accent)" />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-mist">
        <span>{formatSessionWhen(points[0].at)}</span>
        <span className="font-semibold text-accent">{formatLoad(points[points.length - 1].load)}</span>
        <span>{formatSessionWhen(points[points.length - 1].at)}</span>
      </div>
    </div>
  )
}
