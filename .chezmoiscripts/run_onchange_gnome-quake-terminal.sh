#!/usr/bin/env bash
# hash: {{ include "private_dot_local/share/gnome-extensions-settings/quake-terminal.dconf" | sha256sum }}
dconf load /org/gnome/shell/extensions/quake-terminal/ \
  < "${HOME}/.local/share/gnome-extensions-settings/quake-terminal.dconf"
