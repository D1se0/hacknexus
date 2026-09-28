import { GraduationCap, ShieldCheck, KeyRound, Layers } from 'lucide-react'
import { ToolHeader, Badge, InfoBanner, Reveal } from '../components/ui'
import { MTM_STEPS, MTM_DEFENSES, PHISHKIT_ETHICS } from '../lib/phishkit'

const ACTOR_COLORS: Record<string, string> = {
  víctima: 'text-info border-info/40 bg-info/10',
  atacante: 'text-bad border-bad/40 bg-bad/10',
  servicio: 'text-ok border-ok/40 bg-ok/10',
}

const LEVEL_TONES = { básico: 'ok', avanzado: 'info', estructural: 'accent' } as const

export default function Phishmtm() {
  return (
    <div>
      <ToolHeader icon={KeyRound} title="Phishing MITM Anatomy" badge="EVILGINX" desc="Anatomía visual del phishing con proxy inverso: por qué roba sesiones aunque el 2FA funcione, y las capas que lo rompen de verdad." />

      <InfoBanner>
        <b>Solo anatomía, no manual:</b> esto explica el mecanismo para defenderse. Ningún paso genera código de proxy ni configura nada: la defensa empieza por entender que el 2FA por OTP <b>no</b> para esta técnica — solo las passkeys la cortan de raíz.
      </InfoBanner>

      {/* línea de pasos */}
      <Reveal>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-acento/50 via-edge to-transparent" />
          <div className="space-y-3">
            {MTM_STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.03}>
                <div className="relative flex gap-4 pl-10">
                  <span className="absolute left-0 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-acento/40 bg-panel font-mono text-xs font-bold text-acento">{s.n}</span>
                  <div className="card flex-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-mono text-sm font-bold text-ink">{s.title}</h2>
                      <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${ACTOR_COLORS[s.actor] ?? 'text-grey border-edge'}`}>{s.actor}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-grey">{s.detail}</p>
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-ok/25 bg-ok/5 px-3 py-2">
                      <ShieldCheck size={12} className="mt-0.5 shrink-0 text-ok" />
                      <p className="text-[11px] leading-relaxed text-ok/90">{s.defense}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>

      {/* defensas */}
      <Reveal delay={0.1}>
        <div className="card mt-6 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-grey"><Layers size={14} /> Capas de defensa que funcionan</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {MTM_DEFENSES.map((d) => (
              <div key={d.title} className="rounded-lg border border-edge/70 bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-ink">{d.title}</span>
                  <Badge tone={LEVEL_TONES[d.level]}>{d.level}</Badge>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-grey">{d.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* la lección central */}
      <Reveal delay={0.15}>
        <div className="card mt-4 border-acento/30 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-acento"><GraduationCap size={14} /> La lección central</h2>
          <div className="space-y-2 text-xs leading-relaxed text-grey">
            <p>El phishing MITM no rompe el 2FA: lo <b className="text-ink">usa</b>. La víctima escribe el OTP en el proxy, el proxy lo presenta al servicio real y la sesión resultante pertenece al atacante. Por eso las campañas de "no compartas tu código" no son suficientes: la víctima <b className="text-ink">está</b> autenticándose, solo que en otra sesión.</p>
            <p>Lo que rompe el ciclo:</p>
            <ul className="space-y-1 pl-4">
              <li>• <b className="text-ink">Passkeys</b> — el dominio forma parte del challenge criptográfico.</li>
              <li>• <b className="text-ink">Comprobar el dominio</b> — el proxy vive siempre en un dominio distinto.</li>
              <li>• <b className="text-ink">Password manager</b> — no autocompleta en dominios equivocados.</li>
            </ul>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-edge/60 pt-4">
            {PHISHKIT_ETHICS.map((e, i) => (
              <p key={i} className="text-[11px] leading-relaxed text-grey/80">⚖ {e}</p>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
