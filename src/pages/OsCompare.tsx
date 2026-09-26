import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Laptop, Star, Check, X, Package, ExternalLink, ShieldCheck, Terminal, BookOpen, Sparkles, Monitor, Cpu, Compass } from 'lucide-react'
import { cn } from '../lib/util'
import { searchTasks, TASK_CATS, TASK_CAT_LABEL, type TaskEntry } from '../lib/taskguide'

type Nav = (id: string) => void
type Level = 'Principiante' | 'Intermedio' | 'Avanzado'
type Family = 'Debian-based' | 'Arch-based' | 'RHEL-based' | 'Independiente' | 'Windows'

interface OsRepo {
  name: string
  url: string
  desc: string
  badge?: 'del autor' | 'guía del autor' | 'comunidad'
}

interface OsDef {
  id: string
  name: string
  emoji: string
  family: Family
  base?: string
  tagline: string
  color: string
  glow: string
  level: Level
  popularity: number
  learningCurve: number
  stability: number
  tooling: number
  resources: number
  useCases: string[]
  pros: string[]
  cons: string[]
  tools: string[]
  repos: OsRepo[]
  verdict: string
  recommended?: boolean
}

const OS_LIST: OsDef[] = [
  {
    id: 'kali',
    name: 'Kali Linux',
    emoji: '🐉',
    family: 'Debian-based',
    tagline: 'El estándar de facto del pentesting: 600+ herramientas listas para usar',
    color: '#2ee88a',
    glow: 'rgba(46,232,138,0.14)',
    level: 'Intermedio',
    popularity: 95,
    learningCurve: 60,
    stability: 78,
    tooling: 100,
    resources: 95,
    useCases: ['Pentesting web y de red', 'CTFs y labs (HTB, THM)', 'Auditorías WiFi', 'Formación de ciberseguridad'],
    pros: ['600+ herramientas preinstaladas', 'Documentación y comunidad enormes', 'Metapackages para instalar solo lo que necesitas', 'Versiones bare-metal, VM, WSL, Docker y ARM', 'Undercover mode para trabajar discretamente'],
    cons: ['No pensada para uso diario de escritorio', 'Corre como root por defecto (histórico, ahora mejorado)', 'Puede ser abrumadora para principiantes absolutos'],
    tools: ['nmap', 'burpsuite', 'metasploit', 'sqlmap', 'hydra', 'wireshark', 'aircrack-ng', 'john', 'hashcat', 'gobuster'],
    repos: [
      { name: 'D1se0/kali-environment-install', url: 'https://github.com/D1se0/kali-environment-install', desc: 'Instalador y script de entorno personalizado de Kali listo tras formatear: i3, herramientas y dotfiles en minutos', badge: 'del autor' },
      { name: 'D1se0/environment-kali-nordic', url: 'https://github.com/D1se0/environment-kali-nordic', desc: 'Rice de Kali con tema Nordic — estética limpia y oscura para trabajar cómodo sin perder funcionalidad', badge: 'del autor' },
      { name: 'd1se0 blog: guía de entorno Kali', url: 'https://d1se0.github.io/blog_hacking/view.html?enviroment=kalilinux', desc: 'Guía paso a paso con capturas para montar el entorno completo de Kali del autor', badge: 'guía del autor' },
    ],
    verdict: 'La elección por defecto si empiezas o necesitas un arsenal completo ya montado. Con los scripts de entorno del autor pasa de "instalación fresca" a "estación lista" en una tarde.',
    recommended: true,
  },
  {
    id: 'parrot',
    name: 'Parrot Security OS',
    emoji: '🦜',
    family: 'Debian-based',
    base: 'Debian',
    tagline: 'Kali más ligero y privado, con herramientas de anonimato integradas',
    color: '#5fc9f8',
    glow: 'rgba(95,201,248,0.14)',
    level: 'Intermedio',
    popularity: 62,
    learningCurve: 55,
    stability: 80,
    tooling: 88,
    resources: 78,
    useCases: ['Pentesting en máquinas modestas', 'Navegación anónima (AnonSurf integrado)', 'Forense y análisis'],
    pros: ['Más ligera que Kali (MATE por defecto)', 'AnonSurf y herramientas de privacidad de serie', 'Sandboxing habitual de apps (firejail)', 'Buena opción en VMs con poca RAM'],
    cons: ['Menos comunidad y documentación que Kali', 'Algunas herramientas llegan más tarde', 'Menos metapackages oficiales'],
    tools: ['metasploit', 'burpsuite', 'anon surf', 'airgeddon', 'radare2', 'wifite', 'burp', 'volatility'],
    repos: [
      { name: 'kali-environment-install (compatible)', url: 'https://github.com/D1se0/kali-environment-install', desc: 'Muchos de los scripts del entorno de Kali del autor funcionan sobre Parrot por su base Debian compartida', badge: 'del autor' },
    ],
    verdict: 'Si Kali te va justa de recursos o quieres privacidad integrada sin configurar nada, Parrot es tu distro. Mismo arsenal Debian, enfoque más discreto.',
  },
  {
    id: 'arch',
    name: 'Arch Linux (+ BlackArch)',
    emoji: '🏹',
    family: 'Arch-based',
    tagline: 'Rolling release donde cada paquete lo eliges tú: control total',
    color: '#7aa2f7',
    glow: 'rgba(122,162,247,0.14)',
    level: 'Avanzado',
    popularity: 78,
    learningCurve: 95,
    stability: 62,
    tooling: 92,
    resources: 85,
    useCases: ['Estación de trabajo personal + arsenal', 'Aprender Linux de verdad', 'Rice de escritorio (i3, dwm, hyprland)'],
    pros: ['Rolling release: siempre lo último', 'AUR: cualquier herramienta existe como paquete', 'BlackArch añade 2800+ tools de seguridad sobre Arch', 'Sistema mínimo: tú decides cada componente', 'La wiki de Arch es LA referencia de Linux'],
    cons: ['Instalación manual (por diseño)', 'Un -Syu descuidado puede romper cosas', 'Requiere mantenimiento y lectura de news'],
    tools: ['todo vía AUR/BlackArch: nmap, burp, wireshark, metasploit, exploitdb, binwalk…'],
    repos: [
      { name: 'D1se0/Arch_i3_d1se0_Environment', url: 'https://github.com/D1se0/Arch_i3_d1se0_Environment', desc: 'Entorno completo Arch + i3 del autor: dotfiles, scripts de instalación y configuración lista para trabajar y hacer hacking', badge: 'del autor' },
      { name: 'BlackArch', url: 'https://blackarch.org', desc: 'Repositorio pen-testing sobre Arch: 2800+ herramientas integrables con un script oficial', badge: 'comunidad' },
    ],
    verdict: 'Para quien quiere UNA máquina para todo: trabajo diario, ricing bonito y arsenal de seguridad. La curva es real, pero los dotfiles del autor te ahorran semanas.',
    recommended: true,
  },
  {
    id: 'ubuntu',
    name: 'Ubuntu / Debian estable',
    emoji: '🟠',
    family: 'Debian-based',
    tagline: 'La base sólida: servidores, SOC y aprendizaje sin sorpresas',
    color: '#e95420',
    glow: 'rgba(233,84,32,0.14)',
    level: 'Principiante',
    popularity: 92,
    learningCurve: 35,
    stability: 92,
    tooling: 55,
    resources: 98,
    useCases: ['Uso diario y oficina', 'Servidores y homelab', 'Base para instalar tools a mano y aprender qué hace cada una'],
    pros: ['La distro más documentada del mundo', 'LTS con 5 años de soporte', 'Todo software tiene binarios para Ubuntu/Debian', 'Ideal como sistema principal donde añadir tools selectivamente'],
    cons: ['Sin herramientas de seguridad preinstaladas', 'Paquetes de seguridad a veces desactualizados', 'No está "orientada" a ofensiva'],
    tools: ['instalables: nmap, wireshark, hydra… (todo está en los repos o APT/PPA)'],
    repos: [
      { name: 'D1se0/environment-ubuntu-installer', url: 'https://github.com/D1se0/environment-ubuntu-installer', desc: 'Instalador de entorno personalizado para Ubuntu del autor: de instalación limpia a estación de trabajo completa', badge: 'del autor' },
    ],
    verdict: 'Perfecta como PRIMER Linux y como sistema principal estable. Instala las herramientas de hacking a mano: aprenderás el doble que con todo preinstalado.',
  },
  {
    id: 'winserver',
    name: 'Windows Server + AD',
    emoji: '🪟',
    family: 'Windows',
    tagline: 'El territorio de caza: donde viven el 80% de los entornos corporativos',
    color: '#0078d4',
    glow: 'rgba(0,120,212,0.14)',
    level: 'Avanzado',
    popularity: 88,
    learningCurve: 70,
    stability: 85,
    tooling: 60,
    resources: 90,
    useCases: ['Montar laboratorios AD (¡imprescindible para aprender!)', 'Simular entornos corporativos reales', 'Practicar ataques de dominio (Kerberoast, DCSync…)'],
    pros: ['Es el entorno real de las empresas: AD, GPO, SMB, Kerberos', 'PowerShell es una navaja suiza ofensiva y defensiva', 'Las evaluaciones ISO en Hyper-V/VirtualBox montan un lab en horas'],
    cons: ['No es una distro de pentesting: es el OBJETIVO de estudio', 'Licencias (aunque evaluaciones son gratis 180 días)', 'Requiere saber levantar DCs, DNS y trusts'],
    tools: ['PowerView', 'SharpHound', 'Rubeus', 'mimikatz (lab)', 'Sysinternals', 'PowerShell 7'],
    repos: [
      { name: 'GOAD (Game of Active Directory)', url: 'https://github.com/Orange-Cyberdefense/GOAD', desc: 'Laboratorio AD vulnerable con varios DCs para practicar ataques de dominio de forma legal', badge: 'comunidad' },
    ],
    verdict: 'No compite con las demás: las complementa. Tu Kali/Arch ataca, tu Windows Server es el laboratorio AD que hace que valga la pena aprender.',
  },
  {
    id: 'rhel',
    name: 'RHEL / CentOS Stream / Rocky',
    emoji: '🎩',
    family: 'RHEL-based',
    tagline: 'El estándar empresarial: SELinux, hardening y certificaciones',
    color: '#ee0000',
    glow: 'rgba(238,0,0,0.13)',
    level: 'Intermedio',
    popularity: 70,
    learningCurve: 65,
    stability: 95,
    tooling: 45,
    resources: 82,
    useCases: ['Servidores corporativos y banca', 'Aprender SELinux y hardening serio', 'Preparar certificaciones RHCSA/RHCE'],
    pros: ['SELinux configurado de verdad (no "apágalo y santas pascuas")', 'Ciclos de vida larguísimos y soporte empresarial', 'Rocky/Alma mantienen compatibilidad RHEL gratis', 'Es el UNIX-like que encontrarás en banca/telecos'],
    cons: ['Ecosistema de pentesting inexistente (y no es su objetivo)', 'Gestión por suscripción (RHEL dev gratis con límites)', 'Filosofía dnf/rpm distinta a la Debian que usa todo el mundo ofensivo'],
    tools: ['auditd', 'SELinux tools', 'firewalld', 'OpenSCAP (hardening y cumplimiento)'],
    repos: [],
    verdict: 'No es para atacar: es para DEFENDER y para entender los entornos que auditarás. SELinux bien configurado es un hallazgo de pentesting por sí solo.',
  },
  {
    id: 'tails',
    name: 'Tails',
    emoji: '🧅',
    family: 'Independiente',
    base: 'Debian',
    tagline: 'Sistema amnésico anti-forense: todo pasa por Tor, nada deja rastro',
    color: '#c084fc',
    glow: 'rgba(192,132,252,0.14)',
    level: 'Intermedio',
    popularity: 58,
    learningCurve: 45,
    stability: 75,
    tooling: 30,
    resources: 70,
    useCases: ['Investigaciones OSINT sensibles', 'Comunicaciones de máxima privacidad', 'Acceso a entornos hostiles sin quemar tu identidad'],
    pros: ['Todo el tráfico por Tor sin configurar nada', 'Amnésico: apaga y no queda rastro en el disco', 'Arranca desde USB en cualquier máquina', 'KeePassXC y herramientas de cifrado incluidas'],
    cons: ['Lento (red Tor + live USB)', 'No sirve para pentesting (poca tooling)', 'Sin persistencia (por diseño): guardar nada es complicado'],
    tools: ['Tor Browser', 'OnionShare', 'KeePassXC', 'Electrum'],
    repos: [],
    verdict: 'Especializada al extremo: no es tu distro de trabajo, es tu distro para cuando la privacidad es la misión entera.',
  },
  {
    id: 'qubes',
    name: 'Qubes OS',
    emoji: '🧊',
    family: 'Independiente',
    base: 'Xen',
    tagline: 'Seguridad por compartimentación: cada tarea en una VM aislada',
    color: '#7bd3ea',
    glow: 'rgba(123,211,234,0.13)',
    level: 'Avanzado',
    popularity: 38,
    learningCurve: 92,
    stability: 72,
    tooling: 40,
    resources: 60,
    useCases: ['Manejo de malware muestras con aislamiento real', 'Separación total de identidades de trabajo', 'Privacidad extrema con Whisperback/Qubes+Whonix'],
    pros: ['Compartimentación por VMs desechables (qubes)', 'Whonix integrado: Tor a nivel de sistema', 'Si comprometen una qube, el resto respira', 'La filosofía de seguridad más sólida de escritorio'],
    cons: ['Exigente con hardware (VT-x/VT-d, 16GB+ RAM recomendado)', 'Curva de aprendizaje seria', 'El día a día es más lento: copiar entre qubes tiene fricción'],
    tools: ['Qubes manage', 'Whonix gateway/workstation', 'VMs dispensables por tarea'],
    repos: [],
    verdict: 'Para paranoicos con buen hardware y paciencia: el modelo de seguridad más serio que existe en escritorio, a cambio de comodidad.',
  },
  {
    id: 'kali-purple',
    name: 'Kali Purple',
    emoji: '🛡️',
    family: 'Debian-based',
    base: 'Kali',
    tagline: 'Kali azul: defensa, SOC y blue team en la misma distro que ya conoces',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.14)',
    level: 'Intermedio',
    popularity: 42,
    learningCurve: 58,
    stability: 75,
    tooling: 85,
    resources: 72,
    useCases: ['Montar un homelab SOC (Zeek, Suricata, Wazuh…)', 'Formación blue team y detección', 'Practicar purple team con herramientas de ambos lados'],
    pros: ['Incluye stacks de defensa: Zeek, Suricata, Wazuh, Arkime, GVM', 'Misma base Kali que ya conoces', 'Ideal para aprender detección atacando y defendiendo a la vez'],
    cons: ['Más nuevo y menos documentado que Kali clásica', 'Pesado: el stack SOC necesita RAM de verdad', 'Algunas herramientas aún en maduración'],
    tools: ['Zeek', 'Suricata', 'Wazuh', 'GVM/OpenVAS', 'Arkime', 'Elastic stack'],
    repos: [],
    verdict: 'Si te tira el blue team o quieres hacer purple: la misma Kali de siempre con el arsenal defensivo montado encima.',
  },
  {
    id: 'windows11',
    name: 'Windows 11 (estación)',
    emoji: '💠',
    family: 'Windows',
    tagline: 'WSL2 dentro de Windows: Kali en tu Windows sin reiniciar',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.14)',
    level: 'Principiante',
    popularity: 85,
    learningCurve: 30,
    stability: 85,
    tooling: 65,
    resources: 90,
    useCases: ['Trabajo diario Windows + Kali por WSL2', 'Entornos de desarrollo y seguridad sin dual-boot', 'Acceso nativo a red/AD desde el host'],
    pros: ['WSL2 = Kali real dentro de Windows en minutos', 'La GPU y drivers funcionan de fábrica', 'Perfecto para trabajar Office/Teams y atacar a la vez', 'Docker Desktop con backend WSL2'],
    cons: ['No apto para ataques WiFi (sin acceso directo a adaptadores)', 'Algunas herramientas de kernel/scanning no funcionan igual', 'La red de WSL a veces confunde (NAT vs mirrored)'],
    tools: ['WSL2 + Kali metapackages', 'PowerShell', 'Docker Desktop', 'Windows Terminal'],
    repos: [],
    verdict: 'La pragmática: si tu máquina principal es Windows, WSL2 con Kali te da el 80% del arsenal sin dual boot. El 20% restante (WiFi, sniffing crudo) en VM con USB passthrough.',
  },
]

