import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScanLine, Upload, Layers, BarChart3 } from 'lucide-react'
import {
  Badge,
  Button,
  InfoBanner,
  KV,
  Reveal,
  ToolHeader,
} from '../components/ui'
import {
  CHANNELS,
  STEGO_LESSONS,
  STEGO_LIMITS,
  bitPlane,
  chiSquareAttack,
  lsbStats,
} from '../lib/steganalysis'
import type { Channel } from '../lib/steganalysis'

type Tab = 'planes' | 'chi'
const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'planes', label: 'Planos de bits', icon: Layers },
  { id: 'chi', label: 'Ataque chi²', icon: BarChart3 },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-acento/60'

interface LoadedImage {
  name: string
  w: number
  h: number
  data: ImageData
}

export default function Steganalysis() {
  const [tab, setTab] = useState<Tab>('planes')
  const [img, setImg] = useState<LoadedImage | null>(null)
  const [err, setErr] = useState('')

  const loadFile = useCallback((file: File) => {
    setErr('')
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(image.width, image.height))
      const w = Math.max(1, Math.round(image.width * scale))
      const h = Math.max(1, Math.round(image.height * scale))
      const cv = document.createElement('canvas')
      cv.width = w
      cv.height = h
      const ctx = cv.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        setErr('No se pudo crear el canvas 2D')
        return
      }
      ctx.drawImage(image, 0, 0, w, h)
      setImg({ name: file.name, w, h, data: ctx.getImageData(0, 0, w, h) })
      URL.revokeObjectURL(url)
    }
    image.onerror = () => {
      setErr('No se pudo decodificar la imagen (usa PNG/BMP/JPG sin codec raro)')
      URL.revokeObjectURL(url)
    }
    image.src = url
  }, [])

  /* Planos */
  const [channel, setChannel] = useState<Channel>('r')
  const [plane, setPlane] = useState(0)
  const planeCanvas = useRef<HTMLCanvasElement | null>(null)
  const planeInfo = useMemo(() => {
    if (!img) return null
    return bitPlane(img.data.data, img.w, img.h, channel, plane)
  }, [img, channel, plane])
  useEffect(() => {
    if (!planeCanvas.current || !img || !planeInfo) return
    const cv = planeCanvas.current
    cv.width = img.w
    cv.height = img.h
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const id = ctx.createImageData(img.w, img.h)
    id.data.set(planeInfo.rgba)
    ctx.putImageData(id, 0, 0)
  }, [img, planeInfo])

  /* Chi² + stats */
  const stats = useMemo(() => (img ? lsbStats(img.data.data, img.w) : null), [img])
  const chi = useMemo(() => (img ? chiSquareAttack(img.data.data, channel) : null), [img, channel])

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={ScanLine}
        title="Steganalysis"
        desc="Radiografía LSB de imágenes: visor de los 8 planos de bits por canal RGB, ataque chi-cuadrado de Westfeld-Pfitzmann con P-values reales y estadística de correlación — la herramienta que revela tinta invisible en píxeles"
        badge="Ronda 18"
      />

      <InfoBanner>
        Una foto natural tiene <b>correlación entre vecinos</b> y pares de valores (2v, 2v+1) desequilibrados. Cuando
        alguien escribe en el bit menos significativo, ambas huellas desaparecen. Carga una imagen (PNG/BMP sin
        re-comprimir) y compara: <b>tuya original vs la que te pasó «anon» por Telegram</b>.
      </InfoBanner>

      <div className="rounded-xl border border-white/10 bg-panel p-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
          Imagen a analizar (se procesa 100% local)
        </label>
        <input
          type="file"
          accept="image/*"
          className={inputCls}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) loadFile(f)
          }}
        />
        {err && <p className="mt-2 text-sm text-warn">{err}</p>}
        {img && (
          <div className="mt-3 grid gap-x-6 sm:grid-cols-4">
            <KV k="Fichero" v={img.name} />
            <KV k="Dimensiones" v={`${img.w}×${img.h}`} />
            <KV k="Píxeles" v={(img.w * img.h).toLocaleString('es')} />
            <KV k="Capacidad LSB" v={`${((img.w * img.h * 3) / 1024).toFixed(0)} KB (3 bits/px)`} />
          </div>
        )}
      </div>

      {img && (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
                <t.icon size={14} /> {t.label}
              </Button>
            ))}
          </div>

          {tab === 'planes' && (
            <Reveal>
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-panel p-4">
                  <div className="mb-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Canal</label>
                      <div className="flex gap-2">
                        {CHANNELS.map((c) => (
                          <Button key={c.id} variant={channel === c.id ? 'primary' : 'ghost'} onClick={() => setChannel(c.id)} className="flex-1">
                            {c.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                        Plano de bits: {plane} {plane === 0 && '(LSB — el escondite clásico)'}
                      </label>
                      <input type="range" min={0} max={7} value={plane} onChange={(e) => setPlane(Number(e.target.value))} className="w-full accent-[var(--color-acento)]" />
                    </div>
                  </div>
                  {planeInfo && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <canvas ref={planeCanvas} className="w-full rounded-lg border border-white/10 [image-rendering:pixelated]" />
                        <p className="mt-1 text-center text-xs text-white/40">
                          Plano {plane} del canal {channel.toUpperCase()} (blanco = bit 1)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <KV k="Densidad de unos" v={`${(planeInfo.density * 100).toFixed(1)}%  (natural: 45-55%)`} />
                        <KV k="Cambios entre vecinos" v={`${(planeInfo.flipRate * 100).toFixed(1)}%  (natural: <30% · estego LSB: ≈50%)`} />
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                          {planeInfo.flipRate > 0.45 && plane === 0 ? (
                            <span className="text-warn">⚠ Flip-rate ≈50% en el LSB: los bits se comportan como ruido puro — sospechoso de esteganografía secuencial.</span>
                          ) : planeInfo.flipRate < 0.3 ? (
                            <span className="text-ok">Los bits conservan estructura entre vecinos: correlación natural de imagen.</span>
                          ) : (
                            <span>Zona intermedia: prueba otros canales/planos o pasa al ataque chi².</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {stats && (
                  <div className="rounded-xl border border-white/10 bg-panel p-4">
                    <h4 className="mb-3 text-sm font-semibold">Estadística LSB global</h4>
                    <div className="grid gap-x-6 sm:grid-cols-4">
                      <KV k="LSB R densidad" v={`${(stats.perChannel.r.density * 100).toFixed(1)}%`} />
                      <KV k="LSB G densidad" v={`${(stats.perChannel.g.density * 100).toFixed(1)}%`} />
                      <KV k="LSB B densidad" v={`${(stats.perChannel.b.density * 100).toFixed(1)}%`} />
                      <KV k="Correlación vecinos" v={stats.neighborCorrelation.toFixed(3)} />
                    </div>
                    <p className="mt-2 text-xs text-white/50">
                      Correlación &lt; 0.1 entre LSBs vecinos es la firma de datos aleatorios escritos encima (una foto
                      natural ronda 0.3–0.7).
                    </p>
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {tab === 'chi' && chi && (
            <Reveal>
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-panel p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Badge tone={chi.verdict.startsWith('con') ? 'bad' : chi.verdict.startsWith('sin') ? 'ok' : 'info'}>{chi.verdict}</Badge>
                    <span className="text-xs text-white/60">canal {channel.toUpperCase()} · ataque de pares de valores (Westfeld & Pfitzmann 1999)</span>
                  </div>
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <KV k="P promedio (primera mitad)" v={chi.avgPFirstHalf.toFixed(4)} />
                    <KV k="Interpretación" v="P≈1: pares perfectamente equilibrados → estego. P≈0: natural." />
                  </div>
                  <ChiChart points={chi.points} />
                  <p className="mt-2 text-xs text-white/50">
                    Si la curva de P cae de ≈1 a ≈0 a mitad de imagen, el embed empezó arriba y paró: mide dónde para
                    estimar el payload.
                  </p>
                </div>
                <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-xs text-info">
                  Para verificar: crea una imagen con tinta (usa la herramienta de estego que tengas a mano o incrusta
                  texto en el LSB con cualquier lib) y pásala por aquí — el chi² la caza con P≈1 en la zona escrita.
                </div>
              </div>
            </Reveal>
          )}
        </>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Upload size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Lecciones de estegoanálisis</h3>
          </div>
          <div className="space-y-2">
            {STEGO_LESSONS.map((l) => (
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
            {STEGO_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}

function ChiChart({ points }: { points: { fraction: number; pValue: number }[] }) {
  const cvRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    const W = (cv.width = 600)
    const H = (cv.height = 180)
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0a0f14'
    ctx.fillRect(0, 0, W, H)
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    for (let gy = 0; gy <= 4; gy++) {
      ctx.beginPath()
      ctx.moveTo(0, (gy / 4) * H)
      ctx.lineTo(W, (gy / 4) * H)
      ctx.stroke()
    }
    // curve
    ctx.strokeStyle = '#2ee88a'
    ctx.lineWidth = 2
    ctx.beginPath()
    points.forEach((p, i) => {
      const x = p.fraction * W
      const y = H - p.pValue * H
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    // labels
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = '10px monospace'
    ctx.fillText('P=1 (estego)', 6, 12)
    ctx.fillText('P=0 (natural)', 6, H - 6)
    ctx.fillText('0%', 4, H - 16)
    ctx.fillText('100% de la imagen', W - 110, H - 6)
  }, [points])
  return <canvas ref={cvRef} className="mt-3 w-full rounded-lg border border-white/10" />
}
