source .env

echo "⏳ Waiting for guest-agent connection..."

# 1️⃣ guest-agent 연결 대기
until sudo virsh qemu-agent-command $VM_NAME \
'{"execute":"guest-ping"}' >/dev/null 2>&1; do
  sleep 3
done

echo "✅ guest-agent connected"

# 2️⃣ cloud-init 완료 대기
echo "⏳ Waiting for cloud-init to finish..."

sudo virsh qemu-agent-command $VM_NAME \
'{"execute":"guest-exec",
  "arguments":{
    "path":"/usr/bin/cloud-init",
    "arg":["status","--wait"],
    "capture-output":true
  }
}' >/dev/null 2>&1

echo "✅ cloud-init finished"

# 3️⃣ IP 대기
echo "⏳ Waiting for IP..."

MAC=$(sudo virsh dumpxml $VM_NAME \
  | awk -F"'" '/mac address/ {print $2}')

while true; do
  VM_IP=$(sudo virsh net-dhcp-leases default \
    | awk -v mac="$MAC" '$0 ~ mac {print $5}' \
    | cut -d/ -f1)

  if [ -n "$VM_IP" ]; then
    break
  fi
  sleep 2
done

sudo virsh domifaddr $VM_NAME --source agent
