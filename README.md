# dotfiles

Requires:
- [Mise](https://mise.jdx.dev/installing-mise.html)
- [Chezmoi](https://www.chezmoi.io/install/)

```bash
chezmoi init --apply xiupos
```

## remote

no root, Linux + systemd

```bash
# install mise
curl https://mise.run | sh

# install chezmoi (also runs `mise install`)
sh -c "$(curl -fsLS https://get.chezmoi.io/lb)" -- -b ~/.local/bin init --apply xiupos

exec bash
```

- if ssh login doesn't load `~/.bashrc`: `echo '. ~/.bashrc' >> ~/.bash_profile`
- if zsh is installed: `exec zsh` (plugins are cloned on first start)

## installbattle

- [manjaro](docs/manjaro.md)
- [archlinux](docs/archlinux.md)
- [gentoo](docs/gentoo.md)
