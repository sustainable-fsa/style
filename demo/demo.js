/* ============================================================================
   sustainable-fsa/style · demo/demo.js
   The kit's component gallery, and its axe / html-validate target.

   THE DEMO IS COVERAGE (AGENTS.md §8). Every component and every exported
   entry point the kit ships is exercised here, in a browser, in both themes,
   at every breakpoint — because tools/a11y-audit.mjs audits this page and
   nothing else. A component that is not on this page is a component no gate
   has ever looked at.

   This file is a CONSUMER of the kit, written the way an app should be, with
   two deliberate differences:

     1. Imports are RELATIVE ('../core/core.js'), because this page develops
        against the working tree. A real app imports full versioned URLs
        (https://sustainable-fsa.com/style/vX.Y.Z/core/core.js) — see
        snippets/head.html and README § Delivery model.
     2. It shows several things at once that an app would choose between (both
        legend forms, a static tooltip specimen and a live one), and it keeps
        an obviously fake fixture list around so the search still works when
        the boundary archive is unreachable.

   Everything else — the URL-state convention, the app-prefixed localStorage
   namespace, the live region, the ?kbd=off opt-out, the FSA-string county ids,
   the vintage rule — is house style, followed exactly.
   ========================================================================== */

import {
  KIT_VERSION, createLiveRegion, getParamLower, getTheme, initCollapsible,
  initSearchCollapse, initThemeToggle, reducedMotion, replaceUrlState,
  showToast, urlParams, viewport,
} from '../core/core.js';
import {
  COMPOSITE_BOUNDS, addFitControl, addNavigation, cameraParamsIfDefault,
  createCompositeMap, installZoomFloor, resolveToken,
} from '../map/map.js';
import {
  BOUNDARY_URLS, addCountyLayers, countyCentroid, initCountyTooltip,
  loadCounties, searchItems, vintageForYear,
} from '../county/county.js';
import { initDetailCard } from '../ui/card.js';
import { colorbar, swatches } from '../ui/legend.js';
import { initSearchBox } from '../ui/search.js';
import { initHelpModal } from '../ui/help.js';
import { captureCompositeMap, composeBranded } from '../ui/export.js';

const $ = (id) => document.getElementById(id);

/* localStorage namespace. Everything an app writes is app-prefixed and
   re-validated on read; only 'sfsa-theme' is shared org-wide (core owns it). */
const STORE = 'sfsa-styledemo-';

/* ── The demo's data palette ─────────────────────────────────────────────────
   DATA-ENCODING LITERALS, NOT CHROME. Two separate reasons they are literals
   and not tokens: a MapLibre paint cannot resolve var(--sage) (the GL renderer
   never sees the CSS engine), and a data palette must not theme-swap anyway —
   a county's colour means something, and it has to mean the same thing in both
   themes (HOUSE-STYLE §6, ui/legend.js rule 3).

   The four values happen to be the light theme's --sage, --ochre-dark,
   --accent-light and --sage-dark, frozen here as a categorical scheme. The
   grouping itself is arbitrary — this is a component gallery, not a map of
   anything — which is why the legend prints the group NAMES: a hue-only
   categorical scheme carries no information at all in grayscale. */
const GROUP_FILLS = [
  { color: '#6B8E5A', label: 'State group A' },
  { color: '#8a6620', label: 'State group B' },
  { color: '#cf5a26', label: 'State group C' },
  { color: '#52704a', label: 'State group D' },
];

/* Crameri batlow, the house default sequential ramp (CVD-safe by construction,
   lightness-monotonic, so it survives grayscale). Five anchors approximating
   the published table, interpolated in sRGB for the specimen bar; a real app
   ships the full table rather than eyeballing it. Data, not chrome. */
const BATLOW_ANCHORS = ['#011959', '#1B6C6B', '#5F8A38', '#D69B41', '#FACCFA'];

/** An id that is in plenty of federal datasets and in NEITHER boundary archive
    (St. Thomas, U.S. Virgin Islands). It rides along in every recolor so the
    demo can show what county.js does with an unmatched id: hand it back, never
    swallow it. An unexplained entry in that list is what a FIPS-keyed join
    looks like from the outside. */
const UNMATCHED_PROBE = '78030';

const DEFAULT_YEAR = 2023;
const YEAR_MIN = 2010;
const YEAR_MAX = 2026;

