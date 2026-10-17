import { ChevronDown, ChevronUp, Flame, GripVertical, Minus, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { ExerciseArt } from '../components/ExerciseArt'
import { ImageLightbox } from '../components/ImageLightbox'
import { RestTimer } from '../components/RestTimer'
import { SortableItem, SortableList } from '../components/Sortable'
import { Stepper } from '../components/Stepper'
import { Button, cn } from '../components/ui'
import { sessionElapsedMs } from '../lib/dates'
import { formatClock, formatLoad } from '../lib/format'
import { moveId } from '../lib/reorder'
import { loadTrend, previousLoad } from '../lib/stats'
import { useGym } from '../store/GymProvider'
import type { ActiveExercise, WorkoutId } from '../types'

export function SessionPage() {
  const navigate = useNavigate()
  const gym = useGym()
  const active = gym.state.activeSession
  const [now, setNow] = useState(() => Date.now())
  const [restOpen, setRestOpen] = useState(false)
  const [abandonOpen, setAbandonOpen] = useState(false)
  const [preview, setPreview] = useState<{ name: string; categories: string[]; imageUrl: string } | null>(null)
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

  if (!active) return <Navigate to="/" replace />

  const elapsed = Math.floor(sessionElapsedMs(active, now) / 1000)

  function toggle(instanceId: string, setId: string, completed: boolean) {
    gym.toggleSet(instanceId, setId, completed)
    if (completed && gym.state.settings.timerEnabled) setRestOpen(true)
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
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {active.workoutIds.map((id) => (
            <span key={id} className="grid size-12 place-items-center rounded-2xl bg-panel font-display text-2xl uppercase">
              {id}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAbandonOpen(true)}
          aria-label="Sair sem salvar"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-line"
        >
          <X size={18} />
        </button>
      </div>

      {active.workoutIds.map((workoutId) => {
        const entries = active.exercises.filter((item) => item.workoutId === workoutId)
        const cardio = active.cardios.find((item) => item.workoutId === workoutId) ?? null
        return (
          <WorkoutBlock
            key={workoutId}
            workoutId={workoutId}
            entries={entries}
            cardio={cardio}
            showLetter={active.workoutIds.length > 1}
            exercises={gym.state.exercises}
            templates={gym.state.workouts[workoutId].exercises}
            sessions={gym.state.sessions}
            onReorder={(orderedIds) => gym.reorderSession(workoutId, orderedIds)}
            onLoad={gym.setActiveLoad}
            onReps={gym.setActiveReps}
            onToggle={toggle}
            onAdd={(instanceId) => setPendingSet({ mode: 'add', instanceId })}
            onRemove={askRemove}
            onCardio={(completed) => gym.setCardio(workoutId, completed)}
            onPreview={setPreview}
          />
        )
      })}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p className="font-display text-4xl tabular-nums leading-none text-accent">{formatClock(elapsed)}</p>
          <Button className="flex-1" onClick={() => navigate('/sessao/resumo')}>
            Finalizar treino
          </Button>
        </div>
      </div>

      <RestTimer
        open={restOpen}
        initialSeconds={active.restSeconds}
        soundEnabled={gym.state.settings.soundEnabled}
        onChangeSeconds={gym.setRestSeconds}
        onClose={() => setRestOpen(false)}
      />

      <ImageLightbox
        open={preview !== null}
        name={preview?.name ?? ''}
        categories={preview?.categories ?? []}
        imageUrl={preview?.imageUrl ?? ''}
        onClose={() => setPreview(null)}
      />

      <Dialog
        open={abandonOpen}
        title="Sair sem salvar?"
        description="As séries marcadas agora serão descartadas. A ordem e as séries salvas nos treinos permanecem."
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

function WorkoutBlock({
  workoutId,
  entries,
  cardio,
  showLetter,
  exercises,
  templates,
  sessions,
  onReorder,
  onLoad,
  onReps,
  onToggle,
  onAdd,
  onRemove,
  onCardio,
  onPreview,
}: {
  workoutId: WorkoutId
  entries: ActiveExercise[]
  cardio: { position: 'start' | 'end'; completed: boolean } | null
  showLetter: boolean
  exercises: ReturnType<typeof useGym>['state']['exercises']
  templates: ReturnType<typeof useGym>['state']['workouts'][WorkoutId]['exercises']
  sessions: ReturnType<typeof useGym>['state']['sessions']
  onReorder: (orderedIds: string[]) => void
  onLoad: (instanceId: string, load: number) => void
  onReps: (instanceId: string, reps: number) => void
  onToggle: (instanceId: string, setId: string, completed: boolean) => void
  onAdd: (instanceId: string) => void
  onRemove: (instanceId: string) => void
  onCardio: (completed: boolean) => void
  onPreview: (value: { name: string; categories: string[]; imageUrl: string }) => void
}) {
  const ids = entries.map((item) => item.instanceId)
  const cardioButton = cardio ? (
    <button
      type="button"
      onClick={() => onCardio(!cardio.completed)}
      aria-pressed={cardio.completed}
      className={cn(
        'flex w-full items-center justify-between rounded-3xl border px-4 py-4 text-left',
        cardio.completed ? 'border-heat bg-heat/15' : 'border-line bg-panel',
      )}
    >
      <span>
        <span className="flex items-center gap-2 font-display text-3xl uppercase">
          <Flame size={18} className="text-heat" />
          Cardio
        </span>
        <span className="mt-1 block text-sm text-mist">Check geral, sem carga nem séries.</span>
      </span>
      <span className={cn('grid size-12 place-items-center rounded-2xl text-sm font-bold', cardio.completed ? 'bg-heat text-white' : 'border border-line')}>
        {cardio.completed ? 'OK' : '—'}
      </span>
    </button>
  ) : null

  return (
    <section className="mb-6">
      {showLetter ? <h2 className="mb-3 font-display text-3xl uppercase leading-none">Treino {workoutId}</h2> : null}
      {cardio?.position === 'start' ? <div className="mb-3">{cardioButton}</div> : null}
      {entries.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-6 text-sm text-mist">
          Este treino não tem exercícios.
        </p>
      ) : (
        <SortableList ids={ids} onReorder={onReorder}>
          <div className="space-y-3">
            {entries.map((entry, index) => {
              const template = templates.find((item) => item.id === entry.instanceId)
              const catalog = exercises.find((item) => item.id === entry.exerciseId)
              const name = catalog?.name ?? 'Exercício removido'
              const categories = catalog?.categories ?? []
              const imageUrl = catalog?.imageUrl ?? ''
              return (
                <SessionExerciseCard
                  key={entry.instanceId}
                  entry={entry}
                  index={index}
                  total={entries.length}
                  name={name}
                  categories={categories}
                  imageUrl={imageUrl}
                  description={template?.description ?? ''}
                  notes={template?.notes ?? ''}
                  previous={previousLoad(sessions, entry.exerciseId)}
                  onLoad={(load) => onLoad(entry.instanceId, load)}
                  onReps={(reps) => onReps(entry.instanceId, reps)}
                  onToggle={(setId, completed) => onToggle(entry.instanceId, setId, completed)}
                  onMove={(direction) => onReorder(moveId(ids, entry.instanceId, direction))}
                  onAdd={() => onAdd(entry.instanceId)}
                  onRemove={() => onRemove(entry.instanceId)}
                  onPreview={() => onPreview({ name, categories, imageUrl })}
                />
              )
            })}
          </div>
        </SortableList>
      )}
      {cardio && cardio.position !== 'start' ? <div className="mt-3">{cardioButton}</div> : null}
    </section>
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
  onPreview,
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
  onPreview: () => void
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
            <button type="button" onClick={onPreview} aria-label={`Ver imagem de ${name}`} className="shrink-0">
              <ExerciseArt name={name} categories={categories} imageUrl={imageUrl} className="size-16 rounded-2xl" />
            </button>
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
          <div className="mt-3 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
            <Stepper label="Carga" suffix="kg" value={entry.load} min={0} max={2000} step={5} onChange={onLoad} />
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
