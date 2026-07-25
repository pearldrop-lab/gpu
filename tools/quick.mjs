#!/usr/bin/env node
/* Fast two-shot look check: overview + one macro. */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const out = process.argv[2] || '/tmp/quick';
const feature = process.argv[3] || '1';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(pathToFileURL(process.cwd() + '/index.html').href, { waitUntil: 'load' });
// SwiftShader starves CSS transitions of ticks; make the UI settle instantly.
await page.addStyleTag({ content: '*{transition-duration:0s!important;animation-duration:.001s!important}' });
await page.waitForTimeout(900);
await page.evaluate(() => window.app.snap());
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/a-overview.png` });

await page.keyboard.press(feature);
await page.waitForTimeout(200);
await page.evaluate(() => window.app.snap());
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/b-feature.png` });

await page.click('#btn-stage');
await page.waitForTimeout(200);
await page.evaluate(() => window.app.snap());
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/c-macro.png` });

console.log(logs.length ? logs.join('\n') : '(console clean)');
await browser.close();
