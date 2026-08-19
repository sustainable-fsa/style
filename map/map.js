/* ============================================================================
   Sustainable FSA house-style kit · map/map.js · v0.1.0
   MapLibre GL setup for the basemap-less FSA county composite.

   ES module, no build step. Import it pinned to a release:

     import { createCompositeMap, addNavigation, addFitControl,
              installZoomFloor, cameraParams, cameraParamsIfDefault }
       from 'https://sustainable-fsa.com/style/v0.1.0/map/map.js';

   REQUIRES `window.maplibregl` — the vendored UMD build, loaded as a CLASSIC
   script BEFORE the app module:

     <script src="https://sustainable-fsa.com/style/vendor/maplibre-gl-5.18.0/maplibre-gl.js"></script>

   Every entry point asserts that global at first use and throws with that tag
   in the message, because the failure mode otherwise is a blank cream
   rectangle and a `maplibregl is not defined` five frames deep in a callback.

   There is NO basemap (HOUSE-STYLE §7): the county composite IS the map, on a
   brand-cream canvas. Nothing here fetches a tile, needs an API key, or adds
   an attribution bar. Rotation and pitch are off — a rotated composite is
   meaningless and the baked-in Alaska/Hawaii/Puerto Rico insets make it
   actively misleading.

   ── Attribution ────────────────────────────────────────────────────────────
   Ported from mt-climate-office/mco-web-style, map/mco-map.js (MIT). The
   zoom-floor hardenings come from mt-climate-office/mesonet-explorer's local
   version of that helper, specced for absorption in mco-web-style's
   CHANGELOG.md § "Planned for 0.7.0". Both kits are MIT.

   Deltas from mco-map.js:

     1. ES module with named exports — no IIFE, no `window.MCO` global.
     2. NO basemap helpers. `themedStyleUrl()`, `cartoStyleUrl()`,
        `addHillshade()`, `TERRARIUM_DEM`, `hillshadePaints()`,
        `firstSymbolLayerId()` and the Montana overlay/tribal-label paints are
        deliberately not ported: this fleet has no tile host and no basemap
        labels to slot under. `blankStyle()` + `createCompositeMap()` replace
        the whole basemap surface.
     3. `MT_FIT_BOUNDS` / `FIT_OPTS` are retired. Bounds come from the decoded
        geometry (`counties.bounds`, county/county.js); `COMPOSITE_BOUNDS`
        below is only a boot-time stand-in for the frames before it arrives.
     4. NEW `cameraParamsIfDefault()` — the clean-URL default-elision pair from
        the same "Planned for 0.7.0" list, shipped as one call rather than a
        separate `atDefaultExtent()` predicate.
     5. `addFitControl()` is a real `IControl` (MCO appends a bare button and
        returns null when no group exists yet), so it survives `removeControl`
        and works before any other control is added — while still FUSING into
        the navigation group when there is one, which is the whole visual
        point.
     6. `installZoomFloor()` bakes in the two mco-0.7.0 hardenings (spring-back
        latch + chrome-only-resize skip) and the `onBeforeSnap` veto.
     7. The reduced-motion gate is imported from core/core.js instead of being
        inlined — this kit's core is an ES module, so there is no dependency
        cost to sharing the one live media query.
   ========================================================================== */

import { reducedMotion } from '../core/core.js';

/* ── Requirements ────────────────────────────────────────────────────────── */

const MAPLIBRE_TAG =
  '<script src="https://sustainable-fsa.com/style/vendor/maplibre-gl-5.18.0/maplibre-gl.js"></script>';

/**
 * The MapLibre GL UMD global, or a thrown Error naming the missing tag.
 * @returns {any} window.maplibregl
 */
function maplibre() {
  const gl = (typeof globalThis !== 'undefined') ? globalThis.maplibregl : undefined;
  if (!gl) {
    throw new Error(
      '[sfsa/map] window.maplibregl is not defined. Load the vendored UMD '
      + 'build as a classic script BEFORE your app module:\n  ' + MAPLIBRE_TAG);
  }
  return gl;
}

