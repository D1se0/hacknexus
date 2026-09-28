import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Eye, Ghost, MapPin, ScanFace, Radar, Route as RouteIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Badge,
  Button,
  CopyBlock,
  ErrorBox,
  InfoBanner,
  KV,
  Reveal,
  Spinner,
  TextInput,
  ToolHeader,
  inputCls,
  useToast,
} from '../components/ui'
import {
  PLATFORM_LABEL,
  IDENTITY_CHECKLIST,
  LEGAL_NOTES,
  LEAK_SURFACES,
  TOOL_LIMITS,
  checkCoherence,
  checklistProgress,
  exportProtocol,
  fingerprintScore,
  leakTone,
  macRecipes,
  networkRecipes,
  parseSdpCandidates,
  restoreRecipes,
  verifyRecipes,
  webrtcVerdict,
} from '../lib/anonymity'
import type { Platform, Recipe, WebrtcResult } from '../lib/anonymity'
import { myIp } from '../lib/netapi'
import type { IpInfo } from '../lib/netapi'

type Tab = 'scan' | 'recipes' | 'protocol'

const EXIT_COUNTRIES = [
  { value: 'ES', label: 'España (tu entorno real, para comparar)' },
  { value: 'DE', label: 'Alemania' },
  { value: 'NL', label: 'Países Bajos' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'FR', label: 'Francia' },
  { value: 'GB', label: 'Reino Unido' },
  { value: 'CH', label: 'Suiza' },
  { value: 'SE', label: 'Suecia' },
  { value: 'CA', label: 'Canadá' },
  { value: 'JP', label: 'Japón' },
  { value: 'SG', label: 'Singapur' },
  { value: 'MX', label: 'México' },
]

