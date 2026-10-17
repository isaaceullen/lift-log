import type { AppState, Exercise, SeedFile } from '../types'
import { uniqueLabels } from './text'

function catalogExercise(raw: SeedFile['exercises'][number]): Exercise | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  const name = raw.name.trim().slice(0, 80)
  if (!name) return null
  return {
    id: raw.id,
    name,
    categories: uniqueLabels(Array.isArray(raw.categories) ? raw.categories : []),
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl.trim().slice(0, 800) : '',
    source: 'seed',
    removed: false,
  }
}

function sameCatalog(current: Exercise, next: Exercise): boolean {
  return (
    current.name === next.name &&
    current.imageUrl === next.imageUrl &&
    current.source === next.source &&
    Boolean(current.removed) === Boolean(next.removed) &&
    current.categories.length === next.categories.length &&
    current.categories.every((category, index) => category === next.categories[index])
  )
}

/**
 * O seed é a fonte oficial, identificada pelo id.
 * Nome, categorias e imagem de um id existente são atualizados.
 * Um id que saiu do arquivo some da biblioteca, mas o registro fica
 * para treinos, cargas e sessões já gravados continuarem apontando para ele.
 * Sessões e lastUsed não são reescritos.
 */
export function mergeSeed(state: AppState, seed: SeedFile): AppState {
  if (!seed || !Array.isArray(seed.exercises)) return state
  const incoming = new Map<string, Exercise>()
  for (const raw of seed.exercises) {
    const exercise = catalogExercise(raw)
    if (!exercise || incoming.has(exercise.id)) continue
    incoming.set(exercise.id, exercise)
  }
  if (incoming.size === 0) return state

  let changed = false
  const seen = new Set<string>()
  const exercises: Exercise[] = state.exercises.map((exercise) => {
    const next = incoming.get(exercise.id)
    if (next) {
      seen.add(exercise.id)
      if (sameCatalog(exercise, next)) return exercise
      changed = true
      return { ...exercise, ...next }
    }
    if (exercise.source === 'seed' && !exercise.removed) {
      changed = true
      return { ...exercise, removed: true }
    }
    return exercise
  })

  for (const [id, exercise] of incoming) {
    if (seen.has(id)) continue
    changed = true
    exercises.push(exercise)
  }

  if (!changed) return state
  return { ...state, exercises }
}