/* ── Tokens → paints ─────────────────────────────────────────────────────────
   MAPLIBRE PAINTS CANNOT READ CSS CUSTOM PROPERTIES. Style values are resolved
   by the GL renderer, not the CSS engine, so `var(--map-bg)` in a paint is not
   a value at all — it is silently invalid and the layer draws in MapLibre's
   own default. Every token-derived paint in this kit is resolved through
   resolveToken() at layer-add time AND re-resolved on every theme change
   (map.js: nothing to re-apply here beyond the canvas; county/county.js:
   `handle.applyThemePaints()`). A theme toggle that only swaps `data-theme`
   leaves the map painted in the old palette. */

/**
 * Resolve a CSS custom property off <html> to a concrete value a GL paint can
 * use. Exported because any app-owned layer needs exactly this and copying it
 * per app is what the kit exists to prevent.
 * @param {string} name e.g. '--map-bg'
 * @param {string} [fallback] used when the theme CSS has not loaded (or when
 *        called outside a browser)
 * @returns {string}
 */
export function resolveToken(name, fallback = '') {
  if (typeof document === 'undefined' || !document.documentElement) return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v && v.trim()) || fallback;
}

// Restated light-theme value, used ONLY when the theme CSS has not applied yet
// (first paint of a page that loads the stylesheet late, or a test harness).
// Not a second source of truth: theme/sfsa-theme.css owns --map-bg.
const MAP_BG_FALLBACK = '#faf7f2';

/* ── Framing ─────────────────────────────────────────────────────────────────
   The composite's own extent, rounded outward from the bbox that BOTH boundary
   archives share (dd17 and dd22 are byte-identical here: -125.2582, 18.5921,
   -66.9499, 49.3844 — Alaska, Hawaii and Puerto Rico arrive pre-translated
   into AlbersUSA-style insets, so this really is the whole composite).

   It is a BOOT-TIME stand-in only. The map is created before the topojson
   arrives; once county/county.js has decoded it, re-fit and re-arm the zoom
   floor against `counties.bounds`, which is recomputed from the features and
   is the authority. */
export const COMPOSITE_BOUNDS = [[-125.30, 18.55], [-66.90, 49.42]];

/** Padding/animation used by every fit in this module. */
const DEFAULT_FIT_OPTS = { padding: 24, animate: false };

// fitOpts may be a FUNCTION in every helper here, so an app whose padding
// depends on live chrome (an open sidebar, a bottom sheet) can pass a getter
// once instead of re-installing the control on every layout change.
function fitOptsOf(fitOpts) {
  const fo = (typeof fitOpts === 'function') ? fitOpts() : fitOpts;
  return fo || DEFAULT_FIT_OPTS;
}

/**
 * A style with no sources and one background layer — the cream canvas the
 * county layers sit on. This is the whole "basemap".
 * @param {{background?: string}} [opts] explicit color wins; otherwise the
 *        resolved --map-bg token.
 * @returns {object} a MapLibre style-spec object
 */
export function blankStyle({ background } = {}) {
  return {
    version: 8,
    sources: {},
    layers: [{
      id: 'background',
      type: 'background',
      paint: { 'background-color': background ?? resolveToken('--map-bg', MAP_BG_FALLBACK) },
    }],
  };
}

/**
 * The house map: blank style, no rotation, no pitch, no world copies, no
 * attribution control (there is nothing to attribute — see HOUSE-STYLE §7),
 * and a maxBounds cage so the composite can't be flung off screen.
 *
 * The container itself is the app's: give it `role="application"` and a
 * descriptive `aria-label`, and make sure the map is never the only route to
 * the data (HOUSE-STYLE §5.2). The kit deliberately does not stamp that role
 * for you — `role="application"` without a real label is worse than none.
 *
 * @param {{container: HTMLElement|string, bounds?: any, params?: URLSearchParams,
 *          fitPadding?: number, maxBoundsPadDeg?: number, background?: string}} [opts]
 * @returns {{map: any, bounds: any, fitOpts: {padding: number, animate: boolean}}}
 *          `bounds` and `fitOpts` are the exact values to hand to
 *          addFitControl() / installZoomFloor() / cameraParamsIfDefault().
 */
