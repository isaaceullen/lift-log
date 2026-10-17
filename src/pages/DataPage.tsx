import { useRef, useState } from 'react'
import { InstallBanner } from '../components/InstallBanner'
import { Dialog } from '../components/Dialog'
import { Button, TextField, Toggle, cn } from '../components/ui'
import { dateKey } from '../lib/dates'
import { formatBytes } from '../lib/format'
import { exportDocument } from '../storage/db'
import { useGym } from '../store/GymProvider'

export function DataPage() {
  const { state, updateSettings, importBackup, clearAll, toast } = useGym()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [phrase, setPhrase] = useState('')
  const bytes = new Blob([exportDocument(state)]).size

  function download() {
    const blob = new Blob([exportDocument(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `forja-backup-${dateKey(new Date())}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast('Backup baixado.')
  }

  return (
    <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">Aparelho</p>
      <h1 className="font-display text-5xl uppercase leading-none">Dados</h1>
      <p className="mt-2 max-w-xl text-sm text-mist">
        Tudo fica neste aparelho: {state.exercises.length} exercícios, {state.sessions.length} sessões, cerca de {formatBytes(bytes)}.
      </p>

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-mist">Tema</h2>
        <div className="grid grid-cols-2 gap-3">
          <ThemeCard
            name="Noite"
            description="Preto e lima"
            active={state.settings.theme === 'noite'}
            swatch="#d6ff3c"
            onClick={() => updateSettings({ theme: 'noite' })}
          />
          <ThemeCard
            name="Brasa"
            description="Preto e âmbar"
            active={state.settings.theme === 'brasa'}
            swatch="#ffb020"
            onClick={() => updateSettings({ theme: 'brasa' })}
          />
        </div>
      </section>

      <div className="mt-4">
        <Toggle
          checked={state.settings.soundEnabled}
          onChange={(soundEnabled) => updateSettings({ soundEnabled })}
          label="Som do descanso"
          hint="Um aviso curto quando o timer chega a zero."
        />
      </div>

      <section className="mt-6 rounded-3xl border border-line bg-panel p-4">
        <h2 className="font-display text-3xl uppercase leading-none">Backup</h2>
        <p className="mt-2 text-sm text-mist">
          Exporte um JSON com treinos, histórico e exercícios. Importar substitui o que está neste aparelho. Exercícios novos da biblioteca inicial entram se o nome ainda não existir.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button onClick={download}>Exportar tudo</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Importar
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            void file.text().then((text) => setPendingImport(text))
          }}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-heat/30 bg-panel p-4">
        <h2 className="font-display text-3xl uppercase leading-none">Zona de risco</h2>
        <p className="mt-2 text-sm text-mist">
          Limpar apaga treinos, histórico, cargas e exercícios personalizados. A biblioteca inicial volta em seguida.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => { setPhrase(''); setClearOpen(true) }}>
          Limpar toda a base de dados
        </Button>
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-panel p-4">
        <h2 className="font-display text-3xl uppercase leading-none">Biblioteca inicial</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          O arquivo <code className="text-paper">public/seed-exercises.json</code> é editável no repositório. Novos nomes entram na próxima abertura. Um exercício excluído aqui não volta. Descrições não fazem parte desse arquivo: elas nascem quando você monta o treino.
        </p>
      </section>

      <div className="mt-4">
        {state.settings.installHintDismissed ? (
          <div className="rounded-3xl border border-line bg-panel p-4 text-sm text-mist">
            No iPhone, abra no Safari, toque em Compartilhar e escolha Adicionar à Tela de Início. No computador, use o menu de instalar do navegador.
            <Button variant="ghost" className="mt-3" onClick={() => updateSettings({ installHintDismissed: false })}>
              Mostrar aviso de instalação
            </Button>
          </div>
        ) : (
          <InstallBanner />
        )}
      </div>

      <Dialog
        open={pendingImport !== null}
        title="Substituir os dados?"
        description="Treinos, histórico e exercícios deste aparelho serão trocados pelo arquivo."
        onClose={() => setPendingImport(null)}
      >
        <Button
          onClick={() => {
            if (!pendingImport) return
            const error = importBackup(pendingImport)
            setPendingImport(null)
            toast(error ?? 'Backup importado.')
          }}
        >
          Importar e substituir
        </Button>
        <Button variant="ghost" onClick={() => setPendingImport(null)}>
          Cancelar
        </Button>
      </Dialog>

      <Dialog
        open={clearOpen}
        title="Limpar toda a base de dados"
        description="Digite APAGAR para confirmar. Não há como desfazer sem um backup."
        onClose={() => setClearOpen(false)}
        dismissable
      >
        <TextField
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          placeholder="APAGAR"
          aria-label="Digite APAGAR para confirmar"
          autoComplete="off"
        />
        <Button
          variant="danger"
          disabled={phrase !== 'APAGAR'}
          onClick={() => {
            clearAll()
            setClearOpen(false)
            toast('Base limpa.')
          }}
        >
          Limpar toda a base de dados
        </Button>
        <Button variant="ghost" onClick={() => setClearOpen(false)}>
          Cancelar
        </Button>
      </Dialog>
    </div>
  )
}

function ThemeCard({
  name,
  description,
  active,
  swatch,
  onClick,
}: {
  name: string
  description: string
  active: boolean
  swatch: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('rounded-3xl border p-4 text-left', active ? 'border-accent bg-accent/10' : 'border-line bg-panel')}
    >
      <span className="block size-8 rounded-full" style={{ background: swatch }} />
      <span className="mt-3 block font-semibold">{name}</span>
      <span className="block text-sm text-mist">{description}</span>
    </button>
  )
}
