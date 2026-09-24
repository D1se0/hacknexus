import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ToastProvider, Spinner } from './components/ui'
import { Layout } from './components/Layout'
import { findTool } from './lib/registry'
import Home from './pages/Home'
import { TOOLS } from './lib/registry'

const toolPages: Record<string, React.LazyExoticComponent<React.ComponentType>> = {}
for (const t of TOOLS) {
  toolPages[t.id] = lazy(() => import(`./tools/${t.id.charAt(0).toUpperCase()}${t.id.slice(1)}.tsx`))
}

function currentRoute(): string {
  const h = window.location.hash.replace(/^#\/?/, '')
  return h || 'home'
}

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

  const tool = findTool(route)
  useEffect(() => {
    document.title = tool ? `${tool.name} — HackNexus` : 'HackNexus — Suite de Hacking Ético'
  }, [tool])

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
