import clsx, { type ClassValue } from 'clsx'

export const cn = (...classes: ClassValue[]) => clsx(classes)

export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
  return Promise.resolve()
}

export function download(filename: string, data: BlobPart, mime = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(2)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

export const fmtNum = (n: number): string => n.toLocaleString('es-ES')

export const toHex = (buf: Uint8Array, sep = ''): string =>
  Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join(sep)

export const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '')
  const out = new Uint8Array(Math.floor(clean.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}

export const bytesToText = (buf: Uint8Array): string => new TextDecoder().decode(buf)
export const textToBytes = (s: string): Uint8Array => new TextEncoder().encode(s)

export const randInt = (min: number, max: number): number =>
  Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * (max - min + 1)) + min

export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const titleCase = (s: string): string =>
  s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())

export const debounce = <F extends (...args: never[]) => void>(fn: F, ms = 200) => {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<F>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export const fmtDate = (d: Date | number | string): string => {
  try {
    return new Date(d).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'medium' })
  } catch {
    return String(d)
  }
}

export const relTime = (date: Date | number | string): string => {
  const diff = new Date(date).getTime() - Date.now()
  const abs = Math.abs(diff)
  const units: [number, string][] = [
    [31_536_000_000, 'año'],
    [2_592_000_000, 'mes'],
    [604_800_000, 'semana'],
    [86_400_000, 'día'],
    [3_600_000, 'hora'],
    [60_000, 'minuto'],
    [1000, 'segundo'],
  ]
  for (const [ms, name] of units) {
    if (abs >= ms) {
      const v = Math.round(abs / ms)
      return `hace ${v} ${name}${v > 1 ? 's' : ''}`.replace('hace', diff < 0 ? 'hace' : 'en')
    }
  }
  return 'ahora'
}
