/* Motor de ejecución real de snippets:
   - Python → Pyodide (WASM, 100% local, sin red)
   - JavaScript/TypeScript/HTML/CSS → sandbox local (Function/iframe)
   - Resto (C, C++, C#, Java, PHP, Ruby, Perl, Go, Rust, Lua, Bash, SQL, Groovy…) → Wandbox (POST con CORS)
   El código del usuario se envía tal cual a Wandbox (equivalente a pegarlo en su web).
   En los motores locales se ejecuta en sandbox sin acceso a datos de la página. */

export type RunEngine = 'pyodide' | 'wandbox' | 'js' | 'iframe'

export interface RunResult {
  ok: boolean
  stdout: string
  stderr: string
  engine: RunEngine
  ms: number
  version?: string
}

/* ────────────────────────── Pyodide ────────────────────────── */

const PYODIDE_VERSION = '0.28.3'
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`

type PyodideApi = {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (s: string) => void }) => void
  setStderr: (opts: { batched: (s: string) => void }) => void
  version: string
}

let pyodidePromise: Promise<PyodideApi> | null = null
let pyodideOut = ''
let pyodideErr = ''

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('No se pudo cargar el runtime desde el CDN (¿sin conexión?)'))
    document.head.appendChild(s)
  })
}

export async function loadPyodideRuntime(onProgress?: (msg: string) => void): Promise<PyodideApi> {
  if (pyodidePromise) return pyodidePromise
  pyodidePromise = (async () => {
    onProgress?.('descargando runtime de Python (~10 MB, solo la primera vez)…')
    if (!(window as unknown as Record<string, unknown>).loadPyodide) await loadScript(PYODIDE_URL)
    onProgress?.('arrancando intérprete…')
    const factory = (window as unknown as { loadPyodide: (opts: { indexURL: string }) => Promise<PyodideApi> }).loadPyodide
    const py = await factory({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` })
    py.setStdout({ batched: (s: string) => { pyodideOut += s + '\n' } })
    py.setStderr({ batched: (s: string) => { pyodideErr += s + '\n' } })
    return py
  })()
  return pyodidePromise
}

export async function runPython(code: string, onProgress?: (msg: string) => void): Promise<RunResult> {
  const t0 = performance.now()
  try {
    const py = await loadPyodideRuntime(onProgress)
    pyodideOut = ''
    pyodideErr = ''
    await py.runPythonAsync(code)
    return { ok: true, stdout: pyodideOut, stderr: pyodideErr, engine: 'pyodide', ms: Math.round(performance.now() - t0), version: `Pyodide ${py.version}` }
  } catch (e) {
    return { ok: false, stdout: pyodideOut, stderr: String((e as Error).message ?? e), engine: 'pyodide', ms: Math.round(performance.now() - t0) }
  }
}

/* ────────────────────────── Wandbox ────────────────────────── */

export interface WandboxTarget {
  compiler: string
  runtime?: string // alias del runtime visible (python, c#, java…)
  save?: boolean
  compilerOptionRaw?: string[]
  /** Envolver el código del usuario (scala usa @main, java necesita convención) */
  wrap?: (code: string) => string
}

/** `class main` en minúscula: Wandbox nombra el fichero prog.java y javac
    solo avisa (warning) cuando la clase pública coincide con ese nombre. */
export const JAVA_FIX = (code: string) => code.replace(/public\s+class\s+main\b/g, 'class main')

export const WANDBOX_TARGETS: Record<string, WandboxTarget> = {
  python: { compiler: 'cpython-3.13.8', runtime: 'python' },
  cpp: { compiler: 'gcc-13.2.0', runtime: 'c++' },
  c: { compiler: 'gcc-13.2.0', runtime: 'c' },
  csharp: { compiler: 'mono-6.12.0.199', runtime: 'c#' },
  java: { compiler: 'openjdk-jdk-21+35', runtime: 'java', wrap: JAVA_FIX },
  php: { compiler: 'php-8.3.12', runtime: 'php' },
  ruby: { compiler: 'ruby-3.4.9', runtime: 'ruby' },
  perl: { compiler: 'perl-5.44.0', runtime: 'perl' },
  go: { compiler: 'go-1.23.2', runtime: 'go' },
  rust: { compiler: 'rust-1.82.0', runtime: 'rust' },
  lua: { compiler: 'lua-5.4.7', runtime: 'lua' },
  bash: { compiler: 'bash', runtime: 'bash' },
  sql: { compiler: 'sqlite-3.46.1', runtime: 'sql' },
  typescript: { compiler: 'typescript-5.6.2', runtime: 'typescript' },
  groovy: { compiler: 'groovy-4.0.23', runtime: 'groovy' },
  scala: { compiler: 'scala-3.5.1', runtime: 'scala' },
}

