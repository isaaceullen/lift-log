import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  dismissable = true,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  dismissable?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissable) onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose, dismissable])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/70"
        onClick={dismissable ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        className="relative z-10 max-h-[90dvh] w-full overflow-auto rounded-t-3xl border border-line bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <h2 id="dialog-title" className="font-display text-3xl uppercase leading-none">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-mist">{description}</p> : null}
        <div className="mt-5 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  )
}
