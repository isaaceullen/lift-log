import { Flame, Play } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { InstallBanner } from '../components/InstallBanner'
import { Button, cn } from '../components/ui'
import { workoutCategoryNames } from '../lib/categories'
import { formatDays, formatLongDate, formatWeekday } from '../lib/dates'
import { isScheduledToday } from '../lib/stats'
import { useGym } from '../store/GymProvider'
import { WORKOUT_IDS, type Workout, type WorkoutId } from '../types'

export function HomePage() {
  const { state, startSession, abandonSession } = useGym()
  const navigate = useNavigate()
  const today = new Date()
  const workouts = WORKOUT_IDS.map((id) => state.workouts[id])
  const todayWorkouts = workouts.filter((workout) => isScheduledToday(workout.days, today))
  const others = todayWorkouts.length > 0 ? workouts.filter((workout) => !isScheduledToday(workout.days, today)) : workouts
  const [pending, setPending] = useState<WorkoutId | null>(null)
  const active = state.activeSession

  function openWorkout(id: WorkoutId) {
    const workout = state.workouts[id]
    if (workout.exercises.length === 0) {
      navigate(`/treino/${id}`)
      return
    }
    if (active?.workoutId === id) {
      navigate(`/sessao/${id}`)
      return
    }
    if (active) {
      setPending(id)
      return
    }
    startSession(id)
    navigate(`/sessao/${id}`)
  }

  function replaceSession() {
    if (!pending) return
    abandonSession()
    startSession(pending)
    const next = pending
    setPending(null)
    navigate(`/sessao/${next}`)
  }

  return (
    <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Forja</p>
      <h1 className="mt-1 font-display text-5xl uppercase leading-none sm:text-6xl">{formatWeekday(today)}</h1>
      <p className="mt-2 text-mist">{formatLongDate(today)}</p>

      {active ? (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-3xl border border-heat/40 bg-heat/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-heat">Em andamento</p>
            <p className="font-display text-2xl uppercase">Treino {active.workoutId}</p>
          </div>
          <Button onClick={() => navigate(`/sessao/${active.workoutId}`)}>Continuar</Button>
        </div>
      ) : null}

      <div className="mt-5">
        <InstallBanner />
      </div>

      {todayWorkouts.length > 0 ? (
        <section className="mt-2">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-mist">Treino do dia</h2>
          <div className="grid gap-3">
            {todayWorkouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} exercises={state.exercises} featured onStart={openWorkout} />
            ))}
          </div>
        </section>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-line px-4 py-4 text-sm text-mist">
          Nenhum treino do dia. Escolha um abaixo ou marque os dias da semana na montagem.
        </p>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
          {todayWorkouts.length > 0 ? 'Outros treinos' : 'Treinos'}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} exercises={state.exercises} featured={false} onStart={openWorkout} />
          ))}
        </div>
      </section>

      <Dialog
        open={pending !== null}
        title="Trocar de treino?"
        description={
          active
            ? `O Treino ${active.workoutId} está em andamento. Sair sem salvar descarta as séries marcadas agora.`
            : undefined
        }
        onClose={() => setPending(null)}
      >
        <Button
          onClick={() => {
            if (!active) return
            setPending(null)
            navigate(`/sessao/${active.workoutId}`)
          }}
        >
          Continuar o atual
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
  onStart,
}: {
  workout: Workout
  exercises: ReturnType<typeof useGym>['state']['exercises']
  featured: boolean
  onStart: (id: WorkoutId) => void
}) {
  const categories = workoutCategoryNames(workout, exercises)
  const visible = categories.slice(0, 3)
  const extra = categories.length - visible.length
  const empty = workout.exercises.length === 0

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-3xl border border-line bg-panel p-4',
        featured && 'today-card border-accent/70 bg-accent/5',
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
          <p className="mt-1 text-sm text-mist">{workout.label || formatDays(workout.days)}</p>
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
        {categories.length === 0 && !empty ? (
          <span className="text-xs text-mist">Sem categoria</span>
        ) : null}
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => onStart(workout.id)}>
          <Play size={16} fill="currentColor" />
          {empty ? 'Montar' : 'Iniciar'}
        </Button>
        <Link
          to={`/treino/${workout.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold"
        >
          Editar
        </Link>
      </div>
      {featured && workout.timerEnabled ? (
        <p className="mt-3 text-xs text-mist">Descanso padrão {workout.restSeconds}s</p>
      ) : null}
    </article>
  )
}
