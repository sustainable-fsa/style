#!/usr/bin/env node
/* ============================================================================
   sustainable-fsa/style · tools/check-frozen.mjs
   The immutability gate. NEW in this kit — mco-web-style ships SRI hashes
   instead (tools/check-sri.mjs), which this kit deliberately does not use:
   `integrity` covers an entry file, not the ES-module graph it imports
   (README § "Why no SRI"). Integrity here is same-origin delivery plus
   CI-enforced immutability, and this file is the enforcement.

     node tools/check-frozen.mjs [rootDir]

   `rootDir` defaults to the repo this file lives in; it exists so the gate can
   be pointed at a THROWAWAY COPY with a tampered byte.

   Three checks, all of them about bytes that consumers have pinned:

     1. RELEASE SNAPSHOTS — for every vX.Y.Z/MANIFEST.sha256, re-hash every
        listed file and compare. Fails on drift, on a listed file that is
        missing, and on a file present under vX.Y.Z/ that the manifest does not
        list (an unmanifested addition is an edit to a published release just
        as much as a changed byte is). Zero releases is a PASS with a note —
        the gate has to be green on the commit that introduces it.
     2. VENDORED LIBRARIES + BRAND ASSETS — every sha256 in every table in
        vendor/VENDORED.md, verified against disk. Columns are located by their
        header names ("File", "sha256"), never by scanning for hex, because the
        banner row's Notes cell deliberately quotes the DIFFERENT upstream hash
        of the unpatched file.
     3. snippets/head.html URLs — every https://sustainable-fsa.com/style/…
        URL in the canonical consumer <head> must resolve to a real path in
        this repo. A snippet that tells consumers to load a file the kit does
        not publish is a 404 in someone else's app. Before the first release is
        cut, a /vX.Y.Z/ URL is allowed to resolve to its SOURCE path (the
        snippet points at the version being prepared) — reported as a note, not
        a pass in silence. The version segment must also match KIT_VERSION in
        core/core.js, which is the pair the release checklist bumps together.

   Zero dependencies. Exit 0 = clean, exit 1 = one or more problems printed.
   ========================================================================== */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));

const errors = [];
const notes = [];
let verified = 0;

const VERSION_DIR = /^v\d+\.\d+\.\d+$/;
const MANIFEST = 'MANIFEST.sha256';
/* Finder writes .DS_Store into any directory a human opens, including a
   published one. It is gitignored and never served, so it is not an edit to
   the release — ignore it rather than turning a stray Finder visit red. */
const IGNORED_FILES = new Set(['.DS_Store']);

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && !IGNORED_FILES.has(entry.name)) out.push(full);
  }
  return out;
}

/* ── 1. Release snapshots ────────────────────────────────────────────────── */

const releases = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory() && VERSION_DIR.test(e.name))
  .map((e) => e.name)
  .sort();

