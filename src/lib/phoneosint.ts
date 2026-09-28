/* ─── Phone OSINT: validación e identificación de números ───────────────
   Parser E.164 propio (sin dependencias): país, tipo (móvil/fijo/rol),
   geografía aproximada por prefijo, formatos E.164/internacional/nacional,
   URIs tel:/wa.me, detección de números falsos y de rangos ficticios.
   Nota honesta: saber si un teléfono "existe" de verdad exige HLR (de pago);
   aquí se valida que el número sea REALMENTE VÁLIDO y de qué tipo es. */

export interface CountryMeta {
  iso: string
  name: string
  cc: string // calling code sin '+'
  lengths: number[] // longitudes válidas del número nacional (sin prefijo país)
  trunk?: string // prefijo de truncamiento nacional (p.ej. '0')
  mobilePrefixes: string[] // dígitos iniciales que delatan móvil
  landlinePrefixes: string[]
  geo?: Record<string, string> // prefijo → región aproximada
  operatorHist?: Record<string, string> // prefijo móvil → operador original (MNP lo invalida)
  note?: string
}

/* ─── metadatos por país (~45) ────────────────────────────────────────── */
export const COUNTRIES: CountryMeta[] = [
  { iso: 'ES', name: 'España', cc: '34', lengths: [9], mobilePrefixes: ['6', '7'], landlinePrefixes: ['8', '9'],
    geo: { '91': 'Madrid', '81': 'Madrid (nuevo)', '93': 'Barcelona', '83': 'Barcelona (nuevo)', '94': 'Bilbao', '95': 'Sevilla/Málaga/Cádiz', '96': 'Valencia/Alicante/Castellón', '97': 'Zaragoza/Bilbao/Girona…', '98': 'Oviedo/Valladolid…', '85': 'La Coruña/Oviedo (nuevo)' },
    operatorHist: { '600': 'Movistar', '601': 'Movistar', '605': 'Movistar', '606': 'Movistar', '607': 'Movistar', '610': 'Vodafone', '611': 'Vodafone', '615': 'Vodafone', '616': 'Vodafone', '619': 'Vodafone', '620': 'Vodafone', '622': 'Vodafone', '625': 'Vodafone', '626': 'Vodafone', '629': 'Vodafone', '630': 'Orange/Amena', '635': 'Orange', '636': 'Orange', '639': 'Orange', '640': 'Orange', '645': 'Orange', '646': 'Orange', '649': 'Orange', '650': 'Vodafone', '651': 'Vodafone', '655': 'Vodafone', '656': 'Vodafone', '659': 'Vodafone', '660': 'Movistar', '661': 'Movistar', '665': 'Movistar', '666': 'Movistar', '667': 'Movistar', '669': 'Movistar', '670': 'Movistar', '676': 'Movistar', '677': 'Movistar', '679': 'Movistar', '680': 'Orange', '685': 'Orange', '686': 'Orange', '687': 'Orange', '689': 'Orange', '690': 'Vodafone', '695': 'Vodafone/Yoigo', '696': 'Movistar', '697': 'Movistar', '698': 'Vodafone/Yoigo', '699': 'Vodafone' },
    note: 'Móvil: 6/7XXXXXXXX. Fijo: 8/9 + 8 dígitos. Portabilidad (MNP) invalida el operador histórico.' },
  { iso: 'MX', name: 'México', cc: '52', lengths: [10], mobilePrefixes: [], landlinePrefixes: [], note: '10 dígitos para todo (desde 2019 el "1" de móvil ya no se marca). El prefijo de área orienta la ciudad.' },
  { iso: 'AR', name: 'Argentina', cc: '54', lengths: [10, 11], trunk: '0', mobilePrefixes: ['9'], landlinePrefixes: ['1', '2', '3'], note: 'Móvil: +54 9 XX XXXX-XXXX (11). Fijo: +54 11 XXXX-XXXX (10). El 0 y el 15 NO se usan en E.164.' },
  { iso: 'CO', name: 'Colombia', cc: '57', lengths: [10], mobilePrefixes: ['3'], landlinePrefixes: ['1', '2', '4', '5', '6', '7', '8'], note: 'Móvil: 3XXXXXXXXX.' },
  { iso: 'CL', name: 'Chile', cc: '56', lengths: [9], mobilePrefixes: ['9'], landlinePrefixes: ['2'], note: 'Móvil: 9XXXXXXXX. Fijo Santiago: 2 + 8.' },
  { iso: 'PE', name: 'Perú', cc: '51', lengths: [9], mobilePrefixes: ['9'], landlinePrefixes: ['1'], note: 'Móvil: 9XXXXXXXX. Fijo Lima: 1 + 7.' },
  { iso: 'VE', name: 'Venezuela', cc: '58', lengths: [10], mobilePrefixes: ['4'], landlinePrefixes: ['2'], note: 'Móvil: 4XXXXXXXXX (0412, 0414, 0424…).' },
  { iso: 'US', name: 'Estados Unidos / NANP', cc: '1', lengths: [10], mobilePrefixes: [], landlinePrefixes: [],
    geo: { '212': 'Nueva York (Manhattan)', '646': 'Nueva York', '917': 'Nueva York (móvil)', '310': 'Los Ángeles', '424': 'Los Ángeles', '305': 'Miami', '786': 'Miami', '312': 'Chicago', '415': 'San Francisco', '628': 'San Francisco', '702': 'Las Vegas', '214': 'Dallas', '713': 'Houston', '202': 'Washington DC', '617': 'Boston', '206': 'Seattle', '404': 'Atlanta', '602': 'Phoenix', '303': 'Denver', '480': 'Phoenix' },
    note: 'NANP (compartido con Canadá y el Caribe): NPA y NXX no pueden empezar por 0/1. Móvil y fijo NO se distinguen por prefijo.' },
  { iso: 'CA', name: 'Canadá / NANP', cc: '1', lengths: [10], mobilePrefixes: [], landlinePrefixes: [],
    geo: { '416': 'Toronto', '647': 'Toronto (móvil)', '604': 'Vancouver', '514': 'Montreal', '403': 'Calgary', '780': 'Edmonton', '613': 'Ottawa', '902': 'Marítimas' },
    note: 'Mismo plan NANP que EE. UU. Para distinguir país exacto, el prefijo de área orienta.' },
  { iso: 'GB', name: 'Reino Unido', cc: '44', lengths: [10], trunk: '0', mobilePrefixes: ['7'], landlinePrefixes: ['1', '2'],
    geo: { '20': 'Londres', '121': 'Birmingham', '161': 'Manchester', '113': 'Leeds', '131': 'Edimburgo', '141': 'Glasgow', '151': 'Liverpool', '117': 'Bristol', '114': 'Sheffield' },
    note: 'Móvil: 7XXXXXXXXX (07xxx con trunk). 07700 900xxx es rango FICTICIO para cine/docs. 03 = no geográfico, 08/09 = especiales.' },
  { iso: 'FR', name: 'Francia', cc: '33', lengths: [9], trunk: '0', mobilePrefixes: ['6', '7'], landlinePrefixes: ['1', '2', '3', '4', '5'],
    geo: { '1': 'París/Isla de Francia', '2': 'Noroeste', '3': 'Noreste', '4': 'Sureste', '5': 'Suroeste', '9': 'VoIP/overseas' },
    note: '9 dígitos tras el trunk 0. 8 = números especiales, 9 = VoIP o territorio de ultramar.' },
  { iso: 'DE', name: 'Alemania', cc: '49', lengths: [7, 8, 9, 10, 11], trunk: '0', mobilePrefixes: ['15', '16', '17'], landlinePrefixes: ['2', '3', '4', '6', '7', '8', '9'], note: 'Longitudes muy variables por ciudad. Móvil: 15x/16x/17x.' },
  { iso: 'IT', name: 'Italia', cc: '39', lengths: [9, 10], mobilePrefixes: ['3'], landlinePrefixes: ['0', '8', '9'], note: 'Sin trunk. Móvil: 3XX. Roma 06, Milán 02.' },
  { iso: 'PT', name: 'Portugal', cc: '351', lengths: [9], mobilePrefixes: ['9'], landlinePrefixes: ['2'], note: 'Móvil: 9X (91/92/93/96). Lisboa 21, Oporto 22.' },
  { iso: 'BR', name: 'Brasil', cc: '55', lengths: [10, 11], trunk: '0', mobilePrefixes: ['9'], landlinePrefixes: ['1', '2', '3', '4', '5'], note: 'Móvil: DDD + 9XXXXXXXX (11 dígitos). Fijo: 10.' },
  { iso: 'RU', name: 'Rusia / Kazajistán', cc: '7', lengths: [10], mobilePrefixes: ['9'], landlinePrefixes: ['3', '4', '8'], note: 'Compartido con Kazajistán (+7 6xx/7xx). Móvil: 9XXXXXXXXX. Moscú 495/499.' },
  { iso: 'CN', name: 'China', cc: '86', lengths: [11], mobilePrefixes: ['1'], landlinePrefixes: ['2', '3', '4', '5', '6', '7', '8'], note: 'Móvil: 1XXXXXXXXXX (13x-19x). Pekín 10, Shanghái 21.' },
  { iso: 'JP', name: 'Japón', cc: '81', lengths: [9, 10], trunk: '0', mobilePrefixes: ['7', '8', '9'], landlinePrefixes: ['1', '2', '3', '4', '5', '6'], note: 'Móvil: 070/080/090 (sin trunk: 7/8/9). Tokio 3/6.' },
  { iso: 'IN', name: 'India', cc: '91', lengths: [10], mobilePrefixes: ['6', '7', '8', '9'], landlinePrefixes: ['1', '2', '3', '4'], note: 'Móvil: 6/7/8/9XXXXXXXXX. Delhi 11, Bombay 22.' },
  { iso: 'AU', name: 'Australia', cc: '61', lengths: [9], trunk: '0', mobilePrefixes: ['4'], landlinePrefixes: ['2', '3', '7', '8'], geo: { '2': 'Este (Sídney/Canberra)', '3': 'Sureste (Melbourne)', '7': 'Queensland (Brisbane)', '8': 'Oeste y NT (Perth)' }, note: 'Móvil: 4XXXXXXXX (04xx con trunk). 0550 es ficticio.' },
  { iso: 'NZ', name: 'Nueva Zelanda', cc: '64', lengths: [8, 9, 10], trunk: '0', mobilePrefixes: ['2'], landlinePrefixes: ['3', '4', '6', '7', '9'], note: 'Móvil: 2XXXXXXXX.' },
  { iso: 'ZA', name: 'Sudáfrica', cc: '27', lengths: [9], trunk: '0', mobilePrefixes: ['6', '7', '8'], landlinePrefixes: ['1', '2', '3', '4', '5'], note: 'Móvil: 6x/7x/8x. Johannesburgo 1x, Ciudad del Cabo 21.' },
  { iso: 'NG', name: 'Nigeria', cc: '234', lengths: [10], trunk: '0', mobilePrefixes: ['7', '8', '9', '1'], landlinePrefixes: ['1', '2', '3', '4', '5', '6', '9'], note: 'Móvil: 7/8/9/1 + 9 dígitos (0803/0806…). Lagos 1.' },
  { iso: 'KE', name: 'Kenia', cc: '254', lengths: [9], trunk: '0', mobilePrefixes: ['7', '1'], landlinePrefixes: ['2', '4', '5', '6'], note: 'Móvil: 7XX/1XX. Nairobi 20.' },
  { iso: 'EG', name: 'Egipto', cc: '20', lengths: [10], trunk: '0', mobilePrefixes: ['1'], landlinePrefixes: ['2', '3', '4', '5'], note: 'Móvil: 1XXXXXXXXX (010/011/012/015). El Cairo 2.' },
  { iso: 'MA', name: 'Marruecos', cc: '212', lengths: [9], trunk: '0', mobilePrefixes: ['6', '7'], landlinePrefixes: ['5'], note: 'Móvil: 6/7XXXXXXXX. Casablanca 522.' },
  { iso: 'DZ', name: 'Argelia', cc: '213', lengths: [9], trunk: '0', mobilePrefixes: ['5', '6', '7'], landlinePrefixes: ['2', '3', '4'], note: 'Móvil: 5/6/7XXXXXXXX. Argel 21/23.' },
  { iso: 'TN', name: 'Túnez', cc: '216', lengths: [8], mobilePrefixes: ['2', '4', '5', '9'], landlinePrefixes: ['1', '3', '7', '8'], note: '8 dígitos para todo. Móvil: 2/4/5/9.' },
  { iso: 'SA', name: 'Arabia Saudita', cc: '966', lengths: [9], trunk: '0', mobilePrefixes: ['5'], landlinePrefixes: ['1', '2', '3', '4', '6', '7'], note: 'Móvil: 5XXXXXXXX. Riad 11, Yeda 12.' },
  { iso: 'AE', name: 'Emiratos Árabes Unidos', cc: '971', lengths: [9], trunk: '0', mobilePrefixes: ['5'], landlinePrefixes: ['2', '3', '4', '6', '7', '9'], note: 'Móvil: 5X XXX XXXX. Dubái 4, Abu Dabi 2.' },
  { iso: 'IL', name: 'Israel', cc: '972', lengths: [8, 9], trunk: '0', mobilePrefixes: ['5'], landlinePrefixes: ['2', '3', '4', '8', '9'], note: 'Móvil: 5X XXX XXXX. Jerusalén 2, Tel Aviv 3.' },
  { iso: 'TR', name: 'Turquía', cc: '90', lengths: [10], trunk: '0', mobilePrefixes: ['5'], landlinePrefixes: ['2', '3', '4'], geo: { '212': 'Estambul ( europea)', '216': 'Estambul (asiática)', '312': 'Ankara', '232': 'Esmirna' }, note: 'Móvil: 5XXXXXXXXX (05xx). Estambul 212/216.' },
  { iso: 'GR', name: 'Grecia', cc: '30', lengths: [10], mobilePrefixes: ['69'], landlinePrefixes: ['2'], note: 'Móvil: 69XXXXXXXX. Atenas 21.' },
  { iso: 'NL', name: 'Países Bajos', cc: '31', lengths: [9], trunk: '0', mobilePrefixes: ['6'], landlinePrefixes: ['1', '2', '3', '4', '5'], note: 'Móvil: 6XXXXXXXX. Ámsterdam 20, Róterdam 10.' },
  { iso: 'BE', name: 'Bélgica', cc: '32', lengths: [8, 9], trunk: '0', mobilePrefixes: ['4'], landlinePrefixes: ['2', '3', '9'], note: 'Móvil: 4XX XX XX XX. Bruselas 2, Amberes 3.' },
  { iso: 'CH', name: 'Suiza', cc: '41', lengths: [9], trunk: '0', mobilePrefixes: ['7'], landlinePrefixes: ['2', '3', '4'], note: 'Móvil: 7X XXX XX XX. Zúrich 44/43, Ginebra 22.' },
  { iso: 'AT', name: 'Austria', cc: '43', lengths: [7, 8, 9, 10, 11], trunk: '0', mobilePrefixes: ['66', '67', '68', '69'], landlinePrefixes: ['1', '2', '3', '4', '5'], note: 'Móvil: 66x/67x/68x/69x. Viena 1.' },
  { iso: 'SE', name: 'Suecia', cc: '46', lengths: [7, 8, 9, 10], trunk: '0', mobilePrefixes: ['7'], landlinePrefixes: ['8', '2', '3', '4', '5', '6'], note: 'Móvil: 7XX. Estocolmo 8.' },
  { iso: 'NO', name: 'Noruega', cc: '47', lengths: [8], mobilePrefixes: ['4', '9'], landlinePrefixes: ['2', '3', '5', '6', '7'], note: '8 dígitos para todo. Móvil: 4x/9x. Oslo 2.' },
  { iso: 'DK', name: 'Dinamarca', cc: '45', lengths: [8], mobilePrefixes: ['2', '3', '4', '5', '6', '7'], landlinePrefixes: ['3', '6', '7', '8', '9'], note: '8 dígitos para todo, sin prefijo de área.' },
  { iso: 'FI', name: 'Finlandia', cc: '358', lengths: [6, 7, 8, 9, 10, 11], trunk: '0', mobilePrefixes: ['4', '5'], landlinePrefixes: ['9', '2', '3', '6', '8'], note: 'Móvil: 4x/5x. Helsinki 9.' },
  { iso: 'PL', name: 'Polonia', cc: '48', lengths: [9], mobilePrefixes: ['5', '6', '7', '8'], landlinePrefixes: ['1', '2', '3', '4'], note: 'Móvil: 5/6/7/8XXXXXXXX. Varsovia 22.' },
  { iso: 'CZ', name: 'Chequia', cc: '420', lengths: [9], mobilePrefixes: ['6', '7'], landlinePrefixes: ['2', '3', '4', '5'], note: 'Móvil: 6/7XXXXXXXX. Praga 2.' },
  { iso: 'HU', name: 'Hungría', cc: '36', lengths: [8, 9], trunk: '0', mobilePrefixes: ['20', '30', '31', '50', '70'], landlinePrefixes: ['1', '2', '3', '4', '5', '6'], note: 'Móvil: 20/30/70 + 7. Budapest 1.' },
  { iso: 'RO', name: 'Rumanía', cc: '40', lengths: [9], trunk: '0', mobilePrefixes: ['7'], landlinePrefixes: ['2', '3'], note: 'Móvil: 7XXXXXXXX. Bucarest 21/31.' },
  { iso: 'UA', name: 'Ucrania', cc: '380', lengths: [9], trunk: '0', mobilePrefixes: ['39', '50', '63', '66', '67', '68', '73', '91', '92', '93', '94', '95', '96', '97', '98', '99'], landlinePrefixes: ['3', '4', '5', '6'], note: 'Móvil: 39/50/63/66/67/68/7x/9x. Kiev 44.' },
  { iso: 'IE', name: 'Irlanda', cc: '353', lengths: [9], trunk: '0', mobilePrefixes: ['8'], landlinePrefixes: ['1', '2', '4', '5', '6', '7', '9'], note: 'Móvil: 8X XXX XXXX. Dublín 1.' },
  { iso: 'EC', name: 'Ecuador', cc: '593', lengths: [9], mobilePrefixes: ['9'], landlinePrefixes: ['2', '3', '4', '5'], note: 'Móvil: 9XXXXXXXX. Quito 2, Guayaquil 4.' },
  { iso: 'UY', name: 'Uruguay', cc: '598', lengths: [8], mobilePrefixes: ['9'], landlinePrefixes: ['2'], note: 'Móvil: 9X XX XX XX. Montevideo 2.' },
  { iso: 'PY', name: 'Paraguay', cc: '595', lengths: [9], mobilePrefixes: ['9'], landlinePrefixes: ['2', '3', '4', '5'], note: 'Móvil: 9XXXXXXXX. Asunción 21.' },
  { iso: 'BO', name: 'Bolivia', cc: '591', lengths: [8], mobilePrefixes: ['6', '7'], landlinePrefixes: ['2', '3', '4'], note: 'Móvil: 6/7XXXXXXX. La Paz 2.' },
  { iso: 'CR', name: 'Costa Rica', cc: '506', lengths: [8], mobilePrefixes: ['6', '7'], landlinePrefixes: ['2', '4'], note: 'Móvil: 6/7XXXXXXX. San José 2.' },
  { iso: 'PA', name: 'Panamá', cc: '507', lengths: [8], mobilePrefixes: ['6'], landlinePrefixes: ['2', '3', '4', '5', '7', '8'], note: 'Móvil: 6XXXXXXX. Ciudad de Panamá 2.' },
  { iso: 'GT', name: 'Guatemala', cc: '502', lengths: [8], mobilePrefixes: ['3', '5', '6', '7'], landlinePrefixes: ['2'], note: 'Móvil: 3/5/6/7XXXXXXX. Ciudad de Guatemala 2.' },
  { iso: 'CU', name: 'Cuba', cc: '53', lengths: [8], mobilePrefixes: ['5'], landlinePrefixes: ['7', '2', '3', '4'], note: 'Móvil: 5XXXXXXX. La Habana 7.' },
]

