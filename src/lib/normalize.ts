import { initialState } from './initial'
import { intIn, loadIn } from './number'
import { uniqueLabels } from './text'
import { totalVolume } from './volume'
import {
  isWorkoutId,
  WORKOUT_IDS,
  type ActiveExercise,
  type ActiveSession,
  type ActiveSet,
  type AppSettings,
  type AppState,
  type Exercise,
  type LastUsed,
  type LoggedExercise,
  type Session,
  type ThemeId,
  type Workout,
  type WorkoutExercise,
  type WorkoutId,
} from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringArray(value: unknown, limit = 12): string[] {
  if (!Array.isArray(value)) return []
  return uniqueLabels(
    value.filter((item): item is string => typeof item === 'string'),
    limit,
  )
}

function sanitizeExercise(value: unknown): Exercise | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null
  const name = value.name.trim()
  if (!name) return null
  const source = value.source === 'seed' || value.id.startsWith('seed-') ? 'seed' : 'user'
  return {
    id: value.id,
    name: name.slice(0, 80),
    categories: stringArray(value.categories),
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl.trim().slice(0, 800) : '',
    source,
  }
}

function sanitizeWorkoutExercise(value: unknown): WorkoutExercise | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.exerciseId !== 'string') return null
  return {
    id: value.id,
    exerciseId: value.exerciseId,
    load: loadIn(typeof value.load === 'number' ? value.load : 0),
    sets: intIn(typeof value.sets === 'number' ? value.sets : 3, 1, 30, 3),
    reps: intIn(typeof value.reps === 'number' ? value.reps : 10, 1, 200, 10),
    description: typeof value.description === 'string' ? value.description.trim().slice(0, 600) : '',
    notes: typeof value.notes === 'string' ? value.notes.trim().slice(0, 600) : '',
  }
}

function sanitizeWorkout(id: WorkoutId, value: unknown, fallback: Workout): Workout {
  if (!isRecord(value)) return fallback
  const exercises: WorkoutExercise[] = []
  const seen = new Set<string>()
  if (Array.isArray(value.exercises)) {
    for (const item of value.exercises) {
      const exercise = sanitizeWorkoutExercise(item)
      if (!exercise || seen.has(exercise.id)) continue
      seen.add(exercise.id)
      exercises.push(exercise)
    }
  }
  const days = Array.isArray(value.days)
    ? [...new Set(value.days.filter((day): day is number => typeof day === 'number' && day >= 0 && day <= 6 && Number.isInteger(day)))]
    : []
  return {
    id,
    label: typeof value.label === 'string' ? value.label.trim().slice(0, 40) : '',
    days,
    cardioEnabled: typeof value.cardioEnabled === 'boolean' ? value.cardioEnabled : true,
    timerEnabled: typeof value.timerEnabled === 'boolean' ? value.timerEnabled : true,
    restSeconds: intIn(typeof value.restSeconds === 'number' ? value.restSeconds : 60, 5, 600, 60),
    exercises,
  }
}

function sanitizeLogged(value: unknown): LoggedExercise | null {
  if (!isRecord(value) || typeof value.exerciseId !== 'string' || typeof value.name !== 'string') return null
  const totalSets = intIn(typeof value.totalSets === 'number' ? value.totalSets : 1, 1, 30, 1)
  return {
    instanceId: typeof value.instanceId === 'string' ? value.instanceId : value.exerciseId,
    exerciseId: value.exerciseId,
    name: value.name.trim().slice(0, 80) || 'Exercício',
    categories: stringArray(value.categories),
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : '',
    description: typeof value.description === 'string' ? value.description.slice(0, 600) : '',
    notes: typeof value.notes === 'string' ? value.notes.slice(0, 600) : '',
    load: loadIn(typeof value.load === 'number' ? value.load : 0),
    reps: intIn(typeof value.reps === 'number' ? value.reps : 1, 1, 200, 1),
    totalSets,
    completedSets: intIn(typeof value.completedSets === 'number' ? value.completedSets : 0, 0, totalSets, 0),
  }
}

function sanitizeSession(value: unknown): Session | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !isWorkoutId(value.workoutId)) return null
  if (typeof value.startedAt !== 'string' || typeof value.finishedAt !== 'string') return null
  const exercises = Array.isArray(value.exercises)
    ? value.exercises.flatMap((item) => {
        const exercise = sanitizeLogged(item)
        return exercise ? [exercise] : []
      })
    : []
  const cardioEnabled = value.cardioEnabled !== false
  return {
    id: value.id,
    workoutId: value.workoutId,
    workoutLabel: typeof value.workoutLabel === 'string' ? value.workoutLabel.slice(0, 40) : '',
    startedAt: value.startedAt,
    finishedAt: value.finishedAt,
    durationSeconds: intIn(typeof value.durationSeconds === 'number' ? value.durationSeconds : 0, 0, 60 * 60 * 12, 0),
    notes: typeof value.notes === 'string' ? value.notes.trim().slice(0, 1000) : '',
    cardioEnabled,
    cardioCompleted: cardioEnabled ? Boolean(value.cardioCompleted) : false,
    exercises,
    totalVolume: totalVolume(exercises),
  }
}

