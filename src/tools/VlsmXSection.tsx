import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Grid3X3, Table, Download, Image as ImageIcon, FileSpreadsheet, Braces, Star, GraduationCap, ListOrdered } from 'lucide-react'
import { Badge, Button, CopyBtn, Field, Select, TextArea, Toggle, useToast, Reveal } from '../components/ui'
import { cn } from '../lib/util'
import type { VlsmBlock } from '../lib/subnet'
import {
  assembleGrid,
  blockLabelOf,
  computeBlock,
  MAX_BLOCKS,
  overlapPairs,
  parseEntry,
  parseInput,
  sortBlocks,
  type BlockOrder,
  type GridMode,
  type XBlock,
  type XEntry,
} from '../lib/vlsmx'
import { entriesToJson, gridToMarkdown, gridToPngUrl, gridToTsv, gridToXlsxBytes, jsonToInput, THEMES, downloadBytes, downloadText } from '../lib/vlsmx-export'

const EXAMPLE_7 = `# los 7 bloques de la plantilla — red, 1º host, último host y broadcast
192.168.68.230/27
192.168.77.9/16
172.16.230.5/20
10.0.233.4/21
172.30.12.218/30
10.130.1.1/9
10.17.170.3/19`

const EXAMPLE_AREA = EXAMPLE_7.split('\n').filter((l) => !l.startsWith('#')).join('\n')

/* ── paso a paso del modo estudio, calculado desde el propio bloque ── */
function studySteps(b: XBlock): string[] {
  const octetNum = b.xOctet + 1
  const weightSum = (b.netInt >>> ((3 - b.xOctet) * 8)) & 255
  const steps: string[] = []
  steps.push(`prefijo /${b.prefix} → máscara ${b.mask} (wildcard ${b.wildcard}) · ${b.hostBitsCount} bits de host (${(2 ** b.hostBitsCount).toLocaleString('es-ES')} direcciones)`)
  steps.push(`la X va en el bit ${b.xBit} (primer bit libre tras ${b.prefix} bits de red) → octeto ${octetNum}${b.redBits ? `, col ${b.xCol}` : ''}`)
  if (b.redBits) steps.push(`bits de red del octeto ${octetNum}: ${b.redBits.split('').join(' ')} → suma de pesos = ${weightSum} → octeto "${b.baseText ? b.baseText : ''}"${b.baseText ? '' : ''} queda en ${b.net.split('.')[b.xOctet]}`)
  else steps.push(`prefijo múltiplo de 8 → la X abre el octeto ${octetNum} directo, sin bits de red dibujados`)
  steps.push(`IP de red: ${b.net} (todos los bits de host a 0)`)
  if (!b.cidr31 && !b.cidr32) {
    steps.push(`1º host: bits 0…01 → ${b.first} · último host: bits 1…10 → ${b.last}`)
    steps.push(`broadcast: bits 1…1 → ${b.broadcast} · útiles: ${(2 ** b.hostBitsCount - 2).toLocaleString('es-ES')}`)
  } else if (b.cidr31) {
    steps.push(`/31 (RFC 3021): las DOS direcciones son de host (sin broadcast) → ${b.net} y ${b.broadcast}, para enlaces punto a punto`)
  } else {
    steps.push(`/32: host único → ${b.net} (sin red/broadcast: ruta de host)`)
  }
  return steps
}

