/* ─── PassForge: motores de contraseñas ──────────────────────────────────
   1) PassphraseForge: contraseñas-frase estilo Diceware con WebCrypto.
   2) MaskGen: contraseñas por patrón/máscara estilo hashcat (?u?l?d?s).
   3) PolicyAudit: auditor de políticas de contraseñas (mapa de calor).
   Todo 100% client-side con crypto.getRandomValues. */

/* ═════════════════════ 1) PassphraseForge ═════════════════════ */

/* Lista EN integrada: palabras cortas y memorables. La entropía real la
   pone el número de palabras (log2 de la lista) + mayúscula + dígitos. */
const WORDS_EN: string[] = (
  'acid acorn agile album alarm alpha amber anchor angle ankle apple april arrow ash aspen atlas atom ' +
  'audio autumn awake axis bacon badge bagel bakery bamboo banjo barrel basil basin batch beacon beach ' +
  'beard beetle bell bench berry bike birch bird bison black blade blanket blaze bolt bonus boot border ' +
  'botanic bowl brave bread brick bridge bright bronze brush bubble bucket buffalo bugle bulb bundle bunker ' +
  'burrow butter cabin cable cactus camel canal candle canoe canvas canyon cargo carpet castle cattle cedar ' +
  'cement chalk charm cheese cherry chess chill chimney cider cinema circle citrus clam clarity clay clever ' +
  'cliff cloak clock cloud clover coach coast cobalt cobra cocoa coffee coil comet copper coral cosmic cotton ' +
  'cougar course cozy crab crane crate crayon creek crest cricket crown crystal cube curtain curve cyber ' +
  'cycle daisy dance dawn debate decade decoy deer delta denim depth desert diamond digital diner diploma ' +
  'dive dock dolphin domino donkey dragon drama drift drum dune dynamic eagle earth echo eclipse edge effort ' +
  'elbow elder electric elegant elite ember emerald empire energy engine enigma envy epoch equal era error ' +
  'essay estate ether evening exact expert fabric falcon fantasy fawn feather fence fern ferry fiber ' +
  'fiction field fig filter finch finger fire fish fjord flag flame flint float flora fluid flute foam focus ' +
  'foggy forest fortune fossil fountain fox frame fresh frost galaxy gamma garden garlic gate gazelle gear ' +
  'gecko gem genius gentle geyser giant ginger glacier glass glide globe glow goblin golden goose gorge ' +
  'granite grape gravity green grid grill grove guitar guru habit hammer harbor harvest hawk ' +
  'hazel heart hedge helium helmet herald herb hero hickory hidden highway hike hobby hollow honey hoodie ' +
  'hope horizon hornet horse hotel hour human humble hunter hurdle hybrid ice icon ideal igloo image impact ' +
  'impulse index indigo ingot inlet insight insect instant iodine iris iron island ivory jacket jaguar ' +
  'jigsaw jockey jolly journey judge juggle juice jumbo jungle junior juror kayak kelp kernel kettle key ' +
  'kind king kiosk kiwi knight knot koala lab ladder lagoon lamp lantern laser lasso latitude lattice laurel ' +
  'lava lawn layer leaf ledger legend lemon length lens level lever liberty lichen lighthouse lilac lily ' +
  'limber linen lion liquid llama lobby lobster locket lodge loft logic loop lotus lumber lunar ' +
  'lynx lyric macro magnet maize major mammal manor maple marble margin marina market marsh mask mastiff ' +
  'matrix mayor meadow medal melody memoir mentor mercy merge mesa meteor method midnight mild mint mirror ' +
  'mission mixer mobile modern module moment monarch monsoon moon moral morning mosaic moss motif motor ' +
  'mountain mouse movie muffin mulberry mural muscle museum music myth nacho napkin narrow nation native ' +
  'nature nautical navy nebula nectar needle neon nephew nest nettle neuron neutral night nimble ' +
  'ninja noble nomad noodle north notable notion nova novel nuclear nudge nugget number nurse nutmeg oak ' +
  'oasis oatmeal obelisk ocean octave offer olive olympic omega onion onyx opal opera orbit orchard ' +
  'orchid oregano organ origin otter ounce outer oval owl oxide ozone pact paddle pagoda palace palm panda ' +
  'panel pansy panther papaya paper parade parcel parent parka parsley partner pasta pastel pastry patch ' +
  'path patio patrol pattern peace peach peanut pear pearl pebble pelican pencil penguin pepper ' +
  'perfume permit petal phoenix photo phrase piano picnic pigment pilot pine pirate piston pitch pixel pizza ' +
  'plank planet plasma plateau platinum plaza plum pocket poem poet point polar polaris policy pollen pond ' +
  'pony poppy porch portal poster potato powder prairie praise prance primate prince prism prize profile ' +
  'promise proton prune public pudding pulley pulse pumpkin puppy purple puzzle pylon quail quantum quart ' +
  'quartz queen quest quick quiet quill quilt quirk quota rabbit raccoon radar radio raft rainbow raisin ' +
  'rally ramble ranch random ranger rapid rascal raven ravine razor react ready realm reason rebel recipe ' +
  'record red reed reef refine regal region relay remedy render rescue resin retro reveal rhino rhythm ribbon ' +
  'rider ridge rifle right rigid rinse ripple risk ritual river roast robin robot rocket rodeo rogue roman ' +
  'roster round rover royal rubber ruby rudder rugby ruler rumble runway rural rusty saddle safari ' +
  'sage sail salmon salsa salt sample sand sapphire sardine sassy sauce savanna scale scarf scenic ' +
  'school scoop scooter scope score scout scrap screen scribe scroll sculpture sea seal season second sector ' +
  'segment seldom select senate sense sequel serene sermon setup seven shade shadow shaft shale shape ' +
  'share shard shark shawl shear sheep shelf shell sheriff shield shine shiny shore short shovel shrimp shrine ' +
  'shuffle shutter sibling sierra siesta sigma signal silent silk silver simple siren sister sketch ' +
  'ski skill skirt skull slate sleek sleep slice slide slope small smart smile smoke snack snake sneak ' +
  'sodium soft solar solid sonar sonic sorbet sound soup south soybean space spade spark spear speech sphere ' +
  'spice spider spike spine spiral spirit splash sponge spool spore sport spot sprout spruce squash stable ' +
  'stack stadium staff stage stamp stand star state static statue steam steel stellar step stereo stick stone ' +
  'storm story stove strand strategy stream street stride strike string stripe strong studio style suave ' +
  'subtle subway sugar summit sunny sunset super surf survey swan sweet swift switch sword symbol syrup ' +
  'table tackle tactic tag tail talent tandem tangent tape target tavern teacher tempo tenor tennis tent ' +
  'texture thank theme theory thermal thicket thimble thistle thor thread three thumb thunder ticket ' +
  'tidal tiger timber timer tinsel tiny tissue titan toast today tofu token tomato topaz torch tornado tortoise ' +
  'total totem toucan tour tower town trace track tract trade trail train tram trap travel tray treasure ' +
  'treat tree trek trench tribe trick trio triple trophy tropic trout truck truffle trumpet trunk trust truth ' +
  'tulip tumble tuna tundra tunnel turbo turf turkey turnip turtle tusk tutor twenty twig twilight ' +
  'twist ultra umber umbrella uncle under unicorn uniform union unique unit update urban used user usher ' +
  'utility vacuum valley value valve vanilla vapor vault velvet vendor venture venue verdict verse vertex ' +
  'vessel vibrant video vigor viking villa vine vinyl violet violin virtue vision visit vital vivid vocal ' +
  'vogue voice volcano voltage volume vortex voyage waffle wagon walnut walrus wander wafer water wave wavy ' +
  'wax winged wealth weather weaver wedge weekly weight welcome western whale wharf wheat wheel whim whisk ' +
  'whistle white wicker widget width wild willow window winner winter wisdom wolf wonder wood wool world ' +
  'worthy woven wreath wrench yacht year yeast yield yoga yogurt young zebra zenith zephyr zero zigzag zinc ' +
  'zone zoo zoom'
).split(/\s+/)

