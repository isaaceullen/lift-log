import { Flame, Play } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { Button, cn } from '../components/ui'
import { workoutCategoryNames } from '../lib/library'
import { formatDays, formatLongDate, formatWeekday } from '../lib/dates'
import { isScheduledToday } from '../lib/stats'
import { useGym } from '../store/GymProvider'
import { WORKOUT_IDS, type Workout, type WorkoutId } from '../types'

export function HomePage() {
  const { state, startSession, abandonSession } = useGym()
  const navigate = useNavigate()
  const today = new Date()
  const workouts = WORKOUT_IDS.map((id) => state.workouts[id])
  const todayIds = WORKOUT_IDS.filter((id) => isScheduledToday(state.workouts[id].days, today))
  const [selected, setSelected] = useState<WorkoutId[]>(todayIds)
  const [pending, setPending] = useState<WorkoutId[] | null>(null)
  const active = state.activeSession
  const ordered = WORKOUT_IDS.filter((id) => selected.includes(id))

  function toggle(id: WorkoutId) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function begin(ids: WorkoutId[]) {
    const next = WORKOUT_IDS.filter((id) => ids.includes(id))
    if (next.length === 0) return
    if (active) {
      setPending(next)
      return
    }
    startSession(next)
    navigate('/sessao')
  }

  function replaceSession() {
    if (!pending) return
    abandonSession()
    startSession(pending)
    setPending(null)
    navigate('/sessao')
  }

  return (
    <div className="pt-[max(1.25rem,env(safe-area-inset-top))] pb-24">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Forja</p>
      <h1 className="mt-1 font-display text-5xl uppercase leading-none sm:text-6xl">{formatWeekday(today)}</h1>
      <p className="mt-2 text-mist">{formatLongDate(today)}</p>

      {active ? (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-3xl border border-heat/40 bg-heat/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-heat">Em andamento</p>
            <p className="font-display text-2xl uppercase">
              {active.workoutIds.length > 1 ? 'Treinos' : 'Treino'} {active.workoutIds.join(' · ')}
            </p>
          </div>
          <Button onClick={() => navigate('/sessao')}>Continuar</Button>
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-mist">Sessão de hoje</h2>
        <p className="mb-3 text-sm text-mist">
          Os treinos do dia já vêm marcados. Inclua outros se quiser fazê-los juntos.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              exercises={state.exercises}
              featured={todayIds.includes(workout.id)}
              selected={selected.includes(workout.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      </section>

        <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 px-4">
        <div className="mx-auto max-w-6xl">
          <Button className="w-full shadow-lg" disabled={ordered.length === 0} onClick={() => begin(ordered)}>
            <Play size={16} fill="currentColor" />
            {ordered.length === 0 ? 'Selecione um treino' : `Iniciar ${ordered.join(' · ')}`}
          </Button>
        </div>
      </div>

      <Dialog
        open={pending !== null}
        title="Trocar a sessão?"
        description={
          active
            ? `${active.workoutIds.length > 1 ? `Os treinos ${active.workoutIds.join(', ')} estão` : `O Treino ${active.workoutIds[0]} está`} em andamento. Sair sem salvar descarta as séries marcadas agora.`
            : undefined
        }
        onClose={() => setPending(null)}
      >
        <Button
          onClick={() => {
            setPending(null)
            navigate('/sessao')
          }}
        >
          Continuar a atual
        </Button>
        <Button variant="danger" onClick={replaceSession}>
          Sair sem salvar e iniciar
        </Button>
      </Dialog>
    </div>
  )
}

function WorkoutCard({
  workout,
  exercises,
  featured,
  selected,
  onToggle,
}: {
  workout: Workout
  exercises: ReturnType<typeof useGym>['state']['exercises']
  featured: boolean
  selected: boolean
  onToggle: (id: WorkoutId) => void
}) {
  const categories = workoutCategoryNames(workout, exercises)
  const visible = categories.slice(0, 3)
  const extra = categories.length - visible.length
  const empty = workout.exercises.length === 0

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-3xl border bg-panel p-4',
        selected ? 'border-accent' : 'border-line',
        featured && !selected && 'today-card border-accent/40',
      )}
    >
      <p className="pointer-events-none absolute -right-1 -top-3 font-display text-8xl leading-none text-paper/5">
        {workout.id}
      </p>
      <div className="flex items-start justify-between gap-3">
        <div>
          {featured ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Treino do dia</p>
          ) : null}
          <h3 className="font-display text-4xl uppercase leading-none">Treino {workout.id}</h3>
          <p className="mt-1 text-sm text-mist">{formatDays(workout.days)}</p>
        </div>
        {workout.cardioEnabled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-heat/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-heat">
            <Flame size={12} />
            Cardio
          </span>
        ) : (
          <span className="rounded-full bg-raised px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-mist">
            Sem cardio
          </span>
        )}
      </div>
      <p className="mt-4 text-sm">
        {workout.exercises.length === 1 ? '1 exercício' : `${workout.exercises.length} exercícios`}
      </p>
      <div className="mt-2 flex min-h-7 flex-wrap gap-1.5">
        {visible.map((category) => (
          <span key={category} className="rounded-full bg-raised px-2.5 py-1 text-xs text-mist">
            {category}
          </span>
        ))}
        {extra > 0 ? <span className="rounded-full bg-raised px-2.5 py-1 text-xs text-mist">+{extra}</span> : null}
        {categories.length === 0 && !empty ? <span className="text-xs text-mist">Sem categoria</span> : null}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => onToggle(workout.id)}
          className={cn(
            'inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold',
            selected ? 'bg-accent text-accent-ink' : 'border border-line text-paper',
          )}
        >
          {selected ? 'Na sessão' : 'Incluir'}
        </button>
        <Link
          to={`/treino/${workout.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold"
        >
          Editar
        </Link>
      </div>
    </article>
  )
}
