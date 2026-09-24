import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import { ToolHeader, Badge, Reveal, CopyBtn, useToast } from '../components/ui'
import { LINUX_CHEATS, WINDOWS_CHEATS, PRIVESC_HINTS, EQUIV_CMD, type CheatCategory } from '../lib/cheats'
import { copyText } from '../lib/util'

type Tab = 'linux' | 'windows' | 'privesc' | 'equiv'

export default function Cheatsheets() {
  const [tab, setTab] = useState<Tab>('linux')
  const toast = useToast()

  const copyCmd = (cmd: string) => {
    copyText(cmd)
    toast('Comando copiado')
  }

  const sections: Record<Tab, { title: string; data: CheatCategory[] }> = {
    linux: { title: 'Linux — sistema, red y hardening', data: LINUX_CHEATS },
    windows: { title: 'Windows — sistema y defensa', data: WINDOWS_CHEATS },
    privesc: { title: 'Escalada de privilegios', data: [] },
    equiv: { title: 'Equivalencias Linux ↔ Windows', data: [] },
  }

  return (
    <div>
      <ToolHeader icon={ScrollText} title="Linux/Windows Cheatsheets" desc="Comandos de red, sistema, defensa y privesc con equivalencias entre sistemas operativos" />

      <Reveal>
        <div className="flex flex-wrap gap-2">
          {([
            ['linux', '🐧 Linux'],
            ['windows', '🪟 Windows'],
            ['privesc', '⬆ Privesc'],
            ['equiv', '⇄ Equivalencias'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg border px-4 py-2 font-mono text-xs transition-all ${
                tab === t ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Reveal>

      {tab === 'privesc' ? (
        <Reveal>
          <div className="card mt-4 p-6">
            <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">checklist de escalada</h3>
            {(['linux', 'windows'] as const).map((platform) => (
              <div key={platform} className="mb-6 last:mb-0">
                <Badge tone={platform === 'linux' ? 'info' : 'accent'}>{platform === 'linux' ? '🐧 linux' : '🪟 windows'}</Badge>
                <div className="mt-3 space-y-2">
                  {PRIVESC_HINTS.filter((h) => h.platform === platform).map((h, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-edge bg-black/30 px-4 py-2.5">
                      <span className="font-mono text-[10px] text-acento">{String(i + 1).padStart(2, '0')}</span>
                      <span className="break-all font-mono text-[12px] text-ink">{h.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      ) : tab === 'equiv' ? (
        <Reveal>
          <div className="card mt-4 overflow-hidden">
            <div className="border-b border-edge bg-black/30 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-grey">
              linux → windows ({EQUIV_CMD.length} equivalencias)
            </div>
            <div className="divide-y divide-edge/50">
              {EQUIV_CMD.map((e, i) => (
                <div key={i} className="grid gap-2 px-4 py-3 md:grid-cols-2">
                  <button onClick={() => copyCmd(e.linux)} className="group rounded-lg border border-edge/60 bg-black/30 px-3 py-2 text-left font-mono text-[12px] text-info transition-all hover:border-info/50">
                    <span className="text-[9px] uppercase text-grey">linux · {e.desc}</span>
                    <div className="mt-0.5 break-all">{e.linux}</div>
                  </button>
                  <button onClick={() => copyCmd(e.win)} className="group rounded-lg border border-edge/60 bg-black/30 px-3 py-2 text-left font-mono text-[12px] text-warn transition-all hover:border-warn/50">
                    <span className="text-[9px] uppercase text-grey">windows</span>
                    <div className="mt-0.5 break-all">{e.win}</div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      ) : (
        sections[tab].data.map((cat, ci) => (
          <Reveal key={cat.name} delay={ci * 0.04}>
            <div className="card mt-4 overflow-hidden">
              <div className="flex items-center justify-between border-b border-edge bg-black/30 px-4 py-2.5">
                <span className="font-mono text-[11px] uppercase tracking-widest text-acento">{cat.name}</span>
                <Badge tone="neutral">{cat.items.length} comandos</Badge>
              </div>
              <div className="divide-y divide-edge/50">
                {cat.items.map((item, i) => (
                  <div key={i} className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-acento/5">
                    <span className="flex-1 break-all font-mono text-[12.5px] text-ink">{item.cmd}</span>
                    <span className="hidden text-[11px] text-grey lg:block">{item.desc}</span>
                    <CopyBtn text={item.cmd} label="copiar" className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))
      )}
    </div>
  )
}
