# Consumers

Adoption status of every Sustainable FSA web property. Update this file as apps
migrate; the migration playbook itself is [MIGRATING.md](MIGRATING.md).

Consumer repos move without this file noticing. **Before trusting a row, check
the repo.** "Looks like the house style" and "consumes the kit" are different
states, and the first one silently forks the tokens.

---

## Pick up here

The kit is pre-1.0 and **`fsa-normal-grazing-period` is the pilot** — it is being
built against the kit as the kit is being written, which is deliberate: v0.1.0
ships when the pilot runs on it, and nothing enters the kit that the pilot did
not first prove.

Two things are different about this fleet from the kit's architectural ancestor,
and they set the shape of every migration below:

1. **These are ports, not restyles.** Today's dashboards are Quarto documents
   with Observable JS cells (`*.qmd` → `*.html`), each carrying its own d3 map,
   its own inline legend, and its own copy of the county-join logic. A migration
   replaces that with a single-page app on the kit's modules. The conflict
   matrix in MIGRATING still applies, but it runs against **behavior** — what
   the dashboard does today, param by param — rather than against CSS blocks.
2. **The data contract moves with the port.** A Quarto dashboard reads the
   archive's CSV through `FileAttachment`. A kit app reads a small columnar JSON
   built for the browser (the pilot's is `fsa-ngp-web/1`), which is what makes a
   3,100-county choropleth with a year slider feel instant. Designing that
   payload is part of the migration, not a follow-up.

## Adoption

| Property | Status | Kit surface it needs |
|---|---|---|
| **fsa-normal-grazing-period** | ✅ **Migrated — live on v0.1.0** ([app](https://sustainable-fsa.com/fsa-normal-grazing-period/)) | everything: theme, core, map, county, ui/* |
| **fsa-lfp-eligibility-web** | Next | + categorical legend, dependent controls |
| **fsa-lfp-eligibility** | Next (with the above) | + categorical legend, dependent controls |
| **fsa-lfp-eligibility-derived** | Likely, with its siblings | + a convention comparator |
| **data-portal** | Partial adoption | tokens, navbar, toast, modal, URL state — **no map modules** |
| **usdm-viz** | Partial adoption | tokens, navbar, accessible video shell |

### fsa-normal-grazing-period — the pilot

The FSA Normal Grazing Period archive, 2008–present, keyed on the FSA county.
Its current dashboard (`fsa-normal-grazing-period.qmd`) is the direct ancestor of
the kit's map and county modules: the runtime vintage swap, the cyclic
day-of-year ramp, and the FSA-string-id join all originate here and were
generalized out of it.

- **Data:** `fsa-ngp-web/1` columnar JSON — one array per column, county ids as
  5-character strings, program years as a dense index. Versioned in its own
  right so the app and the archive can move independently.
- **Kept app-local** (per § Kit-deferred): the **month-wheel legend** and the
  **grazing-span chart**. Both are specific to a cyclic seasonal quantity; when
  a second property wants either, they are kit candidates under the admission
  rule.
- **Kit-owned as of the port:** the two-vintage geometry fetch and
  `swapVintage`, the county card, search, PNG export, and the help modal.
- Its `qa-report.txt` names the county-years with no reported period — the app
  must distinguish those from counties with no polygon (HOUSE-STYLE §5.2, §7).

### fsa-lfp-eligibility-web — next, and it starts with a bug fix

The weekly LFP eligibility maps and tables scraped from FSA's portal,
2008–present. **Step 0 of this migration is fixing its county join**, before any
styling work:

- `fsa-lfp-eligibility-web.qmd` builds its key from the **FIPS** state and
  county codes and joins it against **FSA-coded** dd17 geometry:

  ```r
  id = paste0(`FIPS State Code`, `FIPS County Code`)   # wrong key
  ```

  The map draws, most counties match, and the ones that don't are silently
  blank or silently attributed to the wrong FSA office. Its popup even labels
  the value "FIPS:". This is the incident behind
  HOUSE-STYLE §7's review-blocker rule.
- It also draws **every** program year on dd17. The vintage must follow the
  program year (dd17 ≤ 2014, dd22 ≥ 2015).
- Re-key to FSA codes and re-verify county counts per year **first**, on the
  existing dashboard, so the port cannot be blamed for — or hide — a data
  change.

New kit surface this app needs: a **categorical swatch legend** (eligibility
classes are nominal, not a ramp — and being hue-only, they must print their
class names, HOUSE-STYLE §6), and the **dependent radio/select pattern** (choose
pasture type, and the available weeks or drought thresholds change with it) with
its URL-state and a11y contract written once in the kit rather than three times
across the LFP apps.

### fsa-lfp-eligibility — next, with its sibling

The annual county eligibility determinations, 2008–2025, from FOIA. Same shape
of app as `-web`, one time step per program year instead of per week; migrate
the two together so the categorical legend and dependent controls are designed
against both call sites at once (admission rule satisfied on arrival).

### fsa-lfp-eligibility-derived — likely, with its siblings

Recomputed eligibility under **four county-aggregation conventions**. If it gets
a viewer it is the same app again plus a comparator — a fourth radio group,
or a small-multiple. Do not design the comparator until the other two have
shipped; it is the one place a genuinely new component may be justified.

### data-portal — partial adoption, no map

The S3 file explorer at `data.sustainable-fsa.com`. Single self-contained
`index.html`; it takes tokens, the navbar and banner lockup, toasts, and the
modal shell so it stops being visually foreign to the rest of the fleet. **No
map modules, no county module.**

Two deliberate deviations to record rather than fix: its routing is **hash-based**
(`#/<prefix>/`) because CloudFront serves one root object with no URL rewriting,
so the kit's query-param URL-state helpers do not apply to navigation; and it is
served from a different origin (`data.sustainable-fsa.com`), so it loads the kit
cross-origin — which works (Pages sends `access-control-allow-origin: *`) but
means the theme choice in `sfsa-theme` localStorage does **not** follow the user
between it and the `sustainable-fsa.com` apps. Don't paper over that; note it.

### usdm-viz — partial adoption, and mostly an a11y fix

Two pages, each a bare `<video controls>` with a `100vh` inline style, no title,
no page chrome, and no text alternative for a twenty-five-year animated drought
record. It needs tokens, the navbar with the banner lockup, the page-title
convention, and the kit's **accessible video shell**: a real `<h1>`, a caption
or transcript link, `preload` and poster handling, and the reduced-motion gate
(an autoplaying animation is exactly what `prefers-reduced-motion` is for). The
video shell enters the kit only once both pages use it — which they will, so it
qualifies on arrival.

## Page titles

`<Short name> · Sustainable FSA` — rule and reasoning in HOUSE-STYLE §1.
`og:site_name` takes **`Sustainable FSA` alone**. Apply on migration.

| Property | `<title>` and card title | `og:site_name` |
|---|---|---|
| fsa-normal-grazing-period | **Grazing Periods · Sustainable FSA** | Sustainable FSA |
| fsa-lfp-eligibility-web | **LFP Eligibility · Sustainable FSA** | Sustainable FSA |
| fsa-lfp-eligibility | **LFP Determinations · Sustainable FSA** | Sustainable FSA |
| fsa-lfp-eligibility-derived | **LFP Reanalysis · Sustainable FSA** | Sustainable FSA |
| data-portal | **Data Portal · Sustainable FSA** | Sustainable FSA |
| usdm-viz | **Drought Animations · Sustainable FSA** | Sustainable FSA |

## Kit-deferred pieces (keep app-local; do NOT extract)

- **The month-wheel legend** (`fsa-normal-grazing-period`) — a cyclic legend
  with month labels around a ring. Correct for day-of-year, meaningless for
  anything else in the fleet so far.
- **The grazing-span chart** — the horizontal start→end bar for a selected
  county across years. It is the pilot's second data view, and its second call
  site does not exist yet.

Each becomes a kit proposal the moment a second property wants it. If a
migration makes one converge naturally, propose it as a kit MINOR — that is the
intended path to absorption.

## Roadmap (not designed — do not build ahead of a decision)

- **Quarto SCSS brand flavor.** The method reports (`era5-normal-grazing-period`,
  `nclimgrid-normal-grazing-period`, and the archive `.qmd`s) render with stock
  Quarto styling. A brand SCSS layer generated from `tokens/tokens.json` would
  cover all of them. Not designed; until it exists, a report that wants the
  brand reads the tokens and inlines the values.
- **Jekyll remote theme.** Roughly fifteen archive repos publish their README
  through `remote_theme: jekyll/minima`. A `sustainable-fsa/jekyll-theme` built
  on these tokens would rebrand the entire archive fleet with a one-line
  `_config.yml` change each. This is the highest-leverage item on the list and
  the least specified.
- **`tokens.json` → Tailwind.** The project site (`sustainable-fsa.github.io`)
  hard-codes terracotta, sage, ochre, and cream in `tailwind.config.js`.
  Generating that block from `tokens/tokens.json` makes the kit the single
  source and retires a real drift risk — the site and the kit already disagree
  the moment either is edited alone.

## Migration mechanics

**Start with [MIGRATING.md](MIGRATING.md)** — the full playbook, written for a
session starting fresh in the consumer's repo. Quick reference:

**Selector map** (kit classes replace per-app ids):

| App selector | Kit selector |
|---|---|
| `#navbar` | `.sfsa-navbar` |
| `#toast` | `.sfsa-toast` |
| `#tooltip` | `.sfsa-tooltip` |
| `#info-modal` / `#help` | `.sfsa-modal` + `initInfoModal` |
| `#btn-info` | `.nav-btn.sfsa-btn-info` |
| legend / panel shells | `.sfsa-panel` + `initCollapsible` |
| county detail panel | `.sfsa-card` (bottom sheet on compact) |
| search field + dropdown | `.sfsa-combobox` (+ `.sfsa-search-collapse` / `.sfsa-search-toggle`) |
| drawer scrim | `.sfsa-scrim` |

**Checklist per app:**

1. Fix the county join first if it is wrong (`-web`), and verify per-year county
   counts against the archive before anything else moves.
2. Build the browser data payload; version it (`<app>/1`).
3. Copy `snippets/head.html`; inline `snippets/anti-flash.html`; recompute its `sha256` from
   your own page; add `viewport-fit=cover`.
4. Compose the page from kit components (navbar + banner lockup, panels, county
   card, legend, help modal); keep app-specific layout CSS local and tokenized.
5. Wire state through the kit's URL-state helpers: year, type, county FSA id,
   variable, camera, theme.
6. Apply the a11y quick-checks: skip link, `<main id="main" tabindex="-1">`,
   live region, sr summary + on-demand table, reduced-motion gates, touch
   targets, `?kbd=off` where a single-char shortcut exists.
7. Apply the page-title row above.
8. Add the house-style pointer block (AGENTS.md § consuming) to the app's
   `CLAUDE.md`, naming the pinned kit version.
9. Verify per MIGRATING § Verification, then update this file's row.
