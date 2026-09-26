import { useMemo, useState } from 'react'
import { ListPlus, Download } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { MUTATION_INFO, buildTargetWordlist, wordlistStats, WORDLIST_TIPS, WORDLIST_CHEATS, type MutOpt, type TargetFormData } from '../lib/wordlist'
import { download } from '../lib/util'

const ALL_MUTS: MutOpt[] = ['capital', 'lower', 'year2020-2026', 'año-nacimiento', 'sufijo-comunes', 'leet', 'dobles', 'upper', 'reverse', 'separadores']

export default function Wordlistgen() {
  const [form, setForm] = useState<TargetFormData>({ company: '', domain: '', city: '', employee: '', pet: '', hobby: '', year: '' })
  const [muts, setMuts] = useState<MutOpt[]>(['capital', 'lower', 'year2020-2026', 'sufijo-comunes'])
  const toast = useToast()

  const built = useMemo(() => buildTargetWordlist(form, muts), [form, muts])
  const stats = useMemo(() => wordlistStats(built.words), [built.words])

  const set = (k: keyof TargetFormData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleMut = (m: MutOpt) => setMuts((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]))

  const exportTxt = () => {
    if (!built.words.length) return
    download('wordlist-dirigida.txt', built.words.join('\n'), 'text/plain')
    toast(`${stats.uniq} claves exportadas`)
  }

  const fields: [keyof TargetFormData, string, string][] = [
    ['company', 'empresa / organización', 'ACME Corp'],
    ['domain', 'dominio web', 'acme.com'],
    ['city', 'ciudad', 'Madrid'],
    ['employee', 'nombre de empleado objetivo', 'Ana'],
    ['pet', 'mascota', 'Rocco'],
    ['hobby', 'hobby / afición', 'futbol'],
    ['year', 'año significativo', '2019'],
  ]

  return (
    <div>
      <ToolHeader icon={ListPlus} title="Wordlist Builder" desc="Genera wordlists dirigidas a partir de datos del objetivo (empresa, mascotas, hobbies, años) con las mutaciones que la gente realmente usa — mucho más efectiva que rockyou para auditorías con autorización" />

      <InfoBanner>
        <b>Las contraseñas humanas siguen un patrón predecible:</b> palabra conocida + año + símbolo. Esta tool explota ese patrón combinando tus semillas con mutaciones realistas (capitalización, leet parcial, sufijos). Úsalo <b>solo</b> en auditorías con autorización expresa: probar claves de sistemas ajenos sin permiso es delito.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">datos del objetivo (lo que sabes de OSINT/entrevista)</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fields.map(([k, label, ph]) => (
              <Field key={k} label={label}>
                <TextInput value={form[k]} onChange={set(k)} placeholder={ph} className="font-mono" />
              </Field>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">mutaciones ({muts.length})</h3>
          <div className="flex flex-wrap gap-2">
            {ALL_MUTS.map((m) => (
              <button key={m} onClick={() => toggleMut(m)} title={MUTATION_INFO[m]} className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-colors ${muts.includes(m) ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
                {m}
              </button>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10.5px] text-grey">estrategia detectada: {built.strategy.join(' · ') || 'rellena algún dato del objetivo'}</p>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">resultado</h3>
            <Badge tone="accent">{stats.total} generadas · {stats.uniq} únicas</Badge>
            <Badge tone="neutral">~{stats.sizeKb} KB</Badge>
            <Badge tone="info">{stats.crackHint}</Badge>
            <Button onClick={exportTxt} disabled={!built.words.length} className="ml-auto gap-2"><Download size={14} /> exportar .txt</Button>
          </div>
          <CopyBlock text={built.words.slice(0, 200).join('\n') + (built.words.length > 200 ? `\n… (${built.words.length - 200} más, exporta el .txt para la lista completa)` : '')} label="preview (200 primeras)" maxH="280" />
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">lanzarla con John / hashcat</h3>
          <div className="space-y-2">
            {WORDLIST_CHEATS.map(([cmd, what]) => (
              <div key={cmd} className="flex flex-wrap items-baseline gap-2 border-b border-edge/50 pb-2 last:border-0">
                <code className="font-mono text-[11.5px] text-acento">{cmd}</code>
                <span className="font-mono text-[10.5px] text-grey">{what}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1">
            {WORDLIST_TIPS.map((t) => <p key={t} className="font-mono text-[10.5px] text-grey">💡 {t}</p>)}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
