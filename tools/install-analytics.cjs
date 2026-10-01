// Public measurement configuration; credentials remain in Cloudflare secrets.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..', process.env.BELRE_BUILD_OUTPUT || 'dist');
const origin = new URL(process.env.STUDY_METRICS_ORIGIN || 'https://leeromgeving-statistieken.hma9k.workers.dev');
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw Error('Ongeldig meetadres.');
const installer = 'privacy-build-20260928.cjs';
const expectedHash = '639e5a7fca4501c8cabcd1294fc882d2b590c11d18a21457cf5047b03f56b03b';
const tag = '<script src="' + origin.origin + '/collect.js?v=20261001"></script>';
let pages = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.isSymbolicLink() || entry.name.startsWith('.') || ['node_modules', 'scripts', 'tests', 'docs', 'assistant', 'functions'].includes(entry.name)) continue;
    const file = path.resolve(dir, entry.name);
    if (!file.startsWith(root + path.sep)) throw Error('Ongeldige uitvoermap.');
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) {
      const original = fs.readFileSync(file, 'utf8');
      if (!original.includes('<script data-goatcounter=')) continue;
      pages++;
      const html = original.replace(/<script\b[^>]*\bsrc=["'][^"']*\/collect\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/gi, '');
      fs.writeFileSync(file, html.replace('<script data-goatcounter=', tag + '<script data-goatcounter='));
    }
  }
}
async function install() {
  const response = await fetch(origin.origin + '/' + installer, {signal: AbortSignal.timeout(30000)});
  if (!response.ok) throw Error('Privacy-installer niet beschikbaar.');
  const source = await response.text();
  if (crypto.createHash('sha256').update(source).digest('hex') !== expectedHash) throw Error('Privacy-installer gewijzigd.');
  walk(root);
  if (!pages) throw Error('Geen meetbare HTML-ingangen gevonden.');
  const headerFile = path.join(root, '_headers');
  if (fs.existsSync(headerFile)) {
    const headers = fs.readFileSync(headerFile, 'utf8');
    if (!headers.includes(origin.hostname)) fs.writeFileSync(headerFile, headers.replace("script-src 'self'", "script-src 'self' " + origin.origin).replace("connect-src 'self'", "connect-src 'self' " + origin.origin));
  }
  Function('require', 'process', 'console', source)(require, {...process, env: {...process.env, STUDY_USAGE_BUILD_ROOT: root}}, console);
  console.log(JSON.stringify({measurementEntrypoints: pages,measurementOrigin: origin.origin}));
}
install().catch(error => {console.error(error.message); process.exitCode = 1;});
