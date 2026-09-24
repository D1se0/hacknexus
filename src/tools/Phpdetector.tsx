import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FileCode, ShieldAlert, ShieldCheck, Search } from 'lucide-react'
import { ToolHeader, Badge, Field, TextArea, Button, Reveal, useToast } from '../components/ui'
import { cn, fmtNum } from '../lib/util'

interface PhpFunc {
  name: string
  risk: 'crítico' | 'alto' | 'medio' | 'bajo'
  cat: string
  desc: string
}

const FUNCS: PhpFunc[] = [
  { name: 'exec', risk: 'crítico', cat: 'RCE', desc: 'Ejecuta comandos del sistema directamente.' },
  { name: 'shell_exec', risk: 'crítico', cat: 'RCE', desc: 'Ejecuta comandos y devuelve toda la salida como string.' },
  { name: 'system', risk: 'crítico', cat: 'RCE', desc: 'Igual que shell_exec pero imprime la salida.' },
  { name: 'passthru', risk: 'crítico', cat: 'RCE', desc: 'Igual que exec pero vuelca salida binaria directa.' },
  { name: 'popen', risk: 'crítico', cat: 'RCE', desc: 'Abre un proceso con comando del SO como puntero.' },
  { name: 'proc_open', risk: 'crítico', cat: 'RCE', desc: 'Control total sobre pipes de un proceso nuevo.' },
  { name: 'pcntl_exec', risk: 'crítico', cat: 'RCE', desc: 'Reemplaza el proceso actual por otro binario.' },
  { name: 'eval', risk: 'crítico', cat: 'Code injection', desc: 'Ejecuta código PHP arbitrario como string.' },
  { name: 'assert', risk: 'alto', cat: 'Code injection', desc: 'Eval de strings en PHP < 7.2.' },
  { name: 'preg_replace', risk: 'alto', cat: 'Code injection', desc: 'Con modificador /e ejecutaba código (histórico, PHP < 7).' },
  { name: 'create_function', risk: 'crítico', cat: 'Code injection', desc: 'Alias de eval() en PHP < 7.2.' },
  { name: 'extract', risk: 'alto', cat: 'Variable overwrite', desc: 'Importa array al scope: overwrite de variables.' },
  { name: 'parse_str', risk: 'alto', cat: 'Variable overwrite', desc: 'Sin segundo argumento sobreescribe variables globales.' },
  { name: 'import_request_variables', risk: 'crítico', cat: 'Variable overwrite', desc: 'Eliminado en PHP 5.4: registraba inputs como globals.' },
  { name: 'mail', risk: 'medio', cat: 'Spam/injection', desc: 'Inyección de cabeceras con inputs sin validar.' },
  { name: 'putenv', risk: 'medio', cat: 'Info', desc: 'Define variables de entorno (LD_PRELOAD tricks).' },
  { name: 'phpinfo', risk: 'medio', cat: 'Info', desc: 'Fuga masiva de configuración, rutas y extensiones.' },
  { name: 'getenv', risk: 'bajo', cat: 'Info', desc: 'Lee variables de entorno.' },
  { name: 'dl', risk: 'crítico', cat: 'RCE', desc: 'Carga extensiones PHP dinámicamente (casi siempre deshabilitado).' },
  { name: 'show_source', risk: 'alto', cat: 'LFI', desc: 'Muestra el código fuente de un fichero (alias de highlight_file).' },
  { name: 'highlight_file', risk: 'alto', cat: 'LFI', desc: 'Igual que show_source.' },
  { name: 'symlink', risk: 'alto', cat: 'Filesystem', desc: 'Crea enlaces simbólicos (bypass de open_basedir histórico).' },
  { name: 'chown', risk: 'medio', cat: 'Filesystem', desc: 'Cambia propietario de ficheros.' },
  { name: 'chmod', risk: 'medio', cat: 'Filesystem', desc: 'Cambia permisos — usado para backdoors persistentes.' },
  { name: 'curl_multi_exec', risk: 'alto', cat: 'SSRF', desc: 'Peticiones paralelas — scan interno de red.' },
  { name: 'mysqli_connect', risk: 'bajo', cat: 'DB', desc: 'Neutral, pero revisa credenciales hardcodeadas.' },
  { name: 'mysql_connect', risk: 'bajo', cat: 'DB legacy', desc: 'Deprecated; credenciales en claro.' },
  { name: 'passthru_args', risk: 'bajo', cat: 'Info', desc: 'Función inexistente (ruido de análisis).' },
]

const DANGEROUS = FUNCS.filter((f) => f.risk === 'crítico' || f.risk === 'alto').map((f) => f.name)

