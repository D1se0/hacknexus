import { useMemo, useState } from 'react'
import { IdCard, RefreshCw, Layers, ScanSearch, ShieldAlert, Shuffle } from 'lucide-react'
import {
  Badge,
  Button,
  CopyBtn,
  InfoBanner,
  KV,
  Reveal,
  Select,
  TextInput,
  ToolHeader,
} from '../components/ui'
import {
  type GeneratedDoc,
  DNI_LETTERS,
  DNI_LESSONS,
  DNI_LIMITS,
  analyzeDoc,
  formatDni,
  generateDni,
  generateNie,
  sampleMrz,
} from '../lib/dnigen'

type Tab = 'single' | 'batch' | 'validate'
const TABS: { id: Tab; label: string; icon: typeof RefreshCw }[] = [
  { id: 'single', label: 'Generador', icon: Shuffle },
  { id: 'batch', label: 'Lote', icon: Layers },
  { id: 'validate', label: 'Validador', icon: ScanSearch },
]

/* ─── Vista previa estilo DNI 3.0 ─── */

function DniVisual({ doc }: { doc: GeneratedDoc }) {
  const mrz = useMemo(() => sampleMrz(), [])
  const isNie = doc.kind === 'nie'

  // foto sintética determinista según el número
  const hue = doc.numericValue % 360

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-edge bg-gradient-to-br from-[#1b2740] via-[#223354] to-[#16203a] shadow-glass">
      {/* cabecera */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-9 items-center justify-center rounded-sm bg-gradient-to-b from-[#c60b1e] via-[#ffc400] to-[#c60b1e] text-[8px] font-black text-[#40003a]">
            ESP
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">Reino de España</p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-white">Documento Nacional de Identidad</p>
          </div>
        </div>
        <span className="font-mono text-[9px] text-white/50">DNI 3.0</span>
      </div>

      <div className="flex gap-4 px-5 py-4">
        {/* foto sintética */}
        <div className="shrink-0">
          <div
            className="h-24 w-[72px] overflow-hidden rounded-md border border-white/20"
            style={{
              background: `linear-gradient(160deg, hsl(${hue} 45% 38%), hsl(${(hue + 40) % 360} 35% 22%))`,
            }}
          >
            {/* silueta avatar */}
            <div className="mx-auto mt-4 h-9 w-9 rounded-full bg-white/25" />
            <div className="mx-auto mt-1 h-10 w-14 rounded-t-full bg-white/20" />
          </div>
          <p className="mt-1 text-center font-mono text-[7px] uppercase tracking-wider text-white/40">ficticio</p>
        </div>

        {/* datos */}
        <div className="min-w-0 flex-1 space-y-1.5 font-mono">
          <div>
            <p className="text-[7px] uppercase tracking-[0.18em] text-white/50">Apellidos</p>
            <p className="text-sm font-bold tracking-wide text-white">GARCIA LOPEZ</p>
          </div>
          <div>
            <p className="text-[7px] uppercase tracking-[0.18em] text-white/50">Nombre</p>
            <p className="text-sm font-bold tracking-wide text-white">MARTA</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[7px] uppercase tracking-[0.18em] text-white/50">Sexo/Nac.</p>
              <p className="text-xs text-white/85">F · 12 03 1985</p>
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-[0.18em] text-white/50">Nacionalidad</p>
              <p className="text-xs text-white/85">ESP</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[7px] uppercase tracking-[0.18em] text-white/50">Válidez</p>
              <p className="text-xs text-white/85">31 07 2031</p>
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-[0.18em] text-white/50">Soporte nº</p>
              <p className="text-xs text-white/85">BVR123456</p>
            </div>
          </div>
          <div className="pt-1">
            <p className="text-[7px] uppercase tracking-[0.18em] text-white/50">{isNie ? 'NIE' : 'DNI'}</p>
            <p className="text-lg font-black tracking-[0.14em] text-[#ffd868]">{doc.valueDash}</p>
          </div>
        </div>
      </div>

      {/* firma + zona inferior */}
      <div className="flex items-center justify-between border-t border-white/10 px-5 py-2">
        <svg viewBox="0 0 120 28" className="h-6 w-24 opacity-80">
          <path
            d={`M4 20 C 18 ${4 + (hue % 8)}, 30 26, 44 14 S 70 4, 82 16 S 104 24, 116 8`}
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
          {isNie ? 'Extranjería' : 'Laboratorio'}
        </span>
      </div>

      {/* MRZ TD1 real con checks 7-3-1 */}
      <div className="border-t border-white/10 bg-black/35 px-5 py-3 font-mono text-[11px] leading-5 tracking-[0.08em] text-[#c8f5a8]">
        {mrz.lines.map((l, i) => (
          <p key={i} className="whitespace-pre overflow-hidden">{l}</p>
        ))}
      </div>
    </div>
  )
}

/* ─── Página ─── */

export default function DniGen() {
  const [tab, setTab] = useState<Tab>('single')

  /* single */
  const [kind, setKind] = useState<'dni' | 'nie'>('dni')
  const [prefix, setPrefix] = useState<'X' | 'Y' | 'Z'>('Y')
  const [doc, setDoc] = useState<GeneratedDoc>(() => generateDni())

  function regen() {
    setDoc(kind === 'dni' ? generateDni() : generateNie(prefix))
  }

  /* lote */
  const [count, setCount] = useState(8)
  const batch = useMemo(() => {
    const out: GeneratedDoc[] = []
    for (let i = 0; i < Math.min(Math.max(count, 1), 25); i++) {
      out.push(kind === 'dni' ? generateDni() : generateNie(prefix))
    }
    return out
  }, [kind, prefix, count])

  /* validador */
  const [valInput, setValInput] = useState('')
  const validation = useMemo(() => analyzeDoc(valInput), [valInput])

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={IdCard}
        title="DniGen"
        desc="Generador de DNI/NIE españoles FICTICIOS con el algoritmo real: letra módulo 23 (tabla TRWAGMYFPDXBNJZSQVHLCKE), NIE X/Y/Z con el truco del 0/10/20 millones, MRZ ICAO 9303 del reverso y validador explicado paso a paso"
        badge="Ronda 20"
      />

      <InfoBanner>
        La letra del DNI es <b>aritmética pública desde los años 60</b>: número mod 23 indexa la tabla
        TRWAGMYFPDXBNJZSQVHLCKE. No es un secreto ni genera identidad real: todo lo generado es <b>ficticio</b> y la
        existencia de un documento la acredita solo el Registro Civil. Sirve para validar formularios, detectar letras
        inconsistentes y entender la MRZ del reverso. <b>Nada sale de tu navegador.</b>
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'single' && (
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-xl border border-edge bg-panel p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Tipo</span>
                    <Select
                      value={kind}
                      onChange={(e) => setKind(e.target.value as 'dni' | 'nie')}
                      options={[
                        { value: 'dni', label: 'DNI (8 dígitos + letra)' },
                        { value: 'nie', label: 'NIE (X/Y/Z + 7 dígitos)' },
                      ]}
                    />
                  </label>
                  {kind === 'nie' && (
                    <label className="block">
                      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Inicial</span>
                      <Select value={prefix} onChange={(e) => setPrefix(e.target.value as 'X' | 'Y' | 'Z')} options={[{ value: 'X', label: 'X (=0 millones)' }, { value: 'Y', label: 'Y (=10 millones)' }, { value: 'Z', label: 'Z (=20 millones)' }]} />
                    </label>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={regen} className="gap-2">
                    <RefreshCw size={14} /> Generar {kind.toUpperCase()}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-edge bg-panel">
                <KV k="Documento" v={<span className="font-bold text-acento">{doc.value}</span>} copyable />
                <KV k="Con guion" v={doc.valueDash} />
                <KV k="Letra de control" v={<Badge tone="accent">{doc.letter}</Badge>} />
                <KV k="Valor numérico" v={doc.numericValue.toLocaleString('es-ES')} />
                <KV k="mod 23" v={`${doc.numericValue % 23} → posición en la tabla`} />
                <KV k="Tabla" v={<span className="break-all text-xs">{DNI_LETTERS}</span>} />
              </div>
            </div>

            <div className="space-y-4">
              <DniVisual doc={doc} />
              <div className="flex flex-wrap items-center gap-2">
                <CopyBtn text={doc.value} label="copiar documento" />
                <CopyBtn text={`${doc.value}\nGARCIA LOPEZ\nMARTA\n${sampleMrz().lines.join('\n')}`} label="copiar ficha" />
                <Badge tone="warn">uso educativo únicamente</Badge>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'batch' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-edge bg-panel p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Tipo</span>
                  <Select value={kind} onChange={(e) => setKind(e.target.value as 'dni' | 'nie')} options={[{ value: 'dni', label: 'DNI' }, { value: 'nie', label: 'NIE' }]} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Cantidad (1-25)</span>
                  <TextInput type="number" min={1} max={25} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} />
                </label>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-edge bg-panel">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-grey">
                    <th className="px-4 py-2.5">Documento</th>
                    <th className="px-4 py-2.5">Número</th>
                    <th className="px-4 py-2.5">Letra</th>
                    <th className="px-4 py-2.5">mod 23</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.map((d, i) => (
                    <tr key={i} className="border-b border-edge/50 last:border-0">
                      <td className="px-4 py-2 font-bold text-ink">{d.value}</td>
                      <td className="px-4 py-2 text-grey">{d.numberPart}</td>
                      <td className="px-4 py-2 text-acento">{d.letter}</td>
                      <td className="px-4 py-2 text-grey">{d.mod23}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'validate' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-edge bg-panel p-4">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">DNI o NIE a validar (acepta guiones y espacios)</span>
                <TextInput value={valInput} onChange={(e) => setValInput(e.target.value)} placeholder="01234567-Z · Y-1234567-L" />
              </label>
              <p className="mt-2 text-xs text-grey">
                Comprueba tú mismo: {formatDni(12345678)} — el 12345678 mod 23 = {12345678 % 23} da la letra «{DNI_LETTERS[12345678 % 23]}».
              </p>
            </div>
            {validation.normalized && (
              <div className="space-y-4">
                <div className="rounded-xl border border-edge bg-panel">
                  <KV k="Tipo" v={validation.kind === 'dni' ? 'DNI' : validation.kind === 'nie' ? 'NIE' : 'desconocido'} />
                  <KV k="Normalizado" v={validation.normalized} />
                  <KV k="Letra recibida" v={validation.letter || '—'} />
                  <KV k="Letra esperada" v={<span className="font-bold text-acento">{validation.expectedLetter || '—'}</span>} />
                  <KV k="Cálculo" v={`${validation.numericValue.toLocaleString('es-ES')} mod 23 = ${validation.mod23}`} />
                  <KV
                    k="Veredicto"
                    v={
                      validation.verdict === 'valido' ? (
                        <Badge tone="ok">letra correcta (formato)</Badge>
                      ) : validation.verdict === 'letra-erronea' ? (
                        <Badge tone="bad">letra errónea</Badge>
                      ) : (
                        <Badge tone="warn">formato no reconocido</Badge>
                      )
                    }
                  />
                </div>
                <div className={`rounded-lg border p-4 text-xs ${validation.verdict === 'valido' ? 'border-ok/30 bg-ok/5 text-ok' : validation.verdict === 'letra-erronea' ? 'border-bad/30 bg-bad/5 text-bad' : 'border-warn/30 bg-warn/5 text-warn'}`}>
                  {validation.explanation}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-edge bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Lecciones del documento nacional</h3>
          </div>
          <div className="space-y-2">
            {DNI_LESSONS.map((l) => (
              <div key={l.title} className="rounded-lg border border-edge bg-black/20 p-3">
                <span className="text-sm font-semibold">{l.title}</span>
                <p className="mt-1 text-xs text-grey">{l.lesson}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-edge bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-grey">
            {DNI_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