export function createCompositeMap({
  container, bounds = COMPOSITE_BOUNDS, params, fitPadding = 24,
  maxBoundsPadDeg = 6, background,
} = {}) {
  const gl = maplibre();
  const fitOpts = { padding: fitPadding, animate: false };

  const map = new gl.Map({
    container,
    style: blankStyle({ background }),
    renderWorldCopies: false,     // one composite, not a repeating strip
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    maxPitch: 0,
    ...initialCamera(params, { bounds, fitOpts }),
  });

  // Two-finger twist and the keyboard's shift+arrow rotation are separate
  // handlers from dragRotate and stay ON unless disabled explicitly.
  map.touchZoomRotate.disableRotation();
  if (map.keyboard && typeof map.keyboard.disableRotation === 'function') {
    map.keyboard.disableRotation();
  }

  map.setMaxBounds(padBounds(bounds, maxBoundsPadDeg));

  return { map, bounds, fitOpts };
}

/**
 * Grow a [[w,s],[e,n]] box by `deg` on all sides, clamped to the valid
 * lng/lat domain. Pure — exported shape is the same as MapLibre's
 * LngLatBoundsLike array form.
 * @param {any} bounds [[w,s],[e,n]]
 * @param {number} deg
 * @returns {number[][]}
 */
export function padBounds(bounds, deg) {
  const [[w, s], [e, n]] = bounds;
  return [
    [Math.max(-180, w - deg), Math.max(-90, s - deg)],
    [Math.min(180, e + deg), Math.min(90, n + deg)],
  ];
}

/* ── Camera ↔ URL ────────────────────────────────────────────────────────────
   The shared convention: ?lng&lat&zoom, 4 dp position / 2 dp zoom, and a
   camera at the default extent emits NOTHING so an all-defaults view has a
   clean URL. Read once at boot, mirror back on moveend with
   core's replaceUrlState(). */

/**
 * Spread into the Map constructor: an explicit camera when all three params
 * parse, otherwise a fit of `bounds`.
 * @param {URLSearchParams|null|undefined} searchParams
 * @param {{bounds: any, fitOpts: any}} opts
 * @returns {{center: [number, number], zoom: number}|{bounds: any, fitBoundsOptions: any}}
 */
export function initialCamera(searchParams, { bounds = COMPOSITE_BOUNDS, fitOpts } = {}) {
  const get = (k) => (searchParams && typeof searchParams.get === 'function')
    ? searchParams.get(k) : null;
  const lng = parseFloat(get('lng'));
  const lat = parseFloat(get('lat'));
  const zoom = parseFloat(get('zoom'));
  // All three or none: a half-specified camera is a stale/hand-edited URL, and
  // honoring part of it lands the user somewhere nobody chose.
  if (Number.isFinite(lng) && Number.isFinite(lat) && Number.isFinite(zoom)) {
    return { center: [lng, lat], zoom };
  }
  return { bounds, fitBoundsOptions: fitOptsOf(fitOpts) };
}

/**
 * Camera → URL params at the canonical precision. Strings, because they go
 * straight into a query string and toFixed() is what pins the precision.
 * @param {any} map
 * @returns {{lng: string, lat: string, zoom: string}}
 */
export function cameraParams(map) {
  const c = map.getCenter();
  return {
    lng: c.lng.toFixed(4),
    lat: c.lat.toFixed(4),
    zoom: map.getZoom().toFixed(2),
  };
}

/**
 * cameraParams(), or `{}` when the camera is still at the default fitBounds
 * pose — merge the result into your app's params so the default view has no
 * camera in its URL at all. Collapses the old atDefaultExtent()+emit pair into
 * one call.
 *
 * The default pose is computed with map.cameraForBounds(), not remembered from
 * boot, so it stays correct after a resize or a padding change.
 *
 * @param {any} map
 * @param {{bounds?: any, fitOpts?: any, eps?: number, centerEps?: number}} opts
 *        eps: zoom tolerance (0.02 ≈ the smallest zoom step a user can leave
 *        behind by scrolling). centerEps defaults to eps/2 in DEGREES.
 * @returns {{}|{lng: string, lat: string, zoom: string}}
 */
