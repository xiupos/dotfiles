DIR = bash foot fcitx5 mise git tmux

stow: bash/.local/share/blesh/out/ble.sh
	stow -vt ~ $(DIR)

restow: bash/.local/share/blesh/out/ble.sh
	stow -Rvt ~ $(DIR)

bash/.local/share/blesh/out/ble.sh:
	make -C bash/.local/share/blesh
