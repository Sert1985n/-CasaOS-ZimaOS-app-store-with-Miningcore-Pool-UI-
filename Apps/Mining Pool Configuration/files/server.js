import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const app = express();
app.use(cors());
app.use(express.json({limit:"2mb"}));

const DATA_DIR = process.env.DATA_DIR || "/data";
const MC_CONFIG = process.env.MC_CONFIG || path.join(DATA_DIR, "config.json");
const MC_COINS  = process.env.MC_COINS  || path.join(DATA_DIR, "coins.json");
const DEFAULTS  = process.env.DEFAULTS  || "/app/coins.defaults.json";
const MC_CONTAINER = process.env.MC_CONTAINER || "miningcore";
const POOL_HOST = process.env.STRATUM_HOST || "public-pool-btc.ru";
const POOL_FEE_PCT = Number(process.env.POOL_FEE_PCT || "1.5");

function readJsonSafe(p, fallback=null){
  try{ return JSON.parse(fs.readFileSync(p,"utf8")); }catch(e){ return fallback; }
}
function writeJsonAtomic(p, obj){
  const dir = path.dirname(p);
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

/** Create /data (/media/ZimaOS-HD/miningcore), config.json and coins.json if missing — required for Miningcore to start */
function ensureDataDirAndDefaults(){
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  const cfg = readJsonSafe(MC_CONFIG, null);
  if (!cfg || !Array.isArray(cfg.pools)) {
    const skel = {
      clusterName: process.env.POOL_NAME || "public-pool-btc.ru",
      logging: { level: "info" },
      api: { enabled: true, listenAddress: "0.0.0.0", port: 4000 },
      pools: []
    };
    writeJsonAtomic(MC_CONFIG, skel);
  }
  if (readJsonSafe(MC_COINS, null) === null) {
    writeJsonAtomic(MC_COINS, []);
  }
}

function ensureConfigSkeleton(){
  ensureDataDirAndDefaults();
  const cfg = readJsonSafe(MC_CONFIG, null);
  if(cfg && cfg.pools) return cfg;
  const skel = {
    "clusterName": process.env.POOL_NAME || "public-pool-btc.ru",
    "logging": { "level": "info" },
    "api": { "enabled": true, "listenAddress": "0.0.0.0", "port": 4000 },
    "pools": []
  };
  writeJsonAtomic(MC_CONFIG, skel);
  return skel;
}

function restartMiningcore(){
  // Requires /var/run/docker.sock mounted
  execSync(`docker restart ${MC_CONTAINER}`, {stdio:"pipe"});
}

function upsertPool(cfg, sym, wallet, ports){
  const id = sym.toLowerCase();
  const coinKey = sym.toLowerCase(); // expects miningcore coins.json key; user can edit later
  const pool = {
    "id": id,
    "enabled": true,
    "coin": coinKey,
    "address": wallet || "",
    "rewardRecipients": wallet ? [{ "address": wallet, "percentage": 100-POOL_FEE_PCT }] : [],
    "paymentProcessing": {
      "enabled": !!wallet,
      "payoutScheme": "PPLNS",
      "minimumPayment": 0.0
    },
    "ports": {
      [String(ports.stratum)]: { "difficulty": null, "varDiff": { "minDiff": 8, "maxDiff": 1048576, "targetTime": 15, "retargetTime": 90 }, "name": "VarDiff" }
    },
    "daemons": [
      { "host": process.env[`DAEMON_${sym}_HOST`] || "host.docker.internal", "port": Number(process.env[`DAEMON_${sym}_PORT`] || "0"), "user": process.env[`DAEMON_${sym}_USER`] || "", "password": process.env[`DAEMON_${sym}_PASS`] || "" }
    ]
  };
  const idx = cfg.pools.findIndex(p=>p.id===id);
  if(idx>=0) cfg.pools[idx]=pool; else cfg.pools.push(pool);
  return pool;
}

/** Map pool id -> { container, rpcPort, cli, rpcUser, rpcPass } for wallet creation via docker exec.
 *  Uses config daemons when available; cli is the binary inside the node container. */
const WALLET_COIN_MAP = {
  btc:  { cli: "bitcoin-cli" },
  bch:  { cli: "bitcoin-cli" },
  bch2: { cli: "bitcoincashII-cli", confPath: "/root/.bitcoincashII/bitcoincashII.conf" },
  bsv:  { cli: "bitcoin-cli" },
  bc2:  { cli: "bitcoin-cli" },
  xec:  { cli: "bitcoin-cli" },
  dgb:  { cli: "digibyte-cli" },
  ltc:  { cli: "litecoin-cli" },
  doge: { cli: "dogecoin-cli" },
  rvn:  { cli: "raven-cli" },
  vtc:  { cli: "vertcoin-cli" },
  ppc:  { cli: "peercoin-cli" },
  xna:  { cli: "neurai-cli" },
  grs:  { cli: "groestlcoin-cli" },
  pepw: { cli: "PEPEPOW-cli" }
};

function updatePoolAddress(cfg, poolId, newAddress) {
  const pools = cfg.pools || [];
  const idx = pools.findIndex(p => p && String(p.id).toLowerCase() === String(poolId).toLowerCase());
  if (idx < 0) throw new Error(`pool not found: ${poolId}`);
  const p = pools[idx];

  p.address = newAddress;

  // Сохраняем fee-получателей (малый %), основной пул получает остаток
  const rr = (p.rewardRecipients || []);
  const feeEntries = rr.filter(r => r && (Number(r.percentage) || 0) < 50);
  const feeSum = feeEntries.reduce((s, r) => s + (Number(r.percentage) || 0), 0);
  const mainPct = Math.max(0, 100 - feeSum);
  const mainRecipient = newAddress ? [{ address: newAddress, percentage: mainPct }] : [];
  p.rewardRecipients = [...mainRecipient, ...feeEntries];

  if (p.paymentProcessing) p.paymentProcessing.enabled = !!newAddress;
  pools[idx] = p;
  cfg.pools = pools;
  return p;
}

/** Create wallet via RPC and update config. Returns { address, ok } or throws. */
function createWalletAndUpdate(poolId, options = {}) {
  const { applyToConfig = true, restartAfter = true } = options;
  const cfg = ensureConfigSkeleton();
  const id = String(poolId).toLowerCase();
  const pool = cfg.pools.find(p => p && String(p.id).toLowerCase() === id);
  if (!pool) throw new Error(`pool not found: ${poolId}`);

  const daemon = (pool.daemons || [])[0];
  if (!daemon || !daemon.host || !daemon.port) {
    throw new Error(`pool ${poolId}: no daemon configured (host/port)`);
  }
  const container = daemon.host;
  const rpcPort = Number(daemon.port) || 0;
  const rpcUser = daemon.user || "pooluser";
  const rpcPass = daemon.password || "poolpassword";

  const coinInfo = WALLET_COIN_MAP[id];
  if (!coinInfo) {
    throw new Error(`wallet creation not supported for ${poolId} (no CLI map). Use Panel 83 to paste address manually.`);
  }

  const cli = coinInfo.cli;
  const cmd = `docker exec ${container} ${cli} -rpcport=${rpcPort} -rpcuser=${rpcUser} -rpcpassword=${rpcPass} getnewaddress`;

  let address;
  try {
    address = execSync(cmd, { encoding: "utf8", timeout: 30000 }).trim();
    if (!address || address.length < 10) throw new Error("empty or invalid address");
  } catch (e) {
    throw new Error(`getnewaddress failed: ${e.stderr || e.message || e}. Ensure Node-${id.toUpperCase()} is running and has -wallet=default.`);
  }

  if (applyToConfig) {
    updatePoolAddress(cfg, poolId, address);
    writeJsonAtomic(MC_CONFIG, cfg);
    if (restartAfter) restartMiningcore();
  }
  return { address, ok: true };
}

app.get("/health", (req,res)=>res.json({ok:true}));
app.get("/api/defaults", (req,res)=>res.json(readJsonSafe(DEFAULTS, {})));

app.get("/api/wallet/support", (req,res)=>{
  res.json({ supported: Object.keys(WALLET_COIN_MAP), map: WALLET_COIN_MAP });
});

app.post("/api/wallet/create", (req,res)=>{
  const { poolId, applyToConfig = true, restartAfter = true } = req.body || {};
  const id = (poolId || req.query.poolId || "").toString().toLowerCase();
  if (!id) return res.status(400).json({ ok: false, error: "poolId required" });
  try {
    const out = createWalletAndUpdate(id, { applyToConfig: !!applyToConfig, restartAfter: !!restartAfter });
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post("/api/pools/:id/address", (req,res)=>{
  const poolId = (req.params.id || "").toString().toLowerCase();
  const { address } = req.body || {};
  if (!poolId) return res.status(400).json({ ok: false, error: "pool id required" });
  const newAddr = typeof address === "string" ? address.trim() : "";
  try {
    const cfg = ensureConfigSkeleton();
    updatePoolAddress(cfg, poolId, newAddr);
    writeJsonAtomic(MC_CONFIG, cfg);
    restartMiningcore();
    res.json({ ok: true, address: newAddr || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.get("/api/status", (req,res)=>{
  const cfg = ensureConfigSkeleton();
  res.json({
    clusterName: cfg.clusterName,
    pools: cfg.pools.map(p=>({ id: p.id, coin: p.coin, enabled: !!p.enabled, ports: p.ports||{}, address: (p.address || "").toString() }))
  });
});

app.post("/api/toggle", (req,res)=>{
  const {symbol, enabled, wallet, ports} = req.body || {};
  if(!symbol) return res.status(400).json({ok:false, error:"symbol required"});
  const sym = String(symbol).toUpperCase();
  const cfg = ensureConfigSkeleton();

  const id = sym.toLowerCase();
  const idx = cfg.pools.findIndex(p=>p.id===id);
  const before = idx>=0 ? cfg.pools[idx] : null;

  if(enabled === false){
    if(idx>=0) cfg.pools.splice(idx,1);
    writeJsonAtomic(MC_CONFIG, cfg);
    try{ restartMiningcore(); }catch(e){ return res.status(500).json({ok:false, error:"restart failed", detail:String(e)}); }
    return res.json({ok:true, action:"removed", symbol:sym});
  }

  const defaults = readJsonSafe(DEFAULTS, {});
  const defPorts = (defaults.ports && defaults.ports[sym]) ? defaults.ports[sym] : {stratum:0,rpc:0,zmq:null};
  const finalPorts = Object.assign({}, defPorts, ports||{});
  const pool = upsertPool(cfg, sym, wallet, finalPorts);
  writeJsonAtomic(MC_CONFIG, cfg);

  let restarted=false;
  try{ restartMiningcore(); restarted=true; }catch(e){
    return res.status(500).json({ok:false, error:"restart failed", detail:String(e), pool});
  }

  res.json({ok:true, action: before ? "updated" : "added", restarted, pool});
});

const listen = Number(process.env.PORT || "4050");
ensureDataDirAndDefaults();
app.listen(listen, ()=>console.log("config-backend listening on", listen));
