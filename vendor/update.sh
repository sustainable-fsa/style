#!/bin/sh
#
# vendor/update.sh — (re)download the third-party libraries vendored into the
# Sustainable FSA house-style kit.
#
# The kit has NO build step and NO npm in its runtime path. Every browser
# dependency is committed to this repository and served directly by GitHub
# Pages from https://sustainable-fsa.com/style/. This script exists only to
# (re)fetch those files from the npm registry when a version is bumped.
#
# Usage (from anywhere; the script locates the repository itself):
#
#   sh vendor/update.sh
#
# Two destinations, because they play different roles in a kit release:
#
#   vendor/       Heavy UMD browser globals (maplibre-gl, topojson-client).
#                 These live OUTSIDE the versioned vX.Y.Z/ release snapshots
#                 and are referenced by library version, so a single copy is
#                 shared by every release and every consuming app.
#
#   vendor-esm/   Small ES modules (marked) that ARE byte-copied into each
#                 vX.Y.Z/ release snapshot alongside core/ and theme/.
#
# IMMUTABILITY: once a directory under vendor/ or vendor-esm/ has been pushed,
# its contents never change. Published pages reference those exact URLs
# forever, and CI's check-frozen gate enforces it. To upgrade a library, bump
# the version variable below and let this script write a NEW sibling directory
# (vendor/<lib>-<newversion>/); never edit or delete the old one.
#
# Requires: curl, tar, shasum. No node, no npm.

set -eu

# ---------------------------------------------------------------------------
# Versions — keep these in sync with the manifest table in vendor/VENDORED.md.
# ---------------------------------------------------------------------------
MAPLIBRE_VERSION="5.18.0"
TOPOJSON_CLIENT_VERSION="3.1.0"
MARKED_VERSION="18.0.10"

# The Roboto variable font is NOT fetched by this script; see the note printed
# at the end of a run and the manifest row in vendor/VENDORED.md.
ROBOTO_FONT="roboto-v51-latin-wght.woff2"

# Resolve directories from this script's own location so the working directory
# does not matter. (`CDPATH= cd` is a deliberate one-command environment
# assignment, not a stray space; shellcheck's SC1007 misreads it.)
# shellcheck disable=SC1007
VENDOR_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# shellcheck disable=SC1007
KIT_ROOT=$(CDPATH= cd -- "$VENDOR_DIR/.." && pwd)
VENDOR_ESM_DIR="$KIT_ROOT/vendor-esm"
FONTS_DIR="$KIT_ROOT/theme/fonts"

REGISTRY="https://registry.npmjs.org"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

# Files written by this run, accumulated for the checksum report.
WRITTEN=""

# fetch_tarball <package> <version>
# Downloads and unpacks the npm tarball into $TMP_DIR/<package>-<version>/package
fetch_tarball() {
    pkg="$1"
    version="$2"
    url="$REGISTRY/$pkg/-/$pkg-$version.tgz"
    dest="$TMP_DIR/$pkg-$version"

    echo "==> Downloading $url"
    mkdir -p "$dest"
    curl -fL "$url" -o "$dest/package.tgz"
    tar -xzf "$dest/package.tgz" -C "$dest"
}

# install_file <src-abs-path> <dest-dir> [dest-name]
# Copies one extracted file into its versioned vendor directory.
install_file() {
    src="$1"
    dest_dir="$2"
    dest_name="${3:-$(basename "$src")}"

    if [ ! -f "$src" ]; then
        echo "ERROR: expected file not found in tarball: $src" >&2
        exit 1
    fi

    mkdir -p "$dest_dir"
    cp "$src" "$dest_dir/$dest_name"
    echo "    wrote $dest_dir/$dest_name"
    WRITTEN="$WRITTEN
$dest_dir/$dest_name"
}

