/* Generador de alias de shell: catálogo curado de alias y funciones
   de calidad de vida y seguridad, con detección bash/zsh y
   generación del bloque listo para pegar en ~/.bashrc o ~/.zshrc. */

export type AliasShell = 'bash' | 'zsh'
export type AliasCat = 'qol' | 'seguridad' | 'red' | 'git' | 'sistema' | 'dev'

export interface AliasDef {
  alias: string
  expansion: string
  why: string
  cat: AliasCat
  type: 'alias' | 'function'
  zshOnly?: boolean
}

export const ALIAS_CATALOG: AliasDef[] = [
  // calidad de vida
  { alias: 'll', expansion: 'ls -alFh', why: 'listado largo con tipos y tamaños humanos: el 90% de tus ls deberían ser este', cat: 'qol', type: 'alias' },
  { alias: 'la', expansion: 'ls -A', why: 'incluye ocultos sin el ruido de . y ..', cat: 'qol', type: 'alias' },
  { alias: 'l', expansion: 'ls -CF', why: 'columnas con clasificación visual de directorios', cat: 'qol', type: 'alias' },
  { alias: '..', expansion: 'cd ..', why: 'subir un nivel sin pensar', cat: 'qol', type: 'alias' },
  { alias: '...', expansion: 'cd ../..', why: 'subir dos niveles', cat: 'qol', type: 'alias' },
  { alias: 'mkdir', expansion: 'mkdir -pv', why: 'crea rutas completas y MUESTRA lo que crea', cat: 'qol', type: 'alias' },
  { alias: 'df', expansion: 'df -h', why: 'espacio en formato humano siempre', cat: 'qol', type: 'alias' },
  { alias: 'free', expansion: 'free -h', why: 'memoria en humano', cat: 'qol', type: 'alias' },
  { alias: 'grep', expansion: 'grep --color=auto', why: 'coincidencias resaltadas: cero coste, pura ganancia', cat: 'qol', type: 'alias' },
  { alias: 'diff', expansion: 'diff --color=auto -u', why: 'diff unificado y coloreado (legible de verdad)', cat: 'qol', type: 'alias' },
  { alias: 'h', expansion: 'history', why: 'historial en 1 tecla', cat: 'qol', type: 'alias' },
  { alias: 'path', expansion: 'echo -e ${PATH//:/\\n}', why: 'el PATH una ruta por línea: ver dónde está el conflicto', cat: 'qol', type: 'alias' },

  // seguridad
  { alias: 'cp', expansion: 'cp -i', why: 'pide confirmación antes de sobrescribir: el seguro anti-borrado accidental', cat: 'seguridad', type: 'alias' },
  { alias: 'mv', expansion: 'mv -i', why: 'idem para movimientos', cat: 'seguridad', type: 'alias' },
  { alias: 'rm', expansion: 'rm -I', why: 'pide confirmación al borrar +3 ficheros o recursivo (NO es --no-preserve-root, tranquilo)', cat: 'seguridad', type: 'alias' },
  { alias: 'chmod', expansion: 'chmod --preserve-root', why: 'rehúsa tocar / por accidente', cat: 'seguridad', type: 'alias' },
  { alias: 'chown', expansion: 'chown --preserve-root', why: 'idem para el dueño', cat: 'seguridad', type: 'alias' },
  { alias: 'wget', expansion: 'wget -c', why: 'continúa descargas cortadas', cat: 'seguridad', type: 'alias' },
  { alias: 'wipeall', expansion: 'echo " Usa shred o srm en disco: rm deja datos recuperables" ', why: 'recordatorio anti-accidente: borrar NO es destruir datos', cat: 'seguridad', type: 'function' },
  { alias: 'ports', expansion: 'ss -tulpn 2>/dev/null || sudo ss -tulpn', why: 'mapa de puertos escuchando en una letra', cat: 'seguridad', type: 'alias' },
  { alias: 'suid', expansion: 'find / -perm -4000 -type f 2>/dev/null', why: 'inventario SUID instantáneo: base de todo privesc', cat: 'seguridad', type: 'alias' },
  { alias: 'myip', expansion: 'curl -s ifconfig.me && echo', why: 'tu IP pública sin abrir el navegador', cat: 'seguridad', type: 'alias' },

  // red
  { alias: 'ping', expansion: 'ping -c 5', why: 'ping acotado (el infinito es un antipatrón)', cat: 'red', type: 'alias' },
  { alias: 'fast', expansion: 'curl -o /dev/null -s -w "dns:%{time_namelookup} conn:%{time_connect} tls:%{time_appconnect} total:%{time_total}\\n"', why: 'descompone la latencia de cualquier URL que le pases', cat: 'red', type: 'alias' },
  { alias: 'dnsflush', expansion: 'sudo resolvectl flush-cache', why: 'vacía la caché DNS de systemd-resolved', cat: 'red', type: 'alias' },
  { alias: 'listen', expansion: 'sudo tcpdump -i any -nn -c 50', why: 'olfatea 50 paquetes de lo que entra: diagnóstico rápido de red', cat: 'red', type: 'alias' },
  { alias: 'ips', expansion: 'ip -br a', why: 'todas tus IPs en formato compacto', cat: 'red', type: 'alias' },

  // git
  { alias: 'g', expansion: 'git', why: 'la abreviatura universal', cat: 'git', type: 'alias' },
  { alias: 'gs', expansion: 'git status -sb', why: 'estado corto con rama', cat: 'git', type: 'alias' },
  { alias: 'gl', expansion: 'git log --oneline --graph --decorate --all', why: 'el árbol de ramas de un vistazo', cat: 'git', type: 'alias' },
  { alias: 'gd', expansion: 'git diff --stat', why: 'diff resumido', cat: 'git', type: 'alias' },
  { alias: 'gundo', expansion: 'git reset --soft HEAD~1', why: 'deshace el último commit SIN perder cambios', cat: 'git', type: 'alias' },
  { alias: 'gwip', expansion: 'git add -A && git commit -m "WIP"', why: 'guardado rápido de trabajo en curso', cat: 'git', type: 'alias' },

  // sistema
  { alias: 'meminfo', expansion: 'ps aux --sort=-rss | head -11', why: 'top 10 devoradores de RAM', cat: 'sistema', type: 'alias' },
  { alias: 'cpuhog', expansion: 'ps auxf --sort=-%cpu | head -11', why: 'top 10 por CPU con árbol de procesos', cat: 'sistema', type: 'alias' },
  { alias: 'bigfiles', expansion: 'find . -type f -size +100M -exec ls -lh {} \\; 2>/dev/null', why: 'ficheros de +100M desde aquí abajo', cat: 'sistema', type: 'alias' },
  { alias: 'journal', expansion: 'journalctl -xef --no-pager', why: 'log del sistema en vivo con follow', cat: 'sistema', type: 'alias' },
  { alias: 'servicios', expansion: 'systemctl list-units --type=service --state=running --no-pager', why: 'qué corre ahora mismo', cat: 'sistema', type: 'alias' },

  // dev
  { alias: 'serve', expansion: 'python3 -m http.server 8000', why: 'server web instantáneo en la carpeta actual (para demos, jamás en producción)', cat: 'dev', type: 'alias' },
  { alias: 'json', expansion: 'python3 -m json.tool', why: 'formatea y valida cualquier JSON que le pases', cat: 'dev', type: 'alias' },
  { alias: 'py', expansion: 'python3', why: 'porque escribir 3 letras menos cuenta', cat: 'dev', type: 'alias' },
  { alias: 'urlencode', expansion: 'python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))"', why: 'URL-encode desde la shell', cat: 'dev', type: 'function' },
]

