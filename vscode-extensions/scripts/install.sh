#!/usr/bin/env bash
# Build the extensions whose sources changed and install them into code and codium.
#   install.sh          build + install what changed (hashes in ~/.cache/vscode-extensions/<name>.sha256)
#   install.sh --force  rebuild everything
#   install.sh --hash   print the hash of all sources (used by the chezmoi run_onchange script)
# The build runs in a copy (~/.cache/vscode-extensions/build) with `npm ci --omit=dev`, so the
# dev dependencies are not installed there and the working tree is left alone.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/vscode-extensions"
BUILD="$CACHE/build"

# NUL-separated source files under the given paths (relative to ROOT), without dependencies and build output.
sources() { (cd "$ROOT" && find "$@" \( -name node_modules -o -name dist \) -prune -o -type f -print0); }
hash() { sources "$@" | LC_ALL=C sort -z | (cd "$ROOT" && xargs -0 sha256sum) | sha256sum | cut -d' ' -f1; }

if [[ "${1:-}" == --hash ]]; then hash .; exit 0; fi

export PATH="$HOME/.local/bin:$PATH"
if ! command -v npm &>/dev/null && command -v mise &>/dev/null; then PATH="$(mise where node)/bin:$PATH"; fi
targets=()
for c in code codium; do command -v "$c" &>/dev/null && targets+=("$c"); done
if [[ ${#targets[@]} -eq 0 ]]; then echo "code / codium not found, skipping." >&2; exit 0; fi
if ! command -v npm &>/dev/null; then echo "npm not found, skipping." >&2; exit 0; fi

mkdir -p "$CACHE"
prepared=0
for name in $(node -p 'require(process.argv[1]).workspaces.join(" ")' "$ROOT/package.json"); do
  h="$(hash "$name" package.json package-lock.json tsconfig.base.json)"
  if [[ "${1:-}" != --force && "$(cat "$CACHE/$name.sha256" 2>/dev/null)" == "$h" ]]; then
    echo "$name: up to date" >&2
    continue
  fi
  if [[ $prepared -eq 0 ]]; then
    # Replace the sources in the build copy; keep its node_modules.
    mkdir -p "$BUILD"
    find "$BUILD" -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +
    sources . | (cd "$ROOT" && tar --null -T - -cf -) | tar -xf - -C "$BUILD"
    (cd "$BUILD" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
    prepared=1
  fi
  echo "$name: packaging" >&2
  (cd "$BUILD/$name" && npm run --silent package >/dev/null)
  for t in "${targets[@]}"; do
    echo "$name: installing into $t" >&2
    "$t" --install-extension "$BUILD/$name/dist/$name.vsix" --force >/dev/null
  done
  echo "$h" > "$CACHE/$name.sha256"
done