for (const rel of releases) {
  const dir = join(root, rel);
  const manifestPath = join(dir, MANIFEST);
  if (!existsSync(manifestPath)) {
    errors.push(`${rel}/: no ${MANIFEST} — a release directory without a manifest is unverifiable`);
    continue;
  }

  const listed = new Map();
  const lines = readFileSync(manifestPath, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    // shasum -a 256 / sha256sum format: "<64 hex><two spaces><relative path>".
    const m = /^([0-9a-f]{64})\s{1,2}[ *]?(.+)$/.exec(line.trim());
    if (!m) {
      errors.push(`${rel}/${MANIFEST}:${i + 1}: unparsable line ${JSON.stringify(line)}`);
      return;
    }
    listed.set(m[2].replace(/^\.\//, ''), m[1]);
  });

  for (const [relPath, want] of listed) {
    const file = join(dir, relPath);
    if (!existsSync(file) || !statSync(file).isFile()) {
      errors.push(`${rel}/${relPath}: listed in the manifest but MISSING from disk`);
      continue;
    }
    const got = sha256(file);
    verified++;
    if (got !== want) {
      errors.push(`${rel}/${relPath}: DRIFTED — manifest ${want}, disk ${got}. `
        + 'A published release is immutable; ship a new patch version instead.');
    }
  }

  for (const file of walk(dir)) {
    const relPath = relative(dir, file).split(sep).join('/');
    if (relPath === MANIFEST) continue;
    if (!listed.has(relPath)) {
      errors.push(`${rel}/${relPath}: present on disk but NOT in the manifest — `
        + 'adding a file to a published release is an edit to it');
    }
  }
}

if (!releases.length) {
  notes.push('no vX.Y.Z/ release directories yet — snapshot verification skipped (this is a PASS)');
}

/* ── 2. vendor/VENDORED.md ───────────────────────────────────────────────── */

const vendoredPath = join(root, 'vendor/VENDORED.md');
if (!existsSync(vendoredPath)) {
  errors.push('vendor/VENDORED.md is missing — the vendored-asset manifest is not optional');
} else {
  const md = readFileSync(vendoredPath, 'utf8');
  const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const lines = md.split('\n');
  let cols = null;
  let rows = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) { cols = null; continue; }
    const c = cells(line);
    // A header row is the one followed by the |---|---| separator.
    if (cols === null) {
      const next = lines[i + 1] || '';
      if (/^\s*\|[\s:|-]+\|\s*$/.test(next)) {
        const file = c.findIndex((h) => h.toLowerCase() === 'file');
        const hash = c.findIndex((h) => h.toLowerCase() === 'sha256');
        cols = (file >= 0 && hash >= 0) ? { file, hash } : { file: -1, hash: -1 };
      }
      continue;
    }
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue;   // the separator itself
    if (cols.file < 0) continue;                       // a table with no hashes

    const rawPath = (c[cols.file] || '').replace(/`/g, '').trim();
    const want = (c[cols.hash] || '').replace(/`/g, '').trim();
    if (!rawPath || !/^[0-9a-f]{64}$/.test(want)) {
      errors.push(`vendor/VENDORED.md: row for ${JSON.stringify(rawPath || c[0])} has no usable File/sha256 cell`);
      continue;
    }
    const file = join(root, rawPath);
    if (!existsSync(file)) {
      errors.push(`vendor/VENDORED.md: ${rawPath} is listed but MISSING from disk`);
      continue;
    }
    const got = sha256(file);
    verified++;
    rows++;
    if (got !== want) {
      errors.push(`vendor/VENDORED.md: ${rawPath} DRIFTED — manifest ${want}, disk ${got}. `
        + 'Vendored directories are immutable; an upgrade is a NEW sibling directory.');
    }
  }
  if (!rows) errors.push('vendor/VENDORED.md: no File/sha256 rows found — has the table shape changed?');
}

/* ── 3. snippets/head.html kit URLs ──────────────────────────────────────── */

const KIT_PREFIX = 'https://sustainable-fsa.com/style/';
const headPath = join(root, 'snippets/head.html');
if (!existsSync(headPath)) {
  errors.push('snippets/head.html is missing — the canonical consumer <head> is part of the published surface');
} else {
  const head = readFileSync(headPath, 'utf8');
  const corePath = join(root, 'core/core.js');
  const kitVersion = existsSync(corePath)
    ? (/KIT_VERSION\s*=\s*'([^']+)'/.exec(readFileSync(corePath, 'utf8')) || [])[1]
    : null;

  const urls = [...head.matchAll(/https:\/\/sustainable-fsa\.com\/style\/([^\s"'<>)]+)/g)]
    .map((m) => m[1].replace(/[.,]$/, ''));
  const seen = new Set();
  const versionsReported = new Set();
  for (const rawPath of urls) {
    if (seen.has(rawPath)) continue;
    seen.add(rawPath);
    if (rawPath.includes('…')) continue;              // documented placeholder
    const segs = rawPath.split('/');
    if (existsSync(join(root, rawPath))) { verified++; continue; }
    if (VERSION_DIR.test(segs[0])) {
      const source = segs.slice(1).join('/');
      if (existsSync(join(root, source))) {
        notes.push(`snippets/head.html points at ${KIT_PREFIX}${rawPath}; that release is not cut yet, `
          + `and it resolves to the source path ${source} — run tools/release.sh ${segs[0].slice(1)} before publishing`);
        if (kitVersion && segs[0] !== `v${kitVersion}` && !versionsReported.has(segs[0])) {
          versionsReported.add(segs[0]);   // once per version, not once per URL
          errors.push(`snippets/head.html uses ${segs[0]} but core/core.js KIT_VERSION is '${kitVersion}' — `
            + 'the release checklist bumps both in the same commit');
        }
        continue;
      }
    }
    errors.push(`snippets/head.html references ${KIT_PREFIX}${rawPath}, which does not exist in this repo`);
  }
}

/* ── Report ──────────────────────────────────────────────────────────────── */

for (const n of notes) console.log(`check-frozen: note — ${n}`);

if (errors.length) {
  console.error(`check-frozen: ${errors.length} problem(s) in ${root}\n  - ` + errors.join('\n  - '));
  process.exit(1);
}
console.log(`check-frozen: OK — ${releases.length} release snapshot(s), ${verified} hash/path checks`);
