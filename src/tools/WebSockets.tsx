import { useMemo, useState } from 'react'
import { PlugZap, Info, Binary } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextArea, TextInput, KV, CopyBlock } from '../components/ui'
import { decodeWsFrame, encodeMaskedFrame, buildWsClient, buildCrossSiteWsHijack, WS_ATTACKS } from '../lib/websocket'

const SAMPLE_MASKED = encodeMaskedFrame('{"action":"buy","price":100}')
const SAMPLE_SERVER = '810548656c6c6f' // text "Hello" sin máscara (servidor→cliente)

export default function WebSockets() {
  const [hex, setHex] = useState('')
  const [payload, setPayload] = useState('{"action":"buy","price":1}')
  const [wsUrl, setWsUrl] = useState('wss://target.com/ws')
  const [msg, setMsg] = useState('{"action":"list","resource":"invoices"}')

  const info = useMemo(() => (hex.trim() ? decodeWsFrame(hex) : null), [hex])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={PlugZap}
        title="WebSocket Attack Lab"
        desc="Decodificador de frames RFC 6455 bit a bit (opcode, máscara, extended length), generador de frames enmascarados, cliente de laboratorio y matriz de ataques: CSWSH, manipulación de mensajes, DoS"
        badge="web"
      />

      <InfoBanner>
        WebSocket NO es HTTP: no hay SameSite, no hay CORS y muchos servidores autentican solo en el handshake y nunca más. Los mensajes aquí se decodifican localmente — pega los bytes que veas en Wireshark o en la pestaña Frames de DevTools.
      </InfoBanner>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Binary size={15} className="text-acento" /> decodificador de frames</h3>
            <TextArea value={hex} onChange={(e) => setHex(e.target.value)} placeholder="hex del frame: 81 93 12 34 56 78 …" className="min-h-24 font-mono text-[12px]" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button onClick={() => setHex(SAMPLE_MASKED)} className="rounded-lg border border-edge px-2.5 py-1 font-mono text-[11px] text-grey hover:border-acento/50 hover:text-ink">frame cliente (enmascarado)</button>
              <button onClick={() => setHex(SAMPLE_SERVER)} className="rounded-lg border border-edge px-2.5 py-1 font-mono text-[11px] text-grey hover:border-acento/50 hover:text-ink">frame servidor (sin máscara)</button>
            </div>
            {info && !info.ok && <p className="mt-3 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 font-mono text-[12px] text-bad">{info.error}</p>}
            {info?.ok && (
              <div className="mt-3 space-y-2">
                <div className="grid gap-1 sm:grid-cols-2">
                  <KV k="tipo" v={<Badge tone="accent">{info.opcodeName} (0x{info.opcode.toString(16)})</Badge>} />
                  <KV k="FIN / RSV" v={`${info.fin ? 1 : 0} / ${info.rsv1 ? 1 : 0}${info.rsv2 ? 1 : 0}${info.rsv3 ? 1 : 0}`} />
                  <KV k="enmascarado" v={info.masked ? `sí (key: ${info.maskKey.map((x) => x.toString(16).padStart(2, '0')).join(' ')})` : 'no (servidor→cliente)'} />
                  <KV k="longitud" v={`${info.payloadLen} bytes${info.extended ? ' (extended)' : ` (campo directo: ${info.rawLenField})`}`} />
                </div>
                <div className="rounded-lg border border-acento/30 bg-acento/5 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-acento">payload {info.masked ? '(des-enmascarado con la key)' : ''}</p>
                  <p className="mt-1 break-all font-mono text-[12px] text-ink">{info.payloadPreview}</p>
                </div>
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">hex del frame:</p>
                  <p className="break-all rounded-lg border border-edge bg-black/30 px-3 py-2 font-mono text-[11px] text-grey">{info.hexDump}</p>
                </div>
              </div>
            )}
            <p className="mt-3 text-[11.5px] leading-relaxed text-grey">
              El byte 1 lo dice todo: FIN+opcode. El byte 2: bit de máscara + longitud. Si la longitud es 126 o 127, la real viene en 2 u 8 bytes detrás. La máscara (4 bytes) solo la usan los CLIENTES — es ofuscación anti-proxy-cache, no seguridad.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.04}>
          <div className="card p-5">
            <h3 className="mb-3 font-mono text-sm font-bold text-white">generador de frame enmascarado</h3>
            <Field label="payload del mensaje">
              <TextInput value={payload} onChange={(e) => setPayload(e.target.value)} className="font-mono text-[12px]" />
            </Field>
            <div className="mt-3">
              <CopyBlock text={SAMPLE_MASKED.replace(payload, '') ? encodeMaskedFrame(payload) : ''} label="frame.hex (máscara didáctica fija)" maxH="max-h-24" />
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-grey">
              Cada byte del payload va XOR con la máscara rotada: byte i con key[i % 4]. En la captura de red el contenido es ilegible hasta que aplicas la máscara — exactamente lo que hace el decodificador de la izquierda.
            </p>
            <div className="mt-4 border-t border-edge pt-4">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">cliente y CSWSH de laboratorio</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="url del websocket"><TextInput value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} className="font-mono text-[12px]" /></Field>
                <Field label="mensaje a enviar"><TextInput value={msg} onChange={(e) => setMsg(e.target.value)} className="font-mono text-[12px]" /></Field>
              </div>
              <div className="mt-3 space-y-2">
                <CopyBlock text={buildWsClient(wsUrl, msg)} label="ws-client.html" maxH="max-h-40" />
                <CopyBlock text={buildCrossSiteWsHijack(wsUrl, msg)} label="cswsh.html (servir desde TU servidor)" maxH="max-h-40" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.06}>
        <div className="card mt-4 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">ataques WebSocket con su prueba</h3>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {WS_ATTACKS.map((a) => (
              <div key={a.id} className="rounded-lg border border-edge bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-ink">{a.name}</span>
                  <Badge tone={a.difficulty === 'trivial' ? 'bad' : a.difficulty === 'alta' ? 'info' : 'warn'}>{a.difficulty}</Badge>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-grey">{a.how}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink/90"><b className="text-acento">prueba:</b> {a.payloadHint}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ok">✓ {a.detect}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-grey">
            <Info size={12} className="mt-0.5 shrink-0 text-acento" />
            Defensa resumida: validar el header Origin estrictamente (lista exacta), autenticar CADA mensaje sensible (no solo el handshake), TLS siempre y rate-limit por sesión.
          </p>
        </div>
      </Reveal>
    </div>
  )
}
