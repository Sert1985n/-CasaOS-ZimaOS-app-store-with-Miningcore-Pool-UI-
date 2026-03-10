const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4050;
const MININGCORE_DIR = process.env.MININGCORE_DIR || "/app/miningcore";
const CONFIG_PATH = process.env.MININGCORE_CONFIG || process.env.MC_CONFIG || path.join(MININGCORE_DIR, "config.json");
const COINS_PATH = process.env.MININGCORE_COINS || process.env.MC_COINS || path.join(MININGCORE_DIR, "coins.json");
const COINS_MAP_PATH = process.env.COINS_MAP_PATH || path.join(path.dirname(CONFIG_PATH), "coins-map.json");
const DATA_DIR = path.dirname(CONFIG_PATH);
const MININGCORE_CONTAINER = process.env.MININGCORE_CONTAINER || "miningcore";
const POOL_NAME = process.env.POOL_NAME || "public-pool-btc.ru";
const POOL_FEE_PERCENT = Number(process.env.POOL_FEE_PERCENT || "1.5");

function readJsonSafe(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}
function writeJsonAtomic(p, obj) {
  const tmp = p + ".tmp";
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

const DEFAULT_COINS = [
  { id:"btc", symbol:"BTC", coin:"bitcoin",            algo:"sha256d", stratum:6004, rpc:9004, zmq:7004, node:"Node-BTC" },
  { id:"bch", symbol:"BCH", coin:"bitcoin-cash",       algo:"sha256d", stratum:6002, rpc:9002, zmq:7002, node:"Node-BCH" },
  { id:"bch2", symbol:"BCH2", coin:"bitcoincashii",   algo:"sha256d", stratum:6033, rpc:9033, zmq:7033, node:"Node-BCH2" },
  { id:"bsv", symbol:"BSV", coin:"bitcoin-sv",         algo:"sha256d", stratum:6005, rpc:9005, zmq:7005, node:"Node-BSV" },
  { id:"bc2", symbol:"BC2", coin:"bitcoin-ii",         algo:"sha256d", stratum:6006, rpc:9006, zmq:7006, node:"Node-BC2" },
  { id:"xec", symbol:"XEC", coin:"ecash",              algo:"sha256d", stratum:6007, rpc:9007, zmq:7007, node:"Node-XEC" },
  { id:"dgb", symbol:"DGB", coin:"digibyte-sha256",    algo:"sha256d", stratum:6001, rpc:9001, zmq:7001, node:"Node-DGB" },
  { id:"ppc", symbol:"PPC", coin:"peercoin",           algo:"sha256d", stratum:6012, rpc:9012, zmq:7012, node:"Node-PPC" },
  { id:"vtc", symbol:"VTC", coin:"vertcoin",           algo:"sha256d", stratum:6008, rpc:9008, zmq:7008, node:"Node-VTC" },
  { id:"rvn", symbol:"RVN", coin:"ravencoin",          algo:"kawpow",  stratum:6010, rpc:9010, zmq:7010, node:"Node-RVN" },
  { id:"xna", symbol:"XNA", coin:"neurai",             algo:"sha256d", stratum:6011, rpc:9011, zmq:7011, node:"Node-XNA" },
  { id:"grs", symbol:"GRS", coin:"groestlcoin",        algo:"groestl", stratum:6013, rpc:9013, zmq:7013, node:"Node-GRS" },
  { id:"ltc", symbol:"LTC", coin:"litecoin",           algo:"scrypt",  stratum:6020, rpc:9020, zmq:7020, node:"Node-LTC" },
  { id:"doge",symbol:"DOGE",coin:"dogecoin",           algo:"scrypt",  stratum:6003, rpc:9003, zmq:7003, node:"Node-DOGE" },
  { id:"etc", symbol:"ETC", coin:"ethereumclassic",    algo:"etchash", stratum:6021, rpc:0,    zmq:0,    node:"Node-ETC" },
  { id:"ethw",symbol:"ETHW",coin:"ethereumpow",        algo:"ethash",  stratum:6014, rpc:0,    zmq:0,    node:"Node-ETHW" },
  { id:"erg", symbol:"ERG", coin:"ergo",               algo:"autolykos2", stratum:6015, rpc:0, zmq:0,    node:"Node-ERG" },
  { id:"xmr", symbol:"XMR", coin:"monero",             algo:"randomx", stratum:6009, rpc:18082, zmq:0,   node:"Node-XMR" },
  { id:"zeph",symbol:"ZEPH",coin:"zephyr",             algo:"randomx", stratum:0,    rpc:0,    zmq:0,    node:"Node-ZEPH" },
  { id:"octa",symbol:"OCTA",coin:"octaspace",          algo:"ethash",  stratum:0,    rpc:0,    zmq:0,    node:"Node-OCTA" },
  { id:"zen", symbol:"ZEN", coin:"komodo",             algo:"equihash",stratum:0,    rpc:0,    zmq:0,    node:"Node-ZEN" },
  { id:"flux",symbol:"FLUX",coin:"flux",               algo:"zelhash", stratum:0,    rpc:0,    zmq:0,    node:"Node-FLUX" },
  { id:"firo",symbol:"FIRO",coin:"firo",               algo:"firopow", stratum:0,    rpc:0,    zmq:0,    node:"Node-FIRO" },
  { id:"kas", symbol:"KAS", coin:"kaspa",              algo:"kheavyhash", stratum:0, rpc:0, zmq:0,      node:"Node-KAS" },
  { id:"nexa",symbol:"NEXA",coin:"nexa",               algo:"nexapow", stratum:0,    rpc:0,    zmq:0,    node:"Node-NEXA" },
];



// ---- Runtime settings / defaults ----
const DEFAULT_POOL_FEE_PERCENT = Number(process.env.POOL_FEE_PERCENT || 1.5);
const DEFAULT_RPC_USER = process.env.RPC_USER || "";
const DEFAULT_RPC_PASSWORD = process.env.RPC_PASSWORD || "";
const DEFAULT_RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS || 900);

