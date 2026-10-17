import { ChevronDown, ChevronUp, Flame, GripVertical, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { ExerciseArt } from '../components/ExerciseArt'
import { RestTimer } from '../components/RestTimer'
import { SortableItem, SortableList } from '../components/Sortable'
import { Stepper } from '../components/Stepper'
import { Button, cn } from '../components/ui'
import { sessionElapsedMs } from '../lib/dates'
import { formatClock, formatLoad } from '../lib/format'
import { moveId } from '../lib/reorder'
import { loadTrend, previousLoad } from '../lib/stats'
import { useGym } from '../store/GymProvider'
import { isWorkoutId, type ActiveExercise } from '../types'

export function SessionPage() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const gym = useGym()
  const active = gym.state.activeSession
  const [now, setNow] = useState(() => Date.now())
  const [restOpen, setRestOpen] = useState(false)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const [pendingSet, setPendingSet] = useState<
    { mode: 'add'; instanceId: string } | { mode: 'remove'; instanceId: string; setId: string } | null
  >(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [])

  if (!isWorkoutId(workoutId) || !active || active.workoutId !== workoutId) {
    return <Navigate to="/" replace />
  }

  const workout = gym.state.workouts[workoutId]
  const elapsed = Math.floor(sessionElapsedMs(active, now) / 1000)
  const ids = active.exercises.map((item) => item.instanceId)

  function toggle(instanceId: string, setId: string, completed: boolean) {
    gym.toggleSet(instanceId, setId, completed)
    if (completed && workout.timerEnabled) setRestOpen(true)
  }

  function askRemove(instanceId: string) {
    const entry = active?.exercises.find((item) => item.instanceId === instanceId)
    if (!entry || entry.sets.length <= 1) {
      gym.toast('Fica pelo menos uma série.')
      return
    }
    const target = [...entry.sets].reverse().find((set) => !set.completed) ?? entry.sets[entry.sets.length - 1]
    setPendingSet({ mode: 'remove', instanceId, setId: target.id })
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line bg-ink/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-heat">Ao vivo</p>
            <h1 className="font-display text-4xl uppercase leading-none">
              Treino {workout.id}
              {workout.label ? <span className="ml-2 text-2xl text-mist">{workout.label}</span> : null}
            </h1>
          </div>
          <p className="font-display text-4xl tabular-nums leading-none text-accent">{formatClock(elapsed)}</p>
        </div>
        <p className="mt-1 text-xs text-mist">
          {workout.timerEnabled ? `Descanso desta sessão: ${active.restSeconds}s` : 'Timer desligado'}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setAbandonOpen(true)}>
            Sair sem salvar
          </Button>
          <Button onClick={() => navigate(`/sessao/${workout.id}/resumo`)}>Finalizar treino</Button>
        </div>
      </header>

      {active.exercises.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-6 text-sm text-mist">
          Este treino não tem exercícios. Volte e monte antes de começar.
        </p>
      ) : (
        <SortableList ids={ids} onReorder={(orderedIds) => gym.reorderSession(orderedIds)}>
          <div className="space-y-3">
            {active.exercises.map((entry, index) => {
              const template = workout.exercises.find((item) => item.id === entry.instanceId)
              const catalog = gym.state.exercises.find((item) => item.id === entry.exerciseId)
              return (
                <SessionExerciseCard
                  key={entry.instanceId}
                  entry={entry}
                  index={index}
                  total={active.exercises.length}
                  name={catalog?.name ?? 'Exercício removido'}
                  categories={catalog?.categories ?? []}
                  imageUrl={catalog?.imageUrl ?? ''}
                  description={template?.description ?? ''}
                  notes={template?.notes ?? ''}
                  previous={previousLoad(gym.state.sessions, entry.exerciseId)}
                  onLoad={(load) => gym.setActiveLoad(entry.instanceId, load)}
                  onReps={(reps) => gym.setActiveReps(entry.instanceId, reps)}
                  onToggle={(setId, completed) => toggle(entry.instanceId, setId, completed)}
                  onMove={(direction) => gym.reorderSession(moveId(ids, entry.instanceId, direction))}
                  onAdd={() => setPendingSet({ mode: 'add', instanceId: entry.instanceId })}
                  onRemove={() => askRemove(entry.instanceId)}
                />
              )
            })}
          </div>
        </SortableList>
      )}

      {workout.cardioEnabled ? (
        <button
          type="button"
          onClick={() => gym.setCardio(!active.cardioCompleted)}
          aria-pressed={active.cardioCompleted}
          className={cn(
            'mt-3 flex w-full items-center justify-between rounded-3xl border px-4 py-4 text-left',
            active.cardioCompleted ? 'border-heat bg-heat/15' : 'border-line bg-panel',
          )}
        >
          <span>
            <span className="flex items-center gap-2 font-display text-3xl uppercase">
              <Flame size={18} className="text-heat" />
              Cardio
            </span>
            <span className="mt-1 block text-sm text-mist">Check geral, sem carga nem séries.</span>
          </span>
          <span className={cn('grid size-12 place-items-center rounded-2xl text-sm font-bold', active.cardioCompleted ? 'bg-heat text-white' : 'border border-line')}>
            {active.cardioCompleted ? 'OK' : '—'}
          </span>
        </button>
      ) : null}

      <RestTimer
        open={restOpen}
        initialSeconds={active.restSeconds}
        soundEnabled={gym.state.settings.soundEnabled}
        onChangeSeconds={gym.setRestSeconds}
        onClose={() => setRestOpen(false)}
      />

      <Dialog
        open={abandonOpen}
        title="Sair sem salvar?"
        description="As séries marcadas agora serão descartadas. A ordem e as séries salvas no treino permanecem."
        onClose={() => setAbandonOpen(false)}
      >
        <Button
          variant="danger"
          onClick={() => {
            gym.abandonSession()
            navigate('/')
          }}
        >
          Sair sem salvar
        </Button>
        <Button variant="ghost" onClick={() => setAbandonOpen(false)}>
          Continuar treino
        </Button>
      </Dialog>

      <Dialog
        open={pendingSet !== null}
        title={pendingSet?.mode === 'remove' ? 'Remover série' : 'Série extra'}
        description={
          pendingSet?.mode === 'remove'
            ? 'A série sai desta sessão. Você pode atualizar o treino ou deixar só para agora.'
            : 'Quer guardar essa série no treino ou usar só agora?'
        }
        onClose={() => setPendingSet(null)}
      >
        <Button
          onClick={() => {
            if (!pendingSet) return
            if (pendingSet.mode === 'add') gym.addSet(pendingSet.instanceId, true)
            else gym.removeSet(pendingSet.instanceId, pendingSet.setId, true)
            setPendingSet(null)
          }}
        >
          Salvar permanentemente neste treino
        </Button>
        <Button
          variant="soft"
          onClick={() => {
            if (!pendingSet) return
            if (pendingSet.mode === 'add') gym.addSet(pendingSet.instanceId, false)
            else gym.removeSet(pendingSet.instanceId, pendingSet.setId, false)
            setPendingSet(null)
          }}
        >
          Só nesta sessão
        </Button>
        <Button variant="ghost" onClick={() => setPendingSet(null)}>
          Cancelar
        </Button>
      </Dialog>
    </div>
  )
}

