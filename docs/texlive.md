# \#texinstallbattle メモ

## docs

- [quickinstall](https://tug.org/texlive/quickinstall.html)
- [archwiki](https://wiki.archlinux.org/title/TeX_Live)

## install

### TeX Live

```bash
# remove old texlives
rm -rf /usr/local/texlive
sudo rm -rf ~/.texlive2*
rm -rf ~/.texlive2*

# install texlive
curl -OL http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz
tar xf install-tl-unx.tar.gz && cd install-tl-*
sudo perl ./install-tl -no-gui -no-interaction -repository http://mirror.ctan.org/systems/texlive/tlnet/
sudo /usr/local/texlive/????/bin/*/tlmgr path add
cd .. && rm -rf install-tl-*
```

### Pandoc

```bash
```
