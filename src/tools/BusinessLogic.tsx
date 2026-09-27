import { useState } from 'react'
import { Scale, Info, ShieldQuestion } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner } from '../components/ui'
import { LOGIC_PATTERNS } from '../lib/web'

const SEV_TONE = { crítica: 'bad', alta: 'warn', media: 'info' } as const

const HUNTING_CHECKLISTS: { domain: string; items: string[] }[] = [
  {
    domain: 'e-commerce',
    items: [
      'Cantidad negativa, 0, decimal o número gigante en el PUT del carrito',
      'Cambiar el PRECIO del producto en la petición (no solo el id): el server debe recalcularlo, nunca aceptarlo',
      'Cupón aplicado 2 veces / cupón + precio alterado / cupón en moneda distinta',
      'Coste de envío a 0, dirección de facturación ≠ envío, país sin impuesto',
      'Cancelar pedido ya enviado → ¿reembolsa sin devolución?',
    ],
  },
  {
    domain: 'flujos con estado',
    items: [
      'Saltar pasos: llamar al endpoint final con el state del primero',
      'Repetir el paso de confirmación: ¿duplica la acción (doble cargo, doble alta)?',
      'Back del navegador tras pagar: ¿reabre el flujo con el pago ya hecho?',
      'Modificar el campo hidden/status del formulario: si el server lo lee, es su problema',
    ],
  },
  {
    domain: 'usuarios y permisos',
    items: [
      'Registro con campos extra (role, quota, verified): añade "role":"admin" al body',
      'Cambiar email de OTRO usuario en el flujo de recovery',
      'Invitaciones: reusar el token, cambiar el company_id, auto-aceptarte',
      'Límites del plan: alcanza el límite y busca el endpoint que no lo comprueba (API vieja, export, webhook)',
    ],
  },
]

export default function BusinessLogic() {
  const [sel, setSel] = useState(LOGIC_PATTERNS[0].id)
  const pattern = LOGIC_PATTERNS.find((p) => p.id === sel) ?? LOGIC_PATTERNS[0]

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Scale}
        title="Business Logic Hunter"
        desc="Patrones de vulnerabilidades de lógica de negocio con su prueba exacta: precios negativos, race conditions, saltos de flujo, reembolsos repetidos — y checklist de hunting por dominio"
        badge="web"
      />

      <InfoBanner>
        Las lógicas no tienen payload mágico: se explotan ENTENDIENDO qué valora el negocio. Son de las más pagadas en bug bounty (impacto directo en dinero) y las que ningún scanner encuentra — solo tú, leyendo el flujo como un usuario malintencionado.
      </InfoBanner>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[340px_1fr]">
        <Reveal>
          <div className="card p-3">
            <div className="max-h-[520px] space-y-1 overflow-y-auto">
              {LOGIC_PATTERNS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSel(p.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${sel === p.id ? 'border-acento/50 bg-acento/10' : 'border-edge bg-black/20 hover:border-edge'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-bold text-ink">{p.name}</span>
                    <Badge tone={SEV_TONE[p.severity]}>{p.severity}</Badge>
                  </div>
                  <p className="truncate text-[11px] text-grey">{p.scenario}</p>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.03}>
          <div className="card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-sm font-bold text-white">{pattern.name}</h3>
              <Badge tone={SEV_TONE[pattern.severity]}>{pattern.severity}</Badge>
            </div>
            <div className="space-y-2.5">
              <div className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-grey">escenario</p>
                <p className="mt-0.5 text-[12.5px] text-ink">{pattern.scenario}</p>
              </div>
              <div className="rounded-lg border border-bad/30 bg-bad/5 px-3.5 py-2.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-bad">el ataque</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink/90">{pattern.attack}</p>
              </div>
              <div className="rounded-lg border border-info/30 bg-info/5 px-3.5 py-2.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-info">la prueba</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink/90">{pattern.test}</p>
              </div>
            </div>
            <p className="mt-3 rounded-lg border border-acento/30 bg-acento/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink/90">
              <b className="text-acento">criterio de reporte:</b> documenta el IMPACTO en dinero/datos (capturas del flujo completo), no el payload. "Puedo pedir -2 unidades y el total da -50€" vale más que cualquier PoC técnico.
            </p>
          </div>
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {HUNTING_CHECKLISTS.map((c, i) => (
          <Reveal key={c.domain} delay={0.04 + i * 0.03}>
            <div className="card h-full p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><ShieldQuestion size={15} className="text-acento" /> checklist: {c.domain}</h3>
              <div className="space-y-1.5">
                {c.items.map((item, j) => (
                  <p key={j} className="flex gap-2 text-[12px] leading-relaxed text-grey">
                    <span className="shrink-0 font-mono text-acento">[{j + 1}]</span> {item}
                  </p>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="card mt-4 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> la regla de oro</h3>
          <p className="text-[12.5px] leading-relaxed text-grey">
            Pregúntate siempre: <b className="text-ink">"¿qué pasaría si el servidor confiara en MÍ para este valor?"</b> — y prueba ese valor. El precio, la cantidad, el estado, el orden de los pasos, la repetición de la acción: si el server confía en el cliente para cualquiera de ellos, la lógica es vulnerable por definición.
          </p>
        </div>
      </Reveal>
    </div>
  )
}