/* ── celdas de la rejilla ── */
function BitCell({ cell, style }: { cell: NonNullable<ReturnType<typeof assembleGrid>['rows'][number]['cells'][number]>; style: 'hacknexus' | 'excel' }) {
  const weight = 128 >> (((cell.n ?? 1) - 1) % 8)
  const octetNum = (cell.octet ?? 0) + 1
  const auto =
    cell.kind === 'bit'
      ? cell.bit === 'X'
        ? `bit ${cell.n} (col ${(((cell.n ?? 1) - 1) % 8) + 1} del octeto ${octetNum}) · peso ${weight} · primer bit de HOST`
        : `bit ${cell.n} · peso ${weight} · octeto ${octetNum} · valor ${cell.bit === '1' ? weight : 0}`
      : `bit ${cell.n}`
  const cls =
    cell.kind === 'bit'
      ? cell.bit === 'X'
        ? style === 'excel'
          ? 'text-black bg-[#11111112]'
          : 'text-warn'
        : cell.bit === '1'
          ? style === 'excel' ? 'text-black' : 'text-acento'
          : style === 'excel' ? 'text-grey/50' : 'text-grey'
      : 'text-bad font-bold'
  // fondo por octeto DE COLUMNA (plantilla): octeto 2 cian · octeto 4 lila
  const colOctet = cell.n != null ? Math.floor((cell.n - 1) / 8) : 0
  const bg =
    style === 'excel' && colOctet === 1
      ? 'bg-[#00ccff]'
      : style === 'excel' && colOctet === 3
        ? 'bg-[#e1c7e1]'
        : cell.bit === 'X'
          ? 'bg-warn/10'
          : 'bg-black/30'
  return (
    <td title={auto} aria-label={auto} className={cn('border border-edge/70 text-center font-mono text-[11px] leading-none', bg, cls)} style={{ width: 24, height: 24, minWidth: 24 }}>
      {cell.text}
    </td>
  )
}

