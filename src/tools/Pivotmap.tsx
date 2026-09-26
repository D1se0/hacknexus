import { useMemo, useRef, useState } from 'react'
import { Route, Plus, Trash2, Link2, RotateCcw, Star } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, TextInput, Select, Reveal, InfoBanner, useToast } from '../components/ui'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { computeRoutes, buildPivotSteps, verifyCommand, validateGraph, PROTO_INFO, PROTO_ORDER, PRESETS, PIVOT_NOTES, PIVOT_CHEATSHEET, type PivotNode, type PivotEdge, type PivotProto, type PivotGraph, type PivotStep } from '../lib/pivotmap'
import { cn } from '../lib/util'

const W = 840
const H = 400

const ROLE_COLORS: Record<PivotNode['role'], string> = { atacante: '#2ee88a', pivot: '#38bdf8', objetivo: '#f43f5e' }
const ROLE_LABEL: Record<PivotNode['role'], string> = { atacante: 'atacante', pivot: 'pivote', objetivo: 'objetivo' }
const ROLE_EMOJI: Record<PivotNode['role'], string> = { atacante: '🎯', pivot: '🔀', objetivo: '🖥️' }

const newNode = (n: number): PivotNode => ({
  id: 'n' + Math.random().toString(36).slice(2, 7),
  name: 'host-' + n,
  role: 'objetivo',
  os: 'linux',
  x: 90 + ((n * 97) % 600),
  y: 80 + ((n * 53) % 240),
  ifaces: [{ cidr: '10.10.10.' + (10 + n) + '/24', label: 'eth0' }],
})

