/* Detección de archivos por magic bytes + entropía + strings */

export interface FileSignature {
  name: string
  ext: string
  mime: string
  category: 'imagen' | 'documento' | 'ejecutable' | 'archivo' | 'audio/video' | 'otro'
  offset?: number
  note?: string
}

const SIGS: { bytes: number[]; sig: FileSignature }[] = [
  { bytes: [0xff, 0xd8, 0xff], sig: { name: 'JPEG (JFIF/EXIF)', ext: 'jpg', mime: 'image/jpeg', category: 'imagen' } },
  { bytes: [0x89, 0x50, 0x4e, 0x47], sig: { name: 'PNG', ext: 'png', mime: 'image/png', category: 'imagen' } },
  { bytes: [0x47, 0x49, 0x46, 0x38], sig: { name: 'GIF', ext: 'gif', mime: 'image/gif', category: 'imagen' } },
  { bytes: [0x42, 0x4d], sig: { name: 'BMP', ext: 'bmp', mime: 'image/bmp', category: 'imagen' } },
  { bytes: [0x49, 0x49, 0x2a, 0x00], sig: { name: 'TIFF (little-endian)', ext: 'tif', mime: 'image/tiff', category: 'imagen' } },
  { bytes: [0x4d, 0x4d, 0x00, 0x2a], sig: { name: 'TIFF (big-endian)', ext: 'tif', mime: 'image/tiff', category: 'imagen' } },
  { bytes: [0x52, 0x49, 0x46, 0x46], sig: { name: 'RIFF (WEBP/AVI/WAV)', ext: 'riff', mime: 'application/octet-stream', category: 'imagen', note: 'comprueba bytes 8-11: WEBP/AVI /WAV' } },
  { bytes: [0x66, 0x74, 0x79, 0x70], sig: { name: 'MP4/MOV/M4A (ftyp)', ext: 'mp4', mime: 'video/mp4', category: 'audio/video', offset: 4 } },
  { bytes: [0x25, 0x50, 0x44, 0x46], sig: { name: 'PDF', ext: 'pdf', mime: 'application/pdf', category: 'documento' } },
  { bytes: [0x50, 0x4b, 0x03, 0x04], sig: { name: 'ZIP/OOXML/JAR/APK', ext: 'zip', mime: 'application/zip', category: 'archivo' } },
  { bytes: [0x37, 0x7a, 0xbc, 0xaf], sig: { name: '7-Zip', ext: '7z', mime: 'application/x-7z-compressed', category: 'archivo' } },
  { bytes: [0x52, 0x61, 0x72, 0x21], sig: { name: 'RAR', ext: 'rar', mime: 'application/vnd.rar', category: 'archivo' } },
  { bytes: [0x1f, 0x8b], sig: { name: 'GZIP', ext: 'gz', mime: 'application/gzip', category: 'archivo' } },
  { bytes: [0xfd, 0x37, 0x7a, 0x58], sig: { name: 'XZ', ext: 'xz', mime: 'application/x-xz', category: 'archivo' } },
  { bytes: [0x42, 0x5a, 0x68], sig: { name: 'BZIP2', ext: 'bz2', mime: 'application/x-bzip2', category: 'archivo' } },
  { bytes: [0x4d, 0x5a], sig: { name: 'PE ejecutable de Windows (MZ)', ext: 'exe', mime: 'application/vnd.microsoft.portable-executable', category: 'ejecutable' } },
  { bytes: [0x7f, 0x45, 0x4c, 0x46], sig: { name: 'ELF ejecutable de Linux', ext: 'elf', mime: 'application/x-executable', category: 'ejecutable' } },
  { bytes: [0xca, 0xfe, 0xba, 0xbe], sig: { name: 'Java class / Mach-O fat', ext: 'class', mime: 'application/java-vm', category: 'ejecutable' } },
  { bytes: [0x4d, 0x53, 0x43, 0x46], sig: { name: 'CAB de Microsoft', ext: 'cab', mime: 'application/vnd.ms-cab-compressed', category: 'archivo' } },
  { bytes: [0x4f, 0x67, 0x67, 0x53], sig: { name: 'OGG', ext: 'ogg', mime: 'audio/ogg', category: 'audio/video' } },
  { bytes: [0x49, 0x44, 0x33], sig: { name: 'MP3 (ID3)', ext: 'mp3', mime: 'audio/mpeg', category: 'audio/video' } },
  { bytes: [0x66, 0x4c, 0x61, 0x43], sig: { name: 'FLAC', ext: 'flac', mime: 'audio/flac', category: 'audio/video' } },
  { bytes: [0x53, 0x51, 0x4c, 0x69], sig: { name: 'SQLite 3', ext: 'db', mime: 'application/vnd.sqlite3', category: 'documento' } },
  { bytes: [0xd0, 0xcf, 0x11, 0xe0], sig: { name: 'MS Office legacy (OLE2)', ext: 'doc/xls/ppt', mime: 'application/msword', category: 'documento' } },
  { bytes: [0x30, 0x82], sig: { name: 'DER certificado / firma', ext: 'der', mime: 'application/pkix-cert', category: 'documento' } },
  { bytes: [0x2d, 0x2d, 0x2d], sig: { name: 'PEM (probable — texto)', ext: 'pem', mime: 'text/plain', category: 'documento', note: 'comienza con "---"' } },
]

