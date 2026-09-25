/* Dorks de Google/Bing/GitHub/Shodan/Censys para OSINT y reconocimiento
   (usos autorizados: bug bounty in-scope, investigación propia, formación). */

export interface DorkGroup {
  name: string
  engine: 'Google' | 'Bing' | 'GitHub' | 'Shodan' | 'Censys'
  dorks: { q: string; desc: string }[]
}

export const DORK_GROUPS: DorkGroup[] = [
  {
    name: 'Google — exposición de ficheros',
    engine: 'Google',
    dorks: [
      { q: 'site:objetivo.com ext:pdf | ext:docx | ext:xlsx', desc: 'documentos indexados (metadatos, datos internos)' },
      { q: 'site:objetivo.com ext:sql | ext:bak | ext:old | ext:swp', desc: 'backups y ficheros de código expuestos' },
      { q: 'site:objetivo.com intitle:"index of" passwd|backup|conf', desc: 'listados de directorios abiertos' },
      { q: 'site:objetivo.com inurl:admin | inurl:login | inurl:dashboard', desc: 'paneles de administración indexados' },
      { q: 'site:objetivo.com "phpinfo()" | "debug" | "stack trace"', desc: 'páginas de debug que filtran rutas y versiones' },
      { q: 'site:objetivo.com inurl:.git | inurl:.env | inurl:web.config', desc: 'repositorios y configs colgadas del webroot' },
      { q: 'site:*.objetivo.com -www', desc: 'subdominios indexados (inventario rápido)' },
      { q: 'intext:"@objetivo.com" ext:csv | ext:txt', desc: 'emails del dominio en ficheros públicos' },
    ],
  },
  {
    name: 'Google — logins y tecnología',
    engine: 'Google',
    dorks: [
      { q: '"Powered by" site:objetivo.com', desc: 'tecnologías con marca visible' },
      { q: 'site:objetivo.com inurl:"?id=" | inurl:"?page="', desc: 'candidatas a inyección de parámetros' },
      { q: 'site:drive.google.com "objetivo.com"', desc: 'documentos de la empresa en drive públicos' },
      { q: 'site:github.com "objetivo.com" password|secret|api_key', desc: 'credenciales filtradas de la org en GitHub' },
      { q: 'site:trello.com | site:notion.so "objetivo.com"', desc: 'workspaces públicos que mencionan al objetivo' },
      { q: '"confidential" | "do not distribute" site:objetivo.com', desc: 'documentos internos mal etiquetados' },
    ],
  },
  {
    name: 'Bing — variante útil',
    engine: 'Bing',
    dorks: [
      { q: 'site:objetivo.com filetype:pdf', desc: 'PDFs (Bing indexa a veces distinto que Google)' },
      { q: 'ip:194.9.94.0/24', desc: 'hosting por rango (Bing IP operator)' },
      { q: 'site:objetivo.com "index of /backup"', desc: 'carpetas backup visibles' },
    ],
  },
  {
    name: 'GitHub — secretos',
    engine: 'GitHub',
    dorks: [
      { q: '"objetivo.com" password', desc: 'passwords pegadas en código público' },
      { q: '"objetivo.com" api_key | apikey | API_TOKEN', desc: 'keys de API hardcodeadas' },
      { q: 'org:objetivo filename:.env', desc: '.env commiteados por la organización' },
      { q: 'org:objetivo filename:id_rsa', desc: 'claves privadas en el repositorio' },
      { q: 'org:objetivo filename:docker-compose.yml "MYSQL_ROOT_PASSWORD"', desc: 'secrets de compose' },
      { q: '"AKIA" org:objetivo', desc: 'access keys de AWS (prefijo AKIA)' },
      { q: 'org:objetivo "BEGIN PRIVATE KEY"', desc: 'bloques de clave privada' },
      { q: 'org:objetivo filename:.npmrc _auth', desc: 'tokens de registry npm' },
    ],
  },
  {
    name: 'Shodan — superficie expuesta',
    engine: 'Shodan',
    dorks: [
      { q: 'org:"Objetivo SL"', desc: 'todo el rango AS de la organización' },
      { q: 'hostname:objetivo.com', desc: 'hosts con dominio del objetivo' },
      { q: 'hostname:objetivo.com port:3389', desc: 'RDP expuesto a internet' },
      { q: 'hostname:objetivo.com product:"Apache httpd"', desc: 'por tecnología' },
      { q: 'ssl.cert.subject.CN:"objetivo.com"', desc: 'hosts por certificado TLS' },
      { q: 'org:"Objetivo SL" port:"6379"', desc: 'Redis abierto (clásico sin auth)' },
      { q: 'http.favicon.hash:INTEGER', desc: 'por favicon (paneles específicos)' },
    ],
  },
  {
    name: 'Censys — inventario',
    engine: 'Censys',
    dorks: [
      { q: 'dns.names:objetivo.com', desc: 'hosts DNS que apuntan al dominio' },
      { q: 'services.tls.certificates.leaf_data.subject.common_name:objetivo.com', desc: 'por certificado' },
      { q: 'autonomous_system.description:"OBJETIVO"', desc: 'por ASN/organización' },
    ],
  },
]

export const DORK_ENGINES = ['Google', 'Bing', 'GitHub', 'Shodan', 'Censys'] as const
export type DorkEngine = (typeof DORK_ENGINES)[number]

/** URL de búsqueda real según el motor */
export function dorkUrl(engine: DorkEngine, q: string): string {
  const eq = encodeURIComponent(q)
  switch (engine) {
    case 'Google': return `https://www.google.com/search?q=${eq}`
    case 'Bing': return `https://www.bing.com/search?q=${eq}`
    case 'GitHub': return `https://github.com/search?q=${eq}&type=code`
    case 'Shodan': return `https://www.shodan.io/search?query=${eq}`
    case 'Censys': return `https://search.censys.io/search?resource=hosts&q=${eq}`
  }
}

/** cuenta dorks totales */
export const countDorks = (groups: DorkGroup[]): number => groups.reduce((s, g) => s + g.dorks.length, 0)
