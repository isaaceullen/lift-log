import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { findExerciseByName } from '../lib/library'
import { createId } from '../lib/id'
import { mergeSeed } from '../lib/seed'
import { loadState, saveState } from '../storage/db'
import { parseBackup } from '../lib/normalize'
import { reducer, type Action } from './reducer'
import { WORKOUT_IDS, type AppSettings, type AppState, type SeedFile, type Session, type Workout, type WorkoutExercise, type WorkoutId } from '../types'

type Toast = { id: string; text: string }

type ExerciseInput = {
  name: string
  categories: string[]
  imageUrl: string
}

type GymApi = {
  state: AppState
  seedStatus: 'loading' | 'ready' | 'error'
  toasts: Toast[]
  toast: (text: string) => void
  dismissToast: (id: string) => void
  addExercise: (input: ExerciseInput) => string | null
  updateExercise: (id: string, input: ExerciseInput) => boolean
  deleteExercise: (id: string) => void
  addCategory: (name: string) => void
  removeCategory: (name: string) => void
  updateWorkout: (id: WorkoutId, patch: Partial<Pick<Workout, 'days' | 'cardioEnabled' | 'cardioPosition'>>) => void
  replaceWorkout: (workout: Workout) => void
  addToWorkout: (workoutId: WorkoutId, exerciseId: string) => void
  updateWorkoutExercise: (
    workoutId: WorkoutId,
    instanceId: string,
    patch: Partial<Pick<WorkoutExercise, 'load' | 'sets' | 'reps' | 'description' | 'notes'>>,
  ) => void
  removeWorkoutExercise: (workoutId: WorkoutId, instanceId: string) => void
  reorderWorkout: (workoutId: WorkoutId, orderedIds: string[]) => void
  startSession: (workoutIds: WorkoutId[]) => void
  setActiveLoad: (instanceId: string, load: number) => void
  setActiveReps: (instanceId: string, reps: number) => void
  toggleSet: (instanceId: string, setId: string, completed: boolean) => void
  addSet: (instanceId: string, permanent: boolean) => void
  removeSet: (instanceId: string, setId: string, permanent: boolean) => void
  reorderSession: (workoutId: WorkoutId, orderedIds: string[]) => void
  setCardio: (workoutId: WorkoutId, completed: boolean) => void
  setRestSeconds: (seconds: number) => void
  openReview: () => void
  closeReview: () => void
  abandonSession: () => void
  confirmSession: (notes: string) => string | null
  updateSession: (session: Session) => void
  deleteSession: (id: string) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  importBackup: (raw: string) => string | null
  clearAll: () => void
}

const GymContext = createContext<GymApi | null>(null)

