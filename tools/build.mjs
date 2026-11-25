// Builds index.html: one self-contained file with every module, the stylesheet, fonts and the logo
// inlined, so the app also opens from a downloaded copy (browsers refuse ES-module files over file://).
// Source stays modular under js/ and css/; dev.html loads those modules directly.
// Run: node tools/build.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const dataUri = (p, type) => `data:${type};base64,${fs.readFileSync(path.join(ROOT, p)).toString('base64')}`;

const modules = new Map(); // path -> { code, deps }
const order = [];

function load(rel) {
  if (modules.has(rel)) return;
  const src = read(rel);
  const deps = [];
  const exportsList = [];
  let code = src.replace(/^import\s+(\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+'([^']+)';\s*$/gm, (m, what, from) => {
    const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), from));
    deps.push(dep);
    if (what.startsWith('*')) return `const ${what.split(/\s+as\s+/)[1].trim()} = __m[${JSON.stringify(dep)}];`;
    const names = what.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/\s+as\s+/, ': '));
    return `const { ${names.join(', ')} } = __m[${JSON.stringify(dep)}];`;
  });
  if (/^\s*import\s/m.test(code)) throw new Error(`Unsupported import form in ${rel}`);
  code = code.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (m, kind, name) => { exportsList.push(name); return `${kind} ${name}`; });
  if (/^export\s/m.test(code)) throw new Error(`Unsupported export form in ${rel}`);
  modules.set(rel, { code, deps, exportsList });
  deps.forEach(load);
  order.push(rel);
}
load('js/main.js');

let js = `"use strict";\nconst __m = {};\n` + order.map(rel => {
  const { code, exportsList } = modules.get(rel);
  return `// ---- ${rel} ----\n__m[${JSON.stringify(rel)}] = (function () {\n${code}\nreturn { ${exportsList.join(', ')} };\n})();\n`;
}).join('\n');
js = js.replace(/"assets\/learning-mark\.svg"|src="assets\/learning-mark\.svg"/g, m => m.replace('assets/learning-mark.svg', dataUri('assets/learning-mark.svg', 'image/svg+xml')));
js = js.replace(/<\/script/gi, '<\\/script');
const stamp = 'Build ' + new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
js = js.replace(/__BUILD_STAMP__/g, stamp);

let css = read('css/app.css').replace(/url\("\.\.\/assets\/fonts\/([\w-]+\.woff2)"\)/g, (m, f) => `url("${dataUri('assets/fonts/' + f, 'font/woff2')}")`);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>CDP Learning Accelerator Demo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<!-- Built by tools/build.mjs from js/ and css/. Edit the source files, then rebuild. -->
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<noscript>The CDP Learning Accelerator needs JavaScript to run.</noscript>
<script>
${js}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log(`index.html written: ${order.length} modules, ${(html.length / 1024).toFixed(0)} KB`);
