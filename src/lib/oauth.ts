/* OAuth2 / OIDC Lab — generador de flujos y catálogo de ataques.
   100% local: WebCrypto para PKCE/state/nonce. Las URLs se generan, no se
   navegan: las pruebas van contra TU cliente registrado en el target. */

export interface OAuthClientConfig {
  clientId: string
  redirectUri: string
  scope: string
  responseType: string
  flow: 'code-pkce' | 'implicit' | 'code'
  state: string
  nonce: string
  pkceMethod: 'S256' | 'plain'
  codeChallenge: string
  codeVerifier: string
  resource: string
  prompt: string
}

export const emptyClientConfig = (): OAuthClientConfig => ({
  clientId: '',
  redirectUri: 'http://localhost:8080/callback',
  scope: 'openid profile email',
  responseType: 'code',
  flow: 'code-pkce',
  state: '',
  nonce: '',
  pkceMethod: 'S256',
  codeChallenge: '',
  codeVerifier: '',
  resource: '',
  prompt: '',
})

const b64url = (bytes: Uint8Array): string => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const randomToken = (bytes = 32): string => {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return b64url(a)
}

export const sha256b64url = async (s: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return b64url(new Uint8Array(digest))
}

/* Genera un verifier+challenge S256 listos para usar */
export const generatePkce = async (): Promise<{ verifier: string; challenge: string }> => {
  const verifier = randomToken(32)
  const challenge = await sha256b64url(verifier)
  return { verifier, challenge }
}

/* URL de autorización del flow seleccionado */
export const buildAuthUrl = (c: OAuthClientConfig, authEndpoint: string): string => {
  const p = new URLSearchParams()
  p.set('client_id', c.clientId || 'TU_CLIENT_ID')
  p.set('redirect_uri', c.redirectUri)
  p.set('response_type', c.responseType)
  if (c.scope.trim()) p.set('scope', c.scope)
  p.set('state', c.state || 'estado-sin-firmar')
  if (c.flow !== 'code') p.set('nonce', c.nonce || 'nonce-sin-firmar')
  if (c.flow === 'code-pkce') {
    p.set('code_challenge', c.codeChallenge || 'CHALLENGE_NO_GENERADO')
    p.set('code_challenge_method', c.pkceMethod)
  }
  if (c.resource.trim()) p.set('resource', c.resource)
  if (c.prompt.trim()) p.set('prompt', c.prompt)
  const base = authEndpoint || 'https://auth.target.com/authorize'
  return `${base}?${p.toString()}`
}

/* ─── callback: parseo de la redirección ─── */

export interface CallbackParams {
  code?: string
  state?: string
  error?: string
  error_description?: string
  access_token?: string
  id_token?: string
  expires_in?: string
  token_type?: string
  extra: Record<string, string>
}

export const parseCallback = (url: string): CallbackParams => {
  const empty: CallbackParams = { extra: {} }
  const raw = url.trim()
  if (!raw) return empty
  try {
    const u = raw.includes('://') ? new URL(raw) : new URL(`https://callback.invalid/${raw.startsWith('?') || raw.startsWith('#') ? '' : '?'}${raw.startsWith('/') ? raw.slice(1) : raw}`)
    const src = u.hash && u.hash.length > 1 ? new URLSearchParams(u.hash.slice(1)) : u.searchParams
    const known = new Set(['code', 'state', 'error', 'error_description', 'access_token', 'id_token', 'expires_in', 'token_type'])
    const extra: Record<string, string> = {}
    src.forEach((v, k) => {
      if (!known.has(k)) extra[k] = v
    })
    const get = (k: string): string | undefined => src.get(k) ?? undefined
    return {
      code: get('code'),
      state: get('state'),
      error: get('error'),
      error_description: get('error_description'),
      access_token: get('access_token'),
      id_token: get('id_token'),
      expires_in: get('expires_in'),
      token_type: get('token_type'),
      extra,
    }
  } catch {
    return empty
  }
}

/* Payload de intercambio de code en el token endpoint (para copiar a curl) */
export const buildTokenExchange = (c: OAuthClientConfig, tokenEndpoint: string, code: string): string => {
  const lines = [
    `curl -X POST ${tokenEndpoint || 'https://auth.target.com/token'} \\`,
    `  -H "Content-Type: application/x-www-form-urlencoded" \\`,
    `  -d "grant_type=authorization_code" \\`,
    `  -d "code=${code || 'EL_CODE_DEL_CALLBACK'}" \\`,
    `  -d "redirect_uri=${c.redirectUri}" \\`,
    `  -d "client_id=${c.clientId || 'TU_CLIENT_ID'}" \\`,
  ]
  if (c.flow === 'code-pkce') lines.push(`  -d "code_verifier=${c.codeVerifier || 'EL_VERIFIER_QUE_GENERASTE'}" \\`)
  else lines.push(`  -d "client_secret=TU_CLIENT_SECRET" \\`)
  return lines.join('\n').replace(/ \\$/, '')
}

