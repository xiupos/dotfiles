#!/usr/bin/env bash
# Run the integration tests of one extension (default: all) in VSCodium
# under a virtual X server.
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
    && xvfb-run -a node out/test/runTest.js "${2:-}")
done
