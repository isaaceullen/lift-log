import { ChartColumn, Database, House, Library } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from './ui'

const TABS = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library, end: false },
  { to: '/historico', label: 'Histórico', icon: ChartColumn, end: false },
  { to: '/dados', label: 'Dados', icon: Database, end: false },
]

export function Shell() {
  const editingWorkout = useLocation().pathname.startsWith('/treino')
  return (
    <div
      className={cn(
        'mx-auto min-h-dvh max-w-6xl px-4',
        editingWorkout
          ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
          : 'pb-[calc(5.75rem+env(safe-area-inset-bottom))]',
      )}
    >
      <Outlet />
      {editingWorkout ? null : (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                  isActive ? 'text-accent' : 'text-mist',
                )
              }
            >
              <tab.icon size={20} strokeWidth={2.2} />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
      )}
    </div>
  )
}
