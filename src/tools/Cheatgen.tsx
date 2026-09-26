import { useMemo, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { ToolHeader, CopyBlock, Field, TextInput, Toggle, InfoBanner } from '../components/ui'
import { CHEAT_TOPICS, buildCheatSheet, CHEAT_NOTES } from '../lib/cheatgen'
import { download } from '../lib/util'
import { Button } from '../components/ui'

export default function Cheatgen() {
  const [title, setTitle] = useState('Chuleta de supervivencia')
  const [topics, setTopics] = useState<string[]>(['vim', 'tmux', 'findgrep'])
  const [format, setFormat] = useState<'txt' | 'md'>('md')
  const [includeHeader, setIncludeHeader] = useState(true)
  const [includeIndex, setIncludeIndex] = useState(true)
  const [twoColHint, setTwoColHint] = useState(true)

  const content = useMemo(() => buildCheatSheet({ title, topics, format, includeHeader, includeIndex, twoColHint }), [title, topics, format, includeHeader, includeIndex, twoColHint])

  const toggle = (id: string) => setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))

  const doDownload = () => {
    const name = (title || 'chuleta').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chuleta'
    download(`${name}.${format}`, content, format === 'md' ? 'text/markdown' : 'text/plain')
  }

  return (
    <>
      <ToolHeader icon={ScrollText} title="Chuleta Generator" desc="Composición de chuletas a tu medida: elige temas (vim, tmux, find/grep, bash, red, git) y genera una hoja imprimible con índice, en TXT o Markdown lista para pegar junto al monitor" />

      <InfoBanner>
        Cada tema cabe en una página. Combínalos, imprime en A5 y póntala junto al teclado: la memoria espacial
        funciona mejor que cualquier app de flashcards.
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <Field label="Título de la chuleta">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field label="Temas a incluir">
            <div className="space-y-1.5">
              {CHEAT_TOPICS.map((t) => {
                const on = topics.includes(t.id)
                const lines = t.sections.reduce((a, s) => a + s.items.length, 0)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={`w-full rounded border px-3 py-2 text-left text-xs transition-all ${on ? 'border-acento/50 bg-acento/10' : 'border-edge opacity-60 hover:opacity-100'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t.icon}</span>
                      <span className="font-medium text-ink">{t.label}</span>
                      <span className="ml-auto font-mono text-[10px] text-grey">{lines} cmds</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-grey/70">{t.desc}</p>
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Formato">
            <div className="flex gap-2">
              {(['md', 'txt'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 rounded border px-3 py-1.5 font-mono text-xs ${format === f ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey'}`}
                >
                  {f === 'md' ? 'Markdown (tablas)' : 'TXT (plano)'}
                </button>
              ))}
            </div>
          </Field>

          <Toggle checked={includeHeader} onChange={setIncludeHeader} label="Cabecera con título y fecha" />
          <Toggle checked={includeIndex} onChange={setIncludeIndex} label="Índice de temas" />
          {format === 'txt' && <Toggle checked={twoColHint} onChange={setTwoColHint} label="Alineación a dos columnas (impresión)" />}

          <Button variant="primary" onClick={doDownload} className="w-full justify-center">
            Descargar chuleta (.{format})
          </Button>
        </div>

        <div>
          <CopyBlock text={content} label={`preview · ${topics.length} temas`} maxH="36rem" />
        </div>
      </div>

      <div className="mt-6 rounded border border-edge bg-black/30 p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Notas</h4>
        <ul className="space-y-1.5 text-xs text-grey">
          {CHEAT_NOTES.map((n) => <li key={n}>• {n}</li>)}
        </ul>
      </div>
    </>
  )
}
