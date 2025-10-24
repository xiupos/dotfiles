all: local/share/blesh/out/ble.sh stow

local/share/blesh/out/ble.sh:
	make -C local/share/blesh

stow:
	stow -vt ~ home
	stow -vt ~/.config config
	stow -vt ~/.local local

restow:
	stow -Rvt ~ home
	stow -Rvt ~/.config config
	stow -Rvt ~/.local local
