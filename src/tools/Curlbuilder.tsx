import { useMemo, useState } from 'react'
import { Server, Trash2 } from 'lucide-react'
import { ToolHeader, Field, TextInput, TextArea, Button, Reveal, CopyBlock, Toggle } from '../components/ui'

interface Header { name: string; value: string }

export default function Curlbuilder() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://api.ejemplo.com/v1/users')
  const [headers, setHeaders] = useState<Header[]>([
    { name: 'User-Agent', value: 'HackNexus/1.0' },
    { name: 'Accept', value: 'application/json' },
  ])
  const [body, setBody] = useState('')
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic'>('none')
  const [authToken, setAuthToken] = useState('')
  const [authUser, setAuthUser] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [insecure, setInsecure] = useState(false)
  const [follow, setFollow] = useState(true)
  const [silent, setSilent] = useState(false)
  const [proxy, setProxy] = useState('')

  const needsBody = method !== 'GET' && method !== 'HEAD'

  const cmd = useMemo(() => {
    const parts = ['curl']
    if (silent) parts.push('-s')
    if (follow) parts.push('-L')
    if (insecure) parts.push('-k')
    if (proxy) parts.push(`--proxy "${proxy}"`)
    parts.push(`-X ${method}`)
    for (const h of headers) {
      if (h.name.trim()) parts.push(`-H "${h.name}: ${h.value}"`)
    }
    if (authType === 'bearer' && authToken) parts.push(`-H "Authorization: Bearer ${authToken}"`)
    if (authType === 'basic') parts.push(`-u "${authUser}:${authPass}"`)
    if (needsBody && body) {
      const isJson = headers.some((h) => h.name.toLowerCase() === 'content-type' && h.value.includes('json'))
      parts.push(isJson ? `--data-raw '${body.replace(/'/g, `'\\''`)}'` : `--data '${body.replace(/'/g, `'\\''`)}'`)
    }
    parts.push(`"${url}"`)
    return parts.join(' \\\n  ')
  }, [method, url, headers, body, authType, authToken, authUser, authPass, insecure, follow, silent, proxy, needsBody])

  const pythonRepr = useMemo(() => {
    const h: Record<string, string> = {}
    for (const x of headers) if (x.name.trim()) h[x.name] = x.value
    if (authType === 'bearer' && authToken) h['Authorization'] = `Bearer ${authToken}`
    return `import requests\n\nr = requests.request(\n    "${method}",\n    "${url}",\n    headers=${JSON.stringify(h, null, 4).replace(/\n/g, '\n    ')},${needsBody && body ? `\n    data='${body}',` : ''}${authType === 'basic' ? `\n    auth=("${authUser}", "${authPass}"),` : ''}${insecure ? `\n    verify=False,` : ''}${proxy ? `\n    proxies={"http": "${proxy}", "https": "${proxy}"},` : ''}\n)\nprint(r.status_code, r.text[:500])`
  }, [method, url, headers, body, authType, authToken, authUser, authPass, insecure, proxy, needsBody])

  return (
    <div>
      <ToolHeader icon={Server} title="Curl Builder" desc="Construye comandos curl con headers, auth, body, proxy y salida equivalente en Python requests" />

      <Reveal>
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Field label="método">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60">
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="URL">
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
            </Field>
          </div>

          <div>
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-grey">cabeceras</span>
            <div className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <TextInput value={h.name} placeholder="Header" onChange={(e) => setHeaders((hs) => hs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="w-56" />
                  <TextInput value={h.value} placeholder="valor" onChange={(e) => setHeaders((hs) => hs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="flex-1" />
                  <button onClick={() => setHeaders((hs) => hs.filter((_, j) => j !== i))} className="rounded-lg border border-edge px-3 text-grey transition-colors hover:border-bad/50 hover:text-bad"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <Button className="mt-2" variant="ghost" onClick={() => setHeaders((hs) => [...hs, { name: '', value: '' }])}>+ header</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="autenticación">
              <select value={authType} onChange={(e) => setAuthType(e.target.value as typeof authType)} className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60">
                <option value="none">sin auth</option>
                <option value="bearer">Bearer token</option>
                <option value="basic">Basic (user:pass)</option>
              </select>
            </Field>
            <Field label="proxy" hint="http://127.0.0.1:8080 (burp)">
              <TextInput value={proxy} onChange={(e) => setProxy(e.target.value)} className="font-mono" placeholder="opcional" />
            </Field>
          </div>

          {authType === 'bearer' && (
            <Field label="token bearer"><TextInput value={authToken} onChange={(e) => setAuthToken(e.target.value)} className="font-mono" /></Field>
          )}
          {authType === 'basic' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="usuario"><TextInput value={authUser} onChange={(e) => setAuthUser(e.target.value)} className="font-mono" /></Field>
              <Field label="contraseña"><TextInput value={authPass} onChange={(e) => setAuthPass(e.target.value)} className="font-mono" /></Field>
            </div>
          )}

          {needsBody && (
            <Field label="body" hint="se envía con --data">
              <TextArea value={body} onChange={(e) => setBody(e.target.value)} className="font-mono" placeholder='{"user":"admin","pass":"toor"}' />
            </Field>
          )}

          <div className="flex flex-wrap gap-5 border-t border-edge/60 pt-4">
            <Toggle checked={follow} onChange={setFollow} label="seguir redirects (-L)" />
            <Toggle checked={insecure} onChange={setInsecure} label="ignorar TLS (-k)" />
            <Toggle checked={silent} onChange={setSilent} label="silencioso (-s)" />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6">
          <CopyBlock text={cmd} label="comando curl" />
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-4">
          <CopyBlock text={pythonRepr} label="equivalente python requests" />
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 Trucos: añade <span className="text-acento">-i</span> para ver cabeceras de respuesta, <span className="text-acento">-o file</span> para
          guardar el body, <span className="text-acento">-w '%&#123;http_code&#125; %&#123;time_total&#125;'</span> para status y timing.
        </div>
      </Reveal>
    </div>
  )
}
