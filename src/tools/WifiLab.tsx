import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RadioTower, Info, FlaskConical, Cpu, Eye, AlertTriangle, ShieldAlert } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextInput } from '../components/ui'
import { CodeBlock } from '../components/highlight'
import { WIFI_LAB_STEPS, renderCommands, WIFI_HARDWARE, type WifiLabConfig } from '../lib/wifilab'

export default function WifiLab() {
  const [cfg, setCfg] = useState<WifiLabConfig>({
    iface: 'wlan0',
    bssid: 'AA:BB:CC:DD:EE:FF',
    channel: '6',
    ssid: 'MiLab',
    clientMac: '11:22:33:44:55:66',
    wordlist: '/usr/share/wordlists/rockyou.txt',
    hashcatMask: '?u?l?l?l?l?d?d?s',
  })
  const set = (k: keyof WifiLabConfig) => (e: React.ChangeEvent<HTMLInputElement>) => setCfg((c) => ({ ...c, [k]: e.target.value }))

  const steps = useMemo(() => WIFI_LAB_STEPS.map((s) => ({ ...s, rendered: renderCommands(s, cfg) })), [cfg])
  const allScript = useMemo(
    () =>
      steps
        .map((s) => `# ─── ${s.title} ───\n${s.rendered.join('\n')}\n# espera: ${s.expect}`)
        .join('\n\n'),
    [steps],
  )

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={RadioTower}
        title="WiFi Attack Lab"
        desc="Los 7 pasos de una auditoría 802.11 con los comandos exactos para TU laboratorio: qué esperar en cada salida, la trampa típica y cómo se detecta cada acción"
        badge="wifi"
      />

      <InfoBanner>
        ⚠ Auditar WiFi ajeno sin permiso escrito es delito (acceso a sistemas informáticos e interferencias), aunque sea «solo el vecino». Monta tu propio lab: un router viejo con OpenWrt y un adaptador con modo monitor te dan un campo de entrenamiento completo y legal.
      </InfoBanner>

      {/* configuración del laboratorio */}
      <Reveal>
        <div className="card p-5">
          <h3 className="mb-1 flex items-center gap-2 font-mono text-sm font-bold text-white">
            <FlaskConical size={15} className="text-acento" /> configuración de tu laboratorio
          </h3>
          <p className="mb-4 text-[12px] leading-relaxed text-grey">
            Rellena los datos de TU red de pruebas y todos los comandos se reescriben al instante. Nada sale de tu navegador.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="interfaz" hint="iw dev"><TextInput value={cfg.iface} onChange={set('iface')} /></Field>
            <Field label="bssid del AP"><TextInput value={cfg.bssid} onChange={set('bssid')} className="font-mono" /></Field>
            <Field label="canal"><TextInput value={cfg.channel} onChange={set('channel')} /></Field>
            <Field label="ssid"><TextInput value={cfg.ssid} onChange={set('ssid')} /></Field>
            <Field label="mac del cliente"><TextInput value={cfg.clientMac} onChange={set('clientMac')} className="font-mono" /></Field>
            <Field label="wordlist"><TextInput value={cfg.wordlist} onChange={set('wordlist')} /></Field>
            <Field label="máscara hashcat" hint="-a 3"><TextInput value={cfg.hashcatMask} onChange={set('hashcatMask')} className="font-mono" /></Field>
          </div>
        </div>
      </Reveal>

      {/* pasos */}
      <div className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <Reveal key={s.id} delay={i * 0.04}>
            <motion.div
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="card overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-edge bg-black/20 px-5 py-3">
                <span className="text-lg">{s.icon}</span>
                <h3 className="font-mono text-sm font-bold text-white">{s.title}</h3>
                {s.trap && <Badge tone="warn">trampa</Badge>}
                <Badge tone="info" className="ml-auto">detectable: {s.detection === '—' ? 'no' : 'sí'}</Badge>
              </div>
              <div className="space-y-3 p-5">
                <p className="text-[12.5px] leading-relaxed text-grey">{s.why}</p>
                <CodeBlock code={s.rendered.join('\n')} lang="bash" label={`paso ${i + 1} · ${s.id}`} />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-ok/25 bg-ok/5 px-3.5 py-2.5">
                    <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ok"><Eye size={11} /> qué esperar</p>
                    <p className="text-[12px] leading-relaxed text-ink/90">{s.expect}</p>
                  </div>
                  <div className="rounded-lg border border-info/25 bg-info/5 px-3.5 py-2.5">
                    <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-info"><ShieldAlert size={11} /> detección (blue team)</p>
                    <p className="text-[12px] leading-relaxed text-ink/90">{s.detection}</p>
                  </div>
                </div>
                {s.trap && (
                  <p className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-warn/95">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {s.trap}
                  </p>
                )}
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>

      {/* script completo + hardware */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <CodeBlock code={allScript} lang="bash" label="lab-completo.sh" maxH="max-h-[420px]" />
        </Reveal>
        <Reveal delay={0.05}>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">
              <Cpu size={15} className="text-acento" /> hardware que sí inyecta
            </h3>
            <div className="space-y-2.5">
              {WIFI_HARDWARE.map((h) => (
                <div key={h.chip} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-[12px] font-bold text-ink">{h.chip}</span>
                    <span className="text-[11px] text-grey">· {h.tool}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={h.monitor.startsWith('✅') ? 'ok' : 'warn'}>monitor {h.monitor}</Badge>
                    <Badge tone={h.inject.startsWith('✅') ? 'ok' : 'warn'}>inyección {h.inject}</Badge>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-grey">{h.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-grey">
              <Info size={12} className="mt-0.5 shrink-0 text-acento" />
              El chipset manda: comprueba la REVISIÓN del dispositivo (TL-WN722N v1 ✅ / v2 ❌) antes de comprar.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
