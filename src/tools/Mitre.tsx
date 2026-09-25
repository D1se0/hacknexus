import { useMemo, useState } from 'react'
import { Crosshair, Search, FileDown, Layers3 } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, CopyBlock, InfoBanner, Field, TextInput, useToast } from '../components/ui'
import { download } from '../lib/util'

/* Matriz enterprise reducida: tácticas → técnicas más relevantes (ID · nombre · subtexto) */
const MATRIX: { tactic: string; color: string; techs: { id: string; name: string }[] }[] = [
  {
    tactic: 'Reconnaissance', color: '#7d9488',
    techs: [
      { id: 'T1595', name: 'Active Scanning' }, { id: 'T1592', name: 'Gather Victim Host Info' },
      { id: 'T1589', name: 'Gather Victim Identity Info' }, { id: 'T1590', name: 'Gather Victim Network Info' },
      { id: 'T1593', name: 'Search Open Websites/Domains' }, { id: 'T1597', name: 'Search Closed Sources' },
    ],
  },
  {
    tactic: 'Resource Development', color: '#8b9c8f',
    techs: [
      { id: 'T1583', name: 'Acquire Infrastructure' }, { id: 'T1584', name: 'Compromise Infrastructure' },
      { id: 'T1587', name: 'Develop Capabilities' }, { id: 'T1588', name: 'Obtain Capabilities' },
    ],
  },
  {
    tactic: 'Initial Access', color: '#2ee88a',
    techs: [
      { id: 'T1566', name: 'Phishing' }, { id: 'T1190', name: 'Exploit Public-Facing App' },
      { id: 'T1133', name: 'External Remote Services' }, { id: 'T1078', name: 'Valid Accounts' },
      { id: 'T1200', name: 'Hardware Additions' }, { id: 'T1091', name: 'Replication Through Removable Media' },
    ],
  },
  {
    tactic: 'Execution', color: '#54d9a0',
    techs: [
      { id: 'T1059', name: 'Command & Scripting Interpreter' }, { id: 'T1053', name: 'Scheduled Task/Job' },
      { id: 'T1106', name: 'Native API' }, { id: 'T1204', name: 'User Execution' },
      { id: 'T1569', name: 'System Services' }, { id: 'T1129', name: 'Shared Modules' },
    ],
  },
  {
    tactic: 'Persistence', color: '#fbbf24',
    techs: [
      { id: 'T1547', name: 'Boot or Logon Autostart' }, { id: 'T1136', name: 'Create Account' },
      { id: 'T1543', name: 'Create/Modify System Process' }, { id: 'T1574', name: 'Hijack Execution Flow' },
      { id: 'T1505', name: 'Server Software Component' }, { id: 'T1098', name: 'Account Manipulation' },
    ],
  },
  {
    tactic: 'Privilege Escalation', color: '#f59e0b',
    techs: [
      { id: 'T1068', name: 'Exploitation for Priv. Esc.' }, { id: 'T1548', name: 'Abuse Elevation Control' },
      { id: 'T1055', name: 'Process Injection' }, { id: 'T1134', name: 'Access Token Manipulation' },
    ],
  },
  {
    tactic: 'Defense Evasion', color: '#c084fc',
    techs: [
      { id: 'T1027', name: 'Obfuscated Files/Info' }, { id: 'T1070', name: 'Indicator Removal' },
      { id: 'T1562', name: 'Impair Defenses' }, { id: 'T1036', name: 'Masquerading' },
      { id: 'T1218', name: 'System Binary Proxy Exec' }, { id: 'T1497', name: 'Virtualization/Sandbox Evasion' },
    ],
  },
  {
    tactic: 'Credential Access', color: '#f472b6',
    techs: [
      { id: 'T1003', name: 'OS Credential Dumping' }, { id: 'T1110', name: 'Brute Force' },
      { id: 'T1555', name: 'Credentials from Stores' }, { id: 'T1552', name: 'Unsecured Credentials' },
      { id: 'T1056', name: 'Input Capture' }, { id: 'T1539', name: 'Steal Web Session Cookie' },
    ],
  },
  {
    tactic: 'Discovery', color: '#60a5fa',
    techs: [
      { id: 'T1087', name: 'Account Discovery' }, { id: 'T1082', name: 'System Info Discovery' },
      { id: 'T1046', name: 'Network Service Discovery' }, { id: 'T1018', name: 'Remote System Discovery' },
      { id: 'T1057', name: 'Process Discovery' }, { id: 'T1012', name: 'Query Registry' },
    ],
  },
  {
    tactic: 'Lateral Movement', color: '#818cf8',
    techs: [
      { id: 'T1021', name: 'Remote Services (SMB/RDP/SSH)' }, { id: 'T1550', name: 'Use Alternate Auth Material' },
      { id: 'T1570', name: 'Lateral Tool Transfer' }, { id: 'T1210', name: 'Exploitation of Remote Services' },
    ],
  },
  {
    tactic: 'Collection', color: '#38bdf8',
    techs: [
      { id: 'T1114', name: 'Email Collection' }, { id: 'T1113', name: 'Screen Capture' },
      { id: 'T1005', name: 'Data from Local System' }, { id: 'T1560', name: 'Archive Collected Data' },
    ],
  },
  {
    tactic: 'Command & Control', color: '#f97316',
    techs: [
      { id: 'T1071', name: 'Application Layer Protocol' }, { id: 'T1090', name: 'Proxy' },
      { id: 'T1572', name: 'Protocol Tunneling' }, { id: 'T1105', name: 'Ingress Tool Transfer' },
      { id: 'T1008', name: 'Fallback Channels' }, { id: 'T1101', name: 'Web Service (DNS/OAuth)' },
    ],
  },
  {
    tactic: 'Exfiltration', color: '#ef4444',
    techs: [
      { id: 'T1041', name: 'Exfiltration Over C2' }, { id: 'T1048', name: 'Exfiltration Over Alt Protocol' },
      { id: 'T1567', name: 'Exfiltration Over Web Service' }, { id: 'T1029', name: 'Scheduled Transfer' },
    ],
  },
  {
    tactic: 'Impact', color: '#dc2626',
    techs: [
      { id: 'T1486', name: 'Data Encrypted for Impact' }, { id: 'T1490', name: 'Inhibit System Recovery' },
      { id: 'T1565', name: 'Data Manipulation' }, { id: 'T1499', name: 'Endpoint DoS' },
      { id: 'T1489', name: 'Service Stop' },
    ],
  },
]

