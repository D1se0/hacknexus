import { useEffect, useMemo, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Wifi, LocateFixed, Search, Plus, Download, Upload, Eye, EyeOff, Trash2, Crosshair, X, MapPin, Satellite, FileDown, KeySquare } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, TextArea, Select, CopyBtn, ErrorBox, InfoBanner, useToast } from '../components/ui'
import { SEED_POINTS, loadUserPoints, saveUserPoints, addUserPoint, removeUserPoint, haversineKm, esc, type WifiPoint } from '../lib/wifi'
import { loadWigleCreds, saveWigleCreds, wigleSearch, wigleKwargsFromNetwork, lastSeenAgo, lastSeenTone, WIGLE_FAQ, WigleError, type WigleCreds } from '../lib/wigle'
import { download } from '../lib/util'

const AUTH_COLOR: Record<string, string> = {
  abierta: '#54d9a0',
  WPA2: '#38bdf8',
  WPA3: '#c084fc',
  WEP: '#f87171',
  desconocida: '#9ca3af',
}

const pinHtml = (p: WifiPoint): string => {
  const c = AUTH_COLOR[p.auth ?? 'WPA2'] ?? AUTH_COLOR.desconocida
  if (p.source === 'wigle') {
    return `<div style="width:16px;height:16px;border-radius:50%;background:${c}33;border:2px solid ${c};box-shadow:0 0 8px ${c}77"></div>`
  }
  return `<div style="width:16px;height:16px;border-radius:50%;background:${c};border:2px solid #0b0f0d;box-shadow:0 0 0 1.5px ${c}55, 0 0 9px ${c}99"></div>`
}

const clusterHtml = (n: number): string =>
  `<div style="min-width:30px;height:30px;padding:0 7px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(46,232,138,.14);border:1.5px solid rgba(46,232,138,.55);color:#2ee88a;font:700 12px/1 ui-monospace,monospace;box-shadow:0 0 10px rgba(46,232,138,.25)">${n}</div>`

const meHtml = (): string =>
  `<div style="width:18px;height:18px;border-radius:50%;background:rgba(46,232,138,.25);border:2px solid #2ee88a;box-shadow:0 0 0 6px rgba(46,232,138,.15), 0 0 14px rgba(46,232,138,.5)"></div>`

const ZOOM_INDIVIDUAL = 7
const WIGLE_MIN_ZOOM = 11
const MAX_SPAN = 0.34