function SessionExerciseCard({
  entry,
  index,
  total,
  name,
  categories,
  imageUrl,
  description,
  notes,
  previous,
  onLoad,
  onReps,
  onToggle,
  onMove,
  onAdd,
  onRemove,
}: {
  entry: ActiveExercise
  index: number
  total: number
  name: string
  categories: string[]
  imageUrl: string
  description: string
  notes: string
  previous: number | null
  onLoad: (load: number) => void
  onReps: (reps: number) => void
  onToggle: (setId: string, completed: boolean) => void
  onMove: (direction: -1 | 1) => void
  onAdd: () => void
  onRemove: () => void
}) {
  const trend = loadTrend(entry.load, previous)
  const done = entry.sets.filter((set) => set.completed).length
  return (
    <SortableItem id={entry.instanceId}>
      {(handle) => (
        <article className="rounded-3xl border border-line bg-panel p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              ref={handle.ref}
              {...handle.attributes}
              {...handle.listeners}
              aria-label="Arrastar para reordenar"
              className="grid size-11 shrink-0 touch-none place-items-center rounded-2xl bg-raised text-mist"
            >
              <GripVertical size={18} />
            </button>
            <ExerciseArt name={name} categories={categories} imageUrl={imageUrl} className="size-16 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-xs text-mist">{categories.join(' · ') || 'Sem categoria'}</p>
            </div>
            <div className="flex">
              <button type="button" aria-label="Mover para cima" disabled={index === 0} onClick={() => onMove(-1)} className="grid size-10 place-items-center disabled:opacity-30">
                <ChevronUp size={18} />
              </button>
              <button type="button" aria-label="Mover para baixo" disabled={index === total - 1} onClick={() => onMove(1)} className="grid size-10 place-items-center disabled:opacity-30">
                <ChevronDown size={18} />
              </button>
            </div>
          </div>
          {description ? (
            <p className="mt-3 border-l-2 border-accent pl-3 text-sm leading-relaxed text-paper">{description}</p>
          ) : null}
          {notes ? <p className="mt-2 text-sm text-mist">Nota: {notes}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {trend.kind === 'new' ? <span className="text-mist">Primeira vez</span> : null}
            {trend.kind === 'same' ? <span className="text-mist">Manteve a carga</span> : null}
            {trend.kind === 'up' ? <span className="font-semibold text-good">Subiu {formatLoad(trend.delta)}</span> : null}
            {trend.kind === 'down' ? <span className="font-semibold text-heat">Desceu {formatLoad(trend.delta)}</span> : null}
            {previous !== null ? <span className="text-mist">última {formatLoad(previous)}</span> : null}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Stepper label="Carga" suffix="kg" value={entry.load} min={0} max={2000} step={2.5} onChange={onLoad} />
            <Stepper label="Repetições" integer value={entry.reps} min={1} max={200} step={1} onChange={onReps} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">
              Séries · {done}/{entry.sets.length}
            </p>
            <div className="flex gap-1">
              <button type="button" onClick={onRemove} className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-xs font-semibold text-mist">
                <Minus size={14} />
                Série
              </button>
              <button type="button" onClick={onAdd} className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-xs font-semibold text-accent">
                <Plus size={14} />
                Série
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.sets.map((set, setIndex) => (
              <button
                key={set.id}
                type="button"
                aria-pressed={set.completed}
                aria-label={`Série ${setIndex + 1}${set.completed ? ' feita' : ''}`}
                onClick={() => onToggle(set.id, !set.completed)}
                className={cn(
                  'grid size-12 place-items-center rounded-2xl text-sm font-semibold',
                  set.completed ? 'bg-accent text-accent-ink' : 'border border-line bg-ink/40',
                )}
              >
                {setIndex + 1}
              </button>
            ))}
          </div>
        </article>
      )}
    </SortableItem>
  )
}