export default function VlsmXSection({ vlsmBlocks }: { vlsmBlocks: VlsmBlock[] | null }) {
  const toast = useToast()
  const [tab, setTab] = useState<'A' | 'B'>('A')
  const [input, setInput] = useState('')
  const [order, setOrder] = useState<BlockOrder>('input')
  const [styleName, setStyleName] = useState<'hacknexus' | 'excel'>(() => (localStorage.getItem('vlsmx.style') === 'excel' ? 'excel' : 'hacknexus'))
  const [mode32, setMode32] = useState(() => localStorage.getItem('vlsmx.mode32') === '1')
  const [study, setStudy] = useState(() => localStorage.getItem('vlsmx.study') === '1')
  const [showOrder, setShowOrder] = useState<'raw' | 'resumen' | null>(null)

  useEffect(() => localStorage.setItem('vlsmx.style', styleName), [styleName])
  useEffect(() => localStorage.setItem('vlsmx.mode32', mode32 ? '1' : '0'), [mode32])
  useEffect(() => localStorage.setItem('vlsmx.study', study ? '1' : '0'), [study])

  /* ── Modo A: parsear el texto del usuario ── */
  const parsed = useMemo(() => {
    if (tab !== 'A') return null
    const entries = parseInput(input)
    return entries
  }, [tab, input])

  const blocks: XBlock[] = useMemo(() => {
    if (tab === 'B') {
      return (vlsmBlocks ?? []).map((b, i) => computeBlock(b.network, b.cidr, i, `${b.network}/${b.cidr}`, `${b.name} (${b.hosts}h)`))
    }
    const ok = (parsed ?? []).filter((e) => !e.error)
    return ok.slice(0, MAX_BLOCKS).map((e, i) => {
      // re-parse determinista (los errores ya se filtraron)
      const r = parseEntry(e.raw)
      return r.ok ? computeBlock(r.ip, r.prefix, i, e.raw) : null!
    }).filter(Boolean)
  }, [tab, vlsmBlocks, parsed])

  const truncated = tab === 'A' && (parsed ?? []).filter((e) => !e.error).length > MAX_BLOCKS
  const overlaps = useMemo(() => (tab === 'A' ? overlapPairs(blocks) : []), [blocks, tab])

  const assembled = useMemo(() => {
    const sorted = tab === 'A' ? sortBlocks(blocks, order) : blocks
    return assembleGrid(sorted, (mode32 ? '32' : '24') as GridMode)
  }, [blocks, tab, order, mode32])

  const entries = tab === 'A' ? parsed ?? [] : []

  const copySummary = (b: XBlock): string => [b.net + '/' + b.prefix, 'máscara ' + b.mask, 'wildcard ' + b.wildcard, 'red ' + b.net, '1º ' + b.first, 'último ' + b.last, 'broadcast ' + (b.cidr31 ? '(no aplica — RFC 3021)' : b.cidr32 ? '(host único)' : b.broadcast), `${b.usable.toLocaleString('es-ES')} hosts útiles de ${b.total.toLocaleString('es-ES')}`].join('\n')

  const copyGrid = (text: string, what: string) => {
    void text
    toast(what)
  }

  const doExport = (kind: 'tsv' | 'md' | 'json' | 'png' | 'xlsx') => {
    const g = assembled
    if (!g.rows.length) {
      toast('no hay bloques que exportar', 'error')
      return
    }
    const slug = 'vlsmx'
    if (kind === 'tsv') {
      navigator.clipboard.writeText(gridToTsv(g)).catch(() => {})
      copyGrid('', 'rejilla copiada como TSV (pegable en Excel)')
    } else if (kind === 'md') {
      navigator.clipboard.writeText(gridToMarkdown(g)).catch(() => {})
      copyGrid('', 'rejilla copiada como Markdown')
    } else if (kind === 'json') {
      const json = entriesToJson(tab === 'A' ? entries.filter((e) => !e.error).map((e) => ({ raw: e.raw })) : (vlsmBlocks ?? []).map((b) => ({ raw: `${b.network}/${b.cidr}` })))
      downloadText(`${slug}.json`, json, 'application/json')
      toast('JSON descargado')
    } else if (kind === 'png') {
      const theme = styleName === 'excel' ? THEMES.excel : THEMES.hacknexus
      const url = gridToPngUrl(g, theme, 2)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}.png`
      a.click()
      toast('PNG descargado (×2)')
    } else {
      downloadBytes(`${slug}.xlsx`, gridToXlsxBytes(g))
      toast('.xlsx descargado (hoja Hoja1, igual a la plantilla)')
    }
  }

  const importJson = (text: string) => {
    const r = jsonToInput(text)
    if (r.ok) {
      setInput(r.text)
      setTab('A')
      toast('entrada importada desde JSON')
    } else toast(r.error, 'error')
  }

  return (
    <Reveal>
      <div className="card mt-8 p-6">
        {/* ── cabecera de la sección ── */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-acento">
              <Grid3X3 size={14} /> // VLSM en formato X
            </div>
            <h3 className="mt-1 text-lg font-bold text-white">La rejilla de bits método X</h3>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-grey">
              Como la plantilla de aula en Excel: cada red se dibuja bit a bit (solo se dibuja desde el octeto 2), la <span className="font-mono font-bold text-warn">X</span> marca{' '}
              <span className="text-ink">dónde empieza el host</span>, y debajo salen las filas <span className="font-mono">DIR RED · 1º HOST · ULTIMO HOST · DIR BROADCAST</span>. Métodos:{' '}
              pega <span className="text-ink">ip/prefijo</span>, <span className="text-ink">ip 255.255.255.224</span> o <span className="text-ink">ip 0.0.0.31</span>. Solo IPv4 · 🟢 todo se calcula en tu navegador.
              {' '}Ficha en <a className="text-acento underline decoration-dotted hover:text-acento-bright" href="#/docs">#/docs</a> (busca «vlsm»).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={tab === 'A' ? 'primary' : 'ghost'} className="px-3 py-1.5 text-xs" onClick={() => setTab('A')}>
              modo A · lista
            </Button>
            <Button variant={tab === 'B' ? 'primary' : 'ghost'} className="px-3 py-1.5 text-xs" onClick={() => setTab('B')} disabled={!vlsmBlocks?.length}>
              modo B · desde VLSM
            </Button>
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => { setInput(EXAMPLE_AREA); setTab('A'); toast('ejemplo cargado: los 7 bloques de la plantilla') }}>
              <Star size={13} /> ejemplo
            </Button>
          </div>
        </div>

        {/* ── controles ── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Toggle checked={styleName === 'excel'} onChange={(v) => setStyleName(v ? 'excel' : 'hacknexus')} label="estilo: Excel clásico" />
          <Toggle checked={mode32} onChange={setMode32} label="mostrar 32 bits (octeto 1)" />
          <Toggle checked={study} onChange={setStudy} label="modo estudio" />
          {tab === 'A' && (
            <Select
              className="w-44 py-1.5 text-xs"
              options={[{ value: 'input', label: 'orden: como se escribió' }, { value: 'prefix', label: 'orden: por tamaño (p asc)' }, { value: 'network', label: 'orden: por dirección' }]}
              value={order}
              onChange={(e) => setOrder(e.target.value as BlockOrder)}
            />
          )}
        </div>

        {/* ── entrada (Modo A) ── */}
        {tab === 'A' ? (
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_240px]">
            <Field label="entradas — una por línea, coma o punto y coma" hint="# comentarios ok">
              <TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={'192.168.68.230/27\n10.0.0.1 255.255.255.252\n192.168.77.9 255.255.0.0' + '\n# comentarios'}
                className="min-h-24"
              />
            </Field>
            <div className="flex flex-col gap-2">
              <CopyBtn
                text={JSON.stringify({ version: 1, tool: 'hacknexus-vlsmx', entries: entries.filter((e) => !e.error).map((e) => ({ raw: e.raw })) }, null, 2)}
                label="copiar JSON"
                className="justify-start"
              />
              <label className="cursor-pointer text-left">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-panel px-2.5 py-1.5 font-mono text-[11px] text-grey hover:border-acento/50 hover:text-acento">
                  <Braces size={12} /> importar JSON
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    try {
                      importJson(await f.text())
                    } catch {
                      toast('no pude leer el fichero', 'error')
                    }
                    e.currentTarget.value = ''
                  }}
                />
              </label>
              <p className="mt-1 text-[10px] leading-relaxed text-grey/70">
                La X se dibuja en el bit <span className="text-warn">prefijo+1</span>. Con /0–/7 se entra en modo 32 bits automáticamente.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-acento/20 bg-acento/5 px-4 py-2.5 font-mono text-[11px] text-acento/90">
            modo B — dibujando las <span className="font-bold">{(vlsmBlocks ?? []).length}</span> subredes que calculó la VLSM de arriba
            {(vlsmBlocks ?? []).length === 0 && <span className="text-warn"> (añade subredes arriba: aquí se verán en vivo)</span>}
            {vlsmBlocks?.length ? ' · se actualiza en vivo cuando tocas la VLSM' : ''}
          </div>
        )}

        {/* ── errores por línea + avisos (aria-live) ── */}
        <div aria-live="polite">
          {tab === 'A' && entries.some((e) => e.error) && (
            <div className="mt-3 rounded-lg border border-bad/40 bg-bad/5 px-4 py-3">
              {entries
                .filter((e) => e.error)
                .map((e, i) => (
                  <p key={i} className="font-mono text-[11px] text-bad">
                    ✗ <span className="text-ink">{e.raw}</span> — {e.error}
                  </p>
                ))}
            </div>
          )}
          {tab === 'A' && entries.some((e) => !e.error && e.warning) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entries
                .filter((e) => !e.error && e.warning)
                .map((e, i) => (
                  <Badge key={i} tone="warn" className="text-[10px]">
                    {e.raw}: {e.warning}
                  </Badge>
                ))}
            </div>
          )}
          {overlaps.length > 0 && (
            <div className="mt-2 rounded-lg border border-warn/40 bg-warn/5 px-4 py-2.5 font-mono text-[11px] text-warn">
              ⚠ solapes: {overlaps.join(' · ')} — revisa si es lo que buscabas (p. ej. resumen/ruta estática)
            </div>
          )}
          {truncated && <p className="mt-2 font-mono text-[11px] text-warn">⚠ más de {MAX_BLOCKS} bloques: mostrando los primeros {MAX_BLOCKS} (demás líneas ignoradas)</p>}
          {assembled.warns.map((w, i) => (
            <p key={i} className="mt-2 font-mono text-[11px] text-warn">⚠ {w}</p>
          ))}
        </div>

        {/* ── la rejilla ── */}
        {assembled.rows.length > 0 ? (
          <div className="mt-5">
            {showOrder === 'resumen' && null}
            <div className="max-w-full overflow-x-auto rounded-xl border border-edge bg-black/40 print:overflow-visible print:border-0 print:bg-transparent">
              <table
                role="grid"
                aria-label="rejilla de bits en formato X"
                className="print:min-w-0 min-w-fit border-collapse font-mono print:w-full"
              >
                <caption className="sr-only">rejilla del método X: bits 9–{assembled.cols} con pesos, bloques de red apilados, columna de etiquetas e IPs</caption>
                <thead>
                  {/* fila 1: nº de bit — roja/negrita como la plantilla */}
                  <tr>
                    <th className="sticky left-0 z-10 border border-edge/50 bg-panel px-2 text-center font-mono text-[9px] uppercase text-grey print:bg-white" style={{ minWidth: 132 }} />
                    {assembled.bitNums.map((c, i) => (
                      <th key={i} aria-label={`bit ${c.n}`} className="border border-edge/70 bg-black/40 px-0 text-center font-mono text-[10px] font-bold text-bad" style={{ width: 24, minWidth: 24 }}>
                        {c.n}
                      </th>
                    ))}
                    <th className="sticky right-0 z-10 border border-edge/50 bg-panel px-2 text-center font-mono text-[9px] uppercase text-grey print:bg-white" style={{ minWidth: 132 }}>IP</th>
                  </tr>
                  {/* fila 2: pesos — azul como la plantilla */}
                  <tr>
                    <th className="sticky left-0 z-10 border border-edge/50 bg-panel px-2 text-center font-mono text-[9px] uppercase text-grey print:bg-white">peso</th>
                    {assembled.weights.map((c, i) => (
                      <th key={i} title={`peso del bit ${c.n} (octeto ${(c.octet ?? 0) + 1})`} className="border border-edge/70 bg-black/40 text-center font-mono text-[9px] text-info" style={{ width: 24, minWidth: 24 }}>
                        {c.weight}
                      </th>
                    ))}
                    <th className="sticky right-0 z-10 border border-edge/50 bg-panel print:bg-white" style={{ minWidth: 132 }} />
                  </tr>
                </thead>
                <tbody>
                  {assembled.rows.map((row, r) => (
                    <motion.tr
                      key={`${row.label}-${r}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(r * 0.015, 0.5) }}
                      className="print:break-inside-avoid"
                    >
                      {/* columna Y: etiqueta (sticky-left) */}
                      <th
                        scope="row"
                        className={cn('sticky left-0 z-10 border border-edge/70 bg-panel px-2 text-left font-mono text-[10.5px] print:bg-white', row.labelBold ? 'font-bold text-ink' : 'font-normal text-grey')}
                        style={{ minWidth: 132 }}
                      >
                        {row.label}
                      </th>
                      {row.cells.map((c, i) => (c ? <BitCell key={i} cell={c} style={styleName} /> : <td key={i} className="border border-edge/40" style={{ width: 24, minWidth: 24 }} />))}
                      {/* columna Z: IP (sticky-right) */}
                      <td
                        className={cn(
                          'sticky right-0 z-10 border border-edge/70 bg-panel px-2.5 text-right font-mono text-[11px] print:bg-white',
                          row.ipBold ? 'font-bold text-white' : 'text-acento',
                          styleName === 'excel' && (row.xOctet === 1 ? 'bg-[#00ccff]' : row.xOctet === 3 ? 'bg-[#e1c7e1] text-black' : ''),
                        )}
                        style={{ minWidth: 132 }}
                      >
                        <span className="flex items-center justify-end gap-1">
                          {row.ip}
                          {row.ip && <CopyBtn text={row.ip} className="border-0 bg-transparent px-1 py-0.5" label={`copiaste ${row.ip}`} />}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── exportaciones ── */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => doExport('tsv')}><Table size={13} /> copiar TSV</Button>
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => doExport('md')}><ListOrdered size={13} /> copiar Markdown</Button>
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => doExport('json')}><Braces size={13} /> JSON</Button>
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => doExport('png')}><ImageIcon size={13} /> PNG ×2</Button>
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => doExport('xlsx')}><FileSpreadsheet size={13} /> Excel .xlsx</Button>
              <span className="font-mono text-[10px] text-grey/70">todo sale del mismo modelo: lo que ves es lo que exportas</span>
            </div>
          </div>
        ) : (
          /* ── estado vacío ── */
          <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-edge bg-black/20 px-6 py-10 text-center">
            <Grid3X3 size={34} className="text-grey/40" />
            <p className="font-mono text-[12px] text-grey">{tab === 'A' ? 'pega una IP/red arriba (o pulsa «ejemplo»)' : 'la VLSM de arriba todavía no tiene subredes'}</p>
            {tab === 'A' && (
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => { setInput(EXAMPLE_AREA); toast('ejemplo cargado') }}>
                <Star size={13} /> cargar los 7 ejemplos de la plantilla
              </Button>
            )}
          </div>
        )}

        {/* ── resumen por bloque ── */}
        {blocks.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {blocks.slice(0, 60).map((b, i) => (
              <motion.div key={`${b.net}/${b.prefix}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }} className="rounded-lg border border-edge bg-black/30 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="accent">{blockLabelOf(b)}</Badge>
                  <CopyBtn text={copySummary(b)} label={`copiado el bloque de ${b.net}/${b.prefix}`} className="border-0 bg-transparent px-1 py-0.5" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="neutral" className="text-[10px]">máscara {b.mask}</Badge>
                  <Badge tone="neutral" className="text-[10px]">wildcard {b.wildcard}</Badge>
                  <Badge tone="info" className="text-[10px]">{b.usable.toLocaleString('es-ES')} hosts útiles</Badge>
                  {b.cidr31 && <Badge tone="warn" className="text-[10px]">punto a punto (RFC 3021)</Badge>}
                  {b.cidr32 && <Badge tone="warn" className="text-[10px]">host único</Badge>}
                  <Badge tone={b.scope === 'privada' || b.scope === 'loopback' || b.scope === 'link-local' ? 'ok' : 'neutral'} className="text-[10px]">{b.klass} · {b.scope}</Badge>
                </div>
                {study && (
                  <ol className="mt-2.5 space-y-1 border-t border-edge/60 pt-2.5 font-mono text-[10px] leading-relaxed text-grey">
                    {studySteps(b).map((s, k) => (
                      <motion.li key={k} initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 + k * 0.14 }} className="flex gap-1.5">
                        <span className="text-acento">{k + 1}.</span>
                        <span className="text-ink/80">{s}</span>
                      </motion.li>
                    ))}
                  </ol>
                )}
              </motion.div>
            ))}
            {blocks.length > 60 && <p className="font-mono text-[10px] text-grey">+ {blocks.length - 60} bloques más en la rejilla (resumen limitado a 60)</p>}
          </div>
        )}

        {/* nota docente */}
        <div className="mt-5 rounded-lg border border-info/25 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/85">
          💡 <span className="text-ink">Cómo leer la X:</span> la plantilla solo dibuja del octeto 2 en adelante (el 1.er octeto va en el texto de la izquierda). Los bits de red del octeto
          donde cae la X se suman con sus pesos (128·64·32…) y la <span className="text-warn">X</span> es el primer bit libre — todo lo que queda a su derecha, PEGADO, es parte del host.
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-widest text-grey/50">src/lib/vlsmx.ts · motor puro testado contra la plantilla Format o_en_X.xlsx</span>
          <Download size={12} className="text-grey/40" />
        </div>
      </div>
    </Reveal>
  )
}
