all: stow guake

stow:
	stow -Rvt ~ home
	stow -Rvt ~/.config config

guake:
	guake --restore-preferences ./other/guake_prefs
