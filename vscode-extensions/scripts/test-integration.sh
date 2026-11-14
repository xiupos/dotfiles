#!/usr/bin/env bash
# Run the integration tests of one extension (default: all) in VSCodium
# on a virtual X server (never on the real screen: Wayland is unset and
# VSCodium is forced to X11).
#   scripts/test-integration.sh [extension] [trusted|untrusted]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"
[[ -d node_modules ]] || npm ci
export CODIUM="${CODIUM:-$("${ROOT}/scripts/fetch-codium.sh")}"

exts=("${1:-}")
[[ -z "${exts[0]}" ]] && mapfile -t exts < <(node -p 'require("./package.json").workspaces.join("\n")')

for ext in "${exts[@]}"; do
  echo "=== ${ext}"
  (cd "${ext}" && npm run build --silent && node esbuild.mjs --tests \
    && env -u WAYLAND_DISPLAY -u ELECTRON_OZONE_PLATFORM_HINT \
      xvfb-run -a -s "-screen 0 1600x1200x24 -nolisten tcp" node out/test/runTest.js ${2:+"$2"})
done
