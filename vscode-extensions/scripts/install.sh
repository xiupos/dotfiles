#!/usr/bin/env bash
# Build and install the extensions under vscode-extensions/ into every VS Code
# found here: code, codium and VS Code Server (Remote SSH). Called by
# .chezmoiscripts/run_onchange_after_vscode-extensions.sh.tmpl.
#
# An extension is rebuilt only when its sources (or the shared build files)
# changed since the last successful install, or when some editor lacks it.
# Hashes are kept in ~/.cache/vscode-extensions/<name>.sha256. The build runs
# in a copy under ~/.cache/vscode-extensions/build with `npm ci --omit=dev`,
# so test dependencies (VSCodium, Playwright, ...) are never installed here
# and the development node_modules is left alone.
#   install.sh [--force]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
. "${ROOT}/scripts/lib.sh"
CACHE="${XDG_CACHE_HOME:-${HOME}/.cache}/vscode-extensions"
BUILD="${CACHE}/build"
FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

export PATH="${HOME}/.local/bin:${PATH}"
if ! command -v npm &>/dev/null && command -v mise &>/dev/null; then
  node_dir="$(mise where node 2>/dev/null || true)"
  [[ -n "${node_dir}" ]] && export PATH="${node_dir}/bin:${PATH}"
fi

# Editors to install into.
targets=()
for c in code codium; do
  command -v "${c}" &>/dev/null && targets+=("$(command -v "${c}")")
done
shopt -s nullglob
for c in "${HOME}"/.vscode-server/bin/*/bin/code-server "${HOME}"/.vscode-server/cli/servers/*/server/bin/code-server; do
  [[ -x "${c}" ]] && targets+=("${c}")
done
shopt -u nullglob

if [[ ${#targets[@]} -eq 0 ]]; then
  echo "no VS Code (code, codium, ~/.vscode-server) found, skipping." >&2
  exit 0
fi
if ! command -v npm &>/dev/null; then
  echo "npm not found, skipping." >&2
  exit 0
fi

mkdir -p "${CACHE}"
# Everything an extension build depends on besides its own directory.
shared_hash="$( (cat "${ROOT}/package.json" "${ROOT}/package-lock.json" "${ROOT}/tsconfig.base.json"; "${ROOT}/scripts/source-hash.sh" "${ROOT}/shared") | sha256sum | cut -d' ' -f1)"
mapfile -t names < <(node -p 'require(process.argv[1]).workspaces.join("\n")' "${ROOT}/package.json")

has_ext() { # target id version
  "$1" --list-extensions --show-versions 2>/dev/null | grep -qx "$2@$3"
}

prepared=0
prepare_build() {
  [[ ${prepared} -eq 1 ]] && return
  echo "preparing build directory ${BUILD}" >&2
  mkdir -p "${BUILD}"
  # Replace the sources with the current ones; keep the build's own node_modules.
  find "${BUILD}" -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +
  (cd "${ROOT}" && source_files . | tar --null -T - -cf -) | tar -xf - -C "${BUILD}"
  (cd "${BUILD}" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
  prepared=1
}

status=0
for name in "${names[@]}"; do
  pkg="${ROOT}/${name}/package.json"
  id="$(node -p 'const p = require(process.argv[1]); `${p.publisher}.${p.name}`' "${pkg}")"
  version="$(node -p 'require(process.argv[1]).version' "${pkg}")"
  hash="$(echo "${shared_hash} $("${ROOT}/scripts/source-hash.sh" "${ROOT}/${name}")" | sha256sum | cut -d' ' -f1)"
  stamp="${CACHE}/${name}.sha256"

  todo=()
  if [[ ${FORCE} -eq 1 || "$(cat "${stamp}" 2>/dev/null)" != "${hash}" ]]; then
    todo=("${targets[@]}")
  else
    for t in "${targets[@]}"; do has_ext "${t}" "${id}" "${version}" || todo+=("${t}"); done
  fi
  if [[ ${#todo[@]} -eq 0 ]]; then
    echo "${id}@${version}: up to date" >&2
    continue
  fi

  prepare_build
  echo "${id}@${version}: packaging" >&2
  if ! (cd "${BUILD}/${name}" && npm run --silent package); then
    echo "${id}: packaging failed" >&2
    status=1
    continue
  fi
  vsix="${BUILD}/${name}/dist/${name}.vsix"
  ok=1
  for t in "${todo[@]}"; do
    echo "${id}@${version}: installing into ${t}" >&2
    "${t}" --install-extension "${vsix}" --force >/dev/null || { echo "${id}: install into ${t} failed" >&2; ok=0; }
  done
  if [[ ${ok} -eq 1 ]]; then echo "${hash}" > "${stamp}"; else status=1; fi
done
exit "${status}"
