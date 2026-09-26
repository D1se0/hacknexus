import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { ToolHeader, CopyBlock, Field, Reveal, InfoBanner, Toggle, Button } from '../components/ui'
import { ALIAS_CATALOG, ALIAS_CATS, buildAliasBlock, ALIAS_NOTES, type AliasCat, type AliasShell } from '../lib/aliases'

export default function Aliases() {
  const [shell, setShell] = useState<AliasShell>('bash')
  const [cats, setCats] = useState<AliasCat[]>(['qol', 'seguridad'])
  const [withHeader, setWithHeader] = useState(true)

  const sel = useMemo(() => ALIAS_CATALOG.filter((a) => cats.includes(a.cat)), [cats])
  const block = useMemo(() => buildAliasBlock(sel, shell, withHeader), [sel, shell, withHeader])

  const toggleCat = (c: AliasCat) => setCats((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))

  return (
    <>
      <ToolHeader icon={Sparkles} title="Shell Alias Pack" desc="Genera tu pack de alias y funciones de calidad de vida y seguridad para ~/.bashrc o ~/.zshrc: cada uno con la explicación de qué hábito corrige" />

      <InfoBanner>
        Los alias de seguridad (<span className="font-mono">cp -i</span>, <span className="font-mono">rm -I</span>, <span className="font-mono">chmod --preserve-root</span>) son los que evitan desastres: cambian el hábito, no la herramienta. En scripts NO se aplican — ahí mandan los comandos reales.
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <Field label="Shell destino">
            <div className="flex gap-2">
              {(['bash', 'zsh'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setShell(s)}
                  className={`flex-1 rounded border px-3 py-1.5 font-mono text-xs ${shell === s ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Categorías">
            <div className="grid grid-cols-2 gap-1.5">
              {ALIAS_CATS.map((c) => {
                const on = cats.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCat(c.id)}
                    className={`rounded border px-2 py-1.5 text-xs ${on ? 'border-acento/50 bg-acento/10 text-ink' : 'border-edge text-grey opacity-60 hover:opacity-100'}`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Toggle checked={withHeader} onChange={setWithHeader} label="Incluir cabecera explicativa" />

          <Button variant="primary" onClick={() => navigator.clipboard?.writeText(block)} className="w-full justify-center">
            Copiar bloque completo
          </Button>

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-acento">Notas</h4>
            <ul className="space-y-1 text-[11px] text-grey">
              {ALIAS_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <CopyBlock text={block} label={`~/.${shell}rc · ${sel.length} alias`} maxH="30rem" />
          <h4 className="pt-2 text-sm font-semibold">Qué incluye cada alias</h4>
          <div className="space-y-1.5">
            {sel.map((a, i) => (
              <Reveal key={a.alias} delay={i * 0.012}>
                <div className="rounded border border-edge px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <code className="font-mono text-[12.5px] text-acento">{a.alias.trim()}</code>
                    <span className="text-grey">→</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-grey">{a.expansion}</code>
                    {a.type === 'function' && <span className="rounded border border-info/40 px-1 font-mono text-[9px] text-info">función</span>}
                  </div>
                  <p className="mt-0.5 text-[11px] text-grey/80">{a.why}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
