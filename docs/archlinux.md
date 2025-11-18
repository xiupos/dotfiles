# \#archlinuxinstallbatte メモ

## sudo without password

```bash
sudo bash -c "echo '%wheel ALL=(ALL:ALL) NOPASSWD: ALL' >> /etc/sudoers"
```

logout & login

## yay

```bash
sudo pacman -S git
git clone https://aur.archlinux.org/yay.git && cd yay && makepkg -si && cd .. && rm -rf yay
```

## fonts

```bash
yay -S noto-fonts noto-fonts-extra noto-fonts-cjk noto-fonts-emoji
```

- https://github.com/yuru7/juisee

## browser and editor

```bash
yay -S google-chrome visual-studio-code-bin neovim
```

login [github](https://github.com/)

## GitHub

```bash
yay -S xclip
ssh-keygen -t ed25519 -C "me@xiupos.net"
systemctl enable --user --now gcr-ssh-agent
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
```

register the public key to [github](https://github.com/settings/ssh/new)

```bash
# test the key
# ssh-keygen -R github.com
ssh git@github.com
```

## tailscale

```bash
yay -S tailscale
sudo systemctl enable --now tailscaled
sudo tailscale login

sudo systemctl enable --now systemd-resolved
# https://tailscale.com/kb/1188/linux-dns#networkmanager--systemd-resolved
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
sudo systemctl restart systemd-resolved
sudo systemctl restart NetworkManager
sudo systemctl restart tailscaled
```

## dotfiles

```bash
yay -S stow
git clone --recursive git@github.com:xiupos/dotfiles.git ~/.dotfiles
make -C ~/.dotfiles
```

reopen chrome

## terminals

```bash
yay -S zsh starship tmux foot xclip

chsh -s $(which zsh)
systemctl --user enable --now foot-server
```

- https://askubuntu.com/questions/1331707/f12-acting-weird-in-21-04-can-no-longer-toggle-guake

## im

```bash
# install fcitx5-cskk
yay -S fcitx5-im fcitx5-cskk skk-jisyo

# set key layout
gsettings set org.gnome.desktop.input-sources show-all-sources true
```

logout & login

## Network

```bash
yay -S nfs-utils networkmanager-openconnect networkmanager-openvpn networkmanager-pptp networkmanager-strongswan networkmanager-vpnc network-manager-sstp
```

## firmware

[fwupd - ArchWiki](https://wiki.archlinux.org/title/Fwupd)

```bash
yay -S gnome-firmware
sudo systemctl enable --now fwupd-refresh.timer
```

- firmware update: `sudo fwupdmgr update`

## power profiles

```bash
yay -S tuned-ppd
sudo systemctl enable --now tuned tuned-ppd
```

## gnome extensions

```bash
yay -S \
  gnome-browser-connector \
  gnome-shell-extensions \
  gnome-shell-extension-appindicator \
  gnome-shell-extension-gnome-ui-tune \
  gnome-shell-extension-gsconnect \
  gnome-shell-extension-legacy-theme-auto-switcher \
  gnome-shell-extension-x11gestures \
  gnome-shell-extension-kimpanel-git \
  gnome-shell-extension-nightthemeswitcher \
  gnome-shell-extension-battery-health-charging-git
```

- https://extensions.gnome.org/extension/6307/quake-terminal/

## docker

```bash
yay -S docker docker-compose docker-buildx
sudo systemctl enable --now docker
sudo groupadd -f docker && sudo usermod -aG docker $USER
```

## mise

```bash
yay -S mise usage
```

## uxplay

```bash
yay -S uxplay

# start uxplay
# systemctl --user start uxplay
```

## apps

```bash
yay -S discord keybase keybase-gui
yay -Rc gnome-tours gnome-software epiphany yelp
```
