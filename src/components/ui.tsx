import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Check, Copy, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react'
import { cn, copyText } from '../lib/util'

/* ---------------- Toasts ---------------- */

type ToastKind = 'ok' | 'error' | 'info'
interface Toast { id: number; kind: ToastKind; msg: string }
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const push = useCallback((msg: string, kind: ToastKind = 'ok') => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-3), { id, kind, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-2.5 font-mono text-xs shadow-glass backdrop-blur-md',
                t.kind === 'ok' && 'border-acento/40 bg-panel/95 text-acento',
                t.kind === 'error' && 'border-bad/40 bg-panel/95 text-bad',
                t.kind === 'info' && 'border-info/40 bg-panel/95 text-info',
              )}
            >
              {t.kind === 'ok' && <CheckCircle2 size={14} />}
              {t.kind === 'error' && <AlertTriangle size={14} />}
              {t.kind === 'info' && <Info size={14} />}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------- Reveal ---------------- */

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ---------------- Copy button / CopyBlock ---------------- */

export function CopyBtn({ text, className, label }: { text: string; className?: string; label?: string }) {
  const [ok, setOk] = useState(false)
  const toast = useToast()
  return (
    <button
      onClick={() => {
        copyText(text)
        setOk(true)
        toast(label ?? 'Copiado al portapapeles')
        setTimeout(() => setOk(false), 1400)
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-edge bg-panel px-2.5 py-1.5 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento',
        className,
      )}
    >
      {ok ? <Check size={12} className="text-acento" /> : <Copy size={12} />}
      {ok ? 'copiado' : 'copiar'}
    </button>
  )
}

export function CopyBlock({ text, label = 'output', maxH }: { text: string; label?: string; maxH?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-black/70">
      <div className="flex items-center justify-between border-b border-edge px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-acento" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-grey">{label}</span>
        </div>
        <CopyBtn text={text} className="border-0 bg-transparent px-1" />
      </div>
      <pre className={cn('overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[13px] leading-relaxed text-ink', maxH ?? 'max-h-96')}>{text || '—'}</pre>
    </div>
  )
}

/* ---------------- Badge / Pill ---------------- */

export function Badge({ tone = 'neutral', children, className }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'accent' | 'neutral'; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px]',
        tone === 'ok' && 'border-ok/40 bg-ok/10 text-ok',
        tone === 'warn' && 'border-warn/40 bg-warn/10 text-warn',
        tone === 'bad' && 'border-bad/40 bg-bad/10 text-bad',
        tone === 'info' && 'border-info/40 bg-info/10 text-info',
        tone === 'accent' && 'border-acento/40 bg-acento/10 text-acento',
        tone === 'neutral' && 'border-edge bg-panel text-grey',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ---------------- Tool header ---------------- */

export function ToolHeader({ icon: Icon, title, desc, badge }: { icon: React.ElementType; title: string; desc: string; badge?: string }) {
  return (
    <Reveal>
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-acento/30 bg-acento/10 text-acento shadow-glow">
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold text-white md:text-3xl">
            {title}
            {badge && <Badge tone="accent">{badge}</Badge>}
          </h1>
          <p className="mt-1 text-sm text-grey">{desc}</p>
        </div>
      </div>
    </Reveal>
  )
}

/* ---------------- Inputs ---------------- */

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-wider text-grey">
        {label}
        {hint && <span className="normal-case tracking-normal text-grey/60">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-grey/40 outline-none transition-all focus:border-acento/60 focus:shadow-glow'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea spellCheck={false} {...props} className={cn(inputCls, 'min-h-28 resize-y', props.className)} />
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} className={cn(inputCls, 'appearance-none cursor-pointer', props.className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-panel">
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Button({ variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-acento text-base font-bold shadow-glow hover:bg-acento-bright',
        variant === 'ghost' && 'border border-edge text-ink hover:border-acento/50 hover:bg-acento/5',
        variant === 'danger' && 'border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20',
        className,
      )}
    />
  )
}

/* ---------------- Toggle ---------------- */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 font-mono text-xs text-grey transition-colors hover:text-ink"
    >
      <span className={cn('relative h-5 w-9 rounded-full border transition-all', checked ? 'border-acento/60 bg-acento/25' : 'border-edge bg-black/40')}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn('absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full', checked ? 'right-[2px] bg-acento shadow-glow' : 'left-[2px] bg-grey')}
        />
      </span>
      {label}
    </button>
  )
}

/* ---------------- KV row ---------------- */

export function KV({ k, v, mono = true, copyable }: { k: string; v: ReactNode; mono?: boolean; copyable?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-edge/60 px-4 py-2.5 last:border-0">
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-grey">{k}</span>
      <span className={cn('flex items-center gap-2 break-all text-right text-sm text-ink', mono && 'font-mono text-[13px]')}>
        {v}
        {copyable && typeof v === 'string' && <CopyBtn text={v} className="border-0 bg-transparent px-1 py-0.5" />}
      </span>
    </div>
  )
}

/* ---------------- Error box ---------------- */

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 font-mono text-xs text-bad"
    >
      {children}
    </motion.div>
  )
}

