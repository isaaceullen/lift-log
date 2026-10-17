import { useEffect, useState } from 'react'
import { useGym } from '../store/GymProvider'
import { Button } from './ui'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const { state, updateSettings } = useGym()
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    setStandalone(media.matches || iosStandalone)
    const onChange = () => setStandalone(media.matches || iosStandalone)
    media.addEventListener('change', onChange)
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => {
      media.removeEventListener('change', onChange)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  if (standalone || state.settings.installHintDismissed) return null

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <section className="mb-5 rounded-3xl border border-line bg-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Instalar</p>
      <p className="mt-1 text-sm leading-relaxed text-mist">
        {ios
          ? 'No iPhone, abra no Safari, toque em Compartilhar e escolha Adicionar à Tela de Início. Depois da primeira carga, a Forja abre offline.'
          : 'Instale no celular ou no computador. Depois da primeira carga, treinos, histórico e biblioteca funcionam offline.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {promptEvent ? (
          <Button
            onClick={() => {
              void promptEvent.prompt()
              void promptEvent.userChoice.finally(() => setPromptEvent(null))
            }}
          >
            Instalar
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => updateSettings({ installHintDismissed: true })}>
          Agora não
        </Button>
      </div>
    </section>
  )
}
