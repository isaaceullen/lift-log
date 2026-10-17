import { findExerciseByName, canonicalCategory, seedCategoryNames } from '../lib/categories'
import { initialState } from '../lib/initial'
import { createId } from '../lib/id'
import { intIn, loadIn } from '../lib/number'
import { reorderByIds } from '../lib/reorder'
import { mergeSeed } from '../lib/seed'
import { sessionElapsedMs } from '../lib/dates'
import { uniqueLabels } from '../lib/text'
import { totalVolume } from '../lib/volume'
import {
  WORKOUT_IDS,
  type ActiveExercise,
  type ActiveSession,
  type ActiveSet,
  type AppSettings,
  type AppState,
  type Exercise,
  type LastUsed,
  type LoggedExercise,
  type SeedFile,
  type Session,
  type Workout,
  type WorkoutExercise,
  type WorkoutId,
} from '../types'

export type Action =
  | { type: 'MERGE_SEED'; seed: SeedFile }
  | { type: 'ADD_EXERCISE'; exercise: Exercise }
  | { type: 'UPDATE_EXERCISE'; id: string; patch: Pick<Exercise, 'name' | 'categories' | 'imageUrl'> }
  | { type: 'DELETE_EXERCISE'; id: string }
  | { type: 'ADD_CATEGORY'; name: string }
  | { type: 'REMOVE_CATEGORY'; name: string }
  | {
      type: 'UPDATE_WORKOUT'
      id: WorkoutId
      patch: Partial<Pick<Workout, 'days' | 'cardioEnabled' | 'cardioPosition'>>
    }
  | { type: 'REPLACE_WORKOUT'; workout: Workout }
  | { type: 'ADD_TO_WORKOUT'; workoutId: WorkoutId; item: WorkoutExercise }
  | {
      type: 'UPDATE_WORKOUT_EXERCISE'
      workoutId: WorkoutId
      instanceId: string
      patch: Partial<Pick<WorkoutExercise, 'load' | 'sets' | 'reps' | 'description' | 'notes'>>
    }
  | { type: 'REMOVE_WORKOUT_EXERCISE'; workoutId: WorkoutId; instanceId: string }
  | { type: 'REORDER_WORKOUT'; workoutId: WorkoutId; orderedIds: string[] }
  | {
      type: 'START_SESSION'
      workoutIds: WorkoutId[]
      sessionId: string
      startedAt: string
      setIds: Record<string, string[]>
    }
  | { type: 'SET_ACTIVE_LOAD'; instanceId: string; load: number }
  | { type: 'SET_ACTIVE_REPS'; instanceId: string; reps: number }
  | { type: 'TOGGLE_SET'; instanceId: string; setId: string; completed: boolean }
  | { type: 'ADD_SET'; instanceId: string; set: ActiveSet; permanent: boolean }
  | { type: 'REMOVE_SET'; instanceId: string; setId: string; permanent: boolean }
  | { type: 'REORDER_SESSION'; workoutId: WorkoutId; orderedIds: string[] }
  | { type: 'SET_CARDIO'; workoutId: WorkoutId; completed: boolean }
  | { type: 'SET_REST_SECONDS'; seconds: number }
  | { type: 'OPEN_REVIEW'; at: string }
  | { type: 'CLOSE_REVIEW'; at: string }
  | { type: 'ABANDON_SESSION' }
  | { type: 'CONFIRM_SESSION'; notes: string; finishedAt: string }
  | { type: 'UPDATE_SESSION'; session: Session }
  | { type: 'DELETE_SESSION'; id: string }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<AppSettings> }
  | { type: 'REPLACE_STATE'; state: AppState }
  | { type: 'CLEAR' }

function withWorkout(state: AppState, id: WorkoutId, update: (workout: Workout) => Workout): AppState {
  return {
    ...state,
    workouts: { ...state.workouts, [id]: update(state.workouts[id]) },
  }
}

function patchActive(
  state: AppState,
  update: (session: ActiveSession) => ActiveSession,
): AppState {
  if (!state.activeSession) return state
  const next = update(state.activeSession)
  if (next === state.activeSession) return state
  return { ...state, activeSession: next }
}

function rememberLoad(state: AppState, exerciseId: string, load: number, reps: number): AppState {
  return {
    ...state,
    lastUsed: { ...state.lastUsed, [exerciseId]: { load, reps } },
  }
}