export function cameraParamsIfDefault(map, { bounds = COMPOSITE_BOUNDS, fitOpts, eps = 0.02, centerEps } = {}) {
  const cEps = (centerEps == null) ? eps / 2 : centerEps;
  let want;
  try { want = map.cameraForBounds(bounds, fitOptsOf(fitOpts)); } catch (e) { want = null; }
  if (want) {
    // cameraForBounds returns a LngLat in some versions and a [lng,lat] in
    // others; accept both rather than pinning to one MapLibre minor.
    const wc = want.center;
    const wlng = (wc && typeof wc.lng === 'number') ? wc.lng : (wc && wc[0]);
    const wlat = (wc && typeof wc.lat === 'number') ? wc.lat : (wc && wc[1]);
    const c = map.getCenter();
    if (Number.isFinite(wlng) && Number.isFinite(wlat)
        && Math.abs(map.getZoom() - want.zoom) < eps
        && Math.abs(c.lng - wlng) < cEps
        && Math.abs(c.lat - wlat) < cEps) {
      return {};
    }
  }
  return cameraParams(map);
}

/* ── Controls ────────────────────────────────────────────────────────────── */

/**
 * House default: zoom buttons, no compass. Rotation is off in these apps and a
 * compass that never turns is noise.
 * @param {{showCompass?: boolean, position?: string}} [opts]
 * @returns {any} the NavigationControl (pass to map.removeControl to drop it)
 */
export function addNavigation(map, { showCompass = false, position = 'top-right' } = {}) {
  const gl = maplibre();
  const control = new gl.NavigationControl({ showCompass: showCompass === true });
  map.addControl(control, position);
  return control;
}

/**
 * "Zoom to full extent" — an IControl that FUSES into the navigation control
 * group when one already exists in the same corner, so it reads as a third
 * zoom button rather than a second floating box. NavigationControl renders its
 * DOM synchronously inside addControl(), so calling addNavigation() first is
 * enough to get the fused layout.
 *
 * The glyph is a CSS background-image (.maplibregl-ctrl-fit in
 * theme/sfsa-theme.css), matching how the vendor draws its own buttons, so it
 * inherits --ctrl-icon-filter with them.
 *
 * @param {{bounds?: any, fitOpts?: any, title?: string, position?: string,
 *          group?: HTMLElement, onBeforeFit?: () => void}} [opts]
 *        onBeforeFit runs before the camera moves — apps use it to close a
 *        detail surface or clear a selection first.
 * @returns {any} the control, with `.button` exposed
 */
export function addFitControl(map, {
  bounds = COMPOSITE_BOUNDS, fitOpts, title = 'Zoom to full extent',
  position = 'top-right', group, onBeforeFit,
} = {}) {
  maplibre();   // assert early: the failure should name the missing script tag

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'maplibregl-ctrl-fit';
  button.title = title;
  // Named for AT as well as on hover: an icon-only control with no accessible
  // name is a hard a11y stop (HOUSE-STYLE §5).
  button.setAttribute('aria-label', title);
  button.innerHTML = '<span class="maplibregl-ctrl-icon" aria-hidden="true"></span>';

  const onClick = () => {
    if (onBeforeFit) onBeforeFit();
    // Reduced motion is read at click time, not at install time (WCAG 2.3.3 —
    // the user can flip the OS setting mid-session).
    map.fitBounds(bounds, { ...fitOptsOf(fitOpts), animate: !reducedMotion() });
  };
  button.addEventListener('click', onClick);

  const control = {
    button,
    onAdd(m) {
      this._map = m;
      const corner = m.getContainer().querySelector('.maplibregl-ctrl-' + position);
      const host = group || (corner && corner.querySelector('.maplibregl-ctrl-group'));
      if (host) {
        // Fused: the button joins the existing group and this control's own
        // element is an empty, non-painting placeholder. It carries no
        // .maplibregl-ctrl class, so it draws no second glass box.
        host.appendChild(button);
        this._fusedInto = host;
        this._el = document.createElement('div');
        this._el.style.display = 'none';
        return this._el;
      }
      this._el = document.createElement('div');
      this._el.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      this._el.appendChild(button);
      return this._el;
    },
    onRemove() {
      button.removeEventListener('click', onClick);
      if (button.parentNode) button.parentNode.removeChild(button);
      if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
      this._map = undefined;
    },
  };

  map.addControl(control, position);
  return control;
}