export default function Phpdetector() {
  const [code, setCode] = useState(`<?php\n$cmd = $_GET['c'];\nsystem($cmd);\n$f = $_GET['f'];\ninclude($f);\n$d = unserialize($_COOKIE['data']);\necho file_get_contents($f);\n?>`)
  const [query, setQuery] = useState('')
  const toast = useToast()

  const detected = useMemo(() => {
    const found = new Map<string, { count: number; inCode: boolean }>()
    for (const f of FUNCS) {
      const re = new RegExp(`\\b${f.name}\\s*\\(`, 'g')
      const matches = code.match(re)
      if (matches) found.set(f.name, { count: matches.length, inCode: true })
    }
    return found
  }, [code])

  const inCode = FUNCS.filter((f) => detected.has(f.name))
  const riskyCount = inCode.filter((f) => f.risk === 'crítico' || f.risk === 'alto').length

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return FUNCS.filter((f) => !q || f.name.includes(q) || f.cat.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
  }, [query])

  const riskTone = (r: string): 'bad' | 'warn' | 'info' | 'neutral' => (r === 'crítico' ? 'bad' : r === 'alto' ? 'warn' : r === 'medio' ? 'info' : 'neutral')

  return (
    <div>
      <ToolHeader icon={FileCode} title="PHP Security Scanner" desc="Analiza código PHP pegado, detecta funciones peligrosas y clasifica el riesgo — portado de PHPDetector-page" badge="ported" />

      <div className="grid gap-6">
        <Reveal>
          <div className="card p-6">
            <Field label="Pega código PHP o la lista de disable_functions" hint="detecta funciones peligrosas por llamado real ()">
              <TextArea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="min-h-40" />
            </Field>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge tone={riskyCount ? 'bad' : 'ok'}>
                {riskyCount ? `${riskyCount} función(es) de riesgo alto/crítico` : 'sin funciones críticas detectadas'}
              </Badge>
              <Badge tone="neutral">{inCode.length} funciones reconocidas</Badge>
              <Button
                variant="ghost"
                onClick={() => {
                  setCode(inCode.filter((f) => f.risk !== 'bajo').map((f) => f.name).join(', '))
                  toast('Generada línea disable_functions sugerida', 'info')
                }}
              >
                generar disable_functions
              </Button>
            </div>
          </div>
        </Reveal>

        {inCode.length > 0 && (
          <Reveal>
            <div className="card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-mono text-sm font-bold text-white">
                <ShieldAlert size={15} className={riskyCount ? 'text-bad' : 'text-ok'} />
                Funciones detectadas en el código
              </h3>
              <div className="grid gap-2">
                {inCode.map((f, i) => (
                  <motion.div
                    key={f.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2',
                      f.risk === 'crítico' ? 'border-bad/40 bg-bad/5' : f.risk === 'alto' ? 'border-warn/40 bg-warn/5' : 'border-edge',
                    )}
                  >
                    <code className="font-mono text-xs font-bold text-white">{f.name}</code>
                    <Badge tone={riskTone(f.risk)}>{f.risk}</Badge>
                    <Badge tone="neutral">{f.cat}</Badge>
                    <span className="text-[11px] text-grey">{f.desc}</span>
                    <span className="ml-auto font-mono text-[10px] text-grey">×{detected.get(f.name)?.count}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        <Reveal>
          <div className="card p-6">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="font-mono text-sm font-bold text-white">Referencia completa ({FUNCS.length} funciones)</h3>
              <div className="relative ml-auto">
                <SearchIcon />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="buscar…"
                  className="w-40 rounded-lg border border-edge bg-black/40 py-1.5 pl-8 pr-3 font-mono text-xs text-ink outline-none focus:border-acento/60"
                />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto rounded-lg border border-edge/50">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-panel">
                  <tr className="border-b border-edge font-mono text-[10px] uppercase tracking-wider text-grey">
                    <th className="px-3 py-2">función</th>
                    <th className="px-3 py-2">riesgo</th>
                    <th className="hidden px-3 py-2 md:table-cell">categoría</th>
                    <th className="hidden px-3 py-2 lg:table-cell">descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.name} className="border-b border-edge/40 hover:bg-acento/5">
                      <td className="px-3 py-1.5">
                        <code className="font-mono text-white">{f.name}</code>
                        {detected.has(f.name) && <span className="ml-2 font-mono text-[9px] text-acento">● en código</span>}
                      </td>
                      <td className="px-3 py-1.5"><Badge tone={riskTone(f.risk)}>{f.risk}</Badge></td>
                      <td className="hidden px-3 py-1.5 font-mono text-grey md:table-cell">{f.cat}</td>
                      <td className="hidden px-3 py-1.5 text-grey lg:table-cell">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-mono text-[10px] text-grey">{fmtNum(filtered.length)} funciones listadas · {DANGEROUS.length} consideradas peligrosas</p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

function SearchIcon() {
  return <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-grey" />
}