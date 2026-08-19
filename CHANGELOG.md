# Changelog

All notable changes to the Sustainable FSA style kit. Format follows
[Keep a Changelog](https://keepachangelog.com); versioning follows the SemVer
policy in [README.md](README.md) — **PATCH** = fix with no observable-contract
change · **MINOR** = additive · **MAJOR** = any rename, removal, or default
change.

Releases are immutable directories: `vX.Y.Z/` is a byte-copy snapshot with a
`MANIFEST.sha256`, re-verified by CI on every run. A bad release gets a new
patch version, never an edit.

## [0.2.0] — 2026-08-19

The control drawer, and the full-height dock for the detail surface that sits
beside it. Purely additive: every 0.1.0 selector and export keeps its shape, and
a page that adopts neither new component renders exactly as it did.

### Added

- **`ui/drawer.js`** — `initDrawer`, one module over **two surfaces**. On a
  desktop viewport the drawer is a **real column** of the app's map row, so
  closing it hands its width to the map — the one camera change the reader
  actually asked for; under compact the same element is an **off-canvas overlay**
  over the map with a scrim behind it, because a 272px fixture on a phone leaves
  no map to control. Both handles (the edge tab and the navbar hamburger) carry
  `aria-expanded` and a swapped `aria-label`, written in the same call that flips
  `.is-closed`, so the accessible state cannot drift from the geometry. Escape
  closes the drawer **only** while it is compact and open — the desktop fixture
  is part of the page, not a layer — and `preventDefault()`s the key it consumes
  so the surfaces below it stand down. Focus follows the overlay in and the
  opener back out, and it is always moved out **before** the closing slide, since
  the browser would otherwise blur it to `<body>`. The desktop open/closed state
  persists under an app-prefixed key; compact starts closed, never persists, and
  is force-closed on the way in, so a phone visit cannot rewrite a desktop
  preference. Every one of those decisions reads the live `viewport` helper rather
  than a boot snapshot. **`map.resize()` is deliberately not wired here** — the
  kit does not know the app has a map; `onToggle` is the seam, and the recipe
  (resize ~240ms after the slide, immediately under `reducedMotion()`) is in the
  module header. Ported from `mt-climate-office/mesonet-explorer` (MIT), which
  hand-rolls the pattern per app; the deltas — generic selectors, ARIA on both
  handles, Escape participation, focus management, a closed drawer that leaves
  the tab order, and the caller-owned resize — are enumerated in the header's
  § Attribution.
- **`theme/sfsa-theme.css`** — the `.sfsa-drawer` component family:
  `.sfsa-drawer` with its single state class `.is-closed`,
  `.sfsa-drawer-scroll`, `.sfsa-drawer-section`, `.sfsa-drawer-title`, the
  `.sfsa-drawer-tab` edge handle, the compact-only `.sfsa-drawer-toggle`
  hamburger, and full-width rules that put the kit's navbar-shaped controls
  (`.sfsa-range` and its output, `.seg-btns`, `.sfsa-combobox`) into a 272px
  column. Two contracts are load-bearing and documented in place: the **tab must
  be the drawer's next sibling**, because both its resting position and its
  chevron direction are selected through
  `.sfsa-drawer.is-closed + .sfsa-drawer-tab` and CSS has no previous-sibling
  selector; and a **closed drawer leaves the tab order with zero JS**, because
  `visibility` is transitioned alongside the slide in the **closing direction
  only** — it interpolates discretely, so it holds `visible` for the whole slide
  and drops out of the accessibility tree exactly when the drawer is gone, while
  an opening drawer is focusable in the same style pass that focuses it.
- **`.sfsa-drawer-scrim`**, and the z-index tier it rides on,
  **`--z-drawer-scrim: 65`**. Deliberately *not* `.sfsa-scrim`: the drawer's
  scrim is **absolute inside the app's positioned map row** rather than
  viewport-fixed, so it dims the map — and an open bottom sheet at `--z-detail`
  (60) — while staying under the drawer that raised it at `--z-drawer` (70) and
  leaving the chrome above it live. A control drawer is not a modal, and the
  theme toggle and help button are up there. `.sfsa-scrim` keeps its own meaning
  (viewport-fixed, at `--z-map-panel`) for anything that must dim the whole
  window.
- **`.sfsa-card.dock-right`** and the `sfsa-dock-in` keyframe — an opt-in desktop
  variant that docks the detail surface **full-height against the right edge of
  the map** instead of floating in a corner, opaque `--bg-surface` rather than
  glass, for an app whose card carries a long readout. **CSS-only:**
  `ui/card.js` is not told about it, and the enter-only animation re-runs by
  itself every time that module flips `[hidden]` off. Scoped to the not-compact
  complement of the compact query, so a phone still gets the bottom sheet.
- **`--drawer-w` (`272px`)** — the desktop drawer's width: a dimension, so it has
  no theme variant, and a slot an app may override on its own `:root`, because
  the drawer's width, the margin it slides out by, and the resting position of
  its edge tab all derive from it. Mirrored in `tokens/tokens.json` and added to
  the parity-exempt set in `tools/check-tokens.mjs`, which cross-checks that
  exemption against the JSON in both directions.
- **`demo/`** — `#sec-drawer` exercises the whole component: live controls inside
  the drawer, both handles, the contained scrim, and a status line reporting
  which of the two surfaces the current viewport is getting and where Escape
  goes. `initDrawer` is wired **before** `initDetailCard` there, because
  registration order on `document` *is* the Escape order. The map section gained
  a **Dock right** toggle for `.sfsa-card.dock-right`.

### Fixed

- **`ui/card.js`** — the open-focus is now
  `card.focus({ preventScroll: true })`. The `dock-right` variant enters under a
  `translateX` animation, so at focus time the card can still overhang its
  scroll ancestors; the default focus-scroll-into-view then dragged an
  `overflow: hidden` map row sideways, and the shift outlived the animation.
  Caught by `lfp-explorer`'s verify harness. Not a contract change — the card is
  always fully in view once settled, so this focus never needed to scroll
  anything.

### Notes

- **The admission rule (AGENTS.md §5) is satisfied on arrival.**
  `lfp-explorer` is live on the drawer — it is the consumer that proved it, and
  the `preventScroll` fix above is a defect its verification found — and
  `fsa-lfp-eligibility-web` is already named in [CONSUMERS.md](CONSUMERS.md) as
  needing its controls relocated into a drawer, since its dependent control
  groups (pasture type, then the weeks and thresholds that follow from it) do not
  fit a navbar. Two properties, one of them already shipping on it — the drawer
  did not enter the kit as one app's code.
- The pattern itself — desktop fixture vs compact overlay, the contained scrim
  against the page-level one, the Escape layering, and the `onToggle` resize
  seam — is codified in [HOUSE-STYLE.md](HOUSE-STYLE.md) §3.

## [0.1.0] — 2026-08-18

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

### Fixed

Defects the demo and the audit gate found in the kit's own code before 0.1.0 was
cut. Nothing here is a contract change for a consumer that does not exist yet;
the API additions are listed with the fix that needed them.

- **`map/map.js`** — `cameraParamsIfDefault()` now compares against the pose a
  fit ACTUALLY settles at inside the `maxBounds` cage, remembered from the last
  fit the kit saw land, rather than asking `map.cameraForBounds()`, which
  ignores the cage. On the wide, short containers this fleet's maps live in the
  cage holds a higher zoom than the fit reports (measured on the demo's 1048×460
  map: 3.385 against 2.922), so the comparison never matched, every untouched
  map emitted `?lng&lat&zoom`, and the clean-URL rule (HOUSE-STYLE §4) was
  broken on arrival. Adds **`fitDefault()`** — the fit an app calls instead of
  `map.fitBounds()` so the pose stays known — and **`defaultPose()`**, plus a
  `defaultPose` option on `cameraParamsIfDefault()` for an app that tracks its
  own.
- **`map/map.js`** — `installZoomFloor()`'s `refresh(newBounds)` takes the new
  extent, which is what its JSDoc always told callers to do after a bounds
  change even though `bounds` was captured at install; `bounds` may now be a
  function like `fitOpts` in both `installZoomFloor()` and `addFitControl()`;
  and the fit control gained `setBounds()`. Re-pointing either helper at a new
  vintage no longer means removing and re-installing it.
- **`ui/search.js`** — the zero-results row and the counted overflow row are
  `role="option"` + `aria-disabled="true"` instead of `role="presentation"`. A
  listbox whose only child was a presentation row had no options at all, which
  axe scores **critical** (`aria-required-children`) — it fired in all four
  theme×viewport combos on any query that matched nothing. The rows stay
  unselectable: skipped by arrow navigation, never active, inert to Enter and to
  the pointer. `tools/a11y-audit.mjs` now runs its combobox probe over the
  zero-result state as well as the matching one.
- **`ui/card.js`** — the card calls `preventDefault()` on an Escape it consumes,
  so the layers below it can stand down; it already yielded to the layers above
  it by reading `defaultPrevented`. Without it one Escape dismissed the card AND
  the surface underneath it. Anything listening for Escape below a card must
  check `event.defaultPrevented`.
- **`theme/sfsa-theme.css`** — `.sfsa-modal .info-section` tables have house
  styling (`ui/help.js` enables GFM tables and help copy in this fleet is mostly
  tables); the demo's local `kit-override` table block is gone. Deliberately no
  scroll container of their own — that would be an axe-serious
  `scrollable-region-focusable` waiting to happen.

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
