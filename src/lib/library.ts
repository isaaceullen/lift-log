import type { AppState, Exercise, Workout } from '../types'
import { fold } from './text'

export function findExerciseByName(
  exercises: Exercise[],
  name: string,
  exceptId?: string,
): Exercise | undefined {
  const key = fold(name)
  if (!key) return undefined
  return exercises.find(
    (exercise) => !exercise.removed && exercise.id !== exceptId && fold(exercise.name) === key,
  )
}

/** Categorias que existem no seed visível ou que a pessoa criou. Nada além disso. */
export function allCategories(state: Pick<AppState, 'customCategories' | 'exercises'>): string[] {
  const names = new Set<string>()
  for (const category of state.customCategories) names.add(category)
  for (const exercise of state.exercises) {
    if (exercise.removed) continue
    for (const category of exercise.categories) names.add(category)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function seedCategoryNames(exercises: Exercise[]): string[] {
  const names = new Set<string>()
  for (const exercise of exercises) {
    if (exercise.source !== 'seed' || exercise.removed) continue
    for (const category of exercise.categories) names.add(category)
  }
  return [...names]
}

export function removableCategoryNames(state: Pick<AppState, 'customCategories' | 'exercises'>): string[] {
  const locked = new Set(seedCategoryNames(state.exercises))
  return allCategories(state).filter(
    (name) =>
      !locked.has(name) &&
      (state.customCategories.includes(name) ||
        state.exercises.some(
          (exercise) => !exercise.removed && exercise.source === 'user' && exercise.categories.includes(name),
        )),
  )
}

export function canonicalCategory(state: Pick<AppState, 'customCategories' | 'exercises'>, name: string): string {
  const trimmed = name.trim()
  const key = fold(trimmed)
  return allCategories(state).find((category) => fold(category) === key) ?? trimmed
}

export function workoutCategoryNames(workout: Workout, exercises: Exercise[]): string[] {
  const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  const names: string[] = []
  const seen = new Set<string>()
  for (const item of workout.exercises) {
    const exercise = catalog.get(item.exerciseId)
    for (const category of exercise?.categories ?? []) {
      if (seen.has(category)) continue
      seen.add(category)
      names.push(category)
    }
  }
  return names
}

export function primaryCategory(categories: string[]): string {
  return categories[0] ?? 'Geral'
}