export async function runWandbox(lang: string, code: string): Promise<RunResult> {
  const target = WANDBOX_TARGETS[lang]
  if (!target) return { ok: false, stdout: '', stderr: `lenguaje sin runtime: ${lang}`, engine: 'wandbox', ms: 0 }
  const t0 = performance.now()
  const body: Record<string, unknown> = { compiler: target.compiler, code: target.wrap ? target.wrap(code) : code, save: false }
  if (target.compilerOptionRaw?.length) body['compiler-option-raw'] = target.compilerOptionRaw.join('\n')
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 60000)
    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, stdout: '', stderr: `Wandbox respondió HTTP ${res.status} (¿rate limit? prueba en unos minutos)`, engine: 'wandbox', ms: Math.round(performance.now() - t0) }
    const data = (await res.json()) as {
      status: string
      program_message: string
      compiler_error: string
      program_error: string
      compiler_output: string
    }
    const status = parseInt(data.status ?? '0')
    const stderr = [data.compiler_error, data.program_error].filter(Boolean).join('\n')
    const ok = status === 0
    return {
      ok,
      stdout: (data.program_message ?? '').slice(0, 20000),
      stderr: ok ? '' : (stderr || `proceso terminado con status ${status}`).slice(0, 20000),
      engine: 'wandbox',
      ms: Math.round(performance.now() - t0),
    }
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'timeout: la ejecución tardó más de 60s' : `sin conexión con Wandbox: ${(e as Error).message}`
    return { ok: false, stdout: '', stderr: msg, engine: 'wandbox', ms: Math.round(performance.now() - t0) }
  }
}

/* ────────────────────────── JS local ────────────────────────── */

/** JavaScript de verdad en tu navegador: console.log y errores capturados. */
export function runJs(code: string): Promise<RunResult> {
  const t0 = performance.now()
  return new Promise((resolve) => {
    const logs: string[] = []
    const fmt = (v: unknown, depth = 0): string => {
      if (typeof v === 'string') return depth === 0 ? v : JSON.stringify(v)
      if (v === null) return 'null'
      if (v === undefined) return 'undefined'
      if (typeof v === 'number' || typeof v === 'boolean') return String(v)
      if (typeof v === 'function') return '[function]'
      if (Array.isArray(v)) return '[' + v.map((x) => fmt(x, depth + 1)).join(', ') + ']'
      if (v instanceof Error) return `${v.name}: ${v.message}`
      try { return '{' + Object.entries(v as object).map(([k, x]) => `${k}: ${fmt(x, depth + 1)}`).join(', ') + '}' } catch { return String(v) }
    }
    const fakeConsole = {
      log: (...args: unknown[]) => logs.push(args.map((a) => fmt(a)).join(' ')),
      error: (...args: unknown[]) => logs.push('[error] ' + args.map((a) => fmt(a)).join(' ')),
      warn: (...args: unknown[]) => logs.push('[warn] ' + args.map((a) => fmt(a)).join(' ')),
      info: (...args: unknown[]) => logs.push(args.map((a) => fmt(a)).join(' ')),
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const fn = new Function('console', 'AbortSignal', `"use strict"; return (async () => { ${code} \n})()`)
      fn(fakeConsole, AbortSignal)
        .then((r: unknown) => {
          clearTimeout(timer)
          if (r !== undefined) logs.push('⟵ ' + fmt(r))
          resolve({ ok: true, stdout: logs.join('\n'), stderr: '', engine: 'js', ms: Math.round(performance.now() - t0) })
        })
        .catch((e: unknown) => {
          clearTimeout(timer)
          resolve({ ok: false, stdout: logs.join('\n'), stderr: e instanceof Error ? `${e.name}: ${e.message}` : String(e), engine: 'js', ms: Math.round(performance.now() - t0) })
        })
    } catch (e) {
      clearTimeout(timer)
      resolve({ ok: false, stdout: logs.join('\n'), stderr: e instanceof Error ? `${e.name}: ${e.message}` : String(e), engine: 'js', ms: 0 })
    }
  })
}

/** Ejecuta JS en el contexto del iframe que el usuario ve (para HTML/CSS/JS web). */
export function runInIframe(iframe: HTMLIFrameElement, code: string): void {
  const doc = iframe.contentDocument
  if (!doc) return
  doc.open()
  doc.write(code)
  doc.close()
}

/* ────────────────────────── genérico ────────────────────────── */

export async function runCode(lang: string, code: string, onProgress?: (msg: string) => void): Promise<RunResult> {
  if (lang === 'python') return runPython(code, onProgress)
  if (lang === 'javascript') return runJs(code)
  if (WANDBOX_TARGETS[lang]) return runWandbox(lang, code)
  return { ok: false, stdout: '', stderr: `sin motor de ejecución para "${lang}"`, engine: 'wandbox', ms: 0 }
}

export const RUNTIME_LABEL: Record<RunEngine, string> = {
  pyodide: 'Python local (WASM)',
  wandbox: 'Wandbox',
  js: 'navegador local',
  iframe: 'iframe sandbox',
}