function isEvmLike(coinKey){
  return ["ethereumclassic","ethereumpow","octaspace"].includes(String(coinKey||"").toLowerCase());
}

async function tcpProbe(host, port, timeoutMs=DEFAULT_RPC_TIMEOUT_MS){
  if(!host || !port || Number(port) <= 0) return { host, port:Number(port)||0, ok:false, reason:"port_not_set" };
  return new Promise((resolve)=>{
    const net = require("net");
    const sock = new net.Socket();
    let done = false;
    const finish = (ok, reason)=>{
      if(done) return;
      done = true;
      try{ sock.destroy(); }catch(e){}
      resolve({ host, port:Number(port), ok, reason });
    };
    sock.setTimeout(timeoutMs);
    sock.once("connect", ()=>finish(true, "ok"));
    sock.once("timeout", ()=>finish(false, "timeout"));
    sock.once("error", (e)=>finish(false, (e && e.code) ? e.code : "error"));
    sock.connect(Number(port), host);
  });
}


function loadCoins() {
  const raw = readJsonSafe(COINS_MAP_PATH, null);
  if (raw && Array.isArray(raw.coins) && raw.coins.length > 0) {
    return raw.coins.map(c => ({
      id: c.id,
      symbol: (c.symbol || c.id || "").toUpperCase(),
      coin: c.coin || c.id,
      stratum: Number(c.stratum) || 0,
      rpc: Number(c.rpcPort || c.rpc) || 0,
      zmq: Number(c.zmqPort || c.zmq) || 0,
      node: "Node-" + (c.id || "").toUpperCase(),
      addressType: c.addressType || ""
    }));
  }
  return DEFAULT_COINS;
}

function baseConfig() {
  return {
    clusterName: POOL_NAME,
    logging: { level: "info" },
    banning: { enabled: true, time: 600, invalidPercent: 50, checkThreshold: 50 },
    api: { enabled: true, listenAddress: "0.0.0.0", port: 4000, adminPort: 4010 },
    persistence: {
      postgres: {
        host: process.env.POSTGRES_HOST || "host.docker.internal",
        port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
        user: process.env.POSTGRES_MC_USER || "miningcore",
        password: process.env.POSTGRES_MC_PASSWORD || "miningcore",
        database: process.env.POSTGRES_MC_DB || "miningcore"
      }
    },
    pools: []
  };
}

function readConfig() {
  const cfg = readJsonSafe(CONFIG_PATH, null);
  return cfg && Array.isArray(cfg.pools) ? cfg : baseConfig();
}
function writeConfig(cfg) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  writeJsonAtomic(CONFIG_PATH, cfg);
}

function ensureDataDirAndDefaults() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  const cfg = readJsonSafe(CONFIG_PATH, null);
  if (!cfg || !Array.isArray(cfg.pools)) {
    writeConfig(baseConfig());
  }
  if (readJsonSafe(COINS_PATH, null) === null) {
    writeJsonAtomic(COINS_PATH, []);
  }
}

