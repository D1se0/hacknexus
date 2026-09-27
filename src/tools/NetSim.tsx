import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Network, Download, Save, FolderOpen, Trash2, MousePointer2, Link2, Trash, CircleDot, Package, ClipboardList } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, Reveal, CopyBlock, useToast } from '../components/ui'
import {
  NODE_META, LINK_META, PRESETS, presetToTopology, analyzeTopology, topologyBom,
  topologyToJson, jsonToTopology, uid, type Topology, type NodeKind, type LinkKind, type SimNode,
} from '../lib/netsim'

const NODE_KINDS = Object.keys(NODE_META) as NodeKind[]

export default function NetSim() {
  const toast = useToast()
  const svgRef = useRef<SVGSVGElement>(null)
  const [topo, setTopo] = useState<Topology>(() => presetToTopology('hogar'))
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedLink, setSelectedLink] = useState<string | null>(null)
  const [linkFrom, setLinkFrom] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const [linkMode, setLinkMode] = useState<LinkKind>('ethernet')
  const [linkSpeed, setLinkSpeed] = useState('1 Gbps')
  const [tab, setTab] = useState<'analisis' | 'bom' | 'json'>('analisis')

  const issues = useMemo(() => analyzeTopology(topo), [topo])
  const bom = useMemo(() => topologyBom(topo), [topo])

  /* ── interacción canvas ── */
  const svgPoint = (e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  const onNodeDown = (n: SimNode) => (e: React.PointerEvent) => {
    e.stopPropagation()
    setSelected(n.id)
    setSelectedLink(null)
    if (linkFrom && linkFrom !== n.id) {
      setTopo((t) => ({ ...t, links: [...t.links, { id: uid('l'), from: linkFrom, to: n.id, kind: linkMode, speed: linkSpeed }] }))
      setLinkFrom(null)
      return
    }
    const p = svgPoint(e)
    setDrag({ id: n.id, dx: p.x - n.x, dy: p.y - n.y })
  }

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      const p = svgPoint(e)
      setTopo((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === drag.id ? { ...n, x: Math.max(30, Math.min(870, p.x - drag.dx)), y: Math.max(30, Math.min(560, p.y - drag.dy)) } : n)) }))
    }
    const up = () => setDrag(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [drag])

  /* ── acciones ── */
  const addNode = (kind: NodeKind) => {
    const n: SimNode = { id: uid('n'), kind, label: NODE_META[kind].label, x: 150 + Math.random() * 600, y: 120 + Math.random() * 360 }
    setTopo((t) => ({ ...t, nodes: [...t.nodes, n] }))
    setSelected(n.id)
  }

  const deleteSelected = useCallback(() => {
    if (selectedLink) {
      setTopo((t) => ({ ...t, links: t.links.filter((l) => l.id !== selectedLink) }))
      setSelectedLink(null)
      return
    }
    if (selected) {
      setTopo((t) => ({ ...t, nodes: t.nodes.filter((n) => n.id !== selected), links: t.links.filter((l) => l.from !== selected && l.to !== selected) }))
      setSelected(null)
    }
  }, [selected, selectedLink])

  const exportPng = () => {
    const svg = svgRef.current!
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1800 // 2x para nitidez
      canvas.height = 1200
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#0b0f0d'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `topologia-${topo.name.toLowerCase().replace(/\s+/g, '-')}.png`
      a.click()
      toast('PNG descargado')
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)))
  }

  const exportJson = () => {
    const blob = new Blob([topologyToJson(topo)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'topologia.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toast('JSON descargado')
  }

  const importJson = (file: File) => {
    const r = new FileReader()
    r.onload = () => {
      const t = jsonToTopology(String(r.result))
      if (t) { setTopo(t); toast('Topología cargada') } else toast('JSON inválido', 'error')
    }
    r.readAsText(file)
  }

  const selNode = topo.nodes.find((n) => n.id === selected)
  const selLink = topo.links.find((l) => l.id === selectedLink)

  const nodeById = (id: string) => topo.nodes.find((n) => n.id === id)

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Network}
        title="Network Topology Designer"
        desc="Diseña la red de tu casa o empresa: arrastra nodos, enlázalos por tipo (UTP/fibra/WiFi/VPN), valida el diseño, calcula el material y exporta PNG"
        badge="export PNG"
      />

      <Reveal>
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(PRESETS).map(([id, p]) => (
            <button
              key={id}
              onClick={() => { setTopo(presetToTopology(id)); setSelected(null); setSelectedLink(null) }}
              title={p.desc}
              className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${topo.name === p.name ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}
            >
              {p.name}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-edge" />
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 font-mono text-xs text-grey transition-colors hover:border-acento/50 hover:text-acento">
            <FolderOpen size={13} /> cargar JSON
            <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </label>
          <button onClick={exportJson} className="flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 font-mono text-xs text-grey transition-colors hover:border-acento/50 hover:text-acento">
            <Save size={13} /> guardar JSON
          </button>
          <button onClick={exportPng} className="flex items-center gap-1.5 rounded-lg border border-acento/50 bg-acento/10 px-3 py-1.5 font-mono text-xs text-acento transition-colors hover:bg-acento/20">
            <Download size={13} /> exportar PNG
          </button>
        </div>
      </Reveal>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[240px_1fr_300px]">
        {/* ─── paleta de nodos ─── */}
        <Reveal>
          <div className="card p-4">
            <h3 className="mb-2.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-grey">
              <CircleDot size={12} className="text-acento" /> nodos
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {NODE_KINDS.map((k) => (
                <button key={k} onClick={() => addNode(k)} className="flex flex-col items-center gap-1 rounded-lg border border-edge px-1.5 py-2 transition-all hover:border-acento/50 hover:bg-acento/5">
                  <span className="text-lg">{NODE_META[k].icon}</span>
                  <span className="text-center font-mono text-[9px] leading-tight text-grey">{NODE_META[k].label}</span>
                </button>
              ))}
            </div>
            <h3 className="mb-2 mt-4 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-grey">
              <Link2 size={12} className="text-acento" /> tipo de enlace
            </h3>
            <div className="space-y-1.5">
              {(Object.keys(LINK_META) as LinkKind[]).map((k) => (
                <div key={k} className={`flex flex-col rounded-lg border px-2 py-1.5 transition-all ${linkMode === k ? 'border-acento/60 bg-acento/5' : 'border-edge'}`}>
                  <button onClick={() => { setLinkMode(k); setLinkSpeed(LINK_META[k].speed[0]) }} className="flex items-center gap-1.5 font-mono text-[11px] text-ink">
                    <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke={LINK_META[k].color} strokeWidth="2" strokeDasharray={LINK_META[k].dash} /></svg>
                    {LINK_META[k].label}
                  </button>
                  {linkMode === k && (
                    <select value={linkSpeed} onChange={(e) => setLinkSpeed(e.target.value)} className="mt-1 w-full cursor-pointer rounded border border-edge bg-black/40 px-1.5 py-1 font-mono text-[10px] text-ink outline-none">
                      {LINK_META[k].speed.map((s) => <option key={s} className="bg-panel">{s}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-grey/60">
              <MousePointer2 size={10} className="inline" /> clic en un nodo y luego en otro = enlace con el tipo seleccionado.
            </p>
          </div>
        </Reveal>

        {/* ─── canvas ─── */}
        <Reveal delay={0.05}>
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-edge px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-acento" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-grey">canvas · {topo.nodes.length} nodos · {topo.links.length} enlaces</span>
              </div>
              <div className="flex items-center gap-2">
                {(linkFrom && <Badge tone="warn">enlazando: {nodeById(linkFrom)?.label} → clic en destino</Badge>)}
                <button onClick={deleteSelected} className="flex items-center gap-1 rounded border border-edge px-2 py-1 font-mono text-[10px] text-grey hover:border-bad/50 hover:text-bad">
                  <Trash size={11} /> supr (borrar selección)
                </button>
              </div>
            </div>
            <svg
              ref={svgRef}
              viewBox="0 0 900 600"
              className="block h-auto w-full cursor-grab bg-black/40 active:cursor-grabbing"
              onPointerDown={() => { setSelected(null); setSelectedLink(null) }}
            >
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1a231f" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="900" height="600" fill="url(#grid)" />
              {/* enlaces */}
              {topo.links.map((l) => {
                const a = nodeById(l.from)
                const b = nodeById(l.to)
                if (!a || !b) return null
                const meta = LINK_META[l.kind]
                const active = selectedLink === l.id
                return (
                  <g key={l.id} onClick={(e) => { e.stopPropagation(); setSelectedLink(l.id); setSelected(null) }} className="cursor-pointer">
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active ? '#fff' : meta.color} strokeWidth={active ? 3.5 : 2} strokeDasharray={meta.dash} opacity={active ? 1 : 0.75} />
                    <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="9" fill="#0b0f0d" stroke={meta.color} strokeWidth="1" />
                    <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 3} textAnchor="middle" fontSize="6.5" fill={meta.color} fontFamily="monospace">{l.speed}</text>
                  </g>
                )
              })}
              {/* línea de enlace en curso */}
              {linkFrom && nodeById(linkFrom) && (
                <circle cx={nodeById(linkFrom)!.x} cy={nodeById(linkFrom)!.y} r="34" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3">
                  <animate attributeName="r" values="30;38;30" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* nodos */}
              {topo.nodes.map((n) => {
                const meta = NODE_META[n.kind]
                const active = selected === n.id
                return (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`} onPointerDown={onNodeDown(n)} className="cursor-move">
                    <circle r={meta.size + 4} fill="none" stroke={active ? '#fff' : 'transparent'} strokeWidth="1.5" />
                    <circle r={meta.size} fill="#0d1512" stroke={meta.color} strokeWidth={active ? 3 : 2} />
                    <text y="2" textAnchor="middle" fontSize={meta.size * 0.8}>{meta.icon}</text>
                    <text y={meta.size + 14} textAnchor="middle" fontSize="11" fill="#e5e7eb" fontFamily="monospace">{n.label}</text>
                    {n.ip && <text y={meta.size + 26} textAnchor="middle" fontSize="8.5" fill={meta.color} fontFamily="monospace">{n.ip}</text>}
                  </g>
                )
              })}
            </svg>
          </div>
        </Reveal>

        {/* ─── panel derecho: propiedades / análisis / bom ─── */}
        <div className="min-w-0 space-y-4">
          <Reveal delay={0.08}>
            <div className="card p-4">
              {selNode ? (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-acento">
                    <span className="text-base">{NODE_META[selNode.kind].icon}</span> propiedades del nodo
                  </h3>
                  <Field label="etiqueta"><TextInput value={selNode.label} onChange={(e) => setTopo((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === selNode.id ? { ...n, label: e.target.value } : n)) }))} className="py-2 text-xs" /></Field>
                  <Field label="IP"><TextInput value={selNode.ip ?? ''} onChange={(e) => setTopo((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === selNode.id ? { ...n, ip: e.target.value } : n)) }))} className="py-2 text-xs" placeholder="10.0.0.5" /></Field>
                  <Field label="VLAN / red"><TextInput value={selNode.vlan ?? ''} onChange={(e) => setTopo((t) => ({ ...t, nodes: t.nodes.map((n) => (n.id === selNode.id ? { ...n, vlan: e.target.value } : n)) }))} className="py-2 text-xs" placeholder="VLAN 10 - usuarios" /></Field>
                  <Button variant="danger" onClick={() => { setTopo((t) => ({ ...t, nodes: t.nodes.filter((n) => n.id !== selNode.id), links: t.links.filter((l) => l.from !== selNode.id && l.to !== selNode.id) })); setSelected(null) }} className="w-full">
                    <Trash2 size={13} /> eliminar nodo
                  </Button>
                </div>
              ) : selLink ? (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-mono text-xs font-bold text-acento">
                    <Link2 size={13} /> propiedades del enlace
                  </h3>
                  <p className="font-mono text-[11px] text-grey">{nodeById(selLink.from)?.label} ↔ {nodeById(selLink.to)?.label}</p>
                  <Field label="tipo">
                    <select value={selLink.kind} onChange={(e) => setTopo((t) => ({ ...t, links: t.links.map((l) => (l.id === selLink.id ? { ...l, kind: e.target.value as LinkKind } : l)) }))} className="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-black/40 px-3 py-2 font-mono text-xs text-ink outline-none">
                      {(Object.keys(LINK_META) as LinkKind[]).map((k) => <option key={k} value={k} className="bg-panel">{LINK_META[k].label}</option>)}
                    </select>
                  </Field>
                  <Field label="velocidad / protocolo">
                    <select value={selLink.speed} onChange={(e) => setTopo((t) => ({ ...t, links: t.links.map((l) => (l.id === selLink.id ? { ...l, speed: e.target.value } : l)) }))} className="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-black/40 px-3 py-2 font-mono text-xs text-ink outline-none">
                      {LINK_META[selLink.kind].speed.map((s) => <option key={s} value={s} className="bg-panel">{s}</option>)}
                    </select>
                  </Field>
                  <Button variant="danger" onClick={() => { setTopo((t) => ({ ...t, links: t.links.filter((l) => l.id !== selLink.id) })); setSelectedLink(null) }} className="w-full">
                    <Trash2 size={13} /> eliminar enlace
                  </Button>
                </div>
              ) : (
                <p className="py-4 text-center font-mono text-[11px] text-grey">
                  selecciona un nodo o enlace<br />para editar sus propiedades
                </p>
              )}
            </div>
          </Reveal>

          {/* pestañas análisis/bom/json */}
          <Reveal delay={0.1}>
            <div className="card p-4">
              <div className="mb-3 flex gap-1.5">
                {(['analisis', 'bom', 'json'] as const).map((t2) => (
                  <button key={t2} onClick={() => setTab(t2)} className={`flex-1 rounded-lg border py-1.5 font-mono text-[10px] transition-all ${tab === t2 ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>
                    {t2 === 'analisis' ? <ClipboardList size={11} className="inline" /> : t2 === 'bom' ? <Package size={11} className="inline" /> : <span>{'{ }'}</span>} {t2}
                  </button>
                ))}
              </div>
              {tab === 'analisis' && (
                <ul className="space-y-2">
                  {issues.map((i, n) => (
                    <li key={n} className={`flex gap-2 rounded-lg border px-2.5 py-2 text-[11px] leading-snug ${i.tone === 'bad' ? 'border-bad/30 bg-bad/5 text-bad' : i.tone === 'warn' ? 'border-warn/30 bg-warn/5 text-warn' : i.tone === 'ok' ? 'border-ok/30 bg-ok/5 text-ok' : 'border-edge text-grey'}`}>
                      <span>{i.tone === 'bad' ? '🔴' : i.tone === 'warn' ? '🟡' : i.tone === 'ok' ? '🟢' : '🔵'}</span>
                      {i.text}
                    </li>
                  ))}
                </ul>
              )}
              {tab === 'bom' && (
                <div className="space-y-1.5">
                  {bom.map((r, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-2 border-b border-edge/50 pb-1.5 last:border-0">
                      <div>
                        <p className="font-mono text-[11px] text-ink">{r.item} <span className="text-acento">×{r.qty}</span></p>
                        <p className="text-[10px] text-grey/70">{r.note}</p>
                      </div>
                    </div>
                  ))}
                  {bom.length === 0 && <p className="font-mono text-[11px] text-grey">añade nodos para calcular material</p>}
                </div>
              )}
              {tab === 'json' && <CopyBlock text={topologyToJson(topo)} label="topologia.json" maxH="max-h-56" />}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