/* ─── rangos ficticios (documentales/cine) ────────────────────────────── */
export const FICTIONAL_RANGES: { country: string; note: string; match: (e164: string) => boolean }[] = [
  { country: 'US/NANP', note: '555-0100..0199 en cualquier área code: reservado para cine y documentación', match: (e) => /^\+1\d{3}55501\d\d$/.test(e) },
  { country: 'Reino Unido', note: 'Ofcom: móviles ficticios (07700 900xxx)', match: (e) => e.startsWith('+447700900') },
  { country: 'Reino Unido', note: 'Ofcom: fijos ficticios (01632 960xxx)', match: (e) => e.startsWith('+441632960') },
  { country: 'Australia', note: 'ACMA: rango ficticio (02 5550 xxxx)', match: (e) => e.startsWith('+6125550') },
]

/* ─── parser E.164 ─────────────────────────────────────────────────────── */

export interface ParsedPhone {
  input: string
  valid: boolean
  possible: boolean // longitud plausible aunque no válida
  e164: string | null
  national: string // número nacional sin prefijo país ni trunk
  country: CountryMeta | null
  type: string
  geo: string | null
  operatorHist: string | null
  flags: string[] // avisos: ficticio, secuencial, repetido, rol…
  formats: { e164: string; international: string; national: string; telUri: string; waUrl: string; rfc3966: string }
  error: string | null
}

