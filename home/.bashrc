# ~/.bashrc

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

# import function
import() { [[ -r "$1" ]] && . "$@" || echo "bashrc: cannot source '$1'" >&2; }


# -----------------------------------------------

# ble.sh
import ~/.local/share/blesh/out/ble.sh --attach=none

# completion
import /usr/share/bash-completion/bash_completion
import /usr/share/git/completion/git-completion.bash

# git-prompt
import /usr/share/git/completion/git-prompt.sh

# Change the window title of X terminals
case ${TERM} in
	xterm*|rxvt*|Eterm*|aterm|kterm|gnome*|interix|konsole*)
		PROMPT_COMMAND='echo -ne "\033]0;${USER}@${HOSTNAME%%.*}:${PWD/#$HOME/\~}\007"'
		;;
	screen*)
		PROMPT_COMMAND='echo -ne "\033_${USER}@${HOSTNAME%%.*}:${PWD/#$HOME/\~}\033\\"'
		;;
esac

# git-prompt config
# GIT_PS1_SHOWDIRTYSTATE=1
# GIT_PS1_SHOWSTASHSTATE=1
# GIT_PS1_SHOWUNTRACKEDFILES=1
GIT_PS1_SHOWUPSTREAM=1
# GIT_PS1_STATESEPARATOR=1
GIT_PS1_DESCRIBE_STYLE=1

use_color=true

# Set colorful PS1 only on colorful terminals.
# dircolors --print-database uses its own built-in database
# instead of using /etc/DIR_COLORS.  Try to use the external file
# first to take advantage of user additions.  Use internal bash
# globbing instead of external grep binary.
safe_term=${TERM//[^[:alnum:]]/?}   # sanitize TERM
match_lhs=""
[[ -f ~/.dir_colors   ]] && match_lhs="${match_lhs}$(<~/.dir_colors)"
[[ -f /etc/DIR_COLORS ]] && match_lhs="${match_lhs}$(</etc/DIR_COLORS)"
[[ -z ${match_lhs}    ]] \
	&& type -P dircolors >/dev/null \
	&& match_lhs=$(dircolors --print-database)
[[ $'\n'${match_lhs} == *$'\n'"TERM "${safe_term}* ]] && use_color=true

if ${use_color} ; then
	# Enable colors for ls, etc.  Prefer ~/.dir_colors #64489
	if type -P dircolors >/dev/null ; then
		if [[ -f ~/.dir_colors ]] ; then
			eval $(dircolors -b ~/.dir_colors)
		elif [[ -f /etc/DIR_COLORS ]] ; then
			eval $(dircolors -b /etc/DIR_COLORS)
		fi
	fi

	# Enable color for git-prompt
	# GIT_PS1_SHOWCOLORHINTS=1

	PS1='\w\[\033[36m\]$(__git_ps1 " (%s)") \[\033[01;32m\]\$ \[\033[00m\]'

	alias ls='ls --color=auto'
	alias grep='grep --colour=auto'
	alias egrep='egrep --colour=auto'
	alias fgrep='fgrep --colour=auto'
else
	PS1='\w$(__git_ps1 " (%s)") \$ '
fi

unset use_color safe_term match_lhs sh

#alias cp="cp -i"                          # confirm before overwriting something
#alias df='df -h'                          # human-readable sizes
#alias free='free -m'                      # show sizes in MB
#alias np='nano -w PKGBUILD'
alias more=less

xhost +local:root > /dev/null 2>&1

# Bash won't get SIGWINCH if another process is in the foreground.
# Enable checkwinsize so that bash will check the terminal size when
# it regains control.  #65623
# http://cnswww.cns.cwru.edu/~chet/bash/FAQ (E11)
shopt -s checkwinsize

shopt -s expand_aliases

# export QT_SELECT=4

# Enable history appending instead of overwriting.  #139609
shopt -s histappend

# .env
[[ -f ~/.env ]] && export $(envsubst < ~/.env)

# report-docker
# alias pandoc='docker run --rm --volume "$(pwd):/data" --user $(id -u):$(id -g) ghcr.io/xiupos/report-docker -d ~/.report/default/report_lualatex.yaml'
alias report-docker='pandoc -d ~/.report/default/report_lualatex.yaml'
# use pandoc directly
# alias pandoc='docker run --rm --volume "$(pwd):/data" --user $(id -u):$(id -g) ghcr.io/xiupos/report-docker'
# use to convert only to pdf
function repo() {
  report-docker -o ${1%%.*}.pdf $1
}
# use to convert only to tex
function repo-tex() {
  report-docker -o ${1%%.*}.tex $1
}
# update image
alias repo-update='docker pull ghcr.io/xiupos/report-docker:latest'

# mise
if [[ -e ~/.local/bin/mise ]]; then
  eval "$(~/.local/bin/mise activate zsh)"
fi

# open
alias open="xdg-open"


# attach ble.sh
[[ ! ${BLE_VERSION-} ]] || ble-attach
