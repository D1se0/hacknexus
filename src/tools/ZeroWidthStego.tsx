import { useMemo, useState } from 'react'
import { Droplet, Eraser, Eye, Search } from 'lucide-react'
import {
  Badge,
  Button,
  CopyBlock,
  InfoBanner,
  KV,
  Reveal,
  TextArea,
  ToolHeader,
} from '../components/ui'
import {
  ZW_LIMITS,
  ZW_MODE_INFO,
  ZW_NAMES,
  ZW_USE_CASES,
  countZw,
  stegoRatio,
  zwDecode,
  zwEncode,
  zwSanitize,
} from '../lib/zerowidth'
import type { ZWMode } from '../lib/zerowidth'

type Tab = 'hide' | 'seek' | 'clean'

const TABS: { id: Tab; label: string; icon: typeof Droplet }[] = [
  { id: 'hide', label: 'Ocultar', icon: Droplet },
  { id: 'seek', label: 'Extraer', icon: Search },
  { id: 'clean', label: 'Sanitizar', icon: Eraser },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-acento/60'

export default function ZeroWidthStego() {
  const [tab, setTab] = useState<Tab>('hide')

  /* Ocultar */
  const [carrier, setCarrier] = useState(
    'Esta reseña parece completamente normal y no esconde nada: nadie revisaría un texto tan aburrido.',
  )
  const [secret, setSecret] = useState('Reunión jueves 18h, puerta trasera')
  const [mode, setMode] = useState<ZWMode>('dense')
  const encoded = useMemo(() => {
    try {
      return { ok: true as const, res: zwEncode(carrier, secret, mode) }
    } catch (e) {
      return { ok: false as const, err: e instanceof Error ? e.message : 'Error codificando' }
    }
  }, [carrier, secret, mode])

  /* Extraer */
  const [stegoText, setStegoText] = useState('')
  const decoded = useMemo(() => (stegoText ? zwDecode(stegoText) : null), [stegoText])

  /* Limpiar */
  const [dirtyText, setDirtyText] = useState('')
  const clean = useMemo(() => (dirtyText ? zwSanitize(dirtyText) : null), [dirtyText])

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={Droplet}
        title="Zero-Width Stego"
        desc="Tinta invisible en texto plano: oculta mensajes con caracteres de ancho cero (3 modos), extrae tinta sospechosa y sanitiza entrada no confiable — 100% offline"
        badge="Ronda 17"
      />

      <InfoBanner>
        El portador dice una cosa; la tinta invisible dice otra. Úsalo para <b>watermarking de filtraciones</b> (marcar
        documentos por destinatario), verificar copias de tu contenido o entender cómo rompen filtros los spammers. El
        sanitizer es la defensa: pasa por él <b>todo texto no confiable</b>.
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'hide' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                    Texto portador (visible)
                  </label>
                  <TextArea value={carrier} onChange={(e) => setCarrier(e.target.value)} rows={5} placeholder="Texto inocente que todo el mundo puede leer…" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                    Mensaje secreto (invisible)
                  </label>
                  <TextArea value={secret} onChange={(e) => setSecret(e.target.value)} rows={5} placeholder="El mensaje oculto…" />
                </div>
              </div>
              <div className="mt-4 max-w-md">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Modo de tinta</label>
                <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as ZWMode)}>
                  {(Object.keys(ZW_MODE_INFO) as ZWMode[]).map((m) => (
                    <option key={m} value={m}>
                      {ZW_MODE_INFO[m].name} — {ZW_MODE_INFO[m].capacity}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-xs text-white/50">{ZW_MODE_INFO[mode].note}</p>
            </div>

            {encoded.ok ? (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <div className="mb-3 grid gap-x-6 sm:grid-cols-3">
                  <KV k="Marcas insertadas" v={String(encoded.res.marks)} />
                  <KV k="Bits del mensaje" v={`${encoded.res.bitsNeeded} (${ZW_MODE_INFO[mode].bitsPerMark}/marca)`} />
                  <KV k="Ratio tinta/texto" v={stegoRatio(encoded.res.output).ratio} />
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Texto con tinta invisible
                </p>
                <CopyBlock text={encoded.res.output} label="stego-text" maxH="10rem" />
                <p className="mt-2 text-xs text-warn">
                  ⚠ Usa el botón de copiar del bloque: si seleccionas a mano es fácil dejar marcas fuera y el mensaje
                  llega truncado.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">{encoded.err}</div>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'seek' && (
        <Reveal>
          <div className="rounded-xl border border-white/10 bg-panel p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
              Texto sospechoso (¿lleva tinta?)
            </label>
            <TextArea value={stegoText} onChange={(e) => setStegoText(e.target.value)} rows={6} placeholder="Pega aquí el texto que quieres inspeccionar…" />
            {decoded && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-x-6 sm:grid-cols-3">
                  <KV k="Marcas encontradas" v={String(decoded.marks)} />
                  <KV k="Modo detectado" v={ZW_MODE_INFO[decoded.modeUsed].name} />
                  <KV k="Invisibles en bruto" v={String(countZw(stegoText))} />
                </div>
                {Object.keys(decoded.foundChars).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(decoded.foundChars).map(([ch, n]) => (
                      <Badge key={ch} tone="info">
                        {ZW_NAMES[ch] ?? ch} ×{n}
                      </Badge>
                    ))}
                  </div>
                )}
                {decoded.message ? (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">
                      Mensaje oculto extraído
                    </p>
                    <CopyBlock text={decoded.message} label="secreto" maxH="8rem" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {decoded.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-warn">
                        ⚠ {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'clean' && (
        <Reveal>
          <div className="rounded-xl border border-white/10 bg-panel p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
              Texto no confiable a limpiar
            </label>
            <TextArea value={dirtyText} onChange={(e) => setDirtyText(e.target.value)} rows={6} placeholder="Comentario de usuario, bio, nombre de fichero… cualquier entrada que no controlas" />
            {clean && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-x-6 sm:grid-cols-3">
                  <KV k="Caracteres eliminados" v={String(clean.totalRemoved)} />
                  <KV k="Contenía bidi" v={clean.hadBidi ? 'SÍ (spoof de dirección)' : 'no'} />
                  <KV k="Longitud antes → después" v={`${Array.from(dirtyText).length} → ${Array.from(clean.cleaned).length}`} />
                </div>
                {clean.removed.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {clean.removed.map((r, i) => (
                      <Badge key={i} tone="bad">
                        {r.name} ×{r.count}
                      </Badge>
                    ))}
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Texto limpio</p>
                  <CopyBlock text={clean.cleaned} label="sanitized" maxH="10rem" />
                </div>
                <p className="text-xs text-white/50">
                  Elimina: zero-width (200B–200F), bidi (202A–202E), isolates (2066–2069), WORD JOINER, BOM, soft hyphen y
                  tags Unicode (E0000–E007F).
                </p>
              </div>
            )}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Eye size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Usos reales: ofensiva y defensa</h3>
          </div>
          <div className="space-y-2">
            {ZW_USE_CASES.map((u) => (
              <div key={u.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2">
                  <Badge tone={u.side === 'ofensiva' ? 'bad' : u.side === 'defensa' ? 'info' : 'ok'}>{u.side}</Badge>
                  <span className="text-sm font-semibold">{u.title}</span>
                </div>
                <p className="mt-1 text-xs text-white/60">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {ZW_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
