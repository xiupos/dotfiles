DIRS := $(patsubst %/,%,$(wildcard */))

stow:
	stow -vt ~ $(DIRS)

restow:
	stow -Rvt ~ $(DIRS)

delete:
	stow -Dvt ~ $(DIRS)
