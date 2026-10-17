import { Component, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/Shell'
import { buttonClass, cn } from './components/ui'
import { DataPage } from './pages/DataPage'
import { ExerciseFormPage } from './pages/ExerciseFormPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { SessionPage } from './pages/SessionPage'
import { SummaryPage } from './pages/SummaryPage'
import { WorkoutPage } from './pages/WorkoutPage'
import { GymProvider, useGym } from './store/GymProvider'

export default function App() {
  return (
    <GymProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <OfflineBadge />
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<HomePage />} />
              <Route path="biblioteca" element={<LibraryPage />} />
              <Route path="biblioteca/nova" element={<ExerciseFormPage />} />
              <Route path="biblioteca/editar/:exerciseId" element={<ExerciseFormPage />} />
              <Route path="treino/:workoutId" element={<WorkoutPage />} />
              <Route path="historico" element={<HistoryPage />} />
              <Route path="historico/:sessionId" element={<SessionDetailPage />} />
              <Route path="dados" element={<DataPage />} />
            </Route>
            <Route path="sessao/:workoutId" element={<SessionPage />} />
            <Route path="sessao/:workoutId/resumo" element={<SummaryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toasts />
        </ErrorBoundary>
      </BrowserRouter>
    </GymProvider>
  )
}

function Toasts() {
  const { toasts, dismissToast } = useGym()
  const location = useLocation()
  if (toasts.length === 0) return null
  const onSession = location.pathname.startsWith('/sessao')
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4',
        onSession ? 'bottom-[max(1rem,env(safe-area-inset-bottom))]' : 'bottom-[calc(5.4rem+env(safe-area-inset-bottom))]',
      )}
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="pointer-events-auto rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-lg"
        >
          {toast.text}
        </button>
      ))}
    </div>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-lg px-6 pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-heat">Forja</p>
        <h1 className="mt-2 font-display text-5xl uppercase">Algo saiu do eixo</h1>
        <p className="mt-3 text-sm text-mist">Recarregue a página. Os dados continuam neste aparelho.</p>
        <button type="button" className={buttonClass('primary', 'mt-6')} onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    )
  }
}

export function OfflineBadge() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <div className="fixed top-[max(0.55rem,env(safe-area-inset-top))] right-3 z-[70] rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-warn">
      Offline
    </div>
  )
}