export default function Pivotmap() {
  const [nodes, setNodes] = useState<PivotNode[]>(PRESETS[0].graph.nodes)
  const [edges, setEdges] = useState<PivotEdge[]>(PRESETS[0].graph.edges)
  const [targetId, setTargetId] = useState(PRESETS[0].graph.targetId)
  const [chiselPort, setChiselPort] = useState('8000')
  const [attackerAddr, setAttackerAddr] = useState('TU_IP_VPN')
  const [selNode, setSelNode] = useState<string | null>('dmz')
  const [selEdge, setSelEdge] = useState<string | null>(null)
  const [snapMode, setSnapMode] = useState(false)
  const [pending, setPending] = useState<string | null>(null) // origen del enlace en curso
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const toast = useToast()

  const routes = useMemo(() => computeRoutes(nodes, edges), [nodes, edges])
  const route = routes.get(targetId)
  const issues = useMemo(() => validateGraph(nodes, edges), [nodes, edges])
  const steps = useMemo(
    () => (route && route.length > 1 ? buildPivotSteps(nodes, route, { chiselPort: parseInt(chiselPort) || 8000, attackerAddr }) : []),
    [route, nodes, chiselPort, attackerAddr],
  )
  const verify = route ? verifyCommand(route) : ''
  const routeEdgeIds = useMemo(() => new Set(route?.map((h) => h.edge?.id).filter(Boolean) as string[]), [route])

  /* ── acciones ── */
  const patchNode = (id: string, p: Partial<PivotNode>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n)))
  const patchEdge = (id: string, p: Partial<PivotEdge>) => setEdges((es) => es.map((e) => (e.id === id ? { ...e, ...p } : e)))
  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
    if (targetId === id) setTargetId(nodes.find((n) => n.id !== id)?.id ?? '')
    if (selNode === id) setSelNode(null)
  }
  const addNode = () => {
    const n = newNode(nodes.length)
    setNodes((ns) => [...ns, n])
    setSelNode(n.id)
    setSelEdge(null)
  }
  const addEdge = (from: string, to: string) => {
    if (from === to) return
    const id = 'e' + Math.random().toString(36).slice(2, 7)
    const socatCount = edges.filter((e) => e.proto === 'socat').length
    setEdges((es) => [...es, { id, from, to, proto: 'chisel', alive: true, localPort: 1080 + es.length, remotePort: socatCount ? 445 : undefined }])
    setSelEdge(id)
    setSelNode(null)
  }
  const loadPreset = (pid: string) => {
    const p = PRESETS.find((x) => x.id === pid)
    if (!p) return
    setNodes(p.graph.nodes.map((n) => ({ ...n, ifaces: n.ifaces.map((f) => ({ ...f })) })))
    setEdges(p.graph.edges.map((e) => ({ ...e })))
    setTargetId(p.graph.targetId)
    setSelNode(p.graph.nodes[1]?.id ?? null)
    setSelEdge(null)
    setPending(null)
  }

  /* ── snapshot JSON ── */
  const applyGraph = (g: PivotGraph) => {
    if (!Array.isArray(g.nodes) || !Array.isArray(g.edges)) return toast('El JSON no contiene nodes/edges válidos', 'error')
    const ids = new Set(g.nodes.map((n) => n.id))
    setNodes(g.nodes)
    setEdges(g.edges.filter((e) => ids.has(e.from) && ids.has(e.to)))
    const okTarget = g.nodes.find((n) => n.id === g.targetId) ? g.targetId : (g.nodes.find((n) => n.role === 'objetivo') ?? g.nodes[0])?.id
    setTargetId(okTarget ?? '')
    setSelNode(null)
    setSelEdge(null)
    setPending(null)
  }

  /* ── drag & snap ── */
  const svgPoint = (e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = new DOMPoint(e.clientX, e.clientY)
    const loc = pt.matrixTransform(ctm.inverse())
    return { x: loc.x, y: loc.y }
  }
  const onNodeDown = (e: React.PointerEvent, n: PivotNode) => {
    e.stopPropagation()
    setSelNode(n.id)
    setSelEdge(null)
    if (snapMode) {
      if (!pending) setPending(n.id)
      else if (pending === n.id) setPending(null)
      else { addEdge(pending, n.id); setPending(null) }
      return
    }
    const loc = svgPoint(e)
    if (loc) dragRef.current = { id: n.id, dx: loc.x - n.x, dy: loc.y - n.y }
  }
  const onSvgMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const loc = svgPoint(e)
    if (!loc) return
    const { id, dx, dy } = dragRef.current
    const x = Math.max(4, Math.min(W - 100, loc.x - dx))
    const y = Math.max(4, Math.min(H - 60, loc.y - dy))
    patchNode(id, { x: Math.round(x), y: Math.round(y) })
  }
  const endDrag = () => { dragRef.current = null }

  const onEdgeClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelEdge(id)
    setSelNode(null)
  }

  const selN = nodes.find((n) => n.id === selNode) ?? null
  const selE = edges.find((e) => e.id === selEdge) ?? null

  const nodeOf = (id: string) => nodes.find((n) => n.id === id)

  return (
    <>
      <ToolHeader icon={Route} title="Pivoting Map" desc="Diseña la cadena de pivotes arrastrando nodos: interfaces por red, SO, enlaces por protocolo (ssh/chisel/ligolo/socat/plink/sshuttle) con puertos, validación del grafo y comandos EXACTOS por tramo con dónde se ejecuta cada uno" />

      <InfoBanner>
        <b>Cómo funciona:</b> arrastra los nodos para colocarlos; <b>✥ modo enlace</b> crea conexiones clicando origen → destino; pica una
        línea para editar su protocolo y puertos. La tool calcula la ruta BFS al objetivo y genera los comandos de cada tramo. Marca el SO del
        nodo (plink solo en Windows) y exporta el JSON para conservar el diagrama en tu informe.
      </InfoBanner>

      {/* toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={PRESETS.find((p) => p.graph.nodes.every((n) => nodes.some((m) => m.id === n.id)) )?.id ?? ''}
          onChange={(e) => e.target.value && loadPreset(e.target.value)}
          options={[{ value: '', label: '— preset —' }, ...PRESETS.map((p) => ({ value: p.id, label: p.name }))]}
          className="w-44"
        />
        <button
          onClick={() => { setSnapMode((v) => !v); setPending(null) }}
          className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition-colors', snapMode ? 'border-acento bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink')}
        >
          <Link2 size={12} /> {snapMode ? 'creando enlace…' : '✥ modo enlace'}
        </button>
        <button onClick={addNode} className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey transition-colors hover:border-acento/50 hover:text-acento">
          <Plus size={12} /> nodo
        </button>
        <button
          onClick={() => { loadPreset(PRESETS[0].id); toast('Mapa reiniciado al preset DMZ', 'info') }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey transition-colors hover:text-ink"
        >
          <RotateCcw size={12} /> reiniciar
        </button>
        <div className="ml-auto flex items-center gap-2">
          {pending && <Badge tone="warn">origen: {nodeOf(pending)?.name} — pica el destino</Badge>}
          <SnapshotButtons<PivotGraph>
            toolId="pivotmap"
            label="mapa completo"
            getData={() => ({ nodes, edges, targetId })}
            onLoad={applyGraph}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_430px]">
        <div>
          {/* lienzo SVG */}
          <div className="card overflow-hidden rounded-xl border border-edge bg-black/60 p-0">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full touch-none select-none"
              onPointerMove={onSvgMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onClick={() => { setSelNode(null); setSelEdge(null) }}
            >
              <defs>
                <pattern id="pgrid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1e293b" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width={W} height={H} fill="url(#pgrid)" />

              {/* enlaces */}
              {edges.map((e) => {
                const a = nodeOf(e.from), b = nodeOf(e.to)
                if (!a || !b) return null
                const cx1 = a.x + 46, cy1 = a.y + 23, cx2 = b.x + 46, cy2 = b.y + 23
                const onRoute = routeEdgeIds.has(e.id)
                const color = onRoute ? '#2ee88a' : PROTO_INFO[e.proto].color
                const mx = (cx1 + cx2) / 2, my = (cy1 + cy2) / 2
                return (
                  <g key={e.id}>
                    <line
                      x1={cx1} y1={cy1} x2={cx2} y2={cy2}
                      stroke={e.alive ? color : '#7f1d1d'}
                      strokeWidth={selEdge === e.id ? 5 : onRoute ? 3.5 : 2}
                      strokeDasharray={e.alive ? undefined : '5 4'}
                      className="cursor-pointer"
                      onClick={(ev) => onEdgeClick(ev, e.id)}
                    />
                    <g className="cursor-pointer" onClick={(ev) => onEdgeClick(ev, e.id)}>
                      <rect x={mx - 26} y={my - 10} width="52" height="15" rx="4" fill="#0b0f0d" stroke={selEdge === e.id ? color : 'transparent'} strokeWidth="1" />
                      <text x={mx} y={my + 1.5} fontSize="9.5" fontFamily="monospace" fill={e.alive ? color : '#f87171'} textAnchor="middle" dominantBaseline="middle">
                        {PROTO_INFO[e.proto].label}{e.localPort ? ` :${e.localPort}` : ''}
                      </text>
                    </g>
                  </g>
                )
              })}

              {/* nodos */}
              {nodes.map((n) => {
                const isTarget = n.id === targetId
                const isPending = pending === n.id
                return (
                  <g
                    key={n.id}
                    className={snapMode ? 'cursor-crosshair' : 'cursor-move'}
                    onPointerDown={(e) => onNodeDown(e, n)}
                    opacity={selNode === n.id ? 1 : 0.92}
                  >
                    {(isTarget || isPending) && (
                      <rect x={n.x - 4} y={n.y - 4} width="100" height="54" rx="14" fill="none" stroke={isPending ? '#f59e0b' : '#fff'} strokeWidth="1.5" strokeDasharray={isPending ? '4 3' : undefined} />
                    )}
                    <rect x={n.x} y={n.y} width="92" height="46" rx="12" fill={ROLE_COLORS[n.role]} stroke="#0b0f0d" strokeWidth="2" />
                    <text x={n.x + 14} y={n.y + 27} fontSize="15" textAnchor="middle">{ROLE_EMOJI[n.role]}</text>
                    <text x={n.x + 48} y={n.y + 20} fontSize="11.5" fontFamily="monospace" fontWeight="bold" fill="#0b0f0d" textAnchor="middle">
                      {n.name.slice(0, 12)}
                    </text>
                    <text x={n.x + 48} y={n.y + 35} fontSize="8.5" fontFamily="monospace" fill="#0b0f0d" opacity="0.75" textAnchor="middle">
                      {ROLE_LABEL[n.role]}{n.os === 'windows' ? ' · 🪟' : ' · 🐧'}
                    </text>
                    {n.ifaces.slice(0, 2).map((f, i) => (
                      <text key={i} x={n.x + 46} y={n.y + 60 + i * 12} fontSize="9" fontFamily="monospace" fill="#94a3b8" textAnchor="middle">
                        {f.label ? `${f.label}: ` : ''}{f.cidr}
                      </text>
                    ))}
                    {n.note && (
                      <text x={n.x + 46} y={n.y + 60 + Math.min(2, n.ifaces.length) * 12} fontSize="8.5" fill="#64748b" textAnchor="middle" fontStyle="italic">
                        {n.note.slice(0, 22)}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* leyenda */}
              <g fontFamily="monospace" fontSize="9">
                <rect x={W - 158} y={H - 64} width="150" height="56" rx="6" fill="#0b0f0d" opacity="0.85" stroke="#1e293b" />
                {(['atacante', 'pivot', 'objetivo'] as const).map((r, i) => (
                  <g key={r}>
                    <rect x={W - 148} y={H - 54 + i * 16} width="10" height="10" rx="3" fill={ROLE_COLORS[r]} />
                    <text x={W - 132} y={H - 45 + i * 16} fill="#94a3b8">{ROLE_LABEL[r]}</text>
                  </g>
                ))}
              </g>
            </svg>
          </div>

          {/* validación del grafo */}
          {issues.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {issues.map((iss, i) => (
                <div key={i} className={cn('rounded border px-3 py-1.5 font-mono text-[11px]', iss.level === 'error' ? 'border-bad/40 bg-bad/10 text-bad' : 'border-warn/40 bg-warn/10 text-warn')}>
                  {iss.level === 'error' ? '✗' : '⚠'} {iss.msg}
                </div>
              ))}
            </div>
          )}

          {/* editor del nodo seleccionado */}
          {selN && (
            <div className="mt-3 rounded-lg border border-acento/30 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-acento">nodo: {selN.name}</h4>
                <div className="flex items-center gap-2">
                  <button onClick={() => setTargetId(selN.id)} className={cn('rounded px-2 py-1 font-mono text-[10px]', targetId === selN.id ? 'bg-acento/20 text-acento' : 'border border-edge text-grey')}>
                    {targetId === selN.id ? '★ objetivo' : 'marcar objetivo'}
                  </button>
                  {selN.role !== 'atacante' && (
                    <button onClick={() => deleteNode(selN.id)} className="rounded border border-bad/40 px-2 py-1 font-mono text-[10px] text-bad"><Trash2 size={10} className="inline" /> borrar</button>
                  )}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="nombre"><TextInput value={selN.name} onChange={(e) => patchNode(selN.id, { name: e.target.value })} className="font-mono" /></Field>
                <Field label="rol">
                  <Select
                    value={selN.role}
                    onChange={(e) => patchNode(selN.id, { role: e.target.value as PivotNode['role'] })}
                    options={[{ value: 'atacante', label: 'atacante' }, { value: 'pivot', label: 'pivote' }, { value: 'objetivo', label: 'objetivo' }]}
                  />
                </Field>
                <Field label="sistema operativo">
                  <Select
                    value={selN.os}
                    onChange={(e) => patchNode(selN.id, { os: e.target.value as PivotNode['os'] })}
                    options={[{ value: 'linux', label: '🐧 Linux' }, { value: 'windows', label: '🪟 Windows' }]}
                  />
                </Field>
                <Field label="nota (opcional)"><TextInput value={selN.note ?? ''} onChange={(e) => patchNode(selN.id, { note: e.target.value })} placeholder="shell inicial, DC, MSSQL…" className="font-mono" /></Field>
              </div>
              <div className="mt-2">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">interfaces</div>
                <div className="space-y-1.5">
                  {selN.ifaces.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <TextInput
                        value={f.label ?? ''}
                        onChange={(e) => patchNode(selN.id, { ifaces: selN.ifaces.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                        placeholder="eth0"
                        className="w-16 font-mono text-xs"
                      />
                      <TextInput
                        value={f.cidr}
                        onChange={(e) => patchNode(selN.id, { ifaces: selN.ifaces.map((x, j) => (j === i ? { ...x, cidr: e.target.value } : x)) })}
                        placeholder="10.10.10.5/24"
                        className="w-44 font-mono text-xs"
                      />
                      {selN.ifaces.length > 1 && (
                        <button onClick={() => patchNode(selN.id, { ifaces: selN.ifaces.filter((_, j) => j !== i) })} className="rounded border border-edge p-1 text-bad"><Trash2 size={11} /></button>
                      )}
                    </div>
                  ))}
                  {selN.ifaces.length < 4 && (
                    <button onClick={() => patchNode(selN.id, { ifaces: [...selN.ifaces, { cidr: '', label: 'eth' + selN.ifaces.length }] })} className="rounded border border-edge px-2 py-1 font-mono text-[10px] text-grey hover:text-acento">
                      + interfaz
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* editor del enlace seleccionado */}
          {selE && (
            <div className="mt-3 rounded-lg border border-info/30 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-info">
                  enlace: {nodeOf(selE.from)?.name} ↔ {nodeOf(selE.to)?.name}
                </h4>
                <button onClick={() => { setEdges((es) => es.filter((x) => x.id !== selE.id)); setSelEdge(null) }} className="rounded border border-bad/40 px-2 py-1 font-mono text-[10px] text-bad"><Trash2 size={10} className="inline" /> borrar</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="protocolo">
                  <Select
                    value={selE.proto}
                    onChange={(e) => patchEdge(selE.id, { proto: e.target.value as PivotProto })}
                    options={PROTO_ORDER.map((p) => ({ value: p, label: PROTO_INFO[p].label }))}
                  />
                </Field>
                <Field label="estado">
                  <Select
                    value={selE.alive ? '1' : '0'}
                    onChange={(e) => patchEdge(selE.id, { alive: e.target.value === '1' })}
                    options={[{ value: '1', label: 'vivo (usable)' }, { value: '0', label: 'caído (plan B)'}]}
                  />
                </Field>
                <Field label="puerto local (SOCKS/escucha)" hint="ssh/chisel/ligolo/plink: tu puerto SOCKS · socat: puerto en el pivote">
                  <TextInput
                    type="number"
                    value={selE.localPort ?? ''}
                    onChange={(e) => patchEdge(selE.id, { localPort: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="font-mono"
                  />
                </Field>
                <Field label="puerto remoto (solo socat)" hint="el servicio que quieres exponer: 445 SMB, 3389 RDP, 5985 WinRM…">
                  <TextInput
                    type="number"
                    value={selE.remotePort ?? ''}
                    onChange={(e) => patchEdge(selE.id, { remotePort: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="font-mono"
                  />
                </Field>
              </div>
              <p className="mt-2 text-[11px] text-grey"><span className="text-info">↳</span> {PROTO_INFO[selE.proto].note}</p>
            </div>
          )}
        </div>

        {/* panel derecho */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="tu dirección (VPN/pública)" hint="la que verán los pivotes">
              <TextInput value={attackerAddr} onChange={(e) => setAttackerAddr(e.target.value)} className="font-mono" />
            </Field>
            <Field label="puerto chisel">
              <TextInput type="number" value={chiselPort} onChange={(e) => setChiselPort(e.target.value)} className="font-mono" />
            </Field>
          </div>

          <div className="rounded-lg border border-edge bg-black/30 p-3">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-acento">Ruta al objetivo</h4>
            {route ? (
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                {route.map((h, i) => (
                  <span key={h.node.id} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-grey">→</span>}
                    <span className={h.node.role === 'atacante' ? 'text-ok' : h.node.role === 'pivot' ? 'text-info' : 'text-bad'}>{h.node.name}</span>
                  </span>
                ))}
                <span className="ml-auto font-mono text-[10px] text-grey">{route.length - 1} salto{route.length > 2 ? 's' : ''}</span>
              </div>
            ) : (
              <p className="text-xs text-bad">sin ruta: falta un enlace vivo desde el atacante hasta aquí</p>
            )}
          </div>

          {steps.length > 0 && (
            <>
              <CopyBlock
                text={steps.map((s: PivotStep) => `# [en ${s.where}] ${s.why}\n${s.cmd}`).join('\n\n') + `\n\n# verificación final\n${verify}`}
                label={`comandos pivoting (${steps.length} pasos)`}
                maxH="22rem"
              />
              <div className="space-y-2">
                {steps.map((s: PivotStep, i: number) => (
                  <Reveal key={i} delay={i * 0.02}>
                    <div className="rounded border border-edge px-3 py-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Badge tone={s.where === 'atacante' ? 'ok' : s.where.startsWith('atacante') ? 'ok' : 'info'}>{s.where}</Badge>
                        <CopyBtn text={s.cmd} />
                      </div>
                      <code className="block break-all font-mono text-[11.5px] text-ok">{s.cmd}</code>
                      <p className="mt-0.5 text-[11px] text-grey">{s.why}</p>
                    </div>
                  </Reveal>
                ))}
                <div className="rounded border border-warn/40 bg-warn/5 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-warn">verificación final</span>
                    <CopyBtn text={verify} />
                  </div>
                  <code className="break-all font-mono text-[11px] text-warn">{verify}</code>
                </div>
              </div>
            </>
          )}

          {/* chuleta */}
          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Chuleta de pivoting</h4>
            <ul className="space-y-1 text-[11px]">
              {PIVOT_CHEATSHEET.map(([k, v]) => (
                <li key={k}><span className="font-mono text-ink">{k}:</span> <span className="text-grey">{v}</span></li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Notas de campo</h4>
            <ul className="space-y-1.5 text-[11px] text-grey">
              {PIVOT_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-acento"><Star size={10} /> Protocolos a comparecer</h4>
            <ul className="space-y-1.5 text-[11px]">
              {PROTO_ORDER.map((p) => (
                <li key={p}>
                  <span className="font-mono font-bold" style={{ color: PROTO_INFO[p].color }}>{PROTO_INFO[p].label}</span>
                  <span className="text-grey"> — {PROTO_INFO[p].note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