export default function Wifimap() {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const meMarkerRef = useRef<L.Marker | null>(null)

  const [userPoints, setUserPoints] = useState<WifiPoint[]>(() => loadUserPoints())
  const [wiglePoints, setWiglePoints] = useState<WifiPoint[]>([])
  const [wigleTotal, setWigleTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [wigleErr, setWigleErr] = useState<string | null>(null)
  const [creds, setCreds] = useState<WigleCreds | null>(() => loadWigleCreds())
  const [credsDraft, setCredsDraft] = useState({ apiName: '', apiToken: '' })
  const [showPanel, setShowPanel] = useState(() => !loadWigleCreds())
  const [autoFetch, setAutoFetch] = useState(true)
  const [ssidFilter, setSsidFilter] = useState('')
  const [sourceSel, setSourceSel] = useState<'all' | 'own' | 'wigle'>('all')
  const [showKeys, setShowKeys] = useState(false)

  const [zoom, setZoom] = useState(3)
  const [cells, setCells] = useState(0)
  const [visible, setVisible] = useState(0)
  const [selected, setSelected] = useState<WifiPoint | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [query, setQuery] = useState('')
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [importErr, setImportErr] = useState<string | null>(null)
  const [form, setForm] = useState({ ssid: '', password: '', auth: 'WPA2', place: '', lat: '', lon: '', band: '2.4 GHz', notes: '' })
  const importRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const points = useMemo(() => [...userPoints, ...SEED_POINTS, ...wiglePoints], [userPoints, wiglePoints])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = points
    if (sourceSel === 'own') out = out.filter((p) => p.source !== 'wigle')
    if (sourceSel === 'wigle') out = out.filter((p) => p.source === 'wigle')
    if (!q) return out
    return out.filter((p) => p.ssid.toLowerCase().includes(q) || p.place.toLowerCase().includes(q) || (p.bssid ?? '').toLowerCase().includes(q))
  }, [points, query, sourceSel])

  /* ── WiGLE: fetch de la caja visible (con tope 0.34°) ── */
  const lastFetchRef = useRef(0)
  const fetchAbortRef = useRef<AbortController | null>(null)
  const fetchBox = async () => {
    const map = mapRef.current
    if (!map || !creds || loading) return
    const now = Date.now()
    if (now - lastFetchRef.current < 1800) return
    lastFetchRef.current = now

    const b = map.getBounds()
    const cLat = (b.getNorth() + b.getSouth()) / 2
    const cLon = (b.getEast() + b.getWest()) / 2
    const latSpan = Math.min(MAX_SPAN, Math.abs(b.getNorth() - b.getSouth()))
    const lonSpan = Math.min(MAX_SPAN, Math.abs(b.getEast() - b.getWest()))
    const box = { lat1: cLat - latSpan / 2, lat2: cLat + latSpan / 2, lon1: cLon - lonSpan / 2, lon2: cLon + lonSpan / 2 }

    fetchAbortRef.current?.abort()
    const ac = new AbortController()
    fetchAbortRef.current = ac
    setLoading(true)
    setWigleErr(null)
    try {
      const res = await wigleSearch(creds, box, { ssid: ssidFilter, maxResults: 100, signal: ac.signal })
      const incoming: WifiPoint[] = res.results.map((n, i) => {
        const kw = wigleKwargsFromNetwork(n)
        return {
          id: `w-${(n.netid || `${n.lat},${n.lon}`).replace(/[^0-9A-Za-z]/g, '')}`,
          ssid: n.ssid?.trim() || '(oculta)',
          place: n.comment || n.note || 'observada por la comunidad WiGLE',
          lat: n.lat,
          lon: n.lon,
          auth: (kw.auth as WifiPoint['auth']) ?? 'desconocida',
          band: kw.band,
          notes: undefined,
          author: 'WiGLE',
          added: (n.lasttime ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10),
          source: 'wigle',
          bssid: kw.bssid,
          channel: kw.channel,
          frequency: kw.frequency,
          lastSeen: lastSeenAgo(n.lasttime),
          lastSeenRaw: n.lasttime,
          security: kw.security,
          encryption: kw.encryption,
        }
      })
      setWiglePoints((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const fresh = incoming.filter((p) => !seen.has(p.id))
        return [...fresh.reverse(), ...prev]
      })
      setWigleTotal(res.totalResults ?? res.resultCount)
      if (res.results.length === 0) toast('WiGLE: 0 redes en esta caja — prueba más zoom o sin filtro SSID')
      else toast(`+${res.results.length} redes WiGLE cargadas`)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = e instanceof WigleError ? e.message : (e as Error).message || 'error consultando WiGLE'
      setWigleErr(msg)
      if (e instanceof WigleError && e.status === 401) setShowPanel(true)
    } finally {
      setLoading(false)
    }
  }
  const fetchRef = useRef(fetchBox)
  fetchRef.current = fetchBox

  const connectWigle = () => {
    const name = credsDraft.apiName.trim()
    const token = credsDraft.apiToken.trim()
    if (!name || !token) return toast('pega tu API Name y API Token (wigle.net/account)', 'error')
    const c = { apiName: name, apiToken: token }
    saveWigleCreds(c)
    setCreds(c)
    setCredsDraft({ apiName: '', apiToken: '' })
    toast('WiGLE conectado — credenciales solo en tu navegador')
    setTimeout(() => fetchRef.current(), 250)
  }

  const disconnectWigle = () => {
    saveWigleCreds(null)
    setCreds(null)
    setWiglePoints([])
    setWigleTotal(null)
    setWigleErr(null)
    toast('WiGLE desconectado y credenciales borradas')
  }

  /* ── init mapa (una vez) ── */
  useEffect(() => {
    const div = mapDivRef.current
    if (!div || mapRef.current) return

    const map = L.map(div, { center: [40.4168, -3.7038], zoom: 3, worldCopyJump: true })

    // Tiles Esri Dark Gray Canvas: gratuitos y sin API key (CARTO empezó a
    // devolver "API KEY REQUIRED" en público). Base + capa de referencia/labels.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri — Esri, DeLorme, NAVTEQ &middot; datos: OSM',
      maxZoom: 16,
    }).addTo(map)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      opacity: 0.9,
      pane: 'shadowPane',
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    let tries = 0
    const fit = () => {
      if (div.clientWidth > 0 && div.clientHeight > 0) map.invalidateSize()
      else if (++tries < 40) requestAnimationFrame(fit)
    }
    requestAnimationFrame(fit)
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(div)

    const update = () => setZoom(map.getZoom())
    update()
    map.on('zoomend', update)

    // auto-fetch al mover (debounce): solo con creds y zoom suficiente
    let tm: ReturnType<typeof setTimeout> | undefined
    const onMoveEnd = () => {
      if (!autoFetchOn.current) return
      if (map.getZoom() < WIGLE_MIN_ZOOM) return
      clearTimeout(tm)
      tm = setTimeout(() => fetchRef.current(), 900)
    }
    map.on('moveend', onMoveEnd)

    return () => {
      clearTimeout(tm)
      ro.disconnect()
      map.off('zoomend', update)
      map.off('moveend', onMoveEnd)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  const autoFetchOn = useRef(autoFetch)
  autoFetchOn.current = autoFetch

  /* ── reconstruir marcadores (clusters por zoom) ── */
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (userLoc) {
      meMarkerRef.current = L.marker([userLoc.lat, userLoc.lon], {
        icon: L.divIcon({ className: '', html: meHtml(), iconSize: [18, 18], iconAnchor: [9, 9] }),
        interactive: false,
      }).addTo(layer)
    }
    const z = map.getZoom()
    let visibleCount = 0
    let cellCount = 0

    if (z >= ZOOM_INDIVIDUAL) {
      for (const p of filtered) {
        visibleCount++
        cellCount++
        L.marker([p.lat, p.lon], {
          icon: L.divIcon({ className: '', html: pinHtml(p), iconSize: [18, 18], iconAnchor: [9, 9] }),
        })
          .bindTooltip(esc(p.ssid), { direction: 'top', offset: [0, -8] })
          .on('click', () => {
            setSelected(p)
            setRevealed(false)
            map.panTo([p.lat, p.lon])
          })
          .addTo(layer)
      }
    } else {
      const s = 360 / Math.pow(2, z + 1)
      const grid = new Map<string, WifiPoint[]>()
      for (const p of filtered) {
        const k = `${Math.round(p.lat / s)}:${Math.round(p.lon / s)}`
        const arr = grid.get(k) ?? []
        arr.push(p)
        grid.set(k, arr)
      }
      for (const arr of grid.values()) {
        cellCount++
        visibleCount += arr.length
        const lat = arr.reduce((a, p) => a + p.lat, 0) / arr.length
        const lon = arr.reduce((a, p) => a + p.lon, 0) / arr.length
        const wigleIn = arr.filter((p) => p.source === 'wigle').length
        L.marker([lat, lon], {
          icon: L.divIcon({ className: '', html: clusterHtml(arr.length), iconSize: [30, 30], iconAnchor: [15, 15] }),
        })
          .bindTooltip(`${arr.length} red(es)${wigleIn ? ` · ${wigleIn} de WiGLE` : ''} — zoom para verlas`, { direction: 'top', offset: [0, -14] })
          .on('click', () => map.setView([lat, lon], Math.min(z + 3, 13)))
          .addTo(layer)
      }
    }
    setCells(cellCount)
    setVisible(visibleCount)
  }, [filtered, zoom, userLoc])

  const locate = () => {
    if (!navigator.geolocation) return toast('geolocalización no disponible', 'error')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserLoc(loc)
        mapRef.current?.flyTo([loc.lat, loc.lon], 14)
        toast('ubicación encontrada — mira las redes cercanas')
      },
      () => toast('permiso de ubicación denegado', 'error'),
      { timeout: 8000 },
    )
  }

  const nearest = useMemo(() => {
    if (!userLoc) return []
    return [...filtered]
      .map((p) => ({ p, km: haversineKm(userLoc, p) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6)
  }, [filtered, userLoc])

  const focusPoint = (p: WifiPoint) => {
    setSelected(p)
    setRevealed(false)
    mapRef.current?.flyTo([p.lat, p.lon], Math.max(ZOOM_INDIVIDUAL, mapRef.current?.getZoom() ?? ZOOM_INDIVIDUAL))
  }

  const useMapCenter = () => {
    const c = mapRef.current?.getCenter()
    if (c) setForm((f) => ({ ...f, lat: c.lat.toFixed(5), lon: c.lng.toFixed(5) }))
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast('geolocalización no disponible', 'error')
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(5), lon: pos.coords.longitude.toFixed(5) }))
    }, () => toast('permiso denegado', 'error'), { timeout: 8000 })
  }

  const submit = () => {
    const lat = parseFloat(form.lat.replace(',', '.'))
    const lon = parseFloat(form.lon.replace(',', '.'))
    if (!form.ssid.trim()) return toast('falta el SSID', 'error')
    if (!form.place.trim()) return toast('falta el lugar (barrio, ciudad…)', 'error')
    if (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lon) || lon < -180 || lon > 180) return toast('coordenadas inválidas', 'error')
    const p = addUserPoint({
      ssid: form.ssid.trim(),
      password: form.password.trim() || undefined,
      auth: form.auth as WifiPoint['auth'],
      place: form.place.trim(),
      lat, lon,
      band: form.band as WifiPoint['band'],
      notes: form.notes.trim() || undefined,
      author: 'tú',
    })
    setUserPoints(loadUserPoints())
    setFormOpen(false)
    setForm({ ssid: '', password: '', auth: 'WPA2', place: '', lat: '', lon: '', band: '2.4 GHz', notes: '' })
    toast('red añadida a TU mapa local')
    setTimeout(() => focusPoint(p), 150)
  }

  const del = (id: string) => {
    removeUserPoint(id)
    setUserPoints(loadUserPoints())
    setSelected(null)
    toast('red eliminada de tu mapa local')
  }

  const exportJson = () => {
    download('hacknexus-wifi-map.json', JSON.stringify(points, null, 2), 'application/json')
    toast('mapa exportado (JSON)')
  }

  const csvCell = (v: unknown): string => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const exportCsv = () => {
    const head = ['ssid', 'bssid', 'auth', 'security', 'encryption', 'band', 'channel', 'frequency', 'lat', 'lon', 'place', 'lastSeen', 'added', 'source', 'password', 'notes']
    const rows = points.map((p) => [p.ssid, p.bssid ?? '', p.auth ?? '', p.security ?? '', p.encryption ?? '', p.band ?? '', p.channel ?? '', p.frequency ?? '', p.lat, p.lon, p.place, p.lastSeenRaw ?? '', p.added, p.source, p.password ?? '', p.notes ?? ''].map(csvCell).join(','))
    download('hacknexus-wifi-map.csv', '\ufeff' + head.join(',') + '\n' + rows.join('\n'), 'text/csv;charset=utf-8')
    toast(`${points.length} redes exportadas (CSV)`)
  }

  const importJson = async (file: File) => {
    setImportErr(null)
    try {
      const arr = JSON.parse(await file.text()) as Partial<WifiPoint>[]
      if (!Array.isArray(arr)) throw new Error('el JSON debe ser un array de puntos')
      const valid = arr
        .filter((p) => p && typeof p.ssid === 'string' && typeof p.lat === 'number' && typeof p.lon === 'number')
        .slice(0, 2000)
      if (!valid.length) throw new Error('ningún punto válido encontrado')
      const current = loadUserPoints()
      const merged = [
        ...valid.map((p) => ({
          id: `u-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
          ssid: String(p.ssid),
          password: p.password ? String(p.password) : undefined,
          auth: (p.auth as WifiPoint['auth']) ?? 'WPA2',
          place: String(p.place ?? 'sin lugar'),
          lat: p.lat as number,
          lon: p.lon as number,
          band: p.band,
          notes: p.notes ? String(p.notes) : undefined,
          author: p.author ? String(p.author) : 'importado',
          added: new Date().toISOString().slice(0, 10),
          source: 'usuario' as const,
          bssid: p.bssid ? String(p.bssid) : undefined,
          channel: p.channel,
          frequency: p.frequency,
          lastSeenRaw: p.lastSeenRaw ? String(p.lastSeenRaw) : undefined,
          security: p.security ? String(p.security) : undefined,
          encryption: p.encryption ? String(p.encryption) : undefined,
        })),
        ...current,
      ]
      saveUserPoints(merged)
      setUserPoints(merged)
      toast(`${valid.length} redes importadas`)
    } catch (e) {
      setImportErr((e as Error).message)
    }
  }

  const authTone = (a?: string): 'ok' | 'info' | 'warn' | 'bad' | 'neutral' =>
    a === 'abierta' ? 'ok' : a === 'WEP' ? 'bad' : a === 'WPA3' ? 'info' : a === 'WPA2' ? 'warn' : 'neutral'

  const srcBadge = (s?: WifiPoint['source']) =>
    s === 'wigle' ? <Badge tone="info">WiGLE</Badge> : s === 'usuario' ? <Badge tone="accent">tuya</Badge> : <Badge tone="neutral">demo</Badge>

  const wigleByAuth = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of wiglePoints) c[p.auth ?? 'desconocida'] = (c[p.auth ?? 'desconocida'] ?? 0) + 1
    return c
  }, [wiglePoints])

  return (
    <div>
      <ToolHeader icon={Wifi} title="WiFi Map" desc="Mapa global de redes WiFi: conecta tu cuenta gratuita de WiGLE (más de 1.000M de redes reales observadas por la comunidad) o comparte las tuyas — BSSID, canal, banda, cifrado y última vez vista" />

      <InfoBanner>
        <b>Conecta WiGLE</b> (API Name + Token gratuitos de <span className="font-mono text-acento">wigle.net/account</span>) para consultar redes <b>reales</b> de la base comunitaria: se guardan solo en tu navegador y únicamente viajan a <span className="font-mono">api.wigle.net</span>. Sin conexión, el mapa muestra {SEED_POINTS.length} redes demo ficticias + tus redes locales. Ver redes observadas públicamente es legal; <b>conectarse a redes ajenas sin permiso no</b> (acceso ilícito a sistemas informáticos). Tiles del mapa: Esri/OSM, sin API key.
      </InfoBanner>

      {/* barra de controles */}
      <Reveal>
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-52 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="buscar SSID, BSSID o lugar…" className="pl-9" />
          </div>
          <div className="flex overflow-hidden rounded-xl border border-edge">
            {([['all', 'todas'], ['own', 'mías+demo'], ['wigle', 'WiGLE']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setSourceSel(v)} className={`px-3 py-2 font-mono text-[11px] transition-colors ${sourceSel === v ? 'bg-acento/15 text-acento' : 'text-grey hover:text-ink'}`}>{label}</button>
            ))}
          </div>
          <Button onClick={locate} className="gap-2 px-3 py-2 text-xs"><LocateFixed size={14} /> localízame</Button>
          <Button variant="ghost" onClick={() => setShowPanel((o) => !o)} className={`gap-2 px-3 py-2 text-xs ${creds ? 'text-info' : ''}`}>
            <Satellite size={14} /> WiGLE {creds ? '· conectado' : ''}
          </Button>
          <Button variant="ghost" onClick={() => setFormOpen((o) => !o)} className="gap-2 px-3 py-2 text-xs">
            {formOpen ? <X size={14} /> : <Plus size={14} />} {formOpen ? 'cerrar' : 'compartir red'}
          </Button>
          <Button variant="ghost" onClick={exportJson} className="gap-2 px-3 py-2 text-xs" title="exportar JSON"><Download size={14} /> JSON</Button>
          <Button variant="ghost" onClick={exportCsv} className="gap-2 px-3 py-2 text-xs" title="exportar CSV"><FileDown size={14} /> CSV</Button>
          <Button variant="ghost" onClick={() => importRef.current?.click()} className="gap-2 px-3 py-2 text-xs"><Upload size={14} /> importar</Button>
          <input ref={importRef} type="file" hidden accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f) }} />
        </div>
      </Reveal>

      {/* panel WiGLE */}
      {showPanel && (
        <Reveal>
          <div className="card mb-4 p-6">
            <h3 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><Satellite size={13} /> base de datos WiGLE {creds && <Badge tone="ok" className="ml-1">conectado como {creds.apiName}</Badge>}</h3>
            {!creds ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <InfoBanner>
                    Crea una cuenta gratuita en <b>wigle.net</b> y genera tu par de claves en <b>Account → API</b> (botón "Generate new token"). Pégalas aquí: se guardan cifradas por tu navegador en localStorage y solo se envían a api.wigle.net. La API gratuita permite ~50 consultas/hora, cajas de 0.35° y ~100 redes por consulta.
                  </InfoBanner>
                </div>
                <Field label="API Name">
                  <TextInput value={credsDraft.apiName} onChange={(e) => setCredsDraft((d) => ({ ...d, apiName: e.target.value }))} placeholder="A1B2C3D4…" className="font-mono" />
                </Field>
                <Field label="API Token">
                  <TextInput type="password" value={credsDraft.apiToken} onChange={(e) => setCredsDraft((d) => ({ ...d, apiToken: e.target.value }))} placeholder="••••••••••••••••" className="font-mono" />
                </Field>
                <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                  <Button onClick={connectWigle} className="gap-2"><Satellite size={14} /> guardar y conectar</Button>
                  <Button variant="ghost" onClick={() => setShowPanel(false)} className="px-3 py-2 text-xs">usar solo demo</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="filtrar por SSID (opcional)" hint="vacío = todas las redes de la caja">
                  <TextInput value={ssidFilter} onChange={(e) => setSsidFilter(e.target.value)} placeholder="Movistar_, vodafone, cafe…" className="font-mono" />
                </Field>
                <div className="flex flex-wrap items-end gap-2">
                  <Button onClick={() => fetchRef.current()} className="gap-2"><Search size={14} /> buscar en esta zona</Button>
                  <Button variant="ghost" onClick={() => setAutoFetch((a) => !a)} className="px-3 py-2 text-xs">{autoFetch ? 'auto: ON al mover el mapa' : 'auto: OFF (manual)'}</Button>
                  <Button variant="danger" onClick={disconnectWigle} className="gap-2 px-3 py-2 text-xs"><Trash2 size={13} /> desconectar</Button>
                </div>
                {wigleTotal !== null && (
                  <div className="md:col-span-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-grey">
                    <span>{wiglePoints.length} redes cargadas en sesión</span>
                    {Object.entries(wigleByAuth).map(([k, v]) => (
                      <Badge key={k} tone={authTone(k)}>{k}: {v}</Badge>
                    ))}
                    {wigleTotal > wiglePoints.length && <span className="text-grey/70">· {wigleTotal.toLocaleString('es')} totales en la zona completa</span>}
                  </div>
                )}
                <div className="md:col-span-2">
                  <div className="rounded-xl border border-edge bg-black/30 p-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">FAQ WiGLE</p>
                    <div className="space-y-1.5">
                      {WIGLE_FAQ.map(([q, a]) => (
                        <details key={q} className="group">
                          <summary className="cursor-pointer list-none font-mono text-[12px] text-ink marker:content-none group-open:text-acento">{q}</summary>
                          <p className="mt-1 pl-3 font-mono text-[11px] leading-relaxed text-grey">{a}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {wigleErr && <div className="mb-4"><ErrorBox>WiGLE: {wigleErr}</ErrorBox></div>}

      {/* formulario compartir */}
      {formOpen && (
        <Reveal>
          <div className="card mb-4 p-6">
            <h3 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><Plus size={13} /> compartir una red (solo en tu navegador)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="SSID" hint="nombre de la red">
                <TextInput value={form.ssid} onChange={(e) => setForm((f) => ({ ...f, ssid: e.target.value }))} placeholder="Cafe_Conectado" className="font-mono" />
              </Field>
              <Field label="clave" hint="vacía si es abierta">
                <TextInput value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="font-mono" />
              </Field>
              <Field label="autenticación">
                <Select value={form.auth} onChange={(e) => setForm((f) => ({ ...f, auth: e.target.value }))} options={['abierta', 'WPA2', 'WPA3', 'WEP'].map((v) => ({ value: v, label: v }))} />
              </Field>
              <Field label="banda">
                <Select value={form.band} onChange={(e) => setForm((f) => ({ ...f, band: e.target.value }))} options={['2.4 GHz', '5 GHz', '6 GHz'].map((v) => ({ value: v, label: v }))} />
              </Field>
              <Field label="lugar" hint="barrio / ciudad / sitio">
                <TextInput value={form.place} onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))} placeholder="Biblioteca — Centro, Madrid" className="font-mono" />
              </Field>
              <Field label="notas" hint="horario, límites, portal cautivo…">
                <TextArea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="clave en la barra · funciona mejor cerca de la ventana" className="min-h-20" />
              </Field>
              <Field label="latitud" hint="-90 a 90">
                <TextInput value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} placeholder="40.41680" className="font-mono" />
              </Field>
              <Field label="longitud" hint="-180 a 180">
                <TextInput value={form.lon} onChange={(e) => setForm((f) => ({ ...f, lon: e.target.value }))} placeholder="-3.70380" className="font-mono" />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={submit} className="gap-2"><MapPin size={14} /> añadir al mapa</Button>
              <Button variant="ghost" onClick={useMapCenter} className="gap-2 px-3 py-2 text-xs"><Crosshair size={13} /> centro del mapa</Button>
              <Button variant="ghost" onClick={useMyLocation} className="gap-2 px-3 py-2 text-xs"><LocateFixed size={13} /> mi ubicación</Button>
            </div>
          </div>
        </Reveal>
      )}

      {/* mapa */}
      <Reveal>
        <div className="relative z-0 overflow-hidden rounded-2xl border border-edge">
          <div ref={mapDivRef} className="h-[440px] w-full md:h-[560px]" />
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap gap-1.5 font-mono text-[10px]">
            <span className="rounded-md border border-edge bg-black/80 px-2 py-1 text-acento">zoom: {zoom}</span>
            <span className="rounded-md border border-edge bg-black/80 px-2 py-1 text-grey">celdas: {cells}</span>
            <span className="rounded-md border border-edge bg-black/80 px-2 py-1 text-grey">puntos visibles: {visible}</span>
            {creds && <span className={`rounded-md border bg-black/80 px-2 py-1 ${loading ? 'border-info/60 text-info animate-pulse' : 'border-edge text-grey'}`}>WiGLE: {loading ? 'consultando…' : `${wiglePoints.length} cargadas`}</span>}
            {creds && zoom < WIGLE_MIN_ZOOM && <span className="rounded-md border border-warn/50 bg-black/80 px-2 py-1 text-warn">zoom {WIGLE_MIN_ZOOM}+ para auto-consultar WiGLE</span>}
            {zoom < ZOOM_INDIVIDUAL && <span className="rounded-md border border-warn/50 bg-black/80 px-2 py-1 text-warn">zoom {ZOOM_INDIVIDUAL}+ para puntos individuales</span>}
          </div>
        </div>
      </Reveal>

      {/* leyenda */}
      <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] text-grey">
        {Object.entries(AUTH_COLOR).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} /> {k}
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-info bg-info/20" /> punto hueco = WiGLE</span>
        <span className="ml-auto">tiles: Esri Dark Gray Canvas (OSM) · datos: WiGLE.net + comunidad · mapa: Leaflet</span>
      </div>

      {importErr && <div className="mt-4"><ErrorBox>Import JSON: {importErr}</ErrorBox></div>}

      {/* detalle de red seleccionada */}
      {selected && (
        <Reveal>
          <div className="card mt-6 border-acento/30 p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-acento/40 bg-acento/10 text-acento"><Wifi size={17} /></span>
              <div>
                <h3 className="font-mono text-lg font-bold text-white">{selected.ssid}</h3>
                <p className="font-mono text-[11px] text-grey">{selected.place}</p>
              </div>
              <Badge tone={authTone(selected.auth)} className="ml-auto">{selected.auth ?? 'WPA2'}</Badge>
              {selected.band && <Badge tone="neutral">{selected.band}{selected.channel ? ` · ch ${selected.channel}` : ''}</Badge>}
              {selected.source === 'wigle' && selected.lastSeen && <Badge tone={lastSeenTone(selected.lastSeenRaw) ?? 'neutral'}>vista {selected.lastSeen}</Badge>}
              {srcBadge(selected.source)}
              <Button variant="ghost" onClick={() => setSelected(null)} className="ml-2 px-2 py-1"><X size={14} /></Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                {/* clave (solo redes demo/tuyas la tienen) */}
                {selected.source !== 'wigle' && (
                  <div className="flex items-center justify-between gap-3 border-b border-edge/60 px-4 py-2.5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-grey">clave</span>
                    {selected.password ? (
                      <span className="flex items-center gap-2">
                        <span className="break-all font-mono text-[13px] text-acento">{revealed ? selected.password : '•'.repeat(Math.min(selected.password.length, 16))}</span>
                        <button onClick={() => setRevealed((r) => !r)} className="text-grey transition-colors hover:text-acento" title={revealed ? 'ocultar' : 'revelar'}>
                          {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {revealed && <CopyBtn text={selected.password} className="border-0 bg-transparent px-1 py-0.5" />}
                      </span>
                    ) : (
                      <Badge tone="ok">red abierta — sin clave</Badge>
                    )}
                  </div>
                )}
                {selected.bssid && (
                  <div className="flex items-center justify-between gap-3 border-b border-edge/60 px-4 py-2.5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-grey">BSSID</span>
                    <span className="flex items-center gap-2 font-mono text-[13px] text-ink">
                      {selected.bssid}
                      <CopyBtn text={selected.bssid} className="border-0 bg-transparent px-1 py-0.5" />
                    </span>
                  </div>
                )}
                {(selected.security || selected.encryption) && (
                  <div className="flex items-center justify-between gap-3 border-b border-edge/60 px-4 py-2.5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-grey">seguridad</span>
                    <span className="font-mono text-[13px] text-info">{[selected.security, selected.encryption].filter(Boolean).join(' · ')}</span>
                  </div>
                )}
                {selected.frequency && (
                  <div className="flex items-center justify-between gap-3 border-b border-edge/60 px-4 py-2.5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-grey">frecuencia</span>
                    <span className="font-mono text-[13px] text-ink">{selected.frequency} MHz{selected.channel ? ` (canal ${selected.channel})` : ''}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 border-b border-edge/60 px-4 py-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-grey">coordenadas</span>
                  <span className="font-mono text-[13px] text-ink">{selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}</span>
                </div>
                {userLoc && (
                  <div className="flex items-center justify-between gap-3 border-b border-edge/60 px-4 py-2.5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-grey">distancia</span>
                    <span className="font-mono text-[13px] text-info">{haversineKm(userLoc, selected) < 1 ? `${Math.round(haversineKm(userLoc, selected) * 1000)} m` : `${haversineKm(userLoc, selected).toFixed(1)} km`}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-grey">{selected.source === 'wigle' ? 'última observación' : 'aportada'}</span>
                  <span className="font-mono text-[13px] text-ink">{selected.source === 'wigle' ? `${selected.lastSeenRaw ?? selected.added} · ${selected.lastSeen ?? ''}` : `${selected.added} · ${selected.author ?? 'anónimo'}`}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {selected.source === 'wigle' && (
                  <InfoBanner>
                    Las claves <b>no forman parte</b> de la base de WiGLE: solo metadatos observados al vuelo (beacons). Usar una red ajena sin autorización expresa es delito — esto es contexto de wardriving defensivo y OSINT.
                  </InfoBanner>
                )}
                {selected.notes && (
                  <div className="rounded-xl border border-edge bg-black/30 p-4">
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">notas de la comunidad</p>
                    <p className="font-mono text-[12px] leading-relaxed text-ink/90">{selected.notes}</p>
                  </div>
                )}
                {selected.password && (
                  <div className="rounded-xl border border-edge bg-black/30 p-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">conéctate desde la terminal</p>
                    <code className="block break-all font-mono text-[11px] text-info">nmcli dev wifi connect "{selected.ssid}" password "{revealed ? selected.password : '•••'}"</code>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" className="gap-2 px-3 py-1.5 text-xs" onClick={() => focusPoint(selected)}><Crosshair size={13} /> centrar en mapa</Button>
                  {selected.source === 'wigle' && (
                    <Button variant="ghost" className="gap-2 px-3 py-1.5 text-xs" onClick={() => { setSsidFilter(selected.ssid === '(oculta)' ? '' : selected.ssid); setShowPanel(true); toast('filtro SSID puesto — pulsa "buscar en esta zona"') }}><KeySquare size={13} /> buscar más de este SSID</Button>
                  )}
                  {selected.source === 'usuario' && (
                    <Button variant="danger" className="gap-2 px-3 py-1.5 text-xs" onClick={() => del(selected.id)}><Trash2 size={13} /> eliminar</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* cercanas */}
      {userLoc && nearest.length > 0 && (
        <Reveal>
          <div className="card mt-6 p-6">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><LocateFixed size={13} /> redes más cercanas a ti</h3>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead><tr className="text-left text-grey/60"><th className="pb-2 pr-3">SSID</th><th className="pb-2 pr-3">BSSID</th><th className="pb-2 pr-3">auth</th><th className="pb-2 pr-3">dist</th><th className="pb-2 pr-3">vista</th><th className="pb-2">clave</th></tr></thead>
                <tbody className="divide-y divide-edge/60">
                  {nearest.map(({ p, km }) => (
                    <tr key={p.id} className="cursor-pointer transition-colors hover:bg-acento/5" onClick={() => focusPoint(p)}>
                      <td className="py-2 pr-3 text-ink">{p.ssid}</td>
                      <td className="py-2 pr-3 text-grey">{p.bssid ?? '—'}</td>
                      <td className="py-2 pr-3"><Badge tone={authTone(p.auth)}>{p.auth ?? 'WPA2'}</Badge></td>
                      <td className="py-2 pr-3 text-info">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(0)} km`}</td>
                      <td className="py-2 pr-3 text-grey">{p.lastSeen ?? p.added}</td>
                      <td className="py-2 text-grey">{p.password ? (showKeys ? p.password : '••••••') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {nearest.some((n) => n.p.password) && (
              <button onClick={() => setShowKeys((s) => !s)} className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-grey transition-colors hover:text-acento">
                {showKeys ? <EyeOff size={12} /> : <Eye size={12} />} {showKeys ? 'ocultar claves' : 'mostrar claves de la tabla'}
              </button>
            )}
          </div>
        </Reveal>
      )}

      <Reveal>
        <p className="mt-6 font-mono text-[10px] leading-relaxed text-grey/60">
          💡 {userPoints.length} red(es) tuyas en este navegador · {wiglePoints.length} de WiGLE en sesión · las {SEED_POINTS.length} demo son ficticias y formativas · exporta JSON/CSV para respaldar o analizar tu mapa con kismet/wigle-cli.
        </p>
      </Reveal>
    </div>
  )
}
