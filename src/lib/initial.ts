import { WORKOUT_IDS, type AppState, type Workout, type WorkoutId } from '../types'

export function createWorkout(id: WorkoutId): Workout {
  return {
    id,
    label: '',
    days: [],
    cardioEnabled: true,
    timerEnabled: true,
    restSeconds: 60,
    exercises: [],
  }
}

export function initialState(): AppState {
  const workouts = {} as Record<WorkoutId, Workout>
  for (const id of WORKOUT_IDS) workouts[id] = createWorkout(id)
  return {
    version: 1,
    exercises: [],
    customCategories: [],
    deletedSeedIds: [],
    workouts,
    sessions: [],
    lastUsed: {},
    activeSession: null,
    settings: {
      theme: 'noite',
      soundEnabled: true,
      installHintDismissed: false,
    },
  }
}
