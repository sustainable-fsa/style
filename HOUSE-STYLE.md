# The Sustainable FSA House Style

Brand, UX, accessibility, and engineering conventions for Sustainable FSA web
properties — one document, because in this family they are not separable: the
accent color is also a WCAG contract, the breakpoint is also a JS constant, the
county id is also a data-integrity rule, and the legend is also a screen-reader
surface.

Operational guardrails (the do/don't list for contributors, human or AI) live in
[AGENTS.md](AGENTS.md). Per-app adoption status lives in [CONSUMERS.md](CONSUMERS.md).
The migration playbook is [MIGRATING.md](MIGRATING.md).

---

## 1. Identity

**Accent.** The Sustainable FSA accent is **terracotta `#B7410E`**, and it is a
**fill color only**. Borders, icons, rules, links, and text take
**`--accent-line` (`#8f320a`)**, which holds ≥ 7:1 on every surface. The accent
is tuned to sit *behind* `--text-on-accent` — that pair is what CI measures —
and the split also survives the theme switch: in high-contrast the accent is
**re-derived** (`--accent` becomes `#8f320a`, `--accent-line` `#7a2a08`), so a
border that borrowed the fill color would collapse into the fill it sits
against. **Never introduce another red or orange** — the palette has exactly
one, and a second one reads as a second brand.

Supporting brand hues are tokenized **at the grade they are safe at**, because
the base hues are not text: `--sage` (`#6B8E5A`, 3.48:1 — lines and graphics
only), `--sage-dark` (`#52704a`, text grade), `--ochre-dark` (`#8a6620`, text
grade — eyebrows and panel titles). The ground is **cream `#faf7f2`**, which is
`--bg-deep`. These are the same brand values the project's Jekyll site compiles
into its Tailwind config; the tokens are the shared source now, and every one of
them carries its measured ratio in a comment beside it.

**Banner lockup.** `assets/sustainable-fsa-banner.svg` — intrinsic **1225 × 350**,
and **patched**: the shipped copy carries explicit `width`/`height` attributes
alongside its `viewBox` precisely so that `drawImage` can rasterize it. An SVG
with a `viewBox` and no intrinsic size renders at zero in a canvas on Safari and
Firefox, which is a blank corner in every exported PNG and no console error at
all. Use the kit's copy; do not re-export the banner without re-checking the
canvas path.

In a navbar the banner is **40 px tall** (its width follows the 3.5:1 aspect —
140 px), wrapped in a link to `https://sustainable-fsa.com`, with
`aria-label="Sustainable FSA — home"` on the link and **empty `alt`** on the
image — the link carries the name, so a filled `alt` would double it. Below
750 px the wide banner swaps for the square badge: `.logo-link` holds both
images (`.banner-img`, `.badge-img`) and the theme toggles between them in pure
CSS, so there is no JS, no second request, and no reflow at the breakpoint.

**Naming.** The app title sits in the navbar brand block (`.brand-title` —
uppercase, letter-spaced, `--text-muted`); beneath it the subtitle line
(`.brand-subtitle` — italic, `--text-dim`): **"A Sustainable FSA project."**
Every public app carries it.

**Page title.** `<Short name> · Sustainable FSA` — one middot, spaces either
side. The short name is the *shortest distinctive* phrase, the thing that tells
this app apart from its siblings rather than a description of it: "Grazing
Periods", not "FSA Normal Grazing Period Explorer"; "LFP Eligibility", not
"Livestock Forage Disaster Program Eligibility Viewer". A tab truncates around
fifteen characters and the distinctive word has to survive that cut, so it comes
first. Social cards (`og:title`, `twitter:title`) take the same pair;
`og:site_name` takes **`Sustainable FSA` alone**, which is what that field
means. Target titles per app are in [CONSUMERS.md](CONSUMERS.md); apply on
migration.

**Typography.** `--font-ui` is **Roboto**, self-hosted as a single variable
woff2 covering the whole **100–900** weight axis (`theme/fonts/`, `@font-face`
in the theme CSS with a same-directory relative `url()`; body text is 400).
Headings are **900** via
`--heading-weight` — that heavy display weight against light body text is the
family's most recognizable typographic move; do not soften it per-app.
`--font-mono` is the **system monospace stack** (no download): county codes,
dates, day counts, `<kbd>`. No webfont request ever leaves the origin, so there
is no third-party font host in any consumer's CSP. Don't add other families.

**Voice.** Plain, confident, unhedged. Help and info modals explain what the
colors mean, where the data came from, and what a blank county means — these are
archives of federal program records, and a viewer who cannot tell "no data" from
"no polygon" has been misled. Footers and exports credit the project.

**Credit.** Every public app footers the **Montana Climate Office** logo
(`assets/MCO_logo.svg`) linking `https://climate.umt.edu` — MCO builds and
maintains these tools — together with the support line: supported by the **USDA
Office of the Chief Economist, Office of Energy and Environmental Policy** and
the **USDA Climate Hubs**. The canonical wording lives in the project site's
`_includes/footer.html`; match it rather than paraphrasing. This is a funding
requirement, not decoration, and it belongs in exported PNGs as well as on the
page.

---

## 2. Tokens

The tokens in `theme/sfsa-theme.css` (mirrored in `tokens/tokens.json`) are the
only place colors live. **A hard-coded hex in app code is a review-blocker**
unless it is data-encoding (a color ramp — §6) or carries a contrast comment
(§5.10).

The contrast contract, enforced by CI (`tools/check-contrast.mjs`) across **both
themes**:

| Foreground | Contracted on | Guarantee |
|---|---|---|
| `--text-primary`, `--text-secondary`, `--text-muted` | deep, surface, raised | ≥ 4.5:1 |
| `--text-dim` | deep, surface **only** | ≥ 4.5:1 |
| `--accent-line` | deep, surface, raised | ≥ 4.5:1 |
| `--text-on-accent` | `--accent` fills | ≥ 4.5:1 |
| `--ctrl-border` | deep, surface, raised | ≥ 3:1 (WCAG 1.4.11) |

`--accent`, `--accent-light`, and `--sage` are **fill/line grade only** — they
are not on the table because they are not text. The measured ratios for every
token on every surface, in both themes, are in `tokens/tokens.json` under
`contrast`; the CSS carries them inline as comments.

The three surfaces, light-first: **deep** is the page and map ground (brand
cream), **surface** is a panel or card, **raised** is a control or a row inside
one.

Hard-won rules encoded here:

- **`--accent` is a fill color** (§1). Use it behind `--text-on-accent`; for
  borders, icons, or text use `--accent-line`.
- **`--text-muted` must clear 4.5:1 on all three surfaces**, which is stricter
  than the kit this one is modeled on. That kit excludes muted-on-raised because
  its dark theme cannot make the pair work; a light palette can, and the muted
  weight is exactly what legend rows and card labels reach for. Holding the
  stricter line here means a legend row inside a raised panel needs no
  special-casing.
- **`--text-dim` is deliberately weaker** and is contracted on deep and surface
  only — it happens to clear raised in both shipped themes, but the contract
  does not promise that and a future palette change may not. It is for the
  subtitle line and for de-emphasized metadata, not for anything a user has to
  read inside a control.
- `--selection-ring` tokenizes the county selection halo and `--selection-casing`
  the white casing width the map draws beneath it (1 px light, 1.5 px
  high-contrast) — a ring over a data fill needs the casing to stay visible on
  every ramp color. `--ctrl-border` is the interactive edge, and it is a
  **non-text** contract (1.4.11, ≥ 3:1) — don't use `--border`, the decorative
  hairline, on a control.

**Theming.** Two themes: **`light` (default)** and **`high-contrast`**, switched
by `data-theme` on `<html>`. Light is the default because the brand is a light
brand — cream ground, white chrome, a warm accent — and a dark inversion of it
is a different brand, not a mode. High-contrast is a **first-class citizen**,
not a courtesy: white-based, maximum contrast, heavier borders, the accent
re-derived rather than reused. Any new token must be defined in **both** blocks
and in `tokens/tokens.json` — CI enforces parity and sync.

Two themes rather than three is a deliberate simplification of the architecture
this kit inherits: every theme doubles the contrast matrix, the demo review, and
the axe run, and a dark theme nobody in this family designs for is a theme that
silently rots.

---

## 3. Layout, chrome & responsive

**Navbar** (`.sfsa-navbar`): a **white bar** — not the glass-dark treatment of
the dark-first kit this is modeled on; the brand is light, and a translucent
dark bar over a cream map reads as a foreign element. 52 px min-height, a
brand-gradient underline via `::after`. Order: **banner lockup** (`.logo-link`)
→ `.nav-divider` → `.brand` block (`.brand-title` + `.brand-subtitle`) →
`.controls` → `.nav-meta` (right-aligned). Buttons are `.nav-btn` (34 px,
`.icon-only` variant), segmented groups `.seg-btns > .seg-btn`, info/help button
`.sfsa-btn-info` (a circle, deliberately distinct, and it never carries a
`.btn-label`).

**Panels** (`.sfsa-panel`) are floating surfaces over the map (legend, filters):
head + collapsible body, wired with `initCollapsible`. **`.sfsa-card`** is the
detail surface for a selected county, and on compact it becomes a bottom sheet
(see below). A card carrying a long readout may opt into
**`.sfsa-card.dock-right`**, which docks it full-height against the right edge of
the map at desktop widths instead of floating in a corner — a column beats a
70dvh box that scrolls inside a box. It is CSS-only, and compact still gets the
sheet.

**Z-index ladder**: add to a tier, never invent a number. The tiers are
documented in the CSS. MapLibre's own controls are z-index 2; map popups ship
with none — anything above the controls uses a tier.

**Breakpoint ladder** — layout in real `@media` rules, behavior via the core
module's `viewport`:

| Width | What sheds |
|---|---|
| ≤ 1400px | button and control text labels (`.btn-label`, `.control-label`) — buttons then square to 34px (40px on touch) so they match `.icon-only` neighbours; `.sfsa-btn-info` keeps its circle |
| ≤ 1060px | chrome padding and gaps tighten (via `--nav-gap`) |
| ≤ 750px | the wide banner swaps for the square badge, and the text lockup (`.brand`: title **and** subtitle) plus `.nav-divider` go |
| ≤ 640px | `.refresh-status`; a navbar search field collapses to a disclosure and reopens as an overlay bar; **compact mode** begins — `.sfsa-card` docks to the bottom as a sheet capped at `45dvh` |

**Everything that "sheds" here is clipped, not removed.** Both `.btn-label` and
`.control-label` use the `.sr-only` clip pattern below 1400 px, and so does the
brand lockup at 750 px. `display: none` takes an element out of the
accessibility tree: a `.btn-label` is often the only accessible name a button
was given, and a `.control-label` is a `<label for>` naming a real input, so
removing either leaves a nameless control at every width below the breakpoint —
a bug a 1440 px-only axe run cannot see. **Run axe at a narrow viewport too.**
Buttons should still carry a permanent `aria-label`; the clip is the belt to
that suspenders.

The same reasoning protects the document outline: `.brand-title` is often the
page's `<h1>`, and clipping rather than removing it means the outline and the
screen-reader app name survive every breakpoint.

The search collapse has its own constant, `SEARCH_COLLAPSE_MQ`
(`(max-width: 640px)`), which is deliberately **width-only** — unlike the
compact query it has no height clause, because a short landscape window is still
wide enough for an inline field.

While the bottom sheet is open, JS stamps its rendered height on `:root` as
**`--sheet-h`**; the bottom-corner MapLibre controls and the toast both lift by
that amount, and nothing else needs to know the sheet exists. Clear it on close.

**Compact** is `(max-width: 640px), (max-height: 560px)` — note the height
clause: a short landscape phone is compact too. **The string is authored in
exactly two places** — the CSS §6 header comment and the core module's
`viewport.COMPACT_MQ` — and the compact `@media` block must match it character
for character. **They must stay in sync**; a drift between them is a bug that
only
appears in a narrow band of viewport sizes and never reproduces on the
developer's laptop. Compact drives JS decisions: bottom sheet instead of
anchored popup, panel auto-collapse, control relocation into a drawer.

**Mobile patterns:**
- Controls relocate into the off-canvas drawer at `--z-drawer`, over its own
  contained scrim — § Control drawer below.
- Full-viewport apps use **`100dvh`** (never `100vh`) and `overflow: hidden` on
  body. `100vh` on iOS Safari is the URL-bar-hidden height, so the bottom of the
  map — where the controls and the sheet live — sits under the browser chrome.
- **`viewport-fit=cover` is required** in the viewport meta, or the kit's
  safe-area padding silently does nothing: without it `env(safe-area-inset-*)`
  resolves to 0 and the failure is invisible on every non-notched device. Use
  `max(1rem, env(safe-area-inset-*))` on edge-hugging chrome.
- Segmented button groups that don't fit under 1060 px get a `<select>`
  fallback.
- A navbar search field **collapses to a disclosure** at compact widths rather
  than being hidden: focus moves into the field on open and back to the button
  on close. Hiding search outright strands the only keyboard route to a named
  feature — don't.

**Navbar gap.** Tighten `.sfsa-navbar` spacing through its `--nav-gap` custom
property, never `gap` directly: the lockup divider's margin is derived from it,
so setting `gap` alone desynchronises them and squeezes banner, divider, and
title together.

### Control drawer

More controls than a navbar holds go in `.sfsa-drawer` + `initDrawer`
(`ui/drawer.js`), which is **two surfaces in one element**. The edge tab is the
desktop handle and **must be the drawer's next sibling** (the theme selects both
its closed position and its chevron direction through
`.sfsa-drawer.is-closed + .sfsa-drawer-tab`, and CSS has no previous-sibling
selector); the navbar hamburger is the compact one, and each is hidden at the
width where it does not belong. Both carry `aria-expanded` and a swapped
`aria-label`, written in the same call that flips `.is-closed` — the disclosure
sibling of the §5.7 idiom.

