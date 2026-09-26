/* Snapshots: exportar/importar la configuración de una tool como JSON.
   Contrato mínimo: { tool, schema: 1, when, data }. La tool define 'data'
   con sus estados configurables; aquí solo se valida la envoltura. */

export interface Snapshot<T = unknown> {
  tool: string
  schema: 1
  when: string // ISO
  app: 'hacknexus'
  data: T
}

export const SCHEMA_VERSION = 1

export function makeSnapshot<T>(toolId: string, data: T): Snapshot<T> {
  return { app: 'hacknexus', tool: toolId, schema: SCHEMA_VERSION, when: new Date().toISOString(), data }
}

export interface ParseOk<T> { ok: true; snap: Snapshot<T> }
export interface ParseErr { ok: false; error: string }

export function parseSnapshot<T = unknown>(raw: string, toolId: string): ParseOk<T> | ParseErr {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'JSON inválido: no se pudo parsear el fichero' }
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, error: 'El contenido no es un objeto JSON' }
  const p = parsed as Record<string, unknown>
  if (p.app !== 'hacknexus') return { ok: false, error: 'No parece un snapshot de HackNexus (falta app:"hacknexus")' }
  if (p.tool !== toolId) return { ok: false, error: `Este snapshot es de "${String(p.tool)}", no de "${toolId}"` }
  if (p.schema !== SCHEMA_VERSION) return { ok: false, error: `Versión de schema no soportada: ${String(p.schema)}` }
  if (typeof p.data !== 'object' || p.data === null) return { ok: false, error: 'Falta el campo "data" con la configuración' }
  return { ok: true, snap: parsed as Snapshot<T> }
}

/** Lee un File como texto (para el input[type=file] de carga). */
export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result ?? ''))
    r.onerror = () => reject(r.error ?? new Error('no se pudo leer el fichero'))
    r.readAsText(file)
  })
}
