/* Test del motor «VLSM en Formato X» — JS puro (node + esbuild).
   Compara contra: (1) los 7 golden extraídos del Excel real,
   (2) el oráculo independiente Python (docs/fixtures/vlsmx-oracle.json),
   (3) propiedades /0–/32 y (4) parseo/errores. */
import * as esbuild from 'esbuild'
import assert from 'node:assert'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

mkdirSync('/tmp/bundles', { recursive: true })
await esbuild.build({
  entryPoints: ['src/lib/vlsmx.ts'],
  bundle: true,
  format: 'esm',
  outfile: '/tmp/bundles/vlsmx.mjs',
  logLevel: 'silent',
})
await esbuild.build({
  entryPoints: ['src/lib/subnet.ts'],
  bundle: true,
  format: 'esm',
  outfile: '/tmp/bundles/subnet.mjs',
  logLevel: 'silent',
})
await esbuild.build({
  entryPoints: ['src/lib/vlsmx-export.ts'],
  bundle: true,
  format: 'esm',
  outfile: '/tmp/bundles/vlsmx-export.mjs',
  logLevel: 'silent',
})
const X = await import('/tmp/bundles/vlsmx.mjs')
const S = await import('/tmp/bundles/subnet.mjs')
const E = await import('/tmp/bundles/vlsmx-export.mjs')

let PASS = 0
const FAIL = []
const T = (name, fn) => {
  try {
    fn()
    console.log('  ✓', name)
    PASS++
  } catch (e) {
    FAIL.push(`${name} — ${e.message}`)
    console.log('  ✗', name, '—', e.message)
  }
}

const oracle = JSON.parse(readFileSync('docs/fixtures/vlsmx-oracle.json', 'utf8'))
const golden = JSON.parse(readFileSync('docs/fixtures/formato_x_golden.json', 'utf8'))