function restoreLastUsed(state: AppState, snapshot: Record<string, LastUsed | null>): Record<string, LastUsed> {
  const lastUsed = { ...state.lastUsed }
  for (const [id, value] of Object.entries(snapshot)) {
    if (value) lastUsed[id] = value
    else delete lastUsed[id]
  }
  return lastUsed
}

function sessionIncludes(session: ActiveSession | null, workoutId: WorkoutId): boolean {
  return Boolean(session?.workoutIds.includes(workoutId))
}

function replaceWorkoutSlice(exercises: ActiveExercise[], workoutId: WorkoutId, nextSlice: ActiveExercise[]): ActiveExercise[] {
  let cursor = 0
  return exercises.map((exercise) => {
    if (exercise.workoutId !== workoutId) return exercise
    const next = nextSlice[cursor]
    cursor += 1
    return next ?? exercise
  })
}

function sanitizeWorkoutDraft(workout: Workout): Workout {
  const seen = new Set<string>()
  const exercises: WorkoutExercise[] = []
  for (const item of workout.exercises) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    exercises.push({
      ...item,
      load: loadIn(item.load),
      sets: intIn(item.sets, 1, 30, 3),
      reps: intIn(item.reps, 1, 200, 10),
      description: item.description.slice(0, 600),
      notes: item.notes.slice(0, 600),
    })
  }
  return {
    id: workout.id,
    days: [...new Set(workout.days.filter((day) => day >= 0 && day <= 6))],
    cardioEnabled: workout.cardioEnabled,
    cardioPosition: workout.cardioPosition === 'start' ? 'start' : 'end',
    exercises,
  }
}

