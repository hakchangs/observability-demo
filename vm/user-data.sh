source .env

cat <<EOF > .tmp/user-data

#cloud-config

hostname: devops.local
fqdn: devops.local

users:
  - name: hakchangs
    groups: sudo
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    lock_passwd: false
    ssh_authorized_keys:
      - ${SSH_KEY}
  - name: root
    ssh_authorized_keys:
      - ${SSH_KEY}

ssh_pwauth: true
disable_root: false
chpasswd:
  list: |
    hakchangs:1234
    root:root
  expire: False

packages:
  - qemu-guest-agent
  - curl
  - wget
  - git
  - dnsutils
  - net-tools

runcmd:
  - systemctl enable qemu-guest-agent --now
  - timedatectl set-timezone Asia/Seoul
  # - echo nameserver 8.8.8.8  > /etc/resolv.conf
  - ufw disable
  - echo "Cloud-init provisioning complete"
EOF