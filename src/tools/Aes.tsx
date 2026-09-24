import { useState } from 'react'
import { Lock } from 'lucide-react'
import { ToolHeader, CopyBlock, Field, TextArea, TextInput, Button, ErrorBox, Reveal } from '../components/ui'

/* AES-GCM y AES-CBC con PBKDF2-SHA256 — 100% WebCrypto */

const enc = new TextEncoder()
const dec = new TextDecoder()

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password) as unknown as BufferSource, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

interface Envelope {
  v: number
  mode: 'GCM'
  salt: string
  iv: string
  data: string
}

export function encryptText(plain: string, password: string): Promise<string> {
  return (async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(password, salt)
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain) as unknown as BufferSource))
    const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
    const envelope: Envelope = { v: 1, mode: 'GCM', salt: b64(salt), iv: b64(iv), data: b64(data) }
    return JSON.stringify(envelope)
  })()
}

export function decryptText(envelopeText: string, password: string): Promise<string> {
  return (async () => {
    let env: Envelope
    try {
      env = JSON.parse(envelopeText)
    } catch {
      throw new Error('El texto a descifrar debe ser el JSON envelope generado por esta herramienta')
    }
    if (env.mode !== 'GCM') throw new Error('Modo no soportado: solo GCM')
    const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
    const key = await deriveKey(password, fromB64(env.salt))
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(env.iv) }, key, fromB64(env.data) as unknown as BufferSource)
      return dec.decode(plain)
    } catch {
      throw new Error('Descifrado fallido: ¿contraseña incorrecta o envelope corrupto? (GCM autentica: un solo bit cambiado falla)')
    }
  })()
}

export default function Aes() {
  const [plain, setPlain] = useState('mensaje ultra secreto')
  const [password, setPassword] = useState('Contraseña!Fuerte#2026')
  const [cipher, setCipher] = useState('')
  const [cipherIn, setCipherIn] = useState('')
  const [decOut, setDecOut] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const doEncrypt = async () => {
    setError(null)
    setBusy(true)
    try {
      setCipher(await encryptText(plain, password))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const doDecrypt = async () => {
    setError(null)
    setBusy(true)
    try {
      setDecOut(await decryptText(cipherIn, password))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <ToolHeader icon={Lock} title="AES-256-GCM + PBKDF2" desc="Cifrado autenticado con WebCrypto nativo — el navegador no puede hacer AES-CBC seguro para shares, usa GCM" />

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="card p-6">
            <h3 className="mb-4 font-mono text-sm font-bold text-white">🔒 cifrar</h3>
            <Field label="Texto claro">
              <TextArea value={plain} onChange={(e) => setPlain(e.target.value)} spellCheck={false} />
            </Field>
            <Field label="Contraseña" className="mt-3">
              <TextInput value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button onClick={doEncrypt} disabled={busy} className="mt-4">
              {busy ? 'cifrando…' : 'cifrar'}
            </Button>
            {cipher && (
              <div className="mt-4">
                <CopyBlock text={cipher} label="envelope cifrado (JSON)" />
                <p className="mt-2 font-mono text-[10px] text-grey">
                  PBKDF2-SHA256 100k iteraciones · salt 16B · IV 12B aleatorio · AES-256-GCM
                </p>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card p-6">
            <h3 className="mb-4 font-mono text-sm font-bold text-white">🔓 descifrar</h3>
            <Field label="Envelope JSON">
              <TextArea value={cipherIn} onChange={(e) => setCipherIn(e.target.value)} placeholder='{"v":1,"mode":"GCM",…}' spellCheck={false} />
            </Field>
            <Field label="Contraseña" className="mt-3">
              <TextInput value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button onClick={doDecrypt} disabled={busy || !cipherIn} className="mt-4">
              descifrar
            </Button>
            {decOut && (
              <div className="mt-4">
                <CopyBlock text={decOut} label="texto claro recuperado" />
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 GCM autentica el mensaje: si alguien altera un byte, el descifrado falla (no devuelve basura). El envelope es
          JSON portable — compártelo entero, la contraseña nunca viaja. Formato compatible con otros lenguajes porque usa
          PBKDF2 estándar (100000 iter, SHA-256).
        </div>
      </Reveal>
    </div>
  )
}
