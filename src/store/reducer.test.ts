import { describe, expect, it } from 'vitest'
import { initialState } from '../lib/initial'
import { reducer } from './reducer'
import type { AppState, Exercise, WorkoutExercise } from '../types'

function withExercise(state: AppState, exercise: Exercise, item: WorkoutExercise): AppState {
  return {
    ...state,
    exercises: [exercise],
    workouts: {
      ...state.workouts,
      A: { ...state.workouts.A, exercises: [item] },
    },
    lastUsed: { [exercise.id]: { load: 40, reps: 8 } },
  }
}

const exercise: Exercise = {
  id: 'seed-001',
  name: 'Supino Reto com Barra',
  categories: ['Peito'],
  imageUrl: '',
  source: 'seed',
}

const item: WorkoutExercise = {
  id: 'slot-1',
  exerciseId: exercise.id,
  load: 20,
  sets: 3,
  reps: 10,
  description: 'Escápulas juntas',
  notes: 'Sem quicar',
}

describe('session flow', () => {
  const base = withExercise(initialState(), exercise, item)

  function start(state: AppState) {
    return reducer(state, {
      type: 'START_SESSION',
      workoutIds: ['A'],
      sessionId: 'session-1',
      startedAt: '2026-10-16T12:00:00.000Z',
      setIds: { 'slot-1': ['s1', 's2', 's3'] },
    })
  }

  it('prefills the last used load and restores it if the session is abandoned', () => {
    const live = start(base)
    expect(live.activeSession?.exercises[0]?.load).toBe(40)
    expect(live.activeSession?.exercises[0]?.reps).toBe(8)
    const changed = reducer(live, { type: 'SET_ACTIVE_LOAD', instanceId: 'slot-1', load: 42.5 })
    expect(changed.lastUsed[exercise.id]).toEqual({ load: 42.5, reps: 8 })
    const abandoned = reducer(changed, { type: 'ABANDON_SESSION' })
    expect(abandoned.activeSession).toBeNull()
    expect(abandoned.lastUsed[exercise.id]).toEqual({ load: 40, reps: 8 })
  })

  it('saves volume, keeps the new load, and records the description from the workout', () => {
    let state = start(base)
    for (const setId of ['s1', 's2', 's3']) {
      state = reducer(state, { type: 'TOGGLE_SET', instanceId: 'slot-1', setId, completed: true })
    }
    state = reducer(state, { type: 'SET_ACTIVE_LOAD', instanceId: 'slot-1', load: 42.5 })
    state = reducer(state, { type: 'OPEN_REVIEW', at: '2026-10-16T12:30:00.000Z' })
    state = reducer(state, { type: 'CONFIRM_SESSION', notes: 'Bom dia', finishedAt: '2026-10-16T12:40:00.000Z' })
    expect(state.activeSession).toBeNull()
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0]?.totalVolume).toBe(42.5 * 8 * 3)
    expect(state.sessions[0]?.durationSeconds).toBe(30 * 60)
    expect(state.sessions[0]?.notes).toBe('Bom dia')
    expect(state.sessions[0]?.exercises[0]?.description).toBe('Escápulas juntas')
    expect(state.lastUsed[exercise.id]?.load).toBe(42.5)
  })

  it('adds a permanent set to the workout and a temporary set only to the session', () => {
    const live = start(base)
    const permanent = reducer(live, {
      type: 'ADD_SET',
      instanceId: 'slot-1',
      permanent: true,
      set: { id: 'extra', completed: false, persistent: true },
    })
    expect(permanent.workouts.A.exercises[0]?.sets).toBe(4)
    expect(permanent.activeSession?.exercises[0]?.sets).toHaveLength(4)
    const temporary = reducer(live, {
      type: 'ADD_SET',
      instanceId: 'slot-1',
      permanent: false,
      set: { id: 'temp', completed: false, persistent: false },
    })
    expect(temporary.workouts.A.exercises[0]?.sets).toBe(3)
    expect(temporary.activeSession?.exercises[0]?.sets).toHaveLength(4)
  })

  it('reorders the saved workout when the session order changes', () => {
    const second: WorkoutExercise = { ...item, id: 'slot-2', description: 'Outra' }
    const state = {
      ...base,
      workouts: {
        ...base.workouts,
        A: { ...base.workouts.A, exercises: [item, second] },
      },
    }
    const live = reducer(state, {
      type: 'START_SESSION',
      workoutIds: ['A'],
      sessionId: 'session-2',
      startedAt: '2026-10-16T12:00:00.000Z',
      setIds: { 'slot-1': ['a'], 'slot-2': ['b'] },
    })
    const moved = reducer(live, { type: 'REORDER_SESSION', workoutId: 'A', orderedIds: ['slot-2', 'slot-1'] })
    expect(moved.workouts.A.exercises.map((entry) => entry.id)).toEqual(['slot-2', 'slot-1'])
    expect(moved.activeSession?.exercises.map((entry) => entry.instanceId)).toEqual(['slot-2', 'slot-1'])
  })

  it('refuses to edit or delete a seed exercise and blocks a duplicate name', () => {
    const removed = reducer(base, { type: 'DELETE_EXERCISE', id: exercise.id })
    expect(removed.exercises).toHaveLength(1)
    expect(removed.deletedSeedIds).toHaveLength(0)
    expect(removed.workouts.A.exercises).toHaveLength(1)
    const renamed = reducer(base, {
      type: 'UPDATE_EXERCISE',
      id: exercise.id,
      patch: { name: 'Outro nome', categories: ['Peito'], imageUrl: '' },
    })
    expect(renamed.exercises[0]?.name).toBe('Supino Reto com Barra')
    const blocked = reducer(base, {
      type: 'ADD_EXERCISE',
      exercise: { ...exercise, id: 'other', name: 'SUPINO RETO COM BARRA', source: 'user' },
    })
    expect(blocked.exercises).toHaveLength(1)
  })

  it('marks every set when the last set of an exercise is checked', () => {
    const live = start(base)
    const last = reducer(live, { type: 'TOGGLE_SET', instanceId: 'slot-1', setId: 's3', completed: true })
    expect(last.activeSession?.exercises[0]?.sets.every((set) => set.completed)).toBe(true)
    const middle = reducer(live, { type: 'TOGGLE_SET', instanceId: 'slot-1', setId: 's1', completed: true })
    expect(middle.activeSession?.exercises[0]?.sets.filter((set) => set.completed)).toHaveLength(1)
  })
})
