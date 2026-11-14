#!/usr/bin/env bash
# Print a hash of the source files under DIR (default: vscode-extensions/).
# Used by install.sh (per extension) and by the chezmoi run_onchange script
# (whole directory).
set -euo pipefail
. "$(dirname "$0")/lib.sh"
dir="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${dir}"
source_files . | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1
