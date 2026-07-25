#!/usr/bin/env node
/* Headless smoke test + screenshotter.
   Usage: node tools/shot.mjs [outdir]
   Renders the page in SwiftShader, drives the UI, and reports console noise. */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const out = process.argv[2] || '/tmp/shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--enable-webgl', '--ignore-gpu-blocklist', '--disable-lcd-text',
  ],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 820 }, deviceScaleFactor: 1 });

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(pathToFileURL(process.cwd() + '/index.html').href, { waitUntil: 'load' });
// SwiftShader starves CSS transitions of ticks; make the UI settle instantly.
await page.addStyleTag({ content: '*{transition-duration:0s!important;animation-duration:.001s!important}' });
await page.waitForTimeout(1200);

const diag = await page.evaluate(() => {
  const c = document.getElementById('gl');
  const gl = window.app && window.app.renderer && window.app.renderer.gl;
  return {
    booted: !!window.app,
    fallback: getComputedStyle(document.getElementById('fallback')).display,
    tris: document.getElementById('stat-tris').textContent,
    res: document.getElementById('stat-res').textContent,
    glError: gl ? gl.getError() : 'no gl',
    hasFloat: gl ? window.app.renderer.hasFloat : null,
    samples: gl ? window.app.renderer.samples : null,
    size: [c.width, c.height],
    callouts: document.querySelectorAll('.callout').length,
  };
});
console.log('DIAG', JSON.stringify(diag, null, 2));

/* SwiftShader runs at a few frames a second, so the camera flights (which are
   driven by dt) would still be in the air when we shoot. app.snap() lands them. */
const shot = async (name, ms = 500) => {
  await page.waitForTimeout(ms);
  await page.evaluate(() => window.app.snap());
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
  console.log('shot', name);
};

await shot('01-overview', 300);

// Feature 1 → context, then macro.
await page.keyboard.press('1');
await shot('02-die-context');
await page.click('#btn-stage');
await shot('03-die-macro');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

// Dark matter cache (die lifts away).
await page.keyboard.press('2');
await shot('04-cache');
await page.click('#btn-stage');
await shot('05-cache-macro');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

await page.keyboard.press('3');
await page.click('#btn-stage');
await shot('06-hbm-macro');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

await page.keyboard.press('4');
await page.click('#btn-stage');
await shot('07-optics-macro');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

await page.keyboard.press('5');
await page.click('#btn-stage');
await shot('08-vapour-macro');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

await page.keyboard.press('6');
await shot('09-power');
await page.keyboard.press('Escape');

await page.keyboard.press('7');
await page.click('#btn-stage');
await shot('10-sched-macro');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

await page.keyboard.press('8');
await page.click('#btn-stage');
await shot('11-trust-macro');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

// Exploded view.
await page.keyboard.press('x');
await shot('12-exploded');
await page.keyboard.press('x');

// Underside.
await page.evaluate(() => { window.app.goal.pitch = -0.3; window.app.tween = null; window.app.autoRotate = false; });
await shot('13-underside');

// Mobile layout.
await page.setViewportSize({ width: 430, height: 860 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/14-mobile.png`, timeout: 120000 });

const fps = await page.evaluate(() => window.app.fps);
console.log('FPS (swiftshader, expect single digits):', fps);
console.log('--- console ---');
console.log(logs.length ? logs.join('\n') : '(clean)');
await browser.close();
