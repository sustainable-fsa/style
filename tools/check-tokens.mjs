#!/usr/bin/env node
/* ============================================================================
   sustainable-fsa/style · tools/check-tokens.mjs
   Token-parity and JSON-sync gate (CI; run locally before every release).

     node tools/check-tokens.mjs [rootDir]

   `rootDir` defaults to the repo this file lives in. It exists so the gate can
   be pointed at a THROWAWAY COPY with a seeded violation, which is the only
   honest way to know the gate still bites.

   Asserts, against theme/sfsa-theme.css + tokens/tokens.json + core/core.js:

     1. THEME PARITY — every themed token defined on `:root` is also defined in
        `[data-theme="high-contrast"]`, and vice versa. A token added to one
        block and not the other silently inherits the other theme's value,
        which is exactly the failure this kit's AGENTS.md §4 exists to prevent.
        The theme CSS documents a parity-EXEMPT set (the theme-independent
        tokens: type, radii, transition, --sheet-h). That list is honored here,
        and it is cross-checked against tokens.json's `themeIndependent` block
        in both directions, so the exemption cannot drift either.
     2. JSON SYNC — tokens/tokens.json mirrors the CSS exactly: every token in
        both directions, values byte-equal after trimming. Keys in the JSON are
        the custom-property names with the leading '--' stripped.
     3. REQUIRED TOKENS — the map/selection/brand/text set every consumer and
        every kit module depends on is present (in BOTH themes for themed
        tokens, in the exempt set for the theme-independent ones).
     4. COMPACT BREAKPOINT — the compact media-query string is character-for-
        character identical in theme/sfsa-theme.css (the §6 prose comment AND
        the real @media rule), tokens/tokens.json, and core/core.js's
        viewport.COMPACT_MQ. Three authored copies, one string.

   Ported from mt-climate-office/mco-web-style tools/check-tokens.mjs (MIT).
   Deltas: two themes instead of three with light on bare :root; an explicit
   parity-exempt set (MCO keeps radius/transition in :root and simply ignores
   them); '--'-stripped JSON keys; byte-equal rather than whitespace-collapsed
   value comparison; the required-token list is this fleet's; the compact-MQ
   three-way check and the argv root are new.

   Zero dependencies. Exit 0 = clean, exit 1 = one or more problems printed.
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));

const rawCss = readFileSync(join(root, 'theme/sfsa-theme.css'), 'utf8');
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');   // strip comments
const json = JSON.parse(readFileSync(join(root, 'tokens/tokens.json'), 'utf8'));
const coreJs = readFileSync(join(root, 'core/core.js'), 'utf8');

/* Tokens defined once on :root with no theme variant — the theme CSS §1 block
   comment ("Theme-independent tokens … exempt from the both-blocks parity
   rule") is the source of this list, and tokens.json.themeIndependent must
   agree with it exactly (checked below). */
const EXEMPT = [
  '--font-ui', '--font-mono', '--heading-weight',
  '--radius-sm', '--radius-md', '--radius-lg',
  '--transition', '--sheet-h',
];

/* Themed tokens every consumer and kit module depends on. A rename that
   forgets one of these is a MAJOR break, not a tidy-up. */
const REQUIRED_THEMED = [
  // surfaces + text
  '--bg-deep', '--bg-surface', '--bg-raised', '--border',
  '--text-primary', '--text-secondary', '--text-muted', '--text-dim',
  '--ctrl-border',
  // accent family (--accent is fill-only; --accent-line is the line/text role)
  '--accent', '--accent-light', '--accent-dk', '--accent-line',
  '--accent-hover', '--text-on-accent',
  // map + selection (county/county.js and map/map.js resolve these by name)
  '--map-bg', '--map-state-line', '--map-county-line', '--no-data',
  '--selection-ring', '--selection-casing',
  // brand secondaries
  '--sage', '--sage-dark', '--ochre-dark',
];
const REQUIRED_EXEMPT = ['--heading-weight', '--sheet-h'];

const errors = [];

/* ── CSS parsing ──────────────────────────────────────────────────────────
   `[^{}]+` can never cross a brace, so an @media prelude cannot match as a
   block — only leaf rule blocks do, and none of the non-target ones declare
   tokens. */
function blocks(selector) {
  const out = {};
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    if (m[1].trim() !== selector) continue;
    const pre = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let p;
    while ((p = pre.exec(m[2])) !== null) out[p[1]] = p[2].trim();
  }
  return out;
}

const rootAll = blocks(':root');          // both :root blocks, merged
const hc = blocks('[data-theme="high-contrast"]');

const themed = {};
const exempt = {};
const zIndex = {};
for (const [k, v] of Object.entries(rootAll)) {
  if (k.startsWith('--z-')) zIndex[k] = v;
  else if (EXEMPT.includes(k)) exempt[k] = v;
  else themed[k] = v;
}

