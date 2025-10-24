## #archlinuxinstallbatte メモ

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

### fonts

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
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
```

register the public key to [github](https://github.com/settings/ssh/new)

```bash
# test the key
ssh-keygen -R github.com && ssh git@github.com
```

## tailescale

```bash
sudo systemctl enable --now tailescaled
sudo tailescale login
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
yay -S tmux guake
guake --restore-preferences ~/.dotfiles/other/guake_prefs
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

### terminals

```bash
yay -S tmux xclip guake

gsettings set org.gnome.desktop.input-sources show-all-sources true
```

### power profiles

```bash
yay -S tuned-ppd
sudo systemctl enable --now tuned tuned-ppd
```

## gnome extensions

```bash
yay -S gnome-shell-extensions gnome-shell-extension-appindicator gnome-shell-extension-arc-menu gnome-shell-extension-dash-to-dock gnome-shell-extension-dash-to-panel gnome-shell-extension-forge gnome-shell-extension-gnome-ui-tune gnome-shell-extension-gsconnect gnome-shell-extension-gtk4-desktop-icons-ng gnome-shell-extension-legacy-theme-auto-switcher gnome-shell-extension-space-bar gnome-shell-extension-x11gestures
```

## apps

```bash
yay -S discord keybase keybase-gui
yay -Rc gnome-tours gnome-software epiphany yelp
```
