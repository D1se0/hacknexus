import { useState } from 'react'
import { AtSign, Search, Globe, ShieldAlert, Github, UserRound, AlertTriangle, Copy } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, InfoBanner, Reveal, KV, Spinner } from '../components/ui'
import {
  gravatarProfile, gravatarAvatarProbe, checkBreaches, githubCommitSearch,
  analyzeEmail, emailDorks, MANUAL_CHECKS, EMAIL_OSINT_ETHICS,
  type GravatarProfile, type BreachResult, type GithubCommitResult,
} from '../lib/emailosint'

type Phase = 'idle' | 'running' | 'done'

interface ScanState {
  phase: Phase
  grav: GravatarProfile | null
  avatarExists: boolean | null
  breach: BreachResult | null
  gh: GithubCommitResult | null
}

export default function EmailOsint() {
  const [email, setEmail] = useState('')
  const [st, setSt] = useState<ScanState>({ phase: 'idle', grav: null, avatarExists: null, breach: null, gh: null })
  const [error, setError] = useState<string | null>(null)
  const analysis = analyzeEmail(email)

  const run = async () => {
    if (!analysis.valid) {
      setError('Introduce un email con formato válido')
      return
    }
    setError(null)
    setSt({ phase: 'running', grav: null, avatarExists: null, breach: null, gh: null })
    const grav = await gravatarProfile(email)
    const avatar = await gravatarAvatarProbe(email)
    const breach = await checkBreaches(email)
    const gh = await githubCommitSearch(email)
    setSt({ phase: 'done', grav, avatarExists: avatar.exists, breach, gh })
  }

  const running = st.phase === 'running'

  return (
    <div>
      <ToolHeader icon={AtSign} title="Email OSINT" badge="PASIVO" desc="Huellas de una dirección de correo: perfil Gravatar, filtraciones conocidas, commits en GitHub firmados con ese email y dorks listos para lanzar." />

      <InfoBanner>
        <b>100% pasivo y con CORS verificado:</b> consulta perfiles públicos y APIs abiertas desde tu navegador — el dueño del email no recibe ninguna notificación. Complementa a <b>Username OSINT</b>: aquél busca por alias, ésta por dirección de correo.
      </InfoBanner>

      {/* búsqueda */}
      <Reveal>
        <div className="card space-y-4 p-5">
          <Field label="Email a investigar" hint="solo formatos válidos">
            <div className="flex gap-2">
              <TextInput
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') run() }}
                placeholder="persona@dominio.com"
                spellCheck={false}
              />
              <Button onClick={run} disabled={running}>
                {running ? <Spinner /> : <Search size={15} />} Escanear
              </Button>
            </div>
          </Field>
          {error && <p className="flex items-center gap-2 font-mono text-xs text-bad"><AlertTriangle size={13} /> {error}</p>}
          {email.includes('@') && (
            <div className="flex flex-wrap gap-1.5">
              {analysis.hasPlusTag && <Badge tone="info">+tag: canónica {analysis.local.split('+')[0]}@{analysis.domain}</Badge>}
              {analysis.hasDotTrick && <Badge tone="info">puntos ignorados por Gmail</Badge>}
              {analysis.isDisposable && <Badge tone="bad">dominio descartable</Badge>}
              {analysis.roleAccount && <Badge tone="warn">cuenta de rol</Badge>}
              {analysis.provider && <Badge tone="neutral">{analysis.provider.name}</Badge>}
            </div>
          )}
        </div>
      </Reveal>

      {/* resultados */}
      {st.phase === 'done' && st.grav && (
        <div className="mt-4 space-y-4">
          {/* avatar + identidad */}
          <Reveal>
            <div className="card flex flex-col gap-5 p-5 sm:flex-row">
              <div className="shrink-0 self-center sm:self-start">
                {st.grav.thumbnailUrl ? (
                  <img src={st.grav.thumbnailUrl} alt="avatar Gravatar" className="h-28 w-28 rounded-xl border border-edge" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-edge text-grey">
                    <UserRound size={36} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-mono text-sm font-bold text-ink">Gravatar</h2>
                  <Badge tone={st.grav.registered ? 'ok' : 'neutral'}>{st.grav.registered ? 'REGISTRADO' : 'SIN REGISTRO'}</Badge>
                  {st.avatarExists === false && st.grav.registered && <Badge tone="warn">perfil sin avatar por defecto</Badge>}
                </div>
                {st.grav.registered && st.grav.displayName ? (
                  <div className="mt-2 space-y-1">
                    <KV k="nombre" v={st.grav.displayName} copyable />
                    {st.grav.preferredUsername && <KV k="usuario" v={st.grav.preferredUsername} copyable />}
                    {st.grav.currentLocation && <KV k="ubicación" v={st.grav.currentLocation} />}
                    {st.grav.aboutMe && <KV k="bio" v={<span className="font-sans text-xs">{st.grav.aboutMe}</span>} mono={false} />}
                    <KV k="perfil" v={<a href={st.grav.profileUrl} target="_blank" rel="noreferrer" className="text-info hover:underline">{st.grav.profileUrl}</a>} />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-grey">Sin perfil público vinculado. El hash MD5 del email sigue siendo útil: algunos servicios lo usan como identificador.</p>
                )}
                {/* cuentas vinculadas */}
                {st.grav.accounts && st.grav.accounts.length > 0 && (
                  <div className="mt-3 border-t border-edge/60 pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-grey">servicios vinculados al perfil Gravatar</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {st.grav.accounts.map((a) => (
                        <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="rounded-md border border-edge bg-black/30 px-2 py-1 font-mono text-[10px] text-info hover:border-info/50">
                          {a.shortname || a.domain} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* filtraciones */}
          <Reveal delay={0.05}>
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-ink"><ShieldAlert size={15} /> Filtraciones (XposedOrNot)</h2>
                {st.breach && (
                  st.breach.exposed
                    ? <Badge tone="bad">{st.breach.breaches.length} filtraciones</Badge>
                    : <Badge tone="ok">sin coincidencias</Badge>
                )}
              </div>
              {st.breach?.error && <p className="mt-2 font-mono text-xs text-warn">⚠ {st.breach.error}</p>}
              {st.breach?.exposed && (
                <>
                  <p className="mt-2 text-xs text-grey">El email aparece en bases de datos publicadas. Cada una indica dónde se registró con esa dirección:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {st.breach.breaches.map((b) => (
                      <span key={b} className="rounded-md border border-bad/40 bg-bad/10 px-2 py-1 font-mono text-[10px] text-bad">{b}</span>
                    ))}
                  </div>
                </>
              )}
              {st.breach && !st.breach.exposed && !st.breach.error && (
                <>
                  <p className="mt-2 text-xs text-grey">No aparece en la base pública consultada. Ojo: no cubre todas las filtraciones existentes (HIBP tiene más, pero su API de cuentas requiere clave).</p>
                  <p className="mt-1 text-[11px] text-grey/70">Cruza con los dorks de abajo para búsquedas en pastebins y dumps indexados.</p>
                </>
              )}
            </div>
          </Reveal>

          {/* GitHub commits */}
          <Reveal delay={0.1}>
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-ink"><Github size={15} /> GitHub — commits firmados</h2>
                {st.gh && (st.gh.found ? <Badge tone="ok">{st.gh.total} commits públicos</Badge> : <Badge tone="neutral">sin commits</Badge>)}
              </div>
              {st.gh?.error && <p className="mt-2 font-mono text-xs text-warn">⚠ {st.gh.error} — puede ser el límite de GitHub (10 req/min sin token): reintenta en un minuto</p>}
              {st.gh?.found && (
                <div className="mt-3 space-y-2">
                  {st.gh.sample.map((c) => (
                    <a key={c.url} href={c.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-edge/70 bg-black/20 px-3 py-2 transition-colors hover:border-acento/50">
                      <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                        <span className="text-acento">{c.repo}</span>
                        <span className="text-grey/60">{c.date?.slice(0, 10)}</span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-grey">{c.message}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          {/* dorks */}
          <Reveal delay={0.15}>
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-ink"><Globe size={15} /> Dorks listos para lanzar</h2>
              <div className="space-y-1.5">
                {emailDorks(email).map((d) => (
                  <div key={d.url} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge/70 bg-black/20 px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-ink">{d.engine} · <span className="text-grey">{d.query}</span></div>
                      <div className="text-[10px] text-grey/60">{d.what}</div>
                    </div>
                    <a href={d.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-md border border-edge px-2 py-1 font-mono text-[10px] text-info hover:border-info/50">abrir ↗</a>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* verificación manual */}
          <Reveal delay={0.2}>
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-ink"><Copy size={15} /> Verificación manual</h2>
              <div className="grid gap-1.5 md:grid-cols-2">
                {MANUAL_CHECKS.map((m) => (
                  <a key={m.name} href={m.url(email)} target="_blank" rel="noreferrer" className="group rounded-lg border border-edge/70 bg-black/20 px-3 py-2 transition-colors hover:border-acento/50">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-ink group-hover:text-acento">{m.name}</span>
                      <Badge tone="neutral">{m.category}</Badge>
                    </div>
                    <p className="mt-0.5 text-[10px] text-grey">{m.what}</p>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ética */}
          <Reveal delay={0.25}>
            <div className="card p-5">
              {EMAIL_OSINT_ETHICS.map((e, i) => (
                <p key={i} className="text-[11px] leading-relaxed text-grey/80">⚖ {e}</p>
              ))}
            </div>
          </Reveal>
        </div>
      )}
    </div>
  )
}
