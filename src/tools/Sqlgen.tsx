import { useMemo, useState } from 'react'
import { Database, Plus, X, Download } from 'lucide-react'
import { ToolHeader, CopyBlock, Field, TextInput, Select, Button, Badge, Reveal, useToast } from '../components/ui'
import { download, pick, randInt } from '../lib/util'

interface Column {
  name: string
  type: string
  pk: boolean
  nullable: boolean
}

const TYPES = [
  { value: 'INT', label: 'INT' },
  { value: 'FLOAT', label: 'FLOAT' },
  { value: 'VARCHAR', label: 'VARCHAR(100)' },
  { value: 'TEXT', label: 'TEXT' },
  { value: 'EMAIL', label: 'EMAIL' },
  { value: 'DATE', label: 'DATE' },
  { value: 'BOOLEAN', label: 'BOOLEAN' },
  { value: 'UUID', label: 'UUID' },
  { value: 'IP', label: 'IP' },
  { value: 'NAME', label: 'NOMBRE' },
]

const NOMBRES = ['Carlos', 'María', 'Juan', 'Lucía', 'Diego', 'Sofía', 'Pablo', 'Elena', 'Adrián', 'Carmen', 'Javier', 'Marta', 'Sergio', 'Ana', 'Iván', 'Nerea']
const APELLIDOS = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández', 'Ruiz', 'Díaz', 'Moreno', 'Álvarez', 'Romero']
const DOMINIOS = ['gmail.com', 'outlook.com', 'proton.me', 'empresa.com', 'test.local']
const CIUDADES = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Zaragoza', 'Murcia']

function fakeValue(type: string, row: number): string {
  switch (type) {
    case 'INT': return String(randInt(1, 9999))
    case 'FLOAT': return (Math.random() * 1000).toFixed(2)
    case 'VARCHAR': return `${pick(CIUDADES)}_${row}`
    case 'TEXT': return `texto de ejemplo fila ${row}`
    case 'EMAIL': return `${pick(NOMBRES).toLowerCase()}.${pick(APELLIDOS).toLowerCase()}@${pick(DOMINIOS)}`
    case 'DATE': {
      const y = randInt(2015, 2026)
      const m = randInt(1, 12)
      const d = randInt(1, 28)
      return `'${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}'`
    }
    case 'BOOLEAN': return pick(['TRUE', 'FALSE'])
    case 'UUID': return crypto.randomUUID()
    case 'IP': return `${randInt(10, 250)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(2, 254)}`
    case 'NAME': return `${pick(NOMBRES)} ${pick(APELLIDOS)}`
    default: return 'NULL'
  }
}

