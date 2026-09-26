import { useMemo, useRef } from 'react'
import Prism from 'prismjs'
import { cn } from '../lib/util'

/* Tema Prism HackNexus: se inyecta una vez (los tokens usan la paleta de la app) */
const THEME_ID = 'prism-hacknexus-theme'
if (typeof document !== 'undefined' && !document.getElementById(THEME_ID)) {
  const style = document.createElement('style')
  style.id = THEME_ID
  style.textContent = `
    .code-hx { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; line-height: 1.55; tab-size: 2; }
    .code-hx code, .code-hx pre { font-family: inherit; }
    .code-hx .token.comment, .code-hx .token.prolog, .code-hx .token.doctype, .code-hx .token.cdata { color: #5b6b7d; font-style: italic; }
    .code-hx .token.punctuation { color: #8899aa; }
    .code-hx .token.property, .code-hx .token.tag, .code-hx .token.constant, .code-hx .token.symbol, .code-hx .token.deleted { color: #f472b6; }
    .code-hx .token.boolean, .code-hx .token.number { color: #f59e0b; }
    .code-hx .token.selector, .code-hx .token.attr-name, .code-hx .token.string, .code-hx .token.char, .code-hx .token.builtin, .code-hx .token.inserted { color: #2ee88a; }
    .code-hx .token.operator, .code-hx .token.entity, .code-hx .token.url { color: #38bdf8; }
    .code-hx .token.atrule, .code-hx .token.attr-value, .code-hx .token.keyword { color: #38bdf8; font-weight: 600; }
    .code-hx .token.function, .code-hx .token.class-name { color: #a78bfa; }
    .code-hx .token.regex, .code-hx .token.important, .code-hx .token.variable { color: #fb923c; }
    .code-hx .token.important, .code-hx .token.bold { font-weight: bold; }
    .code-hx .token.italic { font-style: italic; }
    .code-hx .token.namespace { opacity: 0.8; }
  `
  document.head.appendChild(style)
}

/** Editor de código: textarea invisible sobre el HTML resaltado por Prism. */
export function CodeArea({
  value, onChange, language = 'python', placeholder, minRows = 14, className,
}: {
  value: string
  onChange: (v: string) => void
  language?: string
  placeholder?: string
  minRows?: number
  className?: string
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  const highlighted = useMemo(() => {
    const grammar = Prism.languages[language] ?? Prism.languages.clike
    const html = Prism.highlight(value || placeholder || '', grammar, language in Prism.languages ? language : 'clike')
    return html + '\n' // el textarea final siempre con salto para sincronizar altura
  }, [value, language, placeholder])

  const minH = minRows * 19.4 + 24

  const syncScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop
      preRef.current.scrollLeft = taRef.current.scrollLeft
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    if (e.key === 'Tab') {
      e.preventDefault()
      const { selectionStart: s, selectionEnd: en } = ta
      const next = value.slice(0, s) + '  ' + value.slice(en)
      onChange(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
    }
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-edge bg-black/50 focus-within:border-acento/50', className)}>
      <div className="relative" style={{ minHeight: minH }}>
        <pre
          ref={preRef}
          aria-hidden
          className="code-hx pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words p-3"
          style={{ minHeight: minH }}
        >
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={placeholder}
          className="code-hx absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent p-3 text-transparent caret-acento outline-none placeholder:text-grey/40"
        />
      </div>
    </div>
  )
}

/** Bloque de solo lectura resaltado (para snippets de la chuleta). */
export function CodeView({ code, language = 'python', maxH }: { code: string; language?: string; maxH?: string }) {
  const highlighted = useMemo(() => {
    const lang = language in Prism.languages ? language : 'clike'
    return Prism.highlight(code, Prism.languages[lang] ?? Prism.languages.clike, lang)
  }, [code, language])
  return (
    <pre className="code-hx m-0 overflow-auto rounded-lg border border-edge bg-black/50 p-3" style={{ maxHeight: maxH }}>
      <code dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  )
}
