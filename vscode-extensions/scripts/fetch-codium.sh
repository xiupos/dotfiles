#!/usr/bin/env bash
# Download a pinned VSCodium build for integration tests and print the path
# of its executable. The version is pinned on purpose: some environments
# cannot reach the GitHub API or update.code.visualstudio.com, so "latest"
# lookups are not used. Bump VERSION by hand.
set -euo pipefail

VERSION="${CODIUM_VERSION:-1.143.17232}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/.cache/vscodium-${VERSION}"
EXE="${DEST}/codium"

if [[ ! -x "${EXE}" ]]; then
  url="https://github.com/VSCodium/vscodium/releases/download/${VERSION}/VSCodium-linux-x64-${VERSION}.tar.gz"
  echo "fetching ${url}" >&2
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT
  curl -fsSL --retry 3 -o "${tmp}/codium.tar.gz" "${url}"
  mkdir -p "${tmp}/x"
  tar -xzf "${tmp}/codium.tar.gz" -C "${tmp}/x"
  mkdir -p "$(dirname "${DEST}")"
  rm -rf "${DEST}"
  mv "${tmp}/x" "${DEST}"
fi

echo "${EXE}"