function ensurePoolShape(poolId, coinKey, stratumPort, walletAddress, feeWallet, rpcHost, rpcPort, walletPort, minimumPayment){
  const ports = {};
  if(Number(stratumPort) > 0){
    ports[String(stratumPort)] = { listenAddress: "0.0.0.0", difficulty: 1000000, name: "TCP" };
  }
  const minPay = Number(minimumPayment);
  const pool = {
    id: poolId,
    enabled: true,
    coin: coinKey,
    address: walletAddress || "",
    ports,
    paymentProcessing: {
      enabled: true,
      payoutScheme: "SOLO",
      payoutInterval: 600,
      minimumPayment: (minPay >= 0 ? minPay : 0.001),
    },
    rewardRecipients: [],
  };

  // Pool fee (optional)
  if(feeWallet && DEFAULT_POOL_FEE_PERCENT > 0){
    pool.rewardRecipients.push({ address: feeWallet, percentage: DEFAULT_POOL_FEE_PERCENT });
  }

  // Daemon connections
  const host = rpcHost || "127.0.0.1";

  if(isEvmLike(coinKey)){
    // JSON-RPC (geth-like) usually без логина/пароля
    if(Number(rpcPort) > 0){
      pool.daemons = [{ host, port: Number(rpcPort), ssl: false }];
    }
  } else if(String(coinKey||"").toLowerCase() === "monero"){
    // Monero: daemon + wallet-rpc
    if(Number(rpcPort) > 0){
      pool.daemons = [{ host, port: Number(rpcPort), user: DEFAULT_RPC_USER, password: DEFAULT_RPC_PASSWORD, ssl:false }];
    }
    if(Number(walletPort) > 0){
      pool.wallet = { host, port: Number(walletPort), user: DEFAULT_RPC_USER, password: DEFAULT_RPC_PASSWORD, ssl:false };
    }
  } else {
    // UTXO coins: daemon RPC with user/pass
    if(Number(rpcPort) > 0){
      pool.daemons = [{ host, port: Number(rpcPort), user: DEFAULT_RPC_USER, password: DEFAULT_RPC_PASSWORD, ssl:false }];
    }
  }

  return pool;
}

function restartMiningcore() {
  const mc = process.env.MC_CONTAINER || process.env.MININGCORE_CONTAINER || MININGCORE_CONTAINER;
  try {
    const { execSync } = require("child_process");
    const out = execSync("docker restart " + mc, { encoding: "utf8" }).trim();
    return { ok:true, out };
  } catch (e) {
    return { ok:false, err: String(e?.stderr || e?.message || e) };
  }
}

function updatePoolSettings(cfg, poolId, { address, feeAddress, feePercent, enabled }) {
  const idx = (cfg.pools||[]).findIndex(p=>p&&String(p.id).toLowerCase()===String(poolId).toLowerCase());
  if(idx<0) throw new Error("pool not found: "+poolId);
  const p = cfg.pools[idx];
  if (address !== undefined) p.address = String(address||"").trim();
  if (enabled !== undefined) p.enabled = !!enabled;
  if (feeAddress !== undefined || feePercent !== undefined) {
    const rr = p.rewardRecipients||[];
    const feeEntries = rr.filter(r=>r&&(Number(r.percentage)||0)<50);
    const feePct = feePercent !== undefined ? Number(feePercent) : (feeEntries[0]?.percentage ?? 1.5);
    const feeAddr = feeAddress !== undefined ? String(feeAddress||"").trim() : (feeEntries[0]?.address || "");
    p.rewardRecipients = feeAddr ? [{ address: feeAddr, percentage: feePct }] : [];
  }
  if(p.paymentProcessing) p.paymentProcessing.enabled = !!p.address;
  return p;
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "web")));

app.get("/api/health", (_req,res)=>res.json({ ok:true }));
app.get("/api/coins", (_req,res)=>res.json({ ok:true, coins: loadCoins() }));

app.put("/api/pools/:id", (req,res)=>{
  const poolId = (req.params.id||"").toString().toLowerCase();
  const { address, feeAddress, feePercent, enabled, restart } = req.body || {};
  if(!poolId) return res.status(400).json({ ok:false, error: "pool id required" });
  try {
    const cfg = readConfig();
    updatePoolSettings(cfg, poolId, { address, feeAddress, feePercent, enabled });
    writeConfig(cfg);
    if(restart !== false) try{ restartMiningcore(); }catch(e){}
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e.message||e) });
  }
});
app.post("/api/pools/:id/address", (req,res)=>{
  const poolId = (req.params.id||"").toString().toLowerCase();
  const { address, restart } = req.body || {};
  const newAddr = (typeof address==="string" ? address.trim() : "")||"";
  try {
    const cfg = readConfig();
    updatePoolSettings(cfg, poolId, { address: newAddr });
    writeConfig(cfg);
    if(restart !== false) try{ restartMiningcore(); }catch(e){}
    res.json({ ok:true, address: newAddr||null });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e.message||e) });
  }
});
app.post("/api/pools/:id/remove", (req,res)=>{
  const poolId = (req.params.id||"").toString().toLowerCase();
  const { restart } = req.body || {};
  try {
    const cfg = readConfig();
    cfg.pools = (cfg.pools||[]).filter(p=>String(p.id).toLowerCase()!==poolId);
    writeConfig(cfg);
    if(restart !== false) try{ restartMiningcore(); }catch(e){}
    res.json({ ok:true, removed: true });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e.message||e) });
  }
});
app.get("/api/status", (req,res)=>{
  const cfg = readConfig();
  const feeEntry = (rr)=> (rr||[]).find(r=>r&&(Number(r.percentage)||0)<50);
  res.json({ clusterName: cfg.clusterName||POOL_NAME, pools: (cfg.pools||[]).map(p=>{
    const fee = feeEntry(p.rewardRecipients);
    return { id:p.id, coin:p.coin, enabled:!!p.enabled, ports:p.ports||{}, address:(p.address||"").toString(), feeAddress: fee?.address||"", feePercent: fee?.percentage??0 };
  }) });
});

