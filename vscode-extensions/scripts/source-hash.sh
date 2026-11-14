#!/usr/bin/env bash
# Print a hash of the source files under DIR (default: vscode-extensions/),
# ignoring build output, caches and dependencies. Used by install.sh (per
# extension) and by the chezmoi run_onchange script (whole directory).
set -euo pipefail
dir="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${dir}"
find . \( -name node_modules -o -name dist -o -name out -o -name .cache -o -name screenshots -o -name '*.vsix' \) -prune \
  -o -type f -print0 \
  | LC_ALL=C sort -z \
  | xargs -0 sha256sum \
  | sha256sum | cut -d' ' -f1
