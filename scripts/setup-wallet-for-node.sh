#!/bin/bash
# Создаёт wallet через RPC ноды, сохраняет в папку ноды, обновляет config.json
# Использование: ./setup-wallet-for-node.sh btc [CONFIG_PATH]
# CONFIG_PATH по умолчанию: /media/ZimaOS-HD/miningcore/config.json

set -e
POOL_ID="${1:?Usage: $0 <pool_id> [config_path]}"
CONFIG_PATH="${2:-/media/ZimaOS-HD/miningcore/config.json}"
NODES_DIR="${NODES_DIR:-/media/ZimaOS-HD/nodes}"

# CLI map для монет
get_cli() {
  case "$1" in
    btc|bch|bsv|bc2|xec|fb) echo "bitcoin-cli" ;;
    dgb) echo "digibyte-cli" ;;
    ltc) echo "litecoin-cli" ;;
    doge) echo "dogecoin-cli" ;;
    rvn) echo "raven-cli" ;;
    vtc) echo "vertcoin-cli" ;;
    ppc) echo "peercoin-cli" ;;
    xna) echo "neurai-cli" ;;
    grs) echo "groestlcoin-cli" ;;
    *) echo "" ;;
  esac
}

CONTAINER="Node-$(echo "$POOL_ID" | tr '[:lower:]' '[:upper:]')"
CLI=$(get_cli "$POOL_ID")
[ -z "$CLI" ] && { echo "ERROR: pool $POOL_ID not supported for wallet creation"; exit 1; }

# Получить RPC из config.json
RPC_PORT=$(python3 -c "
import json,sys
try:
    c=json.load(open('$CONFIG_PATH'))
    for p in c.get('pools',[]):
        if str(p.get('id','')).lower()=='$POOL_ID':
            d=(p.get('daemons') or [{}])[0]
            print(d.get('port',0))
            sys.exit(0)
except: pass
print(0)
" 2>/dev/null || echo "0")

[ -z "$RPC_PORT" ] && RPC_PORT=0
[ "$RPC_PORT" = "0" ] && { echo "ERROR: pool $POOL_ID not found in config or no daemon port"; exit 1; }

RPC_USER="${RPC_USER:-pooluser}"
RPC_PASS="${RPC_PASS:-poolpassword}"

echo "Creating wallet for $POOL_ID (container=$CONTAINER, rpc=$RPC_PORT)..."

# createwallet default (игнорируем "already exists")
docker exec "$CONTAINER" "$CLI" -rpcport="$RPC_PORT" -rpcuser="$RPC_USER" -rpcpassword="$RPC_PASS" \
  createwallet "default" 2>/dev/null || true

# getnewaddress
ADDR=$(docker exec "$CONTAINER" "$CLI" -rpcport="$RPC_PORT" -rpcuser="$RPC_USER" -rpcpassword="$RPC_PASS" \
  -rpcwallet=default getnewaddress 2>/dev/null | tr -d '\r\n')

[ -z "$ADDR" ] || [ ${#ADDR} -lt 10 ] && { echo "ERROR: getnewaddress failed for $POOL_ID"; exit 1; }

echo "Address: $ADDR"
echo "Wallet.dat: в папке ноды $NODES_DIR/$(echo $POOL_ID | tr '[:upper:]' '[:lower:]')/wallets/default/"

# Обновить config.json (address = pool wallet)
python3 - "$CONFIG_PATH" "$POOL_ID" "$ADDR" << 'PY'
import json, sys
path, pool_id, addr = sys.argv[1], sys.argv[2].lower(), sys.argv[3]
with open(path, "r") as f:
    cfg = json.load(f)
for p in cfg.get("pools", []):
    if str(p.get("id", "")).lower() == pool_id:
        p["address"] = addr
        break
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
print("config.json updated")
PY

echo "Done. Restart Miningcore: docker restart miningcore"
