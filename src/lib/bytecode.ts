/* Bytecode Inspector — descompilador didáctico, 100% local.
   Java: parsea el .class REAL (magic, version → JDK, constant pool con tags,
   flags de acceso, fields y methods con descriptores).
   Python: cabecera del .pyc (magic → versión, flags, mtime, hash) + strings.
   No ejecuta nada: solo lee bytes. */

export interface CpEntry {
  index: number
  tag: number
  tag_name: string
  value: string
}

export interface JavaMethodInfo {
  name: string
  descriptor: string
  flags: string
  attributes: string[]
}

export interface JavaClassInfo {
  magicOk: boolean
  minor: number
  major: number
  javaVersion: string
  cpCount: number
  cp: CpEntry[]
  classFlags: string
  thisClass: string
  superClass: string
  interfaces: string[]
  fields: JavaMethodInfo[]
  methods: JavaMethodInfo[]
  attributes: string[]
  strings: string[]
  size: number
  error?: string
}

const JAVA_VERSIONS: Record<number, string> = {
  45: '1.1', 46: '1.2', 47: '1.3', 48: '1.4', 49: '5', 50: '6', 51: '7', 52: '8', 53: '9', 54: '10', 55: '11', 56: '12', 57: '13', 58: '14', 59: '15', 60: '16', 61: '17 (LTS)', 62: '18', 63: '19', 64: '20', 65: '21 (LTS)', 66: '22', 67: '23', 68: '24', 69: '25',
}

const CP_TAGS: Record<number, string> = {
  1: 'Utf8', 3: 'Integer', 4: 'Float', 5: 'Long', 6: 'Double', 7: 'Class', 8: 'String', 9: 'Fieldref', 10: 'Methodref', 11: 'InterfaceMethodref', 12: 'NameAndType', 15: 'MethodHandle', 16: 'MethodType', 17: 'Dynamic', 18: 'InvokeDynamic', 19: 'Module', 20: 'Package',
}

const CLASS_FLAGS: [number, string][] = [
  [0x0001, 'public'], [0x0010, 'final'], [0x0020, 'super'], [0x0200, 'interface'], [0x0400, 'abstract'], [0x1000, 'synthetic'], [0x2000, 'annotation'], [0x4000, 'enum'],
]
const MEMBER_FLAGS: [number, string][] = [
  [0x0001, 'public'], [0x0002, 'private'], [0x0004, 'protected'], [0x0008, 'static'], [0x0010, 'final'], [0x0040, 'volatile'], [0x0080, 'transient'], [0x0100, 'native'], [0x0400, 'abstract'], [0x0800, 'strictfp'], [0x1000, 'synthetic'],
]

const flagsToNames = (bits: number, table: [number, string][]): string =>
  table.filter(([b]) => bits & b).map(([, n]) => n).join(' ') || '(package-private)'

class Reader {
  pos = 0
  constructor(public b: Uint8Array) {}
  u1(): number { return this.b[this.pos++] }
  u2(): number { const v = (this.b[this.pos] << 8) | this.b[this.pos + 1]; this.pos += 2; return v }
  u4(): number { const v = ((this.b[this.pos] << 24) | (this.b[this.pos + 1] << 16) | (this.b[this.pos + 2] << 8) | this.b[this.pos + 3]) >>> 0; this.pos += 4; return v }
  bytes(n: number): Uint8Array { const s = this.b.subarray(this.pos, this.pos + n); this.pos += n; return s }
  utf8(n: number): string { return new TextDecoder('utf-8', { fatal: false }).decode(this.bytes(n)) }
}

