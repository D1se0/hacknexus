import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { useToast } from './ui'
import { download } from '../lib/util'
import { makeSnapshot, parseSnapshot, fileToText, type Snapshot } from '../lib/snapshot'

/** Par de botones para persistir la configuración de una tool como JSON.
    `load` recibe los data validados; la tool decide cómo aplicarlos. */
export function SnapshotButtons<T>({
  toolId, getData, onLoad, label, className,
}: {
  toolId: string
  getData: () => T
  onLoad: (data: T) => void
  label?: string
  className?: string
}) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const doExport = () => {
    const snap: Snapshot<T> = makeSnapshot(toolId, getData())
    download(`hacknexus-${toolId}-config.json`, JSON.stringify(snap, null, 2), 'application/json')
    toast('Snapshot exportado ✓', 'ok')
  }

  const doLoad = async (file: File) => {
    try {
      const text = await fileToText(file)
      const res = parseSnapshot<T>(text, toolId)
      if (!res.ok) return toast(res.error, 'error')
      onLoad(res.snap.data)
      toast(`Config de ${res.snap.tool} cargada ✓`, 'ok')
    } catch {
      toast('No se pudo leer el fichero', 'error')
    }
  }

  return (
    <div className={className}>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void doLoad(f)
          e.target.value = '' // permite recargar el mismo fichero dos veces
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={doExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey transition-colors hover:border-acento/50 hover:text-acento"
        >
          <Download size={12} /> exportar JSON
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey transition-colors hover:border-info/50 hover:text-info"
        >
          <Upload size={12} /> cargar JSON
        </button>
        {label && <span className="font-mono text-[10px] text-grey/60">{label}</span>}
      </div>
    </div>
  )
}