export default function Sqlgen() {
  const [table, setTable] = useState('usuarios')
  const [rows, setRows] = useState(10)
  const [cols, setCols] = useState<Column[]>([
    { name: 'id', type: 'INT', pk: true, nullable: false },
    { name: 'nombre', type: 'NAME', pk: false, nullable: false },
    { name: 'email', type: 'EMAIL', pk: false, nullable: false },
    { name: 'registro', type: 'DATE', pk: false, nullable: false },
    { name: 'activo', type: 'BOOLEAN', pk: false, nullable: false },
  ])
  const toast = useToast()

  const updateCol = (i: number, patch: Partial<Column>) => {
    setCols((c) => c.map((col, j) => (j === i ? { ...col, ...patch } : col)))
  }

  const data = useMemo(() => {
    // filas × columnas
    const table: string[][] = []
    for (let r = 0; r < rows; r++) {
      const row = cols.map((c) => (c.type === 'INT' && c.pk ? String(r + 1) : c.nullable && Math.random() < 0.1 ? 'NULL' : fakeValue(c.type, r + 1)))
      table.push(row)
    }
    return table
  }, [cols, rows])

  const createSql = useMemo(() => {
    const defs = cols.map((c) => {
      const sqlType = c.type === 'EMAIL' || c.type === 'NAME' || c.type === 'IP' ? 'VARCHAR(255)' : c.type === 'DATE' ? 'DATE' : c.type === 'BOOLEAN' ? 'BOOLEAN' : c.type === 'UUID' ? 'CHAR(36)' : c.type === 'VARCHAR' || c.type === 'TEXT' ? 'VARCHAR(255)' : c.type
      let def = `  ${c.name} ${sqlType}`
      if (c.pk) def += ' PRIMARY KEY'
      if (!c.nullable && !c.pk) def += ' NOT NULL'
      return def
    })
    return `CREATE TABLE ${table} (\n${defs.join(',\n')}\n);`
  }, [cols, table])

  const insertSql = useMemo(() => {
    const names = cols.map((c) => c.name).join(', ')
    const values = data.map((row) => `(${row.map((v) => (v === 'NULL' ? 'NULL' : /^[0-9.]+$|^(TRUE|FALSE)$/.test(v) ? v : `'${v.replace(/'/g, "''")}'`)).join(', ')})`).join(',\n')
    return `INSERT INTO ${table} (${names}) VALUES\n${values};`
  }, [cols, data, table])

  const csv = useMemo(() => {
    const header = cols.map((c) => c.name).join(',')
    const body = data.map((r) => r.map((v) => (v.includes(',') ? `"${v}"` : v)).join(',')).join('\n')
    return `${header}\n${body}`
  }, [cols, data])

  const mermaid = useMemo(() => {
    const pks = cols.filter((c) => c.pk).map((c) => c.name)
    const attrs = cols.map((c) => `${c.pk ? '*' : ''}${c.name} ${c.type.toLowerCase()}`)
    return `erDiagram\n    ${table.toUpperCase()} {\n${attrs.map((a) => `        ${a}`).join('\n')}\n    }`
  }, [cols, table])

  return (
    <div>
      <ToolHeader icon={Database} title="SQL & CSV Generator" desc="Esquemas con datos fake realistas, INSERTs listos, CSV descargable y diagrama ER en Mermaid — portado de sql-generator" badge="ported" />

      <div className="grid gap-6">
        <Reveal>
          <div className="card p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_160px_auto]">
              <Field label="Tabla">
                <TextInput value={table} onChange={(e) => setTable(e.target.value)} className="font-mono" />
              </Field>
              <Field label="Filas de datos">
                <TextInput type="number" min={1} max={500} value={rows} onChange={(e) => setRows(Math.min(500, Math.max(1, +e.target.value)))} />
              </Field>
              <div className="content-end">
                <Button onClick={() => { setCols((c) => [...c, { name: `col${c.length + 1}`, type: 'VARCHAR', pk: false, nullable: true }]) }} className="gap-2">
                  <Plus size={14} /> columna
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-edge font-mono text-[10px] uppercase tracking-wider text-grey">
                    <th className="py-2 pr-2">nombre</th>
                    <th className="py-2 pr-2">tipo</th>
                    <th className="py-2 pr-2 text-center">PK</th>
                    <th className="py-2 pr-2 text-center">NULL</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {cols.map((c, i) => (
                    <tr key={i} className="border-b border-edge/40">
                      <td className="py-1.5 pr-2">
                        <input value={c.name} onChange={(e) => updateCol(i, { name: e.target.value.replace(/\s/g, '_') })} className="w-full rounded border border-edge bg-black/40 px-2 py-1 font-mono text-xs text-ink outline-none focus:border-acento/60" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <select value={c.type} onChange={(e) => updateCol(i, { type: e.target.value })} className="w-full rounded border border-edge bg-black/40 px-2 py-1 font-mono text-xs text-ink outline-none">
                          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2 text-center">
                        <input type="checkbox" checked={c.pk} onChange={(e) => updateCol(i, { pk: e.target.checked })} className="accent-[#2ee88a]" />
                      </td>
                      <td className="py-1.5 pr-2 text-center">
                        <input type="checkbox" checked={c.nullable} onChange={(e) => updateCol(i, { nullable: e.target.checked })} className="accent-[#2ee88a]" />
                      </td>
                      <td className="py-1.5 text-right">
                        <button onClick={() => setCols((x) => x.filter((_, j) => j !== i))} className="text-grey hover:text-bad"><X size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold text-white">CREATE TABLE</h3>
                <Badge tone="accent">DDL</Badge>
              </div>
              <CopyBlock text={createSql} label="create" />
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold text-white">INSERT</h3>
                <Badge tone="info">{rows} filas</Badge>
              </div>
              <CopyBlock text={insertSql} label="insert" maxH="max-h-72" />
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold text-white">CSV</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { download(`${table}.csv`, csv, 'text/csv'); toast('CSV descargado') }} className="gap-2 px-3 py-1.5 text-xs">
                    <Download size={12} /> descargar
                  </Button>
                </div>
              </div>
              <CopyBlock text={csv} label="csv" maxH="max-h-72" />
            </div>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold text-white">Diagrama ER (Mermaid)</h3>
                <Badge tone="neutral">mermaid.live</Badge>
              </div>
              <CopyBlock text={mermaid} label="mermaid" />
              <p className="mt-2 font-mono text-[10px] text-grey">pega el código en mermaid.live para renderizar el diagrama</p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}