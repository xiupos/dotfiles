# proxmox ve

## lanzone

private VM network behind NAT; upstream sees only the PVE host.

Run as root; replace `n` with the subnet number (0–255, no overlap with upstream).

```sh
apt install dnsmasq
systemctl disable --now dnsmasq
# use SDN's dnsmasq@lanzone
```

Datacenter -> SDN:

- zone: `lanzone`, Simple, IPAM `pve`, DHCP `dnsmasq`
- vnet: `vnet1`, zone `lanzone`
- subnet: `10.n.0.0/24`, gateway `10.n.0.1`, DHCP `10.n.0.100`–`10.n.0.200`
- SNAT: disabled; use MASQUERADE (below)
- Apply; VM NIC bridge: `vnet1`, guest: DHCP

### dynamic uplink

`vmbr0`: DHCP; SDN enables IPv4 forwarding.

Add to the existing `iface vmbr0 inet dhcp` stanza in `/etc/network/interfaces`:

```text
    post-up iptables -t nat -A POSTROUTING -s 10.n.0.0/24 -o vmbr0 -j MASQUERADE
    post-down iptables -t nat -D POSTROUTING -s 10.n.0.0/24 -o vmbr0 -j MASQUERADE
    post-up iptables -t raw -I PREROUTING -i fwbr+ -j CT --zone 1
    post-down iptables -t raw -D PREROUTING -i fwbr+ -j CT --zone 1
```

```sh
ifreload -a
```

- Guest: `curl -I --max-time 10 https://example.com`
- [Proxmox: Masquerading](https://pve.proxmox.com/pve-docs/chapter-sysadmin.html#sysadmin_network_masquerading)
