#!/usr/bin/env bash
# hash: {{ $f := "private_dot_local/private_share/gnome-extensions-settings/quake-terminal.dconf" }}{{ if stat (joinPath .chezmoi.sourceDir $f) }}{{ include "private_dot_local/private_share/gnome-extensions-settings/quake-terminal.dconf" | sha256sum }}{{ else }}no-file{{ end }}

target="${HOME}/.local/share/gnome-extensions-settings/quake-terminal.dconf"

if [[ ! -f "${target}" ]]; then
  echo "quake-terminal.dconf not found, skipping." >&2
  exit 0
fi

dconf load /org/gnome/shell/extensions/quake-terminal/ < "${target}"
