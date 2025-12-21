# ubuntu server

```sh
echo '%sudo ALL=(ALL:ALL) NOPASSWD: ALL' | sudo tee -a /etc/sudoers

# tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh # login to tailscale

# unattended-upgrades
sudo apt-get install -y unattended-upgrades debconf-utils
echo "unattended-upgrades unattended-upgrades/enable_auto_updates boolean true" | sudo debconf-set-selections
sudo dpkg-reconfigure -f noninteractive unattended-upgrades
sudo sed -i 's|//\s*\("\${distro_id}:\${distro_codename}-updates";\)|\1|' /etc/apt/apt.conf.d/50unattended-upgrades

# docker
sudo snap install docker
sudo addgroup --system docker
sudo gpasswd -a $USER docker
# sudo reboot
```