const IFACE_BY_PLATFORM: Record<Platform, string> = {
  linux: 'wlan0',
  windows: 'Wi-Fi',
  macos: 'en0',
  android: 'wlan0',
  ios: 'wlan0',
}

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-acento" />
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function Anonymity() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('scan')

  /* ── Escáner: IP + huella + WebRTC ── */
  const [scanning, setScanning] = useState(false)
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null)
  const [ipError, setIpError] = useState('')
  const [webrtc, setWebrtc] = useState<WebrtcResult | null>(null)
  const [webrtcRunning, setWebrtcRunning] = useState(false)

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const langs = useMemo(() => navigator.languages?.join(',') || navigator.language, [])
  const ua = useMemo(() => navigator.userAgent, [])
  const screen = useMemo(() => `${window.screen.width}x${window.screen.height} @${window.devicePixelRatio}x`, [])
  const cores = navigator.hardwareConcurrency
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory

  const fp = useMemo(
    () =>
      fingerprintScore({
        userAgent: ua,
        languages: langs,
        timezone: tz,
        screen,
        hardwareConcurrency: cores,
        deviceMemory: mem,
      }),
    [ua, langs, tz, screen, cores, mem],
  )

  const runIpScan = useCallback(async () => {
    setScanning(true)
    setIpError('')
    try {
      const info = await myIp()
      setIpInfo(info)
      toast('IP pública consultada', 'ok')
    } catch (e) {
      setIpError(e instanceof Error ? e.message : 'Fallo consultando ipwho.is')
    } finally {
      setScanning(false)
    }
  }, [toast])

  const runWebrtcTest = useCallback(async () => {
    setWebrtcRunning(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PC: typeof RTCPeerConnection | undefined = (window as any).RTCPeerConnection || (window as any).webkitRTCPeerConnection
      if (!PC) {
        setWebrtc({ local: [], public: [], mdns: [], raw: ['(RTCPeerConnection no disponible en este navegador)'] })
        return
      }
      const pc = new PC({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      pc.createDataChannel('probe')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      // Espera a que ICE recoja candidates (máx 3 s)
      const sdp: string = await new Promise((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          resolve(pc.localDescription?.sdp ?? '')
        }
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') finish()
        }
        setTimeout(finish, 3000)
      })
      pc.close()
      setWebrtc(parseSdpCandidates(sdp))
    } catch {
      setWebrtc({ local: [], public: [], mdns: [], raw: [] })
    } finally {
      setWebrtcRunning(false)
    }
  }, [])

  /* ── Recetas ── */
  const [platform, setPlatform] = useState<Platform>('linux')
  const [iface, setIface] = useState('wlan0')
  const [netTarget, setNetTarget] = useState<'tor' | 'vpn' | 'dhcp'>('tor')
  const [recipeKind, setRecipeKind] = useState<'mac' | 'net' | 'verify' | 'restore'>('mac')

  const recipes: Recipe[] = useMemo(() => {
    if (recipeKind === 'mac') return macRecipes(platform, iface)
    if (recipeKind === 'verify') return verifyRecipes(platform, iface)
    if (recipeKind === 'restore') return restoreRecipes(platform, iface)
    return networkRecipes(platform, iface, netTarget)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeKind, platform, iface, netTarget])

  /* ── Coherencia ── */
  const [exitCountry, setExitCountry] = useState('DE')
  const coherence = useMemo(() => checkCoherence(exitCountry, tz, langs), [exitCountry, tz, langs])

  /* ── Checklist ── */
  const [done, setDone] = useState<Record<string, boolean>>({})
  const progress = useMemo(() => checklistProgress(done), [done])

  const protocolText = useMemo(
    () =>
      exportProtocol({
        platform,
        iface,
        exitCountry,
        done,
        ipSummary: ipInfo ? `${ipInfo.ip} · ${ipInfo.country ?? '?'} · ${ipInfo.isp ?? '?'}` : undefined,
        webrtcSummary: webrtc ? webrtcVerdict(webrtc, false).verdict : undefined,
      }),
    [platform, iface, exitCountry, done, ipInfo, webrtc],
  )

  useEffect(() => {
    setIface(IFACE_BY_PLATFORM[platform])
  }, [platform])

  const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'scan', label: '① Escáner de exposición', icon: Radar },
    { id: 'recipes', label: '② Cambio real (recetas)', icon: RouteIcon },
    { id: 'protocol', label: '③ Identidad nueva', icon: ClipboardList },
  ]

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={Ghost}
        title="Anonymity Lab"
        desc="Diagnóstico en vivo de tu exposición (IP, WebRTC, DNS, huella) y recetas exactas para cambiar IP/MAC de verdad en tu sistema — más el protocolo completo de identidad nueva"
        badge="Ronda 16"
      />

      <InfoBanner>
        La verdad primero: <b>un navegador no puede cambiar tu IP pública ni tu MAC</b> (requiere privilegios del sistema
        operativo). Esta tool hace lo que sí es posible 100% client-side: <b>detectar</b> todo lo que te delata ahora mismo,
        y <b>generarte los comandos exactos</b> para hacer el cambio real en Linux, Windows, macOS, Android o iOS. El
        resultado final (crear cuentas o navegar «en otro estado») se consigue ejecutando esas recetas tú, con este
        diagnóstico como verificación.
      </InfoBanner>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {/* ─────────────────────── TAB 1: ESCÁNER ─────────────────────── */}
      {tab === 'scan' && (
        <div className="space-y-4">
          <Reveal>
            <Card icon={Radar} title="Exposición actual">
              <div className="mb-3 flex flex-wrap gap-2">
                <Button onClick={runIpScan} disabled={scanning}>
                  {scanning ? <Spinner /> : <MapPin size={14} />} {scanning ? 'Consultando…' : 'Escanear mi IP pública'}
                </Button>
                <Button variant="ghost" onClick={runWebrtcTest} disabled={webrtcRunning}>
                  {webrtcRunning ? <Spinner /> : <Eye size={14} />} {webrtcRunning ? 'Sondando ICE…' : 'Test de fuga WebRTC'}
                </Button>
              </div>
              {ipError && <ErrorBox>{ipError}</ErrorBox>}
              {ipInfo && (
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <KV k="IP pública" v={ipInfo.ip} copyable />
                  <KV k="País" v={`${ipInfo.country ?? '—'} (${ipInfo.countryCode ?? '—'})`} />
                  <KV k="Ciudad / región" v={[ipInfo.city, ipInfo.region].filter(Boolean).join(', ') || '—'} />
                  <KV k="ISP / org" v={ipInfo.isp ?? ipInfo.org ?? '—'} />
                  <KV k="ASN" v={ipInfo.asn ?? '—'} />
                  <KV k="Zona horaria" v={ipInfo.timezone ?? tz} />
                </div>
              )}
              {ipInfo && (
                <p className="mt-3 text-xs text-white/50">
                  La consulta va a ipwho.is (CORS abierto): ve tu IP, igual que cualquier web que visitas. Es el punto de
                  partida honesto del diagnóstico.
                </p>
              )}
            </Card>
          </Reveal>

          <Reveal delay={0.05}>
            <Card icon={Eye} title="Fuga WebRTC (RTCPeerConnection real)">
              {!webrtc && (
                <p className="text-sm text-white/60">
                  Pulsa el botón de arriba: crea una RTCPeerConnection real, negocia ICE y parsea los candidates SDP para
                  mostrar qué IPs filtra tu navegador aunque uses VPN o proxy.
                </p>
              )}
              {webrtc && (
                <>
                  {(() => {
                    const v = webrtcVerdict(webrtc, ipInfo?.isDatacenter ?? false)
                    return (
                      <div className="mb-3 space-y-2">
                        <Badge tone={leakTone(v.level)}>{v.verdict}</Badge>
                        <p className="text-sm text-white/70">{v.detail}</p>
                      </div>
                    )
                  })()}
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <KV k="IPs públicas expuestas" v={webrtc.public.length ? webrtc.public.join(', ') : 'ninguna ✓'} />
                    <KV k="IPs de interfaces (privadas)" v={webrtc.local.length ? webrtc.local.join(', ') : 'ninguna ✓'} />
                    <KV k="Candidatos mDNS (.local)" v={webrtc.mdns.length ? webrtc.mdns.join(', ') : 'ninguno'} />
                  </div>
                  {webrtc.raw.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-white/50 hover:text-white/80">
                        Ver candidates SDP crudos ({webrtc.raw.length})
                      </summary>
                      <div className="mt-2">
                        <CopyBlock text={webrtc.raw.join('\n')} label="a=candidate" maxH="12rem" />
                      </div>
                    </details>
                  )}
                </>
              )}
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card icon={ScanFace} title="Huella del navegador (estimación honesta)">
              <div className="mb-3 flex items-center gap-3">
                <Badge tone={leakTone(fp.level)}>≈{fp.bits} bits de entropía</Badge>
                <span className="text-xs text-white/50">{fp.verdict}</span>
              </div>
              <div className="grid gap-x-6 sm:grid-cols-2">
                <KV k="User-Agent" v={ua} />
                <KV k="Idiomas" v={langs} />
                <KV k="Zona horaria" v={tz} />
                <KV k="Pantalla" v={screen} />
                <KV k="Núcleos" v={String(cores ?? '—')} />
                <KV k="RAM (deviceMemory)" v={mem ? `${mem} GB (aprox.)` : 'no expuesta'} />
              </div>
              <div className="mt-3 space-y-1">
                {fp.breakdown.map((b) => (
                  <div key={b.k} className="flex items-center gap-2 text-xs">
                    <span className="w-40 shrink-0 text-white/60">{b.k}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/10">
                      <div
                        className="h-full rounded bg-acento"
                        style={{ width: `${Math.min(100, (b.bits / 12) * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-white/50">{b.bits}b</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card icon={Radar} title="Catálogo de superficies de fuga — qué te delata aunque cambies de IP">
              <div className="space-y-3">
                {LEAK_SURFACES.map((s) => (
                  <div key={s.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={leakTone(s.level)}>{s.level}</Badge>
                      <span className="text-sm font-semibold">{s.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">
                      <b className="text-white/80">Revela:</b> {s.reveals}
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      <b className="text-white/80">Mecánica:</b> {s.howItWorks}
                    </p>
                    <p className="mt-1 text-xs text-ok">
                      <b>Defensa:</b> {s.defense}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.2}>
            <Card icon={MapPin} title="Coherencia de identidad por país de salida">
              <p className="mb-3 text-sm text-white/60">
                El antifraude más básico no es la IP: es la <b>incoherencia</b>. IP de un país + hora e idioma de otro = puente
                detectado. Elige el país de tu identidad y compara con tu navegador actual.
              </p>
              <div className="mb-3 max-w-md">
                <select className={inputCls} value={exitCountry} onChange={(e) => setExitCountry(e.target.value)}>
                  {EXIT_COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-x-6 sm:grid-cols-2">
                <KV k="Zona horaria objetivo" v={coherence.target.timezone || '—'} />
                <KV k="Accept-Language objetivo" v={coherence.target.langs || '—'} mono />
                <KV k="Tu zona horaria real" v={tz} />
                <KV k="Tus idiomas reales" v={langs} mono />
              </div>
              <p className="mt-2 text-xs text-white/50">{coherence.target.note}</p>
              {coherence.mismatches.length > 0 && (
                <div className="mt-3 space-y-1">
                  {coherence.mismatches.map((m, i) => (
                    <p key={i} className="text-xs text-warn">
                      ⚠ {m}
                    </p>
                  ))}
                  <p className="text-xs text-white/50">
                    Se corrige con un perfil de navegador dedicado configurado con la hora/idioma del país de salida (o con
                    Tor Browser, que uniformiza todo).
                  </p>
                </div>
              )}
              {coherence.ok && coherence.mismatches.length === 0 && (
                <p className="mt-3 text-xs text-ok">✓ Tu entorno ya es coherente con esta identidad (o eres local).</p>
              )}
            </Card>
          </Reveal>
        </div>
      )}

      {/* ─────────────────────── TAB 2: RECETAS ─────────────────────── */}
      {tab === 'recipes' && (
        <div className="space-y-4">
          <Reveal>
            <Card icon={RouteIcon} title="Generador de recetas de cambio real">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-white/60">Plataforma</label>
                  <select
                    className={inputCls}
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                  >
                    {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                      <option key={p} value={p}>
                        {PLATFORM_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">Interfaz (Linux/macOS)</label>
                  <TextInput value={iface} onChange={(e) => setIface(e.target.value)} placeholder="wlan0" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">Tipo de receta</label>
                  <select
                    className={inputCls}
                    value={recipeKind}
                    onChange={(e) => setRecipeKind(e.target.value as typeof recipeKind)}
                  >
                    <option value="mac">MAC: identidad de hardware</option>
                    <option value="net">IP: Tor / VPN / DHCP</option>
                    <option value="verify">Verificar el cambio</option>
                    <option value="restore">Restaurar (deshacer)</option>
                  </select>
                </div>
                {recipeKind === 'net' && (
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Vía</label>
                    <select
                      className={inputCls}
                      value={netTarget}
                      onChange={(e) => setNetTarget(e.target.value as 'tor' | 'vpn' | 'dhcp')}
                    >
                      <option value="tor">Tor (SOCKS 9050 + NEWNYM)</option>
                      <option value="vpn">VPN WireGuard + kill switch</option>
                      <option value="dhcp">Renovar DHCP (con la verdad)</option>
                    </select>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-white/50">
                Estos comandos se ejecutan <b>en tu sistema</b> (terminal con sudo / PowerShell admin / Ajustes del móvil).
                La tool los genera exactos; tú los ejecutas donde tienes privilegios.
              </p>
            </Card>
          </Reveal>

          {recipes.map((r, i) => (
            <Reveal key={r.id} delay={0.05 * i}>
              <Card icon={RouteIcon} title={r.title}>
                <p className="mb-3 text-sm text-white/60">{r.desc}</p>
                {r.requires && <p className="mb-3 text-xs text-warn">Requiere: {r.requires}</p>}
                <div className="space-y-2">
                  {r.steps.map((s, j) => (
                    <div key={j} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <CopyBlock text={s.cmd} label={`paso ${j + 1}`} maxH="10rem" />
                      <p className="mt-2 text-xs text-white/60">{s.note}</p>
                    </div>
                  ))}
                </div>
                {r.risks.length > 0 && (
                  <div className="mt-3 rounded-lg border border-warn/30 bg-warn/5 p-3">
                    <p className="mb-1 text-xs font-semibold text-warn">Riesgos y trampas:</p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
                      {r.risks.map((rk, j) => (
                        <li key={j}>{rk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </Reveal>
          ))}
        </div>
      )}

      {/* ─────────────────────── TAB 3: PROTOCOLO ─────────────────────── */}
      {tab === 'protocol' && (
        <div className="space-y-4">
          <Reveal>
            <Card icon={ClipboardList} title="Checklist de identidad nueva">
              <div className="mb-3 flex items-center gap-3">
                <Badge tone={progress.ready ? 'ok' : 'warn'}>
                  {progress.done}/{progress.total} ({progress.pct}%)
                </Badge>
                {progress.ready ? (
                  <span className="text-xs text-ok">✓ Bloqueadores completados: entorno listo para la identidad</span>
                ) : (
                  <span className="text-xs text-warn">
                    Bloqueadores pendientes: {progress.blockersLeft.length}
                  </span>
                )}
              </div>
              <div className="mb-4 h-1.5 overflow-hidden rounded bg-white/10">
                <div className="h-full rounded bg-acento transition-all" style={{ width: `${progress.pct}%` }} />
              </div>
              {['Ruta de red', 'Huella del navegador', 'Comportamiento', 'Cierre y verificación'].map((group) => (
                <div key={group} className="mb-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">{group}</h4>
                  <div className="space-y-1.5">
                    {IDENTITY_CHECKLIST.filter((it) => it.group === group).map((it) => (
                      <label
                        key={it.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-black/20 p-2.5 hover:border-white/20"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-[rgb(var(--acento-rgb,46,232,138))]"
                          checked={!!done[it.id]}
                          onChange={(e) => setDone((d) => ({ ...d, [it.id]: e.target.checked }))}
                        />
                        <span>
                          <span className="text-sm">
                            {it.item} {it.blocker && <Badge tone="bad">bloqueante</Badge>}
                          </span>
                          <span className="block text-xs text-white/50">{it.why}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          </Reveal>

          <Reveal delay={0.05}>
            <Card icon={Ghost} title="Límites honestos de esta tool">
              <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
                {TOOL_LIMITS.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card icon={Ghost} title="Marco legal — lo que esto sí y no cubre">
              <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
                {LEGAL_NOTES.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card icon={Radar} title="Export del protocolo completo (Markdown)">
              <p className="mb-3 text-sm text-white/60">
                Todo lo configurado en esta sesión — plataforma, país de salida, recetas por ejecutar, estado del checklist,
                exposición detectada y avisos legales — en un solo documento copiable.
              </p>
              <CopyBlock text={protocolText} label="protocolo-identidad.md" maxH="24rem" />
            </Card>
          </Reveal>
        </div>
      )}
    </div>
  )
}
