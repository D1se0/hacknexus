import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Plus, Trash2, RefreshCw } from 'lucide-react'
import { ToolHeader, CopyBtn, Field, TextInput, Button, Badge, useToast, Reveal } from '../components/ui'
import { totp, randomTotpSecret, otpauthUri } from '../lib/totp'

interface Account {
  id: number
  label: string
  secret: string
}

export default function Totp() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [label, setLabel] = useState('Mi cuenta')
  const [secret, setSecret] = useState('JBSWY3DPEHPK3PXP')
  const [codes, setCodes] = useState<Record<number, { code: string; remaining: number; period: number }>>({})
  const [tick, setTick] = useState(0)
  const toast = useToast()

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hacknexus-totp')
      if (saved) setAccounts(JSON.parse(saved))
    } catch { /* ignora */ }
  }, [])

  useEffect(() => {
    localStorage.setItem('hacknexus-totp', JSON.stringify(accounts))
  }, [accounts])

  useEffect(() => {
    const iv = setInterval(() => {
      setTick((t) => t + 1)
      accounts.forEach(async (a) => {
        try {
          const r = await totp(a.secret)
          setCodes((c) => ({ ...c, [a.id]: { code: r.code, remaining: r.remainingSeconds, period: r.period } }))
        } catch { /* secreto inválido */ }
      })
    }, 500)
    return () => clearInterval(iv)
  }, [accounts])

  const add = () => {
    if (!secret.trim()) {
      toast('Introduce un secreto base32', 'error')
      return
    }
    setAccounts((a) => [...a, { id: Date.now(), label: label.trim() || 'cuenta', secret: secret.trim() }])
    setLabel('')
    toast('Cuenta añadida')
  }

  const addDemo = () => {
    const s = randomTotpSecret()
    setAccounts((a) => [...a, { id: Date.now(), label: `demo-${a.length + 1}`, secret: s }])
    setSecret(s)
    toast('Cuenta demo generada')
  }

  return (
    <div>
      <ToolHeader icon={Timer} title="TOTP Generator" desc="Códigos 2FA estilo Google Authenticator — los secretos se guardan solo en tu localStorage" />

      <div className="grid gap-6">
        <Reveal>
          <div className="card p-6">
            <h3 className="mb-4 font-mono text-sm font-bold text-white">Añadir cuenta</h3>
            <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto]">
              <Field label="Nombre">
                <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="GitHub / Gmail…" />
              </Field>
              <Field label="Secreto Base32" hint="lo da el QR del servicio">
                <TextInput value={secret} onChange={(e) => setSecret(e.target.value)} spellCheck={false} className="font-mono" />
              </Field>
              <div className="flex items-end gap-2">
                <Button onClick={add} className="gap-2"><Plus size={14} /> añadir</Button>
                <Button variant="ghost" onClick={addDemo}>demo</Button>
              </div>
            </div>
            <Field label="URI otpauth (para generar QR con cualquier librería)" className="mt-4">
              <code className="block break-all rounded-lg border border-edge bg-black/40 px-3 py-2 font-mono text-[11px] text-grey">
                {otpauthUri(label || 'cuenta', secret, 'HackNexus')}
              </code>
            </Field>
          </div>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {accounts.map((a) => {
              const c = codes[a.id]
              const pct = c ? (c.remaining / c.period) * 100 : 100
              const urgent = c ? c.remaining <= 5 : false
              return (
                <motion.div key={a.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="card flex items-center gap-5 p-5" data-tick={tick}>
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 40 40" className="h-16 w-16 -rotate-90">
                      <circle cx="20" cy="20" r="17" fill="none" stroke="#232b26" strokeWidth="3.5" />
                      <motion.circle
                        cx="20" cy="20" r="17" fill="none"
                        stroke={urgent ? '#ff5c78' : '#2ee88a'}
                        strokeWidth="3.5" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 17}
                        animate={{ strokeDashoffset: 2 * Math.PI * 17 * (1 - pct / 100) }}
                        transition={{ duration: 0.4, ease: 'linear' }}
                      />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center font-mono text-lg font-bold ${urgent ? 'text-bad' : 'text-ink'}`}>
                      {c?.remaining ?? '–'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-white">{a.label}</span>
                      <Badge tone="neutral">{a.secret.slice(0, 4)}…</Badge>
                    </div>
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={c?.code}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        className="mt-1 flex items-center gap-3"
                      >
                        <code className={`font-mono text-2xl font-bold tracking-[0.2em] ${urgent ? 'text-bad' : 'text-acento'}`}>
                          {c?.code?.slice(0, 3) ?? '···'} {c?.code?.slice(3) ?? '···'}
                        </code>
                        {c?.code && <CopyBtn text={c.code} label="copiar código" className="border-0 bg-transparent px-1" />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={() => setAccounts((acc) => acc.filter((x) => x.id !== a.id))}
                    className="self-start text-grey transition-colors hover:text-bad"
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {accounts.length === 0 && (
          <Reveal>
            <div className="card flex flex-col items-center gap-3 py-16 text-center">
              <RefreshCw size={28} className="text-grey" />
              <p className="font-mono text-sm text-grey">Sin cuentas todavía. Prueba el secreto demo <code className="text-acento">JBSWY3DPEHPK3PXP</code> o pulsa “demo”.</p>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  )
}