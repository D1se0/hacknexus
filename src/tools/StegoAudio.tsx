import { useEffect, useRef, useState } from 'react'
import { AudioLines, Upload, Lock, Unlock, Download, Image as ImageIcon } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, Reveal, InfoBanner, useToast, CopyBlock } from '../components/ui'
import { download } from '../lib/util'
import { parseWav, embedLsb, extractLsb, encodeWav, capacityBits, spectrogram, type WavInfo } from '../lib/stegoaudio'

function WaveCanvas({ samples, color }: { samples: Int16Array; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const W = cv.width, H = cv.height
    ctx.fillStyle = '#05080a'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    const step = Math.max(1, Math.floor(samples.length / W))
    for (let x = 0; x < W; x++) {
      let min = 32767, max = -32768
      for (let i = 0; i < step; i++) {
        const v = samples[x * step + i] ?? 0
        if (v < min) min = v
        if (v > max) max = v
      }
      ctx.moveTo(x, ((min + 32768) / 65536) * H)
      ctx.lineTo(x, ((max + 32768) / 65536) * H)
    }
    ctx.stroke()
  }, [samples, color])
  return <canvas ref={ref} width={900} height={110} className="w-full rounded-lg border border-edge" />
}

function SpectroCanvas({ samples }: { samples: Int16Array }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const spec = spectrogram(samples, { frame: 512, maxCols: 420 })
    const W = cv.width, H = cv.height
    const cw = W / Math.max(1, spec.columns)
    const ch = H / Math.max(1, spec.rows)
    for (let c = 0; c < spec.columns; c++) {
      const col = spec.values[c]
      for (let f = 0; f < spec.rows; f++) {
        const v = col[f]
        // paleta verde-terminal: oscuro → acento
        ctx.fillStyle = `rgb(${Math.floor(6 * v)}, ${Math.floor(14 + 238 * v)}, ${Math.floor(10 + 120 * v)})`
        ctx.fillRect(c * cw, H - (f + 1) * ch, cw + 1, ch + 1)
      }
    }
  }, [samples])
  return <canvas ref={ref} width={900} height={220} className="w-full rounded-lg border border-edge" />
}

export default function StegoAudio() {
  const toast = useToast()
  const [wav, setWav] = useState<WavInfo | null>(null)
  const [name, setName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState('mensaje secreto de laboratorio 🔒')
  const [extracted, setExtracted] = useState<string | null>(null)
  const [showSpectro, setShowSpectro] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const read = async (file: File) => {
    setErr(null)
    setExtracted(null)
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('máximo 16 MB (recorta el WAV o bájalo a mono)')
      setWav(parseWav(new Uint8Array(await file.arrayBuffer())))
      setName(file.name)
    } catch (e) {
      setErr((e as Error).message)
      setWav(null)
    }
  }

  const doEmbed = () => {
    if (!wav) return
    try {
      const res = embedLsb(wav.samples, msg)
      const out = encodeWav(res.samples, wav.sampleRate, wav.channels)
      download(`stego-${name || 'audio.wav'}`, out as unknown as BlobPart, 'audio/wav')
      toast(`Mensaje incrustado en ${res.bitsUsed.toLocaleString('es-ES')} bits LSB`)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const doExtract = () => {
    if (!wav) return
    const m = extractLsb(wav.samples)
    setExtracted(m || '(no se encontró mensaje: el WAV no lleva nuestra marca HXST en el LSB)')
  }

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={AudioLines}
        title="Stego Audio"
        desc="Esteganografía LSB sobre WAV/PCM real: incrusta y extrae mensajes en el bit menos significativo de las muestras, con waveform y espectrograma calculados aquí mismo"
        badge="stego"
      />

      <InfoBanner>
        El LSB de una muestra de 16 bits cambia la amplitud en 1/32768 — inaudible. Un audio de 3 min mono 44.1 kHz esconde ~8 KB de mensaje. Defensa: no hay comparación "visual" en audio; los detectores usan <b>estadística del LSB</b> (chi-cuadrado, RS analysis): cuanto más ruido original tenga el audio, mejor se esconde.
      </InfoBanner>

      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void read(f) }}
        className="card mb-6 border-dashed p-6 text-center"
      >
        <input ref={inputRef} type="file" accept=".wav" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f) }} />
        {wav ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge tone="ok">{name}</Badge>
              <Badge tone="neutral">{wav.sampleRate.toLocaleString('es-ES')} Hz</Badge>
              <Badge tone="neutral">{wav.channels === 1 ? 'mono' : `${wav.channels} canales`}</Badge>
              <Badge tone="neutral">16-bit PCM</Badge>
              <Badge tone="accent">{wav.durationSec.toFixed(1)} s</Badge>
              <Badge tone="info">capacidad: {(capacityBits(wav.samples) / 8 / 1024).toFixed(1)} KB</Badge>
            </div>
            <WaveCanvas samples={wav.samples} color="#2ee88a" />
            <button onClick={() => setShowSpectro((s) => !s)} className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 font-mono text-[11px] text-grey hover:border-acento/50 hover:text-acento">
              <ImageIcon size={12} /> {showSpectro ? 'ocultar' : 'ver'} espectrograma (FFT propia)
            </button>
            {showSpectro && <SpectroCanvas samples={wav.samples} />}
          </div>
        ) : (
          <div onClick={() => inputRef.current?.click()} className="cursor-pointer">
            <Upload size={26} className="mx-auto text-acento" />
            <p className="mt-2 font-mono text-sm text-ink">arrastra un <b>.wav</b> PCM 16-bit — o pica para elegir</p>
            <p className="mt-1 font-mono text-[10.5px] text-grey">convierte cualquier audio: ffmpeg -i in.mp3 -acodec pcm_s16le -ac 1 out.wav</p>
          </div>
        )}
      </div>

      {err && <p className="mb-6 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 font-mono text-xs text-bad">{err}</p>}

      {wav && (
        <div className="grid min-w-0 gap-6 md:grid-cols-2">
          <Reveal>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Lock size={15} className="text-acento" /> incrustar mensaje (LSB)</h3>
              <Field label="mensaje secreto" hint={`${msg.length} chars`}>
                <TextInput value={msg} onChange={(e) => setMsg(e.target.value)} className="py-2 font-mono text-xs" />
              </Field>
              <Button onClick={doEmbed} className="mt-3 w-full"><Download size={14} /> incrustar y descargar WAV</Button>
              <p className="mt-2 text-[11px] leading-snug text-grey">
                El mensaje viaja en el LSB de las muestras consecutivas con cabecera <code className="text-acento">HXST</code> + longitud. La calidad de audio NO cambia (delta de ±1 en muestras de ±32768).
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Unlock size={15} className="text-warn" /> extraer mensaje</h3>
              <Button variant="ghost" onClick={doExtract} className="w-full">leer LSB de este WAV</Button>
              {extracted !== null && (
                <div className="mt-3">
                  <CopyBlock text={extracted} label="mensaje extraído" maxH="max-h-40" />
                </div>
              )}
              <p className="mt-2 text-[11px] leading-snug text-grey">
                Prueba en vivo: incrusta un mensaje, descarga el WAV, vuelve a subirlo y extráelo — el ciclo completo sin salir del navegador.
              </p>
            </div>
          </Reveal>
        </div>
      )}
    </div>
  )
}
