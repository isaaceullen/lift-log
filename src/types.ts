export const WORKOUT_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export type WorkoutId = (typeof WORKOUT_IDS)[number]

export type ThemeId = 'noite' | 'brasa'

export type Exercise = {
  id: string
  name: string
  categories: string[]
  imageUrl: string
  source: 'seed' | 'user'
}

export type WorkoutExercise = {
  id: string
  exerciseId: string
  load: number
  sets: number
  reps: number
  description: string
  notes: string
}

export type Workout = {
  id: WorkoutId
  label: string
  days: number[]
  cardioEnabled: boolean
  timerEnabled: boolean
  restSeconds: number
  exercises: WorkoutExercise[]
}

export type LoggedExercise = {
  instanceId: string
  exerciseId: string
  name: string
  categories: string[]
  imageUrl: string
  description: string
  notes: string
  load: number
  reps: number
  completedSets: number
  totalSets: number
}

export type Session = {
  id: string
  workoutId: WorkoutId
  workoutLabel: string
  startedAt: string
  finishedAt: string
  durationSeconds: number
  notes: string
  cardioEnabled: boolean
  cardioCompleted: boolean
  exercises: LoggedExercise[]
  totalVolume: number
}

export type ActiveSet = {
  id: string
  completed: boolean
  persistent: boolean
}

export type ActiveExercise = {
  instanceId: string
  exerciseId: string
  load: number
  reps: number
  sets: ActiveSet[]
}

export type LastUsed = {
  load: number
  reps: number
}

export type ActiveSession = {
  id: string
  workoutId: WorkoutId
  startedAt: string
  restSeconds: number
  cardioCompleted: boolean
  exercises: ActiveExercise[]
  lastUsedSnapshot: Record<string, LastUsed | null>
  pausedMs: number
  reviewOpenedAt: string | null
}

export type AppSettings = {
  theme: ThemeId
  soundEnabled: boolean
  installHintDismissed: boolean
}

export type AppState = {
  version: 1
  exercises: Exercise[]
  customCategories: string[]
  deletedSeedIds: string[]
  workouts: Record<WorkoutId, Workout>
  sessions: Session[]
  lastUsed: Record<string, LastUsed>
  activeSession: ActiveSession | null
  settings: AppSettings
}

export type SeedExercise = {
  id: string
  name: string
  categories: string[]
  imageUrl?: string
}

export type SeedFile = {
  exercises: SeedExercise[]
}

export function isWorkoutId(value: unknown): value is WorkoutId {
  return typeof value === 'string' && (WORKOUT_IDS as readonly string[]).includes(value)
}
