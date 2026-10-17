import { ChevronLeft } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { ExerciseArt } from '../components/ExerciseArt'
import { Button, FieldLabel, TextField, cn } from '../components/ui'
import { allCategories, canonicalCategory, findExerciseByName, removableCategoryNames } from '../lib/categories'
import { isSafeImageUrl } from '../lib/image'
import { useGym } from '../store/GymProvider'
import { WORKOUT_IDS } from '../types'

export function ExerciseFormPage() {
  const { exerciseId } = useParams()
  const isNew = !exerciseId
  const navigate = useNavigate()
  const { state, seedStatus, addExercise, updateExercise, deleteExercise, addCategory, removeCategory, toast } = useGym()
  const exercise = state.exercises.find((item) => item.id === exerciseId)
  const nameId = useId()
  const imageId = useId()
  const categoryId = useId()
  const [name, setName] = useState(exercise?.name ?? '')
  const [categories, setCategories] = useState<string[]>(exercise?.categories ?? [])
  const [imageUrl, setImageUrl] = useState(exercise?.imageUrl ?? '')
  const [categoryDraft, setCategoryDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [snapshotKey, setSnapshotKey] = useState('')

  useEffect(() => {
    const key = `${exerciseId ?? 'new'}:${exercise ? 'ready' : 'wait'}`
    if (key === snapshotKey) return
    if (!isNew && !exercise) return
    setSnapshotKey(key)
    setName(exercise?.name ?? '')
    setCategories(exercise?.categories ?? [])
    setImageUrl(exercise?.imageUrl ?? '')
  }, [exercise, exerciseId, isNew, snapshotKey])

  const duplicate = findExerciseByName(state.exercises, name, exercise?.id)
  const imageInvalid = imageUrl.trim().length > 0 && !isSafeImageUrl(imageUrl.trim())
  const canSave = name.trim().length > 0 && !duplicate && !imageInvalid
  const knownCategories = allCategories(state)
  const usedIn = exercise
    ? WORKOUT_IDS.filter((id) => state.workouts[id].exercises.some((item) => item.exerciseId === exercise.id))
    : []

  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  function createCategory() {
    const next = canonicalCategory(state, categoryDraft)
    if (!next) return
    addCategory(next)
    const stored = canonicalCategory(
      { ...state, customCategories: [...state.customCategories, next] },
      next,
    )
    setCategories((current) => (current.some((item) => item.toLocaleLowerCase('pt-BR') === stored.toLocaleLowerCase('pt-BR')) ? current : [...current, stored]))
    setCategoryDraft('')
  }

  function save() {
    if (!canSave) return
    const input = { name, categories, imageUrl }
    if (isNew) {
      const id = addExercise(input)
      if (!id) {
        toast('Já existe um exercício com esse nome.')
        return
      }
      toast('Exercício adicionado.')
    } else if (exercise) {
      const ok = updateExercise(exercise.id, input)
      if (!ok) {
        toast('Já existe um exercício com esse nome.')
        return
      }
      toast('Exercício atualizado.')
    }
    navigate('/biblioteca')
  }

  if (!isNew && exercise?.source === 'seed') {
    return (
      <div className="pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/biblioteca" className="inline-flex min-h-11 items-center gap-1 text-sm text-mist">
          <ChevronLeft size={18} />
          Biblioteca
        </Link>
        <h1 className="font-display text-4xl uppercase leading-none">{exercise.name}</h1>
        <p className="mt-3 text-sm text-mist">
          Este exercício faz parte da biblioteca inicial e não pode ser editado nem excluído.
        </p>
      </div>
    )
  }

  if (!isNew && !exercise && seedStatus === 'loading') {
    return <p className="pt-16 text-sm text-mist">Carregando exercício…</p>
  }
  if (!isNew && !exercise && seedStatus !== 'loading') {
    return (
      <div className="pt-16">
        <p className="text-sm text-mist">Esse exercício não está na biblioteca.</p>
        <Link to="/biblioteca" className="mt-4 inline-flex text-accent">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="pt-[max(0.75rem,env(safe-area-inset-top))]">
      <Link to="/biblioteca" className="inline-flex min-h-11 items-center gap-1 text-sm text-mist">
        <ChevronLeft size={18} />
        Biblioteca
      </Link>
      <h1 className="font-display text-4xl uppercase leading-none">{isNew ? 'Novo exercício' : 'Editar exercício'}</h1>
      <p className="mt-2 text-sm text-mist">A descrição fica no treino, não aqui. Cada treino guarda a sua.</p>

      <div className="mt-5 overflow-hidden rounded-3xl border border-line">
        <ExerciseArt name={name || 'Exercício'} categories={categories} imageUrl={imageUrl} className="h-44" />
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div>
          <FieldLabel htmlFor={nameId}>Nome</FieldLabel>
          <TextField
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Supino reto com barra"
            required
            maxLength={80}
            autoComplete="off"
          />
          {duplicate ? (
            <p className="mt-2 text-sm text-warn" role="status">
              Já existe um exercício com esse nome: {duplicate.name}.
            </p>
          ) : null}
        </div>

        <div>
          <FieldLabel>Categorias</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {knownCategories.map((category) => {
              const active = categories.includes(category)
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-semibold',
                    active ? 'bg-accent text-accent-ink' : 'bg-panel text-mist',
                  )}
                  aria-pressed={active}
                >
                  {category}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <TextField
              id={categoryId}
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  createCategory()
                }
              }}
              placeholder="Nova categoria"
              maxLength={40}
              aria-label="Nova categoria"
            />
            <Button type="button" variant="soft" onClick={createCategory} disabled={!categoryDraft.trim()}>
              Criar
            </Button>
          </div>
          {removableCategoryNames(state).length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {removableCategoryNames(state).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    removeCategory(category)
                    setCategories((current) => current.filter((item) => item !== category))
                  }}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-mist"
                >
                  Remover {category}
                </button>
              ))}
            </div>
          ) : null}
          {categories.length === 0 ? (
            <p className="mt-2 text-xs text-mist">Sem categoria o exercício continua válido, mas fica mais difícil de filtrar.</p>
          ) : null}
        </div>

        <div>
          <FieldLabel htmlFor={imageId}>Link da imagem ou GIF</FieldLabel>
          <TextField
            id={imageId}
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://…/supino.gif"
            inputMode="url"
            maxLength={800}
          />
          {imageInvalid ? <p className="mt-2 text-sm text-warn">Use um link http ou https.</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={!canSave}>
          Salvar exercício
        </Button>
      </form>

      {!isNew && exercise ? (
        <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirmDelete(true)}>
          Excluir exercício
        </Button>
      ) : null}

      <Dialog
        open={confirmDelete}
        title="Excluir exercício?"
        description={
          usedIn.length > 0
            ? `Ele também sai dos treinos ${usedIn.join(', ')}. O histórico das sessões antigas permanece.`
            : 'Ele sai da biblioteca deste aparelho.'
        }
        onClose={() => setConfirmDelete(false)}
      >
        <Button
          variant="danger"
          onClick={() => {
            if (!exercise) return
            deleteExercise(exercise.id)
            toast('Exercício excluído.')
            navigate('/biblioteca')
          }}
        >
          Excluir
        </Button>
        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
          Cancelar
        </Button>
      </Dialog>
    </div>
  )
}
