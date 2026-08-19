# Vendored third-party assets

The Sustainable FSA house-style kit has no build step and no npm in its
runtime path. Every browser dependency, the Roboto web font, and the project
brand marks are committed to this repository and served directly by GitHub
Pages from `https://sustainable-fsa.com/style/`. This file is the manifest:
what is vendored, exactly which version, where it came from, its sha256, its
license, and where it lives in the kit.

Re-fetch the npm-registry libraries with [`vendor/update.sh`](update.sh).

## Update procedure

1. **Edit the version** in the manifest row below *and* in the matching
   variable at the top of `vendor/update.sh`.
2. **Run `sh vendor/update.sh`.** For a library *upgrade*, the new version
   goes into a **new** directory — `vendor/<lib>-<newversion>/` (or
   `vendor-esm/<lib>-<newversion>/`). **Never modify or delete an existing
   directory:** published consumers reference those URLs forever, and CI's
   `check-frozen` gate enforces immutability. The script writes a new
   directory automatically once the version variable changes.
3. **Record the new sha256s here**, adding a row rather than overwriting the
   old one while any release still references the old directory.
4. **Point the NEXT kit release's `snippets/head.html`** at the new directory.
   Existing releases keep pointing at the old one; that is the whole point.
5. **Run the `tools/` gates** before pushing.

## Immutability and the release surface

`vendor/` and `vendor-esm/` contents are **immutable once pushed**. A version
bump is always an addition, never an edit.

The two trees differ in how they relate to a versioned kit release:

| Tree | Role | Inside a `vX.Y.Z/` snapshot? |
| --- | --- | --- |
| `vendor/` | Heavy UMD browser globals (maplibre-gl, topojson-client). Referenced by **library version**, so one copy is shared by every kit release and every consuming app — a release bump never re-copies a megabyte of JavaScript. | **No** — lives outside version snapshots |
| `vendor-esm/` | Small ES modules (marked) imported by kit modules. | **Yes** — byte-copied into each release |
| `theme/fonts/` | The Roboto variable font, referenced by a same-directory relative `url()` from `theme/sfsa-theme.css`. | **Yes** — byte-copied into each release |

Because `vendor-esm/` and `theme/fonts/` sit inside the published surface, a
`vX.Y.Z/` release directory is self-contained for everything but the two UMD
libraries, which each page loads from the shared, version-pinned `vendor/`
path.

## Manifest

### `vendor/` — UMD browser globals (outside release snapshots)

| Name | Version | Provenance | File | sha256 | License |
| --- | --- | --- | --- | --- | --- |
| maplibre-gl | 5.18.0 | `https://registry.npmjs.org/maplibre-gl/-/maplibre-gl-5.18.0.tgz` (`dist/maplibre-gl.js`) | `vendor/maplibre-gl-5.18.0/maplibre-gl.js` | `bc7101606a893f9018ac4a0d27f7de07d00fb3852231951fcf3dd900796ddfd7` | BSD-3-Clause |
| maplibre-gl | 5.18.0 | same tarball (`dist/maplibre-gl.css`) | `vendor/maplibre-gl-5.18.0/maplibre-gl.css` | `e4711ce4f6225070a859c7a40dc4d2e4e1ab76a5c71a12b4a65227ed2bf362fd` | BSD-3-Clause |
| maplibre-gl | 5.18.0 | same tarball (`LICENSE.txt`) | `vendor/maplibre-gl-5.18.0/LICENSE` | `ee5fc05a0677eaf69601d2c7db0d9ecd6cc27c3abc1d0733bc9ed34707cf8ef2` | BSD-3-Clause |
| topojson-client | 3.1.0 | `https://registry.npmjs.org/topojson-client/-/topojson-client-3.1.0.tgz` (`dist/topojson-client.min.js`) | `vendor/topojson-client-3.1.0/topojson-client.min.js` | `25cd02ae486cc5063e0215a4e4cfb15de83700c87ac48bac4d57dc6aaf3ebb89` | ISC |
| topojson-client | 3.1.0 | same tarball (`LICENSE`) | `vendor/topojson-client-3.1.0/LICENSE` | `4c4d15b635e04e691825a76db7d33f7f2033b55669a7430011694f31e6c65999` | ISC |

### `vendor-esm/` — ES modules (inside release snapshots)

| Name | Version | Provenance | File | sha256 | License |
| --- | --- | --- | --- | --- | --- |
| marked | 18.0.10 | `https://registry.npmjs.org/marked/-/marked-18.0.10.tgz` (`lib/marked.esm.js`) | `vendor-esm/marked-18.0.10/marked.esm.js` | `4cf47dfebb7f614a08fc0a579ab0fe407ff0ed2b717bf953040c85b2f493a4f0` | MIT |
| marked | 18.0.10 | same tarball (`LICENSE`) | `vendor-esm/marked-18.0.10/LICENSE` | `8e3a3f82f59a60958f56ca08f445647c32a4733dc7ca6c2c46f6eb898471ab9c` | MIT |