function sanitizeActive(value: unknown): ActiveSession | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.startedAt !== 'string') return null
  if (!isWorkoutId(value.workoutId) || !Array.isArray(value.exercises)) return null
  const exercises: ActiveExercise[] = []
  for (const item of value.exercises) {
    if (!isRecord(item) || typeof item.instanceId !== 'string' || typeof item.exerciseId !== 'string') continue
    const sets: ActiveSet[] = []
    if (Array.isArray(item.sets)) {
      for (const set of item.sets) {
        if (!isRecord(set) || typeof set.id !== 'string') continue
        sets.push({
          id: set.id,
          completed: Boolean(set.completed),
          persistent: set.persistent !== false,
        })
      }
    }
    if (sets.length === 0) {
      sets.push({ id: `${item.instanceId}-set`, completed: false, persistent: true })
    }
    exercises.push({
      instanceId: item.instanceId,
      exerciseId: item.exerciseId,
      load: loadIn(typeof item.load === 'number' ? item.load : 0),
      reps: intIn(typeof item.reps === 'number' ? item.reps : 10, 1, 200, 10),
      sets,
    })
  }
  const lastUsedSnapshot: Record<string, LastUsed | null> = {}
  if (isRecord(value.lastUsedSnapshot)) {
    for (const [key, entry] of Object.entries(value.lastUsedSnapshot)) {
      if (entry === null) lastUsedSnapshot[key] = null
      else if (isRecord(entry) && typeof entry.load === 'number' && typeof entry.reps === 'number') {
        lastUsedSnapshot[key] = {
          load: loadIn(entry.load),
          reps: intIn(entry.reps, 1, 200, 1),
        }
      }
    }
  }
  return {
    id: value.id,
    workoutId: value.workoutId,
    startedAt: value.startedAt,
    restSeconds: intIn(typeof value.restSeconds === 'number' ? value.restSeconds : 60, 5, 600, 60),
    cardioCompleted: Boolean(value.cardioCompleted),
    exercises,
    lastUsedSnapshot,
    pausedMs: typeof value.pausedMs === 'number' && Number.isFinite(value.pausedMs) ? Math.max(0, value.pausedMs) : 0,
    reviewOpenedAt: typeof value.reviewOpenedAt === 'string' ? value.reviewOpenedAt : null,
  }
}

function sanitizeSettings(value: unknown): AppSettings {
  const theme: ThemeId = isRecord(value) && value.theme === 'brasa' ? 'brasa' : 'noite'
  return {
    theme,
    soundEnabled: isRecord(value) && typeof value.soundEnabled === 'boolean' ? value.soundEnabled : true,
    installHintDismissed:
      isRecord(value) && typeof value.installHintDismissed === 'boolean' ? value.installHintDismissed : false,
  }
}

export function parseBackup(input: unknown): { ok: true; state: AppState } | { ok: false; error: string } {
  if (!isRecord(input) || !('workouts' in input) || !('exercises' in input)) {
    return { ok: false, error: 'Este arquivo não é um backup da Forja.' }
  }
  if (input.version !== 1) {
    return { ok: false, error: 'A versão deste backup não é compatível.' }
  }
  const base = initialState()
  const exercises: Exercise[] = []
  const names = new Set<string>()
  if (Array.isArray(input.exercises)) {
    for (const item of input.exercises) {
      const exercise = sanitizeExercise(item)
      if (!exercise) continue
      const key = exercise.name.toLocaleLowerCase('pt-BR')
      if (names.has(key)) continue
      names.add(key)
      exercises.push(exercise)
    }
  }
  const workoutSource = isRecord(input.workouts) ? input.workouts : {}
  const workouts = {} as Record<WorkoutId, Workout>
  for (const id of WORKOUT_IDS) workouts[id] = sanitizeWorkout(id, workoutSource[id], base.workouts[id])
  const sessions = Array.isArray(input.sessions)
    ? input.sessions.flatMap((item) => {
        const session = sanitizeSession(item)
        return session ? [session] : []
      })
    : []
  const lastUsed: Record<string, LastUsed> = {}
  if (isRecord(input.lastUsed)) {
    for (const [key, entry] of Object.entries(input.lastUsed)) {
      if (!isRecord(entry) || typeof entry.load !== 'number' || typeof entry.reps !== 'number') continue
      lastUsed[key] = { load: loadIn(entry.load), reps: intIn(entry.reps, 1, 200, 1) }
    }
  }
  return {
    ok: true,
    state: {
      version: 1,
      exercises,
      customCategories: stringArray(input.customCategories, 40),
      deletedSeedIds: stringArray(input.deletedSeedIds, 400),
      workouts,
      sessions,
      lastUsed,
      activeSession: sanitizeActive(input.activeSession),
      settings: sanitizeSettings(input.settings),
    },
  }
}