function cleanInput(raw: string): string {
  return raw.replace(/[^\d+]/g, '')
}

function groupNational(n: string): string {
  // agrupa en bloques 3-3-3-… legibles (aproximación genérica)
  const parts: string[] = []
  let i = 0
  const size = n.length % 3 === 1 && n.length > 8 ? [2, 3, 3] : [3, 3, 3]
  let s = 0
  while (i < n.length) {
    const take = s < size.length ? size[s] : 3
    parts.push(n.slice(i, i + take))
    i += take
    s++
  }
  return parts.join(' ')
}

function detectCountry(cc: string): { meta: CountryMeta; note?: string } | null {
  // coincidencia por prefijo más largo; NANP y +7 compartidos se anotan
  const candidates = COUNTRIES.filter((c) => cc.startsWith(c.cc))
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.cc.length - a.cc.length)
  const meta = candidates[0]
  if (meta.cc === '1') return { meta, note: '+1 es el plan NANP: EE. UU., Canadá y el Caribe comparten prefijo' }
  if (meta.cc === '7') return { meta, note: '+7 es compartido: Rusia y Kazajistán' }
  return { meta }
}

export function parsePhone(raw: string, defaultIso = 'ES'): ParsedPhone {
  const input = raw.trim()
  const cleaned = cleanInput(input)
  const flags: string[] = []
  const base: ParsedPhone = {
    input, valid: false, possible: false, e164: null, national: '', country: null,
    type: '—', geo: null, operatorHist: null, flags,
    formats: { e164: '', international: '', national: '', telUri: '', waUrl: '', rfc3966: '' },
    error: null,
  }

  if (cleaned.replace(/\+/g, '').length < 4) return { ...base, error: 'demasiado corto para ser un número real' }
  if ((cleaned.match(/\+/g) ?? []).length > 1) return { ...base, error: 'contiene más de un "+" — revisa el formato' }

  let meta: CountryMeta | null = null
  let national = ''
  let sharedNote: string | undefined

  if (cleaned.startsWith('+')) {
    // busca el prefijo de país por coincidencia más larga
    let found: { meta: CountryMeta; note?: string } | null = null
    for (let len = 3; len >= 1; len--) {
      const cand = detectCountry(cleaned.slice(1, 1 + len))
      if (cand) { found = cand; break }
    }
    if (!found) return { ...base, error: 'prefijo de país no reconocido en la base (~45 países)' }
    meta = found.meta
    sharedNote = found.note
    national = cleaned.slice(1 + meta.cc.length)
  } else {
    const def = COUNTRIES.find((c) => c.iso === defaultIso)
    if (!def) return { ...base, error: 'país por defecto no soportado' }
    meta = def
    national = cleaned
    // quita 00 internacional y trunk nacional si el usuario los dejó
    if (national.startsWith('00')) national = national.slice(2)
    if (def.trunk && national.startsWith(def.trunk) && !def.mobilePrefixes.some((p) => national.startsWith(p))) {
      national = national.slice(def.trunk.length)
    }
  }

  if (!/^\d+$/.test(national)) return { ...base, error: 'el número nacional contiene caracteres no válidos' }

  const country = meta
  const cc = country.cc
  const possible = country.lengths.some((l) => Math.abs(national.length - l) <= 1)
  const validLength = country.lengths.includes(national.length)

  /* tipo */
  let type = 'desconocido'
  let typeOk = true
  const mobile = country.mobilePrefixes.some((p) => national.startsWith(p))
  const landline = country.landlinePrefixes.some((p) => national.startsWith(p))
  if (mobile) type = 'móvil'
  else if (landline) type = 'fijo'
  else if (['0', '1'].includes(national[0]) && country.iso !== 'US' && country.iso !== 'CA') { type = 'prefijo de trunk o servicio — no marca a un suscriptor'; typeOk = false }
  else if (country.iso === 'US' || country.iso === 'CA') {
    const npa = national.slice(0, 3)
    const nxx = national.slice(3, 6)
    if (national.length === 10 && /^[2-9]/.test(npa) && /^[2-9]/.test(nxx)) type = 'NANP válido (fijo o móvil, no distinguible)'
    else { type = 'NANP inválido (NPA/NXX empiezan por 0/1)'; typeOk = false }
  }
  if (country.iso === 'ES' && (national.startsWith('901') || national.startsWith('902'))) type = 'especial de negocio (901/902) — no es un particular'
  if (['000', '112', '911', '999'].some((e) => national === e)) type = 'emergencias'

  /* geografía y operador */
  let geo: string | null = null
  for (const [prefix, region] of Object.entries(country.geo ?? {})) {
    if (national.startsWith(prefix)) { geo = region; break }
  }
  let operatorHist: string | null = null
  if (type === 'móvil') {
    for (const [prefix, op] of Object.entries(country.operatorHist ?? {})) {
      if (national.startsWith(prefix)) { operatorHist = `${op} (histórico — la portabilidad puede haberlo cambiado)`; break }
    }
  }

  /* flags de falsedad */
  if (sharedNote) flags.push(sharedNote)
  if (!validLength && possible) flags.push(`longitud ${national.length}: plausible pero no coincide con el plan (${country.lengths.join('/')})`)
  if (!possible) flags.push(`longitud ${national.length}: fuera del plan nacional`)
  if (type === 'móvil' && country.iso === 'ES' && national.length === 9 && !['6', '7'].includes(national[0])) flags.push('ES: los móviles reales empiezan por 6 o 7')

  // repetidos y secuenciales (relleno de BBDD, números fake)
  if (national.length >= 6) {
    if (/^(\d)\1+$/.test(national)) flags.push('todos los dígitos iguales: casi seguro número de relleno')
    else if (/(.)\1{4,}/.test(national)) flags.push('5+ dígitos repetidos consecutivos: sospechoso de fake')
    else {
      const asc = '0123456789'
      const desc = '9876543210'
      for (let i = 0; i + 5 <= national.length; i++) {
        const chunk = national.slice(i, i + 5)
        if (asc.includes(chunk) || desc.includes(chunk)) { flags.push(`secuencia "${chunk}": típica de datos de prueba`); break }
      }
    }
  }

  const e164 = `+${cc}${national}`
  for (const f of FICTIONAL_RANGES) {
    if (f.match(e164)) flags.push(`rango FICTICIO (${f.country}): ${f.note}`)
  }

  const last8 = national.slice(-8)
  const intl = `+${cc} ${groupNational(national)}`
  return {
    input, valid: validLength && typeOk, possible, e164, national, country,
    type, geo, operatorHist, flags,
    formats: {
      e164,
      international: intl,
      national: country.trunk ? `${country.trunk}${groupNational(national)}` : groupNational(national),
      telUri: `tel:${e164}`,
      waUrl: `https://wa.me/${e164.replace('+', '')}`,
      rfc3966: `tel:${e164};phone-context=+${cc}`,
    },
    error: null,
  }
}

