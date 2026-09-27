import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cable, Zap, Waves, Info, ChevronDown } from 'lucide-react'
import { ToolHeader, Badge, Reveal } from '../components/ui'

/* ───────── datos ───────── */

const T568B: { pin: number; color: string; pair: string; use: string }[] = [
  { pin: 1, color: '#f97316', pair: 'par 2 (naranja)', use: 'TX+' },
  { pin: 2, color: '#ea580c', pair: 'par 2 (naranja/blanco)', use: 'TX-' },
  { pin: 3, color: '#22c55e', pair: 'par 3 (verde/blanco)', use: 'RX+' },
  { pin: 4, color: '#3b82f6', pair: 'par 1 (azul)', use: 'PoE (modo A)' },
  { pin: 5, color: '#2563eb', pair: 'par 1 (azul/blanco)', use: 'PoE (modo A)' },
  { pin: 6, color: '#16a34a', pair: 'par 3 (verde)', use: 'RX-' },
  { pin: 7, color: '#a16207', pair: 'par 4 (marrón/blanco)', use: 'PoE (modo B)' },
  { pin: 8, color: '#854d0e', pair: 'par 4 (marrón)', use: 'PoE (modo B)' },
]

const PAIRS_INFO = [
  { name: 'Par 1 — Azul', pins: '4-5', use: 'PoE 802.3af/at (modo A) o línea telefónica en legacy', color: '#3b82f6' },
  { name: 'Par 2 — Naranja', pins: '1-2', use: 'Transmisión de datos TX+ (Gigabit: bidireccional)', color: '#f97316' },
  { name: 'Par 3 — Verde', pins: '3-6', use: 'Recepción de datos RX- (Gigabit: bidireccional)', color: '#22c55e' },
  { name: 'Par 4 — Marrón', pins: '7-8', use: 'PoE (modo B) y Gigabit: todos los pares transmiten', color: '#a16207' },
]

const CATEGORIES = [
  { cat: 'Cat5e', speed: '1 Gbps', freq: '100 MHz', dist: '100 m', note: 'El estándar mínimo actual. Gigabit con los 4 pares.', tone: 'neutral' },
  { cat: 'Cat6', speed: '1-10 Gbps', freq: '250 MHz', dist: '55 m a 10G', note: 'Menor crosstalk. 10G solo en enlaces cortos.', tone: 'info' },
  { cat: 'Cat6A', speed: '10 Gbps', freq: '500 MHz', dist: '100 m', note: '10G garantizado a 100 m. El estándar empresarial actual.', tone: 'ok' },
  { cat: 'Cat7', speed: '10 Gbps', freq: '600 MHz', dist: '100 m', note: 'Apantallado S/FTP con conectores GG45 (no es RJ45 real).', tone: 'info' },
  { cat: 'Cat8', speed: '25/40 Gbps', freq: '2000 MHz', dist: '30 m', note: 'Solo para enlaces cortos data center switch-servidor.', tone: 'accent' },
]