/* ── Fixture rows for the combobox ───────────────────────────────────────────
   Thirty-one obviously-fake-but-plausible rows so the search works before the
   geometry arrives (and when it never does — CI has no boundary archive).
   Replaced by the real county list at first decode. Ids are 5-CHARACTER
   STRINGS with their leading zeros intact; the diacritics are here on purpose,
   because the matcher folds them (type "dona" and find "Doña Ana"), and the
   split/merged offices are here because they are the reason this fleet keys on
   FSA codes rather than FIPS. */
const FIXTURE_COUNTIES = [
  { id: '01001', label: 'Autauga, Alabama', code: '01001' },
  { id: '01003', label: 'Baldwin, Alabama', code: '01003' },
  { id: '02001', label: 'Palmer, Alaska', code: '02001' },
  { id: '02013', label: 'Aleutians East, Alaska', code: '02013' },
  { id: '04001', label: 'Apache, Arizona', code: '04001' },
  { id: '06085', label: 'Santa Clara, California', code: '06085' },
  { id: '08065', label: 'Lake, Colorado', code: '08065' },
  { id: '12086', label: 'Miami-Dade, Florida', code: '12086' },
  { id: '15005', label: 'Kalawao, Hawaii', code: '15005' },
  { id: '16007', label: 'Bear Lake, Idaho', code: '16007' },
  { id: '16009', label: 'Benewah, Idaho', code: '16009' },
  { id: '16055', label: 'Kootenai, Idaho', code: '16055' },
  { id: '16079', label: 'Shoshone, Idaho', code: '16079' },
  { id: '24033', label: "Prince George's, Maryland", code: '24033' },
  { id: '27095', label: 'Mille Lacs, Minnesota', code: '27095' },
  { id: '27137', label: 'St. Louis North, Minnesota', code: '27137' },
  { id: '27138', label: 'St. Louis South, Minnesota', code: '27138' },
  { id: '30111', label: 'Yellowstone, Montana', code: '30111' },
  { id: '31165', label: 'Sioux, Nebraska', code: '31165' },
  { id: '35001', label: 'Bernalillo, New Mexico', code: '35001' },
  { id: '35013', label: 'Doña Ana, New Mexico', code: '35013' },
  { id: '35039', label: 'Río Arriba, New Mexico', code: '35039' },
  { id: '38045', label: 'LaMoure, North Dakota', code: '38045' },
  { id: '39095', label: 'Lucas East, Ohio', code: '39095' },
  { id: '39196', label: 'Lucas West, Ohio', code: '39196' },
  { id: '46102', label: 'Oglala Lakota, South Dakota', code: '46102' },
  { id: '46137', label: 'Ziebach, South Dakota', code: '46137' },
  { id: '49035', label: 'Salt Lake, Utah', code: '49035' },
  { id: '51159', label: 'Richmond City, Virginia', code: '51159' },
  { id: '53033', label: 'King, Washington', code: '53033' },
  { id: '72097', label: 'Mayagüez, Puerto Rico', code: '72097' },
];

/* ── Boot state, read once with URL > storage > default precedence ────────── */

const params = urlParams();
const FILL_MODES = ['groups', 'single', 'none'];
const VINTAGE_MODES = ['auto', 'dd17', 'dd22'];

const urlFill = getParamLower('fill', params);
let fillMode = FILL_MODES.includes(urlFill) ? urlFill : 'groups';

const urlVintage = getParamLower('vintage', params);
let vintageMode = VINTAGE_MODES.includes(urlVintage) ? urlVintage : 'auto';

const rawYear = params.get('year');
let year = (/^\d{4}$/.test(rawYear || '') && Number(rawYear) >= YEAR_MIN && Number(rawYear) <= YEAR_MAX)
  ? Number(rawYear) : DEFAULT_YEAR;

/* A county id is a 5-CHARACTER STRING. It is validated as one and it stays one
   — no parseInt, no Number(), nothing that could turn '01001' into 1001
   (AGENTS.md §10). */
const rawCounty = params.get('county');
let pendingCounty = /^[0-9]{5}$/.test(rawCounty || '') ? rawCounty : null;

/* Did the URL name a camera? map.js honours ?lng&lat&zoom only when all three
   parse, and if it did, the first decode must NOT re-frame the map under a
   reader who arrived at a specific view. */
