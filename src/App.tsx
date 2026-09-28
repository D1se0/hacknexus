import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ToastProvider, Spinner } from './components/ui'
import { Layout } from './components/Layout'
import { findTool } from './lib/registry'
import Home from './pages/Home'
import Docs from './pages/Docs'
import OsCompare from './pages/OsCompare'
import Advisor from './pages/Advisor'
import Whoami from './pages/Whoami'
import ThemeEditor from './pages/ThemeEditor'
import { TOOLS } from './lib/registry'
import { applyTheme, getTheme, onThemeChange } from './lib/theme'

const toolPages: Record<string, React.LazyExoticComponent<React.ComponentType>> = {}
/* Alias id → nombre exacto del fichero en src/tools (para ids cuyo CamelCase
   no coincide con Capitalize(id), p.ej. langtrans → LangTrans.tsx). */
const FILE_ALIASES: Record<string, string> = {
  langpython: 'LangPython', langjavascript: 'LangJavascript', langtypescript: 'LangTypescript',
  langjava: 'LangJava', langcsharp: 'LangCsharp', langc: 'LangC', langcpp: 'LangCpp',
  langphp: 'LangPhp', langruby: 'LangRuby', langgo: 'LangGo', langrust: 'LangRust',
  langlua: 'LangLua', langbash: 'LangBash', langsql: 'LangSql', langhtml: 'LangHtml', langcss: 'LangCss',
  langtrans: 'LangTrans', bashforge: 'BashForge', psforge: 'PsForge', netsim: 'NetSim',
  cabledocs: 'CableDocs', healthcheck: 'HealthCheck', speedtest: 'SpeedTest',
  nfclab: 'NfcLab', duckyforge: 'DuckyForge',
  redos: 'Redos', cronapt: 'CronApt', hashvisual: 'HashVisual', wifilter: 'WiFilter',
  bytecode: 'Bytecode', firmware: 'Firmware', blegatt: 'BleGatt', stegoaudio: 'StegoAudio',
  x509: 'X509', malwaretime: 'MalwareTime',
  wifilab: 'WifiLab', wifi80211: 'Wifi80211', wifiplanner: 'WifiPlanner', wifiaudit: 'WifiAudit',
  graphql: 'GraphQL', cmdinject: 'CommandInjection', pathtraversal: 'PathTraversal', nosql: 'NoSql',
  deser: 'Deserialization', oauth: 'OAuth', websockets: 'WebSockets', clickjack: 'Clickjacking',
  cachepoison: 'CachePoison', disclosure: 'Disclosure', pp: 'PrototypePollution', smuggler: 'Smuggler',
  twofa: 'TwoFA', logic: 'BusinessLogic', jwks: 'Jwks',
  passforge: 'Passforge', maskgen: 'Maskgen', policyaudit: 'Policyaudit',
  quishing: 'Quishing', shorteneraudit: 'Shorteneraudit', phishmtm: 'Phishmtm',
  emailosint: 'EmailOsint', phonevalidator: 'PhoneValidator', phonehunter: 'PhoneHunter',
  anonymity: 'Anonymity',
  homoglyph: 'HomoglyphScanner',
  zerowidth: 'ZeroWidthStego',
  classcipher: 'ClassicalCipher',
  pubkeylab: 'PubkeyLab',
  bip39: 'Bip39Lab',
}
for (const t of TOOLS) {
  const file = FILE_ALIASES[t.id] ?? `${t.id.charAt(0).toUpperCase()}${t.id.slice(1)}`
  toolPages[t.id] = lazy(() => import(`./tools/${file}.tsx`))
}

function currentRoute(): string {
  const h = window.location.hash.replace(/^#\/?/, '')
  return h || 'home'
}

/* Atajos de teclado por si quieres reutilizarlos en otros módulos. */
const ROUTE_ALIASES: Record<string, string> = { customization: 'personalization', appearance: 'personalization', theme: 'personalization' }

export default function App() {
  const [route, setRoute] = useState(currentRoute)
  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const nav = useCallback((id: string) => {
    window.location.hash = id === 'home' ? '/' : `/${id}`
  }, [])

  /* ── motor de theming: aplica el tema guardado y vive atento a cambios ──
     Se conecta aquí (no en main) para que el guardado del usuario también
     pinte la pestaña (meta theme-color) y los scrollbar del documento. */
  useEffect(() => {
    applyTheme(getTheme())
    const paintChrome = (c: { bg: string; accent: string }) => {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'theme-color'
        document.head.appendChild(meta)
      }
      meta.content = c.bg
      document.documentElement.style.colorScheme = 'dark'
    }
    paintChrome(getTheme())
    return onThemeChange(paintChrome)
  }, [])

  /* Alt/Option + T abre la personalización desde cualquier página. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        window.location.hash = '/personalization'
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tool = findTool(route)
  useEffect(() => {
    const special: Record<string, string> = { whoami: 'Whoami — D1se0', docs: 'Documentación', 'os-compare': 'Comparativa de OS de Hacking Ético', advisor: '¿Qué herramienta necesito?', personalization: 'Personalización' }
    document.title = tool
      ? `${tool.name} — HackNexus`
      : special[ROUTE_ALIASES[route] ?? route]
        ? `${special[ROUTE_ALIASES[route] ?? route]} — HackNexus`
        : 'HackNexus — Suite de Hacking Ético'
  }, [tool, route])

  const Page = toolPages[route] ?? Home

  return (
    <ToastProvider>
      <Layout route={route} nav={nav}>
        <AnimatePresence mode="wait">
          <motion.div
            key={route}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {route === 'home' ? (
              <Home nav={nav} />
            ) : route === 'whoami' ? (
              <Whoami />
            ) : route === 'docs' ? (
              <Docs nav={nav} />
            ) : route === 'os-compare' ? (
              <OsCompare nav={nav} />
            ) : route === 'advisor' ? (
              <Advisor />
            ) : route === 'personalization' || route === 'theme' || route === 'customization' || route === 'appearance' ? (
              <ThemeEditor />
            ) : tool ? (
              <Suspense
                fallback={
                  <div className="flex min-h-[40vh] items-center justify-center gap-3 font-mono text-sm text-grey">
                    <Spinner /> cargando módulo…
                  </div>
                }
              >
                <Page />
              </Suspense>
            ) : (
              <div className="py-24 text-center font-mono text-grey">
                <p className="text-4xl">404</p>
                <p className="mt-3">módulo no encontrado: <span className="text-bad">{route}</span></p>
                <button onClick={() => nav('home')} className="mt-6 rounded-lg border border-acento/40 px-4 py-2 text-acento hover:bg-acento/10">
                  volver al inicio
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Layout>
    </ToastProvider>
  )
}