### `theme/fonts/` — web font (inside release snapshots)

| Name | Version | Provenance | File | sha256 | License |
| --- | --- | --- | --- | --- | --- |
| Roboto (variable, latin subset, `wght` axis) | v51 | [google-webfonts-helper](https://gwfh.mranftl.com/fonts/roboto) — Roboto v51, `latin` subset, variable `wght` (400–900); byte-copied from `sustainable-fsa.github.io` (`assets/fonts/roboto-v51-latin-wght.woff2`), where the font was first vendored | `theme/fonts/roboto-v51-latin-wght.woff2` | `0a44e0bb6ba5c8537e8814c148ef7755f1bce12112361231f595ecc584a18d7a` | Apache-2.0 |

`vendor/update.sh` does **not** re-download this file; it only prints the
provenance note and the checksum. The font is versioned by filename
(`roboto-vNN-latin-wght.woff2`), so an upgrade means adding a new file next to
the old one, repointing the `@font-face` `src` in `theme/sfsa-theme.css`, and
adding a row here. The `url()` is relative to the stylesheet's own directory,
which keeps every release snapshot self-contained.

### `assets/` — Sustainable FSA brand marks

Provenance for all of these is the project's own site repository,
[`sustainable-fsa/sustainable-fsa.github.io`](https://github.com/sustainable-fsa/sustainable-fsa.github.io)
(`assets/`), byte-copied except where noted. They are project marks, not
third-party open-source assets: © Montana Climate Office, University of
Montana. Use them for Sustainable FSA project sites; they are not covered by
the kit's MIT license and are not for third-party reuse or re-branding.

| Asset | File | sha256 | Notes |
| --- | --- | --- | --- |
| Sustainable FSA banner | `assets/sustainable-fsa-banner.svg` | `7c921a74a9f3dba2ed4c5a7af02058b9f0e6aeb6bd11e16602718f852a4cecc2` | **Patched.** Upstream (`5fb1544aeb7c6f5c3cbe3984735217db22537301e4a8b750d983de64560c8a9d`) declares only `viewBox="0 0 1225 350"`; this copy adds `width="1225" height="350"` to the root `<svg>` so the image has an intrinsic size and reserves layout space instead of collapsing before load. Sole difference: 26 inserted bytes; all other bytes identical. |
| Montana Climate Office logo | `assets/MCO_logo.svg` | `f092337e8c466faeabb57e0e06eb914e5a1134b80a5770cbcc4524d535b9c664` | Byte-identical to upstream |
| Favicon (multi-size ICO) | `assets/favicon.ico` | `7b95313d655a288353564f453647afe709bef55c0060400956573cdd6d60f8ec` | Byte-identical to upstream |
| Favicon 16×16 | `assets/favicon-16x16.png` | `85a8e90284e1fbb86d0d198f490cbc7c7cf6dbdb0af097716526b8b2206f6337` | Byte-identical to upstream |
| Favicon 32×32 | `assets/favicon-32x32.png` | `8d44c74d93e648b006636a11cc3e40e70c866fdfd3a75742c1b9329f5c202e13` | Byte-identical to upstream |
| Favicon 48×48 | `assets/favicon-48x48.png` | `bb02d2a1013df04014ea4f6f5e012853408ea44454fe61d41a4991119bfc8685` | Byte-identical to upstream |
| Apple touch icon | `assets/apple-touch-icon.png` | `5b71825486257b43ac414f94aac9e94c41324ef4b1159d968341e9894156ba2e` | Byte-identical to upstream |
| Android Chrome 192×192 | `assets/android-chrome-192x192.png` | `ffa879c6cd2cfe2eec77e1986ed4f20487280dda36ef4073757db8b2d0c6d3ee` | Byte-identical to upstream |
| Android Chrome 512×512 | `assets/android-chrome-512x512.png` | `77203bde4aed56a4d61acef72bdcfa29c8612b18aed01579adcd3730abf04906` | Byte-identical to upstream |

`site.webmanifest` is deliberately **not** vendored here: its `name`,
`short_name`, `start_url`, and theme colors are per-application, so each
consuming app ships its own and points it at these shared icon URLs.

## Verifying

From the repository root:

```sh
shasum -a 256 \
  vendor/maplibre-gl-5.18.0/maplibre-gl.js \
  vendor/maplibre-gl-5.18.0/maplibre-gl.css \
  vendor/maplibre-gl-5.18.0/LICENSE \
  vendor/topojson-client-3.1.0/topojson-client.min.js \
  vendor/topojson-client-3.1.0/LICENSE \
  vendor-esm/marked-18.0.10/marked.esm.js \
  vendor-esm/marked-18.0.10/LICENSE \
  theme/fonts/roboto-v51-latin-wght.woff2 \
  assets/*.svg assets/*.png assets/favicon.ico
```

Every line must match the manifest above.
