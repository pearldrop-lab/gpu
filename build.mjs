#!/usr/bin/env node
/* Bundles src/ into a single self-contained index.html.
   No dependencies, no minifier, no CDN — the output must run from a file://
   URL, from GitHub Pages, or through a raw-HTML proxy without change. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');

const MODULES = [
  '01-math', '02-geom', '03-shaders-scene', '04-shaders-post',
  '05-gl', '06-model', '07-features', '08-renderer', '09-app',
];

const js = MODULES.map((m) => {
  const src = read(`src/js/${m}.js`);
  return `/* ==== ${m}.js ${'='.repeat(Math.max(0, 62 - m.length))} */\n${src}`;
}).join('\n\n');

const html = `<!doctype html>
<html lang="en">
<head>
${read('src/index.head.html')}</head>
<body>
${read('src/index.body.html')}
<script>
"use strict";
(function () {
${js}
})();
</${'script'}>
</body>
</html>
`;

writeFileSync(join(root, 'index.html'), html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`index.html written — ${kb} kB, ${html.split('\n').length} lines`);
