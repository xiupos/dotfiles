# \#archlinuxinstallbatte メモ

## install

archinstall

- disk: btrfs on LUKS + LVM, snapper (root, home; timeline/cleanup timers)
- boot: systemd-boot + UKI, mkinitcpio (`encrypt lvm2`)
- swap: zram-generator
- desktop: gnome, gdm
- audio: pipewire
- graphics: all open-source drivers (intel, amd, nouveau)
- network: networkmanager, iwd, bluez (enabled)
- misc: hostname, locale, keymap, timesyncd, mirrorlist, `sudoers.d/00_$USER`
- packages: git vim nano htop wget openssh smartmontools

## sudo without password

```bash
echo '%wheel ALL=(ALL:ALL) NOPASSWD: ALL' | sudo tee -a /etc/sudoers
```

## multilib

uncomment `[multilib]` in `/etc/pacman.conf`

```bash
sudo pacman -Syu
```

## yay

```bash
git clone https://aur.archlinux.org/yay.git && cd yay && makepkg -si && cd .. && rm -rf yay
```

## zram

```bash
printf '[zram0]\nzram-size = ram * 2\n' | sudo tee /etc/systemd/zram-generator.conf
```

## thinkpad

```bash
yay -S thinkfan
echo 'options thinkpad_acpi fan_control=1' | sudo tee /etc/modprobe.d/thinkpad_acpi.conf
sudo systemctl enable thinkfan thinkfan-sleep thinkfan-wakeup
```

- fan curve: `/etc/thinkfan.conf`
- lid close: `HandleLidSwitch=ignore` in `/etc/systemd/logind.conf`

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

## Network

```bash
# nfs
yay -S nfs-utils
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

## printer

```bash
# generic drivers
yay -S foomatic-db foomatic-db-engine foomatic-db-ppds

# print to pdf
yay -S cups-pdf

# network printers
yay -S cups-browsed

sudo systemctl enable --now cups avahi-daemon cups-browsed
sudo usermod -aG printadmin $USER

# let avahi publish mDNS, resolved only resolves .local
sudo mkdir -p /etc/systemd/resolved.conf.d
printf '[Resolve]\nMulticastDNS=resolve\n' | sudo tee /etc/systemd/resolved.conf.d/mdns.conf
sudo systemctl restart systemd-resolved avahi-daemon
```

## scanner

```bash
# driverless (eSCL/WSD) network scanner
yay -S sane-airscan simple-scan
```

## docker

```bash
yay -S docker docker-compose docker-buildx
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

## nix

```bash
yay -S nix
echo 'experimental-features = nix-command flakes' | sudo tee -a /etc/nix/nix.conf
sudo systemctl enable --now nix-daemon
```

## yubikey

```bash
yay -S yubikey-manager yubico-authenticator pcsc-tools
sudo systemctl enable --now pcscd.socket
```

reboot

## fonts

```bash
yay -S noto-fonts-extra noto-fonts-cjk noto-fonts-emoji
yay -S tex-gyre-fonts tex-gyre-math-fonts
```

- [Juisee](https://github.com/yuru7/juisee): chezmoi external

## gnome extensions

```bash
yay -S \
  gnome-browser-connector \
  gnome-shell-extensions \
  gnome-shell-extension-appindicator \
  gnome-shell-extension-gnome-ui-tune-git \
  gnome-shell-extension-gsconnect \
  gnome-shell-extension-kimpanel-git \
  gnome-shell-extension-legacy-theme-auto-switcher-git \
  gnome-shell-extension-nightthemeswitcher \
  gnome-shell-extension-space-bar-git \
  gnome-shell-extension-battery-health-charging-git
```

- https://extensions.gnome.org/extension/6307/quake-terminal/
- battery health charging: run the extension's installer (polkit rule)

## gdm

```bash
yay -S gdm-settings
```

## im

```bash
yay -S fcitx5-im fcitx5-skk

mkdir -p ~/.config/environment.d
printf '%s\n' GTK_IM_MODULE=fcitx QT_IM_MODULE=fcitx 'QT_IM_MODULES="wayland;fcitx;ibus"' XMODIFIERS=@im=fcitx \
  > ~/.config/environment.d/10-fcitx.conf
```

- show all input sources: chezmoi (dconf)

## browser and editor

```bash
yay -S adw-gtk-theme
yay -S google-chrome brave-bin visual-studio-code-bin
```

login [github](https://github.com/)

- Tweaks: Appearance -> Legacy Applications `Adw-gtk3`

## terminals

```bash
yay -S zsh tmux-git foot wezterm

chsh -s $(which zsh)
```

- zsh plugins: antidote (chezmoi), cloned on first start
- starship, neovim: mise
- foot server: `~/.config/autostart/foot-server.desktop`

## dotfiles

```bash
yay -S chezmoi mise usage
chezmoi init --apply xiupos
```

- `mise install`, gcr-ssh-agent: chezmoi
- cli tools (gh, pandoc, ...): mise
- switch to ssh after [GitHub](#github): `chezmoi git -- remote set-url origin git@github.com:xiupos/dotfiles.git`

reopen chrome

## GitHub

```bash
yay -S xclip
ssh-keygen -t ed25519 -C "me@xiupos.net"
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
```

register the public key to [github](https://github.com/settings/ssh/new)

```bash
# test the key
# ssh-keygen -R github.com
ssh git@github.com
```

logout & login

## apps

```bash
yay -S discord steam obsidian zotero syncthing
yay -Rc gnome-tour gnome-software epiphany yelp
systemctl --user enable --now syncthing
```

## keybase

```bash
yay -S keybase
```

## uxplay

```bash
yay -S uxplay

# start uxplay
# systemctl --user start uxplay
```

## texlive

- [texlive](texlive.md)
