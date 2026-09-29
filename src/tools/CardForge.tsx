import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, RefreshCw, Wand2, Layers, ScanSearch, ShieldAlert } from 'lucide-react'
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
  NETWORKS,
  type Network,
  type GeneratedCard,
  analyzeCard,
  generateBatch,
  generateCard,
  networkById,
  CARDGEN_LESSONS,
  CARDGEN_LIMITS,
  MII_MAP,
} from '../lib/cardgen'

type Tab = 'single' | 'batch' | 'analyze'
const TABS: { id: Tab; label: string; icon: typeof CreditCard }[] = [
  { id: 'single', label: 'Generador', icon: Wand2 },
  { id: 'batch', label: 'Lote', icon: Layers },
  { id: 'analyze', label: 'Analizador', icon: ScanSearch },
]

/* ─── Tarjeta 3D visual ─── */

function CardVisual({ card, flipped }: { card: GeneratedCard; flipped: boolean }) {
  const groups = card.number
  return (
    <div className="[perspective:1200px]">
      <motion.div
        className="relative aspect-[1.586/1] w-full max-w-md"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Frente */}
        <div
          className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-glass"
          style={{ background: card.gradient, backfaceVisibility: 'hidden' }}
        >
          {/* brillo decorativo */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-black/20 blur-2xl" />

          <div className="flex items-start justify-between">
            <div className="h-8 w-11 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-inner">
              <div className="mt-1 ml-1 h-6 w-9 rounded-sm border border-yellow-700/30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 3px, rgba(0,0,0,0.08) 3px 6px)' }} />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">{card.bank}</span>
          </div>

          {/* número con fuente mono grande */}
          <div className="font-mono text-[clamp(1.05rem,4.2vw,1.5rem)] font-bold tracking-[0.12em] text-white drop-shadow">
            {groups}
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/60">Cardholder</p>
              <p className="truncate font-mono text-sm font-semibold tracking-wider text-white">{card.holder}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/60">Expires</p>
              <p className="font-mono text-sm font-semibold tracking-wider text-white">{card.expiry}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-white/50">FICTITIA · LABORATORIO</span>
            <span className="font-mono text-lg font-black italic tracking-tight" style={{ color: card.accent }}>
              {card.networkName}
            </span>
          </div>
        </div>

        {/* Dorso (flip) */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl shadow-glass"
          style={{ background: card.gradient, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
        >
          <div className="mt-5 h-10 w-full bg-black/80" />
          <div className="px-5 pt-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 flex-1 items-center justify-end rounded bg-white/90 px-3 font-mono text-sm italic text-black">
                {card.cvc}
              </div>
            </div>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/60">CVC/CVV — firma al dorso</p>
            <div className="mt-3 space-y-1">
              <div className="h-2 w-3/4 rounded bg-white/25" />
              <div className="h-2 w-2/3 rounded bg-white/20" />
              <div className="h-2 w-1/2 rounded bg-white/15" />
            </div>
            <p className="mt-3 font-mono text-[9px] text-white/50">
              Esta tarjeta no existe: generada localmente con Luhn para aprender el formato.
            </p>
          </div>
          <div className="absolute bottom-3 right-4 font-mono text-lg font-black italic" style={{ color: card.accent }}>
            {card.networkName}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Página ─── */

export default function CardForge() {
  const [tab, setTab] = useState<Tab>('single')

  /* single */
  const [network, setNetwork] = useState<Network>('visa')
  const [bin, setBin] = useState('')
  const [holder, setHolder] = useState('')
  const [card, setCard] = useState<GeneratedCard>(() => generateCard('visa'))
  const [flipped, setFlipped] = useState(false)

  function regen() {
    setCard(generateCard(network, { bin: bin || undefined, holder: holder || undefined }))
    setFlipped(false)
  }

  /* batch */
  const [batchNet, setBatchNet] = useState<Network>('visa')
  const [count, setCount] = useState(5)
  const batch = useMemo(() => (count > 0 ? generateBatch(batchNet, Math.min(count, 20)) : []), [batchNet, count])

  /* analyze */
  const [anInput, setAnInput] = useState('')
  const analysis = useMemo(() => analyzeCard(anInput), [anInput])

  const def = networkById(network)

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={CreditCard}
        title="CardForge"
        desc="Generador de tarjetas de crédito FICTICIAS con Luhn real (ISO/IEC 7812) y prefijos IIN de 7 redes: preview animada por red, lote, completar BIN y analizador de números pegados — laboratorio de formato, no de fraude"
        badge="Ronda 20"
      />

      <InfoBanner>
        El algoritmo de <b>Luhn es aritmética pública de 1954</b> contra errores de tecleo: NO es un secreto ni genera
        dinero. Todo lo que sale aquí es <b>inservible</b> — no existe en ningún emisor, no tiene cuenta y no supera una
        autorización real (eso decide el banco online, no un dígito de control). Sirve para entender qué comprueba un
        formulario de pago. <b>Nada sale de tu navegador.</b>
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
            {/* Controles */}
            <div className="space-y-4">
              <div className="rounded-xl border border-edge bg-panel p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Red</span>
                    <Select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value as Network)}
                      options={NETWORKS.map((n) => ({ value: n.id, label: n.name }))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">BIN (opcional, 6-8 dígitos)</span>
                    <TextInput value={bin} onChange={(e) => setBin(e.target.value.replace(/[^\d]/g, '').slice(0, 8))} placeholder={def.prefixes[0]} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Titular (opcional)</span>
                    <TextInput value={holder} onChange={(e) => setHolder(e.target.value.slice(0, 26))} placeholder="Nombre Apellido" />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={regen} className="gap-2">
                    <RefreshCw size={14} /> Generar tarjeta
                  </Button>
                  <Button variant="ghost" onClick={() => setFlipped((f) => !f)} className="gap-2">
                    ⟲ Dar la vuelta
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-edge bg-panel">
                <KV k="Red" v={card.networkName} />
                <KV k="Dígitos" v={card.numberDigits.length} />
                <KV k="BIN" v={card.numberDigits.slice(0, 6)} copyable />
                <KV k="Luhn" v={<Badge tone="ok">checksum OK (ficticia)</Badge>} />
                <KV k="CVC" v={`${card.cvc.length} dígitos (no verificable localmente)`} />
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <CardVisual card={card} flipped={flipped} />
              <div className="flex flex-wrap items-center gap-2">
                <CopyBtn text={card.numberDigits} label="copiar número" />
                <CopyBtn text={`${card.number} | ${card.holder} | ${card.expiry} | ${card.cvc}`} label="copiar todo" />
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
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Red</span>
                  <Select value={batchNet} onChange={(e) => setBatchNet(e.target.value as Network)} options={NETWORKS.map((n) => ({ value: n.id, label: n.name }))} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Cantidad (1-20)</span>
                  <TextInput type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
                </label>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-edge bg-panel">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-grey">
                    <th className="px-4 py-2.5">Número</th>
                    <th className="px-4 py-2.5">Titular</th>
                    <th className="px-4 py-2.5">Caduca</th>
                    <th className="px-4 py-2.5">CVC</th>
                    <th className="px-4 py-2.5">Banco</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.map((c, i) => (
                    <tr key={i} className="border-b border-edge/50 last:border-0">
                      <td className="px-4 py-2 text-ink">{c.number}</td>
                      <td className="px-4 py-2 text-grey">{c.holder}</td>
                      <td className="px-4 py-2 text-grey">{c.expiry}</td>
                      <td className="px-4 py-2 text-grey">{c.cvc}</td>
                      <td className="px-4 py-2 text-grey">{c.bank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'analyze' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-edge bg-panel p-4">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">Número a analizar (con o sin espacios)</span>
                <TextInput value={anInput} onChange={(e) => setAnInput(e.target.value)} placeholder="4539 6570 1234 5673" />
              </label>
            </div>
            {analysis.digits && (
              <div className="space-y-4">
                <div className="rounded-xl border border-edge bg-panel">
                  <KV k="Red detectada" v={analysis.network ? <Badge tone="info">{analysis.network.name}</Badge> : <Badge tone="warn">desconocida</Badge>} />
                  <KV k="Luhn" v={analysis.luhnOk ? <Badge tone="ok">OK</Badge> : <Badge tone="bad">FALLA</Badge>} />
                  <KV k="Longitud" v={analysis.lengthOk ? <Badge tone="ok">típica de la red</Badge> : <Badge tone="warn">atípica</Badge>} />
                  <KV k="MII (1er dígito)" v={`${analysis.digits[0]} — ${analysis.mii}`} />
                  <KV k="BIN" v={analysis.bin} copyable />
                </div>
                <div className="rounded-lg border border-info/30 bg-info/5 p-4 text-xs text-info">
                  {analysis.explanation}
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
            <h3 className="text-sm font-semibold">Lecciones del formato de pago</h3>
          </div>
          <div className="space-y-2">
            {CARDGEN_LESSONS.map((l) => (
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
            {CARDGEN_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
