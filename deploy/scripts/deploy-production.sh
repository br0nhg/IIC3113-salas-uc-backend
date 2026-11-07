#!/usr/bin/env bash
set -euo pipefail

deploy_root=${DEPLOY_ROOT:-/opt/salas-uc}
frontend_dir="$deploy_root/frontend"
backend_dir="$deploy_root/backend"
web_root=${WEB_ROOT:-/var/www/salas-uc}
public_url=${PUBLIC_URL:-https://146.181.52.135}
production_branch=${PRODUCTION_BRANCH:-produccion}
production_env="$backend_dir/.env.production"

[[ $EUID -ne 0 ]] || {
  echo 'Ejecuta este script como el usuario de despliegue, no con sudo.' >&2
  exit 1
}
[[ -d "$frontend_dir/.git" && -d "$backend_dir/.git" ]] || {
  echo 'Faltan los checkouts de frontend o backend.' >&2
  exit 1
}
[[ -f "$production_env" ]] || {
  echo "Falta $production_env" >&2
  exit 1
}

for repository in "$frontend_dir" "$backend_dir"; do
  [[ -z $(git -C "$repository" status --porcelain) ]] || {
    echo "Hay cambios locales en $repository; no se desplegarán." >&2
    exit 1
  }
  git -C "$repository" fetch origin "$production_branch"
  git -C "$repository" switch "$production_branch"
  git -C "$repository" merge --ff-only "origin/$production_branch"
done

frontend_commit=$(git -C "$frontend_dir" rev-parse --short HEAD)
backend_commit=$(git -C "$backend_dir" rev-parse --short HEAD)

compose() {
  docker compose \
    --project-directory "$backend_dir" \
    --env-file "$production_env" \
    -f "$backend_dir/compose.production.yml" \
    "$@"
}

if [[ -n $(compose ps --status running -q db) ]]; then
  backup=$($backend_dir/deploy/scripts/backup-db.sh)
  gzip -t "$backup"
  echo "Backup previo verificado: $backup"
fi

compose build api
compose up -d --wait db
compose run --rm api npm run db:migrate
compose up -d --wait api
curl -fsS http://127.0.0.1:3000/health >/dev/null

frontend_image="salas-uc-frontend-build:$frontend_commit"
docker build \
  --file "$frontend_dir/Dockerfile.production" \
  --tag "$frontend_image" \
  --build-arg VITE_API_URL=/api \
  "$frontend_dir"

release="$(date -u +%Y%m%dT%H%M%SZ)-$frontend_commit"
release_dir="$web_root/releases/$release"
sudo install -d -o "$USER" -g "$(id -gn)" -m 0755 "$release_dir"

container=$(docker create "$frontend_image")
cleanup() {
  if [[ -n ${container:-} ]]; then
    docker rm -f "$container" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
docker cp "$container:/app/dist/." "$release_dir/"
docker rm "$container" >/dev/null
container=
test -f "$release_dir/index.html"
sudo chown -R www-data:www-data "$release_dir"

if [[ -e "$web_root/current" && ! -L "$web_root/current" ]]; then
  echo "$web_root/current existe y no es un enlace simbólico." >&2
  exit 1
fi
sudo ln -sfn "releases/$release" "$web_root/current"
sudo nginx -t
sudo systemctl reload nginx

curl -fsS "$public_url/api/health" >/dev/null
echo "Despliegue correcto: frontend $frontend_commit; backend $backend_commit; release $release"
