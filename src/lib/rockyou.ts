/* Wordlists para cracking: lista embebida (offline instantánea) y
   wordlists grandes de SecLists (danielmiessler) servidas por jsDelivr con CORS. */

export interface WordlistSource {
  id: string
  name: string
  desc: string
  size: string
}

export const WORDLIST_SOURCES: WordlistSource[] = [
  { id: 'core', name: 'Embebida offline', desc: '~300 contraseñas más comunes, carga instantánea sin red', size: '~4 KB' },
  { id: '10k', name: 'Top 10.000', desc: 'Las 10k contraseñas más usadas (SecLists)', size: '85 KB' },
  { id: '100k', name: 'Top 100.000', desc: 'Las 100k contraseñas más usadas (SecLists)', size: '1 MB' },
  { id: '1m', name: 'Top 1.000.000', desc: 'Las 1M más usadas — equivalente al corazón de rockyou.txt', size: '24 MB' },
]

const SEC_LISTS = 'https://cdn.jsdelivr.net/gh/danielmiessler/SecLists@master/Passwords/Common-Credentials'
const URLS: Record<string, string> = {
  '10k': `${SEC_LISTS}/10-million-password-list-top-10000.txt`,
  '100k': `${SEC_LISTS}/10-million-password-list-top-100000.txt`,
  '1m': `${SEC_LISTS}/10-million-password-list-top-1000000.txt`,
}