const BOOT_CAMERA = ['lng', 'lat', 'zoom']
  .every((k) => Number.isFinite(parseFloat(params.get(k))));

/* WCAG 2.1.4: the '/' shortcut is a single printable character, so it needs an
   opt-out. ?kbd=off is re-emitted on pushState (it is the reader's input
   preference, and re-adding it every visit is the bug this prevents). */
const KBD_ON = getParamLower('kbd', params) !== 'off';

let map = null;
let fitCtl = null;
let zoomFloor = null;
let counties = null;      // the loadCounties() result
let handle = null;        // the addCountyLayers() handle
let vintage = null;       // 'dd17' | 'dd22'
let selectedId = null;
let lastColors = new Map();
let fitOpts = { padding: 24, animate: false };
let degraded = false;
let loadToken = 0;

/* ── Live region + version stamp ─────────────────────────────────────────── */

const live = createLiveRegion();
$('kit-version').textContent = 'v' + KIT_VERSION;

/* ── URL state ───────────────────────────────────────────────────────────────
   Mirror the whole view back on every mutation and on moveend. An all-defaults
   view emits a CLEAN URL — nothing but the pathname — which is why every line
   below is conditional and why the camera goes through cameraParamsIfDefault.

   KNOWN KIT ISSUE, reported not worked around: cameraParamsIfDefault() decides
   "is this the default pose?" by asking map.cameraForBounds(), which does NOT
   apply the maxBounds cage that createCompositeMap() installs. On a wide, short
   map container — the shape of every county map in this fleet — the cage
   constrains the real camera to a higher zoom than cameraForBounds reports
   (measured here: 3.385 against 2.922), so the default view never compares
   equal and ?lng&lat&zoom is emitted even before anyone has touched the map.
   Masking it from the demo (a looser eps, a wider maxBoundsPadDeg) would hide
   the one page most likely to surface it. */

function currentBounds() {
  return counties ? counties.bounds : COMPOSITE_BOUNDS;
}

function pushState() {
  const p = {};
  if (getTheme() !== 'light') p.theme = getTheme();
  if (year !== DEFAULT_YEAR) p.year = String(year);
  if (fillMode !== 'groups') p.fill = fillMode;
  if (vintageMode !== 'auto') p.vintage = vintageMode;
  if (selectedId) p.county = selectedId;
  if (!KBD_ON) p.kbd = 'off';
  if (map) Object.assign(p, cameraParamsIfDefault(map, { bounds: currentBounds(), fitOpts }));
  replaceUrlState(p);
}

/* ── Theme toggle ────────────────────────────────────────────────────────── */

initThemeToggle({
  button: $('btn-theme'),
  onChange: (theme) => {
    // MapLibre paints are resolved by the GL renderer, not the CSS engine, so
    // a theme flip that only swaps data-theme leaves the map in the old
    // palette. This is the whole reason applyThemePaints exists.
    if (handle) handle.applyThemePaints();
    live.announce('Theme: ' + theme);
    pushState();
  },
});

/* ── Viewport / motion status ────────────────────────────────────────────── */

function renderViewportStatus() {
  $('vp-status').textContent =
    `compact: ${viewport.isCompact()} · touch: ${viewport.isTouch()} · `
    + `reduced motion: ${reducedMotion()} · `
    + `single-key shortcuts: ${KBD_ON ? 'on — press / to search' : 'off (?kbd=off)'}`;
}
viewport.onChange(renderViewportStatus);
renderViewportStatus();

/* ── Toast ───────────────────────────────────────────────────────────────── */

const toastMessage = 'Toast: .sfsa-toast, announced politely, gone in 2.8 s.';
$('btn-toast').addEventListener('click', () => showToast(toastMessage));
$('btn-toast-section').addEventListener('click', () => showToast(toastMessage));

/* ── Collapsible panel ───────────────────────────────────────────────────── */

initCollapsible({
  toggle: $('demo-panel-toggle'),
  body: $('demo-panel-body'),
  storageKey: STORE + 'panel',
  autoCollapseOnCompact: true,
});

/* ── Detail card ─────────────────────────────────────────────────────────────
   One card, docked over the map, opened from three routes: the buttons in the
   gallery, a click on the canvas, and a search selection. */