export const WORDLIST_SIZE = WORDS_EN.length
export const WORDLIST_BITS = Math.log2(WORDS_EN.length)

const rint = (maxExclusive: number): number => {
  const u32 = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive
  let v = 0
  do {
    crypto.getRandomValues(u32)
    v = u32[0]
  } while (v >= limit)
  return v % maxExclusive
}

export interface PassphraseOptions {
  words: number // 3..12
  separator: string // ' ', '-', '.', '_', cifra, ''
  capitalize: boolean
  appendNumber: boolean // añade 2 dígitos aleatorios al final
  leet?: boolean // sustituciones leves (solo estética, no añade entropía real)
}

export interface Passphrase {
  text: string
  entropyBits: number
}

export function generatePassphrase(opts: Partial<PassphraseOptions> = {}): Passphrase {
  const o: PassphraseOptions = { words: 4, separator: ' ', capitalize: true, appendNumber: false, leet: false, ...opts }
  const entropyPerWord = Math.log2(WORDS_EN.length)
  let entropy = o.words * entropyPerWord
  const parts: string[] = []
  for (let i = 0; i < o.words; i++) {
    let w = WORDS_EN[rint(WORDS_EN.length)]
    if (o.capitalize) {
      w = w[0].toUpperCase() + w.slice(1)
      entropy += 1
    }
    parts.push(w)
  }
  if (o.appendNumber) {
    parts.push(String(rint(100)).padStart(2, '0'))
    entropy += Math.log2(100)
  }
  let text = parts.join(o.separator)
  if (o.leet) {
    const map: Record<string, string> = { a: '4', e: '3', o: '0', s: '5', i: '1' }
    text = text.replace(/[aeosi]/g, (m) => (rint(2) === 0 ? map[m] : m))
  }
  return { text, entropyBits: Math.round(entropy) }
}

