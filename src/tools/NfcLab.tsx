import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Waves, Binary, ShieldAlert, RefreshCw, Download, Fingerprint } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, Reveal, CopyBlock, CopyBtn, useToast } from '../components/ui'
import {
  CHIP_FAMILIES, genUid, mifareBcc, mifareClassicDump, em4100Dump,
  wiegandDecode, wiegandEncode, MODULATIONS, SCENARIOS,
} from '../lib/nfclab'

export default function NfcLab() {
  const [famId, setFamId] = useState('em4100')
  const [uid, setUid] = useState(() => genUid('em4100'))
  const [wFc, setWFc] = useState('112')
  const [wCard, setWCard] = useState('12345')
  const [wBits, setWBits] = useState('')
  const [playing, setPlaying] = useState(true)
  const toast = useToast()

  const fam = CHIP_FAMILIES.find((f) => f.id === famId)!

  const dump = useMemo(() => {
    if (fam.id.startsWith('mifare-classic')) return mifareClassicDump(uid)
    if (fam.id === 'em4100') return em4100Dump(uid)
    return `${fam.name} — UID: ${uid}\n${fam.memory}\nseguridad: ${fam.security}\n\n(la estructura interna de este chip no se modela aquí: ver MIFARE Classic para dumps completos)`
  }, [fam, uid])

  const bcc = useMemo(() => mifareBcc(uid), [uid])

  const decoded = useMemo(() => {
    if (wBits.trim()) return wiegandDecode(wBits)
    const fc = parseInt(wFc) || 0
    const cn = parseInt(wCard) || 0
    return { facility: fc, card: cn, bits: wiegandEncode(fc, cn), valid: true, evenParityOk: true, oddParityOk: true }
  }, [wBits, wFc, wCard])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Radio}
        title="NFC / RFID Lab"
        desc="Laboratorio de tarjetas de proximidad: familias de chips, UIDs y dumps simulados, Wiegand 26, modulaciones y escenarios de ataque con su defensa — sin tocar hardware real"
        badge="educativo"
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[340px_1fr]">
        {/* ─── selector de familia ─── */}
        <Reveal>
          <div className="space-y-3">
            <div className="card p-4">
              <h3 className="mb-2.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-grey">
                <Fingerprint size={12} className="text-acento" /> familias de chips
              </h3>
              <div className="space-y-1.5">
                {CHIP_FAMILIES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setFamId(f.id); setUid(genUid(f.id)) }}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${famId === f.id ? 'bg-acento/10' : 'border-edge hover:border-acento/40'}`}
                    style={famId === f.id ? { borderColor: f.color } : undefined}
                  >
                    <p className="flex items-center justify-between font-mono text-[11.5px] font-bold" style={{ color: famId === f.id ? f.color : '#e5e7eb' }}>
                      {f.name}
                      <span className="text-[9px] font-normal text-grey">{f.freq}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-grey">{f.commonUse}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ─── panel principal ─── */}
        <div className="min-w-0 space-y-5">
          {/* ficha de la familia */}
          <Reveal delay={0.04}>
            <div className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: fam.color }} />
                    {fam.name}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-grey">{fam.freq} · UID {fam.uidLen} bytes · {fam.memory}</p>
                </div>
                <Badge tone={fam.security.toLowerCase().includes('ninguna') || fam.security.toLowerCase().includes('roto') ? 'bad' : fam.security.toLowerCase().includes('aes') || fam.security.toLowerCase().includes('3des') ? 'ok' : 'warn'}>
                  {fam.security.toLowerCase().includes('ninguna') ? 'sin seguridad' : fam.security.toLowerCase().includes('roto') ? 'seguridad rota' : 'seguridad moderada'}
                </Badge>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-grey">{fam.notes}</p>
              <p className="mt-2 text-[12px] text-grey"><span className="text-acento">seguridad:</span> {fam.security}</p>
            </div>
          </Reveal>

          {/* UID + dump */}
          <Reveal delay={0.08}>
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                  <Binary size={15} className="text-acento" /> UID y dump simulado
                </h3>
                <div className="flex gap-1.5">
                  <Button variant="ghost" onClick={() => setUid(genUid(fam.id))}><RefreshCw size={13} /> nuevo UID</Button>
                  <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(dump); toast('dump copiado') }}><Download size={13} /> copiar dump</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-acento/30 bg-acento/5 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-grey">UID generado (CSPRNG local)</span>
                <span className="font-mono text-lg font-bold tracking-wider text-acento">{uid}</span>
                {fam.id.startsWith('mifare-classic') && <Badge tone="info">BCC: {bcc}</Badge>}
              </div>
              <div className="mt-3">
                <CopyBlock text={dump} label="dump simulado" maxH="max-h-72" />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-grey/70">
                El dump es SIMULADO con números aleatorios (nada sale de tu navegador) pero estructuralmente correcto: el bloque 0 de MIFARE muestra el formato real UID+BCC+SAK+ATQA, y los trailers muestran las claves por defecto <code className="text-warn">FFFFFFFFFFFF</code> que hacen caer la mitad de instalaciones reales.
              </p>
            </div>
          </Reveal>

          {/* wiegand */}
          <Reveal delay={0.12}>
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                <Waves size={15} className="text-acento" /> Wiegand 26 (HID Prox)
              </h3>
              <p className="mt-1.5 text-[12px] text-grey">El formato clásico de badges corporativos: 8 bits de Facility Code + 16 de Card Number + paridades. Codifica FC/CN o pega 26 bits para decodificar.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="facility code (0-255)"><TextInput value={wFc} onChange={(e) => { setWFc(e.target.value); setWBits('') }} className="py-2 text-xs" /></Field>
                    <Field label="card number (0-65535)"><TextInput value={wCard} onChange={(e) => { setWCard(e.target.value); setWBits('') }} className="py-2 text-xs" /></Field>
                  </div>
                  <Field label="26 bits (pegar para decodificar)" hint="sobrescribe FC/CN">
                    <TextInput value={wBits} onChange={(e) => setWBits(e.target.value)} className="py-2 font-mono text-xs" placeholder="1101001010…" />
                  </Field>
                </div>
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-edge bg-black/30 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-grey">bits wiegand</p>
                    <p className="mt-1 break-all font-mono text-sm tracking-wider text-acento">{typeof decoded === 'object' && decoded !== null ? (decoded as { bits: string }).bits : ''}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-edge bg-black/30 px-3 py-2.5">
                      <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">facility</p>
                      <p className="font-mono text-lg font-bold text-white">{typeof decoded === 'object' && decoded !== null ? (decoded as { facility: number }).facility : '—'}</p>
                    </div>
                    <div className="rounded-lg border border-edge bg-black/30 px-3 py-2.5">
                      <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">card number</p>
                      <p className="font-mono text-lg font-bold text-white">{typeof decoded === 'object' && decoded !== null ? (decoded as { card: number }).card : '—'}</p>
                    </div>
                  </div>
                  {wBits.trim() && typeof decoded === 'object' && decoded !== null && (
                    <div className={`rounded-lg border px-3 py-2.5 font-mono text-[11px] ${(decoded as { valid: boolean }).valid ? 'border-ok/40 bg-ok/5 text-ok' : 'border-bad/40 bg-bad/5 text-bad'}`}>
                      {(decoded as { valid: boolean }).valid ? '✓ paridades correctas: badge válido' : '✗ paridades mal: bits corruptos o formato no estándar'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          {/* modulación animada */}
          <Reveal delay={0.16}>
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white">Modulación: cómo viajan los datos</h3>
                <button onClick={() => setPlaying((p) => !p)} className="rounded-lg border border-edge px-3 py-1.5 font-mono text-[10px] text-grey hover:text-ink">
                  {playing ? '⏸ pausar' : '▶ reproducir'}
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {MODULATIONS.map((m) => (
                  <div key={m.id} className="rounded-xl border border-edge bg-black/30 p-4">
                    <p className="font-mono text-[11.5px] font-bold" style={{ color: m.color }}>{m.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-grey">{m.freq}</p>
                    <p className="mt-2 text-[11.5px] leading-snug text-grey">{m.desc}</p>
                    <svg viewBox="0 0 200 44" className="mt-2 w-full">
                      {m.id === 'ask' && (
                        <motion.path
                          d="M0,22 Q5,2 10,22 T20,22 T30,22 T40,22 L40,22 L50,42 T60,22 T70,22 T80,22 T90,22 T100,22 T110,22 T120,22 T130,22 T140,22 T150,22 T160,22 T170,22 T180,22 T190,22 T200,22"
                          fill="none" stroke={m.color} strokeWidth="1.5"
                          animate={playing ? { strokeDashoffset: [0, -40] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} strokeDasharray="4 4"
                        />
                      )}
                      {m.id === 'fsk' && (
                        <motion.path
                          d="M0,22 Q4,6 8,22 Q12,38 16,22 Q20,6 24,22 Q28,38 32,22 L48,22 Q52,6 56,22 Q60,38 64,22 Q68,6 72,22 Q76,38 80,22 L160,22 Q164,6 168,22 Q172,38 176,22 Q180,6 184,22 Q188,38 192,22 Q196,6 200,22"
                          fill="none" stroke={m.color} strokeWidth="1.5"
                          animate={playing ? { strokeDashoffset: [0, -40] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} strokeDasharray="4 4"
                        />
                      )}
                      {m.id === 'psk' && (
                        <motion.path
                          d="M0,22 Q5,2 10,22 T20,22 T30,22 T40,22 L50,22 Q55,42 60,22 T70,22 T80,22 L90,22 Q95,2 100,22 T110,22 T120,22 T130,22 T140,22 T150,22 T160,22 T170,22 T180,22 T190,22 T200,22"
                          fill="none" stroke={m.color} strokeWidth="1.5"
                          animate={playing ? { strokeDashoffset: [0, -40] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} strokeDasharray="4 4"
                        />
                      )}
                      {m.id === 'load' && (
                        <>
                          <path d="M0,22 Q4,2 8,22 T16,22 T24,22 T32,22 T40,22 T48,22 T56,22 T64,22 T72,22 T80,22 T88,22 T96,22 T104,22 T112,22 T120,22 T128,22 T136,22 T144,22 T152,22 T160,22 T168,22 T176,22 T184,22 T192,22 T200,22" fill="none" stroke="#64748b" strokeWidth="1" opacity="0.5" />
                          <motion.path
                            d="M0,22 L20,22 L20,38 L40,38 L40,22 L80,22 L80,38 L100,38 L100,22 L140,22 L140,38 L160,38 L160,22 L200,22"
                            fill="none" stroke={m.color} strokeWidth="1.8"
                            animate={playing ? { strokeDashoffset: [0, -40] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} strokeDasharray="4 4"
                          />
                        </>
                      )}
                      <text x="4" y="42" fontSize="7" fill="#64748b" fontFamily="monospace">portadora + bits codificados</text>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* escenarios */}
          <Reveal delay={0.2}>
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                <ShieldAlert size={15} className="text-warn" /> escenarios de ataque y defensa (educativos)
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {SCENARIOS.map((s) => (
                  <motion.div key={s.id} whileHover={{ y: -3 }} className="rounded-xl border border-edge bg-black/30 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-xs font-bold text-white">{s.name}</p>
                      <Badge tone={s.difficulty <= 2 ? 'bad' : s.difficulty <= 3 ? 'warn' : 'info'}>{'★'.repeat(s.difficulty)}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-grey">🛠 {s.tool}</p>
                    <p className="mt-2 text-[12px] leading-snug text-grey">{s.desc}</p>
                    <p className="mt-2 text-[11.5px] leading-snug text-ok"><span className="font-bold">defensa:</span> {s.defense}</p>
                    <p className="mt-2 rounded-lg border border-bad/25 bg-bad/5 px-2.5 py-1.5 text-[10.5px] leading-snug text-bad/90">⚖ {s.legal}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