const card = initDetailCard({
  card: $('county-card'),
  closeBtn: $('county-card-close'),
  onClose: () => {
    selectedId = null;
    if (handle) handle.setSelected(null);
    pushState();
  },
});

function fillCard(id) {
  if (!id) {
    $('county-card-title').textContent = 'Detail card';
    $('cc-id').textContent = '—';
    $('cc-state').textContent = '—';
    $('cc-vintage').textContent = vintage || '—';
    $('cc-group').textContent = '—';
    $('cc-note').textContent = 'This is the empty shell. Click a county on the map, '
      + 'or find one in the navbar search, to fill it.';
    return;
  }
  const name = counties && counties.names.get(id);
  $('county-card-title').textContent = name ? `${name.county}, ${name.state}` : id;
  $('cc-id').textContent = id;                       // the string, verbatim
  $('cc-state').textContent = name ? name.state : '—';
  $('cc-vintage').textContent = `${vintage} · program year ${year}`;
  $('cc-group').textContent = fillMode === 'none' ? 'no data (fill off)'
    : GROUP_FILLS[fillMode === 'single' ? 0 : groupIndex(id)].label;
  $('cc-note').textContent = 'On a real map this readout is the choropleth’s redundancy '
    + 'channel: the number is right here, so colour is never the only channel.';
}

$('btn-card-open').addEventListener('click', () => { fillCard(null); card.open(); });
$('btn-card-close').addEventListener('click', () => card.close());
$('btn-clear').addEventListener('click', () => {
  card.close();
  if (handle) handle.setSelected(null);
  selectedId = null;
  live.announce('Selection cleared.');
  pushState();
});

/* ── Scrim ───────────────────────────────────────────────────────────────────
   The dimming layer for an off-canvas drawer. The kit ships the surface, not
   the drawer (no second property needs one yet — AGENTS.md §5), so the demo
   raises it on its own to keep the class covered.

   It is aria-hidden decoration: it dims the page, it says nothing, and it
   contains nothing focusable. Dismissal has TWO routes on purpose — a pointer
   click on the scrim, and Escape — because the button that raised it is now
   underneath it, and a pointer-only dismissal would be a keyboard trap. */

let scrim = null;

function onScrimKey(e) {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  // ONE ESCAPE DISMISSES ONE LAYER, top down. The card sits a tier above the
  // scrim (--z-detail 60 over --z-map-panel 40), so while it is open it owns
  // the key and the scrim waits its turn.
  //
  // This listener therefore runs in the CAPTURE phase. Two reasons, and both
  // are needed: ui/card.js registers its document-level Escape handler at boot,
  // so a bubble-phase listener added later would run AFTER the card had already
  // closed itself and would read isOpen() as false — dismissing two layers on
  // one key. And ui/card.js READS defaultPrevented (yielding to ui/search.js)
  // but never SETS it, so there is no flag to test after the fact either.
  // Capturing first lets the demo see the true state and stand down.
  if (card.isOpen()) return;
  e.preventDefault();
  hideScrim();
}

function hideScrim() {
  if (!scrim) return;
  scrim.remove();
  scrim = null;
  document.removeEventListener('keydown', onScrimKey, true);
  $('btn-scrim').focus();
}

$('btn-scrim').addEventListener('click', () => {
  if (scrim) { hideScrim(); return; }
  scrim = document.createElement('div');
  scrim.className = 'sfsa-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  scrim.addEventListener('click', hideScrim);
  document.body.appendChild(scrim);
  document.addEventListener('keydown', onScrimKey, true);
  showToast('Scrim raised — click it, press Escape, or press the button again.');
});

/* ── Legends ─────────────────────────────────────────────────────────────── */

/** Interpolate the anchor ramp to n stops. Plain sRGB lerp — good enough for a
    specimen bar, and the point here is the legend component, not the ramp.

    (The parseInt below reads a HEX COLOUR CHANNEL. The ban in AGENTS.md §10 is
    on parsing county IDS, which are 5-character strings and stay that way; a
    colour is a number by definition.) */
function rampStops(n) {
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const anchors = BATLOW_ANCHORS.map(rgb);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (n === 1) ? 0 : (i / (n - 1)) * (anchors.length - 1);
    const lo = Math.min(Math.floor(t), anchors.length - 2);
    const f = t - lo;
    out.push(hex(anchors[lo].map((v, k) => v + (anchors[lo + 1][k] - v) * f)));
  }
  return out;
}