/* ── Zoom floor ──────────────────────────────────────────────────────────────
   Keeps the composite filling the viewport: when the user zooms out past the
   zoom that fits `bounds`, the camera springs back, and the fit zoom is
   recomputed after (debounced) resizes.

   Why not setMinZoom? It was tried in mesonet-explorer and was wrong twice
   over: zooming out did nothing at all, and MapLibre disables its own zoom-out
   button at minZoom, so the control greyed out with no explanation. */

// Tolerance on the zoom comparison. A settled fitBounds lands a hair below
// fitZoom often enough that a bare `<` re-fires forever.
const SPRING_EPS = 0.01;

// Height-only resize smaller than this is chrome, not layout: a mobile URL bar
// showing/hiding, or the app's own navbar re-wrapping.
const CHROME_RESIZE_PX = 120;

/**
 * @param {any} map
 * @param {{bounds?: any, fitOpts?: any, resizeDebounceMs?: number,
 *          onBeforeSnap?: () => boolean|void}} [opts]
 *        onBeforeSnap returning EXACTLY false vetoes the snap. App policy
 *        lives there — "don't yank the camera while a county detail is open",
 *        "a sidebar toggle IS the user asking to re-fit".
 * @returns {{refresh: () => void, fitZoom: () => number|undefined,
 *            dispose: () => void}}
 *        Call refresh() from map.on('load') (cameraForBounds needs a laid-out
 *        container) and again whenever `bounds` changes — e.g. after the first
 *        vintage decode replaces COMPOSITE_BOUNDS with counties.bounds.
 */
export function installZoomFloor(map, {
  bounds = COMPOSITE_BOUNDS, fitOpts, resizeDebounceMs = 200, onBeforeSnap,
} = {}) {
  let fitZoom;
  let timer = null;
  let lastSize = containerSize();
  // Hardening 1 of 3 (mco-0.7.0): an ANIMATED fitBounds raises further zoomend
  // events while the flight is still in progress. Each one re-tests
  // `getZoom() < fitZoom`, which is still true mid-flight, so without this
  // latch the snap re-fires re-entrantly and the camera stutters.
  let springingBack = false;

  function containerSize() {
    const c = map.getContainer && map.getContainer();
    return c ? { w: c.clientWidth, h: c.clientHeight } : null;
  }

  function compute() {
    let cam = null;
    try { cam = map.cameraForBounds(bounds, fitOptsOf(fitOpts)); } catch (e) { cam = null; }
    if (cam && Number.isFinite(cam.zoom)) fitZoom = cam.zoom;
    lastSize = containerSize() || lastSize;
  }

  function below() {
    return fitZoom !== undefined && map.getZoom() < fitZoom - SPRING_EPS;
  }

  function snapBack() {
    // Hardening 3 of 3: app policy can veto. Only an explicit `false` does —
    // a hook that forgets to return still snaps.
    if (onBeforeSnap && onBeforeSnap() === false) return;
    springingBack = true;
    map.once('moveend', () => { springingBack = false; });
    map.fitBounds(bounds, { ...fitOptsOf(fitOpts), animate: !reducedMotion() });
  }

  function onZoomEnd() {
    if (springingBack || fitZoom === undefined) return;
    if (!below()) return;
    snapBack();
  }

  function onResize() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const size = containerSize();
      // Hardening 2 of 3: a height-only change under CHROME_RESIZE_PX is a
      // mobile URL bar, not the user asking for a new framing. The fit zoom is
      // still recomputed (it genuinely changed), but the camera is left alone.
      const chromeOnly = !!(size && lastSize && size.w === lastSize.w
        && Math.abs(size.h - lastSize.h) < CHROME_RESIZE_PX);
      compute();
      if (chromeOnly) return;
      if (below()) snapBack();
    }, resizeDebounceMs);
  }

  map.on('zoomend', onZoomEnd);
  map.on('resize', onResize);

  return {
    refresh: compute,
    fitZoom: () => fitZoom,
    dispose() {
      clearTimeout(timer);
      timer = null;
      map.off('zoomend', onZoomEnd);
      map.off('resize', onResize);
    },
  };
}
