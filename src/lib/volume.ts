export function totalVolume(exercises: Array<{ load: number; reps: number; completedSets: number }>): number {
  return exercises.reduce((sum, exercise) => sum + exercise.load * exercise.reps * exercise.completedSets, 0)
}
