import { motion } from 'framer-motion'
import { Shield, Award, Bug, Flag, GraduationCap, Youtube, Music2, BookOpen, Github, Linkedin, Wrench, Crosshair, Server, Cpu, FileText, ExternalLink } from 'lucide-react'
import { Counter } from '../components/ui'
import { TOOLS } from '../lib/registry'

/* ── Datos del perfil (D1se0) ── */

const STATS = [
  { icon: Flag, value: 500, suffix: '+', label: 'máquinas CTF', note: 'HTB · THM · VulnHub · Vulnyx · Atenea · Dockerlabs · TheHackersLab · BBLabs · HackMyVM' },
  { icon: Bug, value: 4, suffix: '', label: 'CVEs asignadas', note: 'ver abajo, con su detalle' },
  { icon: Award, value: 6, suffix: '+', label: 'certificaciones', note: 'eJPT, CWES, hacking ético avanzado y título de seguridad informática' },
  { icon: Wrench, value: TOOLS.length, suffix: '', label: 'herramientas en HackNexus', note: 'todas client-side, open source' },
]

const CERTS = [
  { name: 'eJPT', issuer: 'INE Security', note: 'Pentesting profesional: explotación, pivoting y post-explotación', tone: 'ok' },
  { name: 'CWES', issuer: 'HackTheBox', note: 'WebSecurity — explotación web avanzada', tone: 'accent' },
  { name: 'Hacking Ético Avanzado', issuer: 'certificación', note: 'adversary simulation y ataques multi-fase', tone: 'info' },
  { name: 'Hacking Ético', issuer: 'certificación', note: 'fundamentos ofensivos y metodología', tone: 'info' },
  { name: 'Título Seguridad Informática', issuer: 'titulación', note: 'formación reglada en ciberseguridad', tone: 'info' },
]

const EDU = [
  { name: 'ASIR', note: 'Grado Superior — Administración de Sistemas Informáticos en Red', icon: GraduationCap },
  { name: 'SMR', note: 'Grado Medio — Sistemas Microinformáticos y Redes', icon: Cpu },
]

const CVES = [
  { id: 'CVE-2026-19871', tag: 'publicada' },
  { id: 'CVE-2026-77780', tag: 'publicada' },
  { id: 'CVE-2026-78337', tag: 'publicada' },
  { id: 'CVE-2026-81931', tag: 'publicada' },
]

const FOCUS = [
  { name: 'Hacking web', icon: Crosshair, tone: 'text-bad' },
  { name: 'Bug bounty', icon: Bug, tone: 'text-acento' },
  { name: 'Pentesting', icon: Server, tone: 'text-info' },
  { name: 'Pivoting', icon: Cpu, tone: 'text-warn' },
  { name: 'Redes', icon: Shield, tone: 'text-ok' },
  { name: 'Ingeniería inversa', icon: FileText, tone: 'text-acento' },
  { name: 'Phishing ético', icon: ExternalLink, tone: 'text-bad' },
  { name: 'Hardware hacking', icon: Cpu, tone: 'text-info' },
]

const CHANNELS = [
  { name: 'YouTube — Diseo', handle: '@Hacking_Community', url: 'https://youtube.com/@Hacking_Community', icon: Youtube, note: 'canal principal de ciberseguridad' },
  { name: 'YouTube — Shorts', handle: '@d1see0', url: 'https://youtube.com/@d1see0', icon: Youtube, note: 'clips y máquinas rápidas' },
  { name: 'TikTok', handle: '@hacking__community', url: 'https://tiktok.com/@hacking__community', icon: Music2, note: 'Diseo — contenido corto' },
]

const BLOGS = [
  { name: 'blog_hacking', url: 'https://d1se0.github.io/blog_hacking/', note: 'writeups y notas de ciberseguridad' },
  { name: 'hackerlabs', url: 'https://d1se0.github.io/hackerlabs/', note: 'laboratorios guiados paso a paso' },
  { name: 'PageToolKit', url: 'https://d1se0.github.io/PageToolKit/', note: 'recursos y utilidades' },
  { name: 'hardwarehacking', url: 'https://d1se0.github.io/hardwarehacking/', note: 'electrónica y hardware ofensivo' },
  { name: 'hackingtools', url: 'https://d1se0.github.io/hackingtools/', note: 'colección de herramientas' },
  { name: 'hacklab', url: 'https://d1se0.github.io/hacklab.github.io/', note: 'entorno de prácticas' },
]

