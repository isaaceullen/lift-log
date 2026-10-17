import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { findExerciseByName } from './categories'
import { sessionElapsedMs } from './dates'
import { initialState } from './initial'
import { mergeSeed } from './seed'
import { currentStreak, loadTrend, previousLoad } from './stats'
import { fold } from './text'
import { totalVolume } from './volume'
import type { Exercise, SeedFile, Session } from '../types'

const seed = JSON.parse(
  readFileSync(new URL('../../public/seed-exercises.json', import.meta.url), 'utf8'),
) as SeedFile

function session(partial: Partial<Session> & Pick<Session, 'id' | 'startedAt' | 'finishedAt'>): Session {
  return {
    workoutId: 'A',
    workoutLabel: '',
    durationSeconds: 60,
    notes: '',
    cardioEnabled: true,
    cardioCompleted: false,
    exercises: [],
    totalVolume: 0,
    ...partial,
  }
}

describe('seed', () => {
  it('keeps unique names and merges once', () => {
    const names = seed.exercises.map((exercise) => fold(exercise.name))
    expect(new Set(names).size).toBe(names.length)
    expect(seed.exercises.every((exercise) => !('description' in exercise))).toBe(true)
    const once = mergeSeed(initialState(), seed)
    const twice = mergeSeed(once, seed)
    expect(once.exercises.length).toBeGreaterThan(40)
    expect(twice.exercises).toHaveLength(once.exercises.length)
  })

  it('skips a deleted seed and a custom exercise with the same name', () => {
    const base = initialState()
    const custom: Exercise = {
      id: 'user-1',
      name: 'supino reto com barra',
      categories: ['Peito'],
      imageUrl: '',
      source: 'user',
    }
    const withCustom = { ...base, exercises: [custom], deletedSeedIds: ['seed-002'] }
    const merged = mergeSeed(withCustom, seed)
    expect(merged.exercises.some((exercise) => exercise.id === 'seed-001')).toBe(false)
    expect(merged.exercises.some((exercise) => exercise.id === 'seed-002')).toBe(false)
    expect(merged.exercises.some((exercise) => exercise.id === 'seed-003')).toBe(true)
  })
})

describe('library names', () => {
  it('matches names without case or accents', () => {
    const exercises: Exercise[] = [
      { id: '1', name: 'Rosca Bíceps', categories: [], imageUrl: '', source: 'user' },
    ]
    expect(findExerciseByName(exercises, '  rosca biceps ')?.id).toBe('1')
    expect(findExerciseByName(exercises, 'rosca biceps', '1')).toBeUndefined()
  })
})

describe('stats', () => {
  const sessions = [
    session({
      id: 's1',
      startedAt: new Date(2026, 9, 14, 12).toISOString(),
      finishedAt: new Date(2026, 9, 14, 13).toISOString(),
      exercises: [
        {
          instanceId: 'a',
          exerciseId: 'ex',
          name: 'Supino',
          categories: ['Peito'],
          imageUrl: '',
          description: '',
          notes: '',
          load: 40,
          reps: 8,
          completedSets: 3,
          totalSets: 3,
        },
      ],
    }),
    session({
      id: 's2',
      startedAt: new Date(2026, 9, 15, 12).toISOString(),
      finishedAt: new Date(2026, 9, 15, 13).toISOString(),
    }),
    session({
      id: 's3',
      startedAt: new Date(2026, 9, 16, 12).toISOString(),
      finishedAt: new Date(2026, 9, 16, 13).toISOString(),
      exercises: [
        {
          instanceId: 'b',
          exerciseId: 'ex',
          name: 'Supino',
          categories: ['Peito'],
          imageUrl: '',
          description: '',
          notes: '',
          load: 42.5,
          reps: 8,
          completedSets: 1,
          totalSets: 3,
        },
      ],
    }),
  ]

  it('counts the streak through today and stops at a gap', () => {
    expect(currentStreak(sessions, new Date(2026, 9, 16, 18))).toBe(3)
    expect(currentStreak([sessions[0]], new Date(2026, 9, 16, 18))).toBe(0)
    expect(currentStreak([sessions[1]], new Date(2026, 9, 16, 18))).toBe(1)
  })

  it('reads the latest completed load', () => {
    expect(previousLoad(sessions, 'ex')).toBe(42.5)
    expect(loadTrend(45, 42.5)).toEqual({ kind: 'up', delta: 2.5 })
    expect(loadTrend(40, 42.5)).toEqual({ kind: 'down', delta: 2.5 })
    expect(loadTrend(42.5, 42.5)).toEqual({ kind: 'same' })
    expect(loadTrend(20, null)).toEqual({ kind: 'new' })
  })
})

describe('volume and clock pause', () => {
  it('sums only completed sets', () => {
    expect(totalVolume([{ load: 20, reps: 10, completedSets: 3 }])).toBe(600)
  })

  it('freezes the clock while the summary is open', () => {
    const started = new Date(2026, 9, 16, 10, 0, 0).toISOString()
    const review = new Date(2026, 9, 16, 10, 30, 0).toISOString()
    const later = new Date(2026, 9, 16, 10, 45, 0).getTime()
    expect(sessionElapsedMs({ startedAt: started, pausedMs: 0, reviewOpenedAt: review }, later)).toBe(30 * 60 * 1000)
    expect(sessionElapsedMs({ startedAt: started, pausedMs: 5 * 60 * 1000, reviewOpenedAt: null }, later)).toBe(40 * 60 * 1000)
  })
})
