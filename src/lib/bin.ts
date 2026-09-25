/* Inspector de binarios PE (Windows) y ELF (Linux) en JS puro, leyendo bytes del fichero subido.
   Extrae headers, secciones, imports/exports, notas de build (Go/Rust) y heurísticas de packing. 100% local. */

export interface SecRow {
  name: string
  vaddr: string
  size: string
  entropy: number
  flags: string
}

export interface PeSym { name: string; dll?: string; ord?: number }

export interface BinInfo {
  kind: 'PE' | 'ELF'
  arch: string
  bits: 32 | 64
  endian: 'little' | 'big'
  compiled: string
  entry: string
  imageBase: string
  sections: SecRow[]
  imports: PeSym[]
  exports: PeSym[]
  notes: string[]
  flags: { packed: boolean; signed: boolean; gui: boolean; console: boolean; dll: boolean }
}

const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength)

function shannon(b: Uint8Array): number {
  if (!b.length) return 0
  const freq = new Array<number>(256).fill(0)
  for (let i = 0; i < b.length; i++) freq[b[i]]++
  let H = 0
  for (const f of freq) {
    if (!f) continue
    const p = f / b.length
    H -= p * Math.log2(p)
  }
  return H
}

const rstr = (b: Uint8Array, off: number, max = 64): string => {
  let s = ''
  for (let i = off; i < b.length && i - off < max; i++) {
    const c = b[i]
    if (!c) break
    if (c >= 32 && c < 127) s += String.fromCharCode(c)
    else break
  }
  return s
}

const hx = (n: number, pad = 8): string => '0x' + n.toString(16).padStart(pad, '0').toUpperCase()

/* ──────────────────────────── PE ──────────────────────────── */

const PE_MACHINE: Record<number, string> = {
  0x014c: 'x86 (i386)', 0x8664: 'x86-64 (AMD64)', 0x01c0: 'ARM', 0xaa64: 'ARM64',
  0x01c4: 'ARMNT', 0x0200: 'IA-64', 0x5032: 'RISC-V 32', 0x5064: 'RISC-V 64',
}

const PE_DATA_DIRS = ['Export', 'Import', 'Resource', 'Exception', 'Certificate', 'BaseReloc', 'Debug', 'Arch', 'GlobalPtr', 'TLS', 'LoadConfig', 'BoundImport', 'IAT', 'DelayImport', 'CLR', 'Reserved']

const SECTION_FLAGS: [number, string][] = [
  [0x20, 'CODE'], [0x40, 'IDATA'], [0x80, 'UDATA'], [0x02000000, 'DISCARD'],
  [0x04000000, 'NOCACHE'], [0x08000000, 'NOPAGE'], [0x10000000, 'SHARED'],
  [0x20000000, 'EXEC'], [0x40000000, 'READ'], [0x80000000, 'WRITE'],
]

