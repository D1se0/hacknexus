/* ─── PhoneIntel: identidad profunda detrás de un número ────────────────
   Complemento "hunter" del Phone Validator: sintetiza un dossier OSINT
   completo del número combinando el parseo E.164 con perfiles de país
   embebidos, un catálogo de fuentes de identidad, planes de sondeo por
   metodología y plantillas legales de derechos ARCO/RGPD.
   Filosofía: 100% client-side, fuentes públicas, metodología profesional. */

import type { ParsedPhone } from './phoneosint'

/* ═════════════════════ perfiles de país embebidos ═════════════════════ */

/** [capital, zona horaria típica, idiomas, moneda, TLD, emergencias] */
export type CountryProfile = [string, string, string, string, string, string]

export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  ES: ['Madrid', 'Europe/Madrid (CET/CEST)', 'español (cooficial: catalán, gallego, euskera)', 'EUR (€)', '.es', '112 general · 091 Policía Nacional · 092 Municipal · 061 emergencias sanitarias'],
  MX: ['Ciudad de México', 'America/Mexico_City (CST, sin horario de verano)', 'español + 68 lenguas indígenas', 'MXN ($)', '.mx', '911 único nacional'],
  AR: ['Buenos Aires', 'America/Argentina/Buenos_Aires (UTC-3)', 'español', 'ARS ($)', '.ar', '911 (CABA) · 101 policía · 107 SAME'],
  CO: ['Bogotá', 'America/Bogota (UTC-5)', 'español', 'COP ($)', '.co', '123 único nacional'],
  CL: ['Santiago', 'America/Santiago (UTC-3/UTC-4)', 'español', 'CLP ($)', '.cl', '133 policía · 131 ambulancia · 132 bomberos'],
  PE: ['Lima', 'America/Lima (UTC-5)', 'español + quechua, aimara', 'PEN (S/)', '.pe', '105 policía · 106 SAMU'],
  VE: ['Caracas', 'America/Caracas (UTC-4)', 'español', 'VES (Bs.)', '.ve', '911 · 171 emergencias'],
  US: ['Washington D. C.', 'America/New_York (ET) a America/Los_Angeles (PT): 6 zonas', 'inglés (sin oficial federal; español ampliamente hablado)', 'USD ($)', '.us', '911 único · 311 no emergencias'],
  CA: ['Ottawa', 'America/Toronto a America/Vancouver: 6 zonas', 'inglés y francés (oficiales)', 'CAD ($)', '.ca', '911 único'],
  GB: ['Londres', 'Europe/London (GMT/BST)', 'inglés (galés, escocés, gaélico regionales)', 'GBP (£)', '.uk', '999 general · 112 también opera · 101 no emergencias'],
  FR: ['París', 'Europe/Paris (CET/CEST)', 'francés', 'EUR (€)', '.fr', '112 único europeo · 17 policía · 18 bomberos · 15 SAMU'],
  DE: ['Berlín', 'Europe/Berlin (CET/CEST)', 'alemán', 'EUR (€)', '.de', '112 general · 110 policía'],
  IT: ['Roma', 'Europe/Rome (CET/CEST)', 'italiano', 'EUR (€)', '.it', '112 único · 113 policía · 115 bomberos · 118 médica'],
  PT: ['Lisboa', 'Europe/Lisbon (WET/WEST)', 'portugués', 'EUR (€)', '.pt', '112 único europeo'],
  BR: ['Brasilia', 'America/Sao_Paulo (UTC-3)', 'portugués', 'BRL (R$)', '.br', '190 policía · 192 SAMU · 193 bomberos'],
  RU: ['Moscú', 'Europe/Moscow (MSK) a UTC+12: 11 zonas', 'ruso + lenguas republicanas', 'RUB (₽)', '.ru', '112 único · 102 policía · 103 ambulancia'],
  CN: ['Pekín', 'Asia/Shanghai (CST, todo el país UTC+8)', 'mandarín (oficial) + cantonés, uigur, tibetano…', 'CNY (¥)', '.cn', '110 policía · 120 ambulancia · 119 fuego'],
  JP: ['Tokio', 'Asia/Tokyo (JST, UTC+9)', 'japonés', 'JPY (¥)', '.jp', '110 policía · 119 fuego y ambulancia'],
  IN: ['Nueva Delhi', 'Asia/Kolkata (IST, UTC+5:30, única)', 'hindi e inglés (oficiales) + 22 constitucionales', 'INR (₹)', '.in', '112 único (ERSS) · 100 policía · 108 ambulancia'],
  AU: ['Canberra', 'Australia/Sydney a Perth: 3 zonas (+ACST, AWST)', 'inglés', 'AUD ($)', '.au', '000 (Triple Zero) · 112 desde móvil'],
  NZ: ['Wellington', 'Pacific/Auckland (NZST/NZDT)', 'inglés y maorí (oficiales)', 'NZD ($)', '.nz', '111 único'],
  ZA: ['Pretoria (ejecutiva) · Ciudad del Cabo (legislativa) · Bloemfontein (judicial)', 'Africa/Johannesburg (SAST, UTC+2)', '12 oficiales (zulú, xhosa, afrikáans, inglés…)', 'ZAR (R)', '.za', '10111 policía · 10177 ambulancia/fuego'],
  NG: ['Abuya', 'Africa/Lagos (WAT, UTC+1)', 'inglés (oficial) + hausa, yoruba, igbo', 'NGN (₦)', '.ng', '112 · 199 emergencias'],
  KE: ['Nairobi', 'Africa/Nairobi (EAT, UTC+3)', 'suajili e inglés (oficiales)', 'KES (KSh)', '.ke', '999 · 112 · 1199 policía'],
  EG: ['El Cairo', 'Africa/Cairo (EET/EEST)', 'árabe', 'EGP (E£)', '.eg', '122 policía · 123 ambulancia'],
  MA: ['Rabat', 'Africa/Casablanca (UTC+1 con RAMADÁN variable)', 'árabe y bereber (oficiales), francés extendido', 'MAD (DH)', '.ma', '19 policía urbana · 177 gendarmería · 15 SAMU'],
  DZ: ['Argel', 'Africa/Algiers (CET, UTC+1)', 'árabe y bereber (oficiales), francés extendido', 'DZD (DA)', '.dz', '17 policía · 14 SAMU · 14 fuego'],
  TN: ['Túnez', 'Africa/Tunis (CET)', 'árabe (oficial), francés extendido', 'TND (DT)', '.tn', '197 policía · 190 ambulancia'],
  SA: ['Riad', 'Asia/Riyadh (AST, UTC+3)', 'árabe', 'SAR (﷼)', '.sa', '911 (Makkah/Riyadh) · 999 policía · 997 ambulancia'],
  AE: ['Abu Dabi', 'Asia/Dubai (GST, UTC+4)', 'árabe (oficial), inglés extendido', 'AED (د.إ)', '.ae', '999 policía · 998 ambulancia · 997 fuego'],
  IL: ['Jerusalén', 'Asia/Jerusalem (IST/IDT)', 'hebreo y árabe (oficiales)', 'ILS (₪)', '.il', '100 policía · 101 Magen David Adom · 102 fuego'],
  TR: ['Ankara', 'Europe/Istanbul (TRT, UTC+3)', 'turco', 'TRY (₺)', '.tr', '112 único (desde 2019)'],
  GR: ['Atenas', 'Europe/Athens (EET/EEST)', 'griego', 'EUR (€)', '.gr', '112 único europeo'],
  NL: ['Ámsterdam', 'Europe/Amsterdam (CET/CEST)', 'neerlandés (inglés muy extendido)', 'EUR (€)', '.nl', '112 único europeo'],
  BE: ['Bruselas', 'Europe/Brussels (CET/CEST)', 'neerlandés, francés y alemán', 'EUR (€)', '.be', '112 único europeo · 101 policía'],
  CH: ['Berna', 'Europe/Zurich (CET/CEST)', 'alemán, francés, italiano y romanche', 'CHF (Fr.)', '.ch', '112 europeo · 117 policía · 144 ambulancia'],
  AT: ['Viena', 'Europe/Vienna (CET/CEST)', 'alemán', 'EUR (€)', '.at', '112 europeo · 133 policía · 144 rescate'],
  SE: ['Estocolmo', 'Europe/Stockholm (CET/CEST)', 'sueco', 'SEK (kr)', '.se', '112 único europeo'],
  NO: ['Oslo', 'Europe/Oslo (CET/CEST)', 'noruego', 'NOK (kr)', '.no', '112 único europeo'],
  DK: ['Copenhague', 'Europe/Copenhagen (CET/CEST)', 'danés', 'DKK (kr)', '.dk', '112 único europeo'],
  FI: ['Helsinki', 'Europe/Helsinki (EET/EEST)', 'finés y sueco', 'EUR (€)', '.fi', '112 único europeo'],
  PL: ['Varsovia', 'Europe/Warsaw (CET/CEST)', 'polaco', 'PLN (zł)', '.pl', '112 único europeo'],
  CZ: ['Praga', 'Europe/Prague (CET/CEST)', 'checo', 'CZK (Kč)', '.cz', '112 único europeo'],
  HU: ['Budapest', 'Europe/Budapest (CET/CEST)', 'húngaro', 'HUF (Ft)', '.hu', '112 único europeo'],
  RO: ['Bucarest', 'Europe/Bucharest (EET/EEST)', 'rumano', 'RON (lei)', '.ro', '112 único europeo'],
  UA: ['Kyiv', 'Europe/Kyiv (EET/EEST)', 'ucraniano', 'UAH (₴)', '.ua', '112 único · 102 policía · 103 ambulancia'],
  IE: ['Dublín', 'Europe/Dublin (GMT/IST)', 'irlandés e inglés', 'EUR (€)', '.ie', '112 · 999'],
  EC: ['Quito', 'America/Guayaquil (ECT, UTC-5)', 'español + quechua, shuar', 'USD ($)', '.ec', '911 integrado'],
  UY: ['Montevideo', 'America/Montevideo (UTC-3)', 'español', 'UYU ($U)', '.uy', '911 · 911 metro · 128 emergencias'],
  PY: ['Asunción', 'America/Asuncion (UTC-3/-4)', 'español y guaraní (oficiales)', 'PYG (₲)', '.py', '911 integrado'],
  BO: ['Sucre (constitucional) · La Paz (gobierno)', 'America/La_Paz (UTC-4)', 'español + 36 lenguas nativas', 'BOB (Bs.)', '.bo', '110 policía · 118 ambulancia'],
  CR: ['San José', 'America/Costa_Rica (CST, UTC-6)', 'español', 'CRC (₡)', '.cr', '911 único'],
  PA: ['Ciudad de Panamá', 'America/Panama (EST, UTC-5)', 'español', 'PAB (B/.) y USD', '.pa', '911 único'],
  GT: ['Ciudad de Guatemala', 'America/Guatemala (CST, UTC-6)', 'español + 24 lenguas mayas', 'GTQ (Q)', '.gt', '110 policía · 122/123 emergencias'],
  CU: ['La Habana', 'America/Havana (CST/CDT)', 'español', 'CUP ($) y MLC', '.cu', '106 médico · 104 policía'],
}