export function GymProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())
  const [seedStatus, setSeedStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [toasts, setToasts] = useState<Toast[]>([])
  const stateRef = useRef(state)
  const seedRef = useRef<SeedFile | null>(null)
  stateRef.current = state

  const dispatch = useCallback((action: Action) => {
    setState((current) => {
      const next = reducer(current, action)
      if ((action.type === 'CLEAR' || action.type === 'REPLACE_STATE') && seedRef.current) {
        return mergeSeed(next, seedRef.current)
      }
      return next
    })
  }, [])

  const toast = useCallback((text: string) => {
    const id = createId()
    setToasts((current) => [...current.slice(-2), { id, text }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 2800)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => saveState(state), 60)
    return () => window.clearTimeout(timeout)
  }, [state])

  useEffect(() => {
    const flush = () => saveState(stateRef.current)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      state.settings.theme === 'brasa' ? '#0c0907' : '#07080b',
    )
  }, [state.settings.theme])

  useEffect(() => {
    let cancelled = false
    async function pullSeed() {
      try {
        const response = await fetch('/seed-exercises.json', { cache: 'no-store' })
        if (!response.ok) throw new Error('seed')
        const seed = (await response.json()) as SeedFile
        if (cancelled) return
        seedRef.current = seed
        setState((current) => mergeSeed(current, seed))
        setSeedStatus('ready')
      } catch {
        if (!cancelled) setSeedStatus((status) => (status === 'ready' ? status : 'error'))
      }
    }
    void pullSeed()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pullSeed()
    }
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(() => void pullSeed(), 15 * 60 * 1000)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [])

  const api: GymApi = {
    state,
    seedStatus,
    toasts,
    toast,
    dismissToast,
    addExercise: (input) => {
      if (findExerciseByName(stateRef.current.exercises, input.name)) return null
      const id = createId()
      dispatch({
        type: 'ADD_EXERCISE',
        exercise: {
          id,
          name: input.name.trim(),
          categories: input.categories,
          imageUrl: input.imageUrl.trim(),
          source: 'user',
        },
      })
      return id
    },
    updateExercise: (id, input) => {
      const current = stateRef.current.exercises.find((exercise) => exercise.id === id)
      if (!current || current.source === 'seed' || findExerciseByName(stateRef.current.exercises, input.name, id)) return false
      dispatch({
        type: 'UPDATE_EXERCISE',
        id,
        patch: { name: input.name.trim(), categories: input.categories, imageUrl: input.imageUrl.trim() },
      })
      return true
    },
    deleteExercise: (id) => {
      const current = stateRef.current.exercises.find((exercise) => exercise.id === id)
      if (!current || current.source === 'seed') return
      dispatch({ type: 'DELETE_EXERCISE', id })
    },
    addCategory: (name) => dispatch({ type: 'ADD_CATEGORY', name }),
    removeCategory: (name) => dispatch({ type: 'REMOVE_CATEGORY', name }),
    updateWorkout: (id, patch) => dispatch({ type: 'UPDATE_WORKOUT', id, patch }),
    replaceWorkout: (workout) => dispatch({ type: 'REPLACE_WORKOUT', workout }),
    addToWorkout: (workoutId, exerciseId) => {
      dispatch({
        type: 'ADD_TO_WORKOUT',
        workoutId,
        item: {
          id: createId(),
          exerciseId,
          load: stateRef.current.lastUsed[exerciseId]?.load ?? 0,
          sets: 3,
          reps: stateRef.current.lastUsed[exerciseId]?.reps ?? 10,
          description: '',
          notes: '',
        },
      })
    },
    updateWorkoutExercise: (workoutId, instanceId, patch) =>
      dispatch({ type: 'UPDATE_WORKOUT_EXERCISE', workoutId, instanceId, patch }),
    removeWorkoutExercise: (workoutId, instanceId) =>
      dispatch({ type: 'REMOVE_WORKOUT_EXERCISE', workoutId, instanceId }),
    reorderWorkout: (workoutId, orderedIds) => dispatch({ type: 'REORDER_WORKOUT', workoutId, orderedIds }),
    startSession: (workoutIds) => {
      const ordered = WORKOUT_IDS.filter((id) => workoutIds.includes(id))
      const setIds: Record<string, string[]> = {}
      for (const id of ordered) {
        for (const item of stateRef.current.workouts[id].exercises) {
          setIds[item.id] = Array.from({ length: Math.max(1, item.sets) }, () => createId())
        }
      }
      dispatch({
        type: 'START_SESSION',
        workoutIds: ordered,
        sessionId: createId(),
        startedAt: new Date().toISOString(),
        setIds,
      })
    },
    setActiveLoad: (instanceId, load) => dispatch({ type: 'SET_ACTIVE_LOAD', instanceId, load }),
    setActiveReps: (instanceId, reps) => dispatch({ type: 'SET_ACTIVE_REPS', instanceId, reps }),
    toggleSet: (instanceId, setId, completed) => dispatch({ type: 'TOGGLE_SET', instanceId, setId, completed }),
    addSet: (instanceId, permanent) =>
      dispatch({
        type: 'ADD_SET',
        instanceId,
        permanent,
        set: { id: createId(), completed: false, persistent: permanent },
      }),
    removeSet: (instanceId, setId, permanent) => dispatch({ type: 'REMOVE_SET', instanceId, setId, permanent }),
    reorderSession: (workoutId, orderedIds) => dispatch({ type: 'REORDER_SESSION', workoutId, orderedIds }),
    setCardio: (workoutId, completed) => dispatch({ type: 'SET_CARDIO', workoutId, completed }),
    setRestSeconds: (seconds) => dispatch({ type: 'SET_REST_SECONDS', seconds }),
    openReview: () => dispatch({ type: 'OPEN_REVIEW', at: new Date().toISOString() }),
    closeReview: () => dispatch({ type: 'CLOSE_REVIEW', at: new Date().toISOString() }),
    abandonSession: () => dispatch({ type: 'ABANDON_SESSION' }),
    confirmSession: (notes) => {
      const active = stateRef.current.activeSession
      if (!active) return null
      dispatch({ type: 'CONFIRM_SESSION', notes, finishedAt: new Date().toISOString() })
      return active.id
    },
    updateSession: (session) => dispatch({ type: 'UPDATE_SESSION', session }),
    deleteSession: (id) => dispatch({ type: 'DELETE_SESSION', id }),
    updateSettings: (patch) => dispatch({ type: 'UPDATE_SETTINGS', patch }),
    importBackup: (raw) => {
      try {
        const parsed = parseBackup(JSON.parse(raw))
        if (!parsed.ok) return parsed.error
        dispatch({ type: 'REPLACE_STATE', state: parsed.state })
        return null
      } catch {
        return 'O arquivo não é um JSON válido.'
      }
    },
    clearAll: () => dispatch({ type: 'CLEAR' }),
  }

  return <GymContext.Provider value={api}>{children}</GymContext.Provider>
}

export function useGym(): GymApi {
  const value = useContext(GymContext)
  if (!value) throw new Error('useGym precisa estar dentro do GymProvider')
  return value
}
