# Use powerline
USE_POWERLINE="true"
# Has weird character width
# Example:
#    is not a diamond
HAS_WIDECHARS="false"
# Source manjaro-zsh-configuration
if [[ -e /usr/share/zsh/manjaro-zsh-config ]]; then
  source /usr/share/zsh/manjaro-zsh-config
fi
# Use manjaro zsh prompt
if [[ -e /usr/share/zsh/manjaro-zsh-prompt ]]; then
  source /usr/share/zsh/manjaro-zsh-prompt
fi

# .env
[[ -f ~/.env ]] && export $(envsubst < ~/.env)

# browser
export BROWSER=google-chrome-stable

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