export function countryProfile(iso?: string): CountryProfile | null {
  if (!iso) return null
  return COUNTRY_PROFILES[iso] ?? null
}

/* ═════════════════════ marco legal por jurisdicción ═════════════════════ */

export interface LegalFramework {
  iso: string
  law: string
  dpa: string // autoridad de protección de datos
  rights: string // derechos ARCO/habeas data con artículos
  reach: string // alcance territorial de la ley
}

export const LEGAL_FRAMEWORKS: Record<string, LegalFramework> = {
  ES: { iso: 'ES', law: 'RGPD (UE) 2016/679 + LOPDGDD 3/2018', dpa: 'Agencia Española de Protección de Datos (AEPD) — www.aepd.es', rights: 'Acceso (art. 15), rectificación (16), supresión (17), oposición (21), portabilidad (20) y limitación (18)', reach: 'aplica a cualquier empresa que trate datos de residentes en la UE' },
  MX: { iso: 'MX', law: 'LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de los Particulares, reformada 2025) y ley homóloga para parastatales', dpa: 'INAI — www.inai.org.mx', rights: 'ARCO completo: Acceso, Rectificación, Cancelación y Oposición (arts. 22 y ss.)', reach: 'datos tratados en territorio mexicano por particulares y organismos' },
  AR: { iso: 'AR', law: 'Ley 25.326 de Protección de Datos Personales', dpa: 'Agencia de Acceso a la Información Pública (AAIP) — www.argentina.gob.ar/aaip', rights: 'habeas data (art. 43 CN): acceso, rectificación, actualización y confidencialidad', reach: 'bases de datos en territorio argentino' },
  CO: { iso: 'CO', law: 'Ley Estatutaria 1581 de 2012 + Decreto 1377 de 2013', dpa: 'Superintendencia de Industria y Comercio (SIC) — www.sic.gov.co', rights: 'ACR: Acceso, Actualización y Rectificación, más revocatoria y supresión (art. 8)', reach: 'tratamiento de datos en Colombia' },
  CL: { iso: 'CL', law: 'Ley 21.719 (nueva ley de protección de datos, vigente desde 2024, plena desde 2026)', dpa: 'Agencia de Protección de Datos Personales (en implementación)', rights: 'acceso, rectificación, eliminación, oposición y portabilidad', reach: 'tratamiento en Chile; sustituye a la antigua 19.628' },
  PE: { iso: 'PE', law: 'Ley 29733 de Protección de Datos Personales + reglamento D.S. 003-2013-JUS', dpa: 'Autoridad Nacional de Protección de Datos Personales — www.gob.pe/indecopi', rights: 'ARCO plus: información y el derecho de queja (art. 31 y ss.)', reach: 'tratamiento en territorio peruano' },
  BR: { iso: 'BR', law: 'LGPD — Lei Geral de Proteção de Dados 13.709/2018', dpa: 'ANPD — www.gov.br/anpd', rights: 'acesso, correção, anonimização, portabilidade, eliminação e informação (art. 18)', reach: 'qualquer operação com dados no Brasil ou de residentes' },
  US: { iso: 'US', law: 'sin ley federal general: mosaico de leyes estatales (CCPA/CPRA California, VCDPA Virginia, CPA Colorado…)', dpa: 'California Privacy Protection Agency (CCPA) / FTC para prácticas injustas', rights: 'según estado: conocer, borrar, opt-out de venta/compartir y no discriminación', reach: 'residentes del estado que emite la ley (CCPA: California)' },
  GB: { iso: 'GB', law: 'UK GDPR + Data Protection Act 2018', dpa: 'Information Commissioner Office (ICO) — ico.org.uk', rights: 'espejo del RGPD: acceso (SAR), rectificación, borrado, oposición', reach: 'Reino Unido con reconocimiento mutuo UE' },
  DE: { iso: 'DE', law: 'RGPD + BDSG (Bundesdatenschutzgesetz)', dpa: 'las 17 autoridades estatales + BfDI federal', rights: 'RGPD completo (art. 15-22)', reach: 'Alemania' },
  FR: { iso: 'FR', law: 'RGPD + Loi Informatique et Libertés', dpa: 'CNIL — www.cnil.fr', rights: 'RGPD completo (art. 15-22)', reach: 'Francia' },
}

