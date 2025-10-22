stow:
	stow -vt ~ home
	stow -vt ~/.config config

restow:
	stow -Rvt ~ home
	stow -Rvt ~/.config config
