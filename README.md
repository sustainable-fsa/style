# style

The shared web house style of the [Sustainable FSA](https://sustainable-fsa.com)
project: brand tokens, accessibility-first theme CSS, and framework-free ES
modules for the project's single-page county-map applications (grazing periods,
LFP eligibility, the data portal, and friends).

**Zero build. Zero runtime dependencies. Served same-origin from GitHub Pages at
`https://sustainable-fsa.com/style/`, pinned by version path.**

- 📐 **[HOUSE-STYLE.md](HOUSE-STYLE.md)** — brand, UX, accessibility, map, and dev conventions (the rules)
- 🤖 **[AGENTS.md](AGENTS.md)** — guardrails for developers, human or AI (the sideboards)
- 🗺 **[CONSUMERS.md](CONSUMERS.md)** — which Sustainable FSA properties use the kit, per-app intel
- 🚚 **[MIGRATING.md](MIGRATING.md)** — the migration playbook (start here when converting an existing app)
- 📓 **[CHANGELOG.md](CHANGELOG.md)** — every released version
- 🧪 **demo/** — a living demo exercising every component (also the CI axe and html-validate target)

Architecture re-implemented from
[mt-climate-office/mco-web-style](https://github.com/mt-climate-office/mco-web-style)
(MIT) — the delivery model, the token contract, and the accessibility mandates
are its design, adapted here for a light brand, ES modules, same-origin
delivery, and county-choropleth apps.

## Quickstart

Copy the canonical `<head>` from [`snippets/head.html`](snippets/head.html),
inline the theme-boot snippet, and put the skip link first in `<body>`. The real
shape of a consumer page:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

<!-- Everything is same-origin: the kit, the font, and the county geometry all
     live under sustainable-fsa.com. The host is listed explicitly so the page
     also works from a *.github.io preview origin. Recompute the sha256 from
     YOUR OWN page — see MIGRATING § Gotchas. -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src  'self' https://sustainable-fsa.com 'sha256-REPLACE-WITH-YOUR-OWN';
  style-src   'self' https://sustainable-fsa.com;
  font-src    'self' https://sustainable-fsa.com;
  img-src     'self' https://sustainable-fsa.com data: blob:;
  connect-src 'self' https://sustainable-fsa.com;
  worker-src  blob:;
  base-uri 'none'; object-src 'none'">

<link rel="stylesheet" href="https://sustainable-fsa.com/style/v0.1.0/theme/sfsa-theme.css">
<link rel="stylesheet" href="https://sustainable-fsa.com/style/vendor/maplibre-gl-5.18.0/maplibre-gl.css">

<script>/* theme boot — inline, copied from snippets/; must run before first paint */</script>

<!-- Classic UMD scripts FIRST: the kit's map modules expect window.maplibregl
     and window.topojson to exist by the time the app module runs. -->
<script src="https://sustainable-fsa.com/style/vendor/maplibre-gl-5.18.0/maplibre-gl.js"></script>
<script src="https://sustainable-fsa.com/style/vendor/topojson-client-3.1.0/topojson-client.min.js"></script>

<script type="module" src="app.js"></script>
```

`app.js` imports the kit by full versioned URL — no bundler, no import map, no
npm:

```js
import { KIT_VERSION, showToast, initThemeToggle, replaceUrlState }
  from 'https://sustainable-fsa.com/style/v0.1.0/core/core.js';
import { createMap }
  from 'https://sustainable-fsa.com/style/v0.1.0/map/map.js';
import { loadCounties, swapVintage, vintageForYear }
  from 'https://sustainable-fsa.com/style/v0.1.0/county/county.js';
import { initLegend }
  from 'https://sustainable-fsa.com/style/v0.1.0/ui/legend.js';
