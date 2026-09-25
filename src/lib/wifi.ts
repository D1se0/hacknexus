/* Mapa WiFi comunitario: puntos compartidos por la "comunidad" con SSID,
   clave, lugar y notas. Los aportados por el usuario viven en localStorage
   (nada sale del navegador); el seed es un set demo mundial para formación. */

export interface WifiPoint {
  id: string
  ssid: string
  password?: string
  auth?: 'abierta' | 'WPA2' | 'WPA3' | 'WEP'
  place: string
  lat: number
  lon: number
  band?: '2.4 GHz' | '5 GHz' | '6 GHz'
  notes?: string
  author?: string
  added: string // ISO date
  source: 'demo' | 'usuario'
}

const LS_KEY = 'hacknexus-wifi-points-v1'

/* ── seed demo: redes repartidas por el mundo (datos ficticios con tiempos realistas) ── */
export const SEED_POINTS: WifiPoint[] = [
  { id: 'd1', ssid: 'La_Retro_Cafeteria', password: 'cafeconleche2024', auth: 'WPA2', place: 'Cafetería La Retro — Malasaña, Madrid', lat: 40.4257, lon: -3.7038, band: '2.4 GHz', notes: 'Contraseña en la pizarra de la barra. Tomate algo, mejor.', author: 'demo', added: '2025-11-02', source: 'demo' },
  { id: 'd2', ssid: 'BIBLIOTECA_PUBLICA', auth: 'abierta', place: 'Biblioteca Pública — Centro, Madrid', lat: 40.4198, lon: -3.6983, band: '5 GHz', notes: 'Abierta, red oficial del ayuntamiento. Puerto 8080 filtrado.', author: 'demo', added: '2025-10-18', source: 'demo' },
  { id: 'd3', ssid: 'Aeropuerto_Barajas_Free', auth: 'abierta', place: 'T4 — Aeropuerto Adolfo Suárez Barajas', lat: 40.4722, lon: -3.5608, band: '2.4 GHz', notes: 'Free oficial con portal cautivo (email para conectar).', author: 'demo', added: '2025-09-30', source: 'demo' },
  { id: 'd4', ssid: 'Camping_CaboGata_Guest', password: 'playa2025!', auth: 'WPA2', place: 'Camping Cabo de Gata — Almería', lat: 36.7597, lon: -2.1802, band: '2.4 GHz', notes: 'Red para huéspedes. La del personal es otra, no la toques.', author: 'demo', added: '2025-08-21', source: 'demo' },
  { id: 'd5', ssid: 'COWORKING_Nolita', password: 'n0lit4-5t4ff', auth: 'WPA3', place: 'Nolita Coworking — SoHo, Nueva York', lat: 40.7243, lon: -74.0018, band: '5 GHz', notes: 'WPA3, solo miembros. Clave rota trimestralmente.', author: 'demo', added: '2025-07-14', source: 'demo' },
  { id: 'd6', ssid: 'Parc_Guell_WiFi', auth: 'abierta', place: 'Zona de descanso — Park Güell, Barcelona', lat: 41.4145, lon: 2.1527, band: '2.4 GHz', notes: 'Cobertura floja en la zona monumental.', author: 'demo', added: '2025-06-05', source: 'demo' },
  { id: 'd7', ssid: 'KaffeeHaus_Berlin_Guest', password: 'kaffee.und.kuchen', auth: 'WPA2', place: 'Kaffee Haus — Kreuzberg, Berlín', lat: 52.4986, lon: 13.4034, band: '2.4 GHz', notes: 'Guest con bandwidth limitado a 10 Mbps.', author: 'demo', added: '2025-05-19', source: 'demo' },
  { id: 'd8', ssid: 'Hostel_Dream_Paris', password: 'croissant42', auth: 'WPA2', place: 'Dream Hostel — Canal Saint-Martin, París', lat: 48.8717, lon: 2.3648, band: '2.4 GHz', notes: 'En recepción la tienen pegada en el mostrador.', author: 'demo', added: '2025-04-27', source: 'demo' },
  { id: 'd9', ssid: 'CCB_MediaLab', password: 'med1al4b#26', auth: 'WPA2', place: 'Centre de Cultura de Barcelona — El Raval', lat: 41.3817, lon: 2.1637, band: '5 GHz', notes: 'Red del laboratorio multimedia, solo talleres.', author: 'demo', added: '2025-03-11', source: 'demo' },
  { id: 'd10', ssid: 'Starbucks_Reforma_ATT', auth: 'abierta', place: 'Starbucks Paseo de la Reforma — CDMX', lat: 19.4260, lon: -99.1677, band: '2.4 GHz', notes: 'Portal cautivo de AT&T, pide teléfono.', author: 'demo', added: '2025-02-08', source: 'demo' },
  { id: 'd11', ssid: 'TULLERIAS_FREE', auth: 'abierta', place: 'Jardines de las Tullerías — París', lat: 48.8635, lon: 2.3275, band: '2.4 GHz', notes: 'WiFi municipal gratuito, se renueva cada 2h de sesión.', author: 'demo', added: '2025-01-15', source: 'demo' },
  { id: 'd12', ssid: 'Shibuya_Station_Public', auth: 'abierta', place: 'Estación de Shibuya — Tokio', lat: 35.6580, lon: 139.7016, band: '2.4 GHz', notes: 'Freetravel de JR East, app para registro. SSID real:公衆Wi-Fi.', author: 'demo', added: '2024-12-30', source: 'demo' },
  { id: 'd13', ssid: 'CasaLab_Interlab_Guest', password: 'int3rl4b-2026', auth: 'WPA2', place: 'Interlab Makerspace — Lavapiés, Madrid', lat: 40.4086, lon: -3.7021, band: '5 GHz', notes: 'Guest para talleres abiertos de los martes.', author: 'demo', added: '2026-01-04', source: 'demo' },
  { id: 'd14', ssid: 'ETSI_Nordic_Lab', password: 'n0rd1c.lab.88', auth: 'WPA2', place: 'Laboratorio ETSI — Campus Nord, Madrid', lat: 40.4436, lon: -3.7292, band: '5 GHz', notes: 'Red de práctica para alumnos de ciberseguridad. Router IKEA hackeado… digo, configurado.', author: 'demo', added: '2026-01-22', source: 'demo' },
  { id: 'd15', ssid: 'PuntoLimpio_Envases', auth: 'abierta', place: 'Dehesa de la Villa — Madrid', lat: 40.4418, lon: -3.7167, band: '2.4 GHz', notes: 'Punto de acceso municipal vecinal, alcance corto.', author: 'demo', added: '2026-02-11', source: 'demo' },
  { id: 'd16', ssid: 'TheBeachBar_KohLanta', password: 'beachbar2019', auth: 'WEP', place: 'The Beach Bar — Ko Lanta, Tailandia', lat: 7.6319, lon: 99.0344, band: '2.4 GHz', notes: 'WEP en 2026… router de 2009. Es como conectarse a la historia.', author: 'demo', added: '2026-02-18', source: 'demo' },
  { id: 'd17', ssid: 'REYKJAVIK_CITY_CARD', auth: 'abierta', place: 'Centro ciudad — Reikiavik, Islandia', lat: 64.1466, lon: -21.9426, band: '5 GHz', notes: 'WiFi municipal para poseedores de la City Card.', author: 'demo', added: '2026-03-02', source: 'demo' },
  { id: 'd18', ssid: 'Circulo_Bellas_Artes_Guest', password: 'bellasartesguest', auth: 'WPA2', place: 'Azotea del Círculo — Madrid', lat: 40.4199, lon: -3.6944, band: '2.4 GHz', notes: 'Guest en la azotea, vista perfecta y latencia irregular.', author: 'demo', added: '2026-03-15', source: 'demo' },
  { id: 'd19', ssid: 'Betahaus_Kreuzberg', password: 'b3t4h4us25', auth: 'WPA3', place: 'Betahaus — Kreuzberg, Berlín', lat: 52.4909, lon: 13.4183, band: '6 GHz', notes: 'WiFi 6E, WPA3 obligatorio. Muy rápido.', author: 'demo', added: '2026-04-01', source: 'demo' },
  { id: 'd20', ssid: 'Trastevere_Hostel_Roma', password: 'gelat0&pizza', auth: 'WPA2', place: 'The RomeHello — Trastevere, Roma', lat: 41.8892, lon: 12.4693, band: '2.4 GHz', notes: 'Preguntar en recepción por la red de la terraza.', author: 'demo', added: '2026-04-19', source: 'demo' },
]

/* ── persistencia local (puntos del usuario) ── */
export function loadUserPoints(): WifiPoint[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as WifiPoint[]
    return Array.isArray(arr) ? arr.filter((p) => p && p.id && typeof p.lat === 'number' && typeof p.lon === 'number') : []
  } catch {
    return []
  }
}

export function saveUserPoints(points: WifiPoint[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(points)) } catch { /* cuota llena, ignoramos */ }
}

export function addUserPoint(p: Omit<WifiPoint, 'id' | 'added' | 'source'>): WifiPoint {
  const point: WifiPoint = { ...p, id: `u-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`, added: new Date().toISOString().slice(0, 10), source: 'usuario' }
  const all = [point, ...loadUserPoints()]
  saveUserPoints(all)
  return point
}

export function removeUserPoint(id: string): void {
  saveUserPoints(loadUserPoints().filter((p) => p.id !== id))
}

/* ── geo helpers ── */
export const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export const authLabel = (p: WifiPoint): string => p.auth ?? 'WPA2'

/* escape para innerHTML de popups de Leaflet */
export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
