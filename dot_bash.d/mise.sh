if command -v mise >/dev/null 2>&1; then
  if [[ $- == *i* ]]; then
    eval "$(mise activate bash)"
  else
    eval "$(mise activate bash --shims)"
  fi
fi
