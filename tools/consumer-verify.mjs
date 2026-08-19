#!/usr/bin/env node
/* ============================================================================
   sustainable-fsa/style · tools/consumer-verify.mjs
   The verification skeleton a CONSUMER copies (MIGRATING.md § Verification
   recipe). It does not verify this kit — it verifies an app that has adopted
   the kit.

   COPY this file into the app repo being migrated, keep it UNTRACKED, fill in
   CONFIG, write the app assertions, and run it before the deploy gate. It is a
   starting point, not a complete gate: the URL-param matrix and any
   page-driving automation are yours to add.

   Ephemeral tooling, in the APP repo (gitignore it — the kit's zero-dependency
   rule is inherited by consumers):

     npm init -y && npm install --no-save playwright @axe-core/playwright
     npx playwright install chromium
     node consumer-verify.mjs

   What it does out of the box, per theme:
     · serves the app from a local static server (so relative and root-absolute
       paths resolve the way they do in production)
     · waits for RENDER EVIDENCE — a predicate the app can prove, never
       networkidle, which a polling app never reaches and a map app reaches
       long before it has drawn anything
     · fails on ANY console error. With a meta CSP live this is the check that
       catches a stale anti-flash hash or a directive that forgot an origin —
       the failure mode is otherwise invisible, because the page still renders,
       just with the flash back and a helper silently dead.
     · runs axe and fails on serious/critical
     · screenshots each theme and the compact viewport into verify-out/

   Ported from mt-climate-office/mco-web-style tools/consumer-verify.mjs (MIT).
   Deltas: two themes; the theme is seeded via localStorage AND ?theme= so both
   precedence paths are exercised; app assertions are a declared array in
   CONFIG rather than free-form TODO code; screenshot directory is created;
   render evidence and settle are separated per-check.
   ========================================================================== */
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

/* ══════════════════════════════════════════════════════════════════════════
   CONFIG — EDIT EVERYTHING IN THIS BLOCK PER APP.
   ══════════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  /** Directory to serve. The repo root, unless Pages publishes a subdirectory. */
  root: process.cwd(),

  /** Page under test, as a server path. '/docs/' when Pages publishes /docs. */
  pagePath: '/',

  /** The kit ships exactly these two. Don't invent a third here. */
  themes: ['light', 'high-contrast'],

  /** Wide + compact. The compact pass is where the responsive ladder's label
      sheds, the collapsed search, and the bottom-sheet card are exercised. */
  viewports: [
    { name: 'wide', width: 1440, height: 900 },
    { name: 'compact', width: 390, height: 800 },
  ],

  /** Seeded before load, so first-visit modals and stale prefs don't skew the
      run. Keys must be app-prefixed ('sfsa-<app>-*') — everything except
      'sfsa-theme', which is deliberately shared org-wide. */
  initLocalStorage: {
    'sfsa-<app>-seen-intro': '1',
  },

  /** RENDER EVIDENCE — a predicate evaluated IN THE PAGE; the app counts as
      rendered when it returns true. NEVER use networkidle.

      Keep it a FUNCTION, not a string: Playwright eval()s a string predicate
      in-page, and the meta CSP this playbook adds has no 'unsafe-eval', so a
      string fails with "Evaluating a string as JavaScript violates the
      following Content Security Policy directive".

      Good evidence is something the app only does after a real render — the
      demo in this kit stamps `data-demo-ready`; a county app might count the
      rows of its sr-only summary table, or read a paint state off its own
      module. */
  renderEvidence: () => document.documentElement.dataset.appReady === '1',

  /** Extra settle after the evidence fires: label placement, late fonts, the
      map's final frames. */
  settleMs: 2500,

  /** Screenshots land here. Add it to .gitignore. */
  screenshotDir: './verify-out',

  /* ────────────────────────────────────────────────────────────────────────
     APP ASSERTIONS — THIS IS THE PART EACH CONSUMER FILLS IN.
     Everything above is boilerplate; nothing above knows what your app is for.
     Each entry runs once per theme, against a loaded page.

       label — what fails in the log
       check — async (page) => boolean | { ok, detail }

     Assert AT MINIMUM (worked examples in the migrations listed in
     CONSUMERS.md):
       · every URL param honored on load AND re-emitted after interaction,
         with defaults elided so an all-defaults view has a clean URL
       · a deep link (county + year) suppresses the first-visit modal
       · ?kbd=off disables single-character shortcuts and survives pushState
       · county ids stay 5-CHARACTER STRINGS end to end — no parseInt, no
         Number(), no lost leading zero (AGENTS.md §10). Check a leading-zero
         county specifically: '01001', not '30063'.
       · the boundary vintage follows the program year (dd17 ≤ 2014,
         dd22 ≥ 2015) and never mixes within a year
       · the sr-only summary twin reflects the current render
       · side-by-side screenshots against the LIVE production page: list the
         expected deltas, and treat anything else as a regression
     ──────────────────────────────────────────────────────────────────────── */
  appAsserts: [
    // {
    //   label: 'leading-zero county id survives a deep link',
    //   check: async (page) => {
    //     await page.goto(page.url().split('?')[0] + '?county=01001');
    //     return await page.evaluate(() => document.getElementById('card-title')
    //       ?.textContent?.includes('Autauga'));
    //   },
    // },
  ],
};
/* ══════════════════════════════════════════════════════════════════════════ */

