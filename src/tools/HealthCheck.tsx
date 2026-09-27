import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Cpu, BatteryCharging, HardDrive, MemoryStick, Wifi, CircuitBoard, ShieldCheck, Wrench, ClipboardCheck } from 'lucide-react'
import { ToolHeader, Field, TextInput, Badge, Reveal, Button } from '../components/ui'

/* ───────── tipos ───────── */

interface ComponentState {
  id: string
  name: string
  icon: React.ElementType
  health: number // 0-100
  status: 'ok' | 'warn' | 'bad' | 'unknown'
  detail: string
  advice: string[]
  replaceIn?: string
}

interface ManualComp {
  id: string
  name: string
  years: number
  hoursPerDay: number
}

const MANUAL_COMPONENTS: { id: string; name: string; icon: string; lifeYears: number; desc: string }[] = [
  { id: 'ssd', name: 'SSD SATA/NVMe', icon: '💾', lifeYears: 8, desc: 'Vida por celdas NAND (TBW). El wear-leveling reparte escrituras; un SSD doméstico sobrevive fácilmente 10+ años.' },
  { id: 'hdd', name: 'HDD mecánico', icon: '📀', lifeYears: 6, desc: 'Fallan por rodamientos y cabezales. Regla: 3-5 años uso continuo, más si vibra o calienta.' },
  { id: 'psu', name: 'Fuente (PSU)', icon: '⚡', lifeYears: 10, desc: 'Los condensadores envejecen con CALOR. Una fuente de calidad dura 10-15 años; una mediocre, 5.' },
  { id: 'gpu', name: 'GPU', icon: '🎮', lifeYears: 8, desc: 'Muere por ventilador seco o pasta seca antes que por el chip. Limpieza y repaste la alargan.' },
  { id: 'fan', name: 'Ventiladores', icon: '🌀', lifeYears: 5, desc: 'Rozamientos de rodamiento: los primeros en morir. Ruido/chaqueo = aviso.' },
  { id: 'battery', name: 'Batería laptop', icon: '🔋', lifeYears: 4, desc: '300-1000 ciclos según calidad. El calor y el 100% constante la matan.' },
  { id: 'mobo', name: 'Placa base', icon: '🧩', lifeYears: 12, desc: 'Dura lo que sus condensadores. Suele sobrevivir a varias generaciones de CPU.' },
  { id: 'ram', name: 'RAM', icon: '🧠', lifeYears: 15, desc: 'Casi eterna si no hay sobretensión. Los errores de memoria suelen ser XMP agresivo, no edad.' },
  { id: 'thermal', name: 'Pasta térmica', icon: '🥫', lifeYears: 3, desc: 'Se seca: +15-30°C en carga. Repaste cada 2-3 años (cerámica) o 5+ (metal líquido).' },
  { id: 'kb', name: 'Teclado / ratón', icon: '⌨️', lifeYears: 7, desc: 'Mecánicos: switches soldables (50M pulsos). Membrana: se cambia entero.' },
  { id: 'monitor', name: 'Monitor', icon: '🖥️', lifeYears: 10, desc: 'Los LED del panel degradan con el brillo al máximo; el capacitor de la fuente es el punto débil.' },
  { id: 'ups', name: 'SAI/UPS', icon: '🔌', lifeYears: 5, desc: 'La batería interna muere en 3-5 años aunque no lo uses. Reemplazo barato vs perder datos.' },
]

/* ───────── checks reales del navegador ───────── */

async function checkBattery(): Promise<{ level: number; charging: boolean } | null> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> }
    if (!nav.getBattery) return null
    const b = await nav.getBattery()
    return { level: Math.round(b.level * 100), charging: b.charging }
  } catch { return null }
}

interface NetInfo { effectiveType: string; downlink?: number; rtt?: number; saveData: boolean }
function netInfo(): NetInfo | null {
  const nav = navigator as Navigator & { connection?: { effectiveType: string; downlink?: number; rtt?: number; saveData: boolean } }
  if (!nav.connection) return null
  const c = nav.connection
  return { effectiveType: c.effectiveType ?? '?', downlink: c.downlink, rtt: c.rtt, saveData: c.saveData ?? false }
}