export const parseJavaClass = (bytes: Uint8Array): JavaClassInfo => {
  const info: JavaClassInfo = {
    magicOk: false, minor: 0, major: 0, javaVersion: '?', cpCount: 0, cp: [], classFlags: '', thisClass: '', superClass: '',
    interfaces: [], fields: [], methods: [], attributes: [], strings: [], size: bytes.length,
  }
  try {
    const r = new Reader(bytes)
    const magic = r.u4()
    info.magicOk = magic === 0xcafebabe
    if (!info.magicOk) { info.error = 'no es un .class (magic CAFEBABE no encontrado)'; return info }
    info.minor = r.u2()
    info.major = r.u2()
    info.javaVersion = JAVA_VERSIONS[info.major] ?? `desconocida (major ${info.major})`

    // constant pool
    const count = r.u2()
    info.cpCount = count - 1
    const raw: (CpEntry | null)[] = [null]
    for (let i = 1; i < count; i++) {
      const tag = r.u1()
      const name = CP_TAGS[tag] ?? `tag ${tag}`
      let value = ''
      switch (tag) {
        case 1: { const len = r.u2(); value = r.utf8(len); if (value.length >= 4) info.strings.push(value); break }
        case 3: value = `int ${r.u4()}`; break
        case 4: value = `float ${new DataView(r.bytes(4).buffer, r.bytes.length && 0).getFloat32(0)}`; break
        case 5: value = `long ${BigInt.asIntN(64, (BigInt(r.u4()) << 32n) | BigInt(r.u4()))}`; raw.push(null); break
        case 6: { r.bytes(8); value = 'double'; raw.push(null); break }
        case 7: value = `#${r.u2()}`; break
        case 8: value = `#${r.u2()}`; break
        case 9: case 10: case 11: { const a = r.u2(); const b = r.u2(); value = `#${a}.#${b}`; break }
        case 12: { const a = r.u2(); const b = r.u2(); value = `${r ? '' : ''}#${a}:${b}`; break }
        case 15: { r.u1(); r.u2(); value = 'method handle'; break }
        case 16: value = `#${r.u2()}`; break
        case 17: case 18: { r.u2(); const a = r.u2(); value = `#${a}`; break }
        case 19: case 20: value = `#${r.u2()}`; break
        default: info.error = `tag desconocido ${tag} en constant pool (índice ${i})`; return info
      }
      raw.push({ index: i, tag, tag_name: name, value })
    }
    info.cp = raw.filter((x): x is CpEntry => x !== null)

    // resolución simple de Utf8 para nombres
    const utf8At = (idx: number): string => {
      const e = raw[idx]
      if (e && e.tag === 1) return e.value
      if (e && (e.tag === 7 || e.tag === 8)) {
        const ref = parseInt(e.value.slice(1), 10)
        return utf8At(ref)
      }
      return e?.value ?? `#${idx}`
    }

    const flags = r.u2()
    info.classFlags = flagsToNames(flags, CLASS_FLAGS)
    info.thisClass = utf8At(r.u2()).replace(/\//g, '.')
    info.superClass = utf8At(r.u2()).replace(/\//g, '.')
    const nIfaces = r.u2()
    for (let i = 0; i < nIfaces; i++) info.interfaces.push(utf8At(r.u2()).replace(/\//g, '.'))

    const readMembers = (kind: string): JavaMethodInfo[] => {
      const n = r.u2()
      const out: JavaMethodInfo[] = []
      for (let i = 0; i < n; i++) {
        const mflags = r.u2()
        const name = utf8At(r.u2())
        const descriptor = utf8At(r.u2())
        const nAttrs = r.u2()
        const attrs: string[] = []
        for (let a = 0; a < nAttrs; a++) {
          attrs.push(utf8At(r.u2()))
          const len = r.u4()
          r.bytes(len)
        }
        out.push({ name: `${name}${descriptor}`, descriptor, flags: flagsToNames(mflags, MEMBER_FLAGS), attributes: attrs })
        void kind
      }
      return out
    }

    info.fields = readMembers('field')
    info.methods = readMembers('method')
    const nAttrs = r.u2()
    for (let a = 0; a < nAttrs; a++) {
      info.attributes.push(utf8At(r.u2()))
      const len = r.u4()
      r.bytes(len)
    }
    return info
  } catch (e) {
    return { ...info, error: `parse interrumpido: ${(e as Error).message} — puede estar truncado u ofuscado` }
  }
}

/* ───────── .pyc ───────── */

const PYC_MAGICS: Record<number, string> = {
  3390: '3.7', 3413: '3.8', 3420: '3.8.1+', 3425: '3.9', 3430: '3.10', 3439: '3.11', 3450: '3.11a7+', 3495: '3.12', 3531: '3.13', 3571: '3.14',
}

export interface PycInfo {
  magicOk: boolean
  magic: number
  pythonVersion: string
  hashBased: boolean
  checkSource: boolean
  mtime: string | null
  sourceSize: number | null
  sourceHash: string | null
  strings: string[]
  size: number
  error?: string
}

export const parsePyc = (bytes: Uint8Array): PycInfo => {
  const info: PycInfo = {
    magicOk: false, magic: 0, pythonVersion: '?', hashBased: false, checkSource: false,
    mtime: null, sourceSize: null, sourceHash: null, strings: [], size: bytes.length,
  }
  try {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const magic = dv.getUint16(0, true) // little endian
    info.magic = magic
    info.magicOk = magic >= 3000 && magic < 4000 // rango de magics modernos
    info.pythonVersion = PYC_MAGICS[magic] ?? (info.magicOk ? `~3.x (magic ${magic} fuera de tabla)` : `desconocida (${magic})`)
    const flags = dv.getUint16(4, true)
    info.hashBased = (flags & 1) !== 0
    info.checkSource = (flags & 2) !== 0
    if (info.hashBased) {
      info.sourceHash = Array.from(bytes.subarray(8, 16), (b) => b.toString(16).padStart(2, '0')).join('')
    } else {
      const mtime = dv.getUint32(8, true)
      info.mtime = new Date(mtime * 1000).toISOString()
      info.sourceSize = dv.getUint32(12, true)
    }
    info.strings = extractStrings(bytes.subarray(16), 5)
  } catch (e) {
    info.error = (e as Error).message
  }
  return info
}

/* ───────── strings ───────── */

export const extractStrings = (bytes: Uint8Array, min = 4): string[] => {
  const out: string[] = []
  let cur = ''
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]
    if (b >= 0x20 && b <= 0x7e) cur += String.fromCharCode(b)
    else {
      if (cur.length >= min) out.push(cur)
      cur = ''
    }
  }
  if (cur.length >= min) out.push(cur)
  return out
}

export const SUSPICIOUS_RE = /(\/etc\/(shadow|passwd)|\/dev\/tcp|http:\/\/|https:\/\/|wget|curl |nc -|bash -i|chmod \+x|base64 -d|eval\(|exec\(|powershell|cmd\.exe|passwd|token|apikey|api_key|secret|socket\.)/i
