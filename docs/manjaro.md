# manjaro メモ

## sudo without password

```bash
sudo bash -c "echo '%wheel ALL=(ALL:ALL) NOPASSWD: ALL' >> /etc/sudoers"
```

logout & login

## yay

```bash
# set mirror
sudo pacman-mirrors --country Japan --api --protocol https && sudo pacman -Syu

# install yay
git clone https://aur.archlinux.org/yay.git && cd yay && makepkg -si && cd .. && rm -rf yay
```

## browser and editor

```bash
yay -S google-chrome visual-studio-code-bin vim
```

login [github](https://github.com/)

## setup dotfiles

```bash
yay -S stow
git clone --recursive git@github.com:xiupos/dotfiles.git ~/.dotfiles
make -C ~/.dotfiles
```

reopen chrome

## setup git

```bash
ssh-keygen -t ed25519 -C "me@xiupos.net"
cat ~/.ssh/id_ed25519.pub
```

register the public key to [github](https://github.com/settings/ssh/new)

```bash
# test the key
ssh git@github.com
```

## setup terminal

```bash
yay -S tmux xclip guake
guake --restore-preferences ~/.dotfiles/other/guake_prefs
```

- https://askubuntu.com/questions/1331707/f12-acting-weird-in-21-04-can-no-longer-toggle-guake

## setup im

```bash
# install fcitx5-cskk
yay -S fcitx5-im fcitx5-cskk

# set key layout
gsettings set org.gnome.desktop.input-sources show-all-sources true
```

logout & login

## apps

```bash
yay -S discord keybase keybase-gui
yay -Rc firefox manjaro-hello manjaro-settings-manager manjaro-settings-manager-notifier pamac-cli pamac-gnome-integration pamac-gtk
```
