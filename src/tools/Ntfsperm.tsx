import { useMemo, useState } from 'react'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { FolderLock, Plus, Trash2 } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, Select, Toggle, CopyBlock, InfoBanner } from '../components/ui'
import { buildIcaclsCommands, aclSummary, RIGHT_INFO, INHERIT_INFO, PRINCIPALS, ACE_PRESETS, EQUIV_PERMS, CHOWN_EQUIV, type Ace, type AclRight, type AclInherit, type IcaclsOpts } from '../lib/icacls'

const RIGHTS: AclRight[] = ['F', 'M', 'RX', 'R', 'W', 'D', 'WDAC', 'WO', 'X', 'DE']
const INHERITS: AclInherit[] = ['OI', 'CI', 'IO', 'NP']

export default function Ntfsperm() {
  const [path, setPath] = useState('C:\\Compartido\\Proyecto')
  const [recursive, setRecursive] = useState(true)
  const [resetInheritance, setResetInheritance] = useState(false)
  const [disableInheritanceKeep, setDisableInheritance] = useState(false)
  const [aces, setAces] = useState<Ace[]>([
    { type: 'grant', principal: 'Usuarios autenticados', right: 'M', inherit: ['OI', 'CI'] },
    { type: 'grant', principal: 'SYSTEM', right: 'F', inherit: ['OI', 'CI'] },
    { type: 'grant', principal: 'Administradores', right: 'F', inherit: ['OI', 'CI'] },
  ])

  const opts: IcaclsOpts = useMemo(() => ({ path, recursive, resetInheritance, disableInheritanceKeep, aces }), [path, recursive, resetInheritance, disableInheritanceKeep, aces])
  const commands = useMemo(() => buildIcaclsCommands(opts), [opts])
  const verdicts = useMemo(() => aclSummary(opts), [opts])

  const patchAce = (i: number, p: Partial<Ace>) => setAces((a) => a.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const addAce = () => setAces((a) => [...a, { type: 'grant', principal: 'Usuarios', right: 'RX', inherit: ['OI', 'CI'] }])

  const cmdText = commands.join('\n')
  const auditCmd = `icacls "${path}"   # ver ACL actual
Get-Acl "${path}" | fl Owner,AccessToString   # versión PowerShell
icacls "${path}" /save backup-acl.txt /t /c   # respaldar antes de tocar
# restaurar:  icacls "${path}" /restore backup-acl.txt`

  return (
    <div>
      <ToolHeader icon={FolderLock} title="Permisos NTFS (icacls)" desc="Generador de comandos icacls con ACEs, herencias y presets — más traducción chmod ↔ icacls para entornos mixtos" />
      <SnapshotButtons
        toolId="ntfsperm"
        label="ruta + ACEs"
        getData={() => ({ path, recursive, resetInheritance, disableInheritanceKeep, aces })}
        onLoad={(d) => { if (d.path) setPath(d.path); if (d.aces) setAces(d.aces); if (d.recursive !== undefined) setRecursive(d.recursive); if (d.resetInheritance !== undefined) setResetInheritance(d.resetInheritance); if (d.disableInheritanceKeep !== undefined) setDisableInheritance(d.disableInheritanceKeep) }}
      />

      <InfoBanner>
        NTFS no tiene octal ni SUID: usa <b>ACEs</b> (permitir/denegar por usuario o grupo) con herencia a ficheros (OI) y carpetas (CI). Las de <b>denegación se evalúan primero</b> y ganan siempre: úsalas con cuentagotas. Si vienes de Linux, mira la tabla de equivalencias del final.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ruta" hint="C:\carpeta o C:\carpeta\fichero">
              <TextInput value={path} onChange={(e) => setPath(e.target.value)} className="font-mono" />
            </Field>
            <div className="flex flex-wrap items-end gap-5 pb-1">
              <Toggle checked={recursive} onChange={setRecursive} label="recursivo (/t)" />
              <Toggle checked={resetInheritance} onChange={setResetInheritance} label="/inheritance:r (corta herencia)" />
              <Toggle checked={disableInheritanceKeep} onChange={setDisableInheritance} label="/inheritance:d (convierte a explícitos)" />
            </div>
          </div>

          <div className="mt-5 border-t border-edge/60 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">ACEs (permisos explícitos)</h3>
              <Button variant="ghost" onClick={addAce} className="gap-2 px-3 py-1.5 text-xs"><Plus size={13} /> añadir ACE</Button>
            </div>

            <div className="space-y-3">
              {aces.map((a, i) => (
                <div key={i} className="grid items-end gap-3 rounded-xl border border-edge bg-black/30 p-3 md:grid-cols-[90px_1fr_110px_1fr_44px]">
                  <Field label="tipo">
                    <Select
                      value={a.type}
                      onChange={(e) => patchAce(i, { type: e.target.value as Ace['type'] })}
                      options={[{ value: 'grant', label: 'grant' }, { value: 'deny', label: 'deny' }]}
                    />
                  </Field>
                  <Field label="principal">
                    <TextInput list="principals" value={a.principal} onChange={(e) => patchAce(i, { principal: e.target.value })} className="font-mono" />
                  </Field>
                  <Field label="derecho" hint={RIGHT_INFO[a.right].label}>
                    <Select value={a.right} onChange={(e) => patchAce(i, { right: e.target.value as AclRight })} options={RIGHTS.map((r) => ({ value: r, label: r }))} />
                  </Field>
                  <Field label="herencia">
                    <div className="flex flex-wrap gap-1.5">
                      {INHERITS.map((ih) => (
                        <button
                          key={ih}
                          title={INHERIT_INFO[ih]}
                          onClick={() => patchAce(i, { inherit: a.inherit.includes(ih) ? a.inherit.filter((x) => x !== ih) : [...a.inherit, ih] })}
                          className={`rounded border px-2 py-1.5 font-mono text-[11px] transition-all ${a.inherit.includes(ih) ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}
                        >
                          {ih}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Button variant="danger" onClick={() => setAces((arr) => arr.filter((_, j) => j !== i))} className="px-2 py-2"><Trash2 size={14} /></Button>
                </div>
              ))}
            </div>
            <datalist id="principals">{PRINCIPALS.map((p) => <option key={p} value={p} />)}</datalist>

            <div className="mt-4 flex flex-wrap gap-2">
              {ACE_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant="ghost"
                  title={p.desc}
                  onClick={() => { setAces(p.aces); setPath(p.path) }}
                  className="gap-2 px-3 py-1.5 text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CopyBlock text={cmdText} label="comandos icacls" maxH="max-h-72" />
          <div className="space-y-4">
            <CopyBlock text={auditCmd} label="auditar y respaldar" maxH="max-h-48" />
            <div className="space-y-2">
              {verdicts.map((v, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 font-mono text-xs ${v.tone === 'bad' ? 'border-bad/40 bg-bad/10 text-bad' : v.tone === 'warn' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-ok/40 bg-ok/10 text-ok'}`}>
                  <span className="shrink-0">{v.tone === 'bad' ? '✗' : v.tone === 'warn' ? '⚠' : '✓'}</span>
                  <span className="break-words">{v.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">derechos y su significado</h3>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead><tr className="text-left text-grey/60"><th className="pb-2 pr-4">letra</th><th className="pb-2 pr-4">nombre</th><th className="pb-2 pr-4">qué permite</th><th className="pb-2">≈ chmod</th></tr></thead>
              <tbody className="divide-y divide-edge/60">
                {RIGHTS.map((r) => (
                  <tr key={r}>
                    <td className="py-1.5 pr-4 font-bold text-acento">{r}</td>
                    <td className="py-1.5 pr-4 text-ink">{RIGHT_INFO[r].label}</td>
                    <td className="py-1.5 pr-4 text-grey">{RIGHT_INFO[r].desc}</td>
                    <td className="py-1.5 text-grey/80">{RIGHT_INFO[r].octalLike}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-1 font-mono text-[11px] uppercase tracking-widest text-grey">equivalencias chmod ↔ icacls</h3>
          <p className="mb-3 font-mono text-[11px] text-grey/60">Aproximaciones para quien administra ambos mundos: NTFS no tiene octal, pero el espíritu es traducible.</p>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead><tr className="text-left text-grey/60"><th className="pb-2 pr-4">octal</th><th className="pb-2 pr-4">Linux</th><th className="pb-2 pr-4">Windows (icacls)</th><th className="pb-2">nota</th></tr></thead>
              <tbody className="divide-y divide-edge/60">
                {EQUIV_PERMS.map((e) => (
                  <tr key={e.octal}>
                    <td className="py-2 pr-4 font-bold text-acento">{e.octal}</td>
                    <td className="py-2 pr-4 text-ink">{e.linux}</td>
                    <td className="py-2 pr-4 break-all text-info">{e.icacls}</td>
                    <td className="py-2 text-grey">{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">chown/setfacl ↔ icacls</h3>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead><tr className="text-left text-grey/60"><th className="pb-2 pr-4">Linux</th><th className="pb-2 pr-4">Windows</th><th className="pb-2">desc</th></tr></thead>
              <tbody className="divide-y divide-edge/60">
                {CHOWN_EQUIV.map((e) => (
                  <tr key={e.linux}>
                    <td className="py-2 pr-4 text-ink">{e.linux}</td>
                    <td className="py-2 pr-4 break-all text-info">{e.win}</td>
                    <td className="py-2 text-grey">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[11px] text-grey/70">💡 Pentest: <span className="text-info">icacls "C:\Program Files\app\bin.exe"</span> en un binario de servicio — si tu usuario tiene W/F ahí, reemplázalo y reinicia el servicio = privesc. El preset "⚠ mundo escribible" sirve para demostrar el antipatrón en formación.</p>
        </div>
      </Reveal>
    </div>
  )
}
