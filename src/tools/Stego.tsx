import { useRef, useState } from 'react'
import { EyeOff, Upload, Loader2, Lock, Unlock, Image as ImageIcon } from 'lucide-react'
import { ToolHeader, Badge, Field, TextArea, Button, Reveal, ErrorBox, InfoBanner, useToast } from '../components/ui'
import { download } from '../lib/util'

/* Formato LSB: [8 bytes little-endian con longitud en bytes][datos UTF-8] */
const MAGIC = 'HNSB' /* HackNexus Stego Begin */

async function encodeLsb(file: File, message: string): Promise<Blob> {
  const img = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = imageData.data

  const enc = new TextEncoder()
  const msgBytes = enc.encode(message)
  if (4 + 4 + msgBytes.length > Math.floor((px.length / 4) * 3)) {
    throw new Error(`El mensaje (${msgBytes.length} B) no cabe en esta imagen (capacidad ${Math.floor((px.length / 4) * 3 / 1024)} KB)`)
  }

  const payload = new Uint8Array(4 + 4 + msgBytes.length)
  payload.set(new TextEncoder().encode(MAGIC), 0)
  const len = msgBytes.length
  payload[4] = len & 0xff
  payload[5] = (len >> 8) & 0xff
  payload[6] = (len >> 16) & 0xff
  payload[7] = (len >> 24) & 0xff
  payload.set(msgBytes, 8)

  let bitIdx = 0
  for (let i = 0; i < payload.length; i++) {
    for (let b = 0; b < 8; b++) {
      const pixelChannel = bitIdx // se salta el canal alpha: 3 canales por pixel
      const pixelIdx = Math.floor(pixelChannel / 3) * 4 + (pixelChannel % 3)
      const bit = (payload[i] >> (7 - b)) & 1
      px[pixelIdx] = (px[pixelIdx] & 0xfe) | bit
      bitIdx++
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el PNG'))), 'image/png')
  })
}

function decodeLsb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const img = await createImageBitmap(new Blob([reader.result as ArrayBuffer]))
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0)
        const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data

        const readByte = (offset: number): number => {
          let byte = 0
          for (let b = 0; b < 8; b++) {
            const bitIdx = offset * 8 + b
            const pixelIdx = Math.floor(bitIdx / 3) * 4 + (bitIdx % 3)
            byte = (byte << 1) | (px[pixelIdx] & 1)
          }
          return byte
        }

        const magic = String.fromCharCode(readByte(0), readByte(1), readByte(2), readByte(3))
        if (magic !== MAGIC) {
          reject(new Error('No se encontró payload HackNexus en el canal LSB (prueba con la imagen original sin recomprimir)'))
          return
        }
        const len = readByte(4) | (readByte(5) << 8) | (readByte(6) << 16) | (readByte(7) << 24)
        if (len <= 0 || len > 5_000_000) {
          reject(new Error(`Longitud de payload absurda (${len} B): imagen corrupta o recomprimida`))
          return
        }
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) bytes[i] = readByte(8 + i)
        resolve(new TextDecoder().decode(bytes))
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

export default function Stego() {
  const [mode, setMode] = useState<'hide' | 'extract'>('hide')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [coverName, setCoverName] = useState('')
  const hideInput = useRef<HTMLInputElement>(null)
  const extractInput = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const hide = async (file: File) => {
    if (!message.trim()) {
      setErr('Escribe primero el mensaje a ocultar')
      return
    }
    setBusy(true)
    setErr(null)
    setResult(null)
    setCoverName(file.name)
    try {
      const blob = await encodeLsb(file, message)
      const url = URL.createObjectURL(blob)
      setResult(url)
      download(file.name.replace(/\.[^.]+$/, '') + '.stego.png', blob, 'image/png')
      toast('Imagen con payload generada y descargada')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const extract = async (file: File) => {
    setBusy(true)
    setErr(null)
    setResult(null)
    setCoverName(file.name)
    try {
      const msg = await decodeLsb(file)
      setMessage(msg)
      toast(`Extraídos ${msg.length} caracteres`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <ToolHeader icon={EyeOff} title="Esteganografía LSB" desc="Oculta o extrae mensajes en el bit menos significativo de los píxeles PNG — invisible al ojo humano" />

      <InfoBanner>
        El LSB modifica el último bit de cada canal RGB: cambia cada color como máximo en 1/255, imperceptible.
        Solo sobrevive en formatos <span className="font-mono">sin pérdida</span> (PNG/BMP): subirlo a redes sociales lo destruye (recompresión JPEG).
      </InfoBanner>

      <Reveal>
        <div className="flex gap-2">
          {(['hide', 'extract'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setErr(null); setResult(null) }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-sm transition-all ${
                mode === m ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'
              }`}
            >
              {m === 'hide' ? <Lock size={14} /> : <Unlock size={14} />}
              {m === 'hide' ? 'ocultar mensaje' : 'extraer mensaje'}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-4 space-y-4 p-6">
          {mode === 'hide' && (
            <Field label="mensaje secreto" hint={`${message.length} caracteres · se guarda con cabecera ${MAGIC}`}>
              <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="La cigüeña vuela a medianoche…" />
            </Field>
          )}

          <div>
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-grey">
              {mode === 'hide' ? 'imagen portadora (se re-exporta como PNG)' : 'imagen con payload'}
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => hideInput.current?.click()}
                disabled={busy}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-edge py-8 transition-colors hover:border-acento/50 disabled:opacity-40"
              >
                {busy ? <Loader2 size={22} className="animate-spin text-acento" /> : mode === 'hide' ? <Upload size={22} className="text-grey" /> : <ImageIcon size={22} className="text-grey" />}
                <span className="font-mono text-[11px] text-ink">{coverName || 'seleccionar imagen'}</span>
                <input
                  ref={hideInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) mode === 'hide' ? hide(f) : extract(f) }}
                />
              </button>
              {mode === 'extract' && (
                <button
                  onClick={() => extractInput.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-edge py-8 transition-colors hover:border-acento/50"
                >
                  <Unlock size={22} className="text-grey" />
                  <span className="font-mono text-[11px] text-grey">o pega la imagen…</span>
                  <input ref={extractInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) extract(f) }} />
                </button>
              )}
            </div>
          </div>

          {err && <ErrorBox>{err}</ErrorBox>}

          {mode === 'hide' && result && (
            <div className="rounded-xl border border-ok/40 bg-ok/5 p-4 text-center">
              <Badge tone="ok">payload ocultado ✓</Badge>
              <p className="mt-2 font-mono text-[11px] text-grey">La imagen se ha descargado como PNG. Compártela tal cual (sin recomprimir).</p>
              <img src={result} alt="resultado" className="mx-auto mt-3 max-h-56 rounded-lg border border-edge" />
            </div>
          )}

          {mode === 'extract' && message && (
            <div className="rounded-xl border border-ok/40 bg-ok/5 p-4">
              <Badge tone="ok">mensaje extraído ✓</Badge>
              <pre className="mt-3 whitespace-pre-wrap break-all font-mono text-[13px] text-acento">{message}</pre>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 Para detectar LSB en imágenes sospechosas: <span className="text-acento">zsteg imagen.png</span> (Ruby),
          <span className="text-acento"> stegsolve</span> (canal plano a plano), o mira la entropía de los primeros KB en File Analyzer.
        </div>
      </Reveal>
    </div>
  )
}
