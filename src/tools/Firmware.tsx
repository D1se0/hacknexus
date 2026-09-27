import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Microchip, Upload, AlertTriangle, Cpu } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner } from '../components/ui'
import { parseEspImage, parseIntelHex, firmwareStrings, type EspInfo, type HexInfo, type FirmwareString } from '../lib/firmware'

type Loaded =
  | { name: string; kind: 'esp'; info: EspInfo; strings: FirmwareString[]; size: number }
  | { name: string; kind: 'hex'; info: HexInfo; strings: FirmwareString[]; size: number }

export default function Firmware() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const read = async (file: File) => {
    setErr(null)
    try {
      if (file.size > 24 * 1024 * 1024) throw new Error('fichero demasiado grande (máx 24 MB)')
      const name = file.name.toLowerCase()
      if (name.endsWith('.hex') || name.endsWith('.ihex')) {
        const text = await file.text()
        const info = parseIntelHex(text)
        const bytes = new Uint8Array(await file.arrayBuffer())
        setLoaded({ name: file.name, kind: 'hex', info, strings: firmwareStrings(bytes), size: file.size })
      } else {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const info = parseEspImage(bytes)
        if (!info.magicOk && bytes[0] !== 0x1f) setErr('ojo: no parece imagen ESP (magic 0xE9). Si es un .bin de otra plataforma, solo se extraerán strings.')
        setLoaded({ name: file.name, kind: 'esp', info, strings: firmwareStrings(bytes), size: file.size })
      }
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Microchip}
        title="Firmware Image Inspector"
        desc="Parsea imágenes de firmware ESP8266/ESP32 (cabecera, segmentos, app description) e Intel HEX de Arduino AVR, y extrae strings sospechosos — lectura pura, nada se ejecuta"
        badge="iot"
      />

      <InfoBanner>
        Un firmware es un programa entero con secretos dentro: URLs de update, claves WiFi de fábrica, tokens hardcodeados. El análisis estático de strings es el primer paso de todo audit IoT — y aquí corre entero en tu navegador.
      </InfoBanner>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void read(f) }}
        onClick={() => inputRef.current?.click()}
        className={`card mb-6 cursor-pointer border-dashed p-8 text-center transition-all ${drag ? 'border-acento bg-acento/5' : ''}`}
      >
        <input ref={inputRef} type="file" accept=".bin,.hex,.ihex,.img,.elf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f) }} />
        <Upload size={26} className="mx-auto text-acento" />
        <p className="mt-2 font-mono text-sm text-ink">arrastra un <b>.bin</b> de ESP o un <b>.hex</b> de Arduino</p>
        <p className="mt-1 font-mono text-[10.5px] text-grey">esptool.py image_info firmware.bin — versión web y sin instalar nada</p>
      </div>

      {err && <p className="mb-6 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 font-mono text-xs text-bad">{err}</p>}

      {loaded && (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-4">
            {loaded.kind === 'esp' && (() => {
              const e = loaded.info
              return (
                <>
                  <Reveal>
                    <div className="card p-5">
                      <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Cpu size={15} className="text-acento" /> cabecera ESP</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ['magic', e.magicOk ? '✅ 0xE9' : '❌ no es imagen ESP'],
                          ['chip', e.chip],
                          ['modo flash', e.flashMode],
                          ['tamaño flash', e.flashSize],
                          ['frecuencia', e.flashFreq],
                          ['entry point', e.entry],
                        ].map(([k, v]) => (
                          <div key={k} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                            <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">{k}</p>
                            <p className="font-mono text-[12px] text-ink">{v}</p>
                          </div>
                        ))}
                      </div>
                      {e.error && <p className="mt-2 font-mono text-[11px] text-warn">⚠ {e.error}</p>}
                    </div>
                  </Reveal>
                  {e.app && (
                    <Reveal delay={0.04}>
                      <div className="card border-acento/30 p-5">
                        <h3 className="mb-3 font-mono text-sm font-bold text-white">📋 app description (ESP-IDF)</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(e.app).map(([k, v]) => (
                            <div key={k} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                              <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">{k}</p>
                              <p className="break-all font-mono text-[12px] text-acento">{v || '—'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Reveal>
                  )}
                  <Reveal delay={0.06}>
                    <div className="card p-5">
                      <h3 className="mb-3 font-mono text-sm font-bold text-white">segmentos ({e.segments.length})</h3>
                      <div className="space-y-1.5">
                        {e.segments.map((s, i) => (
                          <div key={i} className="rounded-lg border border-edge bg-black/30 p-3">
                            <p className="font-mono text-[11px] text-ink">#{i} → load 0x{s.loadAddr.toString(16).padStart(8, '0')} · {s.len.toLocaleString('es-ES')} bytes</p>
                            <p className="mt-1 break-all font-mono text-[10px] text-grey">{s.preview}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 font-mono text-[10px] text-grey/60">mapa típico: 0x3FF… = DRAM/heap, 0x400… = IRAM/flash mapeada (código)</p>
                    </div>
                  </Reveal>
                </>
              )
            })()}
            {loaded.kind === 'hex' && (() => {
              const h = loaded.info
              return (
                <Reveal>
                  <div className="card p-5">
                    <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Cpu size={15} className="text-acento" /> Intel HEX (AVR)</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ['registros', h.records.toLocaleString('es-ES')],
                        ['bytes de datos', h.dataBytes.toLocaleString('es-ES')],
                        ['checksums', h.crcOk ? '✅ todos correctos' : `❌ ${h.crcBad} inválidos`],
                        ['entry point', h.entry ?? '—'],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                          <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">{k}</p>
                          <p className="font-mono text-[12px] text-ink">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {h.segments.map((s, i) => (
                        <p key={i} className="rounded border border-edge bg-black/20 px-2.5 py-1.5 font-mono text-[11px] text-ink">
                          flash 0x{s.loadAddr.toString(16).padStart(6, '0')} … 0x{(s.loadAddr + s.len).toString(16).padStart(6, '0')} ({s.len.toLocaleString('es-ES')} B)
                        </p>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )
            })()}
          </div>

          <Reveal delay={0.06}>
            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><AlertTriangle size={14} className="text-warn" /> strings sospechosos</h3>
              <div className="max-h-[520px] space-y-1 overflow-auto">
                {loaded.strings.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.3) }}
                    className={`break-all rounded border px-2.5 py-1.5 font-mono text-[10.5px] ${s.suspicious ? 'border-bad/25 bg-bad/5 text-bad/90' : 'border-edge bg-black/20 text-grey'}`}
                    title={s.why}
                  >
                    {s.suspicious && <span className="mr-1.5 text-warn">⚠</span>}
                    {s.s}
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="bad">{loaded.strings.filter((s) => s.suspicious).length} sospechosos</Badge>
                <Badge tone="neutral">{loaded.strings.length} strings totales</Badge>
                <Badge tone="neutral">{(loaded.size / 1024).toFixed(1)} KB</Badge>
              </div>
            </div>
          </Reveal>
        </div>
      )}
    </div>
  )
}
