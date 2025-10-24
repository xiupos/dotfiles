# \#gentooinstallbattle メモ

- [Gentoo AMD64 Handbook(ja)](https://wiki.gentoo.org/wiki/Handbook:AMD64/ja)
- [Gentoo Cheat Sheet](https://wiki.gentoo.org/wiki/Gentoo_Cheat_Sheet)

## インストールメディア

[Manjaro Install Media](https://manjaro.org/products/download/x86)

```bash
wget -O disk.iso https://download.manjaro.org/gnome/24.1.0/manjaro-gnome-24.1.0-241001-linux610.iso
sudo dd bs=4M if=disk.iso of=/dev/sdx status=progress && sync
```

## インストール作業の途中で中断, 再開

```bash
#
# 中断
#

exit

cd
umount -l /mnt/gentoo/dev{/shm,/pts,}
umount -R /mnt/gentoo
# shutdown -h now
# or
# reboot

#
# 再開
#

swapon /dev/nvme0n1p2

mount /dev/nvme0n1p3 /mnt/gentoo

mount --types proc /proc /mnt/gentoo/proc
mount --rbind /sys /mnt/gentoo/sys
mount --make-rslave /mnt/gentoo/sys
mount --rbind /dev /mnt/gentoo/dev
mount --make-rslave /mnt/gentoo/dev
mount --bind /run /mnt/gentoo/run
mount --make-slave /mnt/gentoo/run

chroot /mnt/gentoo /bin/bash
###
source /etc/profile
export PS1="(chroot) ${PS1}"

mount /dev/nvme0n1p1 /boot
```

## Gentoo Linux のインストール

```bash
#
# ディスクの準備
#

# UEFI 向けに GPT でディスクをパーティショニングする
sgdisk -z /dev/nvme0n1
sgdisk -n 1:0:+512M -t 1:ef00 -c 1:"EFI System" /dev/nvme0n1
sgdisk -n 2:0:+32G -t 2:8200 -c 2:"Linux swap" /dev/nvme0n1
sgdisk -n 3:0: -t 3:8300 -c 3:"Linux filesystem" /dev/nvme0n1

# ファイルシステムを作成する
mkfs.vfat -F 32 /dev/nvme0n1p1
mkfs.btrfs -f /dev/nvme0n1p3
mkswap /dev/nvme0n1p2
swapon /dev/nvme0n1p2

# ルートパーティションのマウント
mkdir -p /mnt/gentoo
mount /dev/nvme0n1p3 /mnt/gentoo

#
# Gentooインストールファイルをインストール
#

# 日時を設定する
ntpd -q -g

# stage tarball をダウンロードする
cd /mnt/gentoo
# https://ftp.iij.ad.jp/pub/linux/gentoo/releases/amd64/autobuilds/current-stage3-amd64-desktop-systemd/
wget https://ftp.iij.ad.jp/pub/linux/gentoo/releases/amd64/autobuilds/current-stage3-amd64-desktop-systemd/stage3-amd64-desktop-systemd-20230319T170303Z.tar.xz

# stage tarball を展開する
tar xpvf stage3-*.tar.xz --xattrs-include='*.*' --numeric-owner

# コンパイルオプションを設定する
cat << EOF > /mnt/gentoo/etc/portage/make.conf
FEATURES="buildpkg parallel-fetch parallel-install distcc getbinpkg"
EMERGE_DEFAULT_OPTS="--jobs=5 --tree --verbose"

PORTDIR="/var/db/repos/gentoo"
DISTDIR="/var/cache/distfiles"
PKGDIR="/var/cache/binpkgs"

LC_MESSAGES=C

MAKEOPTS="--jobs=5 --load-average=5"

COMMON_FLAGS="-march=native -O2 -pipe"
CFLAGS="\${COMMON_FLAGS}"
CXXFLAGS="\${COMMON_FLAGS}"
FCFLAGS="\${COMMON_FLAGS}"
FFLAGS="\${COMMON_FLAGS}"

ACCEPT_KEYWORDS="~amd64"
#ACCEPT_LICENSE="* -@EULA"

USE="cjk clang curl ffmpeg gles2 llvm-libunwind offensive sixel vaapi xinerama zstd"

GENTOO_MIRRORS="https://ftp.jaist.ac.jp/pub/Linux/Gentoo/ https://ftp.riken.jp/Linux/gentoo/ http://ftp.iij.ad.jp/pub/linux/gentoo/ http://ftp.jaist.ac.jp/pub/Linux/Gentoo/ http://ftp.riken.jp/Linux/gentoo/"

GRUB_PLATFORMS="efi-64"
EOF

#
# Gentooベースシステムのインストール
#

# Gentoo ebuild リポジトリ
mkdir -p /mnt/gentoo/etc/portage/repos.conf
cp /mnt/gentoo/usr/share/portage/config/repos.conf /mnt/gentoo/etc/portage/repos.conf/gentoo.conf

# DNS 情報をコピーする
cp --dereference /etc/resolv.conf /mnt/gentoo/etc/

# 必要なファイルシステムをマウントする
mount --types proc /proc /mnt/gentoo/proc
mount --rbind /sys /mnt/gentoo/sys
mount --make-rslave /mnt/gentoo/sys
mount --rbind /dev /mnt/gentoo/dev
mount --make-rslave /mnt/gentoo/dev
mount --bind /run /mnt/gentoo/run
mount --make-slave /mnt/gentoo/run

# 新しい環境に入る
chroot /mnt/gentoo /bin/bash
###
source /etc/profile
export PS1="(chroot) ${PS1}"

# ブートパーティションをマウントする
mkdir /efi
mount /dev/nvme0n1p1 /efi

# Web から Gentoo ebuild リポジトリのスナップショットをインストールする
emerge-webrsync

# 任意自由選択: Gentoo ebuildリポジトリを更新する
# emerge --sync

# 適切なプロファイルを選ぶ
eselect profile list
eselect profile set 7

# 追加可能: バイナリパッケージホストを追加する
getuto

# \@worldの更新
emerge --verbose --update --deep --newuse @world

# タイムゾーン
ln -sf ../usr/share/zoneinfo/Asia/Tokyo /etc/localtime

# ロケールの選択
cat << EOF >> /etc/locale.gen
en_US.UTF-8 UTF-8
ja_JP.UTF-8 UTF-8
EOF
locale-gen
eselect locale list
eselect locale set 4
env-update && source /etc/profile && export PS1="(chroot) ${PS1}"

#
# カーネルの設定
#

# 任意自由選択: ファームウェアとマイクロコードのインストール
emerge sys-devel/distcc sys-kernel/linux-firmware sys-firmware/sof-firmware

# カーネルソースのインストール
emerge sys-kernel/gentoo-kernel-bin
eselect kernel list
eselect kernel set 1

#
# システムの設定
#

# ファイルシステムの情報
cat << EOF >> /etc/fstab
/dev/nvme0n1p1		/efi		vfat		defaults,noatime		0 2
/dev/nvme0n1p2		none		swap		sw		0 0
/dev/nvme0n1p3		/		btrfs		noatime		0 1
EOF

# rootパスワード
passwd # pass

# ホストとドメインのための情報
hostnamectl hostname lenovo2103
systemd-machine-id-setup
systemd-firstboot --prompt # jp106, lenovo2103
systemctl preset-all --preset-mode=enable-only

# ネットワーク
emerge net-misc/dhcpcd
systemctl enable dhcpcd

#
# ツールのインストール
#

# 任意自由選択: ファイルのインデックスを作成
emerge sys-apps/mlocate

# 省略可能: シェル補完
emerge app-shells/bash-completion

# 時刻同期
emerge net-misc/chrony
systemctl enable chronyd

# ファイルシステムツール
emerge sys-block/io-scheduler-udev-rules

# 任意自由選択: ワイヤレス・ネットワークツール # 1, 1のインストール
emerge net-wireless/iw net-wireless/wpa_supplicant

#
# ブートローダーの設定
#

# Emerge
emerge --verbose sys-boot/grub

# インストール
grub-install --efi-directory=/efi

# 設定
grub-mkconfig -o /boot/grub/grub.cfg

#
# インストールの締めくくり
#

# 毎日使用するためのユーザを追加します
useradd -m -G users,wheel,audio -s /bin/bash xiupos
passwd xiupos # pass

# tarファイルの削除
rm /stage3-*.tar.*
```

## 環境構築

```bash
# sudo
emerge app-admin/sudo
echo "%wheel ALL=(ALL:ALL) NOPASSWD: ALL" >> /etc/sudoers

# sshdc
sudo -u xiupos mkdir --parents /home/xiupos/.ssh
sudo -u xiupos sh -c "echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFlM368FQ4t/28RBW78h0HePJ0SbsuL0uqVcqu04LdN2 me@xiupos.net' >> /home/xiupos/.ssh/authorized_keys"
systemctl enable sshd

# git, vim
emerge dev-vcs/git app-editors/vim

# zsh
emerge app-shells/zsh
chsh -s /bin/zsh root
chsh -s /bin/zsh xiupos

# omz
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
omz theme set dieter
sudo -u xiupos sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
omz theme set dieter
exit
exit

# Xorg
emerge \
  media-libs/mesa \
  x11-base/xorg-server \
  x11-base/xorg-drivers
gpasswd -a xiupos video

# Gnome
emerge gnome-base/gnome x11-terms/guake

# Google Chrome
echo "www-client/google-chrome google-chrome" >> /etc/portage/package.license
emerge www-client/google-chrome

# VSCode
echo "app-editors/vscode Microsoft-vscode" >> /etc/portage/package.license
emerge app-editors/vscode

# Discord
echo "net-im/discord all-rights-reserved" >> /etc/portage/package.license
emerge net-im/discord

# eselect/repository
emerge app-eselect/eselect-repository
mkdir -p /etc/portage/repos.conf

# Fcitx, SKK
eselect repository enable gentoo-zh
emerge --sync
emerge \
  app-i18n/fcitx \
  app-i18n/fcitx-configtool \
  app-i18n/fcitx-skk \
  app-i18n/fcitx-qt \
  app-i18n/fcitx-gtk
cat << EOF >> /etc/environment
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
EOF
sudo -u xiupos sh -c "mkdir -p ~/.config/libskk/rules"
sudo -u xiupos sh -c "git clone https://github.com/xiupos/Sapporo ~/.config/libskk/rules/Sapporo"

# Source Code Pro, Source Sans Pro
emerge media-fonts/source-code-pro

# Source Code pro (Nerd)
echo "media-fonts/nerd-fonts sourcecodepro" > /etc/portage/package.use/nerd-fonts
echo "edia-fonts/nerd-fonts Vic-Fieger-License" >> /etc/portage/package.license
emerge media-fonts/nerd-fonts
```

## カーネルコンパイル

```bash
# カーネルソース
emerge sys-kernel/pf-sources
eselect kernel list
eselect kernel set 1
cd /usr/src/linux

# genkernel, clang
emerge sys-kernel/genkernel sys-devel/clang sys-devel/lld

# genkernel.config
cp /etc/genkernel.conf /etc/genkernel.llvm.conf
cat << EOF >> /etc/genkernel.llvm.conf
KERNEL_AS="llvm-as"
KERNEL_AR="llvm-ar"
KERNEL_CC="clang"
KERNEL_LD="ld.lld"
KERNEL_NM="llvm-nm"
UTILS_AS="llvm-as"
UTILS_AR="llvm-ar"
UTILS_CC="clang"
UTILS_CXX="clang++"
UTILS_LD="ld.lld"
UTILS_NM="llvm-nm"
EOF

# カーネルコンフィグ
zcat /proc/config.gz > /usr/src/linux/.config
yes '' | make oldconfig localmodconfig
mv .config .config.local

# カーネルコンパイル
LLVM=1 LLVM_IAS=1 genkernel all \
  --kernel-config=.config.local \
  --config=/etc/genkernel.llvm.conf \
  --kernel-append-localversion=-llvm \
  --utils-objcopy=llvm-objcopy \
  --utils-objdump=llvm-objdump \
  --utils-readelf=llvm-readelf \
  --utils-strip=llvm-strip \
  --utils-ranlib=llvm-ranlib \
  --kernel-objcopy=llvm-objcopy \
  --kernel-objdump=llvm-objdump \
  --kernel-readelf=llvm-readelf \
  --kernel-strip=llvm-strip \
  --kernel-ranlib=llvm-ranlib

# ブートローダの設定
grub-mkconfig -o /boot/grub/grub.cfg
```
