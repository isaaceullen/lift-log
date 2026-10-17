import { useState } from 'react'
import { primaryCategory } from '../lib/categories'
import { isSafeImageUrl } from '../lib/image'
import { cn } from './ui'

const WASH: Record<string, string> = {
  Peito: '#ff5a36',
  Costas: '#49c2ff',
  Ombros: '#d6ff3c',
  Bíceps: '#c084fc',
  Tríceps: '#ff8a3d',
  Pernas: '#3ddc97',
  Glúteos: '#ff5fa2',
  Abdômen: '#ffc14a',
  Panturrilha: '#7ee0c6',
  Composto: '#f4f5f8',
  Isolado: '#9aa3b5',
}

const FALLBACK = ['#d6ff3c', '#ff5a36', '#49c2ff', '#ffc14a', '#3ddc97', '#c084fc']

function washFor(category: string): string {
  if (WASH[category]) return WASH[category]
  let hash = 0
  for (const char of category) hash = (hash + char.charCodeAt(0)) % FALLBACK.length
  return FALLBACK[hash] ?? FALLBACK[0]
}

export function ExerciseArt({
  name,
  categories,
  imageUrl,
  className,
}: {
  name: string
  categories: string[]
  imageUrl: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const category = primaryCategory(categories)
  const showImage = isSafeImageUrl(imageUrl) && !failed
  const wash = washFor(category)

  return (
    <div
      className={cn('relative overflow-hidden bg-ink', className)}
      style={{
        backgroundImage: showImage
          ? undefined
          : `linear-gradient(145deg, color-mix(in srgb, ${wash} 28%, #101218), #101218 70%)`,
      }}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: wash }}>
            {category}
          </span>
          <span className="font-display text-5xl uppercase leading-none text-paper/90">
            {category.slice(0, 2)}
          </span>
          <span className="sr-only">{name}</span>
        </div>
      )}
    </div>
  )
}