export default function Mitre() {
  const [query, setQuery] = useState('')
  const [covered, setCovered] = useState<Set<string>>(new Set())
  const toast = useToast()

  const total = useMemo(() => MATRIX.reduce((a, t) => a + t.techs.length, 0), [])

  const toggle = (id: string) =>
    setCovered((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return MATRIX
    return MATRIX.map((t) => ({ ...t, techs: t.techs.filter((x) => x.id.toLowerCase().includes(q) || x.name.toLowerCase().includes(q)) })).filter((t) => t.techs.length > 0)
  }, [query])

  const exportLayer = () => {
    const techniques = [...covered].sort().map((id) => ({ techniqueID: id, tactic: undefined as string | undefined, score: 100, comment: 'cobertura detectada en el ejercicio' }))
    // anclar cada técnica a su táctica
    const resolved = techniques.map((t) => {
      const tac = MATRIX.find((m) => m.techs.some((x) => x.id === t.techniqueID))
      return { ...t, tactic: tac ? tac.tactic.replace(/ /g, '-') : undefined }
    })
    const layer = {
      name: 'HackNexus coverage',
      versions: { attack: '15', navigator: '5.1', layer: '4.5' },
      domain: 'enterprise-attack',
      description: 'Capa generada localmente con HackNexus MITRE Navigator',
      filters: { platforms: ['Windows', 'Linux', 'macOS'] },
      techniques: resolved,
      gradient: { colors: ['#2ee88aff', '#dc2626ff'], minValue: 0, maxValue: 100 },
      legendItems: [{ label: 'Cubierto', color: '#2ee88a', score: 100 }],
    }
    download('hacknexus-attack-layer.json', JSON.stringify(layer, null, 2), 'application/json')
    toast('capa exportada — impórtala en mitre-attack.github.io/attack-navigator')
  }

  return (
    <div>
      <ToolHeader icon={Crosshair} title="MITRE ATT&CK Navigator" desc="Matriz enterprise compacta: explora tácticas/técnicas, marca la cobertura de tu ejercicio y exporta una capa JSON para el Navigator oficial" />

      <InfoBanner>
        ATT&CK organiza el comportamiento adversario en <b>tácticas</b> (el porqué) y <b>técnicas</b> (el cómo). Úsalo para mapear hallazgos de un informe, planear una detección o cubrir huecos de un ejercicio red/blue team. La exportación genera una capa compatible con el <b>ATT&CK Navigator oficial</b> (100% local).
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <div className="flex flex-wrap items-end gap-4">
            <Field label="buscar técnica" className="min-w-56 flex-1">
              <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="T1003, dumping, phishing…" />
            </Field>
            <div className="flex items-center gap-2 pb-1">
              <Search size={14} className="text-grey" />
              <Badge tone="accent">{covered.size}/{total} cubiertas</Badge>
              <Button variant="ghost" onClick={exportLayer} disabled={!covered.size} className="gap-2 px-3 py-1.5 text-xs">
                <FileDown size={13} /> exportar capa
              </Button>
              {covered.size > 0 && <Button variant="ghost" onClick={() => setCovered(new Set())} className="px-3 py-1.5 text-xs">limpiar</Button>}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {filtered.map((t) => (
          <Reveal key={t.tactic}>
            <div className="card flex h-full flex-col p-4">
              <h3 className="mb-3 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: t.color }}>
                <Layers3 size={12} /> {t.tactic}
              </h3>
              <div className="flex flex-1 flex-col gap-1.5">
                {t.techs.map((x) => {
                  const on = covered.has(x.id)
                  return (
                    <button
                      key={x.id}
                      onClick={() => toggle(x.id)}
                      title={`${x.id} — ${on ? 'quitar cobertura' : 'marcar cobertura'}`}
                      className={`rounded-lg border px-2 py-1.5 text-left font-mono text-[10.5px] leading-snug transition-all ${
                        on ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:border-edge hover:bg-black/30 hover:text-ink'}`}
                    >
                      <span className={on ? 'text-acento-bright' : 'text-grey/70'}>{x.id}</span> {x.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {covered.size > 0 && (
        <Reveal>
          <div className="card mt-6 p-6">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">cobertura marcada</h3>
            <CopyBlock text={[...covered].sort().join('  ')} label="technique IDs" maxH="max-h-32" />
            <p className="mt-2 font-mono text-[10px] text-grey">
              Pega los IDs en el Navigator oficial (navigator.attack.mitre.org → Open Existing Layer → upload) o descarga la capa y ábrela allí para verla coloreada sobre la matriz completa.
            </p>
          </div>
        </Reveal>
      )}
    </div>
  )
}