/** Genera varias passphrases de golpe. */
export function generatePassphraseBatch(n: number, opts: PassphraseOptions): Passphrase[] {
  return Array.from({ length: Math.max(1, Math.min(20, n)) }, () => generatePassphrase(opts))
}

/* ─── tiempos de crackeo (compartidos por las 3 tools de contraseñas) ──── */

export const CRACKER_SPEEDS: { label: string; rate: number; note: string }[] = [
  { label: 'Online (1/s)', rate: 1, note: 'formulario web con rate limit' },
  { label: 'GPU modesta (10 mil/s)', rate: 1e4, note: 'una 3060 crackeando MD5' },
  { label: 'GPU alta (10 M/s)', rate: 1e7, note: 'rig hashcat con RTX 4090' },
  { label: 'Granja (100 G/s)', rate: 1e11, note: 'clúster estatal o cloud cracking' },
]

export function crackTime(bits: number, rate: number): string {
  const seconds = Math.pow(2, bits - 1) / rate // media: mitad del espacio de búsqueda
  if (seconds < 1) return 'instantáneo'
  const units: [number, string][] = [[60, 'segundos'], [60, 'minutos'], [24, 'horas'], [365, 'días'], [1000, 'años']]
  let v = seconds
  let label = 'segundos'
  for (const [factor, name] of units) {
    if (v < factor) break
    v /= factor
    label = name
  }
  if (label === 'años' && v > 1e12) return `${v.toExponential(1).replace('e+', '×10^')} años — más que la edad del universo`
  return `${v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('es-ES')} ${label}`
}