const RECOMMENDED_TOP3 = ['kali', 'arch', 'ubuntu']

/* ---------- Sub-componentes ---------- */

function StatBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-wider text-grey">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/50">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}55, ${color})` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-grey">{value}</span>
    </div>
  )
}

const LEVEL_TONE: Record<Level, 'ok' | 'warn' | 'bad'> = { Principiante: 'ok', Intermedio: 'warn', Avanzado: 'bad' }

function OsCard({ os, i, onOpen }: { os: OsDef; i: number; onOpen: () => void }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.45) }}
      whileHover={{ y: -5 }}
      onClick={onOpen}
      className="card card-hover group relative flex min-w-0 flex-col items-start gap-3 overflow-hidden p-5 text-left"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(420px 160px at 50% 0%, ${os.glow}, transparent)` }} />
      {os.recommended && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-acento/50 bg-acento/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-acento">
          <Star size={9} /> top
        </span>
      )}
      <div className="flex w-full items-center gap-3">
        <span className="text-3xl transition-transform duration-300 group-hover:scale-110">{os.emoji}</span>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-white">{os.name}</h3>
          <span className="font-mono text-[10px] text-grey">{os.family}</span>
        </div>
      </div>
      <p className="relative text-xs leading-relaxed text-grey">{os.tagline}</p>
      <div className="relative mt-auto flex w-full flex-wrap items-center gap-1.5 pt-1">
        <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[9px]',
          LEVEL_TONE[os.level] === 'ok' && 'border-ok/40 bg-ok/10 text-ok',
          LEVEL_TONE[os.level] === 'warn' && 'border-warn/40 bg-warn/10 text-warn',
          LEVEL_TONE[os.level] === 'bad' && 'border-bad/40 bg-bad/10 text-bad')}>{os.level}</span>
        <span className="rounded-full border border-edge px-2 py-0.5 font-mono text-[9px] text-grey">{os.repos.filter((r) => r.badge === 'del autor' || r.badge === 'guía del autor').length} repos del autor</span>
        <span className="ml-auto font-mono text-[10px] text-acento opacity-0 transition-opacity group-hover:opacity-100">ver ficha →</span>
      </div>
    </motion.button>
  )
}

