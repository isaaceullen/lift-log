export function reorderByIds<T>(items: T[], orderedIds: string[], idOf: (item: T) => string): T[] {
  const map = new Map(items.map((item) => [idOf(item), item]))
  const next: T[] = []
  for (const id of orderedIds) {
    const item = map.get(id)
    if (!item) continue
    next.push(item)
    map.delete(id)
  }
  for (const item of map.values()) next.push(item)
  return next
}

export function moveId(ids: string[], id: string, direction: -1 | 1): string[] {
  const index = ids.indexOf(id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ids.length) return ids
  const next = [...ids]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}
