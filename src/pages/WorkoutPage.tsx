import { ChevronDown, ChevronUp, GripVertical, Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { ExerciseArt } from '../components/ExerciseArt'
import { ExercisePicker } from '../components/ExercisePicker'
import { ImageLightbox } from '../components/ImageLightbox'
import { SortableItem, SortableList } from '../components/Sortable'
import { Stepper } from '../components/Stepper'
import { Button, FieldLabel, TextArea, Toggle } from '../components/ui'
import { allCategories } from '../lib/categories'
import { WEEKDAYS } from '../lib/dates'
import { createId } from '../lib/id'
import { moveId } from '../lib/reorder'
import { useGym } from '../store/GymProvider'
import { isWorkoutId, type Workout, type WorkoutExercise } from '../types'

export function WorkoutPage() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const gym = useGym()
  const [draft, setDraft] = useState<Workout | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ name: string; categories: string[]; imageUrl: string } | null>(null)

  if (!isWorkoutId(workoutId)) return <Navigate to="/" replace />

  if (loadedFor !== workoutId) {
    setLoadedFor(workoutId)
    setDraft(structuredClone(gym.state.workouts[workoutId]))
  }

  if (!draft || draft.id !== workoutId) return null

  const ids = draft.exercises.map((item) => item.id)
  const activeHere = gym.state.activeSession?.workoutIds.includes(workoutId) ?? false

  function update(patch: Partial<Workout>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function updateExercise(instanceId: string, patch: Partial<WorkoutExercise>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((item) => (item.id === instanceId ? { ...item, ...patch } : item)),
          }
        : current,
    )
  }

  function save() {
    if (!draft) return
    gym.replaceWorkout(draft)
    navigate('/')
  }

  return (
    <div className="pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <section className="rounded-3xl border border-line bg-panel p-4 lg:sticky lg:top-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Montagem</p>
          <h1 className="font-display text-5xl uppercase leading-none">Treino {draft.id}</h1>
          <div className="mt-4">
            <FieldLabel>Dias do treino</FieldLabel>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => {
                const active = draft.days.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      update({
                        days: active ? draft.days.filter((item) => item !== day.value) : [...draft.days, day.value],
                      })
                    }
                    className={`min-h-11 rounded-xl text-xs font-semibold ${active ? 'bg-accent text-accent-ink' : 'bg-raised text-mist'}`}
                  >
                    {day.short}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-mist">Esses dias já vêm selecionados na sessão de hoje.</p>
          </div>
          <div className="mt-4 space-y-3">
            <Toggle
              checked={draft.cardioEnabled}
              onChange={(cardioEnabled) => update({ cardioEnabled })}
              label="Cardio"
              hint="Um check geral, sem carga nem séries."
            />
            {draft.cardioEnabled ? (
              <div>
                <FieldLabel>Posição do cardio</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={draft.cardioPosition === 'start'}
                    onClick={() => update({ cardioPosition: 'start' })}
                    className={`min-h-11 rounded-2xl text-sm font-semibold ${draft.cardioPosition === 'start' ? 'bg-accent text-accent-ink' : 'bg-raised text-mist'}`}
                  >
                    Início
                  </button>
                  <button
                    type="button"
                    aria-pressed={draft.cardioPosition === 'end'}
                    onClick={() => update({ cardioPosition: 'end' })}
                    className={`min-h-11 rounded-2xl text-sm font-semibold ${draft.cardioPosition === 'end' ? 'bg-accent text-accent-ink' : 'bg-raised text-mist'}`}
                  >
                    Fim
                  </button>
                </div>
                <p className="mt-2 text-xs text-mist">O cardio fica no começo ou no fim da lista.</p>
              </div>
            ) : null}
          </div>
          {activeHere ? (
            <p className="mt-4 text-xs leading-relaxed text-warn">
              Há uma sessão com este treino em andamento. O que você salvar entra na próxima.
            </p>
          ) : null}
        </section>

        <section className="mt-6 lg:mt-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-3xl uppercase leading-none">Exercícios</h2>
            <Button onClick={() => setPickerOpen(true)}>
              <Plus size={16} />
              Adicionar
            </Button>
          </div>
          {draft.cardioEnabled && draft.cardioPosition === 'start' ? <CardioMarker /> : null}
          {draft.exercises.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line px-4 py-8 text-sm text-mist">
              Nenhum exercício ainda. Puxe da biblioteca e defina carga, repetições e séries.
            </div>
          ) : (
            <SortableList
              ids={ids}
              onReorder={(orderedIds) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        exercises: orderedIds.flatMap((id) => current.exercises.filter((item) => item.id === id)),
                      }
                    : current,
                )
              }
            >
              <div className="space-y-3">
                {draft.exercises.map((item, index) => {
                  const exercise = gym.state.exercises.find((entry) => entry.id === item.exerciseId)
                  return (
                    <WorkoutExerciseCard
                      key={item.id}
                      item={item}
                      index={index}
                      total={draft.exercises.length}
                      name={exercise?.name ?? 'Exercício removido'}
                      categories={exercise?.categories ?? []}
                      imageUrl={exercise?.imageUrl ?? ''}
                      onChange={(patch) => updateExercise(item.id, patch)}
                      onMove={(direction) => {
                        const orderedIds = moveId(ids, item.id, direction)
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                exercises: orderedIds.flatMap((id) => current.exercises.filter((entry) => entry.id === id)),
                              }
                            : current,
                        )
                      }}
                      onRemove={() => setPendingRemove(item.id)}
                      onPreview={() =>
                        setPreview({
                          name: exercise?.name ?? 'Exercício',
                          categories: exercise?.categories ?? [],
                          imageUrl: exercise?.imageUrl ?? '',
                        })
                      }
                    />
                  )
                })}
              </div>
            </SortableList>
          )}
          {draft.cardioEnabled && draft.cardioPosition === 'end' ? <div className="mt-3"><CardioMarker /></div> : null}
        </section>
      </div>

      <ExercisePicker
        open={pickerOpen}
        exercises={gym.state.exercises}
        categories={allCategories(gym.state)}
        selectedIds={draft.exercises.map((item) => item.exerciseId)}
        onCancel={() => setPickerOpen(false)}
        onSave={(exerciseIds) => {
          setDraft((current) => {
            if (!current) return current
            const kept = current.exercises.filter((item) => exerciseIds.includes(item.exerciseId))
            const have = new Set(kept.map((item) => item.exerciseId))
            const added = exerciseIds
              .filter((id) => !have.has(id))
              .map((exerciseId) => ({
                id: createId(),
                exerciseId,
                load: gym.state.lastUsed[exerciseId]?.load ?? 0,
                sets: 3,
                reps: gym.state.lastUsed[exerciseId]?.reps ?? 10,
                description: '',
                notes: '',
              }))
            return { ...current, exercises: [...kept, ...added] }
          })
          setPickerOpen(false)
        }}
      />

      <ImageLightbox
        open={preview !== null}
        name={preview?.name ?? ''}
        categories={preview?.categories ?? []}
        imageUrl={preview?.imageUrl ?? ''}
        onClose={() => setPreview(null)}
      />

      <Dialog
        open={pendingRemove !== null}
        title="Tirar do treino?"
        description="A biblioteca não muda. Carga, séries e descrição deste treino são apagadas ao salvar."
        onClose={() => setPendingRemove(null)}
      >
        <Button
          variant="danger"
          onClick={() => {
            if (pendingRemove) {
              setDraft((current) =>
                current ? { ...current, exercises: current.exercises.filter((item) => item.id !== pendingRemove) } : current,
              )
            }
            setPendingRemove(null)
          }}
        >
          Tirar do treino
        </Button>
        <Button variant="ghost" onClick={() => setPendingRemove(null)}>
          Cancelar
        </Button>
      </Dialog>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-4 py-3">
          <Button variant="ghost" onClick={() => navigate('/')}>
            Voltar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </div>
      </div>
    </div>
  )
}

