/* Generador de chuletas personalizadas: combina temas de cheat sheets
   (vim, tmux, git, find/grep, bash, red…) en una chuleta imprimible
   con índice, en TXT y Markdown. */

export interface CheatTopic {
  id: string
  label: string
  icon: string
  desc: string
  sections: { title: string; items: [string, string][] }[]
}

export const CHEAT_TOPICS: CheatTopic[] = [
  {
    id: 'vim', label: 'Vim / Neovim', icon: '📝', desc: 'supervivencia y Edición Eficiente',
    sections: [
      { title: 'Supervivencia', items: [['i / a / o', 'insertar antes / después / línea nueva'], ['Esc + :wq', 'guardar y salir'], ['Esc + :q!', 'salir SIN guardar (tu salvavidas)'], ['u / Ctrl+r', 'undo / redo']] },
      { title: 'Movimiento', items: [['gg / G', 'inicio / fin del fichero'], ['0 / $ / ^', 'inicio línea / fin / primer carácter no blanco'], ['w / b / e', 'palabra siguiente / anterior / fin de palabra'], ['{ }', 'párrafo anterior / siguiente'], ['Ctrl+d / Ctrl+u', 'media página abajo / arriba'], ['* / #', 'buscar palabra bajo cursor (adelante/atrás)']] },
      { title: 'Edición', items: [['dd / dw / d$', 'borrar línea / palabra / hasta fin'], ['yy + p', 'copiar línea y pegar'], ['ci" / ca( / ct,', 'cambiar DENTRO comillas / ENTORNO paréntesis / HASTA coma'], ['>> / <<', 'indentar / desindentar línea'], ['~', 'alternar mayúscula'], ['Ctrl+v + I + Esc', 'modo bloque: insertar en N líneas a la vez (magia pura)']] },
      { title: 'Buscar y reemplazar', items: [['/texto / n / N', 'buscar / siguiente / anterior'], [':%s/viejo/nuevo/g', 'reemplazar en todo el fichero'], [':%s/viejo/nuevo/gc', 'idem con confirmación por línea'], [':s/viejo/nuevo/g', 'solo en la línea actual']] },
    ],
  },
  {
    id: 'tmux', label: 'tmux', icon: '🪟', desc: 'multiplexor de terminales',
    sections: [
      { title: 'Sesiones', items: [['tmux new -s lab', 'crear sesión con nombre'], ['Ctrl+b d', 'desconectar (sesión sigue viva)'], ['tmux ls / tmux a -t lab', 'listar / reconectar'], ['Ctrl+b $', 'renombrar sesión']] },
      { title: 'Ventanas y paneles', items: [['Ctrl+b c', 'nueva ventana'], ['Ctrl+b 0-9 / n / p', 'ir a ventana N / siguiente / anterior'], ['Ctrl+b % / "', 'split horizontal / vertical'], ['Ctrl+b flechas', 'navegar entre paneles'], ['Ctrl+b x', 'cerrar panel actual'], ['Ctrl+b z', 'zoom de panel (fullscreen toggle)']] },
      { title: 'Trucos', items: [['Ctrl+b [', 'modo copy: navegar con vim keys, / para buscar'], ['Ctrl+b : resize-pane -D 10', 'redimensionar panel'], ['tmux attach -d', 'robar la sesión de otro terminal']] },
    ],
  },
  {
    id: 'findgrep', label: 'find + grep + xargs', icon: '🔍', desc: 'la búsqueda que lo encuentra todo',
    sections: [
      { title: 'find esencial', items: [['find . -name "*.log"', 'por nombre (¡comillas!)'], ['find / -size +100M 2>/dev/null', 'ficheros grandes silenciando permisos'], ['find . -mtime -1', 'modificados en las últimas 24h'], ['find . -perm -4000', 'SUID (privesc básico)'], ['find . -exec cmd {} \\;', 'ejecutar sobre cada resultado'], ['find . -type f | wc -l', 'contar ficheros']] },
      { title: 'grep esencial', items: [['grep -r "texto" .', 'recursivo'], ['grep -i -n "error" log.txt', 'insensible + números de línea'], ['grep -E "regex1|regex2"', 'regex extendida con alternancia'], ['grep -v "^#"', 'excluir comentarios'], ['grep -A3 -B1 "match"', 'contexto: 3 líneas después, 1 antes'], ['grep -l "texto" *', 'solo nombres de fichero que coinciden']] },
      { title: 'xargs y tuberías', items: [['... | xargs -I{} cp {} /destino/', 'usar {} como placeholder'], ['... | xargs -P 8 -n1 cmd', '8 ejecuciones EN PARALELO'], ['... | xargs -0 cmd', 'para nombres con espacios (con find -print0)'], ['find . -name "*.tmp" -print0 | xargs -0 rm', 'borrado seguro con espacios'], ['history | awk \'{print $2}\' | sort | uniq -c | sort -rn | head', 'tus comandos más usados (auto-conocimiento)']] },
    ],
  },
  {
    id: 'bash', label: 'Bash scripting', icon: '🐚', desc: 'shell que no explota',
    sections: [
      { title: 'Variables y seguridad', items: [['set -euo pipefail', 'LA primera línea de todo script serio: fallo=parar, vars obligatorias, fallos en tubería'], ['"${VAR:-default}"', 'valor por defecto sin morir si no existe'], ['readonly CONST="x"', 'constantes que no se pisan por accidente'], ['local var=', 'en funciones: sin local contamina el scope global']] },
      { title: 'Condicionales', items: [['[[ -f fich ]] / -d / -x', 'existe fichero / dir / ejecutable'], ['[[ $x == val* ]]', 'comparación con wildcard (dentro [[ ]])'], ['(( n > 3 ))', 'aritmética'], ['[[ -z "$s" / -n "$s" ]]', 'string vacía / no vacía']] },
      { title: 'Trampas clásicas', items: [['for f in $(ls)', 'NUNCA: espacios rompen todo → for f in *'], ['var="texto con espacios"', 'siempre comillas al asignar'], ['"$var"', 'siempre comillas al EXPANDIR: "$var"'], ['cmd | while read', 'el while corre en subshell: las vars no sobreviven (usar process substitution < <(cmd))']] },
    ],
  },
  {
    id: 'red', label: 'Red en consola', icon: '🌐', desc: 'diagnóstico sin GUI',
    sections: [
      { title: 'Ver el estado', items: [['ip -br a / ip -br r', 'IPs y rutas compactas'], ['ss -tulpn', 'puertos escuchando + proceso'], ['ethtool eth0 | grep Speed', 'velocidad negociada del enlace'], ['nmcli dev status', 'estado de todos los dispositivos']] },
      { title: 'Probar conectividad', items: [['ping -c3 1.1.1.1', 'conectividad IP sin DNS'], ['curl -sI https://x.com', 'solo cabeceras: ¿responde el server?'], ['mtr -rw 8.8.8.8', 'traceroute + ping combinados (el ping de los adultos)'], ['dig +short dominio.com', 'resolución DNS mínima'], ['nc -zv host 443', '¿el puerto está abierto? sin más']] },
      { title: 'Capturar tráfico', items: [['tcpdump -i eth0 -nn port 443', 'captura cruda sin resolver nombres'], ['tcpdump -w captura.pcap', 'a fichero para Wireshark'], ['tcpdump -i any "tcp[tcpflags] & tcp-syn != 0"', 'solo SYNs: intentos de conexión'], ['sudo lsof -i :8080', 'quién usa el puerto 8080 AHORA']] },
    ],
  },
  {
    id: 'git', label: 'Git diario', icon: '🌳', desc: 'sin miedo a perder nada',
    sections: [
      { title: 'Deshacer (lo más importante)', items: [['git restore fich', 'descarta cambios sin commitear'], ['git restore --staged fich', 'sacar del staging'], ['git commit --amend', 'corregir el ÚLTIMO commit (solo si no está pushedo)'], ['git reset --soft HEAD~1', 'deshacer commit conservando cambios'], ['git reflog', 'el historial de TODO: tu red de seguridad absoluta'], ['git revert <sha>', 'deshacer un commit PÚBLICO con nuevo commit']] },
      { title: 'Ver y limpiar', items: [['git log --oneline --graph --all', 'historial bonito de ramas'], ['git diff --staged', 'qué va a entrar en el próximo commit'], ['git stash / stash pop', 'guardar trabajo temporal sin commit'], ['git clean -fd', 'BORRAR ficheros no trackeados (¡ojo!)'], ['git branch --merged', 'ramas ya fusionadas: candidatas a borrar']] },
      { title: 'Trucos', items: [['git bisect start', 'búsqueda binaria del commit que rompió algo'], ['git log -S "funcion"', 'commits que añaden/quitan esa cadena (pickaxe)'], ['git worktree add ../hotfix hotfix', 'dos ramas en dos carpetas simultáneas'], ['git commit --fixup <sha> + rebase -i --autosquash', 'commits de corrección que se reordenan solos']] },
    ],
  },
]

