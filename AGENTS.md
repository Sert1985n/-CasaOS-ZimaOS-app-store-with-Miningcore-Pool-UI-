## Cursor Cloud specific instructions

### Project overview

This is a CasaOS/ZimaOS App Store containing Docker Compose-based app definitions for a cryptocurrency mining pool (Miningcore). The only custom application code is the **Mining Pool Configuration** Node.js/Express server in `Apps/Mining Pool Configuration/`.

### Services and ports

| Service | Port | How to run |
|---------|------|------------|
| PostgreSQL | 5432 | `docker compose up -d` in `Apps/postgres/` |
| Mining Pool Configuration (Node.js) | 4050 | `node server.js` in `Apps/Mining Pool Configuration/` with env vars (see below) |
| Miningcore (pool engine) | 4000 | `docker run` from `theretromike/miningcore:latest` (see caveats) |
| Pool UI (Nginx) | 81 | `docker run nginx:alpine` mounting `Apps/miningcore/poolui/` |

### Running the Mining Pool Configuration app (dev mode)

```
cd "Apps/Mining Pool Configuration"
npm install
PORT=4050 MININGCORE_CONFIG=/media/ZimaOS-HD/miningcore/config.json MC_CONFIG=/media/ZimaOS-HD/miningcore/config.json MININGCORE_COINS=/media/ZimaOS-HD/miningcore/coins.json MC_COINS=/media/ZimaOS-HD/miningcore/coins.json COINS_MAP_PATH=/media/ZimaOS-HD/miningcore/coins-map.json MC_CONTAINER=miningcore POOL_NAME=public-pool-btc.ru POOL_FEE_PERCENT=1.5 node server.js
```

### Important caveats

- **Docker cgroup issue**: The `theretromike/miningcore:latest` image cannot start with `deploy.resources.limits` (cpus/memory) in this nested Docker environment due to cgroup v2 threading mode. Run it without resource limits using `docker run` directly instead of `docker compose up` from `Apps/miningcore/`.
- **pool_network**: PostgreSQL's compose file creates the `pool_network` Docker network. Start PostgreSQL first (`Apps/postgres/docker compose up -d`). Do NOT manually create `pool_network` beforehand—it will conflict.
- **Nginx Pool-Monero-XMR dependency**: The Nginx config in `Apps/miningcore/poolui/nginx.conf` references `Pool-Monero-XMR` upstream. In dev, either run a dummy container (`docker run -d --name Pool-Monero-XMR --network pool_network nginx:alpine`) or the actual `Apps/Pool-Monero-XMR` compose stack.
- **Data directories**: Config files live in `/media/ZimaOS-HD/miningcore/` (created by PostgreSQL init container). Node data goes in `/media/ZimaOS-HD/nodes/<coin>/`. Create these directories before starting services.
- **Miningcore API returns 500**: This is expected when coin nodes aren't running. Miningcore logs "Waiting for daemons to come online" — this does not indicate a configuration error.

### CI checks

The GitHub Actions CI runs two checks on PRs (see `.github/workflows/`):
1. **YAML name field**: checks that all `docker-compose.yml` files have `name:` matching `[a-z0-9_-]`
2. **Docker Compose validation**: runs CasaOS app management validator on all compose files

To run locally:
```bash
# YAML name check
find . -type f \( -name "docker-compose.yaml" -o -name "docker-compose.yml" \) | while read -r file; do
  grep -qP '^name:\s[a-z0-9_-]*\r?$' "$file" && echo "OK: $file" || echo "FAIL: $file"
done

# Docker compose validation
find . -type f \( -name "docker-compose.yaml" -o -name "docker-compose.yml" \) -exec docker compose -f {} config \; > /dev/null
```