# ---------------------------------------------------------------------------
# maplibre-gl — the map engine (BSD-3-Clause). UMD global, vendor/.
# ---------------------------------------------------------------------------
MAPLIBRE_DIR="$VENDOR_DIR/maplibre-gl-$MAPLIBRE_VERSION"
fetch_tarball "maplibre-gl" "$MAPLIBRE_VERSION"
MAPLIBRE_SRC="$TMP_DIR/maplibre-gl-$MAPLIBRE_VERSION/package"
install_file "$MAPLIBRE_SRC/dist/maplibre-gl.js" "$MAPLIBRE_DIR"
install_file "$MAPLIBRE_SRC/dist/maplibre-gl.css" "$MAPLIBRE_DIR"
install_file "$MAPLIBRE_SRC/LICENSE.txt" "$MAPLIBRE_DIR" "LICENSE"

# ---------------------------------------------------------------------------
# topojson-client — decodes TopoJSON boundaries into GeoJSON (ISC). UMD
# global, vendor/.
# ---------------------------------------------------------------------------
TOPOJSON_DIR="$VENDOR_DIR/topojson-client-$TOPOJSON_CLIENT_VERSION"
fetch_tarball "topojson-client" "$TOPOJSON_CLIENT_VERSION"
TOPOJSON_SRC="$TMP_DIR/topojson-client-$TOPOJSON_CLIENT_VERSION/package"
install_file "$TOPOJSON_SRC/dist/topojson-client.min.js" "$TOPOJSON_DIR"
install_file "$TOPOJSON_SRC/LICENSE" "$TOPOJSON_DIR" "LICENSE"

# ---------------------------------------------------------------------------
# marked — renders Markdown help/about copy (MIT). ES module, vendor-esm/,
# byte-copied into every vX.Y.Z/ release snapshot.
# ---------------------------------------------------------------------------
MARKED_DIR="$VENDOR_ESM_DIR/marked-$MARKED_VERSION"
fetch_tarball "marked" "$MARKED_VERSION"
MARKED_SRC="$TMP_DIR/marked-$MARKED_VERSION/package"
install_file "$MARKED_SRC/lib/marked.esm.js" "$MARKED_DIR"
install_file "$MARKED_SRC/LICENSE" "$MARKED_DIR" "LICENSE"

# ---------------------------------------------------------------------------
# Checksums — record these in vendor/VENDORED.md.
# ---------------------------------------------------------------------------
echo
echo "==> sha256 checksums (record these in vendor/VENDORED.md)"
echo
echo "$WRITTEN" | while IFS= read -r f; do
    [ -n "$f" ] || continue
    shasum -a 256 "$f"
done

# ---------------------------------------------------------------------------
# Fonts — not fetched by this script.
# ---------------------------------------------------------------------------
echo
echo "==> theme/fonts/ (NOT re-downloaded by this script)"
echo
echo "    theme/fonts/$ROBOTO_FONT is the Roboto variable font"
echo "    (latin subset, wght 400-900) used by theme/sfsa-theme.css through a"
echo "    same-directory relative url(). Provenance: google-webfonts-helper,"
echo "    Roboto v51, latin subset, variable 'wght' axis — byte-copied from"
echo "    the sustainable-fsa.github.io repository (assets/fonts/), which is"
echo "    where the font was first vendored. Licensed Apache-2.0."
echo
echo "    It is versioned by filename (roboto-vNN-latin-wght.woff2). To"
echo "    upgrade, add the new file alongside the old one, point the theme"
echo "    @font-face at it, and record its sha256 in vendor/VENDORED.md."
if [ -f "$FONTS_DIR/$ROBOTO_FONT" ]; then
    echo
    shasum -a 256 "$FONTS_DIR/$ROBOTO_FONT"
else
    echo
    echo "    WARNING: $FONTS_DIR/$ROBOTO_FONT is missing." >&2
fi

echo
echo "Done. Next steps:"
echo "  1. Record the checksums above in vendor/VENDORED.md."
echo "  2. Point the next release's snippets/head.html at any new vendor dir."
echo "  3. Run the tools/ gates before pushing."