const LINKS = [
  { name: 'GitBook — h4cker_b00k', url: 'https://dise0.gitbook.io/h4cker_b00k', icon: BookOpen, note: 'documentación completa de todo lo aprendido' },
  { name: 'GitHub — @D1se0', url: 'https://github.com/D1se0', icon: Github, note: 'proyectos y herramientas open source' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/adriaangaarcialopez', icon: Linkedin, note: 'perfil profesional' },
]

/* ── Página ── */

export default function Whoami() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* cabecera con avatar */}
      <div className="card relative overflow-hidden rounded-2xl border border-edge p-6 md:p-8">
        <div className="halo left-[-60px] top-[-80px] h-64 w-64 bg-acento/15" />
        <div className="halo right-[-40px] bottom-[-60px] h-52 w-52 bg-info/10" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            src="avatar.jpg"
            alt="avatar D1se0"
            className="h-28 w-28 shrink-0 rounded-2xl border-2 border-acento/50 object-cover shadow-glow"
          />
          <div className="min-w-0">
            <div className="font-mono text-xs text-acento">$ whoami</div>
            <h1 className="mt-1 font-mono text-3xl font-bold text-white">
              D1se<span className="text-acento">0</span>
            </h1>
            <p className="mt-1 text-sm text-grey">
              Hacker ético y formador de contenido · bug bounty, hacking web y pentesting · autodidacta incansable,
              documento absolutamente todo lo que aprendo.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {FOCUS.map((f) => (
                <span key={f.name} className="flex items-center gap-1.5 rounded-full border border-edge bg-black/30 px-2.5 py-1 font-mono text-[10px] text-grey">
                  <f.icon size={10} className={f.tone} /> {f.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* analíticas */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card rounded-xl border border-edge p-4 text-center"
          >
            <s.icon size={18} className="mx-auto text-acento" />
            <div className="mt-1.5 font-mono text-3xl font-bold text-white">
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <div className="text-[11px] font-semibold text-ink">{s.label}</div>
            <div className="mt-1 text-[10px] leading-tight text-grey/80">{s.note}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* CVEs */}
        <section className="card rounded-xl border border-bad/30 p-5">
          <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
            <Bug size={15} className="text-bad" /> CVEs asignadas
          </h2>
          <p className="mt-1 text-xs text-grey">Vulnerabilidades descubiertas y coordinadas por mí, ya publicadas en el CVE Program.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CVES.map((c) => (
              <a
                key={c.id}
                href={`https://www.cve.org/CVERecord?id=${c.id}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-lg border border-edge bg-black/30 px-3 py-2 font-mono text-xs text-ink transition-colors hover:border-bad/50 hover:text-bad"
              >
                {c.id}
                <span className="flex items-center gap-1 text-[9px] uppercase text-grey group-hover:text-bad">
                  {c.tag} <ExternalLink size={9} />
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* certificaciones */}
        <section className="card rounded-xl border border-edge p-5">
          <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
            <Award size={15} className="text-acento" /> Certificaciones
          </h2>
          <ul className="mt-3 space-y-2.5">
            {CERTS.map((c) => (
              <li key={c.name} className="flex items-start gap-2.5">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-acento shadow-glow" />
                <div>
                  <span className="text-sm font-semibold text-ink">{c.name}</span>
                  <span className="ml-2 font-mono text-[10px] uppercase text-grey">{c.issuer}</span>
                  <p className="text-[11px] text-grey">{c.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* formación */}
        <section className="card rounded-xl border border-edge p-5">
          <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
            <GraduationCap size={15} className="text-info" /> Formación reglada
          </h2>
          <ul className="mt-3 space-y-2.5">
            {EDU.map((e) => (
              <li key={e.name} className="flex items-start gap-2.5">
                <e.icon size={16} className="mt-0.5 shrink-0 text-info" />
                <div>
                  <span className="text-sm font-semibold text-ink">{e.name}</span>
                  <p className="text-[11px] text-grey">{e.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* canales */}
        <section className="card rounded-xl border border-edge p-5">
          <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
            <Youtube size={15} className="text-bad" /> Contenido
          </h2>
          <div className="mt-3 space-y-2">
            {CHANNELS.map((c) => (
              <a key={c.handle} href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-edge bg-black/30 px-3 py-2 transition-colors hover:border-acento/50">
                <c.icon size={15} className="shrink-0 text-bad" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-ink">{c.name}</div>
                  <div className="font-mono text-[10px] text-acento">{c.handle} · {c.note}</div>
                </div>
                <ExternalLink size={11} className="ml-auto shrink-0 text-grey" />
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* blogs */}
      <section className="card mt-4 rounded-xl border border-edge p-5">
        <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
          <BookOpen size={15} className="text-warn" /> Blogs y laboratorios
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BLOGS.map((b) => (
            <a key={b.url} href={b.url} target="_blank" rel="noreferrer" className="group rounded-lg border border-edge bg-black/30 px-3 py-2.5 transition-colors hover:border-warn/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-ink group-hover:text-warn">{b.name}</span>
                <ExternalLink size={10} className="text-grey group-hover:text-warn" />
              </div>
              <div className="mt-0.5 text-[10px] text-grey">{b.note}</div>
            </a>
          ))}
        </div>
      </section>

      {/* enlaces clave */}
      <section className="card mt-4 rounded-xl border border-edge p-5">
        <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
          <Shield size={15} className="text-ok" /> Enlaces clave
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {LINKS.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-lg border border-edge bg-black/30 px-3 py-3 transition-colors hover:border-ok/50">
              <l.icon size={16} className="mt-0.5 shrink-0 text-ok" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-ink">{l.name}</div>
                <div className="mt-0.5 text-[10px] leading-tight text-grey">{l.note}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <p className="mt-6 text-center font-mono text-[10px] text-grey/70">
        // autodidacta · documentador compulsivo · siempre investigando — si quieres aprender de verdad, sigue el GitBook
      </p>
    </div>
  )
}
