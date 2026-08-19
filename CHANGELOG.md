# Changelog

All notable changes to the Sustainable FSA style kit. Format follows
[Keep a Changelog](https://keepachangelog.com); versioning follows the SemVer
policy in [README.md](README.md) — **PATCH** = fix with no observable-contract
change · **MINOR** = additive · **MAJOR** = any rename, removal, or default
change.

Releases are immutable directories: `vX.Y.Z/` is a byte-copy snapshot with a
`MANIFEST.sha256`, re-verified by CI on every run. A bad release gets a new
patch version, never an edit.

## [Unreleased] — targeting 0.1.0

First release. Built alongside `fsa-normal-grazing-period`, which is the pilot
consumer and the reference implementation; nothing here entered the kit that the
pilot did not first prove.

### Added

- **`theme/sfsa-theme.css`** — design tokens in **two** themes, **light
  (default)** and **high-contrast**, on the project palette (terracotta
  `#B7410E` fill-only with `--accent-line` `#8f320a` for lines, icons, and text;
  sage and ochre tokenized at the grade each is safe at; cream ground).
  Z-index ladder, reset and a11y utilities (`.sr-only`,
  universal `:focus-visible`, reduced-motion blanket, skip link, touch targets),
  self-hosted Roboto `@font-face`, MapLibre control polish, and component shells
  (navbar with banner lockup, panel, county card, toast, tooltip, modal, scrim)
  with the 1400/1060/750/640 responsive ladder.
- **`theme/fonts/`** — Roboto variable woff2, the whole 100–900 axis in one
  file; body 400, headings 900 via
  `--heading-weight`. No font request leaves the origin.
- **`tokens/tokens.json`** — machine-readable mirror of the CSS custom
  properties for Quarto, Tailwind, and R consumers, plus the z-index and
  breakpoint ladders and the measured contrast matrix for both themes. CI
  enforces parity with the theme.
- **`core/core.js`** — `KIT_VERSION`, throw-safe storage (`sfsa-<app>-*`
  namespace, `sfsa-theme` shared org-wide), HTML escaping, **UTC-only civil-date
  helpers**, `fetchJSON` + promise cache, live `reducedMotion()`, `viewport`
  compact/touch pub-sub, toast, theme management + toggle with an `onChange`
  hook, live region, `<dialog>` modal with opener-captured focus restore,
  collapsible panels, and URL-state helpers with default elision.
- **`map/map.js`** — the basemap-less MapLibre setup: cream canvas, no basemap,
  no rotation, no pitch; navigation and fit controls, zoom floor, feature-state
  helpers, and token→paint resolution (re-applied on theme change, because GL
  paints cannot read CSS custom properties).
- **`county/county.js`** — the FSA county layer: **vintage selection by program
  year** (dd17 ≤ 2014, dd22 ≥ 2015), runtime TopoJSON fetch from the boundary
  archives' Pages with a per-session cache, **joins on 5-character FSA string
  ids** (never FIPS, never `parseInt`), unmatched-id reporting in both
  directions, and `swapVintage`, which clears feature-state before `setData` so
  hover and selection survive a vintage change.
- **`ui/search.js`** — county search combobox with the keyboard contract.
- **`ui/card.js`** — the county detail card; the numeric redundancy channel for
  the choropleth, and a bottom sheet on compact.
- **`ui/legend.js`** — continuous, cyclic (month-labeled wheel for day-of-year),
  and categorical legends, each an accessible surface rather than a picture.
- **`ui/export.js`** — branded PNG export behind the `?export=` convention,
  with banner and credit line composited in.
- **`ui/help.js`** — markdown help and info modal, rendered with the vendored
  `marked`. **Repo-authored markdown only** — never user-supplied content.
- **`snippets/`** — canonical `<head>` (same-origin CSP included), the inline
  anti-flash theme boot, the skip link.
- **`vendor/`** — MapLibre GL **5.18.0** and topojson-client **3.1.0** as UMD
  globals, pinned by **library** version and living **outside** release
  snapshots, so a kit release never re-copies a megabyte of JavaScript.
  **`vendor-esm/marked-18.0.10/`** is inside the snapshot. Provenance, sha256s,
  and licenses in [`vendor/VENDORED.md`](vendor/VENDORED.md); upgrades write a
  new sibling directory and never edit an existing one.
- **`tools/`** — `release.sh` (byte-copy snapshot + `MANIFEST.sha256`),
  `check-tokens.mjs` (theme ↔ JSON parity across both themes),
  `check-contrast.mjs` (the WCAG matrix), `check-frozen.mjs` (re-verifies every
  released byte on every CI run — the integrity story, since SRI cannot cover an
  ES-module graph), and `a11y-audit.mjs`.
- **`demo/`** — living demo of every component in both themes; the axe and
  html-validate target, and the coverage requirement for anything new.
- **Docs** — [HOUSE-STYLE.md](HOUSE-STYLE.md) (the rules),
  [AGENTS.md](AGENTS.md) (the guardrails), [CONSUMERS.md](CONSUMERS.md)
  (adoption), [MIGRATING.md](MIGRATING.md) (the playbook).

### Notes

- Architecture re-implemented from
  [mt-climate-office/mco-web-style](https://github.com/mt-climate-office/mco-web-style)
  (MIT), with attribution. Deliberate divergences: **ES modules instead of
  classic-script globals**; **same-origin GitHub Pages with versioned paths
  instead of a CDN with SRI**; **two themes instead of three**, light-first;
  **no basemap**; and a stricter `--text-muted` contract (≥ 4.5:1 on raised as
  well as deep and surface).
- The county-id rule is a response to a live defect: `fsa-lfp-eligibility-web`
  joins FIPS-derived ids against FSA-coded geometry, which draws a plausible map
  that is wrong in exactly the counties FSA administers differently. Fixing it
  is step 0 of that app's migration.