export interface CheatOptions {
  title: string
  topics: string[]
  format: 'txt' | 'md'
  includeHeader: boolean
  includeIndex: boolean
  twoColHint: boolean
}

export function buildCheatSheet(o: CheatOptions): string {
  const topics = CHEAT_TOPICS.filter((t) => o.topics.includes(t.id))
  const isMd = o.format === 'md'
  const out: string[] = []
  const h1 = isMd ? '# ' : ''
  const h2 = isMd ? '## ' : '══ '
  const h3 = isMd ? '### ' : '── '
  const sep = isMd ? '---' : '═'.repeat(50)

  if (o.includeHeader) {
    out.push(`${h1}${o.title || 'Chuleta personal'}`)
    out.push(`${isMd ? '' : ''}_generada con HackNexus · ${new Date().toLocaleDateString('es-ES')}_`)
    out.push(sep)
    out.push('')
  }
  if (o.includeIndex) {
    out.push(`${h2}Índice`)
    topics.forEach((t, i) => out.push(`${isMd ? `${i + 1}.` : '  '}${t.icon} ${t.label}`))
    out.push('')
    out.push(sep)
    out.push('')
  }
  for (const t of topics) {
    out.push(`${h2}${t.icon} ${t.label}`)
    out.push('')
    for (const sec of t.sections) {
      out.push(`${h3}${sec.title}`)
      for (const [cmd, why] of sec.items) {
        if (isMd) out.push(`| \`${cmd}\` | ${why} |`)
        else out.push(`  ${cmd.padEnd(o.twoColHint ? 42 : 0)}${o.twoColHint ? ' ' + why : '\n    ' + why}`)
      }
      if (isMd && sec.items.length) {
        // insertar cabecera de tabla antes de la primera fila
        const idx = out.length - sec.items.length
        out.splice(idx, 0, '| Tecla / comando | Qué hace |', '|---|---|')
      }
      out.push('')
    }
  }
  if (!isMd && o.twoColHint) out.push('(formato pensado para imprimir en landscape a dos columnas)')
  return out.join('\n')
}

export function downloadCheatSheet(o: CheatOptions): { filename: string; mime: string } {
  const name = (o.title || 'chuleta').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chuleta'
  return { filename: `${name}.${o.format}`, mime: o.format === 'md' ? 'text/markdown' : 'text/plain' }
}

export const CHEAT_NOTES: string[] = [
  'La mejor chuleta es la que tú MISMO haces: el acto de elegirla ya te enseña la mitad.',
  'Imprime en A5 y pégala junto al monitor: el aprendizaje espacial funciona mejor que cualquier app.',
  'Cada tema cabe en una página: si no cabe, estás copiando el manual, no haciendo una chuleta.',
]
