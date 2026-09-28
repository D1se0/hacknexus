import { useEffect, useState } from 'react'
import { Fingerprint, FileInput, Wand2, ShieldCheck, ScanSearch } from 'lucide-react'
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
  type AttestationObjectParsed,
  type ClientDataParsed,
  type DemoAttestation,
  buildDemoAttestation,
  decodeAttestationObject,
  decodeClientDataJSON,
  webauthnSupported,
  PASSKEY_LESSONS,
  PASSKEY_LIMITS,
} from '../lib/passkeys'

type Tab = 'decode' | 'demo' | 'ceremony'
const TABS: { id: Tab; label: string; icon: typeof ScanSearch }[] = [
  { id: 'decode', label: 'Decodificar', icon: ScanSearch },
  { id: 'demo', label: 'Anatomía (demo)', icon: Wand2 },
  { id: 'ceremony', label: 'Ceremonia real', icon: ShieldCheck },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-acento/60'

function AuthDataView({ a }: { a: AttestationObjectParsed }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <KV k="Formato" v={a.fmt} />
        <KV k="attStmt" v={a.attStmtSummary} />
        <KV k="rpIdHash (SHA-256 del dominio)" v={<span className="break-all font-mono text-xs">{a.authData.rpIdHashHex.slice(0, 32)}…</span>} />
        <KV k="signCount" v={String(a.authData.signCount)} />
        {a.authData.aaguid && <KV k="AAGUID" v={<span className="font-mono text-xs">{a.authData.aaguid}</span>} />}
        {a.authData.credentialIdLen !== undefined && (
          <KV k="Credential ID" v={`${a.authData.credentialIdLen} bytes · ${a.authData.credentialIdHex}`} />
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Flags (byte 0x{a.authData.flagsByte.toString(16).padStart(2, '0')})</p>
        <div className="flex flex-wrap gap-2">
          {a.authData.flags.map((f) => (
            <Badge key={f.name} tone={f.set ? (f.name === 'RFU1' || f.name === 'RFU2' ? 'warn' : 'ok') : 'info'}>
              {f.name} {f.set ? '✓' : '✗'}
            </Badge>
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {a.authData.flags.filter((f) => f.set && f.name !== 'RFU1' && f.name !== 'RFU2').map((f) => (
            <p key={f.name} className="text-xs text-white/50">▸ <b>{f.name}</b>: {f.desc}</p>
          ))}
        </div>
      </div>

      {a.authData.coseKey && (
        <div className="rounded-lg border border-acento/40 bg-acento/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Clave pública COSE (la privada nunca sale del authenticator)</p>
          <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <KV k="Tipo (kty)" v={a.authData.coseKey.ktyName} />
            <KV k="Algoritmo" v={a.authData.coseKey.algName} />
            {a.authData.coseKey.crvName && <KV k="Curva" v={a.authData.coseKey.crvName} />}
            <KV k="Tamaño" v={`${a.authData.coseKey.bits} bits`} />
          </div>
          {a.authData.coseKey.xHex && (
            <p className="mt-2 break-all font-mono text-xs text-white/40">x: {a.authData.coseKey.xHex.slice(0, 48)}…</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function PasskeysLab() {
  const [tab, setTab] = useState<Tab>('demo')

  /* ---- Decodificar pegado ---- */
  const [attB64, setAttB64] = useState('')
  const [cdj, setCdj] = useState('')
  const [decoded, setDecoded] = useState<{ att?: AttestationObjectParsed; cd?: ClientDataParsed; err?: string } | null>(null)

  function decodePasted() {
    try {
      const out: { att?: AttestationObjectParsed; cd?: ClientDataParsed; err?: string } = {}
      const trimmed = attB64.trim()
      if (trimmed) {
        const bin = Uint8Array.from(atob(trimmed.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (trimmed.length % 4)) % 4)))
        out.att = decodeAttestationObject(bin)
      }
      if (cdj.trim()) out.cd = decodeClientDataJSON(cdj.trim())
      setDecoded(out)
    } catch (e) {
      setDecoded({ err: e instanceof Error ? e.message : 'entrada no válida' })
    }
  }

  /* ---- Demo sintética ---- */
  const [demo, setDemo] = useState<DemoAttestation | null>(null)
  useEffect(() => {
    buildDemoAttestation().then(setDemo).catch(() => setDemo(null))
  }, [])

  /* ---- Ceremonia real ---- */
  const [supported, setSupported] = useState<boolean | null>(null)
  const [ceremonyLog, setCeremonyLog] = useState<string[]>([])
  const [ceremonyBusy, setCeremonyBusy] = useState(false)
  useEffect(() => setSupported(webauthnSupported()), [])

  async function runCeremony() {
    if (!supported) return
    setCeremonyBusy(true)
    setCeremonyLog(['▶ navigator.credentials.create() con challenge aleatoria…'])
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'HackNexus Lab', id: window.location.hostname },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'lab@hacknexus', displayName: 'Laboratorio HackNexus' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
          timeout: 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null
      if (!cred) {
        setCeremonyLog((l) => [...l, '✗ El navegador devolvió null (ceremonia cancelada)'])
      } else {
        const response = cred.response as AuthenticatorAttestationResponse
        const attB64 = btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)))
        const cd = decodeClientDataJSON(attB64)
        setCeremonyLog((l) => [
          ...l,
          `✓ Credencial creada: ${cred.id.slice(0, 24)}…`,
          `  type: ${cred.type}`,
          `  clientData.type: ${cd.type}`,
          `  clientData.origin: ${cd.origin}`,
          `  challenge coincide: ${cd.challengeHex.length > 0 ? 'sí (verificada por el RP)' : 'no'}`,
          '→ En producción el servidor verificaría origin, challenge, flags y signCount antes de registrar la clave pública.',
        ])
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setCeremonyLog((l) => [...l, `✗ ${msg}`, '  (Normal si no hay authenticator de plataforma, se cancela el diálogo o no es HTTPS)'])
    } finally {
      setCeremonyBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={Fingerprint}
        title="Passkeys Lab"
        desc="Anatomía completa de WebAuthn: decodificador CBOR de attestationObject, flags del authenticatorData, clave pública COSE, clientDataJSON y ceremonia real navigator.credentials.create()"
        badge="Ronda 19"
      />

      <InfoBanner>
        Una passkey es un par de claves donde la <b>privada jamás sale del authenticator</b>: lo que viaja es una firma
        sobre challenge+origin+rpIdHash. Aquí puedes disecar una attestation byte a byte, generar una sintética y
        lanzar la ceremonia real de tu navegador. <b>Todo se procesa en local.</b>
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'decode' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                attestationObject en base64url (pegado de la respuesta real de un registro WebAuthn)
              </label>
              <TextArea value={attB64} onChange={(e) => setAttB64(e.target.value)} rows={4} placeholder="o2NmbXRkbm9uZWdhdHRTdGF0ZRj…" />
              <label className="mb-2 mt-3 block text-xs font-semibold uppercase tracking-wider text-white/50">
                clientDataJSON en base64url (opcional)
              </label>
              <TextArea value={cdj} onChange={(e) => setCdj(e.target.value)} rows={3} placeholder="eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIi…" />
              <Button onClick={decodePasted} disabled={!attB64.trim() && !cdj.trim()} className="mt-3 gap-2">
                <FileInput size={14} /> Decodificar
              </Button>
              {decoded?.err && <p className="mt-3 text-xs text-red-400">✗ {decoded.err}</p>}
            </div>
            {decoded?.att && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <h3 className="mb-3 text-sm font-semibold">attestationObject decodificado</h3>
                <AuthDataView a={decoded.att} />
              </div>
            )}
            {decoded?.cd && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <h3 className="mb-3 text-sm font-semibold">clientDataJSON</h3>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <KV k="type" v={decoded.cd.type} />
                  <KV k="origin" v={decoded.cd.origin} />
                  <KV k="challenge (hex)" v={<span className="break-all font-mono text-xs">{decoded.cd.challengeHex.slice(0, 40)}…</span>} />
                  {decoded.cd.crossOrigin !== undefined && <KV k="crossOrigin" v={String(decoded.cd.crossOrigin)} />}
                </div>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs text-white/60">{decoded.cd.raw}</pre>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'demo' && demo && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <p className="mb-3 text-xs text-white/60">
                Attestation sintética (fmt «none», clave EC2 P-256 fabricada) con la misma estructura exacta que emite
                tu navegador al registrar una passkey sincronizada:
              </p>
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <KV k="Tamaño attestationObject" v={`${demo.attestationObjectB64url.length} chars b64url`} />
                <KV k="Ceremonia" v={demo.clientData.type} />
                <KV k="Origin" v={demo.clientData.origin} />
                <KV k="Challenge" v={<span className="break-all font-mono text-xs">{demo.clientData.challengeHex.slice(0, 24)}…</span>} />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h3 className="mb-3 text-sm font-semibold">authenticatorData disseccionado</h3>
              <AuthDataView a={demo.attestationObject} />
            </div>
            <CopyBlock label="attestationObject (base64url)" text={demo.attestationObjectB64url} />
            <CopyBlock label="clientDataJSON (base64url)" text={demo.clientDataJSONB64url} />
          </div>
        </Reveal>
      )}

      {tab === 'ceremony' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runCeremony} disabled={!supported || ceremonyBusy} className="gap-2">
                  <ShieldCheck size={14} /> {ceremonyBusy ? 'Esperando authenticator…' : 'Crear passkey en este navegador'}
                </Button>
                {supported === null && <Badge tone="info">comprobando soporte…</Badge>}
                {supported === false && <Badge tone="bad">WebAuthn no disponible (requiere HTTPS o localhost)</Badge>}
                {supported === true && <Badge tone="ok">WebAuthn disponible</Badge>}
              </div>
              <p className="mt-3 text-xs text-white/50">
                Lanza la ceremonia real de registro con challenge aleatoria. Tu navegador decidirá cómo: Touch ID,
                Windows Hello, llave USB o teléfono por QR. La credencial vive SOLO en tu dispositivo.
              </p>
              {ceremonyLog.length > 0 && (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs text-acento">{ceremonyLog.join('\n')}</pre>
              )}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Fingerprint size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Lecciones de las passkeys</h3>
          </div>
          <div className="space-y-2">
            {PASSKEY_LESSONS.map((l) => (
              <div key={l.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <span className="text-sm font-semibold">{l.title}</span>
                <p className="mt-1 text-xs text-white/60">{l.lesson}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {PASSKEY_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
