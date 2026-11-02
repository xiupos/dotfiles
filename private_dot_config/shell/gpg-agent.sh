# if command -v gpg >/dev/null 2>&1; then
#   export GPG_TTY=$(tty)
#   export SSH_AUTH_SOCK=$(gpgconf --list-dirs agent-ssh-socket)
#   gpgconf --launch gpg-agent
# fi
