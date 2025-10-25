DIRS := $(shell find . -maxdepth 1 -mindepth 1 -type d -printf "%f ")

stow: bash/.local/share/blesh/out/ble.sh
	stow -vt ~ $(DIRS)

restow: bash/.local/share/blesh/out/ble.sh
	stow -Rvt ~ $(DIRS)

delete:
	stow -Dvt ~ $(DIRS)

bash/.local/share/blesh/out/ble.sh:
	make -C bash/.local/share/blesh
