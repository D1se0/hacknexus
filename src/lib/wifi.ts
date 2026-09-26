/* Mapa WiFi comunitario: puntos "demo" generados proceduralmente (como la
   referencia dorksearch, que construye sus tiles con build_tiles.py) + los
   puntos que aporta el usuario, que viven en localStorage (nada sale del
   navegador). El seed demo cambia en cada carga de página: redes ficticias
   con tiempos realistas repartidas por ciudades del mundo. */

export interface WifiPoint {
  id: string
  ssid: string
  password?: string
  auth?: 'abierta' | 'WPA2' | 'WPA3' | 'WEP' | 'desconocida'
  place: string
  lat: number
  lon: number
  band?: '2.4 GHz' | '5 GHz' | '6 GHz' | string
  notes?: string
  author?: string
  added: string // ISO date
  source: 'demo' | 'usuario' | 'wigle'
  /* metadatos cuando la red viene de WiGLE */
  bssid?: string
  channel?: number
  frequency?: number
  lastSeen?: string // 'hace 3 días' (precalculado)
  lastSeenRaw?: string // ISO original de WiGLE
  security?: string // tipo crudo de WiGLE (WPA3, WPA2, WEP…)
  encryption?: string // cifrado crudo (CCMP, TKIP…)
}

const LS_KEY = 'hacknexus-wifi-points-v1'

/* ── generación procedural del set demo ─────────────────────────────── */

// PRNG determinista (mulberry32): misma "seed" → mismo mapa durante la sesión
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CITY = [
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, barrios: ['Malasaña', 'Lavapiés', 'Chamberí', 'La Latina', 'Retiro', 'Arganzuela'] },
  { name: 'Barcelona', lat: 41.3874, lon: 2.1686, barrios: ['Gràcia', 'El Raval', 'Eixample', 'Born', 'Poblenou', 'Sants'] },
  { name: 'Berlín', lat: 52.52, lon: 13.405, barrios: ['Kreuzberg', 'Neukölln', 'Mitte', 'Prenzlauer Berg', 'Friedrichshain', 'Wedding'] },
  { name: 'París', lat: 48.8566, lon: 2.3522, barrios: ['Belleville', 'Canal Saint-Martin', 'Montmartre', 'Le Marais', 'Butte-aux-Cailles', 'Oberkampf'] },
  { name: 'Londres', lat: 51.5072, lon: -0.1276, barrios: ['Shoreditch', 'Camden', 'Brixton', 'Hackney', 'Soho', 'Peckham'] },
  { name: 'Nueva York', lat: 40.7128, lon: -74.006, barrios: ['SoHo', 'Williamsburg', 'Chinatown', 'Harlem', 'Bushwick', 'Lower East Side'] },
  { name: 'CDMX', lat: 19.4326, lon: -99.1332, barrios: ['Roma Norte', 'Condesa', 'Coyoacán', 'Juárez', 'Doctores', 'San Rafael'] },
  { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816, barrios: ['Palermo', 'San Telmo', 'Recoleta', 'Villa Crespo', 'Almagro', 'Caballito'] },
  { name: 'Lisboa', lat: 38.7223, lon: -9.1393, barrios: ['Alfama', 'Bairro Alto', 'Príncipe Real', 'Graça', 'Alameda', 'Campo de Ourique'] },
  { name: 'Ámsterdam', lat: 52.3676, lon: 4.9041, barrios: ['De Pijp', 'Jordaan', 'Oost', 'Noord', 'Centrum', 'West'] },
  { name: 'Tokio', lat: 35.6762, lon: 139.6503, barrios: ['Shibuya', 'Shinjuku', 'Akihabara', 'Shimokitazawa', 'Ikebukuro', 'Ginza'] },
  { name: 'Seúl', lat: 37.5665, lon: 126.978, barrios: ['Hongdae', 'Itaewon', 'Gangnam', 'Mapo', 'Jongno', 'Seongsu'] },
  { name: 'Sídney', lat: -33.8688, lon: 151.2093, barrios: ['Newtown', 'Surry Hills', 'Bondi', 'Glebe', 'Marrickville', 'Potts Point'] },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, barrios: ['Vila Madalena', 'Pinheiros', 'Bela Vista', 'Itaim', 'Perdizes', 'Tatuapé'] },
  { name: 'Reikiavik', lat: 64.1466, lon: -21.9426, barrios: ['Miðborg', 'Laugavegur', 'Vesturbær', 'Hlíðar'] },
  { name: 'Estocolmo', lat: 59.3293, lon: 18.0686, barrios: ['Södermalm', 'Norrmalm', 'Vasastan', 'Östermalm', 'Kungsholmen'] },
]