export function legalFor(iso?: string): LegalFramework | null {
  if (!iso) return null
  return LEGAL_FRAMEWORKS[iso] ?? null
}

/* ═════════════════════ fuentes de identidad ═════════════════════ */

export type SourceCategory = 'caller-id' | 'agregadores' | 'mensajería' | 'filtraciones' | 'marketplace' | 'registros' | 'red'

export interface IdentitySource {
  name: string
  category: SourceCategory
  url: (e164: string, national: string, iso: string) => string
  what: string
  auth: 'sin cuenta' | 'cuenta gratis' | 'cuenta de pago'
  strength: 1 | 2 | 3 // fuerza de la señal de identidad
  note?: string
}

export const IDENTITY_SOURCES: IdentitySource[] = [
  /* caller-id crowdsourced */
  { name: 'Truecaller', category: 'caller-id', url: (e, _n, iso) => `https://www.truecaller.com/search/${iso.toLowerCase()}/${e.replace('+', '')}`, what: 'la mayor base crowdsourced de nombres asociados a números', auth: 'cuenta gratis', strength: 3, note: 'al registrarte expones TU número; usa un secundario' },
  { name: 'Sync.me', category: 'caller-id', url: (e) => `https://sync.me/search/?number=${encodeURIComponent(e)}`, what: ' crowdsourcing con datos de agendas filtradas y redes', auth: 'cuenta gratis', strength: 2 },
  { name: 'WhoCallsMe / Who-called', category: 'caller-id', url: (_e, n) => `https://www.google.com/search?q=%22${n.slice(-8)}%22+spam`, what: 'comunidad de reportes de spam/estafas: perfil de uso del número', auth: 'sin cuenta', strength: 1 },
  { name: 'Tellows', category: 'caller-id', url: (_e, n) => `https://www.tellows.com/search?num=${encodeURIComponent(n)}`, what: 'evaluaciones comunitarias por número con comentarios fechados', auth: 'sin cuenta', strength: 2 },
  /* mensajería: identidad viva */
  { name: 'WhatsApp (wa.me)', category: 'mensajería', url: (e) => `https://wa.me/${e.replace('+', '')}`, what: 'existencia de cuenta, foto, estado y "en línea" — NO abras conversación', auth: 'sin cuenta', strength: 3, note: 'la foto y el "últ. vez" son identidad viva; respeta la privacidad' },
  { name: 'Telegram', category: 'mensajería', url: () => 'https://telegram.org/faq', what: 'revela si el número tiene cuenta SOLO si lo tienes guardado en contactos', auth: 'cuenta gratis', strength: 2 },
  { name: 'Signal', category: 'mensajería', url: () => 'https://signal.org/', what: 'el registro de contacto muestra si el número tiene Signal (mínima exposición)', auth: 'cuenta gratis', strength: 1 },
  /* agregadores de datos */
  { name: 'FastPeopleSearch', category: 'agregadores', url: (e, n) => `https://www.fastpeoplesearch.com/${encodeURIComponent(n)}`, what: 'nombre, direcciones históricas y familiares (solo NANP +1)', auth: 'sin cuenta', strength: 3, note: 'solo EE. UU./Canadá: el más completo del mercado anglosajón' },
  { name: 'TruePeopleSearch', category: 'agregadores', url: (e, n) => `https://www.truepeoplesearch.com/results?phone=${encodeURIComponent(n)}`, what: 'agregador de registros públicos: nombres, edad, parientes', auth: 'sin cuenta', strength: 2, note: 'solo NANP' },
  { name: 'BeenVerified', category: 'agregadores', url: (e, n) => `https://www.beenverified.com/people/${encodeURIComponent(n)}/`, what: 'informe de identidad por teléfono (muro de pago, snapshot visible)', auth: 'cuenta de pago', strength: 3, note: 'solo EE. UU.' },
  { name: 'NumLookup', category: 'agregadores', url: (e) => `https://www.numlookup.com/?number=${encodeURIComponent(e)}`, what: 'operador real por HLR gratuito + carrier lookup', auth: 'sin cuenta', strength: 2 },
  { name: 'Spokeo', category: 'agregadores', url: (e, n) => `https://www.spokeo.com/phone-search?query=${encodeURIComponent(n)}`, what: 'perfiles sociales vinculados por teléfono (US)', auth: 'cuenta de pago', strength: 2 },
  /* filtraciones y paste */
  { name: 'Google exacto (últimos 8)', category: 'filtraciones', url: (_e, n) => `https://www.google.com/search?q=%22${n.slice(-8)}%22`, what: 'citaciones del bloque final: CVs, anuncios, foros, docs públicos', auth: 'sin cuenta', strength: 2 },
  { name: 'Google teléfono completo', category: 'filtraciones', url: (e) => `https://www.google.com/search?q=%22${encodeURIComponent(e)}%22`, what: 'el E.164 completo citado: dumps, listas, contactos publicados', auth: 'sin cuenta', strength: 3 },
  { name: 'Bing', category: 'filtraciones', url: (e) => `https://www.bing.com/search?q=%22${encodeURIComponent(e)}%22`, what: 'índice distinto: recupera lo que Google filtra', auth: 'sin cuenta', strength: 1 },
  { name: 'Pastebin hunt', category: 'filtraciones', url: (e) => `https://www.google.com/search?q=%22${encodeURIComponent(e)}%22+(site:pastebin.com+OR+site:justpaste.it+OR+ext:csv+OR+ext:txt)`, what: 'volcados con teléfono+nombre+email: la joya del OSINT', auth: 'sin cuenta', strength: 3 },
  { name: 'GitHub commits/configs', category: 'filtraciones', url: (e) => `https://github.com/search?q=%22${encodeURIComponent(e)}%22&type=code`, what: 'bases de test, configs y código que exponen el número', auth: 'cuenta gratis', strength: 2 },
  /* marketplace / sociales */
  { name: 'Wallapop / Vinted (busca teléfono)', category: 'marketplace', url: (e, n) => `https://www.google.com/search?q=%22${n.slice(-8)}%22+(site:wallapop.com+OR+site:vinted.com+OR+site:milanuncios.com)`, what: 'vendedores que publican su WhatsApp en anuncios: match directo', auth: 'sin cuenta', strength: 2, note: 'España/Europa; adapta el site: a tu mercado (mercadolibre, olx…)' },
  { name: 'Facebook/Instagram por teléfono', category: 'marketplace', url: (e) => `https://www.google.com/search?q=%22${encodeURIComponent(e)}%22+(site:facebook.com+OR+site:instagram.com)`, what: 'FB permite búsqueda por número (limitada); IG a veces indexa', auth: 'cuenta gratis', strength: 2 },
  { name: 'LinkedIn por teléfono', category: 'registros', url: (e, n) => `https://www.google.com/search?q=%22${encodeURIComponent(e)}%22+OR+%22${n.slice(-8)}%22+site:linkedin.com`, what: 'CVs y firmas de correo con el número: match nombre+empresa', auth: 'sin cuenta', strength: 3 },
  { name: 'Empresas: registros oficiales', category: 'registros', url: (_e, n, iso) => iso === 'ES' ? `https://www.google.com/search?q=%22${n.slice(-9)}%22+(site:boe.es+OR+site:infocif.com+OR+site:axeconocer.com)` : `https://www.google.com/search?q=%22${n.slice(-8)}%22+(registro+OR+company+OR+empresas)`, what: 'números de contacto de negocios en registros mercantiles públicos', auth: 'sin cuenta', strength: 2 },
  { name: 'Wayback Machine', category: 'red', url: (e) => `https://web.archive.org/web/*/${encodeURIComponent(e)}`, what: 'anuncios y directorios antiguos con el número: el pasado es para siempre', auth: 'sin cuenta', strength: 1 },
]

