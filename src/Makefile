DIR = bash docker fcitx5 foot git mise other tmux

stow: bash/.local/share/blesh/out/ble.sh
	stow -vt ~ $(DIR)

restow: bash/.local/share/blesh/out/ble.sh
	stow -Rvt ~ $(DIR)

delete:
	stow -Dvt ~ $(DIR)

bash/.local/share/blesh/out/ble.sh:
	make -C bash/.local/share/blesh
