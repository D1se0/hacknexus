import { useMemo, useState } from 'react'
import { MonitorCog, Check } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, CopyBlock, InfoBanner, useToast } from '../components/ui'

interface Tweak {
  id: string
  group: 'privacidad' | 'telemetría' | 'rendimiento' | 'explorer' | 'hardening'
  title: string
  why: string
  path: string
  value: string
  data: string
  type: 'REG_DWORD' | 'REG_SZ' | 'REG_BINARY'
  revert: string
  risk?: string
}

const TWEAKS: Tweak[] = [
  // telemetría
  { id: 'tel-min', group: 'telemetría', title: 'telemetría al mínimo (0 en Pro+, 1 en Home)', why: 'Windows envía diagnóstico completo por defecto; al mínimo solo errores básicos', path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', value: 'AllowTelemetry', data: '0', type: 'REG_DWORD', revert: 'borra el valor (GPO deja de aplicar)' },
  { id: 'tel-ads', group: 'telemetría', title: 'sin ID de publicidad', why: 'las apps UWP lo usan para perfilarte', path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', value: 'Enabled', data: '0', type: 'REG_DWORD', revert: 'Enabled=1' },
  { id: 'tel-tips', group: 'telemetría', title: 'sin sugerencias ni welcome experience', why: 'menos procesos de fondo y menos ruido', path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager', value: 'SubscribedContent-338389Enabled', data: '0', type: 'REG_DWORD', revert: 'valor a 1', risk: 'desactiva las "sugerencias" de la pantalla de bloqueo también' },
  { id: 'tel-cortana', group: 'telemetría', title: 'apagar Cortana / búsqueda en la nube', why: 'el buscador de inicio deja de enviar keystrokes a Bing', path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', value: 'AllowCloudSearch', data: '0', type: 'REG_DWORD', revert: 'AllowCloudSearch=1' },
  // privacidad
  { id: 'priv-activity', group: 'privacidad', title: 'sin historial de actividad (timeline)', why: 'el timeline guarda qué apps/ficheros usas, incluso sincronizado con tu cuenta MS', path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', value: 'EnableActivityFeed', data: '0', type: 'REG_DWORD', revert: 'EnableActivityFeed=1' },
  { id: 'priv-loc', group: 'privacidad', title: 'bloquear ubicación a apps de escritorio', why: 'Control de ubicación heredado que muchas appslegacy consultan', path: 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', value: 'DisableLocation', data: '1', type: 'REG_DWORD', revert: 'DisableLocation=0' },
  { id: 'priv-cam-mic', group: 'privacidad', title: 'aviso global de cámara/micro (audit)', why: 'consulta qué apps tienen acceso: útil como auditoría (no bloquea)', path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone', value: 'Value', data: 'Deny', type: 'REG_SZ', revert: 'Value=Allow', risk: 'bloquea el micro a las apps clásicas; Teams/Zoom UWP usan otra ruta' },
  // rendimiento
  { id: 'perf-menu', group: 'rendimiento', title: 'menú contextual instantáneo (sin delay)', why: 'elimina el delay de 400ms al abrir MenúSegundario en Explorer', path: 'HKEY_CURRENT_USER\\Control Panel\\Desktop', value: 'MenuShowDelay', data: '0', type: 'REG_SZ', revert: 'MenuShowDelay=400' },
  { id: 'perf-startup', group: 'rendimiento', title: 'arranque sin apps precargadas', why: 'desactiva el "Startup Boost" que precarga procesos', path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\Startup', value: 'StartupBoostEnabled', data: '0', type: 'REG_DWORD', revert: 'valor a 1' },
  { id: 'perf-hibernate', group: 'rendimiento', title: 'hibernación con fichero reducido (50%)', why: 'hiberfil.sys pasa de 75% a 50% de la RAM', path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power', value: 'HiberbootEnabled', data: '0', type: 'REG_DWORD', revert: 'HiberbootEnabled=1', risk: 'el fast startup se desactiva: arranque completo (más lento pero más limpio)' },
  // explorer
  { id: 'exp-ext', group: 'explorer', title: 'mostrar extensiones de archivo', why: 'imprescindible para no ejecutar "factura.pdf.exe"', path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', value: 'HideFileExt', data: '0', type: 'REG_DWORD', revert: 'HideFileExt=1' },
  { id: 'exp-hidden', group: 'explorer', title: 'mostrar ficheros ocultos y del sistema', why: 'transparencia total en lo que hay en disco', path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', value: 'Hidden', data: '1', type: 'REG_DWORD', revert: 'Hidden=2' },
  { id: 'exp-fullpath', group: 'explorer', title: 'ruta completa en la barra de título', why: 'sabes SIEMPRE dónde estás: evita borrados en la carpeta equivocada', path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CabinetState', value: 'FullPath', data: '1', type: 'REG_DWORD', revert: 'FullPath=0' },
  { id: 'exp-bing', group: 'explorer', title: 'sin búsqueda web en el menú inicio', why: 'el buscador deja de abrir Edge con Bing al buscar algo local', path: 'HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', value: 'DisableSearchBoxSuggestions', data: '1', type: 'REG_DWORD', revert: 'borra el valor' },
  // hardening
  { id: 'hard-lsa', group: 'hardening', title: 'protección LSA (Pass-the-Hash parcial)', why: 'LSA corre como PPL: los hashes en memoria son más difíciles de robar', path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa', value: 'RunAsPPL', data: '1', type: 'REG_DWORD', revert: 'RunAsPPL=0', risk: 'algunos drivers de cifrado antiguos fallan' },
  { id: 'hard-wdigest', group: 'hardening', title: 'WDigest OFF (no guardar texto plano)', why: 'en Win8.1+ ya está off; en hosts viejos guarda credenciales en claro en LSASS', path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\SecurityProviders\\WDigest', value: 'UseLogonCredential', data: '0', type: 'REG_DWORD', revert: 'UseLogonCredential=1' },
  { id: 'hard-usb', group: 'hardening', title: 'bloquear instalación de USB storage', why: 'anti exfiltración y anti BadUSB en puestos sensibles', path: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR', value: 'Start', data: '4', type: 'REG_DWORD', revert: 'Start=3', risk: 'los pendrives dejan de montar (teclados/ratones USB siguen OK)' },
  { id: 'hard-rdp', group: 'hardening', title: 'bloquear conexión RDP entrante', why: 'si no usas escritorio remoto, ciérralo: el 90% de los ransomware entra por RDP', path: 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server', value: 'fDenyTSConnections', data: '1', type: 'REG_DWORD', revert: 'fDenyTSConnections=0' },
]

const GROUPS = ['privacidad', 'telemetría', 'rendimiento', 'explorer', 'hardening'] as const

function buildRegFile(selected: string[]): string {
  const L: string[] = ['Windows Registry Editor Version 5.00', '', '; generado por HackNexus — revisa cada bloque antes de fusionar', '; revertir: usa el comando de revert de cada tweak o restaura backup', '']
  let lastGroup = ''
  for (const t of TWEAKS.filter((x) => selected.includes(x.id))) {
    if (t.group !== lastGroup) {
      L.push(`; ═══ ${t.group.toUpperCase()} ═══`)
      lastGroup = t.group
    }
    L.push(`; ${t.title}`)
    L.push(`[${t.path.replace(/HKLM/, 'HKEY_LOCAL_MACHINE').replace(/HKCU/, 'HKEY_CURRENT_USER')}]`)
    L.push(`"${t.value}"=${t.type === 'REG_DWORD' ? `dword:${Number(t.data).toString(16).padStart(8, '0')}` : t.type === 'REG_SZ' ? `"${t.data}"` : `hex:${t.data}`}`)
    L.push('')
  }
  return L.join('\n')
}

export default function Regtweaks() {
  const [selected, setSelected] = useState<string[]>(() => TWEAKS.filter((t) => t.group !== 'hardening').map((t) => t.id))
  const toast = useToast()

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const regFile = useMemo(() => buildRegFile(selected), [selected])

  const groupAll = (g: string) => {
    const ids = TWEAKS.filter((t) => t.group === g).map((t) => t.id)
    const allOn = ids.every((id) => selected.includes(id))
    setSelected((s) => (allOn ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]))
  }

  return (
    <div>
      <ToolHeader icon={MonitorCog} title="Windows Registry Tweaks" desc="Catálogo de tweaks de telemetría, privacidad, rendimiento y hardening con su ruta exacta del registro, valor, reversión y export a .reg listo para fusionar" />

      <InfoBanner>
        <b>Cada tweak indica qué hace, cómo revertirlo y qué puede romper.</b> Exporta el .reg y ejecútalo con doble clic (pide admin en claves HKLM). Antes de tocar: <span className="font-mono">reg export "HKLM\SOFTWARE" backup.reg</span> — el registro es la configuración real de Windows y un valor mal puesto puede dejar cosas raras.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 flex flex-wrap gap-2 p-4">
          {GROUPS.map((g) => (
            <Button key={g} variant="ghost" onClick={() => groupAll(g)} className="px-3 py-2 text-xs">{g}: on/off</Button>
          ))}
          <span className="ml-auto font-mono text-[11px] text-grey">{selected.length}/{TWEAKS.length} activos</span>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          {GROUPS.map((g) => (
            <div key={g} className="mb-6 last:mb-0">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">{g}</h3>
              <div className="space-y-2">
                {TWEAKS.filter((t) => t.group === g).map((t) => {
                  const on = selected.includes(t.id)
                  return (
                    <div key={t.id} className={`rounded-xl border p-3 transition-colors ${on ? 'border-acento/40 bg-acento/5' : 'border-edge'}`}>
                      <div className="flex flex-wrap items-start gap-3">
                        <button onClick={() => toggle(t.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? 'border-acento bg-acento/20 text-acento' : 'border-grey/40'}`}>
                          {on && <Check size={12} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[12px] text-white">{t.title}</span>
                            <Badge tone="neutral">{t.type}</Badge>
                            {t.risk && <Badge tone="warn">rompe algo</Badge>}
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-grey">{t.why}</p>
                          <details className="mt-1.5">
                            <summary className="cursor-pointer font-mono text-[10px] text-info">detalle técnico</summary>
                            <div className="mt-1.5 space-y-1 rounded-lg border border-edge bg-black/30 p-2.5">
                              <code className="block break-all font-mono text-[10.5px] text-acento">[{t.path}]</code>
                              <code className="block font-mono text-[10.5px] text-ink">"{t.value}"={t.data}</code>
                              <code className="block font-mono text-[10.5px] text-warn">revertir: {t.revert}</code>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">fichero .reg ({selected.length} tweaks)</h3>
          <CopyBlock text={regFile} maxH="460" />
          <p className="mt-3 font-mono text-[10px] text-grey/70">aplicar: guarda como tweaks.reg y doble clic · o <span className="text-info">reg import tweaks.reg</span> · deshacer con reg export previo</p>
        </div>
      </Reveal>
    </div>
  )
}
