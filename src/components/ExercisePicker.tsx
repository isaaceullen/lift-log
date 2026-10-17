import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExerciseArt } from './ExerciseArt'
import { Button, cn } from './ui'
import type { Exercise } from '../types'
import { fold } from '../lib/text'

export function ExercisePicker({
  open,
  exercises,
  categories,
  selectedIds,
  onCancel,
  onSave,
}: {
  open: boolean
  exercises: Exercise[]
  categories: string[]
  selectedIds: string[]
  onCancel: () => void
  onSave: (exerciseIds: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open && !wasOpen.current) {
      setPicked([...new Set(selectedIds)])
      setQuery('')
      setCategory(null)
    }
    wasOpen.current = open
  }, [open, selectedIds])

  const visible = useMemo(() => {
    const needle = fold(query)
    return [...exercises]
      .filter((exercise) => {
        const matchesName = !needle || fold(exercise.name).includes(needle)
        const matchesCategory = !category || exercise.categories.includes(category)
        return matchesName && matchesCategory
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [category, exercises, query])

  if (!open) return null

  function toggle(exerciseId: string) {
    setPicked((current) =>
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId],
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">Biblioteca</p>
            <h2 className="font-display text-3xl uppercase leading-none">Adicionar</h2>
          </div>
          <button type="button" onClick={onCancel} className="min-h-11 rounded-full px-3 text-sm font-semibold text-mist">
            Cancelar
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
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-3">
          {visible.length === 0 ? <p className="text-sm text-mist">Nada encontrado na biblioteca.</p> : null}
          {visible.map((exercise) => {
            const added = picked.includes(exercise.id)
            return (
              <div key={exercise.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-2">
                <ExerciseArt name={exercise.name} categories={exercise.categories} imageUrl={exercise.imageUrl} className="size-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{exercise.name}</p>
                  <p className="truncate text-xs text-mist">{exercise.categories.join(' · ') || 'Sem categoria'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(exercise.id)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-2 text-sm font-semibold',
                    added ? 'border border-heat/50 text-heat' : 'bg-accent text-accent-ink',
                  )}
                >
                  {added ? 'Remover' : 'Adicionar'}
                </button>
              </div>
            )
          })}
        </div>
        <div className="border-t border-line py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button className="w-full" onClick={() => onSave(picked)}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  )
}
