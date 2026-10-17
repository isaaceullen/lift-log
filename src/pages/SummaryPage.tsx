import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, TextArea } from '../components/ui'
import { sessionElapsedMs } from '../lib/dates'
import { formatClock, formatDuration, formatLoad, formatVolume } from '../lib/format'
import { totalVolume } from '../lib/volume'
import { useGym } from '../store/GymProvider'
import { isWorkoutId } from '../types'

export function SummaryPage() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const gym = useGym()
  const active = gym.state.activeSession
  const [notes, setNotes] = useState('')
  const [now] = useState(() => Date.now())
  const opened = useRef(false)

  useEffect(() => {
    if (opened.current) return
    opened.current = true
    gym.openReview()
  }, [gym])

  if (!isWorkoutId(workoutId) || !active || active.workoutId !== workoutId) {
    return <Navigate to="/" replace />
  }

  const workout = gym.state.workouts[workoutId]
  const rows = active.exercises.map((entry) => {
    const catalog = gym.state.exercises.find((item) => item.id === entry.exerciseId)
    const completedSets = entry.sets.filter((set) => set.completed).length
    return {
      id: entry.instanceId,
      name: catalog?.name ?? 'Exercício removido',
      load: entry.load,
      reps: entry.reps,
      completedSets,
      totalSets: entry.sets.length,
    }
  })
  const incomplete = rows.filter((row) => row.completedSets < row.totalSets).map((row) => `${row.name} · ${row.completedSets}/${row.totalSets} séries`)
  if (workout.cardioEnabled && !active.cardioCompleted) incomplete.push('Cardio')
  const volume = totalVolume(rows)
  const elapsed = Math.floor(sessionElapsedMs(active, now) / 1000)

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Resumo</p>
      <h1 className="font-display text-5xl uppercase leading-none">Treino {workout.id}</h1>
      <p className="mt-2 text-sm text-mist">O tempo fica pausado nesta tela. Voltar continua a sessão.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Duração" value={formatDuration(elapsed)} />
        <Stat label="Volume" value={formatVolume(volume)} />
      </div>
      <p className="mt-2 text-xs text-mist">Volume = carga × repetições × séries concluídas. {formatClock(elapsed)} no relógio.</p>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">Não concluídos</h2>
        {incomplete.length === 0 ? (
          <p className="mt-2 rounded-3xl border border-good/30 bg-good/10 px-4 py-4 text-sm">Todos os exercícios foram concluídos.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {incomplete.map((item) => (
              <li key={item} className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">O que foi feito</h2>
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl bg-panel px-4 py-3">
            <div>
              <p className="font-semibold">{row.name}</p>
              <p className="text-xs text-mist">
                {row.completedSets}/{row.totalSets} séries · {formatLoad(row.load)} · {row.reps} reps
              </p>
            </div>
            <p className="text-sm font-semibold">{formatVolume(row.load * row.reps * row.completedSets)}</p>
          </div>
        ))}
        {workout.cardioEnabled ? (
          <div className="rounded-2xl bg-panel px-4 py-3 text-sm">
            Cardio {active.cardioCompleted ? 'feito' : 'não marcado'}
          </div>
        ) : null}
      </section>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-mist">Notas do dia</span>
        <TextArea rows={4} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Como foi o treino?" />
      </label>

      {volume === 0 ? (
        <p className="mt-3 text-sm text-warn">Nenhuma série marcada. A sessão ainda pode ser salva.</p>
      ) : null}

      <div className="mt-5 grid gap-2">
        <Button
          onClick={() => {
            const id = gym.confirmSession(notes)
            if (id) navigate(`/historico/${id}`, { replace: true })
          }}
        >
          Confirmar
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            gym.closeReview()
            navigate(`/sessao/${workout.id}`)
          }}
        >
          Voltar para a sessão
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-panel p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-1 font-display text-3xl uppercase leading-none">{value}</p>
    </div>
  )
}
