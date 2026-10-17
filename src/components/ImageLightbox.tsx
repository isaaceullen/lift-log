import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ExerciseArt } from './ExerciseArt'

export function ImageLightbox({
  open,
  name,
  categories,
  imageUrl,
  onClose,
}: {
  open: boolean
  name: string
  categories: string[]
  imageUrl: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="relative w-full max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar imagem"
          className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full bg-black/60 text-white"
        >
          <X size={18} />
        </button>
        <ExerciseArt name={name} categories={categories} imageUrl={imageUrl} className="aspect-square w-full rounded-3xl" />
      </div>
    </div>
  )
}
