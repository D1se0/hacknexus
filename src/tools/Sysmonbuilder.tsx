import { useState, useMemo } from 'react'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, Select, Toggle, InfoBanner } from '../components/ui'
import { SYSMON_EVENTS, SYSMON_PROFILES, SYSMON_DEPLOY, SYSMON_NOTES, buildSysmonConfig } from '../lib/sysmon'
import { download } from '../lib/util'
import { FileCog } from 'lucide-react'

export default function SysmonBuilder() {
  const [profile, setProfile] = useState(SYSMON_PROFILES[0].id)
  const [ids, setIds] = useState<number[]>(SYSMON_PROFILES[0].ids)
  const [hashAlgos, setHashAlgos] = useState<'sha256' | 'sha256,imphash' | 'md5,sha256,imphash'>('sha256,imphash')
  const [checkRevocation, setCheckRevocation] = useState(true)
  const [exclude, setExclude] = useState('C:\\Windows\\Temp\\\nC:\\Program Files\\')

  const xml = useMemo(() => buildSysmonConfig({
    hashAlgos, checkRevocation,
    eventIds: ids,
    excludePaths: exclude.split('\n').map((s) => s.trim()).filter(Boolean),
    includeNetwork: true, dnsLogging: true, onmatch: 'exclude',
  }), [ids, hashAlgos, checkRevocation, exclude])

  return (
    <>
      <ToolHeader
        icon={FileCog}
        title="Sysmon Config Builder"
        desc="Genera configuraciones XML de Sysmon con foco en detección. Cada evento explica por qué importa y para qué lo usa un atacante — las reglas vienen de la experiencia real de SOC."
      />
      <SnapshotButtons
        toolId="sysmonbuilder"
        label="profile + eventos + exclusiones"
        getData={() => ({ profile, ids, hashAlgos, checkRevocation, exclude })}
        onLoad={(d) => { if (d.profile) setProfile(d.profile); if (d.ids) setIds(d.ids); if (d.hashAlgos) setHashAlgos(d.hashAlgos); if (d.checkRevocation !== undefined) setCheckRevocation(d.checkRevocation); if (d.exclude !== undefined) setExclude(d.exclude) }}
      />
      <InfoBanner>
        Este builder es el punto de partida ideal: instala, prueba en tu SIEM, y luego escala con
        <a href="https://github.com/SwiftOnSecurity/sysmon-config" target="_blank" rel="noreferrer"> SwiftOnSecurity</a> o
        <a href="https://github.com/olafhartong/sysmon-modular" target="_blank" rel="noreferrer"> sysmon-modular</a>.
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          <Field label="Perfil prehecho">
            <Select
              value={profile}
              onChange={(e) => {
                const p = SYSMON_PROFILES.find((x) => x.id === e.target.value)!
                setProfile(p.id); setIds(p.ids)
                if (p.opts.hashAlgos) setHashAlgos(p.opts.hashAlgos)
              }}
              options={SYSMON_PROFILES.map((p) => ({ value: p.id, label: p.label }))}
            />
          </Field>

          <Field label="Eventos capturados (click para activar/desactivar)">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {SYSMON_EVENTS.map((ev) => {
                const on = ids.includes(ev.id)
                return (
                  <button
                    key={ev.id}
                    onClick={() => setIds((prev) => (on ? prev.filter((x) => x !== ev.id) : [...prev, ev.id]))}
                    className={`text-left rounded border px-2 py-1.5 text-xs transition-colors ${on ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 bg-white/[0.02] opacity-60 hover:opacity-100'}`}
                  >
                    <span className="font-mono text-emerald-300">E{ev.id}</span> {ev.name}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Hashes">
            <Select
              value={hashAlgos}
              onChange={(e) => setHashAlgos(e.target.value as typeof hashAlgos)}
              options={[
                { value: 'sha256', label: 'SHA256' },
                { value: 'sha256,imphash', label: 'SHA256 + imphash (recomendado)' },
                { value: 'md5,sha256,imphash', label: 'MD5 + SHA256 + imphash' },
              ]}
            />
          </Field>

          <Toggle checked={checkRevocation} onChange={setCheckRevocation} label="CheckRevocation (valida certificados de firmantes)" />

          <Field label="Excluir procesos (uno por línea, begin with)">
            <textarea
              value={exclude}
              onChange={(e) => setExclude(e.target.value)}
              rows={3}
              className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs"
              placeholder="C:\Windows\Temp\"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">sysmon-config.xml</h3>
            <div className="flex gap-2">
              <CopyBtn text={xml} />
              <button
                onClick={() => download('sysmon-config.xml', xml, 'application/xml')}
                className="rounded border border-white/10 px-2 py-0.5 text-xs"
              >Descargar</button>
            </div>
          </div>
          <CopyBlock text={xml} maxH="24rem" />

          <div className="rounded border border-white/10 bg-black/30 p-3">
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide">Despliegue</h4>
            <ul className="space-y-1.5">
              {SYSMON_DEPLOY.slice(0, 4).map(([cmd, why]) => (
                <li key={cmd} className="flex items-start gap-2">
                  <code className="rounded bg-black/50 px-1.5 py-0.5 text-[11px]">{cmd}</code>
                  <span className="text-[11px] text-white/60">{why}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <h3 className="mt-6 mb-2 text-sm font-semibold">Guía de eventos</h3>
      <div className="space-y-1.5">
        {SYSMON_EVENTS.map((ev) => {
          const on = ids.includes(ev.id)
          return (
            <div key={ev.id} className={`rounded border px-3 py-2 text-xs ${on ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-white/10 opacity-60'}`}>
              <div className="flex items-center gap-2">
                <Badge tone={on ? 'ok' : 'neutral'}>E{ev.id}</Badge>
                <span className="font-medium">{ev.name}</span>
                {ev.essential && <Badge tone="accent">esencial</Badge>}
              </div>
              <p className="mt-1 text-white/70">{ev.what}</p>
              <p className="mt-0.5"><span className="font-mono text-rose-300">atacante:</span> {ev.offensive}</p>
              <p className="mt-0.5"><span className="font-mono text-emerald-300">defensa:</span> {ev.defensive}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded border border-white/10 bg-black/30 p-3">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide">Notas de campo</h4>
        <ul className="list-inside list-disc space-y-1 text-xs text-white/70">
          {SYSMON_NOTES.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </div>
    </>
  )
}
