#!/bin/sh
# =============================================================================
# sustainable-fsa/style · tools/release.sh
# Byte-copy the published source surface into an immutable vX.Y.Z/ snapshot and
# write its MANIFEST.sha256.
#
#   sh tools/release.sh 0.2.0
#
# This is step 4 of the release checklist (README § Releasing, AGENTS.md
# § Releasing). It does NOT bump versions, write the CHANGELOG, commit, or tag:
# those are decisions, and this script only moves bytes. It refuses to run if
# the snapshot already exists (a released directory is immutable — a bad
# release gets a new PATCH version, never a fix in place) or if the working
# tree is dirty (a release commit contains only the release).
#
# POSIX sh, no bashisms: it has to run identically on a maintainer's macOS
# laptop and on ubuntu-latest.
# =============================================================================
set -eu

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: sh tools/release.sh X.Y.Z" >&2
  exit 2
fi

# Bare SemVer, no leading 'v' — the directory name adds it.
if ! printf '%s' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "release.sh: '$VERSION' is not X.Y.Z (no leading 'v', no pre-release suffix)" >&2
  exit 2
fi

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DEST="$ROOT/v$VERSION"

if [ -e "$DEST" ]; then
  echo "release.sh: $DEST already exists." >&2
  echo "  Published releases are IMMUTABLE (AGENTS.md §9). A bad release gets a" >&2
  echo "  new PATCH version; it never gets fixed in place." >&2
  exit 1
fi

if ! git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "release.sh: $ROOT is not a git work tree." >&2
  exit 1
fi
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "release.sh: working tree is dirty. Land or stash everything else first —" >&2
  echo "  a release commit contains only the release." >&2
  git -C "$ROOT" status --short >&2
  exit 1
fi

# The published surface. NOT vendor/ — the UMD libraries are pinned by their own
# directory name and shared across every release, so a version bump never
# re-copies a megabyte of MapLibre (vendor/VENDORED.md § Immutability).
# vendor-esm/ IS copied: ui/help.js imports marked by relative path, so a
# snapshot has to carry its own copy to stay self-contained.
SURFACE="theme tokens core map county ui vendor-esm snippets"

for dir in $SURFACE; do
  if [ ! -d "$ROOT/$dir" ]; then
    echo "release.sh: missing source directory $dir" >&2
    exit 1
  fi
done

mkdir "$DEST"
for dir in $SURFACE; do
  cp -R "$ROOT/$dir" "$DEST/$dir"
done

# Finder droppings would otherwise be copied in and then be unmanifested
# forever (tools/check-frozen.mjs would flag them on every run).
find "$DEST" -name '.DS_Store' -exec rm -f {} + 2>/dev/null || true

# One hashing tool or the other, depending on the platform. Both emit exactly
# "<sha256><two spaces><path>", which is what check-frozen.mjs parses.
if command -v shasum >/dev/null 2>&1; then
  HASH_CMD="shasum -a 256"
elif command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD="sha256sum"
else
  echo "release.sh: neither shasum nor sha256sum is available" >&2
  exit 1
fi

# Paths are relative to the snapshot directory, and LC_ALL=C keeps the sort
# order byte-stable across locales so the manifest diff is reviewable.
(
  cd "$DEST"
  find . -type f ! -name 'MANIFEST.sha256' -print \
    | sed 's|^\./||' \
    | LC_ALL=C sort \
    | while IFS= read -r f; do
        $HASH_CMD "$f"
      done > MANIFEST.sha256
)

COUNT=$(wc -l < "$DEST/MANIFEST.sha256" | tr -d ' ')

cat <<EOF

release.sh: wrote v$VERSION/ ($COUNT files) + v$VERSION/MANIFEST.sha256

Next, in order (README § Releasing):

  1. node tools/check-frozen.mjs          # the new snapshot and every older one
  2. node tools/check-tokens.mjs && node tools/check-contrast.mjs
  3. npx --yes html-validate@9 demo/index.html
  4. node tools/a11y-audit.mjs            # and eyeball demo/ at 1440px and 390px
  5. CHANGELOG.md entry for $VERSION (Keep a Changelog; SemVer)
  6. git add v$VERSION CHANGELOG.md && git commit -m 'release: v$VERSION'
  7. git push, wait for Actions + the Pages deploy, then:
       curl -sI https://sustainable-fsa.com/style/v$VERSION/theme/sfsa-theme.css
       curl -sI -H 'Accept-Encoding: gzip' \\
            https://sustainable-fsa.com/style/v$VERSION/core/core.js | grep -i encoding
     and open https://sustainable-fsa.com/style/v$VERSION/ in a browser
  8. git tag v$VERSION && git push origin v$VERSION   # bookkeeping; the PATH is the pin

Reminder: the @version headers, KIT_VERSION in core/core.js, the URLs in
snippets/head.html and the README files table are bumped BEFORE this script
runs (checklist step 3), not after.
EOF
