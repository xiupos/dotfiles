# ~/.zshrc

[[ $- != *i* ]] && return
import-sh() { [[ -f "$1" ]] && . "$@"; }

# -------------------------------------------------------------------

# env
[[ -f ~/.env ]] && export $(envsubst < ~/.env)

# import ~/.sh.d/* and  ~/.sh.d/*
[ -d ~/.zsh.d ] && for i in ~/.zsh.d/*; do import-sh "${i}"; done

# completion
fpath=($fpath ~/.local/share/zsh/completion)

# -------------------------------------------------------------------

# init zim - https://github.com/zimfw/zimfw
ZIM_HOME=${ZDOTDIR:-${HOME}}/.zim
if [[ ! -e ${ZIM_HOME}/zimfw.zsh ]]; then
  if (( ${+commands[curl]} )); then
    curl -fsSL --create-dirs -o ${ZIM_HOME}/zimfw.zsh \
        https://github.com/zimfw/zimfw/releases/latest/download/zimfw.zsh
  else
    mkdir -p ${ZIM_HOME} && wget -nv -O ${ZIM_HOME}/zimfw.zsh \
        https://github.com/zimfw/zimfw/releases/latest/download/zimfw.zsh
  fi
fi
if [[ ! ${ZIM_HOME}/init.zsh -nt ${ZIM_CONFIG_FILE:-${ZDOTDIR:-${HOME}}/.zimrc} ]]; then
  source ${ZIM_HOME}/zimfw.zsh init -q
fi
source ${ZIM_HOME}/init.zsh

# -------------------------------------------------------------------

# unset vars
unset -f import-sh
