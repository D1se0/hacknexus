import { useMemo, useState } from 'react'
import { Braces, FlaskConical, Repeat, Variable, Trash2, Plus } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Button, Field, TextArea, TextInput, Toggle, CopyBlock } from '../components/ui'
import { GQL_TEMPLATES, buildPostBody, parseGql, GQL_INJECTION_TESTS, type GqlTemplate } from '../lib/graphql'

const RISK_TONE = { alta: 'bad', media: 'warn', baja: 'ok' } as const
type Tab = 'templates' | 'builder' | 'json2gql' | 'tricks'

export default function GraphQL() {
  const [tab, setTab] = useState<Tab>('templates')

  /* builder */
  const [sel, setSel] = useState<GqlTemplate>(GQL_TEMPLATES[0])
  const [endpoint, setEndpoint] = useState('https://target.com/graphql')
  const [vars, setVars] = useState<Record<string, string>>({ id: '2', email: "' OR '1'='1" })
  const [minify, setMinify] = useState(true)
  const [customQuery, setCustomQuery] = useState('')
  const [opName, setOpName] = useState('')

  /* json → gql */
  const [jsonIn, setJsonIn] = useState('')

  const postBody = useMemo(
    () => buildPostBody(customQuery.trim() || sel.template, vars, opName, minify),
    [sel, vars, minify, customQuery, opName],
  )
  const parsed = useMemo(() => (jsonIn.trim() ? parseGql(jsonIn) : null), [jsonIn])

  const varKeys = Object.keys(vars)
  const curl = `curl -s ${endpoint || 'https://target.com/graphql'} -H 'Content-Type: application/json' -d '${postBody.replace(/'/g, "'\\''")}'`

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Braces}
        title="GraphQL Lab"
        desc="Constructor de operaciones GraphQL, traductor query ↔ JSON para POST, introspección, batching y ataques clásicos (IDOR, inyección, alias storm, DoS por profundidad)"
        badge="web"
      />

      <InfoBanner>
        Las consultas se GENERAN, no se envían: copia el body JSON al POST contra endpoints que tengas autorizados. Recuerda que en GraphQL la autorización vive en cada resolver: <b className="text-ink">el esquema no protege nada por sí solo</b>, y un endpoint /graphql olvidado junto a /api suele exponer lo mismo.
      </InfoBanner>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {([['templates', 'plantillas de ataque', FlaskConical], ['builder', 'query → POST', Variable], ['json2gql', 'JSON → query', Repeat], ['tricks', 'trucos y validación', Braces]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[12px] transition-all ${
              tab === id ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_1fr]">
          <Reveal>
            <div className="card space-y-1.5 p-3">
              {GQL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSel(t); setVars(t.variables ? { ...t.variables } : {}) }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                    sel.id === t.id ? 'border-acento/50 bg-acento/10' : 'border-edge bg-black/20 hover:border-edge hover:bg-panel'
                  }`}
                >
                  <p className="text-[12.5px] font-bold text-ink">{t.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge tone={RISK_TONE[t.risk]}>{t.risk}</Badge>
                    <span className="font-mono text-[10px] text-grey">{t.op}</span>
                  </div>
                </button>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-2 font-mono text-sm font-bold text-white">{sel.name}</h3>
              <p className="mb-4 text-[12.5px] leading-relaxed text-grey">{sel.why}</p>
              <CopyBlock text={sel.template} label={`${sel.id}.graphql`} maxH="max-h-72" />
            </div>
          </Reveal>
        </div>
      )}

      {tab === 'builder' && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="card space-y-3 p-5">
              <Field label="plantilla base">
                <select
                  value={sel.id}
                  onChange={(e) => {
                    const t = GQL_TEMPLATES.find((x) => x.id === e.target.value) ?? GQL_TEMPLATES[0]
                    setSel(t)
                    setVars(t.variables ? { ...t.variables } : {})
                    setCustomQuery('')
                  }}
                  className="w-full rounded-lg border border-edge bg-black/40 px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60"
                >
                  {GQL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="endpoint (para el curl)">
                <TextInput value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="font-mono text-[12px]" />
              </Field>
              <Field label="operationName" hint="opcional">
                <TextInput value={opName} onChange={(e) => setOpName(e.target.value)} className="font-mono text-[12px]" placeholder="IntrospectionQuery" />
              </Field>
              <Toggle checked={minify} onChange={setMinify} label="minificar query (1 línea)" />
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-grey">variables</span>
                  <Button variant="ghost" className="px-2 py-1 text-[11px]" onClick={() => setVars((v) => ({ ...v, [`var${Object.keys(v).length + 1}`]: 'valor' }))}>
                    <Plus size={12} /> añadir
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {varKeys.map((k) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <TextInput
                        value={k}
                        onChange={(e) => setVars((v) => Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk === k ? e.target.value : kk, vv])))}
                        className="w-28 px-2 py-1.5 text-[12px]"
                        placeholder="nombre"
                      />
                      <TextInput
                        value={vars[k]}
                        onChange={(e) => setVars((v) => ({ ...v, [k]: e.target.value }))}
                        className="min-w-0 flex-1 px-2 py-1.5 font-mono text-[12px]"
                        placeholder='valor ("true", 42, {"$ne": null}…)'
                      />
                      <button onClick={() => setVars((v) => Object.fromEntries(Object.entries(v).filter(([kk]) => kk !== k)))} className="shrink-0 rounded-md border border-edge p-1.5 text-grey hover:border-bad/50 hover:text-bad">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <Field label="query personalizada" hint="sobrescribe la plantilla">
                <TextArea value={customQuery} onChange={(e) => setCustomQuery(e.target.value)} placeholder="{ user(id: 1) { email } }" className="min-h-20 font-mono text-[12px]" />
              </Field>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="mb-3 font-mono text-sm font-bold text-white">body JSON para el POST</h3>
                <CopyBlock text={postBody} label="body.json" maxH="max-h-56" />
                <p className="mt-2 text-[11.5px] leading-relaxed text-grey">
                  Los valores se convierten a su tipo lógico: <code className="text-acento">true/42/null</code> como JSON nativo, y los objetos <code className="text-acento">{'{"$ne": null}'}</code> llegan parseados como objeto (no string) — así es como prueban las NoSQLi reales.
                </p>
              </div>
              <div className="card p-5">
                <h3 className="mb-3 font-mono text-sm font-bold text-white">equivalente curl</h3>
                <CopyBlock text={curl} label="curl" />
              </div>
            </div>
          </Reveal>
        </div>
      )}

      {tab === 'json2gql' && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="card p-5">
              <h3 className="mb-2 font-mono text-sm font-bold text-white">pega un body POST JSON o una query</h3>
              <TextArea value={jsonIn} onChange={(e) => setJsonIn(e.target.value)} placeholder='{"query":"query IntrospectionQuery { __schema { queryType { name } } }","variables":{"id":"1"}}' className="min-h-[220px] font-mono text-[12px]" />
              <p className="mt-2 text-[11.5px] leading-relaxed text-grey">
                Acepta tanto el JSON de POST como la query cruda (minificada o no). Útil para leer operaciones capturadas en Burp, logs o el historial del navegador.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="card p-5">
              {!parsed && <p className="font-mono text-[12px] text-grey">a la espera de input…</p>}
              {parsed && !parsed.ok && <p className="rounded-lg border border-bad/40 bg-bad/10 px-3.5 py-2.5 font-mono text-[12px] text-bad">{parsed.error}</p>}
              {parsed?.ok && (
                <>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Badge tone="accent">{parsed.opType}</Badge>
                    <Badge tone="neutral">{parsed.opName}</Badge>
                    {parsed.usesVariables && <Badge tone="info">usa $variables en el cuerpo</Badge>}
                  </div>
                  {parsed.varDefs.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-grey">variables declaradas:</p>
                      {parsed.varDefs.map((v) => (
                        <div key={v.name} className="flex items-baseline gap-2 font-mono text-[12px]">
                          <span className="text-acento">{v.name}</span>
                          <span className="text-ink">{v.type}</span>
                          {v.default && <span className="text-grey">= {v.default}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {parsed.fields.length > 0 && (
                    <div className="rounded-lg border border-edge bg-black/30 p-3">
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">árbol de campos:</p>
                      <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-ink">
                        {parsed.fields.map((f, i) => <div key={i}>{f}</div>)}
                      </pre>
                    </div>
                  )}
                  {parsed.rawVars && (
                    <div className="mt-3">
                      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-grey">variables del body:</p>
                      <CopyBlock text={parsed.rawVars} label="variables.json" maxH="max-h-40" />
                    </div>
                  )}
                </>
              )}
            </div>
          </Reveal>
        </div>
      )}

      {tab === 'tricks' && (
        <div className="space-y-4">
          <Reveal>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">sondas de inyección sobre el parser</h3>
              <div className="space-y-2">
                {GQL_INJECTION_TESTS.map((t) => (
                  <div key={t.name} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                    <p className="font-mono text-[12px] font-bold text-ink">{t.name} <code className="ml-2 text-acento">{t.input}</code></p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-grey">{t.what}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.04}>
            <div className="card p-5">
              <h3 className="mb-2 font-mono text-sm font-bold text-white">trucos que casi nadie prueba</h3>
              <ul className="space-y-2 text-[12.5px] leading-relaxed text-grey">
                <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">GET con query:</b> muchos endpoints aceptan <code>?query=&#123;__schema&#123;name&#125;&#125;</code> en GET: pasa por delante de WAFs que solo inspeccionan POST.</span></li>
                <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">Batching:</b> <code>[&#123;"query":"…1"&#125;,&#123;"query":"…2"&#125;]</code> en array: el rate limit cuenta 1 petición, tú ejecutas N operaciones.</span></li>
                <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">Sugerencias del error:</b> campo inventado → "Did you mean 'password'?" — enumeración del esquema sin introspección, incluso con __schema bloqueado.</span></li>
                <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">Mutaciones con alias:</b> igual que las queries: N registros distintos en una sola petición.</span></li>
                <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">Endpoints gemelos:</b> prueba /graphql, /api/graphql, /api/v2/graphql, /graphiql (IDE) y /graphql/playground: las versiones viejas rara vez heredan los filtros nuevos.</span></li>
                <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">Persisted queries:</b> si ves <code>persistedQueryHash</code>, el esquema no se puede introspeccionar — pero puedes reusar hashes legítimos con TUS variables.</span></li>
              </ul>
            </div>
          </Reveal>
        </div>
      )}
    </div>
  )
}
