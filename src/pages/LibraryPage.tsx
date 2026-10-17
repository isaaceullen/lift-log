import { Pencil, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '../components/Dialog'
import { ExerciseArt } from '../components/ExerciseArt'
import { ImageLightbox } from '../components/ImageLightbox'
import { Button, buttonClass, cn } from '../components/ui'
import { allCategories, removableCategoryNames } from '../lib/categories'
import { fold } from '../lib/text'
import { useGym } from '../store/GymProvider'
import type { Exercise } from '../types'

export function LibraryPage() {
  const { state, seedStatus, removeCategory } = useGym()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [preview, setPreview] = useState<Exercise | null>(null)
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)
  const categories = allCategories(state)
  const removable = removableCategoryNames(state)

  const exercises = useMemo(() => {
    const needle = fold(query)
    return [...state.exercises]
      .filter((exercise) => {
        const matchesName = !needle || fold(exercise.name).includes(needle)
        const matchesCategory =
          selected.length === 0 || exercise.categories.some((category) => selected.includes(category))
        return matchesName && matchesCategory
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [query, selected, state.exercises])

  function toggleCategory(category: string) {
    setSelected((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  return (
    <div className="pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line/80 bg-ink/80 px-4 pt-[max(0.25rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">Catálogo</p>
            <h1 className="font-display text-4xl uppercase leading-none">Biblioteca</h1>
          </div>
          <Link to="/biblioteca/nova" className={buttonClass('primary', 'px-3')} aria-label="Adicionar exercício">
            <Plus size={18} />
            Novo
          </Link>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-panel px-3">
          <Search size={16} className="text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome"
            className="w-full bg-transparent py-2 text-base outline-none placeholder:text-mist"
            aria-label="Buscar por nome"
          />
        </label>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <FilterChip active={selected.length === 0} onClick={() => setSelected([])}>
            Todas
          </FilterChip>
          {categories.map((category) => (
            <FilterChip key={category} active={selected.includes(category)} onClick={() => toggleCategory(category)}>
              {category}
            </FilterChip>
          ))}
        </div>
        {removable.length > 0 ? (
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist">Suas categorias</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {removable.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setPendingCategory(category)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
                >
                  {category}
                  <X size={12} />
                  <span className="sr-only">Remover {category}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {state.exercises.length === 0 && seedStatus === 'loading' ? (
        <p className="text-sm text-mist">Abrindo a biblioteca inicial…</p>
      ) : null}
      {state.exercises.length === 0 && seedStatus === 'error' ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-5 text-sm text-mist">
          Conecte-se uma vez para baixar a biblioteca inicial. Você já pode cadastrar um exercício.
        </p>
      ) : null}
      {state.exercises.length > 0 && exercises.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-4 py-5 text-sm text-mist">
          Nenhum exercício com esse nome ou filtro.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {exercises.map((exercise) => {
          const owned = exercise.source === 'user'
          return (
            <article
              key={exercise.id}
              className={cn(
                'overflow-hidden rounded-3xl border',
                owned ? 'border-accent/35 bg-accent/[0.06]' : 'border-line bg-panel',
              )}
            >
              <button
                type="button"
                className="block w-full"
                aria-label={`Ver imagem de ${exercise.name}`}
                onClick={() => setPreview(exercise)}
              >
                <ExerciseArt
                  name={exercise.name}
                  categories={exercise.categories}
                  imageUrl={exercise.imageUrl}
                  className="h-28 sm:h-36"
                />
              </button>
              <div className="flex items-start gap-1 p-2.5 sm:p-3">
                {owned ? (
                  <Link
                    to={`/biblioteca/editar/${exercise.id}`}
                    aria-label={`Editar ${exercise.name}`}
                    className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-mist hover:bg-raised hover:text-paper"
                  >
                    <Pencil size={15} />
                  </Link>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <h2 className="text-sm font-semibold leading-tight sm:text-base">{exercise.name}</h2>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        owned ? 'bg-accent/15 text-accent' : 'bg-raised text-mist',
                      )}
                    >
                      {owned ? 'Seu' : 'Base'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {exercise.categories.length === 0 ? <span className="text-[11px] text-mist">Sem categoria</span> : null}
                    {exercise.categories.map((category) => (
                      <span key={category} className="rounded-full bg-raised px-1.5 py-0.5 text-[11px] text-mist">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <ImageLightbox
        open={preview !== null}
        name={preview?.name ?? ''}
        categories={preview?.categories ?? []}
        imageUrl={preview?.imageUrl ?? ''}
        onClose={() => setPreview(null)}
      />

      <Dialog
        open={pendingCategory !== null}
        title="Remover categoria?"
        description={
          pendingCategory
            ? `"${pendingCategory}" sai dos seus exercícios. Categorias da biblioteca inicial continuam no lugar.`
            : undefined
        }
        onClose={() => setPendingCategory(null)}
      >
        <Button
          variant="danger"
          onClick={() => {
            if (pendingCategory) {
              removeCategory(pendingCategory)
              setSelected((current) => current.filter((item) => item !== pendingCategory))
            }
            setPendingCategory(null)
          }}
        >
          Remover
        </Button>
        <Button variant="ghost" onClick={() => setPendingCategory(null)}>
          Cancelar
        </Button>
      </Dialog>
    </div>
  )
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold',
        active ? 'bg-accent text-accent-ink' : 'bg-panel text-mist',
      )}
    >
      {children}
    </button>
  )
}