async function checkStorage(): Promise<{ used: number; quota: number } | null> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (!est?.quota) return null
    return { used: est.usage ?? 0, quota: est.quota }
  } catch { return null }
}

function gpuInfo(): string | null {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    if (!gl) return null
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return gl.getParameter(gl.RENDERER) as string
    return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
  } catch { return null }
}

/* heurística de rendimiento: benchmark simple y honesto (no es PassMark) */
function cpuScore(): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now()
    let ops = 0
    // cálculo puro 150 ms: primes con filtro básico
    const end = start + 150
    const tick = () => {
      const t0 = performance.now()
      while (performance.now() < Math.min(end, t0 + 30)) {
        let n = ops + 2
        let isPrime = n > 1
        for (let d = 2; d * d <= n; d++) if (n % d === 0) { isPrime = false; break }
        if (isPrime) ops++
        else ops++
      }
      if (performance.now() < end) requestAnimationFrame(tick)
      else resolve(Math.round(ops / 15)) // ops por ms ≈ kOps/s
    }
    tick()
  })
}

/* ───────── componente ───────── */

export default function HealthCheck() {
  const [manual, setManual] = useState<Record<string, ManualComp>>({
    ssd: { id: 'ssd', name: 'SSD', years: 3, hoursPerDay: 8 },
    psu: { id: 'psu', name: 'PSU', years: 5, hoursPerDay: 8 },
    gpu: { id: 'gpu', name: 'GPU', years: 4, hoursPerDay: 6 },
    battery: { id: 'battery', name: 'Batería', years: 2, hoursPerDay: 5 },
  })
  const [live, setLive] = useState<{
    cores?: number; memoryGb?: number; battery?: { level: number; charging: boolean } | null
    net?: NetInfo | null; storage?: { used: number; quota: number } | null; gpu?: string | null; score?: number
  }>({})
  const [scanning, setScanning] = useState(false)

  const runScan = async () => {
    setScanning(true)
    const score = await cpuScore()
    const battery = await checkBattery()
    setLive({
      cores: navigator.hardwareConcurrency,
      memoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      battery, net: netInfo(), storage: await checkStorage(), gpu: gpuInfo(), score,
    })
    setScanning(false)
  }

  useEffect(() => { void runScan() }, [])

  /* estado de componentes manuales */
  const components: ComponentState[] = useMemo(() => {
    return MANUAL_COMPONENTS.map((c) => {
      const m = manual[c.id]
      if (!m) return { id: c.id, name: c.name, icon: Activity, health: 0, status: 'unknown' as const, detail: 'no configurado: añade su edad en el panel de abajo', advice: [], replaceIn: undefined }
      // desgaste: años de uso vs vida útil, ponderado por horas/día (8h = factor 1)
      const wear = Math.min(1.4, (m.years * (m.hoursPerDay / 8)) / c.lifeYears)
      const health = Math.max(0, Math.round(100 * (1 - Math.min(1, wear))))
      const status = health >= 70 ? 'ok' : health >= 40 ? 'warn' : 'bad'
      const remaining = c.lifeYears - m.years * (m.hoursPerDay / 8)
      return {
        id: c.id, name: c.name, icon: Activity, health, status,
        detail: `${m.years} año(s) a ${m.hoursPerDay} h/día ≈ ${(m.years * m.hoursPerDay * 365).toLocaleString('es-ES')} h de uso sobre ~${(c.lifeYears * 365 * 8).toLocaleString('es-ES')} h estimadas`,
        advice: adviceFor(c.id, health),
        replaceIn: remaining > 0 ? `~${remaining.toFixed(1)} años de vida estimada` : 'vida útil agotada: planifica reemplazo',
      }
    })
  }, [manual])

  const global = Math.round(components.filter((c) => c.status !== 'unknown').reduce((a, c) => a + c.health, 0) / Math.max(1, components.filter((c) => c.status !== 'unknown').length))
  const toReplace = components.filter((c) => c.status === 'bad')
  const toWatch = components.filter((c) => c.status === 'warn')

  const setComp = (id: string, patch: Partial<ManualComp>) =>
    setManual((m) => ({ ...m, [id]: { ...(m[id] ?? { id, name: id, years: 0, hoursPerDay: 8 }), ...patch } }))

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Activity}
        title="Hardware Health Check"
        desc="Salud de tu equipo: escaneo en vivo de lo que el navegador puede ver + cálculo de desgaste por antigüedad de componentes con plan de reemplazo"
        badge="100% local"
      />

      {/* resumen global */}
      <Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card flex items-center gap-4 p-5">
            <div className="relative">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="36" fill="none" stroke="#1f2a25" strokeWidth="8" />
                <motion.circle
                  cx="42" cy="42" r="36" fill="none"
                  stroke={global >= 70 ? '#2ee88a' : global >= 40 ? '#f59e0b' : '#f43f5e'}
                  strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 36}
                  initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - global / 100) }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  transform="rotate(-90 42 42)"
                />
                <text x="42" y="47" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#fff" fontFamily="monospace">{global}</text>
              </svg>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-grey">salud global</p>
              <p className="mt-1 text-sm text-grey">
                {toReplace.length > 0 ? `${toReplace.length} componente(s) para cambiar` : toWatch.length > 0 ? `${toWatch.length} a vigilar` : 'todo en orden'}
              </p>
            </div>
          </div>
          <div className="card p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-grey">🛠️ cambiar ya</p>
            {toReplace.length === 0 ? <p className="mt-2 font-mono text-sm text-ok">nada crítico</p> : (
              <ul className="mt-2 space-y-1">
                {toReplace.map((c) => <li key={c.id} className="font-mono text-xs text-bad">• {c.name} ({c.health}%)</li>)}
              </ul>
            )}
          </div>
          <div className="card p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-grey">👀 vigilar</p>
            {toWatch.length === 0 ? <p className="mt-2 font-mono text-sm text-ok">nada en zona amarilla</p> : (
              <ul className="mt-2 space-y-1">
                {toWatch.map((c) => <li key={c.id} className="font-mono text-xs text-warn">• {c.name} ({c.health}%)</li>)}
              </ul>
            )}
          </div>
        </div>
      </Reveal>

      {/* escaneo en vivo */}
      <Reveal delay={0.06}>
        <div className="card mt-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck size={18} className="text-acento" /> Escaneo en vivo (lo que tu navegador puede ver)
            </h2>
            <Button onClick={runScan} disabled={scanning} variant="ghost">{scanning ? 'escaneando…' : 're-escanear'}</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-edge bg-black/30 p-4">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-grey"><Cpu size={12} /> CPU</p>
              <p className="mt-1.5 font-mono text-lg font-bold text-white">{live.cores ?? '?'} hilos</p>
              {live.score && <p className="font-mono text-[11px] text-grey">benchmark local: {live.score} kOps/s</p>}
            </div>
            <div className="rounded-lg border border-edge bg-black/30 p-4">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-grey"><MemoryStick size={12} /> RAM</p>
              <p className="mt-1.5 font-mono text-lg font-bold text-white">{live.memoryGb ? `${live.memoryGb} GB+` : 'no expuesto'}</p>
              <p className="font-mono text-[10px] text-grey/60">deviceMemory (aproximado por el navegador)</p>
            </div>
            <div className="rounded-lg border border-edge bg-black/30 p-4">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-grey"><CircuitBoard size={12} /> GPU</p>
              <p className="mt-1.5 truncate font-mono text-[11.5px] text-white" title={live.gpu ?? ''}>{live.gpu ?? 'no expuesto'}</p>
            </div>
            <div className="rounded-lg border border-edge bg-black/30 p-4">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-grey"><BatteryCharging size={12} /> Batería</p>
              {live.battery ? (
                <>
                  <p className="mt-1.5 font-mono text-lg font-bold text-white">{live.battery.level}%</p>
                  <p className="font-mono text-[10px] text-grey">{live.battery.charging ? '⚡ cargando' : 'en descarga'}</p>
                </>
              ) : <p className="mt-1.5 font-mono text-sm text-grey">no soportado (Firefox)</p>}
            </div>
            <div className="rounded-lg border border-edge bg-black/30 p-4 sm:col-span-2">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-grey"><HardDrive size={12} /> Almacenamiento del navegador</p>
              {live.storage ? (
                <>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-edge">
                    <motion.div className="h-full rounded-full bg-acento" initial={{ width: 0 }} animate={{ width: `${(live.storage.used / live.storage.quota) * 100}%` }} transition={{ duration: 1 }} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-grey">{(live.storage.used / 1024 / 1024).toFixed(1)} MB usados de {(live.storage.quota / 1024 / 1024 / 1024).toFixed(1)} GB de cuota</p>
                </>
              ) : <p className="mt-1.5 font-mono text-sm text-grey">no soportado</p>}
            </div>
            <div className="rounded-lg border border-edge bg-black/30 p-4 sm:col-span-2">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-grey"><Wifi size={12} /> Conexión de red</p>
              {live.net ? (
                <p className="mt-1.5 font-mono text-sm text-white">
                  {live.net.effectiveType.toUpperCase()}
                  {live.net.downlink ? ` · ~${live.net.downlink} Mbps` : ''}
                  {live.net.rtt ? ` · RTT ${live.net.rtt} ms` : ''}
                </p>
              ) : <p className="mt-1.5 font-mono text-sm text-grey">Network Information API no disponible</p>}
            </div>
          </div>
        </div>
      </Reveal>

      {/* componentes manuales */}
      <Reveal delay={0.1}>
        <div className="card mt-6 p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
            <Wrench size={18} className="text-acento" /> Desgaste por antigüedad
          </h2>
          <p className="mb-4 text-[13px] text-grey">El navegador no puede leer sensores S.M.A.R.T. (eso requiere software nativo). Indica cuántos años tiene cada pieza y cuántas horas al día trabaja tu equipo: se calcula el desgaste y qué cambiar.</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {MANUAL_COMPONENTS.map((c) => {
              const st = components.find((x) => x.id === c.id)!
              const m = manual[c.id]
              return (
                <div key={c.id} className={`rounded-xl border p-4 transition-all ${st.status === 'ok' ? 'border-ok/30' : st.status === 'warn' ? 'border-warn/40' : st.status === 'bad' ? 'border-bad/40' : 'border-edge'} ${m ? 'bg-black/30' : 'bg-black/10 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs font-bold text-white">{c.icon} {c.name}</p>
                    {m && <Badge tone={st.status === 'unknown' ? 'neutral' : st.status}>{st.health}%</Badge>}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-grey/80">{c.desc}</p>
                  {m && (
                    <>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-edge">
                        <motion.div
                          className={`h-full rounded-full ${st.status === 'ok' ? 'bg-ok' : st.status === 'warn' ? 'bg-warn' : 'bg-bad'}`}
                          initial={{ width: 0 }} animate={{ width: `${st.health}%` }} transition={{ duration: 0.8 }}
                        />
                      </div>
                      <p className="mt-2 font-mono text-[10px] text-grey">{st.detail}</p>
                      {st.replaceIn && <p className={`mt-1 font-mono text-[10.5px] ${st.status === 'bad' ? 'text-bad' : 'text-warn'}`}>⏳ {st.replaceIn}</p>}
                      <ul className="mt-2 space-y-1">
                        {st.advice.map((a, i) => <li key={i} className="text-[10.5px] leading-snug text-acento">▸ {a}</li>)}
                      </ul>
                    </>
                  )}
                  {!m && (
                    <button onClick={() => setComp(c.id, {})} className="mt-2 font-mono text-[11px] text-acento hover:underline">+ añadir a mi inventario</button>
                  )}
                  {m && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Field label="años">
                        <TextInput type="number" min={0} max={30} value={m.years} onChange={(e) => setComp(c.id, { years: Math.max(0, parseInt(e.target.value) || 0) })} className="py-1.5 text-xs" />
                      </Field>
                      <Field label="h/día">
                        <TextInput type="number" min={0} max={24} value={m.hoursPerDay} onChange={(e) => setComp(c.id, { hoursPerDay: Math.min(24, Math.max(0, parseInt(e.target.value) || 0)) })} className="py-1.5 text-xs" />
                      </Field>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Reveal>

      {/* plan de mantenimiento */}
      <Reveal delay={0.12}>
        <div className="card mt-6 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
            <ClipboardCheck size={18} className="text-acento" /> Plan de mantenimiento sugerido
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              { when: 'cada mes', what: 'Limpieza de polvo con aire comprimido en disipadores y ventiladores. Verifica temperaturas en carga.' },
              { when: 'cada 6 meses', what: 'Comprueba S.M.A.R.T. del disco (smartctl -a /dev/sda) y haz un backup completo de prueba (restáuralo en una VM).' },
              { when: 'cada 2-3 años', what: 'Repaste de CPU/GPU y cambio de pasta térmica. Limpia a fondo ventiladores.' },
              { when: 'cuando avise aquí', what: 'Reemplaza los componentes en rojo ANTES de que fallen: un SSD muriendo corrompe datos silenciosamente.' },
              { when: 'siempre', what: 'Batería de laptop: mantén 20-80% y evita el calor. SAI: cambia su batería cada 3-5 años aunque no suene.' },
              { when: 'regla de oro', what: 'Los datos valen más que el hardware: backup 3-2-1 (3 copias, 2 soportes, 1 fuera de casa).' },
            ].map((r) => (
              <div key={r.when} className="flex gap-3 rounded-lg border border-edge bg-black/30 px-4 py-3">
                <span className="shrink-0 font-mono text-[11px] font-bold text-acento">{r.when}</span>
                <span className="text-[12.5px] leading-snug text-grey">{r.what}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}

function adviceFor(id: string, health: number): string[] {
  if (health >= 85) return ['todo bien: sigue con el mantenimiento preventivo']
  if (health >= 60) {
    switch (id) {
      case 'ssd': return ['revisa TBW consumido con smartctl', 'mantén 15-20% libre para el wear-leveling']
      case 'hdd': return ['haz un test SMART largo (smartctl -t long)', 'prepara su sustitución por SSD']
      case 'psu': return ['escucha ruidos de bobina (coil whine)', 'verifica que el ventilador gira libre']
      case 'gpu': return ['monitoriza temperaturas en carga ( HWiNFO )', 'limpia el disipador: es lo primero que degrada']
      case 'fan': return ['escucha clics o graznidos: señal de rodamiento seco', 'un ventilador lento por polvo = temperatura +15°C']
      case 'battery': return ['evita 100% constante: usa el límite de carga del fabricante', 'mira los ciclos con powercfg /batteryreport']
      case 'thermal': return ['si la CPU pasa de 85°C en carga, toca repaste', 'compara con las temps de fábrica']
      default: return ['sin acción urgente', 'inclúyelo en la limpieza mensual']
    }
  }
  switch (id) {
    case 'ssd': return ['URGENTE: clona a un disco nuevo ya', 'los SSD mueren de golpe, no avisan']
    case 'hdd': return ['backup completo HOY', 'un HDD con años y ruidos es una bomba de relojería']
    case 'psu': return ['no la estires: una PSU que falla puede arrastrar la placa', 'compra una de calidad (certificación 80+ Gold mínimo)']
    case 'gpu': return ['prueba en otro equipo para descartar', 'si hay artefactos visuales, es el final']
    case 'fan': return ['cámbialo: cuesta poco y evita un infierno térmico', 'empareja modelos si es un disipador doble']
    case 'battery': return ['la duración ya será mínima: planifica cambio', 'si está hinchada, DEJA DE USARLA ya']
    case 'thermal': return ['repaste YA: estás perdiendo rendimiento por throttling', 'metal líquido si es un portátil gaming']
    default: return ['planifica reemplazo', 'no esperes al fallo total']
  }
}
