import type { AppState, Exercise, Workout } from '../types'
import { fold } from './text'

const PREFERRED = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Pernas',
  'Glúteos',
  'Panturrilha',
  'Abdômen',
  'Corpo inteiro',
  'Composto',
  'Isolado',
]

export function allCategories(state: Pick<AppState, 'customCategories' | 'exercises'>): string[] {
  const names = new Set<string>(state.customCategories)
  for (const exercise of state.exercises) {
    for (const category of exercise.categories) names.add(category)
  }
  const preferred = PREFERRED.filter((name) => names.has(name))
  const rest = [...names]
    .filter((name) => !PREFERRED.includes(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return [...preferred, ...rest]
}

export function canonicalCategory(state: Pick<AppState, 'customCategories' | 'exercises'>, name: string): string {
  const trimmed = name.trim()
  const key = fold(trimmed)
  return allCategories(state).find((category) => fold(category) === key) ?? trimmed
}

export function findExerciseByName(
  exercises: Exercise[],
  name: string,
  exceptId?: string,
): Exercise | undefined {
  const key = fold(name)
  if (!key) return undefined
  return exercises.find((exercise) => exercise.id !== exceptId && fold(exercise.name) === key)
}

export function workoutCategoryNames(workout: Workout, exercises: Exercise[]): string[] {
  const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const names: string[] = []
  const seen = new Set<string>()
  for (const item of workout.exercises) {
    const exercise = catalog.get(item.exerciseId)
    for (const category of exercise?.categories ?? []) {
      if (category === 'Composto' || category === 'Isolado') continue
      if (seen.has(category)) continue
      seen.add(category)
      names.push(category)
    }
  }
  return names
}

export function primaryCategory(categories: string[]): string {
  return categories.find((category) => category !== 'Composto' && category !== 'Isolado') ?? categories[0] ?? 'Geral'
}