/* ─── heurísticas de lista ─────────────────────────────────────────────── */

export interface BulkSummary {
  total: number
  valid: number
  invalid: number
  mobile: number
  landline: number
  duplicated: number
  fakeSuspect: number
  byCountry: { iso: string; name: string; count: number }[]
}

export function bulkSummary(results: ParsedPhone[]): BulkSummary {
  const valid = results.filter((r) => r.valid)
  const seen = new Map<string, number>()
  for (const r of results) if (r.e164) seen.set(r.e164, (seen.get(r.e164) ?? 0) + 1)
  const byCountry = new Map<string, { name: string; count: number }>()
  for (const r of valid) {
    if (!r.country) continue
    const cur = byCountry.get(r.country.iso) ?? { name: r.country.name, count: 0 }
    cur.count++
    byCountry.set(r.country.iso, cur)
  }
  return {
    total: results.length,
    valid: valid.length,
    invalid: results.length - valid.length,
    mobile: valid.filter((r) => r.type === 'móvil').length,
    landline: valid.filter((r) => r.type === 'fijo').length,
    duplicated: [...seen.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0),
    fakeSuspect: results.filter((r) => r.flags.some((f) => /relleno|fake|prueba|FICTICIO/i.test(f))).length,
    byCountry: [...byCountry.entries()].map(([iso, v]) => ({ iso, name: v.name, count: v.count })).sort((a, b) => b.count - a.count),
  }
}