const CONNECTORS = [
  {
    id: 'rj45', name: 'RJ45 (8P8C)', desc: 'El conector de cobre universal. 8 contactos, enganche superior.',
    detail: 'Se crimpea con T568B en ambos extremos (cable directo) o A/B en extremos distintos (crossover, hoy obsolete: los NIC modernos negocian Auto-MDIX).',
    tips: ['Desforra 2-2.5 cm y desenrolla los pares LO MÍNIMO posible', 'Empuja hasta el fondo: los conductores deben cruzar los cuchillas del conector', 'Cat6/Cat6A usa conector específico (conductores más gruesos)'],
  },
  {
    id: 'lc', name: 'LC (Lucent Connector)', desc: 'El "mini-RJ" de fibra: el estándar actual en switches SFP y patch panels.',
    detail: 'Cierre tipo clip (como un RJ45 pequeño). Duplex LC = dos LC unidos (TX/RX). Diámetro de ferrule 1.25 mm.',
    tips: ['LC es EL conector moderno: si compras SFP+ hoy, es LC', 'Pulido UPC (azul) vs APC (verde): APC reduce el reflejo, obligatorio en FTTH GPON', 'Nunca mires el extremo de fibra activa: luz invisible que daña la retina'],
  },
  {
    id: 'sc', name: 'SC (Subscriber Connector)', desc: '"Stick and click": el cuadrado grande de FTTH de los routers de operador.',
    detail: 'Push-pull, 2.5 mm de ferrule. Común en ONT de fibra doméstica y en backbone antiguo.',
    tips: ['El típico de la caja/ONT de tu ISP', 'Existe en simplex y duplex', 'Push until click: no tuerzas'],
  },
  {
    id: 'st', name: 'ST (Straight Tip)', desc: 'El bayoneta legado: aún presente en edificios antiguos y redes de 10BASE-FL.',
    detail: 'Cierre tipo bayoneta (girar 90°). Ferrule 2.5 mm. Casi en extinción.',
    tips: ['Alinea la llave y gira a la derecha hasta que clique', 'Para desenroscar: media vuelta a la izquierda', 'Si te lo encuentras en un panel, existe el híbrido ST-LC'],
  },
  {
    id: 'mpo', name: 'MPO/MTP', desc: 'Multifibra: 12, 24 o más fibras en UN conector. Data center y 40/100G.',
    detail: 'Un solo conector para 40G-SR4 (4 fibras TX + 4 RX de 12). Las fibras van en trunks preterminados.',
    tips: ['40GBASE-SR4 = 1 MPO-12 por enlace', 'Polarity C: la parte más delicada (TX/RX cruzados)', 'La limpieza con MPO es crítica: un solo pelo de polvo = 24 fibras caídas'],
  },
]

const FIBER_TYPES = [
  { id: 'os2', name: 'OS2 (single-mode)', color: '#facc15', core: '9 µm', dist: 'hasta 100 km', use: 'Backbone entre edificios, FTTH, FTTO. Láser 1310/1550 nm.', note: 'Solo 1 modo de luz: sin dispersión modal. El rey de larga distancia.' },
  { id: 'om4', name: 'OM4 (multi-mode)', color: '#f87171', core: '50 µm', dist: '400 m a 10G / 100 m a 100G', use: 'Enlaces cortos data center con VCSEL (más baratos que laser SM).', note: 'Aguanta las VCSEL de 850 nm. El multi-mode moderno tras OM3.' },
  { id: 'om3', name: 'OM3 (multi-mode)', color: '#4ade80', core: '50 µm', dist: '300 m a 10G', use: 'Legacy reciente: la generación anterior de OM4.', note: 'Aún válida pero si compras nuevo, compra OM4.' },
  { id: 'om2', name: 'OM2 (multi-mode)', color: '#fb923c', core: '50 µm', dist: '82 m a 10G', use: 'Instalaciones antiguas con LED. Casi siempre reemplazable.', note: 'El interior naranja clásico. NO vale para 10G moderno.' },
]

