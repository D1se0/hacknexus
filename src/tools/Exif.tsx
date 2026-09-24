import { useMemo, useRef, useState } from 'react'
import { Camera, Upload, Loader2, MapPin } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, CopyBlock, ErrorBox, KV, InfoBanner } from '../components/ui'
import { fmtDate } from '../lib/util'

/* eslint-disable @typescript-eslint/no-explicit-any */
type ExifData = Record<string, any>

const INTERESTING: { keys: string[]; label: string; copyable?: boolean }[] = [
  { keys: ['Make', 'make'], label: 'fabricante cámara' },
  { keys: ['Model', 'model'], label: 'modelo cámara' },
  { keys: ['LensModel', 'lensModel'], label: 'objetivo' },
  { keys: ['DateTimeOriginal', 'dateTimeOriginal'], label: 'fecha original' },
  { keys: ['CreateDate', 'createDate'], label: 'fecha creación' },
  { keys: ['ModifyDate', 'modifyDate'], label: 'fecha modificación' },
  { keys: ['Software', 'software'], label: 'software' },
  { keys: ['ISO', 'iso'], label: 'ISO' },
  { keys: ['FNumber', 'fNumber'], label: 'apertura f/' },
  { keys: ['ExposureTime', 'exposureTime'], label: 'exposición' },
  { keys: ['FocalLength', 'focalLength'], label: 'distancia focal' },
  { keys: ['Orientation', 'orientation'], label: 'orientación' },
  { keys: ['GPSLatitude', 'gpsLatitude', 'latitude'], label: 'GPS lat' },
  { keys: ['GPSLongitude', 'gpsLongitude', 'longitude'], label: 'GPS lon' },
  { keys: ['GPSAltitude', 'gpsAltitude', 'altitude'], label: 'GPS alt' },
  { keys: ['ImageWidth', 'imageWidth'], label: 'ancho' },
  { keys: ['ImageHeight', 'imageHeight'], label: 'alto' },
  { keys: ['XPAuthor', 'artist', 'Artist'], label: 'autor' },
  { keys: ['XPComment', 'userComment'], label: 'comentario' },
]

export default function Exif() {
  const [data, setData] = useState<ExifData | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [rawJson, setRawJson] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (file: File) => {
    setLoading(true)
    setErr(null)
    setData(null)
    setFileName(file.name)
    try {
      const exifr = await import('exifr')
      const all = (await exifr.parse(file).catch(() => null)) as ExifData | null
      const merged: ExifData = all ?? {}
      if (!merged || Object.keys(merged).length === 0) {
        setErr('No se encontraron metadatos EXIF (la imagen fue limpiada o el formato no los soporta)')
      }
      setData(merged)
      setRawJson(JSON.stringify(merged, null, 2))
    } catch (e) {
      setErr(`Error parseando EXIF: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const found = useMemo(() => {
    if (!data) return []
    const out: { label: string; value: string; isDate?: boolean }[] = []
    for (const group of INTERESTING) {
      for (const k of group.keys) {
        const v = data[k]
        if (v !== undefined && v !== null && v !== '') {
          const isDate = /date/i.test(k) || /date/i.test(group.label)
          out.push({ label: group.label, value: isDate && !isNaN(Date.parse(String(v))) ? fmtDate(v) : String(v).slice(0, 120) })
          break
        }
      }
    }
    return out
  }, [data])

  const gps = useMemo(() => {
    if (!data) return null
    const lat = data.GPSLatitude ?? data.latitude ?? data.Latitude
    const lon = data.GPSLongitude ?? data.longitude ?? data.Longitude
    if (typeof lat !== 'number' || typeof lon !== 'number') return null
    return { lat, lon }
  }, [data])

  const osmLink = gps ? `https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lon}#map=15/${gps.lat}/${gps.lon}` : null

  const numTags = data ? Object.keys(data).length : 0

  return (
    <div>
      <ToolHeader icon={Camera} title="EXIF & Metadatos" desc="Extrae GPS, cámara, software y comentarios de imágenes (JPG, PNG, HEIC, TIFF), PDFs y más — local" />

      <InfoBanner>
        OSINT clásico: una foto con GPS activado revela la ubicación exacta. Antes de publicar imágenes, limpia metadatos con
        <span className="font-mono"> exiftool -all= foto.jpg</span> o exportándolas desde el editor.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f) }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-edge py-12 transition-colors hover:border-acento/50"
          >
            {loading ? <Loader2 size={28} className="animate-spin text-acento" /> : <Upload size={28} className="text-grey" />}
            <p className="font-mono text-sm text-ink">{loading ? 'extrayendo…' : 'suelta una imagen/PDF o haz clic'}</p>
            <p className="font-mono text-[10px] text-grey">jpg · png · heic · tiff · webp · pdf · mp4…</p>
            <input ref={inputRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f) }} />
          </div>
          {fileName && <p className="mt-3 text-center font-mono text-[11px] text-grey">archivo: <span className="text-acento">{fileName}</span></p>}
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {data && found.length > 0 && (
        <>
          {gps && (
            <Reveal>
              <div className="card mt-6 border-warn/40 p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone="bad">⚠ GPS presente</Badge>
                  <span className="font-mono text-sm font-bold text-warn">{gps.lat.toFixed(6)}, {gps.lon.toFixed(6)}</span>
                </div>
                <a href={osmLink!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-acento/40 bg-acento/5 px-4 py-2 font-mono text-xs text-acento transition-all hover:bg-acento/10">
                  <MapPin size={13} /> abrir ubicación en OpenStreetMap
                </a>
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="info">{numTags} tags totales</Badge>
                <Badge tone="ok">{found.length} relevantes</Badge>
              </div>
              <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                {found.map((f) => (
                  <KV key={f.label} k={f.label} v={f.value} copyable />
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-6">
              <CopyBlock text={rawJson} label="json completo (todos los tags)" maxH="max-h-[500px]" />
            </div>
          </Reveal>
        </>
      )}

      {data && found.length === 0 && !err && (
        <div className="card mt-6 p-6 text-center font-mono text-sm text-ok">✓ Sin metadatos relevantes (imagen ya limpiada)</div>
      )}

      {data && (
        <Reveal>
          <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
            💡 Comandos equivalentes: <span className="text-acento">exiftool foto.jpg</span> · <span className="text-acento">strings foto.jpg | grep -i gps</span> ·
            borrar todo: <span className="text-acento">exiftool -all= -overwrite_original foto.jpg</span>
          </div>
        </Reveal>
      )}
    </div>
  )
}