/* "No data" is a category, not an absence. The chip colour is a var() on
   purpose: --no-data is CHROME (it is the fill for "we have nothing"), so
   unlike the ramp it does follow the theme, and passing the token keeps the
   legend chip and the map polygon in step without a repaint hook. */
const NO_DATA_ROW = { color: 'var(--no-data)', label: 'No reported determination' };

const bar = colorbar($('legend-colorbar'), rampStops(24), {
  title: `Grazing period length · ${year}`,
  ticks: [
    { at: 0, label: '30 d' },
    { at: 0.5, label: '150 d' },
    { at: 1, label: '270 d' },
  ],
  textKey: 'Lighter counties graze longer. The exact number of days is in the county card — '
    + 'the bar is a guide, never the answer.',
  noData: NO_DATA_ROW,
});

const swatchLegend = swatches($('legend-swatches'), GROUP_FILLS, {
  title: 'County fill',
  noData: NO_DATA_ROW,
});

function syncSwatchLegend() {
  swatchLegend.update(
    fillMode === 'groups' ? GROUP_FILLS
      : fillMode === 'single' ? [GROUP_FILLS[0]]
        : [],
  );
}

/* ── Search combobox ─────────────────────────────────────────────────────── */

const searchInput = $('demo-search');

const searchBox = initSearchBox({
  input: searchInput,
  dropdown: $('demo-results'),
  items: FIXTURE_COUNTIES,
  /* Six, not the default twelve: twelve rows overflow the flyout's max-height
     and turn it into a scrollable region with no keyboard route of its own
     (axe: scrollable-region-focusable). The counted overflow row reports the
     rest, and the announce() below carries the UNCAPPED total to AT. */
  maxResults: 6,
  renderRow: (item, i, li) => {
    // Nodes, never an HTML string: nothing on this page hands markup to a
    // parser that it did not build itself.
    const label = document.createElement('span');
    label.textContent = item.label;
    const code = document.createElement('span');
    code.className = 'option-sub';
    code.textContent = item.code;
    li.append(label, code);
  },
  onSelect: (item) => {
    $('search-result').textContent = `Picked ${item.label} (FSA ${item.code}).`;
    if (handle && counties && counties.index.has(item.id)) {
      openCounty(item.id, { fly: true });
    } else {
      live.announce(`${item.label} selected. The map has no geometry loaded, so nothing moved.`);
    }
  },
  announce: live.announce,
});

const searchCtl = initSearchCollapse({
  wrap: $('search-wrap'),
  toggle: $('btn-search-toggle'),
  input: searchInput,
  onClose: () => searchBox.close(),
});

searchInput.addEventListener('keydown', (e) => {
  // ESCAPE PRECEDENCE, the other half of ui/search.js's contract: when the
  // dropdown is open it consumes Escape (preventDefault + stopPropagation) and
  // this must not also fire. One Escape dismisses exactly one layer.
  if (e.key === 'Escape' && !e.defaultPrevented && searchCtl.isOpen()) searchCtl.close();
});

if (KBD_ON) {
  window.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    if (searchCtl.isCollapsed()) searchCtl.open();
    else { searchInput.focus(); searchInput.select(); }
  });
}

/* ── Help modal ──────────────────────────────────────────────────────────────
   Repo-authored markdown only (AGENTS.md §12): help-demo.md ships in this
   directory and is reviewed like any other source file. No firstVisitKey — a
   gallery that opens a modal at you on arrival is a gallery nobody reads. */

const help = initHelpModal({
  dialog: $('help-modal'),
  trigger: $('btn-info'),
  url: 'help-demo.md',
  fallbackHTML: '<p>The help copy could not be loaded. Serve the repository over HTTP '
    + '(<code>python3 -m http.server</code>) rather than opening the file directly — '
    + '<code>file://</code> blocks the fetch.</p>',
});
$('btn-modal').addEventListener('click', () => help.open());

/* ── Navbar controls ─────────────────────────────────────────────────────── */

const yearInput = $('demo-year');
const yearOut = $('demo-year-out');
yearInput.value = String(year);
yearOut.textContent = String(year);

