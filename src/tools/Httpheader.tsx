import { useMemo, useState } from 'react'
import { Braces } from 'lucide-react'
import { ToolHeader, Field, TextInput, TextArea, Button, Reveal, CopyBlock, Toggle } from '../components/ui'

interface Cookie { name: string; value: string }

const AUTH_TEMPLATES: { label: string; header: string }[] = [
  { label: '— plantilla —', header: '' },
  { label: 'Bearer JWT', header: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.firma' },
  { label: 'Basic base64', header: 'Authorization: Basic YWRtaW46YWRtaW4=' },
  { label: 'API key header', header: 'X-API-Key: 0123456789abcdef' },
  { label: 'CSRF + sesión', header: 'X-CSRF-Token: {token}' },
]

export default function Httpheader() {
  const [method, setMethod] = useState('POST')
  const [path, setPath] = useState('/api/v1/login')
  const [host, setHost] = useState('objetivo.local')
  const [https, setHttps] = useState(false)
  const [ua, setUa] = useState('Mozilla/5.0 (X11; Linux x86_64) HackNexus/1.0')
  const [cookies, setCookies] = useState<Cookie[]>([{ name: 'session', value: 'abc123' }])
  const [contentType, setContentType] = useState('application/json')
  const [body, setBody] = useState('{\n  "user": "admin",\n  "pass": "toor"\n}')
  const [extra, setExtra] = useState('X-Forwarded-For: 127.0.0.1')
  const [withBody, setWithBody] = useState(true)
  const [http11, setHttp11] = useState(true)

  const needsBody = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'

  const raw = useMemo(() => {
    const lines: string[] = []
    lines.push(`${method} ${path} HTTP/${http11 ? '1.1' : '1.0'}`)
    lines.push(`Host: ${host}`)
    if (ua) lines.push(`User-Agent: ${ua}`)
    lines.push('Accept: */*')
    lines.push('Connection: close')
    if (cookies.length) lines.push(`Cookie: ${cookies.filter((c) => c.name).map((c) => `${c.name}=${c.value}`).join('; ')}`)
    if (extra.trim()) for (const l of extra.split('\n')) if (l.trim()) lines.push(l.trim())
    if (withBody && needsBody && body) {
      lines.push(`Content-Type: ${contentType}`)
      lines.push(`Content-Length: ${new TextEncoder().encode(body).length}`)
    }
    const head = lines.join('\r\n')
    return withBody && needsBody && body ? `${head}\r\n\r\n${body}` : `${head}\r\n\r\n`
  }, [method, path, host, ua, cookies, extra, withBody, needsBody, body, contentType, http11])

  const asCurl = useMemo(() => {
    const parts = ['curl -v']
    parts.push(`-X ${method}`)
    if (ua) parts.push(`-H "User-Agent: ${ua}"`)
    const ck = cookies.filter((c) => c.name).map((c) => `${c.name}=${c.value}`).join('; ')
    if (ck) parts.push(`-H "Cookie: ${ck}"`)
    for (const l of extra.split('\n')) if (l.trim()) parts.push(`-H "${l.trim()}"`)
    if (withBody && needsBody && body) {
      parts.push(`-H "Content-Type: ${contentType}"`)
      parts.push(`--data-raw '${body.replace(/'/g, `'\\''`)}'`)
    }
    parts.push(`"${https ? 'https' : 'http'}://${host}${path}"`)
    return parts.join(' \\\n  ')
  }, [method, host, path, ua, cookies, extra, withBody, needsBody, body, contentType, https])

  const fullUrl = `${https ? 'https' : 'http'}://${host}${path}`

  return (
    <div>
      <ToolHeader icon={Braces} title="HTTP Request Builder" desc="Construye peticiones HTTP crudas estilo netcat/burp con auth, cookies y body, y expórtalas a curl" />

      <Reveal>
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-[130px_1fr_1fr]">
            <Field label="método">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60">
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="ruta">
              <TextInput value={path} onChange={(e) => setPath(e.target.value)} className="font-mono" />
            </Field>
            <Field label="host">
              <TextInput value={host} onChange={(e) => setHost(e.target.value)} className="font-mono" />
            </Field>
          </div>

          <Field label="user-agent">
            <TextInput value={ua} onChange={(e) => setUa(e.target.value)} className="font-mono" />
          </Field>

          <div>
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-grey">cookies</span>
            <div className="space-y-2">
              {cookies.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <TextInput value={c.name} placeholder="nombre" onChange={(e) => setCookies((cs) => cs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="w-48" />
                  <TextInput value={c.value} placeholder="valor" onChange={(e) => setCookies((cs) => cs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="flex-1" />
                  <button onClick={() => setCookies((cs) => cs.filter((_, j) => j !== i))} className="rounded-lg border border-edge px-3 text-grey transition-colors hover:border-bad/50 hover:text-bad">✕</button>
                </div>
              ))}
            </div>
            <Button className="mt-2" variant="ghost" onClick={() => setCookies((cs) => [...cs, { name: '', value: '' }])}>+ cookie</Button>
          </div>

          <Field label="cabeceras extra (una por línea)" hint="Authorization, X-Forwarded-For…">
            <TextArea value={extra} onChange={(e) => setExtra(e.target.value)} className="min-h-20 font-mono" />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {AUTH_TEMPLATES.filter((t) => t.header).map((t) => (
              <button key={t.label} onClick={() => setExtra((x) => (x ? x.trimEnd() + '\n' + t.header : t.header))} className="rounded-md border border-edge px-2 py-1 font-mono text-[10px] text-grey transition-all hover:border-acento/50 hover:text-acento">
                + {t.label}
              </button>
            ))}
          </div>

          {needsBody && (
            <>
              <Field label="content-type">
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60 sm:max-w-xs">
                  {['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=—BOUNDARY', 'text/xml', 'text/plain'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="body" hint={`content-length calculado automáticamente`}>
                <TextArea value={body} onChange={(e) => setBody(e.target.value)} className="font-mono" />
              </Field>
            </>
          )}

          <div className="flex flex-wrap gap-5 border-t border-edge/60 pt-4">
            <Toggle checked={withBody} onChange={setWithBody} label="incluir body" />
            <Toggle checked={http11} onChange={setHttp11} label="HTTP/1.1" />
            <Toggle checked={https} onChange={setHttps} label="https://" />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6">
          <CopyBlock text={raw} label={`raw request → ${fullUrl}`} />
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-4">
          <CopyBlock text={asCurl} label="equivalente curl" />
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 Envíalo a mano con: <span className="text-acento">nc objetivo.local 80</span> (pega el raw y pulsa Enter×2),
          o con <span className="text-acento">openssl s_client -connect host:443</span> para TLS.
        </div>
      </Reveal>
    </div>
  )
}
