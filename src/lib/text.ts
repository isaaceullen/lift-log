export function fold(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function uniqueLabels(values: string[], limit = 8): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const label = value.trim()
    if (!label) continue
    const key = fold(label)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(label.slice(0, 40))
    if (result.length >= limit) break
  }
  return result
}