function CardioMarker() {
  return (
    <div className="rounded-2xl border border-dashed border-heat/40 bg-heat/10 px-4 py-3 text-sm font-semibold text-heat">
      Cardio
    </div>
  )
}

function WorkoutExerciseCard({
  item,
  index,
  total,
  name,
  categories,
  imageUrl,
  onChange,
  onMove,
  onRemove,
  onPreview,
}: {
  item: WorkoutExercise
  index: number
  total: number
  name: string
  categories: string[]
  imageUrl: string
  onChange: (patch: Partial<Pick<WorkoutExercise, 'load' | 'sets' | 'reps' | 'description' | 'notes'>>) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  onPreview: () => void
}) {
  return (
    <SortableItem id={item.id}>
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
              <ExerciseArt name={name} categories={categories} imageUrl={imageUrl} className="size-14 rounded-2xl" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-xs text-mist">{categories.join(' · ') || 'Sem categoria'}</p>
            </div>
            <div className="flex shrink-0">
              <button type="button" aria-label="Mover para cima" disabled={index === 0} onClick={() => onMove(-1)} className="grid size-10 place-items-center disabled:opacity-30">
                <ChevronUp size={18} />
              </button>
              <button type="button" aria-label="Mover para baixo" disabled={index === total - 1} onClick={() => onMove(1)} className="grid size-10 place-items-center disabled:opacity-30">
                <ChevronDown size={18} />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
            <Stepper label="Carga" suffix="kg" value={item.load} min={0} max={2000} step={5} onChange={(load) => onChange({ load })} />
            <Stepper label="Repetições" integer value={item.reps} min={1} max={200} step={1} onChange={(reps) => onChange({ reps })} />
            <div className="min-[480px]:col-span-2">
              <Stepper label="Séries" integer value={item.sets} min={1} max={30} step={1} onChange={(sets) => onChange({ sets })} />
            </div>
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Descrição</span>
            <TextArea
              rows={2}
              maxLength={600}
              value={item.description}
              placeholder="Como você executa neste treino"
              onChange={(event) => onChange({ description: event.target.value })}
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Notas</span>
            <TextArea
              rows={2}
              maxLength={600}
              value={item.notes}
              placeholder="Lembrete pessoal"
              onChange={(event) => onChange({ notes: event.target.value })}
            />
          </label>
          <button type="button" onClick={onRemove} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-heat">
            <Trash size={16} />
            Excluir do treino
          </button>
        </article>
      )}
    </SortableItem>
  )
}
