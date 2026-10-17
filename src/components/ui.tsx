import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const variants = {
  primary: 'bg-accent text-accent-ink hover:brightness-105',
  ghost: 'border border-line bg-transparent text-paper hover:bg-raised',
  danger: 'border border-heat/40 bg-transparent text-heat hover:bg-heat/10',
  soft: 'bg-raised text-paper hover:bg-white/5',
} as const

type Variant = keyof typeof variants

export function buttonClass(variant: Variant = 'primary', className = ''): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold min-h-11 transition disabled:cursor-not-allowed disabled:opacity-40',
    variants[variant],
    className,
  )
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />
}

export function ButtonLink({
  to,
  variant = 'primary',
  className,
  children,
}: {
  to: string
  variant?: Variant
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={buttonClass(variant, className)}>
      {children}
    </Link>
  )
}

export function TextField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-2xl border border-line bg-raised px-3 text-base outline-none placeholder:text-mist/80 focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-2xl border border-line bg-raised px-3 py-2.5 text-base outline-none placeholder:text-mist/80 focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-mist">{hint}</span> : null}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-accent' : 'bg-raised')}>
        <span
          className={cn(
            'absolute top-0.5 size-6 rounded-full transition',
            checked ? 'left-5 bg-accent-ink' : 'left-0.5 bg-mist',
          )}
        />
      </span>
    </button>
  )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-mist">
      {children}
    </label>
  )
}
