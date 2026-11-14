#!/usr/bin/env bash
# Screenshots of the real Markdown preview, taken on a virtual X server so
# that nothing appears on the user's screen.
#   scripts/screenshot.sh <extension> [outDir]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ext="${1:?usage: screenshot.sh <extension> [outDir]}"
export CODIUM="${CODIUM:-$("${ROOT}/scripts/fetch-codium.sh")}"
cd "${ROOT}/${ext}"
npm run build --silent
node esbuild.mjs --tests
env -u WAYLAND_DISPLAY -u ELECTRON_OZONE_PLATFORM_HINT \
  xvfb-run -a -s "-screen 0 1600x1200x24 -nolisten tcp" node out/test/screenshot.js ${2:+"$2"}