/* ── 1. Theme parity ─────────────────────────────────────────────────────── */
const themedKeys = Object.keys(themed).sort();
const hcKeys = Object.keys(hc).sort();
for (const k of themedKeys) {
  if (!(k in hc)) errors.push(`parity: ${k} is themed on :root but missing from [data-theme="high-contrast"]`);
}
for (const k of hcKeys) {
  if (EXEMPT.includes(k)) {
    errors.push(`parity: ${k} is declared theme-independent but is overridden in [data-theme="high-contrast"] — pick one`);
  } else if (!(k in themed)) {
    errors.push(`parity: ${k} is in [data-theme="high-contrast"] but has no :root (light) definition`);
  }
}
for (const k of EXEMPT) {
  if (!(k in exempt)) errors.push(`parity: exempt token ${k} is not defined on :root at all`);
}

/* ── 2. tokens.json sync (both directions, byte-equal values) ────────────── */
const isNote = (k) => k.startsWith('$');

/* JSON keys are the custom-property names with a prefix stripped: '--' for the
   token blocks, '--z-' for the z-index ladder ('--z-toast' → 'toast'). */
function compare(label, cssMap, jsonMap, prefix = '--') {
  const j = {};
  for (const [k, v] of Object.entries(jsonMap || {})) {
    if (!isNote(k)) j[k] = String(v);
  }
  for (const [k, v] of Object.entries(cssMap)) {
    const key = k.slice(prefix.length);
    if (!(key in j)) errors.push(`${label}: ${k} is in the CSS but not in tokens.json`);
    else if (j[key] !== v) errors.push(`${label}: ${k} differs — CSS '${v}' vs tokens.json '${j[key]}'`);
  }
  for (const key of Object.keys(j)) {
    if (!(`${prefix}${key}` in cssMap)) errors.push(`${label}: '${key}' is in tokens.json but not in the CSS`);
  }
}

compare('light', themed, json.themes && json.themes.light);
compare('highContrast', hc, json.themes && json.themes.highContrast);
compare('themeIndependent', exempt, json.themeIndependent);
compare('zIndex', zIndex, json.zIndex, '--z-');

/* ── 3. Required tokens ──────────────────────────────────────────────────── */
for (const k of REQUIRED_THEMED) {
  if (!(k in themed)) errors.push(`required token ${k} missing from the light theme (:root)`);
  if (!(k in hc)) errors.push(`required token ${k} missing from the high-contrast theme`);
}
for (const k of REQUIRED_EXEMPT) {
  if (!(k in exempt)) errors.push(`required theme-independent token ${k} missing from :root`);
}

/* ── 4. Compact media query: CSS comment == CSS @media == JSON == core.js ── */
const MQ_FROM_JSON = json.breakpoints && json.breakpoints.compact;
const coreMatch = /COMPACT_MQ\s*=\s*'([^']+)'/.exec(coreJs);
const MQ_FROM_CORE = coreMatch && coreMatch[1];

if (!MQ_FROM_JSON) errors.push('compact MQ: tokens.json has no breakpoints.compact');
if (!MQ_FROM_CORE) errors.push('compact MQ: core/core.js has no COMPACT_MQ = \'…\' assignment');

if (MQ_FROM_JSON && MQ_FROM_CORE) {
  if (MQ_FROM_JSON !== MQ_FROM_CORE) {
    errors.push(`compact MQ: tokens.json '${MQ_FROM_JSON}' != core/core.js '${MQ_FROM_CORE}'`);
  }
  // The real @media rule, in the comment-stripped CSS.
  const media = [...css.matchAll(/@media([^{]+)\{/g)].map((m) => m[1].trim());
  if (!media.includes(MQ_FROM_CORE)) {
    errors.push(`compact MQ: no @media rule in theme/sfsa-theme.css reads exactly '${MQ_FROM_CORE}' `
      + `(found: ${media.map((s) => `'${s}'`).join(', ')})`);
  }
  // …and the §6 prose comment, which lives in the RAW css (comments stripped
  // above). Two occurrences = the comment plus the rule.
  const occurrences = rawCss.split(MQ_FROM_CORE).length - 1;
  if (occurrences < 2) {
    errors.push(`compact MQ: '${MQ_FROM_CORE}' appears ${occurrences}× in theme/sfsa-theme.css — `
      + 'the §6 breakpoint comment and the @media rule must both spell it out');
  }
}

/* ── Report ──────────────────────────────────────────────────────────────── */
if (errors.length) {
  console.error(`check-tokens: ${errors.length} problem(s) in ${root}\n  - ` + errors.join('\n  - '));
  process.exit(1);
}
console.log(`check-tokens: OK — ${themedKeys.length} themed tokens × 2 themes, `
  + `${Object.keys(exempt).length} theme-independent, ${Object.keys(zIndex).length} z-index tiers, `
  + `compact MQ '${MQ_FROM_CORE}' in sync across CSS, tokens.json and core.js`);