app.get("/api/config", (_req,res)=>{
  const cfg = readJsonSafe(CONFIG_PATH, null);
  res.json({ ok: !!cfg, path: CONFIG_PATH, config: cfg });
});

app.post("/api/enable", async (req,res)=>{
  const { coinId, wallet, poolFeeWallet, customStratumPort, restart, minimumPayment } = req.body || {};
  const settings = readSettings();
  const feeWalletFinal = poolFeeWallet || settings.poolFeeWallet || "";
  if(!coinId) return res.status(400).json({ ok:false, error:"coinId required" });

  const coin = loadCoins().find(c=>c.id===coinId);
  if(!coin) return res.status(404).json({ ok:false, error:"Unknown coinId" });

  const cfg = readConfig();
  cfg.pools = cfg.pools || [];

  const poolId = coin.id;
  const coinKey = coin.coin;

  const stratumPort = Number(customStratumPort || coin.stratum || 0);
  const rpcPort = Number(coin.rpc || 0);
  const walletPort = Number(coin.wallet || 0);
  const rpcHost = String(process.env.MININGCORE_HOST || "127.0.0.1");

  // Port probes (helpful diagnostics)
  const probes = [];
  if(rpcPort > 0) probes.push(await tcpProbe(rpcHost, rpcPort));
  if(walletPort > 0) probes.push(await tcpProbe(rpcHost, walletPort));

  const notes = [];
  if(!wallet) notes.push("wallet_empty");
  if(!feeWalletFinal) notes.push("poolFeeWallet_empty");
  if(rpcPort <= 0 && coinKey !== "monero") notes.push("rpcPort_not_set");
  if(coinKey === "monero" && walletPort <= 0) notes.push("walletPort_not_set");

  // upsert pool (wallet: замена "xxx" на реальный адрес; minimumPayment: мин. выплата для монеты)
  const existingIndex = cfg.pools.findIndex(p=>p.id===poolId);
  const pool = ensurePoolShape(poolId, coinKey, stratumPort, wallet, feeWalletFinal, rpcHost, rpcPort, walletPort, minimumPayment);

  if(existingIndex >= 0) cfg.pools[existingIndex] = { ...cfg.pools[existingIndex], ...pool, enabled:true };
  else cfg.pools.push(pool);

  writeConfig(cfg);

  let restartResult = null;
  if(restart){
    try{
      restartResult = await restartMiningcore();
    }catch(e){
      restartResult = { ok:false, error: String(e && e.message || e) };
    }
  }

  return res.json({ ok:true, coinId, poolId, applied:true, probes, notes, restart: restartResult });
});

app.post("/api/disable", async (req,res)=>{
  const { coinId, restart } = req.body || {};
  if(!coinId) return res.status(400).json({ ok:false, error:"coinId required" });

  const cfg = readConfig();
  const idx = (cfg.pools||[]).findIndex(p=>String(p.id).toLowerCase()===String(coinId).toLowerCase());
  if(idx<0) return res.status(404).json({ ok:false, error:"pool not found: "+coinId });
  cfg.pools[idx].enabled = false;
  writeConfig(cfg);

  let restartResult = null;
  if(restart){
    try{ restartResult = await restartMiningcore(); }
    catch(e){ restartResult = { ok:false, error:String(e && e.message || e) }; }
  }

  return res.json({ ok:true, coinId, disabled: true, restart: restartResult });
});

/* ---- Settings (persist next to config) ---- */
const SETTINGS_PATH = process.env.SETTINGS_PATH || path.join(DATA_DIR, "settings.json");

function readSettings(){
  try{ return JSON.parse(fs.readFileSync(SETTINGS_PATH,"utf8")); }catch(e){ return {}; }
}
function writeSettings(obj){
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive:true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(obj,null,2));
}

app.get("/api/settings", (req,res)=>{
  const st = readSettings();
  return res.json({ ok:true, settings: st });
});

app.post("/api/settings", (req,res)=>{
  const st = readSettings();
  const next = { ...st, ...(req.body||{}) };
  writeSettings(next);
  return res.json({ ok:true, settings: next });
});

ensureDataDirAndDefaults();
app.listen(PORT, () => console.log("Mining Pool Configuration listening on", PORT));

