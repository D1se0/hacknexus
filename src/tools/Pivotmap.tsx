import { useMemo, useState } from 'react'
import { Route } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, TextInput, Reveal, InfoBanner } from '../components/ui'
import { computeRoutes, buildPivotCommands, PIVOT_NOTES, PIVOT_CHEATSHEET, type PivotNode, type PivotEdge, type PivotStep } from '../lib/pivotmap'

const PRESET_NODES: PivotNode[] = [
  { id: 'kali', name: 'kali', role: 'atacante', x: 80, y: 150, ifaces: [{ cidr: '10.10.14.5/24' }] },
  { id: 'dmz', name: 'web-dmz', role: 'pivot', x: 300, y: 150, ifaces: [{ cidr: '10.10.14.20/24' }, { cidr: '10.10.10.5/24' }], note: 'shell inicial' },
  { id: 'fs', name: 'fileserver', role: 'objetivo', x: 520, y: 150, ifaces: [{ cidr: '10.10.10.15/24' }] },
]
const PRESET_EDGES: PivotEdge[] = [
  { from: 'kali', to: 'dmz', proto: 'ssh', alive: true },
  { from: 'dmz', to: 'fs', proto: 'chisel', alive: true },
]

const ROLE_COLORS: Record<PivotNode['role'], string> = {
  atacante: '#2ee88a',
  pivot: '#38bdf8',
  objetivo: '#f43f5e',
}
const ROLE_LABEL: Record<PivotNode['role'], string> = { atacante: 'atacante', pivot: 'pivote', objetivo: 'objetivo' }

