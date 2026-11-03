#!/usr/bin/env bash
set -u

section() {
  printf '\n## %s\n' "$1"
}

section "Sistema"
uname -a
printf 'Arquitectura: '
uname -m
printf 'Uptime: '
uptime

section "CPU"
lscpu | sed -n '/^Architecture:/p;/^CPU(s):/p;/^Model name:/p;/^Thread(s) per core:/p;/^Core(s) per socket:/p'

section "Memoria"
free -h

section "Discos"
df -hT
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINTS

section "Docker"
docker version --format 'Server {{.Server.Version}}' 2>&1 || true
docker compose version 2>&1 || true
docker system df 2>&1 || true
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>&1 || true
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.PIDs}}' 2>&1 || true

section "Puertos escuchando"
sudo ss -lntup 2>&1 || ss -lntup 2>&1 || true

section "Firewall del host"
sudo ufw status verbose 2>&1 || true

section "Nginx"
systemctl is-active nginx 2>&1 || true
nginx -v 2>&1 || true

section "Bot (solo estado)"
for bot_dir in /opt/botspear/botSpear /opt/botSpear; do
  if [[ -f "$bot_dir/compose.yaml" ]]; then
    printf 'Proyecto detectado: %s\n' "$bot_dir"
    docker compose --project-directory "$bot_dir" ps 2>&1 || true
  fi
done

section "Nota OCI"
printf '%s\n' 'Completar desde la consola: tipo de cuenta, región principal, shape, OCPU, RAM, tamaño de boot volume y cuotas.'