export const SOURCE_CATEGORIES: { id: SourceCategory; label: string; color: string }[] = [
  { id: 'caller-id', label: 'Caller ID', color: 'var(--info)' },
  { id: 'agregadores', label: 'Agregadores', color: 'var(--warn)' },
  { id: 'mensajería', label: 'Mensajería', color: 'var(--ok)' },
  { id: 'filtraciones', label: 'Filtraciones', color: 'var(--bad)' },
  { id: 'marketplace', label: 'Marketplace/Social', color: 'var(--acento)' },
  { id: 'registros', label: 'Registros', color: 'var(--acento-bright)' },
  { id: 'red', label: 'Archivo web', color: 'var(--grey)' },
]

/* ═════════════════════ plan de sondeo (metodología) ═════════════════════ */

export interface ProbeStep {
  n: number
  title: string
  detail: string
  url: string | null
  urlLabel?: string
  expectation: string
  time: string
}

/** Plan de identificación en 10 pasos, adaptado al país y tipo de número. */
export function buildProbePlan(p: ParsedPhone): ProbeStep[] {
  const e164 = p.e164 ?? ''
  const n = p.national
  const iso = p.country?.iso ?? 'ES'
  const isUS = iso === 'US' || iso === 'CA'
  const steps: ProbeStep[] = []

  steps.push({ n: 1, title: 'Valida el formato (ya hecho aquí)', detail: `E.164: ${e164 || '—'} · plan ${p.country?.name ?? '?'} · tipo: ${p.type}. Un número mal formateado mata toda la búsqueda inversa: normaliza siempre antes.`, url: null, expectation: 'número válido o descartado: no investigues basura', time: '✓ hecho' })

  steps.push({ n: 2, title: 'Comprueba si tiene WhatsApp', detail: 'Abre wa.me en incógnito (NO envíes mensaje). Si existe: foto, nombre visible y "en línea" te dan la primera identidad viva. Es la señal más fuerte y barata que existe.', url: `https://wa.me/${e164.replace('+', '')}`, urlLabel: 'abrir wa.me', expectation: 'cuenta activa → foto + nombre → siguiente paso con candidato', time: '30 segundos' })

  steps.push({ n: 3, title: 'Truecaller / Tellows (caller ID)', detail: 'El crowdsourcing tiene millones de números etiquetados. Busca el E.164. Si aparece un nombre, anótalo como CANDIDATO (no como hecho) y corrobóralo en el paso 5.', url: `https://www.truecaller.com/search/${iso.toLowerCase()}/${e164.replace('+', '')}`, urlLabel: 'abrir Truecaller', expectation: isUS ? 'en NANP la cobertura es buena; nota el % de spam si es un robocall' : 'en Europa/LatAm la cobertura varía: sin resultado no significa sin identidad', time: '2 minutos' })

  steps.push({ n: 4, title: 'Busca los últimos 8 dígitos en Google', detail: 'El bloque final es lo que la gente publica (anuncios, CVs, firmas). Entre comillas para match exacto. Añade "WhatsApp" o "llamar" para afinar.', url: `https://www.google.com/search?q=%22${n.slice(-8)}%22`, urlLabel: 'abrir Google', expectation: 'anuncios, CVs, foros o directorios con el número citado', time: '5 minutos' })

  steps.push({ n: 5, title: 'Corrobora con agregadores' + (isUS ? ' (potencia aquí)' : ''), detail: isUS ? 'En EE. UU./Canadá los agregadores (FastPeopleSearch, TruePeopleSearch) dan nombre, edad, direcciones y parientes solo con el teléfono: es el país con la superficie abierta más grande.' : 'En tu país, prueba los agregadores locales y los directorios blancos. En Europa la protección de datos limita los agregadores: el match suele venir de anuncios propios.', url: isUS ? `https://www.fastpeoplesearch.com/${encodeURIComponent(n)}` : `https://www.google.com/search?q=%22${e164}%22+(agregador+OR+directorio+OR+gu%C3%ADa)`, urlLabel: isUS ? 'abrir FastPeopleSearch' : 'buscar directorios', expectation: 'nombre + al menos un dato corroborable (ciudad, empresa, pariente)', time: '5-10 minutos' })

  steps.push({ n: 6, title: 'Hunt en filtraciones y paste', detail: 'Busca el E.164 completo en pastebins, CSVs y dumps. Un teléfono en una filtración suele venir con nombre, email y a veces dirección: cruza con el candidato del paso 3.', url: `https://www.google.com/search?q=%22${encodeURIComponent(e164)}%22+(site:pastebin.com+OR+site:justpaste.it+OR+ext:csv+OR+ext:txt)`, urlLabel: 'buscar volcados', expectation: 'volcado con el número + email/nombre → identidad confirmada', time: '5 minutos' })

  steps.push({ n: 7, title: 'Redes sociales por teléfono', detail: 'Facebook ha restringido la búsqueda por número, pero los perfiles indexados por Google con el teléfono en la bio siguen existiendo. Prueba también anuncios de marketplace (Wallapop, Milanuncios, MercadoLibre) donde el vendedor publica su WhatsApp.', url: `https://www.google.com/search?q=%22${encodeURIComponent(e164)}%22+(site:facebook.com+OR+site:instagram.com+OR+site:wallapop.com+OR+site:mercadolibre.com)`, urlLabel: 'buscar en social/marketplace', expectation: 'perfil cuyo teléfono coincide: identidad + foto + círculo', time: '10 minutos' })

  steps.push({ n: 8, title: 'Telegram/Signal si el caso lo justifica', detail: 'Solo si tienes cuenta y base legítima: Telegram revela existencia si tienes el número guardado ANTES de crear el contacto. Es manual y deja rastro en el otro extremo: úsalo con criterio.', url: null, expectation: 'existencia confirmada en apps que exigen teléfono real', time: 'opcional' })

  steps.push({ n: 9, title: 'Triangula y cierra el dossier', detail: 'Tres fuentes independientes con el mismo nombre = identidad con alta confianza. Documenta fuente, fecha y captura (con hash si va a informe). Una sola fuente = candidato, nunca conclusión.', url: null, expectation: 'dossier con confianza calificada y evidencias', time: '15 minutos' })

  steps.push({ n: 10, title: 'Si vas a actuar: ejercicio de derechos', detail: 'El camino formal para saber QUIÉN tiene tu número en una empresa: solicitud ARCO/RGPD (la tool genera la plantilla abajo). La empresa está obligada a responder en 30 días (RGPD) o el plazo de tu ley local.', url: null, expectation: 'respuesta legal del responsable o escalado a la autoridad', time: '1 carta + 30 días' })

  return steps
}

