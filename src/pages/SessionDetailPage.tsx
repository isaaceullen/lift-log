import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { Stepper } from '../components/Stepper'
import { Button, TextArea } from '../components/ui'
import { formatDayHeading, formatTime } from '../lib/dates'
import { formatDuration, formatLoad, formatVolume } from '../lib/format'
import { totalVolume } from '../lib/volume'
import { useGym } from '../store/GymProvider'
import type { Session } from '../types'

export function SessionDetailPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { state, updateSession, deleteSession, toast } = useGym()
  const session = state.sessions.find((item) => item.id === sessionId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Session | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!session) {
    return (
      <div className="pt-16">
        <p className="text-sm text-mist">Sessão não encontrada.</p>
        <Link to="/historico" className="mt-3 inline-flex text-accent">
          Voltar ao histórico
        </Link>
      </div>
    )
  }

  const view = editing && draft ? draft : session

  const startEdit = () => {
    setDraft(structuredClone(session))
    setEditing(true)
  }

  const updateExercise = (index: number, patch: Partial<Session['exercises'][number]>) => {
    if (!draft) return
    setDraft({
      ...draft,
      exercises: draft.exercises.map((item, exerciseIndex) =>
        exerciseIndex === index ? { ...item, ...patch } : item,
      ),
    })
  }

  return (
    <div className="pt-[max(0.75rem,env(safe-area-inset-top))]">
      <Link to="/historico" className="inline-flex min-h-11 items-center gap-1 text-sm text-mist">
        <ChevronLeft size={18} />
        Histórico
      </Link>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
        {formatDayHeading(new Date(session.startedAt))} · {formatTime(session.startedAt)}
      </p>
      <h1 className="font-display text-5xl uppercase leading-none">
        {session.workoutIds.length > 1 ? 'Treinos' : 'Treino'} {session.workoutIds.join(' · ')}
      </h1>
      <p className="mt-2 text-sm text-mist">
        {formatDuration(session.durationSeconds)} · {formatVolume(totalVolume(view.exercises))}
      </p>

      {editing && draft ? (
        <label className="mt-5 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-mist">Notas do dia</span>
          <TextArea
            rows={4}
            maxLength={1000}
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          />
        </label>
      ) : (
        <p className="mt-5 rounded-3xl border border-line bg-panel px-4 py-4 text-sm leading-relaxed">
          {session.notes || 'Sem notas neste dia.'}
        </p>
      )}

      {view.cardios.map((cardio) => (
        <button
          key={cardio.workoutId}
          type="button"
          disabled={!editing || !draft}
          onClick={() =>
            draft &&
            setDraft({
              ...draft,
              cardios: draft.cardios.map((item) =>
                item.workoutId === cardio.workoutId ? { ...item, completed: !item.completed } : item,
              ),
            })
          }
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3 text-left disabled:opacity-100"
        >
          <span>Cardio{view.workoutIds.length > 1 ? ` · Treino ${cardio.workoutId}` : ''}</span>
          <span className="font-semibold">{cardio.completed ? 'Feito' : 'Não marcado'}</span>
        </button>
      ))}

      <div className="mt-4 space-y-3">
        {view.exercises.map((exercise, index) => (
          <article key={`${exercise.instanceId}-${index}`} className="rounded-3xl border border-line bg-panel p-4">
            {view.workoutIds.length > 1 ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Treino {exercise.workoutId}</p>
            ) : null}
            <h2 className="font-semibold">{state.exercises.find((item) => item.id === exercise.exerciseId)?.name ?? exercise.name}</h2>
            <p className="text-xs text-mist">{exercise.categories.join(' · ')}</p>
            {exercise.description ? <p className="mt-2 text-sm">{exercise.description}</p> : null}
            {editing && draft ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Stepper
                  label="Carga"
                  suffix="kg"
                  value={exercise.load}
                  min={0}
                  max={2000}
                  step={5}
                  onChange={(load) => updateExercise(index, { load })}
                />
                <Stepper
                  label="Reps"
                  integer
                  value={exercise.reps}
                  min={1}
                  max={200}
                  step={1}
                  onChange={(reps) => updateExercise(index, { reps })}
                />
                <Stepper
                  label="Feitas"
                  integer
                  value={exercise.completedSets}
                  min={0}
                  max={exercise.totalSets}
                  step={1}
                  onChange={(completedSets) => updateExercise(index, { completedSets })}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-mist">
                {exercise.completedSets}/{exercise.totalSets} séries · {formatLoad(exercise.load)} · {exercise.reps} reps
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-2">
        {editing && draft ? (
          <>
            <Button
              onClick={() => {
                updateSession(draft)
                setEditing(false)
                toast('Sessão atualizada.')
              }}
            >
              Salvar alterações
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button variant="soft" onClick={startEdit}>
            Editar sessão
          </Button>
        )}
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          Excluir sessão
        </Button>
      </div>

      <Dialog
        open={confirmDelete}
        title="Excluir sessão?"
        description="O dia sai do calendário e do histórico de cargas. O treino montado não muda."
        onClose={() => setConfirmDelete(false)}
      >
        <Button
          variant="danger"
          onClick={() => {
            deleteSession(session.id)
            toast('Sessão excluída.')
            navigate('/historico')
          }}
        >
          Excluir sessão
        </Button>
        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
          Cancelar
        </Button>
      </Dialog>
    </div>
  )
}