export const ALIAS_CATS: { id: AliasCat; label: string }[] = [
  { id: 'qol', label: 'Calidad de vida' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'red', label: 'Red' },
  { id: 'git', label: 'Git' },
  { id: 'sistema', label: 'Sistema' },
  { id: 'dev', label: 'Dev' },
]

/** Genera el bloque de alias listo para ~/.bashrc o ~/.zshrc. */
export function buildAliasBlock(sel: AliasDef[], shell: AliasShell, withHeader = true): string {
  const out: string[] = []
  if (withHeader) {
    out.push('# ═══ HackNexus alias pack ═══')
    out.push(`# generado para ${shell} · ${sel.length} alias/functions`)
    out.push('# pégalo al final de ~/.bashrc o ~/.zshrc y recarga con: source ~/.bashrc')
    out.push('')
  }
  for (const a of sel) {
    if (a.type === 'function') {
      // funciones: cuerpo sencillo envuelto
      out.push(`# ${a.why}`)
      if (a.alias.includes('url')) {
        out.push(`urlencode() { python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))" "$1"; }`)
      } else {
        out.push(`${a.alias.trim()}() { ${a.expansion.split(' #')[0]}; }`)
      }
    } else {
      out.push(`# ${a.why}`)
      out.push(`alias ${a.alias}='${a.expansion.replace(/'/g, "'\\''")}'`)
    }
    out.push('')
  }
  return out.join('\n')
}

export const ALIAS_NOTES: string[] = [
  'Los alias de seguridad (cp -i, rm -I) cambian hábitos: en scripts NO aplican, solo en tu sesión interactiva.',
  'source ~/.bashrc tras pegar, o abre otra terminal: los alias no viajan a sesiones ya abiertas.',
  'Si un alias te pisa un binario real (ej. grep), siempre puedes llamar al original con \\grep.',
  'zsh trae corrección de typos y globbing más potente: los alias de bash funcionan igual en zsh.',
]
