import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Wrench, Bug, Info, Lock } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, Select, TextInput, Toggle } from '../components/ui'
import { auditWifi, passphraseEntropy, HARDENING, THREATS, type WifiAuditConfig } from '../lib/wifiaudit'

const DEFAULT_CFG: WifiAuditConfig = {
  security: 'wpa2',
  auth: 'psk',
  pmf: 'optional',
  passphrase: 'MiRed1234!',
  wps: true,
  remoteAdmin: false,
  firmwareUpdated: true,
  guestNetwork: false,
  hiddenSsid: false,
  macFilter: false,
}

const TONE = { good: 'ok', warn: 'warn', bad: 'bad' } as const
const EFFORT_TONE = { minutos: 'ok', 'media hora': 'warn', 'una tarde': 'info' } as const

export default function WifiAudit() {
  const [cfg, setCfg] = useState<WifiAuditConfig>(DEFAULT_CFG)
  const set = <K extends keyof WifiAuditConfig>(k: K) => (v: WifiAuditConfig[K]) => setCfg((c) => ({ ...c, [k]: v }))

  const result = useMemo(() => auditWifi(cfg), [cfg])
  const ent = useMemo(() => passphraseEntropy(cfg.passphrase), [cfg.passphrase])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={ShieldCheck}
        title="WiFi Security Auditor"
        desc="Puntúa la configuración de TU red (cifrado, PMF, passphrase, WPS, panel de admin) sobre 100, prioriza el hardening y muestra la matriz de amenazas con su defensa"
        badge="wifi"
      />

      <InfoBanner>
        ⚠ Audita solo redes PROPIAS o con autorización escrita. El objetivo de esta herramienta es cerrar tu superficie de ataque: cada punto que falta aquí es exactamente lo que explota un atacante con herramientas públicas.
      </InfoBanner>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[400px_1fr]">
        {/* formulario */}
        <Reveal>
          <div className="card space-y-3 p-5">
            <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white"><Lock size={15} className="text-acento" /> configuración de tu red</h3>
            <Field label="cifrado">
              <Select
                value={cfg.security}
                onChange={(e) => set('security')(e.target.value as WifiAuditConfig['security'])}
                options={[
                  { value: 'wpa3', label: 'WPA3-SAE' },
                  { value: 'wpa2-wpa3', label: 'WPA2/WPA3 mixto' },
                  { value: 'wpa2', label: 'WPA2 (CCMP/AES)' },
                  { value: 'wpa2-tkip', label: 'WPA2 con TKIP' },
                  { value: 'wpa1', label: 'WPA1' },
                  { value: 'wep', label: 'WEP' },
                ]}
              />
            </Field>
            <Field label="autenticación">
              <Select
                value={cfg.auth}
                onChange={(e) => set('auth')(e.target.value as WifiAuditConfig['auth'])}
                options={[
                  { value: 'psk', label: 'PSK (clave compartida)' },
                  { value: 'enterprise', label: '802.1X / RADIUS (enterprise)' },
                  { value: 'sae', label: 'SAE (WPA3)' },
                  { value: 'open', label: 'Abierta (sin cifrado)' },
                ]}
              />
            </Field>
            <Field label="PMF (802.11w)">
              <Select
                value={cfg.pmf}
                onChange={(e) => set('pmf')(e.target.value as WifiAuditConfig['pmf'])}
                options={[
                  { value: 'required', label: 'Required (recomendado)' },
                  { value: 'optional', label: 'Optional' },
                  { value: 'off', label: 'Desactivado' },
                ]}
              />
            </Field>
            <Field label="passphrase" hint={`${ent.bits} bits · ${ent.verdict}`}>
              <TextInput type="text" value={cfg.passphrase} onChange={(e) => set('passphrase')(e.target.value)} className="font-mono" />
            </Field>
            <div className="grid gap-2.5 border-t border-edge pt-3">
              <Toggle checked={cfg.wps} onChange={set('wps')} label="WPS activado (PIN/botón)" />
              <Toggle checked={cfg.remoteAdmin} onChange={set('remoteAdmin')} label="Panel de admin accesible desde WAN" />
              <Toggle checked={cfg.firmwareUpdated} onChange={set('firmwareUpdated')} label="Firmware del router actualizado" />
              <Toggle checked={cfg.guestNetwork} onChange={set('guestNetwork')} label="Red de invitados / IoT segmentada" />
              <Toggle checked={cfg.hiddenSsid} onChange={set('hiddenSsid')} label="SSID oculto" />
              <Toggle checked={cfg.macFilter} onChange={set('macFilter')} label="Filtro MAC activo" />
            </div>
            <p className="border-t border-edge pt-3 text-[11px] leading-relaxed text-grey">
              La passphrase no sale del navegador: la entropía se calcula en local. Aun así, usa una equivalente si la real es sensible.
            </p>
          </div>
        </Reveal>

        <div className="min-w-0 space-y-4">
          {/* score */}
          <Reveal>
            <div className="card flex flex-wrap items-center gap-6 p-5">
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-edge" />
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round"
                    className={result.score >= 80 ? 'stroke-ok' : result.score >= 55 ? 'stroke-warn' : 'stroke-bad'}
                    initial={{ strokeDashoffset: 327 }}
                    animate={{ strokeDashoffset: 327 - (327 * result.score) / 100 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    strokeDasharray="327"
                  />
                </svg>
                <div className="text-center">
                  <p className={`font-mono text-3xl font-extrabold ${result.gradeColor}`}>{result.grade}</p>
                  <p className="font-mono text-[11px] text-grey">{result.score}/100</p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 font-mono text-sm font-bold text-white">desglose</h3>
                <div className="space-y-1.5">
                  {result.checks.map((c) => (
                    <div key={c.id}>
                      <div className="flex items-baseline justify-between gap-2 text-[12px]">
                        <span className={c.status === 'good' ? 'text-ok' : c.status === 'warn' ? 'text-warn' : 'text-bad'}>
                          {c.label} <Badge tone={TONE[c.status]}>{c.points}/{c.max || '—'}</Badge>
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-grey">{c.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.04}>
            <p className={`rounded-lg border px-4 py-3 font-mono text-xs leading-relaxed ${
              result.score >= 80 ? 'border-ok/40 bg-ok/5 text-ok' : result.score >= 55 ? 'border-warn/40 bg-warn/5 text-warn' : 'border-bad/40 bg-bad/5 text-bad'
            }`}>
              {result.summary}
            </p>
          </Reveal>

          {/* hardening */}
          <Reveal delay={0.06}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Wrench size={15} className="text-acento" /> hardening priorizado</h3>
              <div className="space-y-2.5">
                {HARDENING.map((h) => (
                  <details key={h.priority} className="group rounded-lg border border-edge bg-black/20 open:border-acento/40">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-acento/40 font-mono text-[11px] font-bold text-acento">{h.priority}</span>
                      <span className="min-w-0 flex-1 text-[13px] font-semibold text-ink">{h.title}</span>
                      <Badge tone={EFFORT_TONE[h.effort]}>{h.effort}</Badge>
                      <span className="text-grey transition-transform group-open:rotate-90">▸</span>
                    </summary>
                    <div className="border-t border-edge px-3.5 py-3">
                      <p className="text-[12px] leading-relaxed text-grey">{h.why}</p>
                      <ul className="mt-2 space-y-1">
                        {h.how.map((step, i) => (
                          <li key={i} className="flex gap-2 font-mono text-[11.5px] leading-relaxed text-ink/85">
                            <span className="text-acento">$</span> {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </Reveal>

          {/* matriz de amenazas */}
          <Reveal delay={0.08}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Bug size={15} className="text-acento" /> matriz de amenazas WiFi</h3>
              <div className="space-y-2">
                {THREATS.map((t) => (
                  <div key={t.threat} className="rounded-lg border border-edge bg-black/20 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base">{t.icon}</span>
                      <span className="text-[13px] font-bold text-ink">{t.threat}</span>
                      <Badge tone={t.difficulty === 'trivial' ? 'bad' : t.difficulty === 'alta' ? 'ok' : 'warn'}>
                        dificultad {t.difficulty}
                      </Badge>
                      <span className="font-mono text-[10.5px] text-grey">objetivo: {t.target}</span>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-grey"><b className="text-info">cómo se detecta:</b> {t.signal}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-grey"><b className="text-ok">defensa:</b> {t.defense}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-grey">
                <Info size={12} className="mt-0.5 shrink-0 text-acento" />
                Dos ideas que resumen toda la matriz: <b className="text-ink">PMF required</b> mata el 90% de los ataques de gestión, y la <b className="text-ink">entropía de la passphrase</b> es la única defensa real contra el crack offline.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
