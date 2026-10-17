import type { Session } from '../types'
import { addDays, dateKey, startOfDay, startOfWeek } from './dates'

export type ExerciseStat = {
  exerciseId: string
  name: string
  count: number
  maxLoad: number
}

export function exerciseStats(sessions: Session[]): ExerciseStat[] {
  const map = new Map<string, ExerciseStat>()
  const chronological = [...sessions].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))
  for (const session of chronological) {
    const seen = new Set<string>()
    for (const exercise of session.exercises) {
      if (exercise.completedSets <= 0) continue
      const current = map.get(exercise.exerciseId) ?? {
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        count: 0,
        maxLoad: 0,
      }
      current.name = exercise.name
      current.maxLoad = Math.max(current.maxLoad, exercise.load)
      if (!seen.has(exercise.exerciseId)) {
        current.count += 1
        seen.add(exercise.exerciseId)
      }
      map.set(exercise.exerciseId, current)
    }
  }
  return [...map.values()]
}

export function loadSeries(sessions: Session[], exerciseId: string): Array<{ at: string; load: number }> {
  return [...sessions]
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))
    .flatMap((session) => {
      const matches = session.exercises.filter(
        (exercise) => exercise.exerciseId === exerciseId && exercise.completedSets > 0,
      )
      if (matches.length === 0) return []
      return [{ at: session.finishedAt, load: Math.max(...matches.map((match) => match.load)) }]
    })
}

export function previousLoad(sessions: Session[], exerciseId: string): number | null {
  const series = loadSeries(sessions, exerciseId)
  return series.length > 0 ? series[series.length - 1].load : null
}

export function loadTrend(
  current: number,
  previous: number | null,
): { kind: 'new' } | { kind: 'same' } | { kind: 'up' | 'down'; delta: number } {
  if (previous === null) return { kind: 'new' }
  const delta = Math.round((current - previous) * 100) / 100
  if (Math.abs(delta) < 0.01) return { kind: 'same' }
  return delta > 0 ? { kind: 'up', delta } : { kind: 'down', delta: Math.abs(delta) }
}

export function currentStreak(sessions: Session[], today = new Date()): number {
  const days = new Set(sessions.map((session) => dateKey(session.startedAt)))
  let cursor = startOfDay(today)
  if (!days.has(dateKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (days.has(dateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function sessionsThisWeek(sessions: Session[], today = new Date()): Session[] {
  const start = startOfWeek(today).getTime()
  const end = addDays(startOfWeek(today), 7).getTime()
  return sessions.filter((session) => {
    const time = new Date(session.startedAt).getTime()
    return time >= start && time < end
  })
}

export function isScheduledToday(days: number[], today = new Date()): boolean {
  return days.includes(today.getDay())
}