yearInput.addEventListener('input', () => {
  year = Number(yearInput.value);          // a PROGRAM YEAR is a number …
  yearOut.textContent = String(year);
  bar.update(undefined, { title: `Grazing period length · ${year}` });
  if (selectedId) fillCard(selectedId);
  // … and it is the only thing that picks the vintage: dd17 for ≤2014, dd22
  // for ≥2015, never interpolated and never one vintage for a whole app.
  loadVintage();
  updateSummary();
  pushState();
});

const vintageSelect = $('demo-vintage');
vintageSelect.value = vintageMode;
vintageSelect.addEventListener('change', () => {
  vintageMode = VINTAGE_MODES.includes(vintageSelect.value) ? vintageSelect.value : 'auto';
  loadVintage();
  pushState();
});

const segButtons = Array.from(document.querySelectorAll('[data-fill]'));
function syncSegs() {
  segButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fill === fillMode)));
}
segButtons.forEach((b) => b.addEventListener('click', () => {
  fillMode = b.dataset.fill;
  syncSegs();
  syncSwatchLegend();
  paint();
  if (selectedId) fillCard(selectedId);
  live.announce('County fill: ' + fillMode);
  pushState();
}));
syncSegs();
syncSwatchLegend();

$('btn-fit').addEventListener('click', () => {
  if (!map) return;
  // Reduced motion is read AT CLICK TIME, not at wiring time — the reader can
  // flip the OS setting mid-session (WCAG 2.3.3).
  map.fitBounds(currentBounds(), { ...fitOpts, animate: !reducedMotion() });
});

/* ── The county map ──────────────────────────────────────────────────────────
   Everything below is wrapped so that a failed boundary fetch, a missing WebGL
   context, or a blocked network degrades to a visible note and leaves the rest
   of the gallery intact. CI must be able to audit this page on a runner with
   no GPU and no route to the boundary archive. */

function degrade(message, err) {
  if (err) console.warn('[demo] the map is unavailable:', err);
  if (degraded) return;
  degraded = true;
  $('map-note').textContent = 'Map unavailable.';
  // .static stops the liveness pulse: the refresh dot claims the view is live,
  // and once the map is gone it is not.
  $('refresh-status').classList.add('static');
  const note = document.createElement('p');
  note.className = 'demo-error';
  note.textContent = message;
  $('map-wrap').insertAdjacentElement('afterend', note);
  live.announce('The county map is unavailable. ' + message);
}

/** Group a county by the first two characters of its id — the 2-character
    State FSA code. String arithmetic only: charCodeAt reads characters, and
    nothing here ever coerces an id to a number. */
function groupIndex(id) {
  const state = String(id).slice(0, 2);
  let sum = 0;
  for (let i = 0; i < state.length; i++) sum += state.charCodeAt(i);
  return sum % GROUP_FILLS.length;
}

function colorsForCurrentFill() {
  const colors = new Map();
  if (!counties) return colors;
  if (fillMode !== 'none') {
    counties.index.forEach((feature, id) => {
      colors.set(id, fillMode === 'single' ? GROUP_FILLS[0].color : GROUP_FILLS[groupIndex(id)].color);
    });
  }
  // The ringer. See UNMATCHED_PROBE.
  colors.set(UNMATCHED_PROBE, GROUP_FILLS[0].color);
  return colors;
}

/* The unmatched list is remembered, so a summary refresh that has no new
   recolor behind it (the year slider, say) cannot quietly report "none" and
   un-say what the last real render found. */
let lastUnmatched = [];

function updateSummary(unmatched = lastUnmatched) {
  lastUnmatched = unmatched;
  if (!counties) return;
  const n = counties.index.size;
  const groups = fillMode === 'groups' ? GROUP_FILLS.length : fillMode === 'single' ? 1 : 0;
  const missing = unmatched.length ? unmatched.join(', ') : 'none';
  // The always-on half of the hidden-table twin: a short summary that always
  // reflects the current render (HOUSE-STYLE §5.2). The on-demand full table
  // is the app's obligation — this gallery has no data worth tabulating.
  $('sr-summary').textContent =
    `${n} counties drawn on ${vintage} boundaries for program year ${year}, `
    + `in ${groups} colour group${groups === 1 ? '' : 's'}. `
    + `Ids in the demo data with no polygon in this vintage: ${missing}.`;
  $('map-note').textContent =
    `${n} counties · ${vintage} · program year ${year} · fill: ${fillMode} · `
    + `unmatched ids: ${missing}`;
}