- **Desktop is a fixture, not a float.** The drawer is a real column of the app's
  map row at `--drawer-w`, so closing it *hands its width to the map* instead of
  uncovering it — a floating panel would cover the very map it filters. That
  changes the map container's width, so **the app calls `map.resize()`**; the kit
  will not, because it does not know the app has a map. `onToggle` is the seam:
  resize **~240ms after the slide** (the theme animates `margin-left` over
  `--transition`, and a resize measured mid-slide reads a width the container is
  about to leave — that is how you get a letterboxed canvas), and
  **immediately under reduced motion**, where the CSS blanket has already clamped
  the transition and the wait would be a visible stall. Read the gate at call
  time (§5.3).
- **Compact is an overlay, over a contained scrim.** Below the compact query the
  same element slides over the map at `--z-drawer` and raises
  **`.sfsa-drawer-scrim`**: `position: absolute` **inside the app's positioned
  map row**, at **`--z-drawer-scrim` (65)**. That tier dims the map and an open
  bottom sheet (`--z-detail`, 60), stays under the drawer that raised it (70),
  and leaves the navbar live — a control drawer is not a modal, and the theme and
  help buttons are up there. Do not reach for `.sfsa-scrim` here: that one is
  **viewport-fixed** at `--z-map-panel` and dims the chrome with everything else,
  for surfaces whose scope really is the whole window. Compact starts closed,
  never persists its state, and is force-closed on the way in, so a phone visit
  cannot rewrite the desktop preference.