const CABLE_TYPES = [
  {
    id: 'utp', name: 'UTP (sin apantallar)', icon: '🟢', desc: 'El cable de cobre estándar: 4 pares trenzados sin malla.',
    why: 'La trenza de los pares cancela interferencia por diferencial. Barato, flexible, fácil de crimpador.',
    use: 'Oficinas, casa, la mayoría de instalaciones.',
    cautions: ['Evita paralelo a cables eléctricos >30 cm', 'Radio de curvatura mínimo: 4× diámetro', 'Máximo 100 m TOTAL (90 m fijo + 10 m latiguillos)'],
  },
  {
    id: 'ftp', name: 'F/UTP (apantallado global)', icon: '🟡', desc: 'Malla de foil alrededor de los 4 pares (no de cada par).',
    why: 'El foil desvía EMI de motores, fluorescentes o radiofrecuencia.',
    use: 'Entornos industriales ligeros, aulas, edificios con mucho cableado junto.',
    cautions: ['Debes ATERRIZAR el shield en ambos extremos (patch panel con tierra)', 'Si no aterrizas, el foil es antena y empeora: mejor UTP', 'Más rígido y caro que UTP'],
  },
  {
    id: 'sftp', name: 'S/FTP (apantallado por par)', icon: '🔴', desc: 'Cada par con foil individual + malla global. El Cat7/Cat8 real.',
    why: 'Cada par blindado individualmente: crosstalk alien casi nulo. Necesario para 10G+ a 100m.',
    use: 'Data centers, broadcast, instalaciones con RF extrema.',
    cautions: ['Rígido: no apto para latiguillos de uso intensivo', 'Conectores específicos con tierra', 'El coste NO compensa en 1G: con Cat6A UTP sobra'],
  },
  {
    id: 'coax', name: 'Coaxial RG-6/RG-58', icon: '⚫', desc: 'Concentrico: centro + aislante + malla. El cable de antena/TV.',
    why: 'Diseñado para RF de alta frecuencia (antenas, CATV, CCTV analógico).',
    use: 'Antenas TV, DOCSIS de operador, CCTV antiguo, radioaficionados.',
    cautions: ['RG-6 para TV/internet de operador, RG-58 solo para radio baja frecuencia', 'Impedancia 75Ω (TV) vs 50Ω (radio/WiFi pigtails): NO mezcles', 'La malla debe conectar en TODOS los conectores: un BNC mal puesto = interferencias'],
  },
  {
    id: 'dac', name: 'DAC / AOC (twinax)', icon: '🔵', desc: 'Twinax "copper fiber": cable fijo con SFP+ integrado en los extremos.',
    why: 'Fabricado de fábrica con transceptores: cero limpieza, cero compatibilidad SFP, precio ridículo vs fibra+ópticas.',
    use: 'Enlaces switch-servidor dentro del MISMO rack (< 7 m DAC, < 30 m AOC).',
    cautions: ['DAC pasivo solo hasta ~7 m', 'AOC (Active Optical Cable) llega a 100 m pero es frágil', 'Comprueba el "vendor lock": algunos switches rechazan SFPs de otra marca (OEM code)'],
  },
]

const TOOLS = [
  { name: 'Crimpadora RJ45', use: 'Prensa los contactos del conector contra los conductores.', tip: 'Ratchet (trinquete) obligatorio: evita crimpar a medias.' },
  { name: 'Pelacables', use: 'Corta el aislante exterior sin dañar el cobre.', tip: 'Ajusta la profundidad: si ves cobre cortado, está demasiado profunda.' },
  { name: 'Punch down 110/Krone', use: 'Termina pares en rosetas y patch panels.', tip: 'Corta a 90° y tira del resto del cable con la cuchilla.' },
  { name: 'Tester de continuidad', use: 'Verifica pin 1→1, 2→2... y detecta pares cruzados.', tip: 'El tester básico NO mide longitud ni crosstalk: para eso un Fluke.' },
  { name: 'Cleaver de fibra', use: 'Corte de fibra a 90° perfecto antes de fusionar.', tip: 'Un corte malo = splice con pérdida. Siempre gasta en un cleaver decente.' },
  { name: 'Fusionadora (splicer)', use: 'Suelta arco eléctrico para fundir fibra con fibra.', tip: 'En FTTH se usa mucho el empalme mecánico rápido (fast connector) en vez de fusión.' },
  { name: 'OTDR / VFL', use: 'VFL: luz roja visible para encontrar roturas. OTDR: mide dónde y cuánta pérdida.', tip: 'El VFL (pen laser) es el melhor amigo del instalador de FTTH.' },
]

/* ───────── componente ───────── */