/* ─── ataques OAuth ─── */

export interface OAuthAttack {
  id: string
  name: string
  difficulty: 'trivial' | 'media' | 'alta'
  how: string
  payloadHint: string
  detect: string
}

export const OAUTH_ATTACKS: OAuthAttack[] = [
  {
    id: 'state-missing',
    name: 'Sin state (CSRF de login)',
    difficulty: 'trivial',
    how: 'Si la URL de autorización no lleva state (o el callback no lo valida), puedes enviarle a la víctima TU code: su sesión queda ligada a TU cuenta. Cada vez que entre, eres tú dentro de su navegador.',
    payloadHint: 'Quita state= de la URL de autorización, completa el login en TU callback y envíale la URL final del callback a la víctima.',
    detect: 'El callback del cliente acepta el flujo sin validar state: CSRF de login abierto.',
  },
  {
    id: 'redirect-uri-loose',
    name: 'redirect_uri laxa (subdominio abierto)',
    difficulty: 'media',
    how: 'Si el servidor valida la redirect_uri por prefijo en vez de exacta, auth.target.com.evil.com o un open redirect del dominio sirven para robar el code.',
    payloadHint: 'Prueba en cascada: redirect_uri exacta → otro path del mismo dominio → subdominio → dominio con sufijo (.evil.com) → open redirect conocido del dominio.',
    detect: 'El code aparece en tu servidor: el authorization server validó mal la redirect_uri.',
  },
  {
    id: 'code-interception',
    name: 'Intercepción de code (sin PKCE)',
    difficulty: 'media',
    how: 'Sin PKCE, cualquier app del dispositivo (o un referrer filtrado) puede leer el code del callback y canjearlo: es exactamente el ataque que PKCE elimina por diseño.',
    payloadHint: 'Registra TU app con la MISMA redirect_uri si el AS no liga client_id+redirect_uri: el code queda canjeable por cualquier cliente.',
    detect: 'Token emitido a un client distinto del que inició el flujo.',
  },
  {
    id: 'implicit-fragment',
    name: 'Implicit flow: token en el fragment',
    difficulty: 'trivial',
    how: 'El implicit flow devuelve access_token en el fragment (#): no llega al servidor, pero cualquier script de la página lo lee, y queda en historial y referrers. Si el target aún lo ofrece, es legacy roto.',
    payloadHint: 'response_type=token (o id_token token) y mira el fragment del callback: si la app acepta tokens del fragment, prueba a inyectarle un token TUYO.',
    detect: 'La app acepta un access_token inyectado como si fuera propio: token substitution.',
  },
  {
    id: 'mixup',
    name: 'Mix-up attack (multi-IdP)',
    difficulty: 'alta',
    how: 'Con 2 IdPs registrados sobre la misma redirect_uri, apuntas el flujo al IdP B y dejas el callback apuntando al A: el cliente confunde el origen del code y lo canjea con las credenciales del otro IdP.',
    payloadHint: 'URL de autorización del IdP B con la redirect_uri del cliente A: si el cliente no distingue de dónde viene el code, lo canjea en A.',
    detect: 'El cliente canjea el code de B con el client_secret de A y el AS lo acepta.',
  },
  {
    id: 'id_token-validation',
    name: 'id_token sin validar (aud/iss/firma)',
    difficulty: 'media',
    how: 'Si el cliente no valida aud, iss o la firma del id_token, un id_token emitido por OTRO cliente (mismo issuer) o auto-firmado se acepta: login como cualquiera.',
    payloadHint: 'Consigue un id_token legítimo de TU app contra el mismo issuer y reenvíalo al callback de la víctima: si entra, no valida aud.',
    detect: 'Login exitoso con un id_token de otro client_id o con la firma alterada.',
  },
  {
    id: 'scope-escalation',
    name: 'Escalada de scope',
    difficulty: 'media',
    how: 'Si el AS no restringe scopes por cliente, pides scope=admin api.write en la URL de autorización y el consentimiento los concede sin que nadie los haya aprobado para tu app.',
    payloadHint: 'Añade scopes inventados a la URL de autorización: si el AS los rechaza, bien; si los concede y llegan al token, crítico.',
    detect: 'El token resultante incluye scopes que nadie aprobó para tu cliente.',
  },
]