function OsModal({ os, onClose }: { os: OsDef; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-[6vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-edge bg-base shadow-glass"
        onClick={(e) => e.stopPropagation()}
      >
        {/* cabecera */}
        <div className="relative overflow-hidden border-b border-edge p-6" style={{ background: `linear-gradient(135deg, ${os.glow}, transparent 60%)` }}>
          <div className="grid-bg absolute inset-0 opacity-30" />
          <div className="relative flex items-start gap-4">
            <motion.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="text-5xl">{os.emoji}</motion.span>
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold text-white">{os.name}</h2>
              <p className="mt-1 text-sm text-grey">{os.tagline}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-edge bg-black/40 px-2 py-0.5 font-mono text-[10px] text-grey">{os.family}</span>
                <span className="rounded-full border border-edge bg-black/40 px-2 py-0.5 font-mono text-[10px]" style={{ color: os.color }}>nivel {os.level}</span>
              </div>
            </div>
            <button onClick={onClose} className="ml-auto rounded-lg border border-edge p-1.5 text-grey transition-colors hover:text-ink"><X size={16} /></button>
          </div>
        </div>

        <div className="max-h-[64vh] overflow-y-auto p-6">
          {/* stats */}
          <div className="grid gap-2.5 md:grid-cols-2">
            <StatBar label="popularidad" value={os.popularity} color={os.color} delay={0} />
            <StatBar label="estabilidad" value={os.stability} color={os.color} delay={0.05} />
            <StatBar label="curva (más=difícil)" value={os.learningCurve} color={os.color} delay={0.1} />
            <StatBar label="tooling ofensivo" value={os.tooling} color={os.color} delay={0.15} />
            <StatBar label="documentación" value={os.resources} color={os.color} delay={0.2} />
          </div>

          {/* pros / cons */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-ok/25 bg-ok/5 p-4">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ok"><Check size={12} /> puntos fuertes</div>
              <ul className="space-y-1.5">{os.pros.map((p, i) => <li key={i} className="flex gap-2 text-xs text-ink"><span className="text-ok">+</span>{p}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-bad/25 bg-bad/5 p-4">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-bad"><X size={12} /> a tener en cuenta</div>
              <ul className="space-y-1.5">{os.cons.map((p, i) => <li key={i} className="flex gap-2 text-xs text-ink"><span className="text-bad">−</span>{p}</li>)}</ul>
            </div>
          </div>

          {/* usos */}
          <div className="mt-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-grey">para qué se usa</div>
            <div className="flex flex-wrap gap-1.5">{os.useCases.map((u) => <span key={u} className="chip">{u}</span>)}</div>
          </div>

          {/* herramientas */}
          <div className="mt-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-grey">herramientas destacadas</div>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              {os.tools.map((t) => <code key={t} className="rounded border border-edge bg-black/40 px-2 py-1 text-acento">{t}</code>)}
            </div>
          </div>

          {/* repos */}
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-grey"><Package size={11} /> entornos customizados y repos recomendados</div>
            <div className="space-y-2">
              {os.repos.length === 0 && <p className="font-mono text-xs text-grey">sin repos destacados para esta distro</p>}
              {os.repos.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-3 rounded-xl border border-edge bg-black/30 p-4 transition-all hover:border-acento/50 hover:bg-acento/5"
                >
                  <GithubIcon />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono text-xs font-bold text-acento">{r.name}</span>
                      {r.badge && (
                        <span className={cn('rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider',
                          r.badge === 'del autor' && 'border-acento/50 bg-acento/10 text-acento',
                          r.badge === 'guía del autor' && 'border-info/50 bg-info/10 text-info',
                          r.badge === 'comunidad' && 'border-edge text-grey')}>{r.badge}</span>
                      )}
                    </div>
                    <p className="mt-1 break-words text-xs leading-relaxed text-grey">{r.desc}</p>
                  </div>
                  <ExternalLink size={14} className="mt-1 shrink-0 text-grey transition-transform group-hover:translate-x-0.5 group-hover:text-acento" />
                </a>
              ))}
            </div>
          </div>

          {/* veredicto */}
          <div className="mt-6 rounded-xl border p-4" style={{ borderColor: `${os.color}44`, background: `${os.glow}` }}>
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: os.color }}>
              <Sparkles size={12} /> veredicto
            </div>
            <p className="text-sm leading-relaxed text-ink">{os.verdict}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 fill-grey transition-colors group-hover:fill-acento" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.11 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

/* ---------- Página ---------- */

/* ---------------- Guía rápida: "quiero hacer X" → herramientas ---------------- */

function TaskFinder({ nav }: { nav: Nav }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<TaskEntry['category'] | 'todas'>('todas')
  const [openId, setOpenId] = useState<string | null>(null)

  const tasks = useMemo(() => {
    let list = searchTasks(q)
    if (cat !== 'todas') list = list.filter((t) => t.category === cat)
    return list
  }, [q, cat])

  const goToTool = (id: string) => { window.location.hash = '/' + id }

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-acento/30 bg-acento/10 text-acento"><Compass size={18} /></div>
        <div>
          <h2 className="text-lg font-bold text-white">¿Qué quieres hacer hoy?</h2>
          <p className="text-xs text-grey">Dime la tarea y te llevo directo a las herramientas adecuadas</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar tarea… (firewall, vpn, ssh, wordlist, informe)"
          className="min-w-[220px] flex-1 rounded-lg border border-edge bg-black/40 px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-grey/50 focus:border-acento/50"
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['todas', ...TASK_CATS] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c as TaskEntry['category'] | 'todas')}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] transition-colors ${cat === c ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:border-acento/40 hover:text-ink'}`}
          >
            {c === 'todas' ? 'todas' : TASK_CAT_LABEL[c as TaskEntry['category']]}
          </button>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {tasks.map((t) => {
          const open = openId === t.id
          return (
            <div key={t.id} className={cn('card rounded-lg p-4 transition-all', open && 'md:col-span-2')}>
              <button onClick={() => setOpenId(open ? null : t.id)} className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-sm font-semibold text-white">{t.task}</span>
                  <span className="ml-auto rounded-full border border-edge px-2 py-0.5 font-mono text-[9px] text-grey">{TASK_CAT_LABEL[t.category]}</span>
                </div>
                <p className="mt-1 text-xs text-grey">{t.desc}</p>
              </button>
              {open && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="mt-3 grid gap-4 border-t border-edge pt-3 md:grid-cols-2">
                    <div>
                      <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-acento">por dónde empezar</h4>
                      <ol className="space-y-1 text-xs text-grey">
                        {t.steps.map((s, i) => <li key={s}><span className="text-acento">{i + 1}.</span> {s}</li>)}
                      </ol>
                    </div>
                    <div>
                      <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-acento">herramientas para esto</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {t.tools.map((tid) => (
                          <button
                            key={tid}
                            onClick={() => goToTool(tid)}
                            className="rounded border border-acento/40 bg-acento/5 px-2 py-1 font-mono text-[11px] text-acento transition-all hover:bg-acento/15"
                          >
                            {tid} →
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
        {tasks.length === 0 && (
          <div className="rounded border border-edge py-6 text-center font-mono text-xs text-grey md:col-span-2">sin tareas para "{q}" — prueba con firewall, vpn, osint…</div>
        )}
      </div>
    </div>
  )
}

export default function OsCompare({ nav }: { nav: Nav }) {
  const [filter, setFilter] = useState<'todas' | Family>('todas')
  const [openId, setOpenId] = useState<string | null>(null)
  void nav

  const families = useMemo(() => Array.from(new Set(OS_LIST.map((o) => o.family))), [])
  const list = useMemo(() => (filter === 'todas' ? OS_LIST : OS_LIST.filter((o) => o.family === filter)), [filter])
  const openOs = OS_LIST.find((o) => o.id === openId) ?? null

  return (
    <div className="min-w-0">
      {/* hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-acento">
          <Laptop size={13} /> // comparativa
        </div>
        <h1 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
          Sistemas operativos de <span className="gradient-text">hacking ético</span><span className="text-acento">_</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-grey md:text-base">
          Cada distro tiene su superpoder: el arsenal de Kali, el control de Arch, la discreción de Parrot,
          la solidez de Ubuntu o el AD de Windows Server para practicar. Elige según tu misión, no según el hype —
          y arranca con los entornos ya personalizados por <span className="text-ink">D1se0</span> y la comunidad.
        </p>
      </motion.div>

      {/* top 3 recomendados */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {RECOMMENDED_TOP3.map((id, i) => {
          const os = OS_LIST.find((o) => o.id === id)!
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
              whileHover={{ y: -4 }}
              onClick={() => setOpenId(id)}
              className="card card-hover relative overflow-hidden p-5 text-left"
            >
              <motion.div
                className="pointer-events-none absolute inset-0"
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.6 }}
                style={{ background: `radial-gradient(300px 120px at 20% 0%, ${os.glow}, transparent)` }}
              />
              <div className="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-acento">
                <Star size={11} /> recomendada nº{i + 1}
              </div>
              <div className="relative mt-3 flex items-center gap-3">
                <span className="text-3xl">{os.emoji}</span>
                <div>
                  <div className="font-bold text-white">{os.name}</div>
                  <div className="font-mono text-[10px] text-grey">{os.level} · {os.family}</div>
                </div>
              </div>
              <p className="relative mt-3 line-clamp-2 text-xs text-grey">{os.tagline}</p>
            </motion.button>
          )
        })}
      </div>

      {/* filtros */}
      <div className="mt-10 flex flex-wrap gap-1.5">
        {(['todas', ...families] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as 'todas' | Family)}
            className={cn('rounded-lg border px-3.5 py-1.5 font-mono text-xs transition-all',
              filter === f ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink')}
          >
            {f}
          </button>
        ))}
      </div>

      {/* grid de tarjetas */}
      <motion.div layout className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((os, i) => (
            <OsCard key={os.id} os={os} i={i} onOpen={() => setOpenId(os.id)} />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* tabla comparativa */}
      <div className="mt-12">
        <div className="section-tag mb-2">// tabla rápida</div>
        <h2 className="mb-5 text-xl font-extrabold text-white md:text-2xl">Comparativa exprés</h2>
        <div className="min-w-0 overflow-x-auto rounded-xl border border-edge">
          <table className="w-full min-w-[640px] font-mono text-[11.5px]">
            <thead>
              <tr className="border-b border-edge bg-black/30 text-left text-[10px] uppercase tracking-wider text-grey">
                <th className="px-4 py-2.5">sistema</th>
                <th className="px-4 py-2.5">familia</th>
                <th className="px-4 py-2.5">nivel</th>
                <th className="px-4 py-2.5">tooling</th>
                <th className="px-4 py-2.5">estabilidad</th>
                <th className="px-4 py-2.5">ideal para</th>
              </tr>
            </thead>
            <tbody>
              {OS_LIST.map((os, i) => (
                <motion.tr
                  key={os.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setOpenId(os.id)}
                  className="cursor-pointer border-b border-edge/40 transition-colors hover:bg-acento/5 last:border-0"
                >
                  <td className="px-4 py-2.5 font-bold text-white">{os.emoji} {os.name}</td>
                  <td className="px-4 py-2.5 text-grey">{os.family}</td>
                  <td className={cn('px-4 py-2.5',
                    LEVEL_TONE[os.level] === 'ok' && 'text-ok',
                    LEVEL_TONE[os.level] === 'warn' && 'text-warn',
                    LEVEL_TONE[os.level] === 'bad' && 'text-bad')}>{os.level}</td>
                  <td className="px-4 py-2.5 text-ink">{os.tooling}</td>
                  <td className="px-4 py-2.5 text-ink">{os.stability}</td>
                  <td className="px-4 py-2.5 text-grey">{os.useCases[0]}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ruta recomendada */}
      <div className="mt-12">
        <div className="section-tag mb-2">// camino del autor</div>
        <h2 className="mb-5 text-xl font-extrabold text-white md:text-2xl">¿Por dónde empiezo?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Terminal, t: '1. Empieza con Kali (o Ubuntu + tools)', d: 'Todo preinstalado para aprender sin fricción. Si prefieres entender cada pieza, Ubuntu con el instalador de D1se0 y las tools a mano te enseña el doble.' },
            { icon: Monitor, t: '2. Ricea tu entorno', d: 'Cuando domines la terminal, personaliza: los scripts de entorno de Kali/Arch de D1se0 te dejan un escritorio i3 bonito y productivo en minutos.' },
            { icon: Cpu, t: '3. Monta tu lab AD', d: 'Un Windows Server + GOAD te da el campo de entrenamiento donde practicar Kerberos, SMB y toda la ofensiva de directorio activo.' },
          ].map((s, i) => (
            <motion.div key={s.t} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="card card-hover relative p-5">
              <div className="absolute right-0 top-0 rounded-bl-lg border-b border-l border-edge bg-base/60 px-2 py-1 font-mono text-[9px] text-grey">0{i + 1}</div>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-acento/25 bg-acento/10 text-acento"><s.icon size={16} /></div>
              <h3 className="text-sm font-bold text-white">{s.t}</h3>
              <p className="mt-2 text-xs leading-relaxed text-grey">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* guía rápida de tareas */}
      <TaskFinder nav={nav} />

      {/* disclaimer */}
      <div className="mt-10 flex items-start gap-3 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-xs text-warn/90">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        <span>
          Practica SIEMPRE en entornos propios o autorizados: labs personales, máquinas de HackTheBox/TryHackMe,
          o laboratorios AD montados por ti. El conocimiento de estas distros es para proteger, no para invadir.
        </span>
      </div>

      {/* docs de las tools */}
      <div className="mt-10 flex flex-wrap gap-3">
        <button onClick={() => (window.location.hash = '/docs')} className="flex items-center gap-2 rounded-lg border border-edge px-4 py-2.5 font-mono text-xs text-ink transition-all hover:border-acento/50 hover:text-acento">
          <BookOpen size={14} /> ver la documentación de las tools
        </button>
      </div>

      <AnimatePresence>{openOs && <OsModal os={openOs} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </div>
  )
}
