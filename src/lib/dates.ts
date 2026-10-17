export const WEEKDAYS: Array<{ value: number; short: string; long: string }> = [
  { value: 1, short: 'Seg', long: 'Segunda' },
  { value: 2, short: 'Ter', long: 'Terça' },
  { value: 3, short: 'Qua', long: 'Quarta' },
  { value: 4, short: 'Qui', long: 'Quinta' },
  { value: 5, short: 'Sex', long: 'Sexta' },
  { value: 6, short: 'Sáb', long: 'Sábado' },
  { value: 0, short: 'Dom', long: 'Domingo' },
]

export function dateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function startOfWeek(date: Date): Date {
  const start = startOfDay(date)
  const day = start.getDay()
  const diff = day === 0 ? 6 : day - 1
  start.setDate(start.getDate() - diff)
  return start
}

export function formatWeekday(date: Date): string {
  const value = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date)
  return value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1)
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date)
}

export function formatDayHeading(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatSessionWhen(iso: string, today = new Date()): string {
  const date = new Date(iso)
  const key = dateKey(date)
  if (key === dateKey(today)) return 'Hoje'
  if (key === dateKey(addDays(startOfDay(today), -1))) return 'Ontem'
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(date)
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatDays(days: number[]): string {
  if (days.length === 0) return 'Sem dia fixo'
  const labels = new Map(WEEKDAYS.map((day) => [day.value, day.short]))
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((day) => days.includes(day))
    .map((day) => labels.get(day))
    .join(' · ')
}

export function monthGrid(year: number, month: number): Array<{ date: Date; inMonth: boolean }> {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - startOffset)
  const cells: Array<{ date: Date; inMonth: boolean }> = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    cells.push({ date, inMonth: date.getMonth() === month })
  }
  if (cells.slice(35).every((cell) => !cell.inMonth)) return cells.slice(0, 35)
  return cells
}

export function sessionElapsedMs(
  session: { startedAt: string; pausedMs: number; reviewOpenedAt: string | null },
  now: number,
): number {
  const end = session.reviewOpenedAt ? new Date(session.reviewOpenedAt).getTime() : now
  return Math.max(0, end - new Date(session.startedAt).getTime() - session.pausedMs)
}
