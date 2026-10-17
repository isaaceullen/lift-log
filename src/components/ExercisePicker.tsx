import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ExerciseArt } from './ExerciseArt'
import { allCategories } from '../lib/categories'
import { fold } from '../lib/text'
import type { AppState, WorkoutId } from '../types'
import { cn } from './ui'

export function ExercisePicker({
  open,
  state,
  workoutId,
  onClose,
  onAdd,
}: {
  open: boolean
  state: AppState
  workoutId: WorkoutId
  onClose: () => void
  onAdd: (exerciseId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const categories = allCategories(state)
  const workout = state.workouts[workoutId]

  const exercises = useMemo(() => {
    const needle = fold(query)
    return [...state.exercises]
      .filter((exercise) => {
        const matchesName = !needle || fold(exercise.name).includes(needle)
        const matchesCategory = !category || exercise.categories.includes(category)
        return matchesName && matchesCategory
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [category, query, state.exercises])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">Treino {workoutId}</p>
            <h2 className="font-display text-3xl uppercase leading-none">Adicionar</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full border border-line" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-panel px-3">
          <Search size={16} className="text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar na biblioteca"
            aria-label="Buscar na biblioteca"
            className="w-full bg-transparent py-2 outline-none placeholder:text-mist"
          />
        </label>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn('shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold', category === null ? 'bg-accent text-accent-ink' : 'bg-panel text-mist')}
          >
            Todas
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn('shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold', category === item ? 'bg-accent text-accent-ink' : 'bg-panel text-mist')}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 flex-1 space-y-2 overflow-auto">
          {exercises.length === 0 ? <p className="text-sm text-mist">Nada encontrado na biblioteca.</p> : null}
          {exercises.map((exercise) => {
            const count = workout.exercises.filter((item) => item.exerciseId === exercise.id).length
            return (
              <div key={exercise.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-2">
                <ExerciseArt name={exercise.name} categories={exercise.categories} imageUrl={exercise.imageUrl} className="size-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{exercise.name}</p>
                  <p className="truncate text-xs text-mist">{exercise.categories.join(' · ') || 'Sem categoria'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(exercise.id)}
                  className="shrink-0 rounded-full bg-accent px-3 py-2 text-sm font-semibold text-accent-ink"
                >
                  {count > 0 ? 'De novo' : 'Adicionar'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
