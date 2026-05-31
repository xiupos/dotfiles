# dotfiles

Requires:
- [Mise](https://mise.jdx.dev/installing-mise.html)
- [Starship](https://starship.rs/)
- [Chezmoi](https://www.chezmoi.io/install/)

```bash
chezmoi init --apply xiupos
```

## remote

```bash
# install mise
curl https://mise.run | sh

# install starship
curl -sS https://starship.rs/install.sh | sh -s -- --bin-dir ~/.local/bin --yes

# install chezmoi
sh -c "$(curl -fsLS get.chezmoi.io/lb)" -- init --apply xiupos
```

## installbattle

- [manjaro](docs/manjaro.md)
- [archlinux](docs/archlinux.md)
- [gentoo](docs/gentoo.md)
