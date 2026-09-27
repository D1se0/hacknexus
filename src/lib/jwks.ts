/* JWKS Inspector — parsea un JWK Set y evalúa el diseño de cada clave.
   100% local: no valida firmas (eso es del JWT Toolkit), analiza la POSTURA. */

export interface JwkInfo {
  kid: string | null
  kty: string
  alg: string | null
  use: string | null
  ktyLabel: string
  algLabel: string
  useLabel: string
  extra: [string, string][]
  risks: string[]
}

const b64urlLenBits = (s: string): number | null => {
  if (!s) return null
  const clean = s.replace(/=+$/, '')
  return Math.floor((clean.length * 6) / 8) * 8
}

const RSA_BITS = (b64url: string): number | null => {
  const bits = b64urlLenBits(b64url)
  return bits ? Math.floor(bits / 8) * 8 : null
}

const mapKty = (kty: string): string =>
  ({ RSA: 'RSA (factorización)', EC: 'Curva elíptica', oct: 'Clave simétrica', OKP: 'Edwards (EdDSA)', unk: 'Desconocido' })[kty] ?? kty

const mapAlg = (alg: string | null): string => {
  if (!alg) return '(sin alg declarado — el cliente decide)'
  const M: Record<string, string> = {
    RS256: 'RS256 — firmas RSA PKCS1 v1.5 (estándar)',
    RS384: 'RS384 — RSA PKCS1 v1.5 SHA-384',
    RS512: 'RS512 — RSA PKCS1 v1.5 SHA-512',
    PS256: 'PS256 — RSA-PSS (más robusto que PKCS1)',
    PS384: 'PS384 — RSA-PSS SHA-384',
    PS512: 'PS512 — RSA-PSS SHA-512',
    ES256: 'ES256 — ECDSA P-256 (compacto y moderno)',
    ES384: 'ES384 — ECDSA P-384',
    ES512: 'ES512 — ECDSA P-521',
    EdDSA: 'EdDSA — Ed25519/Ed448 (el más moderno)',
    RSA1_5: 'RSA1_5 — cifrado PKCS1 v1.5 (ROTO por Bleichenbacher)',
    'RSA-OAEP': 'RSA-OAEP — cifrado OAEP (correcto)',
    'RSA-OAEP-256': 'RSA-OAEP-256 — cifrado OAEP SHA-256',
    A128KW: 'A128KW — AES key wrap 128',
    A256KW: 'A256KW — AES key wrap 256',
    dir: 'dir — cifrado directo con clave compartida',
    HS256: 'HS256 — HMAC (clave simétrica)',
  }
  return M[alg] ?? alg
}

const mapUse = (use: string | null): string =>
  use === 'sig' ? 'sig — firmar/verificar tokens' : use === 'enc' ? 'enc — cifrar claves/tokens' : use ? use : '(sin use — sirve para ambos)'

export const parseJwks = (text: string): JwkInfo[] => {
  const data = JSON.parse(text) as { keys?: unknown }
  if (!data || !Array.isArray(data.keys)) throw new Error('el JSON no tiene array "keys": ¿es un JWKS?')
  const out: JwkInfo[] = []
  for (const rawKey of data.keys.slice(0, 20)) {
    const k = rawKey as Record<string, unknown>
    const kty = String(k.kty ?? 'unk')
    const alg = typeof k.alg === 'string' ? k.alg : null
    const use = typeof k.use === 'string' ? k.use : null
    const kid = typeof k.kid === 'string' ? k.kid : null
    const extra: [string, string][] = []
    const risks: string[] = []

    if (kty === 'RSA') {
      const n = typeof k.n === 'string' ? k.n : ''
      const bits = RSA_BITS(n)
      if (bits) {
        extra.push(['módulo RSA', `~${bits} bits`])
        if (bits < 2048) risks.push(`Módulo de ${bits} bits: por debajo de 2048 es factorizable con esfuerzo medio (1024 está roto en la práctica).`)
      }
      if (alg?.startsWith('RSA1_5')) risks.push('RSA1_5 (PKCS1 v1.5 para cifrado): vulnerable a Bleichenbacher/ORACLE — migra a RSA-OAEP.')
      if (alg === 'RS256' || alg === null) risks.push('RS256 (PKCS1 v1.5): válido pero PS256/ES256 son más robustos ante fallos de implementación.')
      if (typeof k.e === 'string') extra.push(['exponente', k.e === 'AQAB' ? '65537 (estándar)' : k.e])
      if (typeof k.d === 'string' || typeof k.p === 'string') risks.push('⚠ CRÍTICO: el JWKS contiene componentes PRIVADOS (d/p/q) — esto NO es normal y significa fuga de clave privada.')
      if (!kid) risks.push('Sin kid: la rotación de claves y la selección de clave por header quedan rotas o por defecto.')
    } else if (kty === 'EC') {
      const crv = typeof k.crv === 'string' ? k.crv : '(?)'
      extra.push(['curva', crv])
      if (crv === 'P-192' || crv === 'secp192k1') risks.push('Curva P-192: obsoleta y frágil.')
      if (!kid) risks.push('Sin kid: rotación rota.')
    } else if (kty === 'oct') {
      risks.push('Clave SIMÉTRICA publicada en un JWKS: si es el secreto de firma HS256 compartido, cualquiera puede firmar tokens. Auditar YA.')
    } else if (kty === 'OKP') {
      extra.push(['curva', typeof k.crv === 'string' ? k.crv : '(?)'])
      risks.push('EdDSA/OKP: diseño excelente — verifica que los clientes soporten Ed25519 antes de felicitarte.')
    }

    if (!use) risks.push('Sin campo use: la clave sirve para firmar Y cifrar — amplía superficie si una queda comprometida.')
    if (!alg) risks.push('Sin alg: el cliente puede forzar el algoritmo en el header (alg confusion si no validan en el RS).')

    out.push({ kid, kty, alg, use, ktyLabel: mapKty(kty), algLabel: mapAlg(alg), useLabel: mapUse(use), extra, risks })
  }
  return out
}

/* ayudas de hunting */
export const JWKS_TIPS: { title: string; body: string }[] = [
  { title: 'Dónde encontrar JWKS', body: 'Descubre el issuer del token (iss del JWT) y prueba /.well-known/openid-configuration: el campo jwks_uri te da la URL exacta.' },
  { title: 'kid como inyección', body: 'Si el RS usa kid para elegir clave y no valida, inyecciones en kid (SQLi, path traversal) o kid="..\/..\/jwks.json" (SSRF local) son vectores reales: audita cómo resuelve el kid el servidor.' },
  { title: 'Sin rotación', body: 'Descarga el JWKS cada semana en un engagement largo: si los kids no cambian nunca, el incident response "revoca y rota" es papel mojado.' },
  { title: 'JWKS + JWT Toolkit', body: 'Este inspector analiza la POSTURA de las claves; el JWT Toolkit verifica firmas con ellas: úsalos juntos para el hallazgo completo.' },
]
