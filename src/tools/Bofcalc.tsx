import { useMemo, useState } from 'react'
import { Binary } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, TextInput, Reveal, InfoBanner } from '../components/ui'
import { cyclicPattern, findOffset, badcharString, buildBofPayload, DEFAULT_BADCHARS, BOF_METHOD, BOF_NOTES, MSF_SHELLCODE_CMDS } from '../lib/bofcalc'

type Step = 'patron' | 'offset' | 'badchars' | 'payload'

export default function Bofcalc() {
  const [step, setStep] = useState<Step>('patron')

  // 1. patrón
  const [patLen, setPatLen] = useState('1000')
  const pattern = useMemo(() => cyclicPattern(Math.max(100, Math.min(60000, parseInt(patLen) || 1000))), [patLen])

  // 2. offset
  const [eip, setEip] = useState('')
  const offR = useMemo(() => (eip.trim() ? findOffset(eip) : null), [eip])

  // 3. badchars
  const [bad, setBad] = useState(DEFAULT_BADCHARS)
  const bcR = useMemo(() => {
    const codes = [...bad].map((c) => c.codePointAt(0) ?? 0)
    const str = badcharString(codes)
    return { str, count: str.length / 4 }
  }, [bad])

  // 4. payload
  const [offset, setOffset] = useState('2003')
  const [eipAddr, setEipAddr] = useState('0x625011af')
  const [nops, setNops] = useState('32')
  const [sc, setSc] = useState('')
  const payload = useMemo(() => {
    const o = parseInt(offset)
    const n = parseInt(nops)
    if (!Number.isFinite(o) || o < 0) return null
    return buildBofPayload({ offset: o, eipAddr, nops: Number.isFinite(n) ? n : 0, shellcodeHex: sc, totalBefore: 0 })
  }, [offset, eipAddr, nops, sc])

  const STEPS: { id: Step; label: string; icon: string }[] = [
    { id: 'patron', label: '1 · Patrón', icon: '🔤' },
    { id: 'offset', label: '2 · Offset', icon: '🎯' },
    { id: 'badchars', label: '3 · Badchars', icon: '🚫' },
    { id: 'payload', label: '4 · Payload', icon: '💥' },
  ]

  return (
    <>
      <ToolHeader icon={Binary} title="Buffer Overflow Calculator" desc="Las 4 piezas del exploit clásico: patrón cíclico estilo Metasploit, cálculo de offset desde el EIP crashado, cadena de badchars y payload final con NOP sled + shellcode + dirección de retorno en little-endian" />

      <InfoBanner>
        <b>El flujo del BOF clásico (OSCP/HTB):</b> fuzzing → patrón cíclico → offset → badchars → JMP ESP + shellcode.
        Esta tool hace la ARITMÉTICA completa; el exploit, en TU lab con autorización. El patrón es idéntico al de
        Metasploit: puedes mezclar pattern_offset.rb con esta tool.
      </InfoBanner>

      <div className="mb-4 flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button key={s.id} onClick={() => setStep(s.id)} className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${step === s.id ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {step === 'patron' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Longitud del patrón" hint="mayor que el buffer que crashea">
              <TextInput value={patLen} onChange={(e) => setPatLen(e.target.value)} className="font-mono" />
            </Field>
            <div className="rounded border border-edge bg-black/30 p-3 text-xs text-grey">
              Envía este patrón como buffer del fuzzing. Cuando el proceso crashea, copia el valor de EIP (4 chars en el
              debugger o su hex) y ve al paso 2.
            </div>
          </div>
          <CopyBlock text={pattern} label={`patrón cíclico (${pattern.length} bytes)`} maxH="26rem" />
        </div>
      )}

      {step === 'offset' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Valor de EIP tras el crash" hint='4 chars ("Aa3A") o hex ("0x41336141")'>
              <TextInput value={eip} onChange={(e) => setEip(e.target.value)} placeholder="Aa3A" className="font-mono" />
            </Field>
            {offR && offR.offset !== null && (
              <Reveal>
                <div className="rounded-lg border border-ok/40 bg-ok/5 p-4 text-center">
                  <div className="font-mono text-4xl font-bold text-ok">{offR.offset}</div>
                  <div className="mt-1 text-xs text-grey">bytes de basura antes del EIP — {offR.matched} cae justo aquí</div>
                  <button onClick={() => { setOffset(String(offR.offset)); setStep('payload') }} className="mt-2 rounded border border-acento/40 px-3 py-1 text-xs text-acento hover:bg-acento/10">
                    usar {offR.offset} en el payload →
                  </button>
                </div>
              </Reveal>
            )}
            {offR && offR.offset === null && <div className="rounded border border-bad/40 bg-bad/5 p-3 text-xs text-bad">{offR.hint ?? 'no encontrado'}</div>}
          </div>
          <div className="rounded border border-edge bg-black/30 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Método completo</h4>
            <ol className="space-y-1.5 text-[11px] text-grey">
              {BOF_METHOD.map((m) => <li key={m}>{m}</li>)}
            </ol>
          </div>
        </div>
      )}

      {step === 'badchars' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Badchars detectados (escríbelos como texto: \x00\x0a…)">
              <TextInput value={bad} onChange={(e) => setBad(e.target.value)} className="font-mono" />
              <p className="mt-1 font-mono text-[10px] text-grey/70">códigos excluidos: {[...bad].map((c) => '0x' + (c.codePointAt(0) ?? 0).toString(16).padStart(2, '0')).join(' ')}</p>
            </Field>
            <div className="rounded border border-edge bg-black/30 p-3">
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Cómo cazarlos</h4>
              <ul className="space-y-1.5 text-[11px] text-grey">
                {['Envía la cadena tras el offset y compara el dump del ESP byte a byte', 'Todo byte que llegue ALTERADO es badchar: añádelo y repite', 'mona.py lo hace solo: !mona bytearray + !mona compare -f bytearray.txt', 'Sospechosos habituales: \\x00 \\x0a \\x0d \\x20 \\xff y todo lo alto (0x80+)'].map((m) => <li key={m}>• {m}</li>)}
              </ul>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-grey">{bcR.count} bytes (1-255 sin badchars)</span>
              <CopyBtn text={bcR.str} />
            </div>
            <CopyBlock text={bcR.str} label="cadena de badchars" maxH="16rem" />
            <button onClick={() => { setStep('payload') }} className="rounded border border-acento/40 px-3 py-1 text-xs text-acento hover:bg-acento/10">construir payload sin estos badchars →</button>
          </div>
        </div>
      )}

      {step === 'payload' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Offset"><TextInput value={offset} onChange={(e) => setOffset(e.target.value)} className="font-mono" /></Field>
              <Field label="NOPs"><TextInput value={nops} onChange={(e) => setNops(e.target.value)} className="font-mono" /></Field>
            </div>
            <Field label="Dirección de retorno (JMP/CALL ESP)" hint="little-endian automático">
              <TextInput value={eipAddr} onChange={(e) => setEipAddr(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Shellcode (hex sin \\x o con \\x)" hint="de msfvenom -f c">
              <textarea value={sc} onChange={(e) => setSc(e.target.value)} rows={5} placeholder={'\\xfc\\xe8\\x8f\\x00…  o  fce88f00'} className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs" />
            </Field>
            {payload && payload.warnings.length > 0 && (
              <div className="rounded border border-warn/40 bg-warn/5 px-3 py-2 text-[11px] text-warn">
                {payload.warnings.map((w) => <div key={w}>⚠ {w}</div>)}
              </div>
            )}
            <div className="rounded border border-edge bg-black/30 p-3">
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Generar shellcode (msfvenom)</h4>
              <ul className="space-y-1.5 text-[11px]">
                {MSF_SHELLCODE_CMDS.map(([k, v]) => (
                  <li key={k}><span className="text-ink">{k}:</span> <code className="break-all font-mono text-grey">{v}</code></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-2">
            {payload && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="info">total: {payload.length} bytes</Badge>
                  <Badge tone="accent">EIP → {payload.eipBytes}</Badge>
                </div>
                <CopyBlock text={payload.python} label="exploit.py" maxH="26rem" />
              </>
            )}
            <div className="rounded border border-bad/30 bg-bad/[0.04] p-3">
              <ul className="space-y-1.5 text-[11px] text-grey">
                {BOF_NOTES.map((n) => <li key={n}>• {n}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
