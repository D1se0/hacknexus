import { useMemo, useState } from 'react'
import { ScrollText, Search } from 'lucide-react'
import { ToolHeader, Badge, Reveal, CopyBtn, useToast } from '../components/ui'
import { LINUX_CHEATS, WINDOWS_CHEATS, MAC_CHEATS, NETWORK_CHEATS, PRIVESC_HINTS, EQUIV_CMD, REV_SHELL_ONE_LINERS, type CheatCategory } from '../lib/cheats'
import { copyText } from '../lib/util'

type Tab = 'linux' | 'windows' | 'mac' | 'network' | 'privesc' | 'equiv' | 'revshells'

export default function Cheatsheets() {
  const [tab, setTab] = useState<Tab>('linux')
  const [q, setQ] = useState('')
  const toast = useToast()

  const copyCmd = (cmd: string) => {
    copyText(cmd)
    toast('Comando copiado')
  }

  const tabs: [Tab, string, number][] = [
    ['linux', '🐧 Linux', LINUX_CHEATS.reduce((a, c) => a + c.items.length, 0)],
    ['windows', '🪟 Windows', WINDOWS_CHEATS.reduce((a, c) => a + c.items.length, 0)],
    ['mac', '🍎 macOS', MAC_CHEATS.reduce((a, c) => a + c.items.length, 0)],
    ['network', '🌐 Red', NETWORK_CHEATS.reduce((a, c) => a + c.items.length, 0)],
    ['privesc', '⬆ Privesc', PRIVESC_HINTS.length],
    ['equiv', '⇄ Equivalencias', EQUIV_CMD.length],
    ['revshells', '🔥 RevShells', REV_SHELL_ONE_LINERS.length],
  ]

  const qn = q.trim().toLowerCase()
  const filterCat = (cats: CheatCategory[]): CheatCategory[] =>
    !qn ? cats : cats.map((c) => ({ ...c, items: c.items.filter((it) => (it.cmd + ' ' + it.desc).toLowerCase().includes(qn)) })).filter((c) => c.items.length > 0)

  const sections: Record<Tab, { title: string; data: CheatCategory[] }> = {
    linux: { title: 'Linux — sistema, red, privesc y ofensiva', data: filterCat(LINUX_CHEATS) },
    windows: { title: 'Windows — sistema, AD y defensa', data: filterCat(WINDOWS_CHEATS) },
    mac: { title: 'macOS — enum y seguridad', data: filterCat(MAC_CHEATS) },
    network: { title: 'Redes — IPv4/IPv6, captura y servidores', data: filterCat(NETWORK_CHEATS) },
    privesc: { title: 'Escalada de privilegios', data: [] },
    equiv: { title: 'Equivalencias Linux ↔ Windows', data: [] },
    revshells: { title: 'Reverse shells one-liners (sustituye ATTACKER_IP)', data: [] },
  }

  const privescFiltered = useMemo(
    () => PRIVESC_HINTS.filter((h) => !qn || h.text.toLowerCase().includes(qn)),
    [qn],
  )
  const equivFiltered = useMemo(
    () => EQUIV_CMD.filter((e) => !qn || (e.linux + e.win + e.desc).toLowerCase().includes(qn)),
    [qn],
  )
  const shellsFiltered = useMemo(
    () => REV_SHELL_ONE_LINERS.filter((s) => !qn || (s.name + s.cmd).toLowerCase().includes(qn)),
    [qn],
  )

  return (
    <div>
      <ToolHeader icon={ScrollText} title="Linux/Windows Cheatsheets" desc={`${tabs.reduce((a, [, , n]) => a + n, 0)} comandos: red, sistema, AD, privesc, macOS, forense y reverse shells`} />

      <Reveal>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(([t, label, n]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs transition-all ${
                tab === t ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'
              }`}
            >
              {label}
              <span className="rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] text-grey">{n}</span>
            </button>
          ))}
        </div>
        <div className="relative mt-3 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-grey" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="filtrar comandos… (ej: ssh, hash, firewall)"
            className="w-full rounded-lg border border-edge bg-black/40 py-2 pl-9 pr-4 font-mono text-[13px] text-ink outline-none transition-all placeholder:text-grey/40 focus:border-acento/60 focus:shadow-glow"
          />
        </div>
      </Reveal>

      {tab === 'privesc' ? (
        <Reveal>
          <div className="card mt-4 p-6">
            <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">checklist de escalada</h3>
            {(['linux', 'windows'] as const).map((platform) => {
              const hints = privescFiltered.filter((h) => h.platform === platform)
              if (!hints.length) return null
              return (
                <div key={platform} className="mb-6 last:mb-0">
                  <Badge tone={platform === 'linux' ? 'info' : 'accent'}>{platform === 'linux' ? '🐧 linux' : '🪟 windows'}</Badge>
                  <div className="mt-3 space-y-2">
                    {hints.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-edge bg-black/30 px-4 py-2.5">
                        <span className="font-mono text-[10px] text-acento">{String(i + 1).padStart(2, '0')}</span>
                        <span className="min-w-0 break-all font-mono text-[12px] text-ink">{h.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>
      ) : tab === 'equiv' ? (
        <Reveal>
          <div className="card mt-4 overflow-hidden">
            <div className="border-b border-edge bg-black/30 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-grey">
              linux → windows ({equivFiltered.length} equivalencias)
            </div>
            <div className="divide-y divide-edge/50">
              {equivFiltered.map((e, i) => (
                <div key={i} className="grid gap-2 px-4 py-3 md:grid-cols-2">
                  <button onClick={() => copyCmd(e.linux)} className="group min-w-0 rounded-lg border border-edge/60 bg-black/30 px-3 py-2 text-left font-mono text-[12px] text-info transition-all hover:border-info/50">
                    <span className="text-[9px] uppercase text-grey">linux · {e.desc}</span>
                    <div className="mt-0.5 break-all">{e.linux}</div>
                  </button>
                  <button onClick={() => copyCmd(e.win)} className="group min-w-0 rounded-lg border border-edge/60 bg-black/30 px-3 py-2 text-left font-mono text-[12px] text-warn transition-all hover:border-warn/50">
                    <span className="text-[9px] uppercase text-grey">windows</span>
                    <div className="mt-0.5 break-all">{e.win}</div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      ) : tab === 'revshells' ? (
        <Reveal>
          <div className="card mt-4 overflow-hidden">
            <div className="border-b border-edge bg-black/30 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-grey">
              {shellsFiltered.length} shells · sustituye ATTACKER_IP y el puerto 4444
            </div>
            <div className="divide-y divide-edge/50">
              {shellsFiltered.map((s, i) => (
                <div key={i} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-acento/5">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-acento">{s.name}</span>
                    <div className="mt-1 break-all font-mono text-[12px] text-ink">{s.cmd}</div>
                  </div>
                  <CopyBtn text={s.cmd.replace(/ATTACKER_IP/g, '10.10.14.1')} label="copiar" className="opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      ) : (
        sections[tab].data.map((cat, ci) => (
          <Reveal key={cat.name} delay={Math.min(ci * 0.04, 0.3)}>
            <div className="card mt-4 overflow-hidden">
              <div className="flex items-center justify-between border-b border-edge bg-black/30 px-4 py-2.5">
                <span className="font-mono text-[11px] uppercase tracking-widest text-acento">{cat.name}</span>
                <Badge tone="neutral">{cat.items.length} comandos</Badge>
              </div>
              <div className="divide-y divide-edge/50">
                {cat.items.map((item, i) => (
                  <div key={i} className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-acento/5">
                    <span className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-ink">{item.cmd}</span>
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
