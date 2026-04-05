# 환경변수 로딩
source .env

# 기존 VM 제거 및 디스크 정리
sudo virsh destroy $VM_NAME 2>/dev/null || true
sudo virsh undefine $VM_NAME --remove-all-storage 2>/dev/null || true
sudo rm -f $DISK_PATH

# Cloud-init user-data 생성
./user-data.sh

# VM 생성
sudo virt-install \
  --name $VM_NAME --memory 8192 --vcpus 4 \
  --disk path=$DISK_PATH,size=100,format=qcow2,backing_store=$BASE_IMAGE \
  --network bridge=virbr0 \
  --channel unix,target_type=virtio,name=org.qemu.guest_agent.0 \
  --import \
  --cloud-init user-data=./.tmp/user-data \
  --osinfo=ubuntu24.04 \
  --noautoconsole

# VM IP 확인
./get-ip.sh
