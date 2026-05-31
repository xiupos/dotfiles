#!/usr/bin/env bash
# hash: {{ $f := "private_dot_local/private_share/gnome-extensions-settings/quake-terminal.dconf" }}{{ if stat (joinPath .chezmoi.sourceDir $f) }}{{ include "private_dot_local/private_share/gnome-extensions-settings/quake-terminal.dconf" | sha256sum }}{{ else }}no-file{{ end }}
dconf load /org/gnome/shell/extensions/quake-terminal/ \
  < "${HOME}/.local/share/gnome-extensions-settings/quake-terminal.dconf"
