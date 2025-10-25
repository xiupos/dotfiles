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

# aliases
alias ls='ls --color=auto'
alias grep='grep --colour=auto'
alias egrep='egrep --colour=auto'
alias fgrep='fgrep --colour=auto'
alias cp="cp -i"
alias df='df -h'
alias free='free -m'
alias more=less

# env
BROWSER=/usr/bin/xdg-open
[[ -f ~/.env ]] && export $(envsubst < ~/.env)

# -------------------------------------------------------------------

# git-prompt config (https://wiki.archlinux.org/title/Git#Git_prompt)
GIT_PS1_SHOWUPSTREAM=1
GIT_PS1_DESCRIBE_STYLE=1

# Change the window title of X terminals
PROMPT_COMMAND='echo -ne "\033]0;${USER}@${HOSTNAME}:${PWD/#$HOME/\~}$(__git_ps1 " (%s)")\007"'

# PS1
PS1='\w\[\033[36m\]$(__git_ps1 " (%s)") \[\033[01;32m\]\$ \[\033[00m\]'

# -------------------------------------------------------------------

# import ~/.bash.d/*
[ -d ~/.bash.d ] && for i in ~/.bash.d/*; do import-sh "${i}"; done

# attach ble.sh
[[ ! ${BLE_VERSION-} ]] || ble-attach

# unset vars
unset import-sh