function paint() {
  if (!handle) return;
  const colors = colorsForCurrentFill();
  // recolor() REPORTS the ids it could not place rather than swallowing them.
  // Expect the probe; investigate anything else, because that is what a
  // FIPS-keyed join looks like from the outside.
  const unmatched = handle.recolor(colors);
  lastColors = colors;
  updateSummary(unmatched);
  // Render evidence for CI (tools/a11y-audit.mjs reports it; it is deliberately
  // not a gate, because the map needs a network and a GL context and the
  // accessibility of the rest of this page does not).
  document.documentElement.dataset.demoReady = '1';
}

function openCounty(id, { fly = false, focus = true } = {}) {
  if (!handle || !counties.index.has(id)) return;
  selectedId = id;
  handle.setSelected(id);       // filter-driven: survives a recolor untouched
  fillCard(id);
  card.open({ focus });
  const name = counties.names.get(id);
  live.announce(`${name ? name.county + ', ' + name.state : id} selected.`);
  if (fly && map) {
    // countyCentroid wants the feature from the INDEX, not from
    // queryRenderedFeatures — a rendered feature is clipped to its tile.
    const centre = countyCentroid(counties.index.get(id));
    if (centre) {
      map.easeTo({
        center: centre,
        zoom: Math.max(map.getZoom(), 5),
        duration: reducedMotion() ? 0 : 600,
      });
    }
  }
  pushState();
}

async function loadVintage() {
  if (!map) return;
  const want = (vintageMode === 'auto') ? vintageForYear(year) : vintageMode;
  if (want === vintage) return;
  const token = ++loadToken;
  $('map-note').textContent = `Loading ${want} boundaries…`;

  let next;
  try {
    next = await loadCounties(want);
  } catch (err) {
    if (token !== loadToken) return;
    degrade(`The ${want} boundary archive could not be reached (${BOUNDARY_URLS[want]}). `
      + 'Everything above still works — the map is the only part of this page that needs '
      + 'the network.', err);
    return;
  }
  if (token !== loadToken) return;          // a later change won the race

  counties = next;
  vintage = want;

  if (!handle) {
    handle = addCountyLayers(map, counties);
    initCountyTooltip(map, handle, {
      render: (feature, id) => {
        const name = counties.names.get(id);
        return {
          name: name ? `${name.county}, ${name.state}` : id,
          sub: 'FSA ' + id,
          val: fillMode === 'none' ? 'no fill'
            : GROUP_FILLS[fillMode === 'single' ? 0 : groupIndex(id)].label,
        };
      },
      onClick: (id) => openCounty(id),
    });
  } else {
    // The ONLY sanctioned vintage change: it wipes feature state first, so the
    // footprints that differ between dd17 and dd22 cannot keep the old
    // vintage's colour.
    handle.swapVintage(counties);
  }

  // Both the fit control and the zoom floor capture `bounds` when they are
  // installed, so re-arming them against the decoded geometry means replacing
  // them, not just calling refresh(). counties.bounds is recomputed from the
  // features and is the authority; COMPOSITE_BOUNDS was only a boot-time
  // stand-in for the frames before this.
  if (fitCtl) map.removeControl(fitCtl);
  fitCtl = addFitControl(map, {
    bounds: counties.bounds,
    fitOpts,
    onBeforeFit: () => card.close(),
  });
  if (zoomFloor) zoomFloor.dispose();
  zoomFloor = installZoomFloor(map, {
    bounds: counties.bounds,
    fitOpts,
    // App policy: don't yank the camera out from under an open county.
    onBeforeSnap: () => (card.isOpen() ? false : undefined),
  });
  zoomFloor.refresh();

  // Re-frame on the decoded geometry — unless the reader arrived with a camera
  // in the URL, which they chose and we don't get to overrule. Without this the
  // camera stays at the COMPOSITE_BOUNDS boot fit while every later comparison
  // is against counties.bounds, so cameraParamsIfDefault would never recognise
  // the default view and the "all defaults ⇒ clean URL" rule would never hold.
  if (!BOOT_CAMERA) map.fitBounds(counties.bounds, { ...fitOpts, animate: false });

  searchBox.refresh(searchItems(counties));
  $('search-result').textContent =
    `Search now covers ${counties.index.size} ${vintage} counties (the fixture list is gone).`;
  paint();

  if (pendingCounty) {
    const id = pendingCounty;
    pendingCounty = null;
    // A deep link opens the card WITHOUT stealing focus — the reader asked for
    // a county, not for their cursor to be moved.
    if (counties.index.has(id)) openCounty(id, { focus: false });
  }
  $('btn-fit').disabled = false;
}

