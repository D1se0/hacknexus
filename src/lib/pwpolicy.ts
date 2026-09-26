/* Constructor de políticas de contraseñas coherentes entre Linux y Windows.
   Basado en NIST SP 800-63B (longitud > complejidad, sin rotación forzada)
   y baselines CIS. Genera la config real para PAM y para GPO. */

export interface PwPolicy {
  minLength: number
  requireUpper: boolean
  requireLower: boolean
  requireDigit: boolean
  requireSpecial: boolean
  maxAgeDays: number // 0 = sin expiración (recomendación NIST)
  history: number // claves previas recordadas
  lockoutThreshold: number
  lockoutMinutes: number
  minAgeDays: number
  dictionaryCheck: boolean
  passphraseEncouraged: boolean
}

export const PW_PRESETS: { id: string; label: string; desc: string; policy: PwPolicy }[] = [
  {
    id: 'nist',
    label: 'NIST 800-63B (recomendado)',
    desc: 'longitud manda, sin rotación forzada, sin complejidad artificial',
    policy: { minLength: 12, requireUpper: false, requireLower: true, requireDigit: false, requireSpecial: false, maxAgeDays: 0, history: 0, lockoutThreshold: 10, lockoutMinutes: 15, minAgeDays: 0, dictionaryCheck: true, passphraseEncouraged: true },
  },
  {
    id: 'cis8',
    label: 'CIS Control 8 (equilibrado)',
    desc: '12+ caracteres con algo de variedad y bloqueo moderado',
    policy: { minLength: 12, requireUpper: true, requireLower: true, requireDigit: true, requireSpecial: false, maxAgeDays: 365, history: 5, lockoutThreshold: 5, lockoutMinutes: 30, minAgeDays: 1, dictionaryCheck: true, passphraseEncouraged: true },
  },
  {
    id: 'legacy',
    label: 'Legacy corporativo (audit-only)',
    desc: 'el clásico 8+rotación 90d que NIST ya desaconseja — para entornos regulados que aún lo exigen',
    policy: { minLength: 8, requireUpper: true, requireLower: true, requireDigit: true, requireSpecial: true, maxAgeDays: 90, history: 12, lockoutThreshold: 3, lockoutMinutes: 30, minAgeDays: 1, dictionaryCheck: false, passphraseEncouraged: false },
  },
  {
    id: 'paranoica',
    label: 'Administradores / cuentas privilegiadas',
    desc: 'larga + verificación contra filtraciones + bloqueo agresivo',
    policy: { minLength: 16, requireUpper: false, requireLower: true, requireDigit: false, requireSpecial: false, maxAgeDays: 180, history: 3, lockoutThreshold: 3, lockoutMinutes: 60, minAgeDays: 0, dictionaryCheck: true, passphraseEncouraged: true },
  },
]

export function buildPwPolicyConf(p: PwPolicy): string {
  const L: string[] = [
    '# Política de contraseñas generada por HackNexus',
    '',
  ]
  if (p.minLength < 8) L.push(`# ⚠ longitud ${p.minLength} por debajo de cualquier baseline moderno`)
  L.push(`Longitud mínima: ${p.minLength}`)
  const req: string[] = []
  if (p.requireUpper) req.push('mayúsculas')
  if (p.requireLower) req.push('minúsculas')
  if (p.requireDigit) req.push('dígitos')
  if (p.requireSpecial) req.push('símbolos')
  L.push(`Composición requerida: ${req.length ? req.join(' + ') : 'sin reglas de composición (NIST: mejor no forzar)'}${p.passphraseEncouraged ? ' · se recomienda passphrases' : ''}`)
  L.push(`Expiración: ${p.maxAgeDays === 0 ? 'sin expiración (NIST)' : `${p.maxAgeDays} días`}`)
  if (p.maxAgeDays > 0 && p.maxAgeDays < 180) L.push(`  ⚠ rotaciones < 180d conducen a Patata1 → Patata2 → Patata3`)
  L.push(`Historial: ${p.history} claves · edad mínima: ${p.minAgeDays}d`)
  L.push(`Bloqueo: ${p.lockoutThreshold} intentos → ${p.lockoutMinutes} min`)
  L.push(`Verificación contra diccionario/filtraciones: ${p.dictionaryCheck ? 'sí (pam_pwquality + haveibeenpwned en registro)' : 'no'}`)
  return L.join('\n')
}