- **Escape is a compact-only layer.** An open compact drawer closes on Escape and
  marks the key consumed; the desktop fixture lets it fall through to whatever is
  stacked over the map, because Escape does not un-arrange a page the reader
  arranged. Every handler in that contract lives on `document` and listeners on
  one node fire in **registration order**, so **wire `initDrawer` before
  `initDetailCard`** — the drawer sits a tier above the detail surface, and the
  other order lets one Escape close the card underneath an open drawer.
- **A closed drawer leaves the tab order, with no JS.** The theme transitions
  `visibility` alongside the slide, **in the closing direction only**:
  `visibility` interpolates discretely, so it holds `visible` for the whole slide
  and the drawer leaves the accessibility tree exactly when it leaves the screen —
  no `[hidden]` bookkeeping, and no keyboard user tabbing through a control set
  they cannot see. The asymmetry is deliberate: transitioned both ways, the drawer
  computes as `hidden` for one frame after opening, which silently drops the
  `focus()` that puts a compact reader inside it. Don't tidy it out.

---

## 4. Interaction conventions

**URL is the primary state.** Read once at boot with precedence **URL param >
localStorage > default**, validating every value against a whitelist. Mirror
state back on every mutation and on map `moveend`. All-defaults views emit a
**clean URL** — no `?year=2026&type=native&theme=light` on a page that is
showing exactly the defaults. Share buttons copy `location.href`, which means
the URL must *already* be the complete view before anyone presses anything.

