# btrfs

## links

- [btrfs Wiki](https://archive.kernel.org/oldwiki/btrfs.wiki.kernel.org/index.php/Main_Page.html)
- [Btrfs - ArchWiki](https://wiki.archlinux.jp/index.php/Btrfs)

## layout on larch25102

btrfs on LUKS + LVM (`ArchinstallVg-root`), mounted with `compress=zstd:3,ssd,space_cache=v2`.

| subvolume | mount | snapper config |
|---|---|---|
| `@` | `/` | `root` |
| `@home` | `/home` | `home` |
| `@log` | `/var/log` | - |
| `@pkg` | `/var/cache/pacman/pkg` | - |

## usage

```bash
sudo btrfs filesystem usage /   # real numbers; df is only an estimate
sudo btrfs subvolume list /
sudo btrfs subvolume list -d /  # deleted, not yet freed
```

- full when `Device unallocated` is near 0; balance

## snapshots

```bash
sudo snapper -c root list
sudo snapper -c home list
sudo snapper -c root delete 100-200
sudo snapper -c root create -d "before X"
```

- deleted files stay in snapshots until those are deleted
- retention: `TIMELINE_LIMIT_*` in `/etc/snapper/configs/{root,home}`

## balance

```bash
sudo btrfs balance start -dusage=50 -musage=50 /
sudo btrfs balance status /
sudo btrfs balance cancel /
```

- long; run via `sudo systemd-run` to survive the shell

## scrub

```bash
sudo btrfs scrub start /
sudo btrfs scrub status /
sudo systemctl enable --now btrfs-scrub@-.timer  # monthly
```

## quota

off; enabling it shows per-snapshot size but slows deletion and balance.
