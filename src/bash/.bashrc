# ~/.bashrc

[[ $- != *i* ]] && return
import-sh() { [[ -f "$1" ]] && . "$@"; }

# -------------------------------------------------------------------

# ble.sh - https://github.com/akinomyoga/ble.sh
import-sh ~/.local/share/blesh/out/ble.sh --attach=none

# completion
import-sh /usr/share/bash-completion/bash_completion
import-sh /usr/share/git/completion/git-completion.bash

# git-prompt
__git_ps1() { :; }
import-sh /usr/share/git/completion/git-prompt.sh # archlinux/manjaro
import-sh /usr/lib/git-core/git-sh-prompt # ubuntu/debian

# misc
xhost +local:root > /dev/null 2>&1
shopt -s cdspell checkwinsize cmdhist dotglob expand_aliases extglob histappend hostcomplete
complete -cf sudo

# -------------------------------------------------------------------

# git-prompt config (https://wiki.archlinux.org/title/Git#Git_prompt)
GIT_PS1_SHOWDIRTYSTATE=1
GIT_PS1_SHOWUPSTREAM=1
GIT_PS1_DESCRIBE_STYLE=1
GIT_PS1_SHOWCOLORHINTS=1

# styles
RED="\[\e[1;31m\]"
GREEN="\[\e[1;32m\]"
RESET="\[\e[00m\]"

# parts
GIT_INFO="\$(__git_ps1 \" %s\")"
DOLLAR=" \$([[ \$? = 0 ]] && echo '${GREEN}' || echo '${RED}')\$${RESET}"

# prompt
PS1="\w${GIT_INFO}${DOLLAR} "

# -------------------------------------------------------------------

# env
[[ -f ~/.env ]] && export $(envsubst < ~/.env)

# import ~/.bash.d/*
[ -d ~/.bash.d ] && for i in ~/.bash.d/*; do import-sh "${i}"; done

# attach ble.sh
[[ ! ${BLE_VERSION-} ]] || ble-attach

# unset vars
unset import-sh
