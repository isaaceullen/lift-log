import type { AppState, Exercise, SeedFile } from '../types'
import { fold, uniqueLabels } from './text'

export function mergeSeed(state: AppState, seed: SeedFile): AppState {
  if (!seed || !Array.isArray(seed.exercises)) return state
  const names = new Set(state.exercises.map((exercise) => fold(exercise.name)))
  const ids = new Set(state.exercises.map((exercise) => exercise.id))
  const deleted = new Set(state.deletedSeedIds)
  const additions: Exercise[] = []

  for (const raw of seed.exercises) {
    if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') continue
    const name = raw.name.trim()
    if (!name) continue
    if (deleted.has(raw.id)) continue
    if (ids.has(raw.id) || names.has(fold(name))) continue
    additions.push({
      id: raw.id,
      name: name.slice(0, 80),
      categories: uniqueLabels(Array.isArray(raw.categories) ? raw.categories : []),
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl.trim().slice(0, 800) : '',
      source: 'seed',
    })
    ids.add(raw.id)
    names.add(fold(name))
  }

  if (additions.length === 0) return state
  return { ...state, exercises: [...state.exercises, ...additions] }
}
