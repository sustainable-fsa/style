#!/usr/bin/env node
/* ============================================================================
   sustainable-fsa/style · tools/a11y-audit.mjs
   Axe audit of demo/ in BOTH themes at TWO viewports. Serious/critical
   violations fail the build (AGENTS.md §6: "the axe workflow failing on
   serious/critical is a hard stop, not a flake to re-run").

     node tools/a11y-audit.mjs [rootDir]

   Requires tooling installed EPHEMERALLY — never kit dependencies, and
   package.json is gitignored on purpose (AGENTS.md §1):

     npm init -y && npm install --no-save playwright @axe-core/playwright
     npx playwright install --with-deps chromium

   WHY THE REPO ROOT IS SERVED, not demo/: the demo is an in-repo development
   page and loads the kit by RELATIVE path (../theme/…, ../core/core.js), the
   same geometry a release snapshot has. Serving demo/ alone would 404 every
   one of them and the audit would pass over a blank page.

   WHY THE NARROW PASS IS NOT OPTIONAL: the responsive ladder sheds control
   labels (1400), collapses the brand lockup (750) and collapses search (640),
   and every shed is a chance to strip an accessible name. The theme CSS
   §6 comment records the MCO bug this exists to catch — `display:none` on
   .btn-label left buttons nameless below 1400px, invisible to a desktop-only
   audit.

   WHY demoReady IS REPORTED BUT NOT GATED: the live county map fetches
   boundary geometry from sustainable-fsa.com and needs a working WebGL
   context. Both can be absent on a CI runner, and neither is an accessibility
   fact — the demo degrades to a visible error note and the rest of the page
   still has to be clean. The flag is printed so a silent map regression is
   visible in the log.

   Ported from mt-climate-office/mco-web-style tools/a11y-audit.mjs (MIT).
   Deltas: two themes, not three; the theme is seeded through localStorage
   ('sfsa-theme', read by the anti-flash boot) rather than a ?theme= param, so
   the audit exercises the same path a returning user takes; swiftshader launch
   flags so the map really renders on a GPU-less runner; a deliberate combobox
   probe (below); demoReady reporting; moderate/minor advisories are listed
   rather than counted; and an argv root.
   ========================================================================== */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));

const PAGE = '/demo/';
const THEMES = ['light', 'high-contrast'];
const VIEWPORTS = [
  { name: 'wide', width: 1440, height: 900 },
  { name: 'narrow', width: 390, height: 800 },
];
/** Long enough for the font swap, the legends, and the map's first frames.
    Not a render gate — see the demoReady note above. */
const SETTLE_MS = 3000;

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
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    // Read BEFORE writing headers: the other order commits a 200 and only then
    // discovers the file is missing, so the catch tries to send 404 headers on
    // an already-sent response and the harness dies with ERR_HTTP_HEADERS_SENT.
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'access-control-allow-origin': '*',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  // A GitHub runner has no GPU. Without a software rasterizer MapLibre fails to
  // get a WebGL context, the demo shows its error note, and the map half of the
  // page is never audited at all. These are the swiftshader-adjacent flags that
  // give headless chromium a real (if slow) GL context.
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
});

const rows = [];
let failed = false;

for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const label = `${theme} · ${vp.name} ${vp.width}×${vp.height}`;
    // @axe-core/playwright requires a page created from an explicit context.
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    // The theme goes in through localStorage, which is where the anti-flash
    // boot looks second (after ?theme=). Seeding it here audits the returning
    // -visitor path, and it runs before first paint, so nothing flashes.
    await context.addInitScript((t) => {
      try { localStorage.setItem('sfsa-theme', t); } catch (e) { /* ignore */ }
    }, theme);
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    await page.goto(base + PAGE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(SETTLE_MS);

    const ready = await page.evaluate(() => document.documentElement.dataset.demoReady === '1');
    const appliedTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    if (appliedTheme !== theme) {
      failed = true;
      console.error(`[${label}] theme did not apply: <html data-theme="${appliedTheme}">`);
    }

    /* DELIBERATE PROBE (delta from the MCO original, which never interacts).
       ui/search.js's listbox only exists once a query has matched something,
       and its flyout carries the option rows, the aria-activedescendant
       wiring, and the role="presentation" overflow row. Auditing the demo with
       the dropdown shut audits an empty <ul> and calls it coverage. Failures
       here are non-fatal — the probe is extra reach, not the gate.

       KNOWN GAP, deliberately not probed: the ZERO-RESULTS state. When a query
       matches nothing, ui/search.js renders a listbox whose only child is
       <li role="presentation" class="option-empty">No matches</li>, and axe
       flags that as aria-required-children (CRITICAL) — a listbox with no
       option children at all. A query that DOES match is clean, because the
       presentation row then sits alongside real options. The fix belongs in
       ui/search.js (role="option" aria-disabled="true" on the info rows), not
       here; when it lands, change the fill below to a query that matches
       nothing ('zzzzz') so this gate covers that state too. */
    let probe = 'skipped';
    try {
      const input = page.locator('#demo-search');
      if (!(await input.isVisible())) {
        await page.locator('#btn-search-toggle').click({ timeout: 2000 });
      }
      await input.fill('a', { timeout: 2000 });
      await page.waitForSelector('#demo-results [role="option"]', { timeout: 2000 });
      probe = 'open';
    } catch (err) {
      probe = 'unavailable';
    }

    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const meh = results.violations.filter((v) => v.impact !== 'serious' && v.impact !== 'critical');

    if (bad.length) {
      failed = true;
      console.error(`\n[${label}] ${bad.length} SERIOUS/CRITICAL violation(s):`);
      for (const v of bad) {
        console.error(`  ${v.id} (${v.impact}): ${v.help}`);
        console.error(`    ${v.helpUrl}`);
        for (const n of v.nodes.slice(0, 5)) {
          console.error(`    → ${n.target.join(' ')}`);
          if (n.failureSummary) console.error(`      ${n.failureSummary.split('\n').join(' ')}`);
        }
        if (v.nodes.length > 5) console.error(`    → …and ${v.nodes.length - 5} more node(s)`);
      }
    } else {
      console.log(`\n[${label}] OK — 0 serious/critical`);
    }
    for (const v of meh) {
      console.log(`  advisory ${v.id} (${v.impact}): ${v.help} [${v.nodes.length} node(s)]`);
      for (const n of v.nodes.slice(0, 3)) console.log(`    → ${n.target.join(' ')}`);
    }
    if (consoleErrors.length) {
      // Not a gate here (consumer-verify.mjs is where console-clean IS a gate),
      // but a console error on the kit's own demo is worth reading.
      console.log(`  console: ${consoleErrors.length} error(s) — ${consoleErrors[0]}`);
    }

    rows.push({
      label, serious: bad.length, advisories: meh.length,
      demoReady: ready, combobox: probe, consoleErrors: consoleErrors.length,
    });
    await context.close();
  }
}

await browser.close();
server.close();

console.log('\n  theme · viewport                serious/critical  advisories  demoReady  combobox');
for (const r of rows) {
  console.log(`  ${r.label.padEnd(30)}${String(r.serious).padStart(10)}`
    + `${String(r.advisories).padStart(14)}  ${String(r.demoReady).padEnd(9)}  ${r.combobox}`);
}
console.log(rows.some((r) => r.demoReady)
  ? '\n  demoReady seen: the live county map rendered and recolored at least once.'
  : '\n  demoReady NEVER set: the map did not render (no WebGL, or the boundary '
    + 'fetch failed). The demo degrades on purpose — the rest of the page was still audited.');

process.exit(failed ? 1 : 0);