/* ═════════════════════ huellas del número (dossier sintético) ═════════════════════ */

export interface DossierSection {
  title: string
  icon: string
  rows: { k: string; v: string }[]
}

export interface PhoneDossier {
  headline: string
  confidenceNote: string
  sections: DossierSection[]
  probes: ProbeStep[]
  sources: IdentitySource[]
}

/** Sintetiza el dossier completo del número (determinista, offline). */
export function buildPhoneDossier(p: ParsedPhone): PhoneDossier {
  const iso = p.country?.iso ?? ''
  const prof = countryProfile(iso)
  const legal = legalFor(iso)
  const sections: DossierSection[] = []

  /* 1. identificación */
  const ident: { k: string; v: string }[] = [
    { k: 'E.164 normalizado', v: p.e164 ?? '—' },
    { k: 'País', v: p.country ? `${p.country.name} (+${p.country.cc})` : '—' },
    { k: 'Tipo declarado por el plan', v: p.type },
  ]
  if (p.geo) ident.push({ k: 'Región por prefijo', v: p.geo })
  if (p.operatorHist) ident.push({ k: 'Operador histórico', v: p.operatorHist })
  ident.push({ k: 'Longitud del plan', v: `${p.national.length} dígitos (${p.country?.lengths.join('/') ?? '?'} esperados)` })
  if (p.flags.length > 0) ident.push({ k: 'Avisos', v: p.flags.join(' · ') })
  sections.push({ title: 'Identificación del número', icon: '🔎', rows: ident })

  /* 2. contexto del país */
  if (prof) {
    const [cap, tz, lang, cur, tld, em] = prof
    sections.push({
      title: 'Contexto del país (para ubicar la investigación)',
      icon: '🌍',
      rows: [
        { k: 'Capital', v: cap },
        { k: 'Zona horaria', v: tz },
        { k: 'Idiomas', v: lang },
        { k: 'Moneda', v: cur },
        { k: 'Dominio', v: tld },
        { k: 'Emergencias', v: em },
        ...(legal ? [{ k: 'Protección de datos', v: `${legal.law} — ${legal.dpa}` }] : []),
      ],
    })
  }

  /* 3. huella técnica */
  const last8 = p.national.slice(-8)
  const mobilePool = p.type === 'móvil' ? 'miles de millones de combinaciones posibles en el plan' : 'segmentos asignados por bloques'
  sections.push({
    title: 'Huella técnica del número',
    icon: '🧬',
    rows: [
      { k: 'Bloque distintivo', v: `últimos 8 dígitos: ${last8} — la llave de la búsqueda inversa (1 entre ~100M)` },
      { k: 'Espacio de búsqueda', v: mobilePool },
      { k: 'Estabilidad', v: 'el número se PORTA (MNP) pero rara vez se recicla a otro titular en < 6 meses: la identidad histórica suele pegarse al número' },
      { k: 'Lo que el número NO revela solo', v: 'nombre, dirección ni email del titular: eso lo dan las fuentes (paso 3-7 del plan)' },
      { k: 'Lo que el número SÍ delata', v: 'país, región aproximada, operador histórico, tipo de línea y si está vivo (HLR/presencia en apps)' },
    ],
  })

  /* 4. dónde deja huella un número */
  sections.push({
    title: 'Dónde deja huella un número (superficie OSINT)',
    icon: '👣',
    rows: [
      { k: 'Apps de mensajería', v: 'WhatsApp (foto/estado/actividad), Telegram, Signal, Viber: existencia + identidad visual' },
      { k: 'Registros con SMS-OTP', v: 'bancos, delivery (Glovo, Rappi, Uber Eats), marketplaces, fintechs: si el número está en un dump de estas, hay KYC detrás' },
      { k: 'Anuncios propios', v: 'Wallapop, Milanuncios, MercadoLibre, Craigslist, Facebook Marketplace: los vendedores publican el teléfono' },
      { k: 'Caller ID crowdsourced', v: 'Truecaller, Sync.me, Tellows: etiquetas y nombres votados por millones de agendas' },
      { k: 'Documentos públicos', v: 'CVs, boletines oficiales, registros mercantiles, resoluciones judiciales, licencias' },
      { k: 'Filtraciones', v: 'dumps de breaches con teléfono+nombre+email: el cruce más rentable del OSINT telefónico' },
    ],
  })

  /* 5. marco legal */
  if (legal) {
    sections.push({
      title: 'Marco legal aplicable',
      icon: '⚖️',
      rows: [
        { k: 'Ley', v: legal.law },
        { k: 'Autoridad', v: legal.dpa },
        { k: 'Derechos', v: legal.rights },
        { k: 'Alcance', v: legal.reach },
      ],
    })
  }

  const headline = p.e164
    ? `${p.e164} — ${p.country?.name ?? '?'} · ${p.type}${p.geo ? ` · ${p.geo}` : ''}`
    : 'número no válido: corrige el formato para generar el dossier'

  const confidenceNote = 'Este dossier sintetiza lo que el número REVELA por sí mismo y organiza el plan para averiguar quién está detrás. La identidad solo se cierra con fuentes convergentes (3+ independientes): un nombre en Truecaller es un candidato, no una conclusión.'

  return {
    headline,
    confidenceNote,
    sections,
    probes: buildProbePlan(p),
    sources: IDENTITY_SOURCES,
  }
}