export const STRENGTH_TIERS: { min: number; label: string; color: string; advice: string }[] = [
  { min: 0, label: 'Trivial', color: '#ff5c78', advice: 'un portátil la saca en segundos' },
  { min: 40, label: 'Débil', color: '#ffb454', advice: 'resiste días, no meses' },
  { min: 60, label: 'Razonable', color: '#4fb0ff', advice: 'vale para cuentas secundarias' },
  { min: 80, label: 'Fuerte', color: '#3fb850', advice: 'buena para cuentas principales con 2FA' },
  { min: 100, label: 'Bóveda', color: '#2ee88a', advice: 'hasta una granja de GPUs se rinde' },
]

export function strengthTier(bits: number): { label: string; color: string; advice: string } {
  let t = STRENGTH_TIERS[0]
  for (const tier of STRENGTH_TIERS) if (bits >= tier.min) t = tier
  return t
}

/* ═════════════════════ 2) MaskGen ═════════════════════ */

export interface MaskAtom {
  token: string // ?u ?l ?d ?s ?h ?a ?b o literal
  desc: string
  kind: 'class' | 'literal'
  chars: string // charset para clases; cadena vacía en ?b (binario)
  size: number // nº de candidatos que genera el átomo
}

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~'

const MASK_CLASSES: Record<string, { desc: string; chars: string }> = {
  u: { desc: 'mayúsculas A-Z', chars: UPPER },
  l: { desc: 'minúsculas a-z', chars: LOWER },
  d: { desc: 'dígitos 0-9', chars: DIGITS },
  s: { desc: 'símbolos de teclado', chars: SYMBOLS },
  h: { desc: 'hex minúscula 0-9a-f', chars: '0123456789abcdef' },
  H: { desc: 'hex mayúscula 0-9A-F', chars: '0123456789ABCDEF' },
  a: { desc: 'todos los imprimibles (94)', chars: UPPER + LOWER + DIGITS + SYMBOLS },
}

export const MASK_HELP: { token: string; desc: string }[] = [
  { token: '?u', desc: 'mayúsculas A-Z' },
  { token: '?l', desc: 'minúsculas a-z' },
  { token: '?d', desc: 'dígitos 0-9' },
  { token: '?s', desc: 'símbolos de teclado' },
  { token: '?h / ?H', desc: 'hex minúscula / mayúscula' },
  { token: '?a', desc: 'todos los imprimibles (94 caracteres)' },
  { token: 'abc', desc: 'texto literal: se copia tal cual' },
]

/** Parsea una máscara estilo hashcat en átomos. Devuelve errores concretos. */
export function parseMask(mask: string): { atoms: MaskAtom[]; error: string | null } {
  const atoms: MaskAtom[] = []
  let i = 0
  while (i < mask.length) {
    if (mask[i] === '?' && i + 1 < mask.length) {
      const c = mask[i + 1]
      if (c === 'b') {
        atoms.push({ token: '?b', desc: 'cualquier byte 0x00-0xFF', kind: 'class', chars: '', size: 256 })
      } else if (MASK_CLASSES[c]) {
        const cl = MASK_CLASSES[c]
        atoms.push({ token: `?${c}`, desc: cl.desc, kind: 'class', chars: cl.chars, size: cl.chars.length })
      } else if (c === '?') {
        atoms.push({ token: '?', desc: 'literal "?"', kind: 'literal', chars: '?', size: 1 })
      } else {
        return { atoms: [], error: `token desconocido "?${c}" en la posición ${i}` }
      }
      i += 2
    } else {
      atoms.push({ token: mask[i], desc: 'literal', kind: 'literal', chars: mask[i], size: 1 })
      i += 1
    }
  }
  if (atoms.length === 0) return { atoms: [], error: 'máscara vacía' }
  if (atoms.length > 24) return { atoms: [], error: 'máscara demasiado larga (máx. 24 átomos)' }
  return { atoms, error: null }
}

export interface MaskStats {
  keyspace: number // nº total de candidatos
  exponent: number // log10 del keyspace
  atoms: MaskAtom[]
  badIdea: string[] // avisos heurísticos
  hashcatHint: string
}