export default function CableDocs() {
  const [cable, setCable] = useState('utp')
  const [conn, setConn] = useState('lc')
  const [fiber, setFiber] = useState('os2')
  const [showT568A, setShowT568A] = useState(false)
  const [pulseOn, setPulseOn] = useState(true)
  const [toolsOpen, setToolsOpen] = useState(false)

  const currentCable = CABLE_TYPES.find((c) => c.id === cable)!
  const currentConn = CONNECTORS.find((c) => c.id === conn)!
  const currentFiber = FIBER_TYPES.find((f) => f.id === fiber)!

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Cable}
        title="Cable Docs & Animaciones"
        desc="Documentación visual e interactiva de cables de red: pinout RJ45 animado, apantallados, coaxial, fibra óptica con transmisión de luz y conectores LC/SC/ST/MPO"
        badge="redes"
      />

      {/* ═══════════ RJ45 / T568 ═══════════ */}
      <Reveal>
        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Zap size={18} className="text-acento" /> Pinout RJ45 — T568B (y T568A)
            </h2>
            <div className="flex gap-1.5">
              <button onClick={() => setShowT568A(false)} className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] ${!showT568A ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>T568B</button>
              <button onClick={() => setShowT568A(true)} className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] ${showT568A ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>T568A</button>
              <button onClick={() => setPulseOn((p) => !p)} className="rounded-lg border border-edge px-3 py-1.5 font-mono text-[11px] text-grey hover:text-ink">{pulseOn ? '⏸ pausar señal' : '▶ reproducir señal'}</button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* conector animado */}
            <div className="rounded-xl border border-edge bg-black/50 p-5">
              <svg viewBox="0 0 560 300" className="h-auto w-full">
                {/* cuerpo conector */}
                <rect x="20" y="40" width="90" height="220" rx="8" fill="#1a231f" stroke="#2ee88a" strokeWidth="2" />
                <text x="65" y="30" textAnchor="middle" fontSize="11" fill="#2ee88a" fontFamily="monospace">RJ45 (vista frontal)</text>
                {/* pines */}
                {T568B.map((p, i) => {
                  const aColor = [3, 2, 1, 4, 5, 6, 7, 8].indexOf(p.pin) // T568A: intercambia par 2 y 3
                  const color = showT568A ? T568A_COLORS[i] : p.color
                  const y = 55 + i * 24
                  const x = 110
                  const x2 = 470
                  return (
                    <g key={p.pin}>
                      <rect x={x} y={y - 7} width="360" height="14" rx="3" fill="#0d1512" stroke="#1f2a25" />
                      {/* señal animada */}
                      {pulseOn && (
                        <motion.rect
                          x={x} y={y - 7} height="14" rx="3" width="0"
                          fill={color} opacity="0.55"
                          animate={{ width: [0, 360], x: [x, x2] }}
                          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18, ease: 'linear' }}
                        />
                      )}
                      <text x={x + 8} y={y + 3.5} fontSize="10" fill="#94a3b8" fontFamily="monospace">{p.pin}</text>
                      <text x={x + 32} y={y + 3.5} fontSize="10" fill={color} fontFamily="monospace">■</text>
                      <text x={x + 52} y={y + 3.5} fontSize="10" fill="#e5e7eb" fontFamily="monospace">{showT568A ? `T568A pin ${p.pin}` : p.pair}</text>
                      <text x={x2 - 6} y={y + 3.5} fontSize="10" fill="#94a3b8" fontFamily="monospace" textAnchor="end">{p.use}</text>
                    </g>
                  )
                })}
              </svg>
              <p className="mt-2 text-center font-mono text-[10px] text-grey/60">
                {showT568A ? 'T568A: los pares naranja y verde se intercambian (compatible con 258A/AT&T legacy)' : 'T568B: el estándar de facto (los colores coinciden con el orden naranja/verde)'}
              </p>
            </div>

            {/* pares */}
            <div className="space-y-2">
              {PAIRS_INFO.map((p) => (
                <div key={p.name} className="rounded-lg border border-edge bg-black/30 px-3 py-2.5">
                  <p className="flex items-center gap-2 font-mono text-[11px] font-bold" style={{ color: p.color }}>
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                    {p.name} <span className="text-grey/50">pines {p.pins}</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-grey">{p.use}</p>
                </div>
              ))}
              <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-warn/90">
                ⚠ En Gigabit (1000BASE-T) los 4 pares transmiten a la vez: un par partido o mal puesto = enlace a 100 Mbps o inestable.
              </div>
            </div>
          </div>

          {/* categorías */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left font-mono text-[11.5px]">
              <thead>
                <tr className="border-b border-edge text-grey">
                  <th className="px-3 py-2">categoría</th><th className="px-3 py-2">velocidad</th><th className="px-3 py-2">frecuencia</th><th className="px-3 py-2">distancia</th><th className="px-3 py-2">notas</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => (
                  <tr key={c.cat} className="border-b border-edge/40 transition-colors hover:bg-acento/5">
                    <td className="px-3 py-2.5 font-bold text-white">{c.cat}</td>
                    <td className="px-3 py-2.5 text-acento">{c.speed}</td>
                    <td className="px-3 py-2.5 text-grey">{c.freq}</td>
                    <td className="px-3 py-2.5 text-grey">{c.dist}</td>
                    <td className="px-3 py-2.5 text-grey">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {/* ═══════════ tipos de cable ═══════════ */}
      <Reveal delay={0.06}>
        <div className="card mt-6 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <Waves size={18} className="text-acento" /> Tipos de cable: ¿cuál uso?
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {CABLE_TYPES.map((c) => (
              <button key={c.id} onClick={() => setCable(c.id)} className={`rounded-lg border px-3.5 py-2 font-mono text-xs transition-all ${cable === c.id ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'}`}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={cable} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-edge bg-black/30 p-5">
                <h3 className="font-mono text-sm font-bold text-white">{currentCable.icon} {currentCable.name}</h3>
                <p className="mt-2 text-[13px] text-grey">{currentCable.desc}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-grey"><span className="text-acento">por qué existe:</span> {currentCable.why}</p>
                <p className="mt-2 text-[13px] text-grey"><span className="text-acento">uso típico:</span> {currentCable.use}</p>
              </div>
              <div className="rounded-xl border border-warn/25 bg-warn/5 p-5">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-warn">trampas y cuidado</h4>
                <ul className="mt-3 space-y-2 text-[12.5px] text-grey">
                  {currentCable.cautions.map((c, i) => <li key={i} className="flex gap-2"><span className="text-warn">▸</span>{c}</li>)}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>

      {/* ═══════════ fibra óptica ═══════════ */}
      <Reveal delay={0.1}>
        <div className="card mt-6 p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
            <Zap size={18} className="text-warn" /> Fibra óptica: cómo viaja la luz
          </h2>
          <p className="mb-4 text-[13px] text-grey">La luz se propaga por el núcleo rebotando (reflexión total) contra el revestimiento. Single-mode = un haz recto; multi-mode = múltiples haces con distintos ángulos (dispersión modal).</p>
          <div className="flex flex-wrap gap-1.5">
            {FIBER_TYPES.map((f) => (
              <button key={f.id} onClick={() => setFiber(f.id)} className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-all ${fiber === f.id ? 'border-warn/60 bg-warn/10 text-warn' : 'border-edge text-grey hover:text-ink'}`}>
                {f.name}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-edge bg-black/50 p-5">
            <svg viewBox="0 0 800 180" className="h-auto w-full">
              {/* revestimiento */}
              <rect x="0" y="20" width="800" height="140" fill="#130d0d" stroke="#3f2d1d" strokeWidth="1" />
              {/* núcleo */}
              <rect x="0" y="72" width="800" height="36" fill={currentFiber.id === 'os2' ? '#2a1f0e' : '#1e2712'} />
              {/* reflexión total: single-mode = 1 haz casi recto, multimode = varios rebotando */}
              {(currentFiber.id === 'os2' ? [ { d: 'M0,90 L800,90' } ] : [
                { d: 'M0,90 L100,74 L200,106 L300,74 L400,106 L500,74 L600,106 L700,74 L800,90' },
                { d: 'M0,90 L66,106 L134,74 L200,106 L266,74 L334,106 L400,74 L466,106 L534,74 L600,106 L666,74 L734,106 L800,90' },
                { d: 'M0,90 L50,74 L100,106 L150,74 L200,106 L250,74 L300,106 L350,74 L400,106 L450,74 L500,106 L550,74 L600,106 L650,74 L700,106 L750,74 L800,90' },
              ]).map((p, i) => (
                <motion.path
                  key={i}
                  d={p.d}
                  fill="none"
                  stroke={currentFiber.color}
                  strokeWidth={i === 0 ? 2.2 : 1.4}
                  opacity={currentFiber.id === 'os2' ? 1 : 0.85 - i * 0.2}
                  strokeDasharray="6 6"
                  animate={pulseOn ? { strokeDashoffset: [0, -24] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                />
              ))}
              <text x="8" y="16" fontSize="10" fill="#94a3b8" fontFamily="monospace">revestimiento (cladding)</text>
              <text x="8" y="176" fontSize="10" fill="#94a3b8" fontFamily="monospace">núcleo {currentFiber.core}</text>
              {currentFiber.id !== 'os2' && <text x="640" y="16" fontSize="10" fill="#f87171" fontFamily="monospace">dispersión modal: los haces llegan desfasados → límite de distancia</text>}
            </svg>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-edge bg-black/30 px-3.5 py-3"><p className="font-mono text-[10px] uppercase tracking-wider text-grey">núcleo</p><p className="font-mono text-sm text-white">{currentFiber.core}</p></div>
            <div className="rounded-lg border border-edge bg-black/30 px-3.5 py-3"><p className="font-mono text-[10px] uppercase tracking-wider text-grey">distancia típica</p><p className="font-mono text-sm text-white">{currentFiber.dist}</p></div>
            <div className="rounded-lg border border-edge bg-black/30 px-3.5 py-3 sm:col-span-2"><p className="font-mono text-[10px] uppercase tracking-wider text-grey">uso</p><p className="text-[12px] text-grey">{currentFiber.use}</p></div>
          </div>
          <p className="mt-3 rounded-lg border border-info/25 bg-info/5 px-3.5 py-2.5 text-[12px] text-info/90">💡 {currentFiber.note}</p>
          <div className="mt-4 rounded-xl border border-bad/30 bg-bad/5 px-4 py-3 font-mono text-[11.5px] leading-relaxed text-bad">
            ⚠ SEGURIDAD: nunca mires el extremo de una fibra activa. La luz 1310/1550 nm es INVISIBLE y quema la retina sin dolor previo. Usa VFL (luz roja visible) con el enlace apagado.
          </div>
        </div>
      </Reveal>

      {/* ═══════════ conectores ═══════════ */}
      <Reveal delay={0.12}>
        <div className="card mt-6 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">Conectores de fibra</h2>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {CONNECTORS.map((c) => (
              <button key={c.id} onClick={() => setConn(c.id)} className={`rounded-xl border px-3 py-3 text-left transition-all ${conn === c.id ? 'border-acento/60 bg-acento/10' : 'border-edge hover:border-acento/40'}`}>
                <p className={`font-mono text-xs font-bold ${conn === c.id ? 'text-acento' : 'text-ink'}`}>{c.name}</p>
                <p className="mt-1 text-[10.5px] leading-snug text-grey">{c.desc.split('.')[0]}.</p>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={conn} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-edge bg-black/30 p-5">
              <h3 className="font-mono text-sm font-bold text-acento">{currentConn.name}</h3>
              <p className="mt-2 text-[13px] text-grey">{currentConn.detail}</p>
              <ul className="mt-3 space-y-1.5">
                {currentConn.tips.map((t, i) => <li key={i} className="flex gap-2 text-[12.5px] text-grey"><span className="text-acento">▸</span>{t}</li>)}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>

      {/* ═══════════ herramientas ═══════════ */}
      <Reveal delay={0.14}>
        <div className="card mt-6 p-6">
          <button onClick={() => setToolsOpen((o) => !o)} className="flex w-full items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Info size={18} className="text-acento" /> Herramientas del instalador
            </h2>
            <ChevronDown size={18} className={`text-grey transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {toolsOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {TOOLS.map((t) => (
                    <div key={t.name} className="rounded-lg border border-edge bg-black/30 px-3.5 py-3">
                      <p className="font-mono text-xs font-bold text-white">{t.name}</p>
                      <p className="mt-1 text-[11.5px] text-grey">{t.use}</p>
                      <p className="mt-1.5 text-[11px] text-acento">💡 {t.tip}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Reveal>
    </div>
  )
}

/* T568A: intercambia pares verde/naranja respecto a T568B */
const T568A_COLORS = ['#22c55e', '#16a34a', '#f97316', '#3b82f6', '#2563eb', '#ea580c', '#a16207', '#854d0e']
