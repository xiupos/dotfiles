if command -v mise >/dev/null 2>&1; then
  case $- in
    *i*) eval "$(mise activate "${ZSH_VERSION:+zsh}${BASH_VERSION:+bash}")" ;;
    *)   eval "$(mise activate "${ZSH_VERSION:+zsh}${BASH_VERSION:+bash}" --shims)" ;;
  esac
fi
