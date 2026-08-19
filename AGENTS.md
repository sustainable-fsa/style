# Guardrails for working on `style`

Instructions for anyone — human or AI agent — changing this repo or consuming it
from an app. The reasoning behind each rule is in
[HOUSE-STYLE.md](HOUSE-STYLE.md); this file is just the rails.

## The kit's constitution

1. **Zero build, zero runtime dependencies. Ever.** No bundler, no framework,
   no TypeScript, no preprocessor, no npm in the runtime path. Published files
   are hand-written CSS and ES modules that run as-committed, served by GitHub
   Pages. Dev tooling installs ephemerally and is never a runtime dependency —
   `package.json` is gitignored on purpose.
2. **Tokens only.** A hard-coded hex is a review-blocker unless it is
   (a) data-encoding under the CVD policy (HOUSE-STYLE §6), or (b) annotated
   with a contrast comment naming the surface it was measured against and the
   WCAG criterion.
3. **`--accent` is fill-only.** Borders, icons, rules, text → `--accent-line`.
   Never introduce a second red or orange.
4. **New tokens go in BOTH theme blocks** (light, high-contrast) **AND**
   `tokens/tokens.json`. CI enforces parity and sync.
5. **Admission rule:** no NEW feature enters the kit until **≥ 2 Sustainable FSA
   properties** need it — one-app code stays in that app. Migration
   **back-ports** are different: fixing a defect or reconciling drift in code
   the kit already owns needs only the one migrating consumer.
6. **A11y gates are non-negotiable** (HOUSE-STYLE §5): universal focus ring,
   live region + the summary/on-demand-table twin for canvas data,
   reduced-motion via the live gate, touch targets, skip link, `aria-pressed`
   idiom, keyboard twins, `?kbd=off` for single-char shortcuts. The axe
   workflow failing on serious/critical is a hard stop, not a flake to re-run.
7. **No secrets, no API keys** in this repo — and none needed: there is no
   basemap, no tile provider, and no font host. No credentials, no `.tfstate`,
   no private keys.
8. **The demo is coverage.** New component or API → exercise it in `demo/`, or
   the a11y and HTML gates are auditing nothing.
9. **Never edit a published `vX.Y.Z/` or `vendor/<lib>-<version>/` directory.**
   Those bytes are the pin — consumers reference those exact URLs forever, and
   `tools/check-frozen.mjs` re-verifies every one of them against
   `MANIFEST.sha256` on every CI run. A bad release gets a **new patch
   version**, never a fix in place. Upgrading a vendored library means a **new**
   sibling directory (`vendor/<lib>-<newversion>/`), never an edit to the old
   one — see [`vendor/VENDORED.md`](vendor/VENDORED.md).
10. **County ids are 5-character FSA strings.** `parseInt`, `Number()`, or any
    arithmetic on a county id is a **review-blocker** in kit code and in
    consumer code (HOUSE-STYLE §7). FSA codes are not FIPS codes.
11. **The boundary vintage follows the program year** — dd17 for ≤ 2014, dd22
    for ≥ 2015, never interpolated, never one vintage for a whole app.
12. **`ui/help.js` renders repo-authored markdown only.** It is a markdown
    renderer wired to `innerHTML`; pointing it at user-supplied content, a URL
    parameter, or anything fetched from outside the app's own repo turns it into
    an XSS vector. Help and info content ships in the app's source tree. There
    is no sanitizer in this kit and there is not going to be one.

## Releasing (order matters)

1. **Clean tree.** Land or stash unrelated doc/tool changes first; a release
   commit contains only the release.
2. **Gates green locally** — `tools/check-tokens.mjs`, `tools/check-contrast.mjs`,
   `tools/check-frozen.mjs`, `html-validate` over `demo/`, `tools/a11y-audit.mjs`
   — **and eyeball the demo in both themes at 1440px and 390px.** The gates do
   not see layout.
3. **Bump the version everywhere it appears in source**: the `@version` headers,
   `KIT_VERSION` in `core/core.js`, the URLs in `snippets/head.html`, and the
   README's files table. Commit as `release: vX.Y.Z (source)`.
4. **`tools/release.sh X.Y.Z`** — byte-copies the source surface into `vX.Y.Z/`
   and writes `vX.Y.Z/MANIFEST.sha256`.
5. **`tools/check-frozen.mjs` passes** against the new snapshot and every older
   one.
6. **CHANGELOG entry** ([Keep a Changelog](https://keepachangelog.com); SemVer:
   **PATCH** = fix with no observable-contract change · **MINOR** = additive ·
   **MAJOR** = any rename, removal, or default change).
7. **Commit `release: vX.Y.Z`, push**, and wait for Actions and the Pages
   deploy to finish.
8. **Verify live**:
   ```sh
   curl -sI https://sustainable-fsa.com/style/vX.Y.Z/theme/sfsa-theme.css   # 200
   curl -sI -H 'Accept-Encoding: gzip' \
        https://sustainable-fsa.com/style/vX.Y.Z/core/core.js | grep -i encoding
   ```
   then open the released demo in a browser.
9. **`git tag vX.Y.Z && git push origin vX.Y.Z`** — bookkeeping only. The
   version **path** is the pin; the tag is for humans reading history.

## When consuming the kit from an app

**Migrating an existing app? Follow [MIGRATING.md](MIGRATING.md)** — process,
settled precedents, gotchas, and the verification recipe. The rules below apply
to any consumer, migrated or new.

- **Load kit files by full versioned URL**
  (`https://sustainable-fsa.com/style/vX.Y.Z/…`). Never an unversioned path,
  never a moving alias. Vendored libraries are pinned by *library* version
  (`/style/vendor/maplibre-gl-5.18.0/…`) and deliberately live outside the
  snapshot.
- Copy the inline theme-boot snippet **INLINE** into `<head>` — never load it as
  a file; it must run before first paint. If the app ships a CSP, recompute that
  script's `sha256` **from your own page** (MIGRATING § Gotchas) and list
  `https://sustainable-fsa.com` in `script-src`, `style-src`, `font-src`,
  `img-src`, and `connect-src`.
- Include **`viewport-fit=cover`** in the viewport meta or the kit's safe-area
  padding silently does nothing.
- **localStorage:** `sfsa-theme` is shared org-wide on this origin; everything
  else must be `sfsa-<app>-*` prefixed and re-validated on read like a URL
  param.
- **Don't fork kit styles.** If the kit's version doesn't fit, override locally
  with a comment `/* kit-override: <why> */` and open a kit issue — if a second
  app wants the same override, it's a kit change.
- Style fixes land in the kit first, then flow to apps by version bump
  (HOUSE-STYLE §8).
- Add this block to the consuming repo's `CLAUDE.md` / `AGENTS.md`:

  ```markdown
  ## House style
  This app consumes the Sustainable FSA style kit, pinned by full versioned URL
  in index.html (https://sustainable-fsa.com/style/vX.Y.Z/…). Design tokens,
  a11y mandates, and interaction conventions: see HOUSE-STYLE.md in
  https://github.com/sustainable-fsa/style — tokens only (no raw hexes),
  --accent is fill-only, aria-pressed drives toggle styling, canvas data needs a
  live region plus the sr summary / on-demand table twin, and county joins use
  5-character FSA string ids (never FIPS, never parseInt). To change shared
  styling, change the kit and bump the pinned version here; never patch a local
  copy.
  ```
