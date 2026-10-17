import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExerciseArt } from '../components/ExerciseArt'
import { buttonClass, cn } from '../components/ui'
import { allCategories } from '../lib/categories'
import { fold } from '../lib/text'
import { useGym } from '../store/GymProvider'

export function LibraryPage() {
  const { state, seedStatus } = useGym()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const categories = allCategories(state)

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exercises.map((exercise) => (
          <Link
            key={exercise.id}
            to={`/biblioteca/editar/${exercise.id}`}
            className="overflow-hidden rounded-3xl border border-line bg-panel"
          >
            <ExerciseArt
              name={exercise.name}
              categories={exercise.categories}
              imageUrl={exercise.imageUrl}
              className="h-36"
            />
            <div className="p-4">
              <h2 className="text-lg font-semibold leading-tight">{exercise.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {exercise.categories.length === 0 ? <span className="text-xs text-mist">Sem categoria</span> : null}
                {exercise.categories.map((category) => (
                  <span key={category} className="rounded-full bg-raised px-2 py-0.5 text-xs text-mist">
                    {category}
                  </span>
                ))}
              </div>
              {exercise.source === 'user' ? (
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-accent">Seu exercício</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
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
