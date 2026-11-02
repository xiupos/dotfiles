if command -v dircolors >/dev/null 2>&1; then
  if [ -f ~/.dir_colors ]; then
    eval "$(dircolors -b ~/.dir_colors)"
  elif [ -f /etc/DIR_COLORS ]; then
    eval "$(dircolors -b /etc/DIR_COLORS)"
  else
    eval "$(dircolors -b)"
  fi
fi