function loggedFromActive(state: AppState, active: ActiveSession): LoggedExercise[] {
  return active.exercises.map((entry) => {
    const template = state.workouts[entry.workoutId].exercises.find((item) => item.id === entry.instanceId)
    const catalog = state.exercises.find((exercise) => exercise.id === entry.exerciseId)
    return {
      instanceId: entry.instanceId,
      workoutId: entry.workoutId,
      exerciseId: entry.exerciseId,
      name: catalog?.name ?? 'Exercício removido',
      categories: catalog?.categories ?? [],
      imageUrl: catalog?.imageUrl ?? '',
      description: template?.description ?? '',
      notes: template?.notes ?? '',
      load: entry.load,
      reps: entry.reps,
      completedSets: entry.sets.filter((set) => set.completed).length,
      totalSets: entry.sets.length,
    }
  })
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'MERGE_SEED':
      return mergeSeed(state, action.seed)
    case 'ADD_EXERCISE': {
      if (findExerciseByName(state.exercises, action.exercise.name)) return state
      return { ...state, exercises: [...state.exercises, action.exercise] }
    }
    case 'UPDATE_EXERCISE': {
      const current = state.exercises.find((exercise) => exercise.id === action.id)
      if (!current || current.source === 'seed') return state
      if (findExerciseByName(state.exercises, action.patch.name, action.id)) return state
      return {
        ...state,
        exercises: state.exercises.map((exercise) =>
          exercise.id === action.id
            ? {
                ...exercise,
                name: action.patch.name.trim().slice(0, 80),
                categories: uniqueLabels(action.patch.categories),
                imageUrl: action.patch.imageUrl.trim().slice(0, 800),
              }
            : exercise,
        ),
      }
    }
    case 'DELETE_EXERCISE': {
      const exercise = state.exercises.find((item) => item.id === action.id)
      if (!exercise || exercise.source === 'seed') return state
      const workouts = { ...state.workouts }
      for (const id of Object.keys(workouts) as WorkoutId[]) {
        workouts[id] = {
          ...workouts[id],
          exercises: workouts[id].exercises.filter((item) => item.exerciseId !== action.id),
        }
      }
      const lastUsed = { ...state.lastUsed }
      delete lastUsed[action.id]
      const active = state.activeSession
        ? {
            ...state.activeSession,
            exercises: state.activeSession.exercises.filter((item) => item.exerciseId !== action.id),
          }
        : null
      return {
        ...state,
        exercises: state.exercises.filter((item) => item.id !== action.id),
        workouts,
        lastUsed,
        activeSession: active,
      }
    }
    case 'ADD_CATEGORY': {
      const name = canonicalCategory(state, action.name).trim()
      if (!name) return state
      if (state.customCategories.some((category) => category.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
        return state
      }
      if (state.exercises.some((exercise) => exercise.categories.includes(name))) return state
      return { ...state, customCategories: [...state.customCategories, name.slice(0, 40)] }
    }
    case 'REMOVE_CATEGORY': {
      const locked = new Set(seedCategoryNames(state.exercises))
      if (locked.has(action.name)) return state
      const used =
        state.customCategories.includes(action.name) ||
        state.exercises.some((exercise) => exercise.source === 'user' && exercise.categories.includes(action.name))
      if (!used) return state
      return {
        ...state,
        customCategories: state.customCategories.filter((category) => category !== action.name),
        exercises: state.exercises.map((exercise) =>
          exercise.source === 'seed'
            ? exercise
            : { ...exercise, categories: exercise.categories.filter((category) => category !== action.name) },
        ),
      }
    }
    case 'UPDATE_WORKOUT':
      return withWorkout(state, action.id, (workout) => ({
        ...workout,
        ...action.patch,
        days: action.patch.days
          ? [...new Set(action.patch.days.filter((day) => day >= 0 && day <= 6))]
          : workout.days,
        cardioPosition:
          action.patch.cardioPosition === 'start' || action.patch.cardioPosition === 'end'
            ? action.patch.cardioPosition
            : workout.cardioPosition,
      }))
    case 'REPLACE_WORKOUT': {
      if (!WORKOUT_IDS.includes(action.workout.id)) return state
      return withWorkout(state, action.workout.id, () => sanitizeWorkoutDraft(action.workout))
    }
    case 'ADD_TO_WORKOUT':
      return withWorkout(state, action.workoutId, (workout) => ({
        ...workout,
        exercises: [...workout.exercises, action.item],
      }))
    case 'UPDATE_WORKOUT_EXERCISE':
      return withWorkout(state, action.workoutId, (workout) => ({
        ...workout,
        exercises: workout.exercises.map((item) =>
          item.id === action.instanceId
            ? {
                ...item,
                ...action.patch,
                load: action.patch.load !== undefined ? loadIn(action.patch.load) : item.load,
                sets: action.patch.sets !== undefined ? intIn(action.patch.sets, 1, 30, item.sets) : item.sets,
                reps: action.patch.reps !== undefined ? intIn(action.patch.reps, 1, 200, item.reps) : item.reps,
                description:
                  action.patch.description !== undefined ? action.patch.description.slice(0, 600) : item.description,
                notes: action.patch.notes !== undefined ? action.patch.notes.slice(0, 600) : item.notes,
              }
            : item,
        ),
      }))
    case 'REMOVE_WORKOUT_EXERCISE': {
      const next = withWorkout(state, action.workoutId, (workout) => ({
        ...workout,
        exercises: workout.exercises.filter((item) => item.id !== action.instanceId),
      }))
      if (!sessionIncludes(next.activeSession, action.workoutId) || !next.activeSession) return next
      return {
        ...next,
        activeSession: {
          ...next.activeSession,
          exercises: next.activeSession.exercises.filter((item) => item.instanceId !== action.instanceId),
        },
      }
    }
    case 'REORDER_WORKOUT': {
      const next = withWorkout(state, action.workoutId, (workout) => ({
        ...workout,
        exercises: reorderByIds(workout.exercises, action.orderedIds, (item) => item.id),
      }))
      if (!sessionIncludes(next.activeSession, action.workoutId) || !next.activeSession) return next
      const slice = reorderByIds(
        next.activeSession.exercises.filter((item) => item.workoutId === action.workoutId),
        action.orderedIds,
        (item) => item.instanceId,
      )
      return {
        ...next,
        activeSession: {
          ...next.activeSession,
          exercises: replaceWorkoutSlice(next.activeSession.exercises, action.workoutId, slice),
        },
      }
    }
    case 'START_SESSION': {
      if (state.activeSession) return state
      const workoutIds = WORKOUT_IDS.filter((id) => action.workoutIds.includes(id))
      if (workoutIds.length === 0) return state
      const exercises: ActiveExercise[] = []
      const snapshot: Record<string, LastUsed | null> = {}
      for (const workoutId of workoutIds) {
        for (const item of state.workouts[workoutId].exercises) {
          const last = state.lastUsed[item.exerciseId]
          const count = Math.max(1, item.sets)
          const ids = action.setIds[item.id] ?? []
          exercises.push({
            instanceId: item.id,
            workoutId,
            exerciseId: item.exerciseId,
            load: last?.load ?? item.load,
            reps: last?.reps ?? item.reps,
            sets: Array.from({ length: count }, (_, index) => ({
              id: ids[index] ?? createId(),
              completed: false,
              persistent: true,
            })),
          })
          if (!(item.exerciseId in snapshot)) snapshot[item.exerciseId] = state.lastUsed[item.exerciseId] ?? null
        }
      }
      let next = state
      for (const exercise of exercises) {
        next = rememberLoad(next, exercise.exerciseId, exercise.load, exercise.reps)
      }
      return {
        ...next,
        activeSession: {
          id: action.sessionId,
          workoutIds,
          startedAt: action.startedAt,
          restSeconds: state.settings.restSeconds,
          cardios: workoutIds
            .filter((id) => state.workouts[id].cardioEnabled)
            .map((id) => ({
              workoutId: id,
              position: state.workouts[id].cardioPosition,
              completed: false,
            })),
          exercises,
          lastUsedSnapshot: snapshot,
          pausedMs: 0,
          reviewOpenedAt: null,
        },
      }
    }
    case 'SET_ACTIVE_LOAD':
    case 'SET_ACTIVE_REPS': {
      if (!state.activeSession) return state
      let exerciseId = ''
      let load = 0
      let reps = 0
      const exercises = state.activeSession.exercises.map((exercise) => {
        if (exercise.instanceId !== action.instanceId) return exercise
        const updated = {
          ...exercise,
          load: action.type === 'SET_ACTIVE_LOAD' ? loadIn(action.load) : exercise.load,
          reps: action.type === 'SET_ACTIVE_REPS' ? intIn(action.reps, 1, 200, exercise.reps) : exercise.reps,
        }
        exerciseId = updated.exerciseId
        load = updated.load
        reps = updated.reps
        return updated
      })
      if (!exerciseId) return state
      return rememberLoad(
        { ...state, activeSession: { ...state.activeSession, exercises } },
        exerciseId,
        load,
        reps,
      )
    }
    case 'TOGGLE_SET':
      return patchActive(state, (session) => ({
        ...session,
        exercises: session.exercises.map((exercise) => {
          if (exercise.instanceId !== action.instanceId) return exercise
          const index = exercise.sets.findIndex((set) => set.id === action.setId)
          if (index < 0) return exercise
          const isLast = index === exercise.sets.length - 1
          if (action.completed && isLast) {
            return { ...exercise, sets: exercise.sets.map((set) => ({ ...set, completed: true })) }
          }
          return {
            ...exercise,
            sets: exercise.sets.map((set) => (set.id === action.setId ? { ...set, completed: action.completed } : set)),
          }
        }),
      }))
    case 'ADD_SET': {
      if (!state.activeSession) return state
      const exercises = state.activeSession.exercises.map((exercise) =>
        exercise.instanceId === action.instanceId ? { ...exercise, sets: [...exercise.sets, action.set] } : exercise,
      )
      const target = exercises.find((exercise) => exercise.instanceId === action.instanceId)
      let next = patchActive(state, (session) => ({ ...session, exercises }))
      if (action.permanent && target) {
        next = withWorkout(next, target.workoutId, (workout) => ({
          ...workout,
          exercises: workout.exercises.map((item) =>
            item.id === action.instanceId ? { ...item, sets: target.sets.length } : item,
          ),
        }))
      }
      return next
    }
    case 'REMOVE_SET': {
      if (!state.activeSession) return state
      const current = state.activeSession.exercises.find((exercise) => exercise.instanceId === action.instanceId)
      if (!current || current.sets.length <= 1) return state
      const exercises = state.activeSession.exercises.map((exercise) =>
        exercise.instanceId === action.instanceId
          ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== action.setId) }
          : exercise,
      )
      const target = exercises.find((exercise) => exercise.instanceId === action.instanceId)
      let next = patchActive(state, (session) => ({ ...session, exercises }))
      if (action.permanent && target) {
        next = withWorkout(next, target.workoutId, (workout) => ({
          ...workout,
          exercises: workout.exercises.map((item) =>
            item.id === action.instanceId ? { ...item, sets: Math.max(1, target.sets.length) } : item,
          ),
        }))
      }
      return next
    }
    case 'REORDER_SESSION': {
      if (!state.activeSession || !state.activeSession.workoutIds.includes(action.workoutId)) return state
      const slice = reorderByIds(
        state.activeSession.exercises.filter((item) => item.workoutId === action.workoutId),
        action.orderedIds,
        (item) => item.instanceId,
      )
      return {
        ...withWorkout(state, action.workoutId, (workout) => ({
          ...workout,
          exercises: reorderByIds(workout.exercises, action.orderedIds, (item) => item.id),
        })),
        activeSession: {
          ...state.activeSession,
          exercises: replaceWorkoutSlice(state.activeSession.exercises, action.workoutId, slice),
        },
      }
    }
    case 'SET_CARDIO':
      return patchActive(state, (session) => ({
        ...session,
        cardios: session.cardios.map((cardio) =>
          cardio.workoutId === action.workoutId ? { ...cardio, completed: action.completed } : cardio,
        ),
      }))
    case 'SET_REST_SECONDS':
      return patchActive(state, (session) => ({
        ...session,
        restSeconds: intIn(action.seconds, 5, 600, session.restSeconds),
      }))
    case 'OPEN_REVIEW':
      return patchActive(state, (session) =>
        session.reviewOpenedAt ? session : { ...session, reviewOpenedAt: action.at },
      )
    case 'CLOSE_REVIEW':
      return patchActive(state, (session) => {
        if (!session.reviewOpenedAt) return session
        const extra = Math.max(0, new Date(action.at).getTime() - new Date(session.reviewOpenedAt).getTime())
        return { ...session, pausedMs: session.pausedMs + extra, reviewOpenedAt: null }
      })
    case 'ABANDON_SESSION': {
      if (!state.activeSession) return state
      return {
        ...state,
        lastUsed: restoreLastUsed(state, state.activeSession.lastUsedSnapshot),
        activeSession: null,
      }
    }
    case 'CONFIRM_SESSION': {
      const active = state.activeSession
      if (!active) return state
      const exercises = loggedFromActive(state, active)
      const finishedAt = active.reviewOpenedAt ?? action.finishedAt
      const durationSeconds = Math.round(
        sessionElapsedMs({ ...active, reviewOpenedAt: finishedAt }, new Date(finishedAt).getTime()) / 1000,
      )
      const session: Session = {
        id: active.id,
        workoutIds: active.workoutIds,
        startedAt: active.startedAt,
        finishedAt,
        durationSeconds,
        notes: action.notes.trim().slice(0, 1000),
        cardios: active.cardios.map((cardio) => ({ workoutId: cardio.workoutId, completed: cardio.completed })),
        exercises,
        totalVolume: totalVolume(exercises),
      }
      return { ...state, sessions: [session, ...state.sessions], activeSession: null }
    }
    case 'UPDATE_SESSION': {
      return {
        ...state,
        sessions: state.sessions.map((session) => {
          if (session.id !== action.session.id) return session
          const exercises = action.session.exercises.map((exercise) => {
            const totalSets = intIn(exercise.totalSets, 1, 30, exercise.totalSets)
            return {
              ...exercise,
              load: loadIn(exercise.load),
              reps: intIn(exercise.reps, 1, 200, exercise.reps),
              totalSets,
              completedSets: intIn(exercise.completedSets, 0, totalSets, 0),
            }
          })
          return {
            ...session,
            notes: action.session.notes.trim().slice(0, 1000),
            cardios: session.cardios.map((cardio) => {
              const incoming = action.session.cardios.find((item) => item.workoutId === cardio.workoutId)
              return incoming ? { ...cardio, completed: incoming.completed } : cardio
            }),
            exercises,
            totalVolume: totalVolume(exercises),
          }
        }),
      }
    }
    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter((session) => session.id !== action.id) }
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.patch,
          restSeconds:
            action.patch.restSeconds !== undefined
              ? intIn(action.patch.restSeconds, 5, 600, state.settings.restSeconds)
              : state.settings.restSeconds,
        },
      }
    case 'REPLACE_STATE':
      return action.state
    case 'CLEAR':
      return initialState()
    default: {
      const unexpected: never = action
      void unexpected
      return state
    }
  }
}
