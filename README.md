# dotfiles

Install [Mise](https://mise.jdx.dev/installing-mise.html) and [Chezmoi](https://www.chezmoi.io/install/).

```bash
chezmoi init --apply xiupos
```

## remote

```bash
# install mise
curl https://mise.run | sh

# install chezmoi
sh -c "$(curl -fsLS get.chezmoi.io/lb)" -- init --apply xiupos
```

## installbattle

- [manjaro](docs/manjaro.md)
- [archlinux](docs/archlinux.md)
- [gentoo](docs/gentoo.md)