/* Lista embebida: contraseñas más habituales de rockyou.txt */
export const CORE_WORDLIST: string[] = [
  '123456', 'password', '123456789', '12345678', '12345', 'qwerty', '1234567890', '1234567', '111111', '123123',
  'abc123', '1234', 'password1', 'iloveyou', '000000', 'qwerty123', 'zaq12wsx', 'dragon', 'sunshine', 'princess',
  'letmein', '654321', 'monkey', '27653', '1qaz2wsx', '123321', 'qwertyuiop', 'superman', 'asdfghjkl', '1q2w3e4r',
  'baseball', 'football', 'master', 'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1', 'batman', 'pass123',
  'michael', 'shadow', 'jordan23', 'supersecure', 'hunter2', 'password123', 'admin', 'administrator', 'root',
  'toor', 'pass', 'test', 'guest', 'changeme', 'welcome', 'welcome1', 'P@ssw0rd', 'P@ssword1', 'Password1',
  'Admin123', 'admin123', 'root123', 'toor123', 'kali', 'kali123', 'raspberry', 'raspberry123', 'ubuntu', 'ubuntu123',
  'linux', 'linux123', 'debian', 'debian123', 'centos', 'redhat', 'fedora', 'pentest', 'pentest123', 'hacker',
  'hacker123', 'hackathon', 'ninja', 'ninja123', 'guitar', 'loveme', 'flower', 'hottie', 'loveme1', 'zaq1zaq1',
  'password1234', 'abcd1234', 'qwe123', 'a123456', '123qwe', '1q2w3e', '1q2w3e4r5t', 'q1w2e3r4', 'q1w2e3',
  'asd123', 'asdf', 'asdfgh', 'zxcvbnm', 'zxcvbn', 'qwerty12', '1234qwer', 'qazwsxedc', 'qpalzm', '121212',
  '112233', '121314', '102030', '123321!', '147258369', '147852369', '159753', '159357', '741852963', '963852741',
  'abc123456', '123abc', 'qweqwe', 'aa123456789', 'abcd1234!', '123456a', '123456b', '123456789a', '1234567891',
  '12341234', '123654', '123465', '10203040', '1123581321', '555555', '666666', '888888', '999999', '777777',
  'apple', 'banana', 'chocolate', 'cookie', 'coffee', 'loveyou', 'lovely', 'angel', 'babygirl', 'babyboy',
  'butterfly', 'daniel', 'jessica', 'ashley', 'amanda', 'jennifer', 'samantha', 'alexander', 'anthony', 'joshua',
  'matthew', 'david', 'andrew', 'joseph', 'thomas', 'charlie', 'hannah', 'chloe', 'jake', 'alex', 'summer',
  'tigger', 'purple', 'orange', 'silver', 'golden', 'diamond', 'yellow', 'purple1', 'silver1', 'diamond1',
  'soccer', 'hockey', 'tennis', 'golfer', 'golfball', 'skater', 'snowboard', 'surfer', 'swimmer', 'runner',
  'pokemon', 'pikachu', 'charizard', 'naruto', 'goku123', 'vegeta', 'spotify', 'minecraft', 'roblox', 'fortnite',
  'gamer123', 'steam123', 'matrix', 'neo123', 'morpheus', 'trinity1', 'terminal', 'rootbeer', 'metasploit',
  'backtrack', 'parrot123', 'ninjaturtle', 'starwars', 'yoda123', 'darthvader', 'spiderman', 'ironman', 'captain',
  'wolverine', 'deadpool', 'hulk123', 'thor123', 'loki123', 'blackwidow', 'wonderwoman', 'aquaman', 'cyborg',
  'flash123', 'greenarrow', 'batcave', 'gotham', 'metropolis', 'krypton', 'asgard', 'wakanda', 'midgard',
  'summertime', 'wintertime', 'springtime', 'autumn123', 'monday', 'tuesday', 'january', 'december', 'weekend',
  'unicorn', 'rainbow', 'mermaid', 'fairy123', 'wizard', 'warlock', 'sorcerer', 'phoenix', 'griffin', 'pegasus',
  'centaur', 'minotaur', 'hydra123', 'kraken', 'leviathan', 'behemoth', 'chimera', 'basilisk', 'wyvern',
  'secret', 'secret123', 'secret!', 'qwertz', 'azerty', 'asddsa', 'qazzaq', 'xsw21qaz', '2wsx1qaz', '3edc2wsx',
  '123123123', '111222333', 'aaa123', 'bbb123', 'ccc123', 'ddd123', 'xyz123', 'abc123!', 'test123', 'test1234',
  'guest123', 'user123', 'user1234', 'default', 'default123', 'temp', 'temp123', 'temp1234', 'oracle', 'oracle123',
  'mysql', 'mysql123', 'postgres', 'postgres123', 'mongo123', 'redis123', 'nginx123', 'apache123', 'docker123',
  'jenkins', 'jenkins123', 'gitlab123', 'github123', 'bitbucket', 'amazon123', 'google123', 'facebook1', 'twitter1',
  'insta123', 'tiktok123', 'snap123', 'linkedin1', 'reddit123', 'tumblr123', 'youtube1', 'netflix1', 'prime123',
  'summer1', 'winter1', 'spring1', 'autumn1', 'season1', 'sunshine1', 'rainbow1', 'moonlight', 'stardust',
  'firefly', 'butterfly1', 'dragonfly', 'ladybug', 'bumblebee', 'honeybee', 'greenday', 'pinkfloyd', 'ledzep',
  'metallica', 'nirvana1', 'pearljam', 'radiohead', 'coldplay1', 'beatles1', 'rollingstone', 'queen123',
  'abba1234', 'u2123456', 'linkinpark', 'slipknot1', 'korn123', 'rammstein', 'novasenha', 'senha123', 'contraseña',
  'contrasena', 'clave123', 'micontraseña', 'telefono', 'movil123', 'espuma', 'sevilla1', 'madrid1', 'barcelona1',
  'spain123', 'españa123', 'murcia123', 'cadiz123', 'bilbao123', 'malaga123', 'toledo123', 'granada1', 'valencia1',
  'qweasdzxc', 'zxcasdqwe', 'asdqwe123', 'qazxswedc', 'edcrfv', 'tgbyhn', 'ujmikl', 'okmnji', 'plmokn',
  'p0o9i8u7', '9o8i7u6y', '8i7u6y5t', 'i84uu7t6', 'yhtgrf', 'rfvtgb', 'ujnbhy', 'ikujnh', 'olpkij',
  'aabbcc', 'aabbccdd', 'ababab', 'abcabc', 'xyzxyz', 'qq123456', 'aa123456', 'zz123456', 'xx123456', 'cc123456',
  'pp123456', 'mm123456', 'aa111111', 'zz123456789', '11111111', '22222222', '12121212', '123412341234', '101010',
  '1234!', '1234?', '123456!', '123456?', 'qwertz123', 'admin!', 'admin?', 'root!', 'root?', 'pass!', 'pass?',
  'p4ssw0rd', 'p455w0rd', 'passw0rd', 'passwort', 'contrasena1', '1password', 'secure123', 'security1', 'internet',
  'samsung', 'samsung123', 'sony123', 'lenovo123', 'asus123', 'acer123', 'dell123', 'hp12345', 'toshiba1', 'nokia123',
  'chocolate1', 'strawberry', 'vanilla1', 'pepper123', 'garlic123', 'onion123', 'tomato123', 'potato123', 'carrot99',
  'casa123', 'mesa123', 'puerta1', 'ventana1', 'escalera1', 'coche123', 'moto123', 'avion123', 'barco123', 'tren123',
]

const cache = new Map<string, string[]>()

export async function loadWordlist(id: string, onProgress?: (loaded: number, total?: number) => void): Promise<string[]> {
  if (cache.has(id)) return cache.get(id)!
  if (id === 'core') {
    cache.set('core', CORE_WORDLIST)
    return CORE_WORDLIST
  }
  const url = URLS[id]
  if (!url) throw new Error(`Wordlist desconocida: ${id}`)
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`Error HTTP ${res.status} descargando wordlist`)
  const text = await res.text()
  onProgress?.(text.length, text.length)
  const words = text.split('\n').filter((w) => w.length > 0 && w.length <= 128)
  cache.set(id, words)
  return words
}

export function parseWordlistFile(text: string): string[] {
  return text.split(/\r?\n/).filter((w) => w.length > 0 && w.length <= 128)
}

/* Normas ligeras de mutación tipo hashcat (estilo rockyou rules) */
export function applyRules(word: string): string[] {
  const out = [word]
  const lower = word.toLowerCase()
  out.push(lower)
  out.push(word.toLowerCase())
  out.push(word.toUpperCase())
  out.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  out.push(word + '1')
  out.push(word + '123')
  out.push(word + '!')
  out.push(word + '123!')
  out.push(word + '2023')
  out.push(word + '2024')
  return out.filter((w) => w.length >= 1 && w.length <= 128)
}