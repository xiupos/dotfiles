# dotfiles

Install [Chezmoi](https://www.chezmoi.io/install/).

```bash
chezmoi init --apply xiupos
```

## remote

```bash
mkdir -p $HOME/.local/bin

# install starship
sh -c "$(curl -fsSL https://starship.rs/install.sh)" -- --bin-dir $HOME/.local/bin

# install chezmoi
sh -c "$(curl -fsLS get.chezmoi.io/lb)" -- init --apply xiupos
```

## installbattle

- [manjaro](docs/manjaro.md)
- [archlinux](docs/archlinux.md)
- [gentoo](docs/gentoo.md)