export function maskStats(mask: string): MaskStats | { error: string } {
  const { atoms, error } = parseMask(mask)
  if (error) return { error }
  let keyspace = 1
  for (const a of atoms) keyspace *= a.size
  const badIdea: string[] = []
  const pattern = atoms.map((a) => a.token).join('')
  if (keyspace < 1e6) badIdea.push('keyspace < 10⁶: se agota en segundos incluso online')
  if (/(\?d\?d\?d\?d)$/.test(pattern)) badIdea.push('termina en 4 dígitos: el patrón "año/pin final" es el primero que prueban las reglas')
  if (/^\?u\?l+\d*/.test(pattern)) badIdea.push('empieza Mayús+minúsculas: patrón "Password"-like, cubierto por best64')
  if (!atoms.some((a) => a.kind === 'class' && a.size > 10)) badIdea.push('sin clases grandes: casi no aporta entropía')
  return {
    keyspace,
    exponent: Math.log10(keyspace),
    atoms,
    badIdea,
    hashcatHint: `hashcat -a 3 -m 0 hashes.txt '${mask}' --increment`,
  }
}

const CUSTOM_ALPHABETS: Record<string, string> = {
  u: UPPER, l: LOWER, d: DIGITS, s: SYMBOLS, h: '0123456789abcdef', H: '0123456789ABCDEF',
  a: UPPER + LOWER + DIGITS + SYMBOLS,
}

/** Genera N candidatos deterministas (aleatorios) que cumplen la máscara. */
export function maskSamples(mask: string, n: number): string[] {
  const { atoms, error } = parseMask(mask)
  if (error) return []
  const out: string[] = []
  for (let k = 0; k < n; k++) {
    let s = ''
    for (const a of atoms) {
      if (a.kind === 'literal') { s += a.chars; continue }
      if (a.token === '?b') { s += String(rint(256)).padStart(2, '0'); continue }
      s += a.chars[rint(a.chars.length)]
    }
    out.push(s)
  }
  return out
}

/** Expande una máscara con custom charset (?1..?4) a explicación legible. */
export function customCharsetsHelp(): string {
  return [
    '-1 ?u?l?d  → define el charset 1 como mayúsculas+minúsculas+dígitos',
    '?1?1?1?1?1 → 6 posiciones del charset 1',
    'Los charsets ?1..?4 se definen con -1 a -4 y se usan como clases',
  ].join('\n')
}

/* ═════════════════════ 3) PolicyAudit ═════════════════════ */

export interface PolicyInput {
  minLength: number
  requireUpper: boolean
  requireLower: boolean
  requireDigit: boolean
  requireSymbol: boolean
  minClasses: number // nº de clases distintas exigidas (0 = solo longitud)
  maxLength: number // 0 = sin máximo
  maxAgeDays: number // 0 = sin rotación
  history: number // contraseñas recordadas
  lockoutAttempts: number // 0 = sin bloqueo
  lockoutMinutes: number
  minLengthDetected?: boolean // detecta minimumlength con texto plano
  blacklist: boolean // comprueba contra filtraciones (HIBP k-anonymity)
  mfa: boolean // la organización despliega MFA
}

export interface PolicyFinding {
  id: string
  severity: 'critical' | 'warn' | 'ok' | 'info'
  title: string
  detail: string
  fix: string
}

export interface PolicyVerdict {
  score: number // 0-100
  grade: string
  findings: PolicyFinding[]
  nistAligned: boolean
  linuxPam: string
  windowsGpo: string
}