/* ─── verificación en profundidad (enlaces) ───────────────────────────── */

export interface PhoneDork { label: string; url: (e164: string, national: string, iso: string) => string; what: string }

export const PHONE_DORKS: PhoneDork[] = [
  { label: 'Google (últimos 8)', url: (_e, national) => `https://www.google.com/search?q=%22${national.slice(-8)}%22`, what: 'publicaciones que citen los últimos dígitos del número' },
  { label: 'Truecaller', url: (e164, _n, iso) => `https://www.truecaller.com/search/${iso.toLowerCase()}/${e164.replace('+', '')}`, what: 'crowdsourcing de identificación de llamadas (requiere sesión)' },
  { label: 'Sync.me', url: (e164) => `https://sync.me/search/?number=${e164.replace('+', '')}`, what: 'otra base crowdsourced con cobertura internacional' },
  { label: 'WhatsApp (wa.me)', url: (e164) => `https://wa.me/${e164.replace('+', '')}`, what: 'si tiene WhatsApp activo, la foto y el "está en línea" orientan (no abras conversación)' },
  { label: 'Telegram', url: () => 'https://telegram.org/faq', what: 'Telegram revela si un número tiene cuenta SOLO si tienes su contacto guardado' },
  { label: 'NumLookup', url: (e164) => `https://www.numlookup.com/?number=${e164.replace('+', '')}`, what: 'operador por HLR gratuito (limitado) para verificar que el número está activo' },
]