export function parsePe(b: Uint8Array): BinInfo | null {
  if (b.length < 0x100 || b[0] !== 0x4d || b[1] !== 0x5a) return null
  const d = dv(b)
  const peOff = d.getUint32(0x3c, true)
  if (peOff + 6 > b.length || b[peOff] !== 0x50 || b[peOff + 1] !== 0x45) return null
  const machine = d.getUint16(peOff + 4, true)
  const nSec = d.getUint16(peOff + 6, true)
  const chars = d.getUint16(peOff + 22, true)
  const optOff = peOff + 24
  const magic = d.getUint16(optOff, true)
  const is64 = magic === 0x20b
  const ddOff = optOff + (is64 ? 112 : 96)
  const numDirs = d.getUint32(ddOff - 4, true)
  const secs: SecRow[] = []
  const secTbl = optOff + d.getUint16(peOff + 20, true)
  for (let i = 0; i < nSec && secTbl + 40 * i + 40 <= b.length; i++) {
    const s = secTbl + 40 * i
    const name = rstr(b, s, 8)
    const vSize = d.getUint32(s + 8, true)
    const vAddr = d.getUint32(s + 12, true)
    const rSize = d.getUint32(s + 16, true)
    const rPtr = d.getUint32(s + 20, true)
    const sc = d.getUint32(s + 36, true)
    const fl: string[] = []
    for (const [bit, label] of SECTION_FLAGS) if (sc & bit) fl.push(label)
    const data = b.subarray(rPtr, Math.min(b.length, rPtr + Math.min(rSize, vSize || rSize, 4 * 1024 * 1024)))
    secs.push({ name, vaddr: hx(vAddr), size: `${vSize} / ${rSize}`, entropy: shannon(data), flags: fl.join('|') || '—' })
  }

  // imports (leer solo del dir 1)
  const imports: PeSym[] = []
  const readDir = (idx: number): { va: number; size: number } | null =>
    idx < numDirs ? { va: d.getUint32(ddOff + 8 * idx, true), size: d.getUint32(ddOff + 8 * idx + 4, true) } : null
  const rva2off = (rva: number): number => {
    for (const s of secs.length ? secsRaw(b, secTbl, nSec) : []) {
      if (rva >= s.va && rva < s.va + Math.max(s.vSize, s.rSize)) return s.rPtr + (rva - s.va)
    }
    return 0
  }
  const impDir = readDir(1)
  if (impDir && impDir.va) {
    let off = rva2off(impDir.va)
    for (let i = 0; off && i < 96; i++, off += 20) {
      if (off + 20 > b.length) break
      const nameRva = d.getUint32(off + 12, true)
      if (!nameRva) break
      const dll = rstr(b, rva2off(nameRva))
      const thunkRva = d.getUint32(off, true) || d.getUint32(off + 16, true)
      let tOff = rva2off(thunkRva)
      let j = 0
      for (; tOff && j < 256; j++, tOff += 4) {
        if (tOff + 4 > b.length) break
        const t = d.getUint32(tOff, true)
        if (!t) break
        if (t & 0x80000000) imports.push({ name: `#${t & 0xffff}`, dll })
        else {
          const fn = rstr(b, rva2off(t) + 2)
          if (fn) imports.push({ name: fn, dll })
        }
        if (imports.length > 800) break
      }
    }
  }

  // exports
  const exports: PeSym[] = []
  const expDir = readDir(0)
  if (expDir && expDir.va) {
    const eOff = rva2off(expDir.va)
    if (eOff) {
      const nNames = d.getUint32(eOff + 24, true)
      const namesRva = d.getUint32(eOff + 32, true)
      const nOff = rva2off(namesRva)
      for (let i = 0; nOff && i < Math.min(nNames, 200); i++) {
        const nmRva = d.getUint32(nOff + 4 * i, true)
        const nm = nmRva ? rstr(b, rva2off(nmRva)) : ''
        if (nm) exports.push({ name: nm })
      }
    }
  }

  // firma Authenticode: dir Certificate presente
  const cert = readDir(4)
  // subsistema
  const subsys = d.getUint16(optOff + (is64 ? 68 : 68), true)
  const dllChar = d.getUint16(optOff + (is64 ? 70 : 70), true)
  const notes: string[] = []
  const dirs: string[] = []
  for (let i = 0; i < Math.min(numDirs, 16); i++) {
    const dr = readDir(i)
    if (dr && dr.va) dirs.push(PE_DATA_DIRS[i])
  }
  notes.push(`Data dirs: ${dirs.join(', ') || 'ninguno'}`)
  if (cert && cert.va) notes.push('Firma Authenticode presente (no verificada aquí)')
  const isGo = /gopclntab|go\.buildid|runtime\./i.test(String.fromCharCode(...b.subarray(0, Math.min(b.length, 65536)))) || imports.some((i) => i.name.startsWith('runtime.') || i.dll === 'go.dll')
  if (isGo) notes.push('Binario Go detectado (símbolos runtime/gopclntab)')
  if (/rust_begin_unwind|\.rustc|cargo/i.test(String.fromCharCode(...b.subarray(0, Math.min(b.length, 65536))))) notes.push('Binario Rust detectado (sección .rustc / runtime)')
  if (dirs.includes('CLR')) notes.push('Binario .NET (CLR) — metadatos IL, analízalo con dnSpy/ILSpy')
  if (/MFC\d|VCRUNTIME|msvcr\d+\.dll/i.test(imports.map((i) => i.dll).join(' '))) notes.push('Enlazado con runtime MSVC — típico de binario nativo Windows')
  if (imports.some((i) => /WS2_32|WININET|WINHTTP/i.test(i.dll ?? ''))) notes.push('Capacidad de red (winsock/wininet) — C2 o descarga posible')
  if (imports.some((i) => /CRYPT32|BCRYPT|ADVAPI32.*Crypt/i.test(i.dll ?? ''))) notes.push('Uso de criptografía (crypt32/bcrypt)')
  if (imports.some((i) => /IsDebuggerPresent|CheckRemoteDebuggerPresent|OutputDebugString/i.test(i.name))) notes.push('Imports anti-debug (IsDebuggerPresent…)')

  const packed = secs.some((s) => s.entropy > 7.2 && s.size.split('/')[0].trim() !== '0') || /UPX\d?|\.aspack|\.adata|petite|mpress1/i.test(secs.map((s) => s.name).join(' '))
  const stamp = d.getUint32(peOff + 8, true)
  const compiled = stamp ? new Date(stamp * 1000).toISOString().slice(0, 19).replace('T', ' ') + ' UTC' : '0 (ofuscado/reproducible)'

  return {
    kind: 'PE',
    arch: PE_MACHINE[machine] ?? hx(machine, 4),
    bits: is64 ? 64 : 32,
    endian: 'little',
    compiled,
    entry: hx(d.getUint32(optOff + 16, true)),
    imageBase: hx(is64 ? Number(d.getBigUint64(optOff + 24, true)) : d.getUint32(optOff + 28, true)),
    sections: secs,
    imports,
    exports,
    notes,
    flags: { packed, signed: !!(cert && cert.va), gui: subsys === 2, console: subsys === 3, dll: !!(chars & 0x2000) },
  }
}