export default function Pivotmap() {
  const [nodes, setNodes] = useState<PivotNode[]>(PRESET_NODES)
  const [edges, setEdges] = useState<PivotEdge[]>(PRESET_EDGES)
  const [targetId, setTargetId] = useState('fs')
  const [chiselPort, setChiselPort] = useState('8000')
  const [selected, setSelected] = useState<string | null>(null)

  const routes = useMemo(() => computeRoutes(nodes, edges), [nodes, edges])
  const route = routes.get(targetId)
  const cmds = useMemo(() => (route && route.length > 1 ? buildPivotCommands(nodes, edges, route, { chiselPort }) : { steps: [], socksvia: '' }), [route, nodes, edges, chiselPort])

  const patchNode = (id: string, p: Partial<PivotNode>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n)))
  const addNode = () => {
    const id = 'n' + Math.random().toString(36).slice(2, 6)
    setNodes((ns) => [...ns, { id, name: 'host-' + (ns.length + 1), role: 'objetivo', x: 480, y: 260, ifaces: [{ cidr: '10.10.10.0/24' }] }])
    setTargetId(id)
  }

  return (
    <>
      <ToolHeader icon={Route} title="Pivoting Map" desc="Diseña la cadena de pivotes visualmente: nodos con sus interfaces, enlaces por protocolo y generación de los comandos chisel/socat/ssh EXACTOS para cada tramo hasta el objetivo" />

      <InfoBanner>
        <b>Cómo funciona:</b> el atacante conecta con el primer pivote; cada pivote tiene 2 interfaces (la de la red que te
        alcanza y la de la red siguiente). La tool calcula la ruta y te da los comandos por tramo. Enumera SIEMPRE las interfaces
        del pivote con <span className="font-mono">ip a</span> para saber qué red esconde.
      </InfoBanner>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div>
          {/* lienzo SVG */}
          <div className="card overflow-hidden rounded-xl border border-edge bg-black/60 p-0">
            <svg viewBox="0 0 640 320" className="w-full">
              {/* aristas */}
              {edges.map((e, i) => {
                const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to)
                if (!a || !b) return null
                const onRoute = route?.some((n) => n.id === e.from) && route?.some((n) => n.id === e.to) && route.findIndex((n) => n.id === e.to) === route.findIndex((n) => n.id === e.from) + 1
                return (
                  <g key={i}>
                    <line x1={a.x + 46} y1={a.y + 30} x2={b.x + 4} y2={b.y + 30} stroke={e.alive ? (onRoute ? '#2ee88a' : '#334155') : '#7f1d1d'} strokeWidth={onRoute ? 3 : 2} strokeDasharray={e.alive ? undefined : '4 4'} />
                    <text x={(a.x + b.x) / 2 + 25} y={a.y + 22} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">{e.proto}</text>
                    <circle cx={(a.x + b.x) / 2 + 25} cy={a.y + 30} r="3" fill={e.alive ? '#2ee88a' : '#7f1d1d'} />
                  </g>
                )
              })}
              {/* nodos */}
              {nodes.map((n) => {
                const isTarget = n.id === targetId
                return (
                  <g key={n.id} onClick={() => setSelected(n.id)} className="cursor-pointer">
                    <rect x={n.x} y={n.y} width="50" height="60" rx="10" fill={ROLE_COLORS[n.role]} opacity={selected === n.id ? 1 : 0.85} stroke={isTarget ? '#fff' : 'none'} strokeWidth={isTarget ? 2 : 0} />
                    <text x={n.x + 25} y={n.y + 36} fontSize="18" textAnchor="middle">{n.role === 'atacante' ? '🎯' : n.role === 'pivot' ? '🔀' : '🖥️'}</text>
                    <text x={n.x + 25} y={n.y + 78} fontSize="11" fontFamily="monospace" fill="#e2e8f0" textAnchor="middle">{n.name}</text>
                    {n.ifaces.map((f, i) => (
                      <text key={i} x={n.x + 25} y={n.y + 92 + i * 12} fontSize="9" fontFamily="monospace" fill="#64748b" textAnchor="middle">{f.cidr}</text>
                    ))}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* editor de nodos */}
          <div className="mt-3 space-y-2">
            {nodes.map((n) => (
              <div key={n.id} className={`rounded border px-3 py-2 ${selected === n.id ? 'border-acento/50' : 'border-edge'}`} onClick={() => setSelected(n.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <input value={n.name} onChange={(e) => patchNode(n.id, { name: e.target.value })} className="w-28 rounded border border-edge bg-black/40 px-2 py-1 font-mono text-xs text-ink" />
                  <select value={n.role} onChange={(e) => patchNode(n.id, { role: e.target.value as PivotNode['role'] })} className="rounded border border-edge bg-black/40 px-1 py-1 text-xs text-grey">
                    <option value="atacante">atacante</option>
                    <option value="pivot">pivote</option>
                    <option value="objetivo">objetivo</option>
                  </select>
                  <input value={n.ifaces[0]?.cidr ?? ''} onChange={(e) => patchNode(n.id, { ifaces: [{ cidr: e.target.value }, ...n.ifaces.slice(1)] })} placeholder="iface 1: 10.10.14.5/24" className="w-44 rounded border border-edge bg-black/40 px-2 py-1 font-mono text-xs text-info" />
                  <input value={n.ifaces[1]?.cidr ?? ''} onChange={(e) => patchNode(n.id, { ifaces: [n.ifaces[0], { cidr: e.target.value }, ...n.ifaces.slice(2)] })} placeholder="iface 2 (si pivot)" className="w-44 rounded border border-edge bg-black/40 px-2 py-1 font-mono text-xs text-warn" />
                  <button onClick={() => setTargetId(n.id)} className={`ml-auto rounded px-2 py-1 text-[11px] ${targetId === n.id ? 'bg-acento/20 text-acento' : 'border border-edge text-grey'}`}>
                    {targetId === n.id ? '★ objetivo' : 'marcar objetivo'}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addNode} className="rounded border border-acento/40 px-3 py-1.5 text-xs text-acento hover:bg-acento/10">+ añadir nodo</button>
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Puerto chisel">
            <TextInput value={chiselPort} onChange={(e) => setChiselPort(e.target.value)} className="font-mono" />
          </Field>

          <div className="rounded-lg border border-edge bg-black/30 p-3">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-acento">Ruta al objetivo</h4>
            {route ? (
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                {route.map((n, i) => (
                  <span key={n.id} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-grey">→</span>}
                    <span className={n.role === 'atacante' ? 'text-ok' : n.role === 'pivot' ? 'text-info' : 'text-bad'}>{n.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-bad">sin ruta: falta un enlace vivo entre el atacante y ese nodo</p>
            )}
          </div>

          {cmds.steps.length > 0 && (
            <>
              <CopyBlock text={cmds.steps.map((s: PivotStep) => `# ${s.why}\n${s.cmd}`).join('\n\n')} label={`comandos pivoting (${cmds.steps.length} pasos)`} maxH="22rem" />
              <div className="space-y-2">
                {cmds.steps.map((s: PivotStep, i: number) => (
                  <Reveal key={i} delay={i * 0.02}>
                    <div className="rounded border border-edge px-3 py-2">
                      <code className="block break-all font-mono text-[11.5px] text-ok">{s.cmd}</code>
                      <p className="mt-0.5 text-[11px] text-grey">{s.why}</p>
                    </div>
                  </Reveal>
                ))}
                {cmds.socksvia && (
                  <div className="rounded border border-warn/40 bg-warn/5 px-3 py-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase text-warn">verificación a través del túnel</span>
                      <CopyBtn text={cmds.socksvia} />
                    </div>
                    <code className="break-all font-mono text-[11px] text-warn">{cmds.socksvia}</code>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Chuleta de pivoting</h4>
            <ul className="space-y-1 text-[11px]">
              {PIVOT_CHEATSHEET.map(([k, v]) => (
                <li key={k}><span className="font-mono text-ink">{k}:</span> <span className="text-grey">{v}</span></li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-edge bg-black/30 p-3">
            <ul className="space-y-1.5 text-[11px] text-grey">
              {PIVOT_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
