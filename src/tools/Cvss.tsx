import { useState } from 'react'
import { Brain } from 'lucide-react'
import { motion } from 'framer-motion'
import { ToolHeader, Badge, TextInput, Button, Reveal, CopyBlock } from '../components/ui'
import { cvssVector, cvssScore, cvssSeverity, severityTone, parseVector, DEFAULT_BASE, type CvssBase } from '../lib/cvss'

const METRICS: {
  key: keyof CvssBase
  label: string
  full: string
  options: { v: string; label: string; hint: string }[]
}[] = [
  {
    key: 'av', label: 'AV', full: 'Attack Vector — ¿cómo se accede?',
    options: [
      { v: 'N', label: 'Network', hint: 'remoto por red' },
      { v: 'A', label: 'Adjacent', hint: 'misma red física/segmento' },
      { v: 'L', label: 'Local', hint: 'acceso local al sistema' },
      { v: 'P', label: 'Physical', hint: 'contacto físico' },
    ],
  },
  {
    key: 'ac', label: 'AC', full: 'Attack Complexity — ¿condiciones fuera del control del atacante?',
    options: [
      { v: 'L', label: 'Low', hint: 'sin condiciones' },
      { v: 'H', label: 'High', hint: 'requiere ganar la lotería/race' },
    ],
  },
  {
    key: 'pr', label: 'PR', full: 'Privileges Required — ¿qué necesita el atacante?',
    options: [
      { v: 'N', label: 'None', hint: 'nada' },
      { v: 'L', label: 'Low', hint: 'usuario básico' },
      { v: 'H', label: 'High', hint: 'admin/root' },
    ],
  },
  {
    key: 'ui', label: 'UI', full: 'User Interaction — ¿participa la víctima?',
    options: [
      { v: 'N', label: 'None', hint: 'nadie' },
      { v: 'R', label: 'Required', hint: 'la víctima hace clic' },
    ],
  },
  {
    key: 's', label: 'S', full: 'Scope — ¿impacta más allá del componente vulnerable?',
    options: [
      { v: 'U', label: 'Unchanged', hint: 'solo el componente' },
      { v: 'C', label: 'Changed', hint: 'afecta a otros (Ej. VM → host)' },
    ],
  },
  {
    key: 'c', label: 'C', full: 'Confidentiality — ¿fuga de información?',
    options: [
      { v: 'H', label: 'High', hint: 'todo o crítico' },
      { v: 'L', label: 'Low', hint: 'algo de información' },
      { v: 'N', label: 'None', hint: 'nada' },
    ],
  },
  {
    key: 'i', label: 'I', full: 'Integrity — ¿manipulación de datos?',
    options: [
      { v: 'H', label: 'High', hint: 'total' },
      { v: 'L', label: 'Low', hint: 'parcial' },
      { v: 'N', label: 'None', hint: 'nada' },
    ],
  },
  {
    key: 'a', label: 'A', full: 'Availability — ¿denegación de servicio?',
    options: [
      { v: 'H', label: 'High', hint: 'total' },
      { v: 'L', label: 'Low', hint: 'degradado' },
      { v: 'N', label: 'None', hint: 'nada' },
    ],
  },
]

const EXAMPLES: { label: string; vector: string }[] = [
  { label: 'Log4Shell', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H' },
  { label: 'XSS reflejado', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N' },
  { label: 'LFI local', vector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N' },
  { label: 'DoS', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' },
]

export default function Cvss() {
  const [base, setBase] = useState<CvssBase>(DEFAULT_BASE)

  const score = cvssScore(base)
  const severity = cvssSeverity(score)
  const vector = cvssVector(base)

  const setMetric = (k: keyof CvssBase, v: string) => setBase((b) => ({ ...b, [k]: v }))

  const applyVector = (v: string) => {
    const parsed = parseVector(v)
    if (parsed) setBase(parsed)
  }

  return (
    <div>
      <ToolHeader icon={Brain} title="Calculadora CVSS 3.1" desc="Puntuación base según la especificación oficial de FIRST con vector, severidad y ejemplos reales" />

      <Reveal>
        <div className="card flex flex-col items-center gap-3 p-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <div className="font-mono text-[10px] uppercase tracking-widest text-grey">puntuación base</div>
            <motion.div
              key={score}
              initial={{ scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`mt-1 font-mono text-6xl font-extrabold ${
                score >= 9 ? 'text-bad' : score >= 7 ? 'text-warn' : score >= 4 ? 'text-info' : 'text-ok'
              }`}
            >
              {score.toFixed(1)}
            </motion.div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Badge tone={severityTone(severity)} className="px-4 py-1.5 text-sm">{severity.toUpperCase()}</Badge>
            <span className="font-mono text-[10px] text-grey">0 Ninguno · 0.1–3.9 Bajo · 4–6.9 Medio · 7–8.9 Alto · 9–10 Crítico</span>
          </div>
          <div className="w-full max-w-sm">
            <CopyBlock text={vector} label="vector" maxH="max-h-20" />
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {METRICS.map((m, i) => (
          <Reveal key={m.key} delay={i * 0.03}>
            <div className="card h-full p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md border border-acento/40 bg-acento/10 px-2 py-0.5 font-mono text-[11px] font-bold text-acento">{m.label}</span>
                <span className="font-mono text-[11px] text-grey">{m.full}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {m.options.map((o) => {
                  const active = base[m.key] === o.v
                  return (
                    <button
                      key={o.v}
                      onClick={() => setMetric(m.key, o.v)}
                      className={`rounded-lg border px-3 py-2 text-left transition-all ${
                        active ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:border-acento/30 hover:text-ink'
                      }`}
                    >
                      <div className="font-mono text-xs font-bold">{o.label} ({o.v})</div>
                      <div className="font-mono text-[10px] opacity-70">{o.hint}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">pegar vector existente</h3>
          <div className="flex gap-2">
            <TextInput
              placeholder="CVSS:3.1/AV:N/AC:L/…"
              className="font-mono"
              onKeyDown={(e) => e.key === 'Enter' && applyVector((e.target as HTMLInputElement).value)}
            />
            <Button
              variant="ghost"
              onClick={(e) => applyVector((e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement).value)}
            >
              aplicar
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => applyVector(ex.vector)}
                className="rounded-md border border-edge px-2.5 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 El scope «Changed» dispara la puntuación: una fuga en una VM que compromete el host, o un SSRF que toca la metadata
          del cloud, puntúa más que el mismo bug aislado. PR baja a 0.5/0.25 con scope C.
        </div>
      </Reveal>
    </div>
  )
}
