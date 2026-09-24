/* Codificación emoji: cada byte → 2 emojis de un alfabeto de 16.
   Marcador inicial para detectar payloads emoji. */

const E16 = ['😀', '😍', '🤖', '👽', '🎃', '🔥', '⚡', '🌍', '🍕', '🚀', '🎮', '🎵', '💀', '🐙', '🍀', '🌈']
const MARK = '🔐'

export function emojiEncode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let out = MARK
  for (const b of bytes) out += E16[b >> 4] + E16[b & 15]
  return out
}

export function emojiDecode(input: string): string {
  const idx = new Map(E16.map((e, i) => [e, i] as const))
  const chars = Array.from(input.replace(MARK, ''))
  const codes: number[] = []
  for (let i = 0; i + 1 < chars.length; i += 2) {
    const hi = idx.get(chars[i])
    const lo = idx.get(chars[i + 1])
    if (hi === undefined || lo === undefined) continue
    codes.push(hi * 16 + lo)
  }
  return new TextDecoder().decode(new Uint8Array(codes))
}

/* Zero-width: 4 bits por símbolo (base16 invisible) */

const ZW = ['\u200b', '\u200c', '\u200d', '\u2060']
const ZW_CLEAN = /[\u200b\u200c\u200d\u2060]/g

export function zeroWidthEncode(text: string): string {
  const hex = Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, '0')).join('')
  let out = ''
  for (const h of hex) {
    const v = parseInt(h, 16)
    out += ZW[v >> 2] + ZW[v & 3]
  }
  return out
}

export function zeroWidthDecode(input: string): string {
  const syms = Array.from(input.match(ZW_CLEAN) ?? [])
  let hex = ''
  for (let i = 0; i + 1 < syms.length; i += 2) {
    const hi = ZW.indexOf(syms[i])
    const lo = ZW.indexOf(syms[i + 1])
    if (hi < 0 || lo < 0) continue
    hex += (hi * 4 + lo).toString(16)
  }
  const bytes = new Uint8Array(Math.floor(hex.length / 2))
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  return new TextDecoder().decode(bytes)
}

export const zeroWidthStrip = (input: string): string => input.replace(ZW_CLEAN, '')