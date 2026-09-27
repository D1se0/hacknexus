import { useMemo } from 'react'
import { CopyBtn } from './ui'
import { cn } from '../lib/util'

/* Resaltado de sintaxis ligero (sin dependencias) para los forges de scripts.
   Tokenizador secuencial por línea con reglas por lenguaje. */

export type CodeLang = 'bash' | 'powershell'

interface Rule {
  re: RegExp
  c: string
}

const C = {
  comment: 'text-grey/50 italic',
  str: 'text-[#a5d6a7]',
  str2: 'text-[#f0a4b8]',
  variable: 'text-[#7dd3fc]',
  keyword: 'text-[#c792ea]',
  cmd: 'text-[#2ee88a] font-semibold',
  builtin: 'text-[#2ee88a]',
  number: 'text-[#f78c6c]',
  flag: 'text-[#82aaff]',
  type: 'text-[#ffcb6b]',
  op: 'text-[#89ddff]',
  plain: '',
}

const BASH_RULES: Rule[] = [
  { re: /^#[^\n]*/, c: C.comment },
  { re: /^"(?:\\.|[^"\\])*"?/, c: C.str },
  { re: /^'(?:[^'])*'?/, c: C.str },
  { re: /^\$\{[^}\n]*\}/, c: C.variable },
  { re: /^\$[@#?*!$-]|[0-9]/, c: C.variable },
  { re: /^\$[A-Za-z_]\w*/, c: C.variable },
  { re: /^(if|then|elif|else|fi|for|in|do|done|while|until|case|esac|function|select|return|exit|local|readonly|export|declare|set|trap|source|eval|break|continue|shift)\b/, c: C.keyword },
  { re: /^(echo|read|cd|pwd|printf|test|mktemp|chmod|chown|rm|cp|mv|mkdir|touch|cat|grep|sed|awk|curl|wget|nc|socat|ssh|sudo|apt|apt-get|systemctl|journalctl|find|xargs|sort|uniq|head|tail|tee|wc|cut|tr|sleep|ping|ip|ss|nmap|stat|df|du|ls|ln|basename|dirname|realpath|tar|gzip|sha256sum|md5sum|base64|openssl|kill|ps|crontab|mount|umount|dd|useradd|usermod|groupadd)\b/, c: C.cmd },
  { re: /^--?[A-Za-z][\w-]*/, c: C.flag },
  { re: /^-?\d+(\.\d+)?/, c: C.number },
  { re: /^(\|\||&&|[|;&<>]+|==|=|!=)/, c: C.op },
  { re: /^[[\]{}(),]/, c: 'text-grey/60' },
]

const PS_RULES: Rule[] = [
  { re: /^<#[\s\S]*?#>/, c: C.comment },
  { re: /^#[^\n]*/, c: C.comment },
  { re: /^"(?:`.|[^"`])*"?/, c: C.str },
  { re: /^'(?:''|[^'])*'?/, c: C.str },
  { re: /^\$\{[^}\n]*\}/, c: C.variable },
  { re: /^\$[A-Za-z_]\w*/, c: C.variable },
  { re: /^\$[A-Za-z]:[\\/][^\s|;]*/, c: C.variable },
  { re: /^[A-Za-z][\w]*-[A-Z][A-Za-z0-9]*\b/, c: C.cmd },
  { re: /^(if|elseif|else|switch|foreach|for|while|do|until|try|catch|finally|function|filter|param|return|throw|break|continue|begin|process|end|in|trap|class|enum|default|exit)\b/, c: C.keyword },
  { re: /^\[[\w.\[\]]+\]/, c: C.type },
  { re: /^-[A-Za-z]\w*\b/, c: C.flag },
  { re: /^-?\d+(\.\d+)?/, c: C.number },
  { re: /^(-eq|-ne|-gt|-lt|-ge|-le|-like|-notlike|-match|-notmatch|-contains|-and|-or|-not|\||&|=|>|<|>>)/, c: C.op },
  { re: /^[[\]{}(),;]/, c: 'text-grey/60' },
]

const RULES: Record<CodeLang, Rule[]> = { bash: BASH_RULES, powershell: PS_RULES }

interface Tok {
  t: string
  c: string
}

function tokenizeLine(line: string, rules: Rule[]): Tok[] {
  const out: Tok[] = []
  let rest = line
  let guard = 0
  while (rest && guard++ < 4000) {
    let matched = false
    for (const r of rules) {
      const m = rest.match(r.re)
      if (m && m[0]) {
        out.push({ t: m[0], c: r.c })
        rest = rest.slice(m[0].length)
        matched = true
        break
      }
    }
    if (!matched) {
      out.push({ t: rest[0], c: C.plain })
      rest = rest.slice(1)
    }
  }
  return out
}

export function CodeBlock({ code, lang, label = 'script', maxH }: { code: string; lang: CodeLang; label?: string; maxH?: string }) {
  const rules = RULES[lang]
  const lines = useMemo(() => code.split('\n').map((l) => tokenizeLine(l, rules)), [code, rules])

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-black/70">
      <div className="flex items-center justify-between border-b border-edge px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-acento" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-grey">{label}</span>
          <span className="rounded border border-edge px-1.5 py-0.5 font-mono text-[9px] text-grey/60">{lang}</span>
        </div>
        <CopyBtn text={code} className="border-0 bg-transparent px-1" />
      </div>
      <pre className={cn('overflow-auto p-4 font-mono text-[13px] leading-relaxed', maxH ?? 'max-h-96')}>
        <code className="block">
          {lines.map((toks, i) => (
            <div key={i} className="flex">
              <span className="w-9 shrink-0 select-none pr-3 text-right text-grey/25">{i + 1}</span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-all">
                {toks.length === 0 ? ' ' : toks.map((t, j) => (
                  <span key={j} className={t.c || undefined}>{t.t}</span>
                ))}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}