/* ─── IMEI: Luhn + estructura ─────────────────────────────────────────── */

export interface ImeiResult {
  valid: boolean
  tac: string | null
  fac: string | null
  serial: string | null
  check: string | null
  error: string | null
}

export function parseImei(raw: string): ImeiResult {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 15) return { valid: false, tac: null, fac: null, serial: null, check: null, error: `un IMEI tiene 15 dígitos (has puesto ${digits.length})` }
  // Luhn: el último dígito es el de control
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let d = digits.charCodeAt(i) - 48
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  const check = (10 - (sum % 10)) % 10
  const valid = check === digits.charCodeAt(14) - 48
  return {
    valid,
    tac: digits.slice(0, 8), // Type Allocation Code: fabricante + modelo
    fac: digits.slice(8, 10), // heredado (Final Assembly Code), hoy parte del serial
    serial: digits.slice(8, 14),
    check: digits.slice(14),
    error: valid ? null : 'dígito de control Luhn incorrecto: IMEI inventado o mal tecleado',
  }
}

export const HLR_FACTS: string[] = [
  'Saber si un número EXISTE de verdad exige una consulta HLR (Home Location Register) a la red del operador: servicios de pago (Twilio Lookup, Vonage, numverify). Ninguna web gratuita te lo dice con certeza.',
  'Lo que SÍ puedes hacer gratis: validar el formato y el plan nacional (esta tool), ver si tiene WhatsApp/Telegram activo, y buscar el número en Truecaller/Sync.me.',
  'El "está registrado" real cambia: un número válido puede estar inactivo hace años. El HLR responde activo/inactivo al instante; el formato no.',
  'La portabilidad (MNP) rompe la relación prefijo→operador: el operador histórico es solo orientativo en países con MNP desplegado.',
  'En OSINT, un teléfono con WhatsApp activo + foto + "últ. vez" es una identidad viva: el número solo es el identificador.',
]

export const PHONE_ETHICS: string[] = [
  'Validar formatos es neutral; rastrear a una persona por su teléfono puede ser acoso (delito). Esta tool no localiza, no llama y no escribe a nadie.',
  'Las búsquedas crowdsourced (Truecaller) exponen TU número al usarlas: considera hacerlo desde un contexto controlado.',
  'El teléfono es dato personal al máximo nivel (RGPD art. 9 en combinación con otros datos): en auditorías, limita el alcance a lo autorizado.',
]