```

Every kit module carries a `@version` header and JSDoc-style comments on its
exports. **Read the module source for argument shapes rather than guessing** —
that is where the API is documented.

Non-vanilla consumers (Quarto, Jekyll/Tailwind, R plotting) read
[`tokens/tokens.json`](tokens/tokens.json), the machine-readable mirror of the
CSS custom properties, kept in lockstep with the theme by CI.

## Files

| Path | What | Who needs it |
|---|---|---|
| `theme/sfsa-theme.css` | Tokens (light + high-contrast), z-index ladder, reset + a11y utilities, `@font-face`, MapLibre control polish, component shells | every page |
| `theme/fonts/` | Roboto variable woff2 (400–900), self-hosted; referenced by a same-directory relative `url()` | every page |
| `tokens/tokens.json` | The tokens as JSON | non-vanilla consumers |
| `core/core.js` | `KIT_VERSION`, throw-safe storage, escaping, UTC civil-date helpers, `fetchJSON` + promise cache, live `reducedMotion()`, `viewport`, toast, theme, live region, modal, collapsible, URL state | every page |
| `map/map.js` | The basemap-less MapLibre setup: cream canvas, no rotation, navigation + fit controls, zoom floor, feature-state helpers, token→paint resolution | map apps |
| `county/county.js` | The FSA county layer: vintage selection by program year, TopoJSON fetch + session cache, **FSA-string-id joins**, `swapVintage` | county apps |
| `ui/search.js`, `ui/card.js`, `ui/legend.js`, `ui/export.js`, `ui/help.js` | County search combobox, county detail card, legend (continuous, cyclic wheel, categorical), branded PNG export, markdown help modal | as needed |
| `vendor/<lib>-<version>/` | MapLibre GL **5.18.0**, topojson-client **3.1.0** as UMD globals — **outside** release snapshots, pinned by library version; manifest in [`vendor/VENDORED.md`](vendor/VENDORED.md) | map apps |
| `vendor-esm/marked-18.0.10/` | ES-module markdown renderer imported by `ui/help.js` — **inside** release snapshots | help-modal apps |
| `assets/` | Sustainable FSA banner, MCO logo, favicon set — the one deliberately **mutable** published path | every page |
| `snippets/` | Copy-paste blocks: canonical `<head>`, inline theme boot, skip link | every page |
| `demo/` | Living component demo; the html-validate and axe target | contributors |
| `tools/` | `release.sh`, `check-tokens.mjs`, `check-contrast.mjs`, `check-frozen.mjs`, `a11y-audit.mjs` | contributors |
| `vX.Y.Z/` | Byte-copy snapshot of a release + `MANIFEST.sha256`. **Immutable.** | consumers (by URL) |

## Delivery model

**Same-origin, versioned paths.** Every Sustainable FSA property is a path under
`sustainable-fsa.com`, so the kit is not a CDN dependency — it is a sibling
directory. One cached copy of `core/core.js` serves the whole fleet, GitHub
Pages gzips it and sends `access-control-allow-origin: *` (so a `*.github.io`
preview origin works too), and a consumer's CSP needs no third-party host at
all. No basemap tiles, no font host, no npm registry: `'self'` plus this origin
is the entire policy.

**Pinning is the version path.** `https://sustainable-fsa.com/style/v0.1.0/core/core.js`
is a different file from `…/v0.2.0/core/core.js` forever. There is no alias, no
`@latest`, nothing that floats. A consumer upgrades by editing its URLs — which
is a reviewable diff, and the only way this kit ever moves under an app.

**Why no SRI.** Subresource Integrity cannot cover an ES-module graph: the
`integrity` attribute applies to the entry script only, and the static `import`
statements *inside* that module fetch further modules with no integrity metadata
of their own. Hashing the entry file would produce a hash that guarantees almost
nothing while looking like it guarantees everything — worse than not having it.
Integrity here is **same-origin delivery + CI-enforced immutability** instead:

- `tools/release.sh X.Y.Z` byte-copies the source surface into a committed
  `vX.Y.Z/` directory and writes `vX.Y.Z/MANIFEST.sha256`.