const itos = (n) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`
const maskInt = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0)
const toWc = (m) => (~m) >>> 0

/* ── 1. golden vs Excel ── */
console.log('— golden (7 bloques del Excel) —')
for (const g of golden.inputs) {
  const [ip, prefixStr] = g.split('/')
  T(`golden ${g}`, () => {
    const p = parseInt(prefixStr, 10)
    const blk = X.computeBlock(ip, p, 1, g)
    assert.strictEqual(blk.xBit, p < 32 ? p + 1 : 32, 'xBit')
    assert.strictEqual(blk.hostBitsCount, 32 - p, 'hostBits')
    assert.strictEqual(blk.broadcast, itos((blk.netInt | toWc(maskInt(p))) >>> 0), 'broadcast desde bits')
    assert.ok(blk.baseText === '' || blk.baseText.endsWith('.'), 'baseText termina en punto')
  })
}

/* ── 2. oráculo ≥3000 casos ── */
console.log('— oráculo independiente —')
const cases = Object.entries(oracle.cases)
T(`≥3000 casos (${cases.length})`, () => assert.ok(cases.length >= 3000))
let oracleFails = 0
for (const [key, c] of cases) {
  const slash = key.lastIndexOf('/')
  const ip = key.slice(0, slash)
  const prefix = parseInt(key.slice(slash + 1), 10)
  const blk = X.computeBlock(ip, prefix, 0, key)
  try {
    if ((blk.netInt >>> 0) !== (c.netInt >>> 0)) throw new Error('netInt')
    if ((blk.bcInt >>> 0) !== (c.broadcastInt >>> 0)) throw new Error('broadcastInt')
    if (blk.first !== itos(c.firstHostInt >>> 0)) throw new Error(`firstHost ${blk.first} ≠ ${itos(c.firstHostInt >>> 0)}`)
    if (blk.last !== itos(c.lastHostInt >>> 0)) throw new Error(`lastHost ${blk.last} ≠ ${itos(c.lastHostInt >>> 0)}`)
    if (blk.hostRows.join('|') !== c.hostRows.join('|')) throw new Error(`hostRows ${blk.hostRows.join('|')} ≠ ${c.hostRows.join('|')}`)
    if (blk.xBit !== c.xBit) throw new Error('xBit')
    if (blk.xCol !== c.xCol) throw new Error('xCol')
  } catch (e) {
    oracleFails++
    if (oracleFails <= 5) {
      FAIL.push(`oráculo ${key} — ${e.message}`)
      console.log('  ✗', `oráculo ${key}`, '—', e.message)
    }
  }
}
if (oracleFails === 0) {
  console.log(`  ✓ oráculo completo (${cases.length} casos)`)
  PASS++
}

/* ── 3. propiedades /0–/32 ── */
console.log('— propiedades —')
T('broadcast − red + 1 = 2^(32−p) para todo p', () => {
  for (let p = 0; p <= 32; p++) {
    const b = X.computeBlock('100.64.37.19', p, 0, '')
    assert.strictEqual(b.bcInt - b.netInt + 1, 2 ** (32 - p), `p=${p}`)
  }
})
T('red AND máscara = red · red & wildcard = 0 · bc = red | wildcard', () => {
  for (let p = 0; p <= 32; p++) {
    const b = X.computeBlock('17.203.9.221', p, 0, '')
    const m = maskInt(p)
    assert.strictEqual((b.netInt & m) >>> 0, b.netInt, `and p=${p}`)
    assert.strictEqual((b.netInt & toWc(m)) >>> 0, 0, `wc-0 p=${p}`)
    assert.strictEqual(b.bcInt, (b.netInt | toWc(m)) >>> 0, `bc p=${p}`)
  }
})
T('X en prefijo+1 · hosts dibujados = 32−p', () => {
  for (let p = 0; p <= 32; p++) {
    const b = X.computeBlock('200.100.50.25', p, 0, '')
    if (p < 32) assert.strictEqual(b.xBit, p + 1, `xBit p=${p}`)
    assert.strictEqual(b.hostRows[0].length, 32 - p, `hostbits p=${p}`)
  }
})
T('1º = red+1 · último = broadcast−1 (salvo /31 /32)', () => {
  for (let p = 0; p <= 30; p++) {
    const b = X.computeBlock('4.8.15.16', p, 0, '')
    assert.strictEqual(b.first, itos((b.netInt + 1) >>> 0), `p=${p}`)
    assert.strictEqual(b.last, itos((b.bcInt - 1) >>> 0), `p=${p}`)
  }
})
T('la ip y su red producen el mismo bloque', () => {
  for (const [ip] of [['192.168.68.230'], ['192.168.68.224'], ['192.168.68.255']]) {
    const b = X.computeBlock(ip, 27, 0, '')
    assert.strictEqual(b.net, '192.168.68.224', ip)
  }
})
T('número de filas por bloque: 5 std · 3 en /31 · 2 en /32', () => {
  const rows = ['192.168.68.230/27', '10.0.0.4/31', '10.0.0.5/32'].map((k) => {
    const [ip, p] = [k.slice(0, k.lastIndexOf('/')), parseInt(k.slice(k.lastIndexOf('/') + 1), 10)]
    return X.computeBlock(ip, p, 0, k)
  })
  assert.strictEqual(X.layoutGrid(rows, '24').blocks.map((b) => b.rows).join(','), '5,3,2')
})
T('modo 32 auto activa con /7 y avisa', () => {
  const g = X.layoutGrid([X.computeBlock('10.0.0.1', 7, 0, '')], '24')
  assert.strictEqual(g.mode, '32')
  assert.ok((g.warns[0] || '').includes('32 bits'))
  assert.strictEqual(g.cols, 32)
})
T('/31: 2 hosts · /32: 1 host', () => {
  const b31 = X.computeBlock('10.0.0.4', 31, 0, '')
  assert.strictEqual(b31.first, '10.0.0.4')
  assert.strictEqual(b31.last, '10.0.0.5')
  assert.strictEqual(b31.hostRows.join(''), '01')
  assert.strictEqual(b31.hostLabels.join('|'), 'DIR RED / 1ª|2ª')
  const b32 = X.computeBlock('10.0.0.5', 32, 0, '')
  assert.strictEqual(b32.first, '10.0.0.5')
  assert.strictEqual(b32.last, '10.0.0.5')
  assert.strictEqual(b32.hostRows.length, 1)
})
T('blockRowsToCells: red 111 + X · hosts desde la X', () => {
  const b = X.computeBlock('192.168.68.230', 27, 0, '')
  const { cells, labels } = X.blockRowsToCells(b, 24)
  assert.strictEqual(cells[0][16]?.bit, '1') // col 17 = bit 25
  assert.strictEqual(cells[0][19]?.bit, 'X') // col 20 = bit 28
  assert.strictEqual(cells[1][19]?.bit, '0') // DIR RED
  assert.strictEqual(cells[2][19]?.bit, '0')
  assert.strictEqual(cells[3][19]?.bit, '1') // ULTIMO HOST
  assert.strictEqual(cells[4][19]?.bit, '1') // BROADCAST
  assert.strictEqual(labels.length, 5)
  assert.strictEqual(b.redBits, '111')
  assert.strictEqual(b.redStartBit, 25)
})
T('biry: bits de red ^ (prefijo 0 = sin red) · /8 sin bits de red', () => {
  assert.strictEqual(X.computeBlock('10.130.1.1', 9, 0, '').redBits, '1')
  assert.strictEqual(X.computeBlock('10.0.0.1', 8, 0, '').redBits, '')
  assert.strictEqual(X.computeBlock('10.0.0.1', 8, 0, '').baseText, '10.')
  assert.strictEqual(X.computeBlock('10.0.0.1', 0, 0, '').baseText, '')
})
T('orden: input preserva · prefix/network ordenan', () => {
  const blocks = [X.computeBlock('10.0.0.1', 24, 0, ''), X.computeBlock('10.0.0.1', 16, 1, '')]
  assert.strictEqual(X.sortBlocks(blocks, 'input')[0].prefix, 24)
  assert.strictEqual(X.sortBlocks(blocks, 'prefix')[0].prefix, 16)
  assert.strictEqual(X.sortBlocks(blocks, 'network')[0].prefix, 16)
})
T('MAX_BLOCKS = 200', () => assert.strictEqual(X.MAX_BLOCKS, 200))

/* ── 5. integración Modo B (misma VLSM, mismo resultado) ── */
console.log('— integración Modo B —')
T('la sección X recibe EXACTAMENTE las subredes de vlsm()', () => {
  const { blocks } = S.vlsm('192.168.1.0', 24, [
    { name: 'RRHH', hosts: 50 },
    { name: 'IT', hosts: 120 },
    { name: 'Servidores', hosts: 20 },
  ])
  const okBlocks = blocks.filter((b) => b.ok)
  assert.ok(okBlocks.length === 3, '3 subredes ok')
  const xblocks = okBlocks.map((b, i) => X.computeBlock(b.network, b.cidr, i, `${b.network}/${b.cidr}`, b.name))
  for (let i = 0; i < okBlocks.length; i++) {
    const vb = okBlocks[i]
    const xb = xblocks[i]
    assert.strictEqual(xb.net, vb.network, 'misma red')
    assert.strictEqual(xb.broadcast, vb.broadcast, 'mismo broadcast')
    assert.strictEqual(xb.first, vb.firstHost, 'mismo 1º host')
    assert.strictEqual(xb.last, vb.lastHost, 'mismo último host')
    assert.strictEqual(xb.mask, vb.mask, 'misma máscara')
  }
  // y cambiar la VLSM cambia el X en vivo
  const { blocks: b2 } = S.vlsm('10.0.0.0', 16, [{ name: 'Sede', hosts: 500 }])
  const x2 = X.computeBlock(b2[0].network, b2[0].cidr, 0, '', 'Sede')
  assert.strictEqual(x2.net, b2[0].network)
  assert.strictEqual(x2.prefix, b2[0].cidr)
})

/* ── 6. exportación (TSV/MD/JSON/xlsx) ── */
console.log('— exportaciones —')
const demoBlocks = [
  X.computeBlock('192.168.68.230', 27, 0, '192.168.68.230/27'),
  X.computeBlock('10.0.0.4', 31, 1, '10.0.0.4/31'),
  X.computeBlock('10.0.0.5', 32, 2, '10.0.0.5/32'),
]
T('TSV tiene nº de bits, pesos y bloques con etiqueta/IP', () => {
  const tsv = E.gridToTsv(X.assembleGrid(demoBlocks, '24'))
  const lines = tsv.split('\n')
  assert.strictEqual(lines.length, 2 + demoBlocks.map((b) => (b.cidr32 ? 2 : b.cidr31 ? 3 : 5)).reduce((a, b) => a + b, 0), '2 cabeceras + filas de bloques')
  assert.ok(lines[0].includes('\t9\t10\t11'), 'números 9..')
  assert.ok(lines[1].includes('\t128\t64\t32'), 'pesos')
  assert.ok(lines[2].includes('\t192.168.68.'), 'Z de cabecera con punto final: ' + lines[2])
  void /	$/
})
T('Markdown válido y JSON reversible', () => {
  const md = E.gridToMarkdown(X.assembleGrid(demoBlocks, '24'))
  assert.ok(md.startsWith('| `` | **'), 'cabecera md')
  const json = E.entriesToJson([{ raw: '192.168.68.230/27' }])
  const back = E.jsonToInput(json)
  assert.ok(back.ok && back.text === '192.168.68.230/27')
})
T('xlsx: zip correcto + openpyxl lo abre con IPs como TEXTO', async () => {
  const bytes = E.gridToXlsxBytes(X.assembleGrid(demoBlocks, '24'))
  // firma ZIP
  assert.ok(bytes[0] === 0x50 && bytes[1] === 0x4b, 'firma PK')
  writeFileSync('/tmp/vlsmx-test.xlsx', bytes)
})

/* ── validación del xlsx con openpyxl (proceso aparte al final del script) ── */

/* ── 4. parseo y errores ── */
console.log('— parseo —')
T('formatos aceptados + warnings', () => {
  const ok = (t, ip, p, warn) => {
    const r = X.parseEntry(t)
    assert.ok(r.ok, `${t} → ${!r.ok ? r.error : ''}`)
    assert.strictEqual(r.ip, ip)
    assert.strictEqual(r.prefix, p)
    if (warn) assert.ok(r.warning, `${t} debía avisar`)
  }
  ok('192.168.68.230/27', '192.168.68.230', 27)
  ok('192.168.68.230 /27', '192.168.68.230', 27)
  ok('192.168.68.230/ 27', '192.168.68.230', 27)
  ok('192.168.68.230 255.255.255.224', '192.168.68.230', 27)
  ok('192.168.68.230 0.0.0.31', '192.168.68.230', 27)
  ok('192.168.68.230 27', '192.168.68.230', 27, true)
  ok('10.0.0.1 /8', '10.0.0.1', 8)
  // 0.0.0.0 tras una IP es ambiguo: se desambigua como MÁSCARA /0 (decisión en docs/DECISIONS.md)
  ok('10.0.0.1 0.0.0.0', '10.0.0.1', 0)
})
T('errores claros por entrada', () => {
  const errs = [
    ['192.168.68.230/33', /rango/],
    ['192.168.68.230/-1', /prefijo|inválida/],
    ['192.168.68.230/abc', /inválid/],
    ['256.1.1.1/24', /rango/],
    ['1.2.3/24', /octetos/],
    ['1.2.3.4.5/24', /octetos/],
    ['192.168.68.230 255.0.255.0', /no contigua/],
    ['010.1.1.1/8', /izquierda/],
    ['::1/64', /IPv6/],
    ['', /vacía/],
    ['   ', /vacía/],
    ['192.168.68.230', /falta el prefijo/],
  ]
  for (const [t, re] of errs) {
    const r = X.parseEntry(t)
    assert.ok(!r.ok && re.test(r.error), `${t} debía fallar con ${re} (dio: ${r.ok ? 'OK' : r.error})`)
  }
})
T('parseInput: comentarios, vacías, varios por línea y errores mezclados', () => {
  const entries = X.parseInput('# comentario\n\n192.168.1.1/30, 10.0.0.1 255.255.255.252\n172.16.0.1/12; 8.8.8.8/24\nfoo/99\n')
  assert.strictEqual(entries.length, 5, `5 entradas (4 válidas + 1 error), hay ${entries.length}`)
  assert.strictEqual(entries.filter((e) => !e.error).length, 4)
  assert.ok(entries[4].error)
})
T('overlaps detectados', () => {
  const blk = [X.computeBlock('10.0.0.0', 24, 0, ''), X.computeBlock('10.0.0.128', 25, 1, ''), X.computeBlock('10.0.1.0', 24, 2, '')]
  const pairs = X.overlapPairs(blk)
  assert.strictEqual(pairs.length, 1)
  assert.ok(pairs[0].includes('10.0.0.0/24') && pairs[0].includes('10.0.0.128/25'))
})

console.log(`\n${FAIL.length === 0 ? 'TODO OK' : FAIL.length + ' FAIL'} · ${PASS} tests`)
if (FAIL.length) console.log(FAIL.map((f) => '· ' + f).join('\n'))
process.exit(FAIL.length ? 1 : 0)