function secsRaw(b: Uint8Array, secTbl: number, nSec: number) {
  const d = dv(b)
  const out: { va: number; vSize: number; rSize: number; rPtr: number }[] = []
  for (let i = 0; i < nSec && secTbl + 40 * i + 40 <= b.length; i++) {
    const s = secTbl + 40 * i
    out.push({ va: d.getUint32(s + 12, true), vSize: d.getUint32(s + 8, true), rSize: d.getUint32(s + 16, true), rPtr: d.getUint32(s + 20, true) })
  }
  return out
}

/* ──────────────────────────── ELF ──────────────────────────── */

const ELF_MACHINE: Record<number, string> = {
  3: 'x86 (i386)', 62: 'x86-64 (AMD64)', 40: 'ARM', 183: 'AArch64 (ARM64)',
  8: 'MIPS', 20: 'PowerPC', 21: 'PowerPC64', 243: 'RISC-V', 2: 'SPARC',
}

const ELF_TYPES: Record<number, string> = { 1: 'REL (objeto reubicable)', 2: 'EXEC (ejecutable)', 3: 'DYN (PIE/shared)', 4: 'CORE' }

export function parseElf(b: Uint8Array): BinInfo | null {
  if (b.length < 64 || b[0] !== 0x7f || b[1] !== 0x45) return null
  const d = dv(b)
  const is64 = b[4] === 2
  const big = b[5] === 2
  // DataView.get*(pos, littleEndian): pasa !big para que LE use true y BE use false
  const E = !big
  const mach = d.getUint16(18, E)
  const type = d.getUint16(16, E)
  const entry = is64 ? Number(d.getBigUint64(24, E)) : d.getUint32(24, E)
  const phOff = is64 ? Number(d.getBigUint64(32, E)) : d.getUint32(28, E)
  const phEnt = is64 ? d.getUint16(54, E) : d.getUint16(42, E)
  const phNum = is64 ? d.getUint16(56, E) : d.getUint16(44, E)
  const shOff = is64 ? Number(d.getBigUint64(40, E)) : d.getUint32(32, E)
  const shEnt = is64 ? d.getUint16(58, E) : d.getUint16(46, E)
  const shNum = is64 ? d.getUint16(60, E) : d.getUint16(48, E)
  const shStrIdx = is64 ? d.getUint16(62, E) : d.getUint16(50, E)

  const PT_LOAD: { off: number; va: number; size: number; flags: number }[] = []
  for (let i = 0; i < phNum; i++) {
    const p = phOff + phEnt * i
    if (p + phEnt > b.length) break
    const pType = d.getUint32(p, E)
    if (pType === 1) {
      const o = is64 ? Number(d.getBigUint64(p + 8, E)) : d.getUint32(p + 4, E)
      const va = is64 ? Number(d.getBigUint64(p + 16, E)) : d.getUint32(p + 12, E)
      const sz = is64 ? Number(d.getBigUint64(p + 32, E)) : d.getUint32(p + 20, E)
      const fl = d.getUint32(p + (is64 ? 4 : 24), E)
      PT_LOAD.push({ off: o, va, size: sz, flags: fl })
    }
  }
  const off2va = (o: number): number => {
    for (const l of PT_LOAD) if (o >= l.off && o < l.off + l.size) return l.va + (o - l.off)
    return 0
  }

  const secs: SecRow[] = []
  let shStr: Uint8Array = new Uint8Array()
  if (shNum && shOff && shStrIdx < shNum) {
    const s0 = shOff + shEnt * shStrIdx
    if (s0 + shEnt <= b.length) {
      const o = is64 ? Number(d.getBigUint64(s0 + 24, E)) : d.getUint32(s0 + 16, E)
      const sz = is64 ? Number(d.getBigUint64(s0 + 32, E)) : d.getUint32(s0 + 20, E)
      shStr = b.subarray(o, Math.min(b.length, o + sz))
    }
  }
  const shName = (idx: number): string => rstr(shStr, idx)
  for (let i = 0; i < shNum; i++) {
    const s = shOff + shEnt * i
    if (s + shEnt > b.length) break
    const nameIdx = d.getUint32(s, E)
    const typeSh = d.getUint32(s + 4, E)
    const va = is64 ? Number(d.getBigUint64(s + 16, E)) : d.getUint32(s + 12, E)
    const sz = is64 ? Number(d.getBigUint64(s + 32, E)) : d.getUint32(s + 20, E)
    const off = is64 ? Number(d.getBigUint64(s + 24, E)) : d.getUint32(s + 16, E)
    const fl = is64 ? Number(d.getBigUint64(s + 8, E)) : d.getUint32(s + 8, E)
    if (typeSh === 8 /*NOBITS*/ || !sz) continue
    const data = b.subarray(off, Math.min(b.length, off + Math.min(sz, 4 * 1024 * 1024)))
    const fls: string[] = []
    if (fl & 0x1) fls.push('WRITE')
    if (fl & 0x2) fls.push('ALLOC')
    if (fl & 0x4) fls.push('EXEC')
    secs.push({ name: shName(nameIdx) || `sección ${i}`, vaddr: hx(va), size: String(sz), entropy: shannon(data), flags: fls.join('|') || '—' })
  }

  // dynsym names + dyn
  const imports: PeSym[] = []
  const exports: PeSym[] = []
  const notes: string[] = []
  const head = String.fromCharCode(...b.subarray(0, Math.min(b.length, 262144)))
  if (/gopclntab|go:buildid|runtime\.main/.test(head)) notes.push('Binario Go detectado (gopclntab/buildid)')
  if (/rust_begin_unwind|\.rustc|cargo:/.test(head)) notes.push('Binario Rust detectado')
  if (/CGO_ENABLED|_cgo_/.test(head)) notes.push('Contiene código CGo')
  if (/upx/i.test(head)) notes.push('Marcas UPX — binario empaquetado (probar `upx -d`)')
  if (PT_LOAD.some((l) => l.flags & 0x1 && l.flags & 0x4) || secs.some((s) => s.entropy > 7.2)) notes.push('Segmento W+X o sección de alta entropía: posible packer/self-modifying')
  if (/Interp|ld-linux|ld-musl/i.test(head)) notes.push('Enlazado dinámico contra libc (busca .interp)')
  else notes.push('Posible binario estático (sin intérprete) — típico de malware/malas prácticas de Go')

  return {
    kind: 'ELF',
    arch: ELF_MACHINE[mach] ?? `machine ${mach}`,
    bits: is64 ? 64 : 32,
    endian: big ? 'big' : 'little',
    compiled: 'N/D en ELF (ver notas de build)',
    entry: hx(entry),
    imageBase: PT_LOAD.length ? hx(PT_LOAD[0].va) : '—',
    sections: secs.slice(0, 40),
    imports,
    exports,
    notes,
    flags: { packed: /upx/i.test(head) || PT_LOAD.some((l) => l.flags & 0x1 && l.flags & 0x4), signed: false, gui: false, console: true, dll: type === 3 },
  }
}

export function parseBin(bytes: Uint8Array): BinInfo | null {
  return bytes[0] === 0x4d && bytes[1] === 0x5a ? parsePe(bytes) : bytes[0] === 0x7f && bytes[1] === 0x45 ? parseElf(bytes) : null
}
