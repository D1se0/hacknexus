const { translate } = require('/tmp/langtrans.cjs')
const js = ['function factorial(n) {', '  let r = 1;', '  for (let i = 2; i <= n; i++) {', '    r = r * i;', '  }', '  return r;', '}', '', 'factorial(5);'].join('\n')
try {
  const r = translate(js, 'javascript', 'python')
  console.log('OK', r.stats)
} catch (e) {
  console.log(e.stack)
}
