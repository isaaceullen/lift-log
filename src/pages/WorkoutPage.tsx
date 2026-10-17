import { ChevronDown, ChevronLeft, ChevronUp, GripVertical, Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { ExerciseArt } from '../components/ExerciseArt'
import { ExercisePicker } from '../components/ExercisePicker'
import { SortableItem, SortableList } from '../components/Sortable'
import { Stepper } from '../components/Stepper'
import { Button, FieldLabel, TextArea, TextField, Toggle } from '../components/ui'
import { WEEKDAYS } from '../lib/dates'
import { moveId } from '../lib/reorder'
import { useGym } from '../store/GymProvider'
import { isWorkoutId, type WorkoutExercise } from '../types'

export function WorkoutPage() {
  const { workoutId } = useParams()
  const gym = useGym()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  if (!isWorkoutId(workoutId)) return <Navigate to="/" replace />
  const workout = gym.state.workouts[workoutId]
  const ids = workout.exercises.map((item) => item.id)
  const activeHere = gym.state.activeSession?.workoutId === workoutId

  const toggleDay = (day: number) => {
    const days = workout.days.includes(day) ? workout.days.filter((item) => item !== day) : [...workout.days, day]
    gym.updateWorkout(workout.id, { days })
  }

  return (
    <div className="pt-[max(0.75rem,env(safe-area-inset-top))]">
      <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-sm text-mist">
        <ChevronLeft size={18} />
        Início
      </Link>
      <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <section className="rounded-3xl border border-line bg-panel p-4 lg:sticky lg:top-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Montagem</p>
          <h1 className="font-display text-5xl uppercase leading-none">Treino {workout.id}</h1>
          <div className="mt-4">
            <FieldLabel htmlFor="workout-label">Apelido</FieldLabel>
            <TextField
              id="workout-label"
              value={workout.label}
              maxLength={40}
              placeholder="Ex.: Peito e tríceps"
              onChange={(event) => gym.updateWorkout(workout.id, { label: event.target.value })}
            />
          </div>
          <div className="mt-4">
            <FieldLabel>Dias do treino</FieldLabel>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => {
                const active = workout.days.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDay(day.value)}
                    className={`min-h-11 rounded-xl text-xs font-semibold ${active ? 'bg-accent text-accent-ink' : 'bg-raised text-mist'}`}
                  >
                    {day.short}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-mist">Esses dias aparecem como treino do dia na tela inicial.</p>
          </div>
          <div className="mt-4 space-y-2">
            <Toggle
              checked={workout.cardioEnabled}
              onChange={(cardioEnabled) => gym.updateWorkout(workout.id, { cardioEnabled })}
              label="Cardio"
              hint="Um check geral no fim da sessão, sem carga nem séries."
            />
            <Toggle
              checked={workout.timerEnabled}
              onChange={(timerEnabled) => gym.updateWorkout(workout.id, { timerEnabled })}
              label="Timer entre séries"
              hint={workout.timerEnabled ? 'Ao marcar a série, o descanso abre.' : 'As séries ficam só com um check.'}
            />
          </div>
          <div className="mt-4">
            <Stepper
              label="Descanso padrão"
              suffix="s"
              integer
              value={workout.restSeconds}
              min={5}
              max={600}
              step={5}
              onChange={(restSeconds) => gym.updateWorkout(workout.id, { restSeconds })}
            />
          </div>
          {activeHere ? (
            <p className="mt-4 text-xs leading-relaxed text-warn">
              Há uma sessão deste treino em andamento. Séries e exercícios novos entram na próxima. A ordem acompanha a sessão.
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
          {workout.exercises.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line px-4 py-8 text-sm text-mist">
              Nenhum exercício ainda. Puxe da biblioteca e defina carga, séries, repetições e a descrição do seu jeito.
            </div>
          ) : (
            <SortableList ids={ids} onReorder={(orderedIds) => gym.reorderWorkout(workout.id, orderedIds)}>
              <div className="space-y-3">
                {workout.exercises.map((item, index) => (
                  <WorkoutExerciseCard
                    key={item.id}
                    item={item}
                    index={index}
                    total={workout.exercises.length}
                    exercise={gym.state.exercises.find((entry) => entry.id === item.exerciseId)}
                    onChange={(patch) => gym.updateWorkoutExercise(workout.id, item.id, patch)}
                    onMove={(direction) => gym.reorderWorkout(workout.id, moveId(ids, item.id, direction))}
                    onRemove={() => setPendingRemove(item.id)}
                  />
                ))}
              </div>
            </SortableList>
          )}
        </section>
      </div>

      <ExercisePicker
        open={pickerOpen}
        state={gym.state}
        workoutId={workout.id}
        onClose={() => setPickerOpen(false)}
        onAdd={(exerciseId) => {
          const exercise = gym.state.exercises.find((item) => item.id === exerciseId)
          gym.addToWorkout(workout.id, exerciseId)
          gym.toast(exercise ? `${exercise.name} entrou no Treino ${workout.id}.` : 'Exercício adicionado.')
        }}
      />

      <Dialog
        open={pendingRemove !== null}
        title="Tirar do treino?"
        description="A biblioteca não muda. Carga, séries e descrição deste treino são apagadas."
        onClose={() => setPendingRemove(null)}
      >
        <Button
          variant="danger"
          onClick={() => {
            if (pendingRemove) gym.removeWorkoutExercise(workout.id, pendingRemove)
            setPendingRemove(null)
          }}
        >
          Tirar do treino
        </Button>
        <Button variant="ghost" onClick={() => setPendingRemove(null)}>
          Cancelar
        </Button>
      </Dialog>
    </div>
  )
}

function WorkoutExerciseCard({
  item,
  index,
  total,
  exercise,
  onChange,
  onMove,
  onRemove,
}: {
  item: WorkoutExercise
  index: number
  total: number
  exercise: { name: string; categories: string[]; imageUrl: string } | undefined
  onChange: (patch: Partial<Pick<WorkoutExercise, 'load' | 'sets' | 'reps' | 'description' | 'notes'>>) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  const name = exercise?.name ?? 'Exercício removido'
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
            <ExerciseArt
              name={name}
              categories={exercise?.categories ?? []}
              imageUrl={exercise?.imageUrl ?? ''}
              className="size-14 shrink-0 rounded-2xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-xs text-mist">{exercise?.categories.join(' · ') || 'Sem categoria'}</p>
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
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stepper label="Carga" suffix="kg" value={item.load} min={0} max={2000} step={2.5} onChange={(load) => onChange({ load })} />
            <Stepper label="Séries" integer value={item.sets} min={1} max={30} step={1} onChange={(sets) => onChange({ sets })} />
            <Stepper label="Repetições" integer value={item.reps} min={1} max={200} step={1} onChange={(reps) => onChange({ reps })} />
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