For this fleet the state that belongs in the URL is: program year, pasture or
livestock type, the selected county's **FSA id**, the active variable, camera,
and theme.

**localStorage namespace.** **`sfsa-theme` (the core module's `THEME_KEY`) is
deliberately shared org-wide** on the origin — every project site is a path
under `sustainable-fsa.com`, so a theme choice genuinely follows the user from
the grazing-period map to the LFP dashboard. Everything else is app-prefixed
(`sfsa-<app>-*`). Persisted values are **re-validated on read** exactly like URL
params: another app on the same origin, or last year's version of yours, may
have written them.

**Theme switching** re-styles the map. Layer paints do not read CSS custom
properties (§7), so a theme change must re-resolve and re-apply them; the kit's
theme toggle exposes an `onChange` hook for exactly this, and it also maintains
the icon swap and the button's `aria-label`.

**Toasts** for transient status, **2800 ms** default — longer explicit durations
for errors are fine, but don't change the default per app. **Dialogs** are
native `<dialog>` via `initInfoModal`: backdrop click closes, Esc closes, focus
returns to the opener. First-visit info modals
auto-open once, gated by an app-prefixed localStorage key **written AT OPEN, not
at close** — write it on close and anyone who navigates away without dismissing
the modal sees it again on every single visit. Deep links (a URL that already
names a county or a year) suppress the auto-open entirely: that visitor was sent
to a specific view and does not need the tour.

**`?export=` convention**: a URL param that forces a theme and triggers the
app's export path, so branded-PNG generation stays headless-scriptable from CI
or a screenshot job.

---

## 5. Accessibility standards

These are mandates, not suggestions. CI runs axe over the kit demo in both
themes.

1. **Live region for canvas changes.** Anything a sighted user learns from the
   map re-rendering ("1,214 counties shown", "Lucas County, Ohio selected") is
   announced through the kit's live region.
2. **Hidden-table twin — with this fleet's pragmatic variant.** Every canvas
   data layer owes AT an equivalent. The straight sr-only `<table>` rebuilt per
   render does not survive **3,100+ county features**: it is a five-figure DOM
   rebuild on every filter change and an unnavigable wall in a screen reader.
   The house pattern is therefore a **two-part twin**: a short `.sr-only`
   summary that always reflects the current render (counts, range, what is
   excluded and why), plus an **on-demand table in a dialog** — a real
   "View as table" button that builds the full table, sorted and `scope`d, only
   when asked. The summary is the always-on obligation; the table is the escape
   hatch. Textual state ("no reported grazing period", "no polygon in this
   vintage") is carried in the table, never by color.
3. **Reduced motion, two layers.** The CSS blanket ships with the kit; JS camera
   moves and paced reveals gate on the core module's `reducedMotion()` — which
   is **live**, not a boot snapshot.
4. **One universal focus ring.** `:focus-visible` ships in the kit. Never write
   per-selector focus rules; a control added later would ship without one. Never
   write `outline: none`.
5. **Touch targets** ≥ 40 px (44 px for close buttons) under
   `@media (hover: none)` — kit components comply; match them in app CSS.
6. **Skip link** on every page; the target container gets
   `id="main" tabindex="-1"`.
7. **`aria-pressed` is the styling source of truth** for toggles — CSS keys off
   `[aria-pressed="true"]`, so the accessible state can never drift from the
   visual state. Pair with swapped `aria-label`s where the action inverts.
8. **Keyboard twin for every pointer gesture.** Click-to-select a county gets a
   focusable route (the search box and the county list are it); hover-only reads
   get a click/focus path. A hover tooltip over canvas is `aria-hidden`
   decoration — the same content must reach AT another way (rule 1 or 2).
9. **Single-character shortcuts require an opt-out** (WCAG 2.1.4): support
   `?kbd=off`, disclose it in the help modal, and re-emit it on pushState so a
   user who needs it doesn't re-add it every visit — but exclude it from shared
   links, since it is the sharer's input preference, not part of the view.
10. **Contrast comments.** Any color that can't be a token — a county stroke
    over a data fill, a label halo — carries a one-line comment naming the
    surface it was measured against and the WCAG criterion.
11. **Decorative elements are `aria-hidden`** — legend swatches, icon SVGs,
    dividers, the banner image inside its labeled link. The adjacent text
    carries the meaning.
12. **Dialogs**: `aria-labelledby`, Esc closes, focus restores to the opener.

---

## 6. Color & CVD policy

Brand tokens are for chrome. **Data always gets its own palette**, chosen under
these rules:

- **Approved ramps**: Crameri scientific colour maps (CVD-safe by construction;
  **`batlow` is the default sequential**) and the colorblind-safe ColorBrewer
  set (`RdBu`, `BrBG`, `YlGnBu`, `YlOrRd`, `Blues`, `PuRd`). **`Spectral` is
  banned** — it traverses red→green and is explicitly not colorblind-safe.
- **Diverging ramps require a labeled midpoint** (0, the median, the
  programmatic threshold). Cyclic ramps are for genuinely cyclic quantities
  only.
- **`romaO` is approved for day-of-year**, which is the one genuinely cyclic
  quantity this fleet maps: a grazing season that starts in December and ends in
  April must not read as the far end of a linear ramp from a season that starts
  in May. A cyclic ramp gets a **month-labeled wheel**, not a bar — the wheel is
  what tells the reader the ends meet. (The grazing-period pilot uses `romaO`
  for season start and end and `batlow` for duration; that pairing is the house
  reference.)
- **Color is never the sole channel** (WCAG 1.4.1). Redundancy options, in
  preference order: text labels in the legend, numeric readouts in the county
  card, position, live-region announcements. On a choropleth the county card is
  usually the cheapest and best redundancy — the number is right there.
- **Prefer lightness-monotonic sequential ramps** — they survive grayscale and
  every CVD type. A hue-only ramp (a categorical eligibility scheme, say) must
  print its category names in the legend, because in grayscale it has no
  information left at all.

---

## 7. Maps

This section is written for this fleet and deliberately diverges from the kit it
is modeled on, which assumes a tiled basemap under station points.

**There is no basemap.** The **FSA county composite is the map**: county
polygons on a brand-cream canvas, state outlines as a mesh above them, nothing
underneath. This is not a simplification, it is the correct read — these apps
show *administrative* units in a *federal program*, and terrain, roads, and
place labels under an eligibility choropleth invite the viewer to interpret a
program boundary as a landscape feature. It also means no tile host in anyone's
CSP, no attribution bar to make accessible, no API key to leak, and no basemap
county layer fighting the app's own county layer.

Alaska, Hawaii, and Puerto Rico arrive as **AlbersUSA-style insets baked into
the geometry** — the archives ship WGS84 lon/lat with those areas already
translated into inset position, so the composite lays out correctly with no
runtime reprojection and no per-app inset code. MapLibre's Mercator is
acceptable precisely because this is a schematic of administrative units, not a
measurement surface. **Rotation and pitch are off** (`NavigationControl` without
the compass, `dragRotate` and `touchZoomRotate` rotation disabled): a rotated
composite is meaningless, and the insets make it actively misleading.

**MapLibre GL 5.x is the house map library**, pinned in the kit's own
`vendor/maplibre-gl-5.18.0/` and loaded as a classic UMD script before the app
module. TopoJSON decoding uses the vendored `topojson-client` 3.1.0.

### County joins use FSA ids — never FIPS

**The topojson's `id` is a 5-character FSA county string** (`"01001"`,
`"16079"`). Join your data to the geometry on **that string**.

> **`parseInt` on a county id is a review-blocker.** So is
> `Number(id)`, so is any arithmetic on it, so is a numeric key in a lookup
> object, and so is `id === 1001`.

Two independent things break when an id becomes a number: leading zeros vanish
(`"01001"` → `1001`), and — worse — the identifier stops being an FSA identifier
at all. **FSA county codes are not FIPS codes.** They coincide for most
counties and diverge exactly where it matters: FSA splits some counties into
several administrative offices that each set their own program dates (East and
West Lucas, Ohio; North and South St. Louis, Minnesota; twelve such FIPS
counties under dd17, nine under dd22), and it merges others — one FSA office in
Palmer, Alaska covers fourteen census areas.

**The motivating incident:** `fsa-lfp-eligibility-web` builds its join key as
`paste0(FIPS State Code, FIPS County Code)` and joins it against
FSA-coded dd17 geometry. Most counties match, so the map draws and looks
right; the ones that don't are silently blank or silently attributed to the
wrong office, and the popup labels the result "FIPS:". **A join that is 97%
correct on a federal eligibility map is a wrong map**, and nothing in the
rendering says so. Re-keying it is step 0 of its migration
([MIGRATING.md](MIGRATING.md)).

The kit's county module joins on the string, and **reports unmatched ids** —
both directions — rather than dropping them. An id in the data with no polygon
is a real fact (the island territories are in neither archive) and it belongs in
the legend or the summary, not in a swallowed `undefined`.

### Boundary vintage follows the program year

| Program year | Vintage |
|---|---|
| ≤ 2014 | **dd17** |
| ≥ 2015 | **dd22** |

**Eight FSA counties changed footprint between the two vintages** — Shoshone,
ID split out of the Benewah and Kootenai offices; Sioux, NE consolidated into
`31165`; King, WA into `53033`; Richmond City, VA out of Henrico — and six codes
map to a different set of FIPS counties in each. **2015 is the switchover**:
`16079` (Shoshone) first appears in the reported data that year, and from then
on `16009`, `16055`, and `16079` all report, which only holds under the dd22
arrangement.

**Never interpolate, never pick one vintage for the whole app.** Drawing a 2011
program year on dd22 boundaries leaves the territory of a since-split county
blank even though its grazing period *was* reported, under the office that then
administered it — a data-availability claim that is simply false. Drawing 2020
on dd17 does the reverse.

**Geometry is fetched at runtime** from the boundary archives' own GitHub Pages
sites — a **named runtime dependency** of every county app in this fleet:

```
https://sustainable-fsa.com/fsa-counties-dd17/fsa-counties-dd17.topojson
https://sustainable-fsa.com/fsa-counties-dd22/fsa-counties-dd22.topojson
```

Same origin as the kit and as the app, so `connect-src 'self'` covers it and no
consumer vendors a copy. One archive, one truth: when the archives are
re-simplified or corrected, every app tracks it without a release. The kit
caches both vintages in-memory per session and swaps between them without
re-fetching.

**`swapVintage` exists because `setData` wipes feature-state.** Hover and
selection styling ride on `map.setFeatureState`, and re-pointing a GeoJSON
source at a different vintage silently drops every state entry, so the last
hovered county keeps its halo forever and the selected county loses its ring.
Call `removeFeatureState(source)` **before** `setData`, then re-apply — the
kit's `swapVintage` encapsulates that whole sequence and is the only sanctioned
way to change vintage.

### Rendering rules

- **Layer order**: county fills → county strokes → state mesh → selection halo →
  labels. Thin lines above fills, always.
- **Paints cannot read CSS custom properties.** MapLibre style values are
  resolved by the GL renderer, not the CSS engine, so `var(--accent)` in a paint
  is simply invalid. Resolve tokens with
  `getComputedStyle(document.documentElement).getPropertyValue('--x')` at
  layer-add time **and again on every theme change** (§4).
- The map container gets **`role="application"`** and a descriptive
  `aria-label`, and it is not the only route to the data (§5.2).
- Zoom floor: the composite always fills the viewport; the kit installs the
  floor and the fit control together.

---

## 8. Process

- **Kit-first.** Style and behavior fixes land in `style`, get a version, and
  flow to apps by version-path bump — never patch a copy in one app. If an app
  needs something the kit doesn't have, it becomes a kit proposal when a second
  property wants it (**admission rule: ≥ 2 Sustainable FSA properties**), and
  stays app-local until then. Migration **back-ports** are different: fixing a
  defect or reconciling drift in code the kit already owns needs only the one
  migrating consumer.
- **Pin by version path.** Consumers load
  `https://sustainable-fsa.com/style/vX.Y.Z/…` by full URL; the path *is* the
  pin. Released directories are immutable and CI re-verifies every byte of them
  on every run (README § Delivery model). A bad release gets a new patch
  version, never an edit.
- **CI is the constitution**: token parity, the contrast matrix, frozen-release
  verification, HTML validity, and axe (serious/critical = failure) must all be
  green to merge.
- **Never edit a published `vX.Y.Z/` or `vendor/<lib>-<version>/` directory.**
  Consumers reference those exact URLs forever.
- Quarto and Jekyll flavors of these tokens are roadmap, not kit
  ([CONSUMERS.md](CONSUMERS.md) § Roadmap). Until they ship, a Quarto report
  that wants the brand reads `tokens/tokens.json` and inlines the values.