/* ═════════════════════ plantillas de ejercicio de derechos ═════════════════════ */

export interface SarTemplate {
  subject: string
  body: string
  to: string
  deadline: string
}

/** Genera la solicitud de acceso/rectificación/supresión adaptada al país. */
export function generateSAR(iso: string | undefined, e164: string, holderName = '[TU NOMBRE]'): SarTemplate {
  const legal = legalFor(iso)
  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  const isGDPR = iso && ['ES', 'DE', 'FR', 'IT', 'PT', 'NL', 'BE', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'RO', 'GR', 'IE', 'GB'].includes(iso)
  const deadline = isGDPR ? '30 días naturales (art. 12.3 RGPD), prorrogables 2 meses más con aviso' : iso === 'MX' ? '20 días hábiles' : iso === 'BR' ? '15 días (art. 19 LGPD)' : iso === 'AR' ? '10 días (art. 14, ley 25.326)' : 'el plazo que fije tu ley local (típicamente 10-30 días)'
  const to = legal ? `${legal.dpa} (si el responsable no responde, reclama aquí)` : 'la autoridad de protección de datos de tu país'

  const subject = `Solicitud de ejercicio de derechos sobre datos personales — teléfono ${e164}`
  const body = isGDPR
    ? `A quien corresponda — Responsable de Tratamiento / DPO

Yo, ${holderName}, con la identificación suficiente que aportaré a requerimiento, en mi condición de titular de los datos, ejercito los derechos que me otorgan los artículos 15 a 21 del RGPD respecto del número de teléfono ${e164}, que obra en vuestros sistemas.

SOLICITO:
1. ACCESO (art. 15 RGPD): confirmación de si trato ese número y, en su caso, copia de todos los datos asociados: nombre, dirección, email, documentos de identidad, historial de uso, orígenes de los datos (art. 15.1.g) y destinatarios a los que se hayan cedido (art. 15.1.c).
2. RECTIFICACIÓN (art. 16): corrección de todo dato inexacto vinculado al número.
3. SUPRESIÓN (art. 17): eliminación del número y sus datos asociados cuando no concurra una causa legal que la impida.
4. OPOSICIÓN (art. 21): cese de cualquier tratamiento basado en ese número, incluidas llamadas comerciales y perfilado.
5. LIMITACIÓN (art. 18): mientras se resuelve esta solicitud.
6. LOCALIZACIÓN (art. 30): identificación del registro de actividades de tratamiento donde figura el número.

Si los datos no fueron recabados directamente de mí, exijo la información del art. 14.2.b/c (fuente y origen).

Base legal: consentimiento no otorgado / interés legítimo no acreditado. En caso de no respuesta o respuesta insuficiente en el plazo legal, presentaré reclamación ante ${legal?.dpa ?? 'la autoridad de control'}.

Fecha: ${date}
${holderName} (firma)
Dirección de contacto para notificaciones: [TU EMAIL / DIRECCIÓN]`
    : `A quien corresponda — Responsable del tratamiento de datos

Yo, ${holderName}, titular del número de teléfono ${e164}, ejercito mis derechos de acceso, rectificación, cancelación/supresión y oposición${legal ? ` conforme a ${legal.law}` : ' conforme a la ley de protección de datos aplicable'}.

SOLICITO:
1. Acceso: confirmación de si tratáis ese número y copia íntegra de los datos asociados a él.
2. Rectificación: corrección de los datos inexactos.
3. Cancelación/supresión: baja del número y sus datos salvo obligación legal de conservación.
4. Oposición: cese de tratamientos y comunicaciones comerciales vinculadas al número.

Si no recibo respuesta en plazo (${deadline}), presentaré la reclamación correspondiente ante ${to}.

Fecha: ${date}
${holderName} (firma)
Contacto: [TU EMAIL / DIRECCIÓN]`

  return { subject, body, to, deadline }
}