/* ---------------- Spinner ---------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn('inline-block h-4 w-4 animate-spin360 rounded-full border-2 border-acento/30 border-t-acento', className)} />
  )
}

/* ---------------- Counter ---------------- */

export function Counter({ to, suffix = '', duration = 1.4 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])
  return (
    <span ref={ref} className="font-mono tabular-nums">
      {val.toLocaleString('es-ES')}
      {suffix}
    </span>
  )
}

/* ---------------- Typewriter ---------------- */

export function Typewriter({ phrases, speed = 55 }: { phrases: string[]; speed?: number }) {
  const [text, setText] = useState('')
  const [pi, setPi] = useState(0)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const phrase = phrases[pi % phrases.length]
    let timeout: ReturnType<typeof setTimeout>
    if (!deleting && text === phrase) timeout = setTimeout(() => setDeleting(true), 1900)
    else if (deleting && text === '') {
      setDeleting(false)
      setPi((p) => (p + 1) % phrases.length)
    } else timeout = setTimeout(() => setText(phrase.slice(0, text.length + (deleting ? -1 : 1))), deleting ? 28 : speed)
    return () => clearTimeout(timeout)
  }, [text, deleting, pi, phrases, speed])
  return (
    <span>
      {text}
      <span className="animate-blink text-acento">▊</span>
    </span>
  )
}

/* ---------------- Live terminal (home hero) ---------------- */

export function LiveTerminal() {
  const LINES: { text: string; kind: 'cmd' | 'out' | 'ok' | 'warn' }[] = [
    { text: './hacknexus --mode stealth --target lab.local', kind: 'cmd' },
    { text: '[*] cargando 40 herramientas locales…', kind: 'out' },
    { text: '[✓] hash suite · cracker · jwt · totp online', kind: 'ok' },
    { text: 'hacknexus> crack md5 --wordlist rockyou.txt', kind: 'cmd' },
    { text: '[*] 14.3M contraseñas · 2.1M h/s · GPU-less mode', kind: 'out' },
    { text: '[✓] cracker: e10adc394… → "123456" (0.01s)', kind: 'ok' },
    { text: 'hacknexus> pcap analyze traffic.pcap', kind: 'cmd' },
    { text: '[!] 3 paquetes sospechosos: 4444/TCP C2', kind: 'warn' },
    { text: '[✓] informe listo · 0 bytes enviados a servidores', kind: 'ok' },
  ]
  const [shown, setShown] = useState<string[]>([])
  const [lineIdx, setLineIdx] = useState(0)
  useEffect(() => {
    const line = LINES[lineIdx % LINES.length]
    let i = 0
    const interval = setInterval(() => {
      i += 2
      setShown((s) => {
        const next = [...s.slice(0, lineIdx)]
        next[lineIdx] = line.text.slice(0, i)
        return next
      })
      if (i >= line.text.length) {
        clearInterval(interval)
        setTimeout(() => setLineIdx((x) => x + 1), line.kind === 'cmd' ? 700 : 320)
      }
    }, 16)
    return () => clearInterval(interval)
  }, [lineIdx])
  useEffect(() => {
    if (lineIdx >= LINES.length) {
      const t = setTimeout(() => {
        setShown([])
        setLineIdx(0)
      }, 4200)
      return () => clearTimeout(t)
    }
  }, [lineIdx])
  return (
    <div className="relative overflow-hidden rounded-2xl border border-edge bg-black/80 shadow-glass">
      <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
          <span className="ml-2 font-mono text-[11px] text-grey">root@hacknexus — session</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-ok">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> live
        </span>
      </div>
      <div className="scanline-band" />
      <div className="min-h-[300px] p-5 font-mono text-[12.5px] leading-[1.75]">
        {shown.map((l, i) => {
          const kind = LINES[i]?.kind ?? 'out'
          return (
            <div key={i} className="flex gap-2">
              {kind === 'cmd' ? (
                <span className="shrink-0 text-acento">➜ ~</span>
              ) : (
                <span className="shrink-0 text-grey">{'│'}</span>
              )}
              <span className={cn('break-all', kind === 'cmd' && 'text-white', kind === 'out' && 'text-grey', kind === 'ok' && 'text-ok', kind === 'warn' && 'text-warn')}>
                {l}
              </span>
            </div>
          )
        })}
        <div className="flex gap-2 text-white">
          <span className="text-acento">➜ ~</span>
          <span className="animate-blink text-acento">▊</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-edge px-5 py-3 font-mono text-[10px] text-grey">
        <div><span className="block text-base font-bold text-acento">40</span>tools</div>
        <div><span className="block text-base font-bold text-white">100%</span>client-side</div>
        <div><span className="block text-base font-bold text-white">0</span>servers</div>
        <div><span className="block text-base font-bold text-ok">MIT</span>license</div>
      </div>
    </div>
  )
}

/* ---------------- Dismissible banner ---------------- */

export function InfoBanner({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-6 flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-xs text-info/90"
    >
      <Info size={14} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      <button onClick={() => setOpen(false)} className="text-grey transition-colors hover:text-ink">
        <X size={14} />
      </button>
    </motion.div>
  )
}