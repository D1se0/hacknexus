/* Identificador de hashes por patrón (estilo hash-identifier) */

export interface HashType {
  name: string
  re: RegExp
  example: string
  hashcat: number
  john: string
  crackedBy: string
}

export const HASH_TYPES: HashType[] = [
  { name: 'MD5', re: /^[0-9a-f]{32}$/i, example: '5d41402abc4b2a76b9719d911017c592', hashcat: 0, john: 'raw-md5', crackedBy: 'wordlist + rules' },
  { name: 'MD5 (salted) / Unix', re: /^[0-9a-f]{32}[:$].+$/i, example: '5f4dcc3b5aa765d61d8327deb882cf99:salt', hashcat: 10, john: 'md5crypt', crackedBy: 'wordlist con sal' },
  { name: 'NTLM', re: /^[0-9a-f]{32}$/i, example: '31d6cfe0d16ae931b73c59d7e0c089c0', hashcat: 1000, john: 'nt', crackedBy: 'wordlist (rápido)' },
  { name: 'SHA-1', re: /^[0-9a-f]{40}$/i, example: 'a9993e364706816aba3e25717850c26c9cd0d89d', hashcat: 100, john: 'raw-sha1', crackedBy: 'wordlist + rules' },
  { name: 'SHA-224', re: /^[0-9a-f]{56}$/i, example: 'e258ec1d…', hashcat: 1300, john: 'raw-sha224', crackedBy: 'wordlist' },
  { name: 'SHA-256', re: /^[0-9a-f]{64}$/i, example: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', hashcat: 1400, john: 'raw-sha256', crackedBy: 'wordlist + rules' },
  { name: 'SHA-384', re: /^[0-9a-f]{96}$/i, example: '…', hashcat: 10800, john: 'raw-sha384', crackedBy: 'wordlist' },
  { name: 'SHA-512', re: /^[0-9a-f]{128}$/i, example: '…', hashcat: 1700, john: 'raw-sha512', crackedBy: 'wordlist' },
  { name: 'SHA-512/256', re: /^[0-9a-f]{64}$/i, example: '…', hashcat: 17400, john: 'raw-sha512/256', crackedBy: 'wordlist' },
  { name: 'SHA3-512', re: /^[0-9a-f]{128}$/i, example: '…', hashcat: 17600, john: 'raw-sha3', crackedBy: 'wordlist' },
  { name: 'RIPEMD-160', re: /^[0-9a-f]{40}$/i, example: '…', hashcat: 6000, john: 'ripemd160', crackedBy: 'wordlist' },
  { name: 'BLAKE2b-512', re: /^[0-9a-f]{128}$/i, example: '…', hashcat: 600, john: 'blake2b', crackedBy: 'wordlist' },
  { name: 'bcrypt ($2*)', re: /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/, example: '$2b$12$…', hashcat: 3200, john: 'bcrypt', crackedBy: 'lento: diccionario pequeño o fuerza bruta parcial' },
  { name: 'scrypt / PHPass', re: /^\$S?\$|^\$P\$/i, example: '$P$…', hashcat: 400, john: 'phpass', crackedBy: 'wordlist' },
  { name: 'sha512crypt ($6$)', re: /^\$6\$(rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{86}$/, example: '$6$salt$…', hashcat: 1800, john: 'sha512crypt', crackedBy: 'wordlist (lento)' },
  { name: 'sha256crypt ($5$)', re: /^\$5\$(rounds=\d+\$)?[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{43,}$/, example: '$5$salt$…', hashcat: 7400, john: 'sha256crypt', crackedBy: 'wordlist (lento)' },
  { name: 'md5crypt ($1$)', re: /^\$1\$[./A-Za-z0-9]{1,8}\$[./A-Za-z0-9]{22}$/, example: '$1$salt$…', hashcat: 500, john: 'md5crypt', crackedBy: 'wordlist' },
  { name: 'ARGON2', re: /^\$argon2(id|i|d)\$/, example: '$argon2id$v=19$…', hashcat: 0, john: 'argon2', crackedBy: 'muy lento: no viable por diccionario masivo' },
  { name: 'PBKDF2 / WPA-PSK PMKID', re: /^\$pbkdf2|^[0-9a-f]{32}\*?\*?/i, example: '$pbkdf2-sha256$…', hashcat: 10900, john: 'pbkdf2-hmac-sha256', crackedBy: 'wordlist (según iteraciones)' },
  { name: 'CRC32', re: /^[0-9a-f]{8}$/i, example: '00000000', hashcat: 11500, john: 'crc32', crackedBy: 'fuerza bruta (solo 32 bits)' },
  { name: 'MySQL 323 (antiguo)', re: /^[0-9a-f]{16}$/i, example: '7c6a180b36896a0f', hashcat: 200, john: 'mysql-sha1…', crackedBy: 'wordlist' },
  { name: 'MySQL 5 / SHA-1 binario', re: /^\*[0-9a-f]{40}$/i, example: '*B1A0…', hashcat: 300, john: 'mysql-sha1', crackedBy: 'wordlist' },
  { name: 'MSSQL 2000', re: /^0x0100[0-9a-f]{48}$/i, example: '0x0100A607BA7C…', hashcat: 131, john: 'mssql', crackedBy: 'wordlist' },
  { name: 'MSSQL 2012+', re: /^0x0200[0-9a-f]{136}$/i, example: '0x0200…', hashcat: 1731, john: 'mssql12', crackedBy: 'wordlist (lento)' },
  { name: 'Oracle 11g', re: /^S:[0-9A-F]{60}$/i, example: 'S:…', hashcat: 112, john: 'oracle11', crackedBy: 'wordlist' },
  { name: 'Domain Cached Credentials (DCC/MScache)', re: /^[0-9a-f]{32}:[0-9a-f]{32}$/i, example: 'hash:user', hashcat: 1100, john: 'mscach', crackedBy: 'wordlist' },
  { name: 'bcrypt (WordPress $P$ / Drupal $S$)', re: /^\$[PS]\$[./A-Za-z0-9]{31}$/, example: '$P$…', hashcat: 400, john: 'phpass', crackedBy: 'wordlist' },
  { name: 'Base64 JWT fragmentado', re: /^ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/, example: 'eyJhbGciOi…', hashcat: 16500, john: 'jwt', crackedBy: 'wordlist (firma HMAC)' },
  { name: 'Telegram / bot token (formato custom)', re: /^\d{5,16}:[A-Za-z0-9_-]{35}$/, example: '12345:AA…', hashcat: 0, john: '—', crackedBy: 'no es hash: es un token (revocar, no crackear)' },
]

export interface IdentifiedHash extends HashType {
  confidence: 'alta' | 'media' | 'baja'
}

export function identifyHash(input: string): IdentifiedHash[] {
  const s = input.trim()
  if (!s) return []
  const out: IdentifiedHash[] = []
  for (const t of HASH_TYPES) {
    if (t.re.test(s)) {
      let confidence: IdentifiedHash['confidence'] = 'media'
      if (t.name.startsWith('bcrypt') || t.name.startsWith('$') || t.name.includes('argon') || t.name.startsWith('sha512crypt') || t.name.startsWith('sha256crypt') || t.name.startsWith('md5crypt')) confidence = 'alta'
      if (['MD5', 'NTLM', 'SHA-1', 'SHA-256', 'CRC32'].includes(t.name)) confidence = 'media'
      if (t.name.includes('Telegram')) confidence = 'alta'
      out.push({ ...t, confidence })
    }
  }
  // heurística: longitud pura hexadecimal
  if (/^[0-9a-f]+$/i.test(s)) {
    const len = s.length
    const byLen: Record<number, string> = { 32: 'MD5 / NTLM', 40: 'SHA-1 / RIPEMD-160', 64: 'SHA-256', 128: 'SHA-512', 8: 'CRC32', 16: 'MySQL 323' }
    if (byLen[len] && !out.some((o) => o.name === byLen[len])) {
      out.unshift({ name: byLen[len], re: /^[0-9a-f]+$/i, example: s.slice(0, 12) + '…', hashcat: 0, john: '—', crackedBy: 'longitud hex estándar', confidence: 'media' })
    }
  }
  return out
}
