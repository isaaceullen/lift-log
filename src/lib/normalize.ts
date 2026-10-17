import { initialState } from './initial'
import { intIn, loadIn } from './number'
import { uniqueLabels } from './text'
import { totalVolume } from './volume'
import {
  isWorkoutId,
  WORKOUT_IDS,
  type ActiveCardio,
  type ActiveExercise,
  type ActiveSession,
  type ActiveSet,
  type AppSettings,
  type AppState,
  type CardioPosition,
  type Exercise,
  type LastUsed,
  type LoggedExercise,
  type Session,
  type SessionCardio,
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
    removed: source === 'seed' && value.removed === true,
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
    days,
    cardioEnabled: typeof value.cardioEnabled === 'boolean' ? value.cardioEnabled : true,
    cardioPosition: value.cardioPosition === 'start' ? 'start' : 'end',
    exercises,
  }
}

function orderWorkoutIds(ids: WorkoutId[]): WorkoutId[] {
  return WORKOUT_IDS.filter((id) => ids.includes(id))
}

function readWorkoutIds(value: unknown, legacy: unknown): WorkoutId[] {
  const fromList = Array.isArray(value) ? value.filter(isWorkoutId) : []
  if (fromList.length > 0) return orderWorkoutIds(fromList)
  return isWorkoutId(legacy) ? [legacy] : []
}

function sanitizeLogged(value: unknown, fallbackWorkoutId: WorkoutId): LoggedExercise | null {
  if (!isRecord(value) || typeof value.exerciseId !== 'string' || typeof value.name !== 'string') return null
  const totalSets = intIn(typeof value.totalSets === 'number' ? value.totalSets : 1, 1, 30, 1)
  return {
    instanceId: typeof value.instanceId === 'string' ? value.instanceId : value.exerciseId,
    workoutId: isWorkoutId(value.workoutId) ? value.workoutId : fallbackWorkoutId,
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

function sanitizeCardios(value: unknown, workoutIds: WorkoutId[], legacy: SessionCardio[] | null): SessionCardio[] {
  const allowed = new Set(workoutIds)
  if (Array.isArray(value)) {
    const cardios: SessionCardio[] = []
    const seen = new Set<WorkoutId>()
    for (const item of value) {
      if (!isRecord(item) || !isWorkoutId(item.workoutId) || !allowed.has(item.workoutId) || seen.has(item.workoutId)) continue
      seen.add(item.workoutId)
      cardios.push({ workoutId: item.workoutId, completed: Boolean(item.completed) })
    }
    return cardios
  }
  return (legacy ?? []).filter((item) => allowed.has(item.workoutId))
}

function sanitizeSession(value: unknown): Session | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  if (typeof value.startedAt !== 'string' || typeof value.finishedAt !== 'string') return null
  const listed = readWorkoutIds(value.workoutIds, value.workoutId)
  if (listed.length === 0) return null
  const fallback = listed[0]
  const exercises = Array.isArray(value.exercises)
    ? value.exercises.flatMap((item) => {
        const exercise = sanitizeLogged(item, fallback)
        return exercise ? [exercise] : []
      })
    : []
  const workoutIds = orderWorkoutIds([...listed, ...exercises.map((exercise) => exercise.workoutId)])
  const legacyCardio =
    value.cardioEnabled === false
      ? []
      : typeof value.cardioCompleted === 'boolean' || value.cardioEnabled === true
        ? [{ workoutId: workoutIds[0], completed: Boolean(value.cardioCompleted) }]
        : null
  return {
    id: value.id,
    workoutIds,
    startedAt: value.startedAt,
    finishedAt: value.finishedAt,
    durationSeconds: intIn(typeof value.durationSeconds === 'number' ? value.durationSeconds : 0, 0, 60 * 60 * 12, 0),
    notes: typeof value.notes === 'string' ? value.notes.trim().slice(0, 1000) : '',
    cardios: sanitizeCardios(value.cardios, workoutIds, legacyCardio),
    exercises,
    totalVolume: totalVolume(exercises),
  }
}

function cardioPositionOf(value: unknown): CardioPosition {
  return value === 'start' ? 'start' : 'end'
}

function sanitizeActive(value: unknown): ActiveSession | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.startedAt !== 'string') return null
  if (!Array.isArray(value.exercises)) return null
  const listed = readWorkoutIds(value.workoutIds, value.workoutId)
  if (listed.length === 0) return null
  const fallback = listed[0]
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
      workoutId: isWorkoutId(item.workoutId) ? item.workoutId : fallback,
      exerciseId: item.exerciseId,
      load: loadIn(typeof item.load === 'number' ? item.load : 0),
      reps: intIn(typeof item.reps === 'number' ? item.reps : 10, 1, 200, 10),
      sets,
    })
  }
  const workoutIds = orderWorkoutIds([...listed, ...exercises.map((exercise) => exercise.workoutId)])
  const cardios: ActiveCardio[] = []
  const seen = new Set<WorkoutId>()
  if (Array.isArray(value.cardios)) {
    for (const item of value.cardios) {
      if (!isRecord(item) || !isWorkoutId(item.workoutId) || !workoutIds.includes(item.workoutId) || seen.has(item.workoutId)) {
        continue
      }
      seen.add(item.workoutId)
      cardios.push({
        workoutId: item.workoutId,
        position: cardioPositionOf(item.position),
        completed: Boolean(item.completed),
      })
    }
  } else if (typeof value.cardioCompleted === 'boolean' && workoutIds[0]) {
    cardios.push({ workoutId: workoutIds[0], position: 'end', completed: value.cardioCompleted })
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
    workoutIds,
    startedAt: value.startedAt,
    restSeconds: intIn(typeof value.restSeconds === 'number' ? value.restSeconds : 60, 5, 600, 60),
    cardios,
    exercises,
    lastUsedSnapshot,
    pausedMs: typeof value.pausedMs === 'number' && Number.isFinite(value.pausedMs) ? Math.max(0, value.pausedMs) : 0,
    reviewOpenedAt: typeof value.reviewOpenedAt === 'string' ? value.reviewOpenedAt : null,
  }
}

function legacyRestSeconds(workouts: unknown): number | null {
  if (!isRecord(workouts)) return null
  for (const id of WORKOUT_IDS) {
    const workout = workouts[id]
    if (isRecord(workout) && typeof workout.restSeconds === 'number') return workout.restSeconds
  }
  return null
}

function sanitizeSettings(value: unknown, workouts: unknown): AppSettings {
  const record = isRecord(value) ? value : {}
  const theme: ThemeId = record.theme === 'noite' ? 'noite' : 'brasa'
  const restSource = typeof record.restSeconds === 'number' ? record.restSeconds : (legacyRestSeconds(workouts) ?? 60)
  return {
    theme,
    soundEnabled: typeof record.soundEnabled === 'boolean' ? record.soundEnabled : true,
    timerEnabled: typeof record.timerEnabled === 'boolean' ? record.timerEnabled : true,
    restSeconds: intIn(restSource, 5, 600, 60),
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
  let activeSession = sanitizeActive(input.activeSession)
  if (activeSession && isRecord(input.activeSession) && !Array.isArray(input.activeSession.cardios)) {
    activeSession = {
      ...activeSession,
      cardios: activeSession.cardios.filter((cardio) => workouts[cardio.workoutId].cardioEnabled),
    }
  }
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
      activeSession,
      settings: sanitizeSettings(input.settings, input.workouts),
    },
  }
}