/** Audita una política contra NIST 800-63B y buenas prácticas actuales. */
export function auditPolicy(p: PolicyInput): PolicyVerdict {
  const f: PolicyFinding[] = []
  let score = 100

  /* longitud mínima — la medida con mayor retorno */
  if (p.minLength < 8) {
    f.push({ id: 'minlen', severity: 'critical', title: `Longitud mínima ${p.minLength}: insuficiente`, detail: 'Con menos de 8 caracteres el espacio de búsqueda es trivialmente crackeable incluso online.', fix: 'minlen = 12 (mínimo aceptable); 16 recomendado' })
    score -= 25
  } else if (p.minLength < 12) {
    f.push({ id: 'minlen', severity: 'warn', title: `Longitud mínima ${p.minLength}: justa`, detail: 'NIST 800-63B recomienda 8 como suelo absoluto y 15+ para cuentas privilegiadas. 12-16 es el punto dulce actual.', fix: 'sube minlen a 12-16' })
    score -= 10
  } else {
    f.push({ id: 'minlen', severity: 'ok', title: `Longitud mínima ${p.minLength}: correcta`, detail: 'La longitud es la variable que más entropía aporta por carácter añadido.', fix: '' })
  }

  /* complejidad obligatoria — el mito que NIST desmontó */
  if (p.requireUpper && p.requireLower && p.requireDigit && p.requireSymbol) {
    f.push({ id: 'classes', severity: 'warn', title: 'Complejidad obligatoria en las 4 clases', detail: 'NIST 800-63B la desaconseja: empuja a patrones predecibles (Mayús1ªletra+Año!). La longitud y el bloqueo de filtraciones protegen más.', fix: 'exige longitud + blacklist; clases opcionales' })
    score -= 12
  } else if (p.minClasses >= 3) {
    f.push({ id: 'classes', severity: 'info', title: `Exige ${p.minClasses} clases distintas`, detail: 'Equilibrio razonable si no fuerza símbolos obligatorios.', fix: '' })
  } else {
    f.push({ id: 'classes', severity: 'ok', title: 'Sin complejidad forzada', detail: 'Alineado con NIST: la longitud manda, las clases son orientativas.', fix: '' })
  }

  /* rotación */
  if (p.maxAgeDays > 0 && p.maxAgeDays <= 90) {
    f.push({ id: 'rotation', severity: 'warn', title: `Rotación cada ${p.maxAgeDays} días`, detail: 'La rotación periódica sin evidencia de compromiso produce Password1!, Password2!… NIST 800-63B la elimina salvo compromiso.', fix: 'maxage = 0 (sin rotación) + blacklist de filtradas' })
    score -= 15
  } else if (p.maxAgeDays > 90) {
    f.push({ id: 'rotation', severity: 'info', title: `Caducidad a ${p.maxAgeDays} días`, detail: 'Caducidad larga: aceptable si hay blacklist y MFA.', fix: '' })
  } else {
    f.push({ id: 'rotation', severity: 'ok', title: 'Sin rotación forzada', detail: 'Correcto: solo se rota ante evidencia de compromiso.', fix: '' })
  }

  /* longitud máxima */
  if (p.maxLength > 0 && p.maxLength < 64) {
    f.push({ id: 'maxlen', severity: 'warn', title: `Longitud máxima ${p.maxLength}`, detail: 'NIST exige permitir al menos 64 caracteres: bloquear passphrases largas empuja a contraseñas débiles.', fix: 'maxlength = 64 o más (o 0 = sin límite)' })
    score -= 10
  } else {
    f.push({ id: 'maxlen', severity: 'ok', title: p.maxLength === 0 ? 'Sin longitud máxima' : `Máximo ${p.maxLength} (≥64)`, detail: 'Permite passphrases largas sin recortes.', fix: '' })
  }

  /* bloqueo */
  if (p.lockoutAttempts === 0) {
    f.push({ id: 'lockout', severity: 'critical', title: 'Sin bloqueo por intentos', detail: 'Un ataque online de contraseña puede probar millones de combinaciones sin fricción.', fix: 'lockout tras 5-10 fallos con backoff progresivo' })
    score -= 20
  } else if (p.lockoutAttempts > 10) {
    f.push({ id: 'lockout', severity: 'warn', title: `Bloqueo a los ${p.lockoutAttempts} intentos`, detail: 'Umbral alto: permite spray sin bloquear. 5-10 es el equilibrio habitual.', fix: 'baja el umbral a 5-10 con desbloqueo automático' })
    score -= 8
  } else {
    f.push({ id: 'lockout', severity: 'ok', title: `Bloqueo a los ${p.lockoutAttempts} intentos (${p.lockoutMinutes} min)`, detail: 'Frena credential stuffing y spraying online.', fix: '' })
  }

  /* blacklist de filtraciones */
  if (!p.blacklist) {
    f.push({ id: 'blacklist', severity: 'critical', title: 'Sin comprobación contra filtraciones', detail: '"Password123!" cumple cualquier política de complejidad: solo una blacklist la caza. HIBP k-anonymity es gratis y privado.', fix: 'valida en el registro contra HIBP (k-anonymity, sin enviar la contraseña)' })
    score -= 18
  } else {
    f.push({ id: 'blacklist', severity: 'ok', title: 'Blacklist de filtraciones activa', detail: 'La medida anti-Password1! más efectiva que existe.', fix: '' })
  }

  /* MFA */
  if (!p.mfa) {
    f.push({ id: 'mfa', severity: 'warn', title: 'Sin MFA documentado', detail: 'La política no menciona segundo factor: cualquier contraseña acaba siendo la única barrera.', fix: 'MFA obligatorio en cuentas privilegiadas y remotas' })
    score -= 10
  } else {
    f.push({ id: 'mfa', severity: 'ok', title: 'MFA desplegado', detail: 'El segundo factor convierte credenciales filtradas en intentos fallidos.', fix: '' })
  }

  /* historial */
  if (p.history > 0 && p.history < 5) {
    f.push({ id: 'history', severity: 'info', title: `Historial de ${p.history} contraseñas`, detail: 'Con historial corto, los usuarios ciclan 2-3 contraseñas. Si mantienes historial, 5+.', fix: '' })
  }

  score = Math.max(0, Math.min(100, score))
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
  const nistAligned = !f.some((x) => x.severity === 'critical')

  const minlen = Math.max(12, p.minLength)
  const linuxPam = [
    '# /etc/security/pwquality.conf',
    `minlen = ${minlen}`,
    p.minClasses >= 3 ? `minclass = ${p.minClasses}` : '# sin minclass: longitud + blacklist (NIST)',
    p.requireSymbol ? 'dcredit = -1\nocredit = -1' : '# clases obligatorias omitidas (NIST 800-63B)',
    'dictcheck = 1',
    'usercheck = 1',
    'enforcing = 1',
  ].join('\n')

  const lockout = p.lockoutAttempts > 0 ? p.lockoutAttempts : 5
  const windowsGpo = [
    '# PowerShell (Fine-Grained Password Policy)',
    'New-ADFineGrainedPasswordPolicy -Name "Politica-HackNexus" `',
    `  -Precedence 10 -MinPasswordLength ${minlen} \``,
    `  -ComplexityEnabled $${p.minClasses >= 3 ? 'true' : 'false'} \``,
    `  -PasswordHistoryCount ${Math.max(p.history, 24)} \``,
    `  -MaxPasswordAge $${p.maxAgeDays > 0 ? `(${p.maxAgeDays}.00:00:00)` : '0.00:00:00'} \``,
    `  -LockoutThreshold ${lockout} \``,
    `  -LockoutDuration ${p.lockoutMinutes > 0 ? p.lockoutMinutes : 15}.00:00:00 \``,
    '  -LockoutObservationWindow 0.00:30:00',
    '# + registrar la contraseña contra HIBP k-anonymity en el flujo de cambio',
  ].join('\n')

  return { score, grade, findings: f, nistAligned, linuxPam, windowsGpo }
}

export const POLICY_ETHICS: string[] = [
  'Las políticas se auditan con autorización: la contraseñas de la gente son datos personales.',
  'El objetivo es subir la seguridad sin torturar a los usuarios: política dura + usable = cumplimiento real.',
  'Nunca guardes contraseñas en claro para "validar la política": valida longitud y blacklist, no contenido.',
]