// nombres compuestos por tipo de venue — sin credenciales reales
const VENUES: { tpl: (b: string, c: string) => string; notes: (b: string, c: string) => string }[] = [
  { tpl: (b, c) => `Cafeteria_${b}_${c}`.replace(/[^A-Za-z0-9_]/g, ''), notes: () => 'La clave viene en la ticket de la consumición. Se cae a veces al abrir el portal.' },
  { tpl: (b) => `${b.replace(/[^A-Za-z0-9]/g, '')}_Library_Free`, notes: (b, c) => `WiFi municipal de la biblioteca de ${b}, ${c}. Sesión de 2 horas renovable.` },
  { tpl: (b, c) => `${c.replace(/[^A-Za-z0-9]/g, '')}_Airport_Free`, notes: () => 'Portal cautivo oficial del aeropuerto: pide email para conectar.' },
  { tpl: (b, c) => `Coworking_${b.slice(0, 4)}_${c.slice(0, 3)}`.replace(/[^A-Za-z0-9_]/g, ''), notes: () => 'Solo miembros. La rotan cada trimestre.' },
  { tpl: (b, c) => `Hostel_${b.slice(0, 5)}_${c.slice(0, 3)}`.replace(/[^A-Za-z0-9_]/g, ''), notes: () => 'Red para huéspedes; preguntar en recepción por la de la terraza.' },
  { tpl: (b, c) => `${c.replace(/[^A-Za-z0-9]/g, '')}_Metro_Guest`, notes: (b) => `Guest de la estación de ${b}. Corta sesión y mucho captive portal.` },
  { tpl: (b, c) => `Uni_${b.slice(0, 3)}_Campus`, notes: () => 'Red del campus: eduroam para estudiantes y esta guest para visitas.' },
  { tpl: (b, c) => `Bar_${b.slice(0, 5)}1889`.replace(/[^A-Za-z0-9_]/g, ''), notes: () => 'El router viejo del bar. Funciona mejor cerca de la ventana.' },
  { tpl: (b, c) => `Hotel_${c.replace(/[^A-Za-z0-9]/g, '')}_VIP`, notes: () => 'La red "premium" del hotel. Mismo ancho de banda que la gratis.' },
  { tpl: (b, c) => `GYM_${b.replace(/[^A-Za-z0-9]/g, '')}_${c.slice(0, 2)}`, notes: () => 'Clave pegada detrás de la recepción del gimnasio.' },
]

const KEYS = [
  'quicos2024', 'cervezafria!', 'WiFiGratis2026', 'lunes_lab', 'p4ssw0rd_Viejo', 'pulpo.frito',
  'estoesunclave', 'micontraseña1', 'gatoNegro77', 'clavedelunes', 'flujo.2033', 'temporal2025',
  'cocacolaxx', 'boliche-99', 'invitadosABI', 'muscleyfam', 'pastel31415', 'd0ckerfun',
  'kombucha&code', 'saborcasa12', 'netflix-y-chill', 'router221b', 'vacalouca9', 'slskm_2003',
  'passw0rd!', '12345678', 'querty2024', 'verano_2025', 'abcd1234', 'sistemas99',
  'S3gur1d4d!', 'firulais2023', 'bienvenido1', 'invitado123', 'cambiarclave', 'hackme_pls',
]

const AUTHOR = ['demo', 'demo', 'demo', 'comunidad', 'anónimo']

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)]
}

function genDemoPoints(seed: number): WifiPoint[] {
  const rnd = mulberry32(seed)
  const points: WifiPoint[] = []
  let i = 0
  for (const city of CITY) {
    // 6-11 redes por ciudad, dispersas alrededor del centro (±0.06° ≈ 6 km)
    const n = 6 + Math.floor(rnd() * 6)
    for (let j = 0; j < n; j++) {
      const venue = pick(rnd, VENUES)
      const barrio = pick(rnd, city.barrios)
      const roll = rnd()
      const auth: WifiPoint['auth'] = roll < 0.22 ? 'abierta' : roll < 0.32 ? 'WEP' : roll < 0.86 ? 'WPA2' : 'WPA3'
      const lat = city.lat + (rnd() - 0.5) * 0.12
      const lon = city.lon + (rnd() - 0.5) * 0.12
      const year = 2024 + Math.floor(rnd() * 3)
      const month = 1 + Math.floor(rnd() * 12)
      const day = 1 + Math.floor(rnd() * 28)
      points.push({
        id: `d${++i}`,
        ssid: venue.tpl(barrio, city.name).slice(0, 28),
        password: auth === 'abierta' ? undefined : pick(rnd, KEYS),
        auth,
        place: `${venue === VENUES[1] ? 'Biblioteca' : venue === VENUES[2] ? 'Aeropuerto' : venue === VENUES[5] ? 'Estación' : 'Venue'} — ${barrio}, ${city.name}`,
        lat: Math.round(lat * 10000) / 10000,
        lon: Math.round(lon * 10000) / 10000,
        band: rnd() < 0.6 ? '2.4 GHz' : rnd() < 0.9 ? '5 GHz' : '6 GHz',
        notes: venue.notes(barrio, city.name),
        author: pick(rnd, AUTHOR),
        added: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        source: 'demo',
      })
    }
  }
  return points
}

// mismo seed durante toda la vida de la página (como la demo de la referencia,
// que sirve tiles preconstruidos); recargar cambia el set
export const SEED_POINTS: WifiPoint[] = genDemoPoints(Math.floor(Date.now() / 86400000) ^ 0x5eed)

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