try {
  const created = createCompositeMap({ container: 'map', bounds: COMPOSITE_BOUNDS, params });
  map = created.map;
  fitOpts = created.fitOpts;

  addNavigation(map);
  // Installed before any geometry so the controls exist even if the fetch
  // fails; re-armed against counties.bounds once it lands.
  fitCtl = addFitControl(map, { bounds: COMPOSITE_BOUNDS, fitOpts });
  zoomFloor = installZoomFloor(map, { bounds: COMPOSITE_BOUNDS, fitOpts });

  map.on('load', () => {
    zoomFloor.refresh();     // cameraForBounds needs a laid-out container
    loadVintage();
  });
  map.on('moveend', pushState);
  map.on('error', (e) => console.warn('[demo] maplibre:', e && e.error ? e.error.message : e));
} catch (err) {
  degrade('MapLibre could not create a WebGL context here. The rest of the gallery is '
    + 'unaffected — only this section needs the GPU.', err);
}

/* ── Branded PNG export ──────────────────────────────────────────────────── */

$('btn-export').addEventListener('click', async () => {
  if (!handle || !counties) {
    showToast('The county composite has not loaded — nothing to export.', 3500);
    return;
  }
  const btn = $('btn-export');
  btn.disabled = true;
  showToast('Rendering the export…', 4000);
  try {
    const { canvas, dispose } = await captureCompositeMap({
      bounds: counties.bounds,
      build: async (offscreen) => {
        // The off-screen map is a throwaway with its own sources and layers:
        // rebuild the composite on it, then let the rAF-coalesced recolor land
        // before capture waits for idle.
        const offHandle = addCountyLayers(offscreen, counties);
        offHandle.recolor(lastColors);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      },
    });
    const blob = await composeBranded(canvas, {
      title: `Kit demo · FSA county composite · ${year}`,
      subtitle: `${vintage} boundaries · arbitrary state groups · fill: ${fillMode}`,
      credit: `Sustainable FSA · sustainable-fsa.com · style kit v${KIT_VERSION} · CC BY 4.0`,
      drawLegend: drawExportLegend,
    });
    dispose();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfsa-kit-demo-${year}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showToast('Export written.');
    live.announce('Branded PNG export downloaded.');
  } catch (err) {
    console.error('[demo] export failed:', err);
    showToast('Export failed: ' + err.message, 4000);
  } finally {
    btn.disabled = false;
  }
});

/** The drawLegend contract: canvas primitives only, inside the rect handed to
    you, and no font beyond the kit's three unless the app loaded it first.
    Drawing the legend twice — once in DOM, once here — is deliberate; the
    foreignObject/html2canvas route taints the canvas and toBlob() then throws. */
function drawExportLegend(ctx, rect) {
  const rows = fillMode === 'none' ? [] : fillMode === 'single' ? [GROUP_FILLS[0]] : GROUP_FILLS;
  ctx.font = '500 22px Roboto';                       // one of the kit's three
  ctx.textBaseline = 'middle';
  const y = rect.y + rect.height / 2;
  let x = rect.x;
  for (const row of rows) {
    ctx.fillStyle = row.color;                        // data colour, verbatim
    ctx.fillRect(x, y - 11, 22, 22);
    ctx.fillStyle = resolveToken('--text-primary', '#1f2937');
    ctx.fillText(row.label, x + 32, y);
    x += 32 + ctx.measureText(row.label).width + 28;
  }
  ctx.fillStyle = resolveToken('--no-data', '#cccccc');
  ctx.fillRect(x, y - 11, 22, 22);
  ctx.strokeStyle = resolveToken('--ctrl-border', '#6b7280');
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y - 10.5, 21, 21);          // outlined: "no data" is a category
  ctx.fillStyle = resolveToken('--text-primary', '#1f2937');
  ctx.fillText(NO_DATA_ROW.label, x + 32, y);
}

/* ── Finally: reflect the boot state in the URL ──────────────────────────── */
fillCard(null);
pushState();