/* ═════════════════════ notas finales ═════════════════════ */

export const HUNTER_ETHICS: string[] = [
  'Identificar a una persona desde su teléfono es legítimo para: proteger tu propio número, investigaciones de fraude con autorización, periodismo de interés público y CTFs. Para cualquier otra cosa, consulta a un abogado: el acoso y la localización sin consentimiento son delito.',
  'Tres fuentes independientes con el mismo nombre = alta confianza. Una sola fuente (Truecaller, un anuncio viejo) = candidato. La prisa convierte hipótesis en falsas acusaciones.',
  'Al usar Truecaller/Sync.me expones tu propio número y el de tu agenda: usa un número secundario y desactiva la sincronización de contactos.',
  'El GDPR y sus homólogos te dan EL camino formal: la solicitud de acceso obliga a la empresa a decirte qué datos tiene. Es más lento que el OSINT, pero legalmente incontestable.',
  'Nada de esto localiza en tiempo real ni intercepta comunicaciones: eso es otra herramienta (y otro marco legal).',
]

export const HUNTER_TIPS: string[] = [
  'El paso 2 (WhatsApp en incógnito) resuelve el 60% de los casos: foto + nombre + actividad en 30 segundos y sin dejar rastro en el número investigado.',
  'Los últimos 8 dígitos entre comillas es el dork que más rinde: filtra los prefijos que generan ruido.',
  'Si el número es de negocio (atienden con el nombre de la empresa), búscalo en registros mercantiles y en el pie de página de su web: el CIFO/registro lo confirma.',
  'Un número "sin identidad" en 2026 es raro: si no aparece en ninguna parte, probablemente es un número nuevo, de prepago anónimo o un spoofing (el que te llamó usaba otra identidad).',
  'El spam reportado en Tellows/Truecaller con patrón de horarios regulares delata call centers: cruza los comentarios fechados.',
]