/** /etc/security/pwquality.conf + login.defs + pam config. */
export function buildPamConfig(p: PwPolicy): string {
  return `# /etc/security/pwquality.conf
minlen = ${p.minLength}
${p.requireUpper ? 'ucredit = -1\n' : ''}${p.requireLower ? 'lcredit = -1\n' : ''}${p.requireDigit ? 'dcredit = -1\n' : ''}${p.requireSpecial ? 'ocredit = -1\n' : ''}${p.dictionaryCheck ? 'dictcheck = 1\n' : 'dictcheck = 0\n'}usercheck = 1
enforcing = 1

# /etc/login.defs (shadow-utils)
PASS_MAX_DAYS ${p.maxAgeDays || 99999}
PASS_MIN_DAYS ${p.minAgeDays}
PASS_WARN_AGE 14

# /etc/pam.d/common-password (Debian/Ubuntu) — línea pam_pwquality:
# password requisite pam_pwquality.so retry=3
# password required pam_pwhistory.so use_authtok remember=${p.history} enforce_for_root

# bloqueo (pam_faillock, Debian 12+/RHEL9) en /etc/pam.d/common-auth:
# auth required pam_faillock.so preauth deny=${p.lockoutThreshold} unlock_time=${p.lockoutMinutes * 60} fail_interval=900
# auth required pam_faillock.so authfail deny=${p.lockoutThreshold} unlock_time=${p.lockoutMinutes * 60} fail_interval=900
`
}

/** Política Windows en PowerShell (cuenta local / dominio). */
export function buildWinPolicy(p: PwPolicy): string {
  return `# Ejecutar como administrador. Local: securpol; dominio: GPO en gpmc.msc
net accounts /minpwlen:${p.minLength} /maxpwage:${p.maxAgeDays || -1} /minpwage:${p.minAgeDays} /uniquepw:${Math.max(p.history, 1)} /lockoutthreshold:${p.lockoutThreshold} /lockoutduration:${p.lockoutMinutes} /lockoutwindow:${p.lockoutMinutes}

# complejidad (solo admite on/off binario):
# 1 = requiere 3 de 4 categorías (upper/lower/digit/special)
Set-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Netlogon\\Parameters" -Name "PasswordComplexity" -Value ${(p.requireUpper || p.requireDigit || p.requireSpecial) ? 1 : 0} -ErrorAction SilentlyContinue

# verificación
net accounts
secedit /export /cfg C:\\secpol-dump.inf; Select-String -Path C:\\secpol-dump.inf -Pattern "Password"
`
}

export const PW_POLICY_NOTES: [string, string][] = [
  ['Por qué NIST mata la rotación', 'la gente cambia Pataton1 → Pataton2. Mejor: longitud + verificación contra filtraciones (comprobar en haveibeenpwned al crearla).'],
  ['Por qué la complejidad forzada falla', 'produce P@ssw0rd! y GAt0#2024. La entropía real viene de longitud (passphrase: caballo-batería-cúpula-32).'],
  ['Gestor de contraseñas', 'la política técnica no arregla el problema humano: impón vault (Bitwarden, KeePassXC) en onboarding.'],
  ['MFA > cualquier política', 'un solo factor débil + MFA correcto vale más que 32 caracteres sin MFA. Prioriza el despliegue de MFA.'],
  ['Windows bifurca', 'net accounts (local) vs GPO (dominio). En AD aplica por GPO en la Default Domain Policy o una GPO fina sobre la OU de admins.'],
]
