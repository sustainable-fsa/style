#!/usr/bin/env node
/* ============================================================================
   sustainable-fsa/style · tools/check-contrast.mjs
   WCAG contrast gate over tokens/tokens.json, for BOTH themes (CI; run locally
   before every release).

     node tools/check-contrast.mjs [rootDir]

   `rootDir` defaults to the repo this file lives in; it exists so the gate can
   be pointed at a THROWAWAY COPY carrying a seeded violation.

   THE CONTRACT — these are the ratios the SHIPPED token values actually
   achieve (theme/sfsa-theme.css §1 prints the measured matrix), so they are
   enforced as minimums rather than aspirations. Weakening a number here is a
   design decision that belongs in a PR description, not a quiet edit:

     --text-primary / --text-secondary / --text-muted   ≥ 4.5 on deep, surface
                                                          AND raised
     --text-dim                                         ≥ 4.5 on deep, surface
     --accent-line                                      ≥ 4.5 on all three —
                                                          it is the line/icon
                                                          role AND the prose-
                                                          link color, so it is
                                                          held to text grade
     --text-on-accent                                   ≥ 4.5 on --accent and
                                                          on --accent-dk (both
                                                          are fills that carry
                                                          it: seg-btn pressed,
                                                          .sfsa-btn-info hover)
     --ctrl-border                                      ≥ 3.0 on deep, surface
                                                          (WCAG 1.4.11, non-
                                                          text contrast)
     --ochre-dark                                       ≥ 4.5 on deep, surface
                                                          (panel titles, info-
                                                          section eyebrows)
     --sage-dark                                        ≥ 4.5 on deep, surface
                                                          (the text-grade sage;
                                                          plain --sage is
                                                          line/graphic grade
                                                          and is NOT checked as
                                                          text — see §5 of the
                                                          theme CSS)

   Also asserts that the MEASURED matrix documented in tokens.json's `contrast`
   block still matches computation to 2 dp. Those numbers are quoted in the
   theme CSS, in HOUSE-STYLE.md and in review comments; a token edit that
   leaves them stale turns the kit's own documentation into a lie.

   Only 6-digit hex tokens participate — rgba() and gradients are out of scope
   (a translucent surface has no fixed ratio, which is why --glass never
   carries text in this kit).

   Ported from mt-climate-office/mco-web-style tools/check-contrast.mjs (MIT).
   Deltas: '--'-stripped JSON keys; this fleet's matrix (accent-line at text
   grade, both accent fills, ochre/sage, no dark theme); the matrix is always
   printed, not just on failure; the documented-ratio cross-check and the argv
   root are new.

   Zero dependencies. Exit 0 = clean, exit 1 = one or more failures.
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));
const json = JSON.parse(readFileSync(join(root, 'tokens/tokens.json'), 'utf8'));

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Relative luminance, sRGB, WCAG 2.x. */
function luminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* [foreground, background, minimum]. Keys are tokens.json keys (no '--'). */
const SURFACES = ['bg-deep', 'bg-surface', 'bg-raised'];
const MATRIX = [];
for (const fg of ['text-primary', 'text-secondary', 'text-muted']) {
  for (const bg of SURFACES) MATRIX.push([fg, bg, 4.5]);
}
for (const bg of SURFACES) MATRIX.push(['accent-line', bg, 4.5]);
for (const bg of ['bg-deep', 'bg-surface']) {
  MATRIX.push(['text-dim', bg, 4.5]);
  MATRIX.push(['ochre-dark', bg, 4.5]);
  MATRIX.push(['sage-dark', bg, 4.5]);
  MATRIX.push(['ctrl-border', bg, 3.0]);   // 1.4.11, non-text
}
MATRIX.push(['text-on-accent', 'accent', 4.5]);
MATRIX.push(['text-on-accent', 'accent-dk', 4.5]);

const errors = [];
const lines = [];
let checked = 0;
// tokens.json carries a '$note' key alongside the theme blocks — skip it here
// and in the count, or the gate reports one more theme than the kit ships.
const themeNames = Object.keys(json.themes).filter((k) => !k.startsWith('$'));

for (const [themeName, tokens] of Object.entries(json.themes)) {
  if (themeName.startsWith('$')) continue;
  lines.push(`\n  ${themeName}`);
  lines.push('    ratio   min   fg                on                        ');
  for (const [fgKey, bgKey, min] of MATRIX) {
    const fg = tokens[fgKey];
    const bg = tokens[bgKey];
    if (!HEX.test(fg || '') || !HEX.test(bg || '')) {
      errors.push(`${themeName}: ${fgKey} (${fg}) or ${bgKey} (${bg}) is missing or not a 6-digit hex`);
      lines.push(`    ????    ${min.toFixed(1)}   ${fgKey} on ${bgKey}  — NOT A HEX`);
      continue;
    }
    const r = ratio(fg, bg);
    checked++;
    const ok = r >= min;
    if (!ok) {
      errors.push(`${themeName}: ${fgKey} (${fg}) on ${bgKey} (${bg}) = ${r.toFixed(2)}:1, needs ≥ ${min.toFixed(1)}:1`);
    }
    lines.push(`    ${r.toFixed(2).padStart(5)}  ${min.toFixed(1)}   `
      + `${(fgKey + ' ' + fg).padEnd(26)}${(bgKey + ' ' + bg).padEnd(24)}${ok ? 'PASS' : 'FAIL'}`);
  }
}

/* ── The documented matrix in tokens.json must still be true ─────────────── */
if (json.contrast) {
  for (const [themeName, doc] of Object.entries(json.contrast)) {
    if (themeName.startsWith('$')) continue;
    const tokens = json.themes[themeName];
    if (!tokens) {
      errors.push(`documented contrast: theme '${themeName}' has no token block`);
      continue;
    }
    for (const [key, value] of Object.entries(doc)) {
      if (key.startsWith('$')) continue;
      if (key === 'text-on-accent-vs-accent') {
        const got = Number(ratio(tokens['text-on-accent'], tokens.accent).toFixed(2));
        if (got !== Number(Number(value).toFixed(2))) {
          errors.push(`documented contrast: ${themeName}.${key} says ${value}, computes to ${got}`);
        }
        continue;
      }
      if (!Array.isArray(value)) continue;
      SURFACES.forEach((bg, i) => {
        if (!HEX.test(tokens[key] || '') || !HEX.test(tokens[bg] || '')) return;
        const got = Number(ratio(tokens[key], tokens[bg]).toFixed(2));
        const said = Number(Number(value[i]).toFixed(2));
        if (got !== said) {
          errors.push(`documented contrast: ${themeName}.${key} on ${bg} says ${said}, computes to ${got}`);
        }
      });
    }
  }
}

console.log(`check-contrast: ${checked} pairs across ${themeNames.length} themes (${themeNames.join(', ')})`
  + lines.join('\n'));

if (errors.length) {
  console.error(`\ncheck-contrast: ${errors.length} failure(s) in ${root}\n  - ` + errors.join('\n  - '));
  process.exit(1);
}
console.log('\ncheck-contrast: OK');