const ROOT = resolve(CONFIG.root);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.topojson': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    // Read BEFORE writing headers — see the note in tools/a11y-audit.mjs. Any
    // request that 404s BY DESIGN (an API that isn't running locally, a probe
    // for an optional asset) trips the other order, and that is exactly the
    // degradation a verify run wants to exercise.
    const body = await readFile(f);
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}${CONFIG.pagePath}`;

await mkdir(CONFIG.screenshotDir, { recursive: true });

const browser = await chromium.launch();
let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ' — ' + detail}`);
  if (!ok) failures++;
};

async function open({ query = '', viewport = CONFIG.viewports[0], theme } = {}) {
  const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  await ctx.addInitScript((kv) => {
    for (const [k, v] of Object.entries(kv)) {
      try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ }
    }
  }, theme ? { ...CONFIG.initLocalStorage, 'sfsa-theme': theme } : CONFIG.initLocalStorage);

  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(base + query, { waitUntil: 'load', timeout: 45000 });
  try {
    await page.waitForFunction(CONFIG.renderEvidence, null, { timeout: 30000 });
  } catch (err) {
    errors.push('render evidence never fired: ' + String(err).split('\n')[0]);
  }
  await page.waitForTimeout(CONFIG.settleMs);
  return { ctx, page, errors };
}

/* ── Per theme: console-clean, axe, screenshot, app assertions ───────────── */
for (const theme of CONFIG.themes) {
  // ?theme= AND localStorage: the anti-flash boot's first two precedence tiers.
  const { ctx, page, errors } = await open({ query: `?theme=${theme}`, theme });

  check(`[${theme}] console clean`, errors.length === 0, errors.slice(0, 3).join(' | '));
  check(`[${theme}] theme applied`,
    (await page.evaluate(() => document.documentElement.dataset.theme)) === theme,
    'data-theme on <html> is ' + await page.evaluate(() => document.documentElement.dataset.theme));

  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  check(`[${theme}] axe 0 serious/critical`, bad.length === 0,
    bad.map((v) => `${v.id}:${v.nodes[0]?.target.join(' ')}`).join(' | '));

  await page.screenshot({ path: join(CONFIG.screenshotDir, `${theme}.png`), fullPage: false });

  /* ── APP ASSERTIONS (CONFIG.appAsserts) ───────────────────────────────── */
  for (const assertion of CONFIG.appAsserts) {
    try {
      const out = await assertion.check(page);
      const ok = (out && typeof out === 'object') ? !!out.ok : !!out;
      const detail = (out && typeof out === 'object') ? (out.detail || '') : '';
      check(`[${theme}] ${assertion.label}`, ok, detail);
    } catch (err) {
      check(`[${theme}] ${assertion.label}`, false, String(err).split('\n')[0]);
    }
  }

  await ctx.close();
}

/* ── Compact viewport ────────────────────────────────────────────────────── */
for (const vp of CONFIG.viewports.slice(1)) {
  const { ctx, page, errors } = await open({
    viewport: vp, theme: CONFIG.themes[0], query: `?theme=${CONFIG.themes[0]}`,
  });
  check(`[${vp.name} ${vp.width}px] console clean`, errors.length === 0, errors.slice(0, 3).join(' | '));
  const r = await new AxeBuilder({ page }).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  check(`[${vp.name} ${vp.width}px] axe 0 serious/critical`, bad.length === 0,
    bad.map((v) => `${v.id}:${v.nodes[0]?.target.join(' ')}`).join(' | '));
  await page.screenshot({ path: join(CONFIG.screenshotDir, `${vp.name}.png`) });
  await ctx.close();
}

if (!CONFIG.appAsserts.length) {
  console.log('\n! CONFIG.appAsserts is empty. The boilerplate above proves the page loads '
    + 'clean; it proves nothing about what your app is FOR. Fill it in before treating '
    + 'this run as a gate.');
}

await browser.close();
server.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