- `tools/check-frozen.mjs` re-hashes **every byte of every released directory**
  on **every CI run** and fails on any drift. A released file cannot be edited,
  quietly or otherwise, without turning the build red.
- Vendored libraries get the same treatment by library version
  (`vendor/maplibre-gl-5.18.0/`), so a MapLibre upgrade is a new directory, not
  a new copy inside every snapshot.

**Caching.** GitHub Pages serves `Cache-Control: max-age=600`. That ten-minute
window is irrelevant to versioned paths — the bytes at a version URL never
change, so a stale cache is a correct cache. It is only felt on the deliberately
mutable surfaces: `assets/` (brand identity, not API) and the repo root. Plan a
banner or favicon change with ten minutes of skew in mind; plan nothing else.

## Releasing

1. **Clean tree.** Land or stash unrelated doc/tool changes first; a release
   commit contains only the release.
2. **Gates green locally** — `tools/check-tokens.mjs`, `tools/check-contrast.mjs`,
   `tools/check-frozen.mjs`, `html-validate` over `demo/`, `tools/a11y-audit.mjs`
   — **and eyeball the demo in both themes at 1440px and 390px.** The gates do
   not see layout.
3. **Bump the version everywhere it appears in source**: the `@version` headers,
   `KIT_VERSION` in `core/core.js`, the URLs in `snippets/head.html`, and this
   README's files table. Commit as `release: vX.Y.Z (source)`.
4. **`tools/release.sh X.Y.Z`** — byte-copies the source surface into `vX.Y.Z/`
   and writes `vX.Y.Z/MANIFEST.sha256`.
5. **`tools/check-frozen.mjs` passes** against the new snapshot and every older
   one.
6. **CHANGELOG entry** ([Keep a Changelog](https://keepachangelog.com); SemVer:
   **PATCH** = fix with no observable-contract change · **MINOR** = additive ·
   **MAJOR** = any rename, removal, or default change).
7. **Commit `release: vX.Y.Z`, push**, and wait for Actions and the Pages deploy
   to finish.
8. **Verify live**:
   ```sh
   curl -sI https://sustainable-fsa.com/style/vX.Y.Z/theme/sfsa-theme.css   # 200
   curl -sI -H 'Accept-Encoding: gzip' \
        https://sustainable-fsa.com/style/vX.Y.Z/core/core.js | grep -i encoding
   ```
   then open the released demo in a browser.
9. **`git tag vX.Y.Z && git push origin vX.Y.Z`** — bookkeeping only. The
   version **path** is the pin; the tag is for humans reading history.

## Development

No install, no build. Serve the **whole workspace** — the parent directory that
holds every `sustainable-fsa` repo — from one static server:

```sh
python3 -m http.server 8000 -d /Users/kyle.bocinsky/git/sustainable-fsa
```

Then `http://localhost:8000/style/demo/` is the kit and
`http://localhost:8000/fsa-normal-grazing-period/` is a consumer, with the same
relative geometry between them that production has. That is the point: consumer
apps develop against **root-absolute `/style/…` paths**, which resolve
identically on this server and on `sustainable-fsa.com`, and the boundary
archives resolve too, because they are sibling directories in the workspace just
as they are sibling paths on the domain. At release, a consumer rewrites those
paths to full `https://sustainable-fsa.com/style/vX.Y.Z/…` URLs — one
find-and-replace, and nothing else about the page changes.

The a11y audit runs in CI; to run it locally:

```sh
npm init -y && npm i --no-save playwright @axe-core/playwright
npx playwright install chromium
node tools/a11y-audit.mjs   # package.json / node_modules are gitignored
```

## License

MIT. The Sustainable FSA and Montana Climate Office names and marks identify
their organizations — use them only for Sustainable FSA properties. Vendored
third-party libraries keep their own licenses; see
[`vendor/VENDORED.md`](vendor/VENDORED.md).