export function identifySignature(bytes: Uint8Array): { sig: FileSignature | null; matched: string } {
  for (const { bytes: b, sig } of SIGS) {
    const off = sig.offset ?? 0
    if (bytes.length >= off + b.length) {
      let ok = true
      for (let i = 0; i < b.length; i++) {
        if (bytes[off + i] !== b[i]) {
          ok = false
          break
        }
      }
      if (ok) {
        // refina RIFF
        if (b[0] === 0x52 && bytes.length >= 12) {
          const four = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
          if (four === 'WEBP') return { sig: { ...sig, name: 'WEBP (RIFF)', ext: 'webp', mime: 'image/webp' }, matched: 'WEBP' }
          if (four === 'AVI ') return { sig: { ...sig, name: 'AVI (RIFF)', ext: 'avi', mime: 'video/x-msvideo' }, matched: 'AVI ' }
          if (four === 'WAVE') return { sig: { ...sig, name: 'WAV (RIFF)', ext: 'wav', mime: 'audio/wav' }, matched: 'WAVE' }
        }
        return { sig, matched: Array.from(b, (x) => x.toString(16).padStart(2, '0').toUpperCase()).join(' ') }
      }
    }
  }
  // texto vs binario
  let printable = 0
  const sample = bytes.slice(0, 2048)
  for (const b of sample) if ((b >= 0x20 && b < 0x7f) || b === 0x09 || b === 0x0a || b === 0x0d) printable++
  const isText = sample.length > 0 && printable / sample.length > 0.85
  if (isText) return { sig: { name: 'Texto plano (sin firma binaria)', ext: 'txt', mime: 'text/plain', category: 'otro' }, matched: '—' }
  return { sig: null, matched: '—' }
}

/* Entropía de Shannon por bloques — detecta cifrado/compresión/ocultamiento */
export function shannonEntropy(bytes: Uint8Array, blockSize = 1024): { global: number; blocks: number[]; max: number } {
  if (!bytes.length) return { global: 0, blocks: [], max: 8 }
  const freq = new Uint32Array(256)
  for (const b of bytes) freq[b]++
  let H = 0
  for (const f of freq) {
    if (f === 0) continue
    const p = f / bytes.length
    H -= p * Math.log2(p)
  }
  const blocks: number[] = []
  for (let off = 0; off < bytes.length; off += blockSize) {
    const chunk = bytes.slice(off, off + blockSize)
    const f2 = new Uint32Array(256)
    for (const b of chunk) f2[b]++
    let h = 0
    for (const f of f2) {
      if (f === 0) continue
      const p = f / chunk.length
      h -= p * Math.log2(p)
    }
    blocks.push(h)
  }
  return { global: H, blocks, max: 8 }
}

export function extractStrings(bytes: Uint8Array, minLen = 6, maxStrings = 400): string[] {
  const out: string[] = []
  let cur = ''
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]
    if ((b >= 0x20 && b < 0x7f) || (b >= 0xa0 && b < 0xfd)) {
      cur += String.fromCharCode(b)
      if (cur.length > 512) {
        if (cur.length >= minLen) out.push(cur)
        cur = ''
        if (out.length >= maxStrings) return out
      }
    } else {
      if (cur.length >= minLen) {
        out.push(cur)
        if (out.length >= maxStrings) return out
      }
      cur = ''
    }
  }
  if (cur.length >= minLen && out.length < maxStrings) out.push(cur)
  return out
}

export const entropyVerdict = (H: number): { label: string; tone: 'ok' | 'warn' | 'bad' | 'info' } => {
  if (H >= 7.5) return { label: 'Cifrada / comprimida (entropía máxima)', tone: 'bad' }
  if (H >= 6) return { label: 'Comprimida o con payload embebido', tone: 'warn' }
  if (H >= 4) return { label: 'Datos mixtos (¿texto + binario?)', tone: 'info' }
  return { label: 'Datos estructurados o texto', tone: 'ok' }
}