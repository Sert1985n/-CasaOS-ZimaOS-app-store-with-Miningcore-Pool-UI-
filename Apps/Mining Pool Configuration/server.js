const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");
const express = require("express");
const helmet = require("helmet");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4050;
const CONFIG_PATH = process.env.MININGCORE_CONFIG || process.env.MC_CONFIG || "/data/config.json";
const COINS_PATH = process.env.MININGCORE_COINS || process.env.MC_COINS || "/data/coins.json";
const COINS_MAP_PATH = process.env.COINS_MAP_PATH || path.join(path.dirname(CONFIG_PATH), "coins-map.json");
const DATA_DIR = path.dirname(CONFIG_PATH);
const MC_CONTAINER = process.env.MC_CONTAINER || process.env.MININGCORE_CONTAINER || "miningcore";

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}
function writeJson(p, obj) {
  const tmp = p + ".tmp";
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
}

function readConfig() {
  const c = readJson(CONFIG_PATH, null);
  return c && Array.isArray(c.pools) ? c : { logging:{level:"info"}, persistence:{postgres:{host:"postgresql",port:5432,user:"miningcore",password:"miningcore",database:"miningcore"}}, api:{enabled:true,listenAddress:"*",port:4000}, pools:[] };
}
function writeConfig(c) { writeJson(CONFIG_PATH, c); }

function readCoinsJson() { return readJson(COINS_PATH, {}); }
function readCoinsMap() {
  const raw = readJson(COINS_MAP_PATH, null);
  if (raw && Array.isArray(raw.coins)) return raw.coins;
  if (Array.isArray(raw)) return raw;
  return [];
}

const WALLET_CLI = {
  btc:"bitcoin-cli", bch:"bitcoin-cli", bsv:"bitcoin-cli", bc2:"bitcoinII-cli",
  xec:"bitcoin-cli", dgb:"digibyte-cli", ltc:"litecoin-cli", doge:"dogecoin-cli",
  rvn:"raven-cli", vtc:"vertcoin-cli", ppc:"peercoin-cli", xna:"neurai-cli",
  grs:"groestlcoin-cli", fb:"bitcoin-cli", pepew:"PEPEPOW-cli",
  neox:"neoxa-cli", satox:"satoxcoin-cli", mewc:"meowcoin-cli",
  fren:"frencoin-cli", aipg:"aipg-cli", lcc:"litecoincash-cli"
};

function findFreeStratumQuad(cfg) {
  const used = new Set();
  for (const p of cfg.pools || []) {
    for (const k of Object.keys(p.ports || {})) used.add(Number(k));
  }
  for (let n = 1; n <= 99; n++) {
    const s = String(n).padStart(2, "0");
    const a = Number("60" + s), b = Number("62" + s), c = Number("63" + s), d = Number("64" + s);
    if (!used.has(a) && !used.has(b) && !used.has(c) && !used.has(d)) return { base: a, mid1: b, mid2: c, nerd: d };
  }
  return null;
}

function makePoolTemplate(id, coinKey, containerName, rpcPort, zmqPort, stratumPorts) {
  const ports = {};
  if (stratumPorts) {
    ports[String(stratumPorts.base)] = { name: "General ASIC (1TH)", listenAddress: "0.0.0.0", difficulty: 1024, varDiff: { minDiff: 1, targetTime: 15, retargetTime: 90, variancePercent: 30 } };
    ports[String(stratumPorts.mid1)] = { name: "Adequate ASIC (120TH)", listenAddress: "0.0.0.0", difficulty: 1024, varDiff: { minDiff: 1, targetTime: 15, retargetTime: 90, variancePercent: 30 } };
    ports[String(stratumPorts.mid2)] = { name: "Rich Boi ASIC (250TH)", listenAddress: "0.0.0.0", difficulty: 1024, varDiff: { minDiff: 1, targetTime: 15, retargetTime: 90, variancePercent: 30 } };
    ports[String(stratumPorts.nerd)] = { name: "NerdMiner", listenAddress: "0.0.0.0", difficulty: 0.001, varDiff: { minDiff: 1e-6, targetTime: 15, retargetTime: 90, variancePercent: 30 } };
  }
  const daemon = { host: containerName, port: rpcPort, user: "pooluser", password: "poolpassword" };
  if (zmqPort > 0) daemon.zmqBlockNotifySocket = `tcp://${containerName}:${zmqPort}`;
  return {
    id, enabled: true, coin: coinKey, address: "xxx",
    rewardRecipients: [{ address: "xxx", percentage: 1.5 }],
    blockRefreshInterval: 0, jobRebroadcastTimeout: 10, clientConnectionTimeout: 600,
    banning: { enabled: true, time: 600, invalidPercent: 50, checkThreshold: 50 },
    ports, daemons: [daemon],
    paymentProcessing: { enabled: true, minimumPayment: 0.001, payoutScheme: "SOLO", payoutSchemeConfig: { factor: 2 } }
  };
}

function dockerExec(container, cmd, timeout = 30000) {
  try {
    return { ok: true, out: execFileSync("docker", ["exec", container, ...cmd], { encoding: "utf8", timeout }).trim() };
  } catch (e) {
    return { ok: false, err: (e.stderr || e.message || String(e)).trim() };
  }
}

function dockerRestart(container) {
  try {
    execFileSync("docker", ["restart", container], { encoding: "utf8", timeout: 60000 });
    return { ok: true };
  } catch (e) {
    return { ok: false, err: (e.stderr || e.message || String(e)).trim() };
  }
}

function createWalletAddress(poolId) {
  const cfg = readConfig();
  const pool = (cfg.pools || []).find(p => p.id === poolId);
  if (!pool) return { ok: false, err: "pool not found" };
  const d = (pool.daemons || [])[0];
  if (!d) return { ok: false, err: "no daemon config" };
  const cli = WALLET_CLI[poolId];
  if (!cli) return { ok: false, err: `no CLI mapping for ${poolId}` };
  const container = d.host;
  const rpcArgs = [`-rpcport=${d.port}`, `-rpcuser=${d.user || "pooluser"}`, `-rpcpassword=${d.password || "poolpassword"}`];

  let r = dockerExec(container, [cli, ...rpcArgs, "loadwallet", "default"], 15000);
  if (!r.ok) {
    r = dockerExec(container, [cli, ...rpcArgs, "createwallet", "default"], 15000);
  }
  const addr = dockerExec(container, [cli, ...rpcArgs, "getnewaddress"], 15000);
  if (!addr.ok) return { ok: false, err: addr.err };
  if (!addr.out || addr.out.length < 5) return { ok: false, err: "empty address returned" };
  return { ok: true, address: addr.out };
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "web")));

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.get("/api/pools/full", (_, res) => {
  const cfg = readConfig();
  const pools = (cfg.pools || []).map(p => {
    const d = (p.daemons || [])[0] || {};
    const rr = (p.rewardRecipients || [])[0] || {};
    return {
      id: p.id, coin: p.coin, enabled: !!p.enabled,
      address: p.address || "xxx",
      feeAddress: rr.address || "xxx",
      feePercent: rr.percentage || 0,
      daemonHost: d.host || "", daemonPort: d.port || 0,
      zmq: d.zmqBlockNotifySocket || "",
      ports: p.ports || {},
      stratumPorts: Object.keys(p.ports || {}).map(Number).sort((a, b) => a - b)
    };
  });
  res.json({ ok: true, total: pools.length, pools });
});

app.get("/api/coins/available", (_, res) => {
  const cfg = readConfig();
  const coinsJson = readCoinsJson();
  const existingCoins = new Set((cfg.pools || []).map(p => p.coin));
  const existingIds = new Set((cfg.pools || []).map(p => p.id));
  const available = [];
  for (const [key, val] of Object.entries(coinsJson)) {
    if (!existingCoins.has(key) && !existingIds.has(key)) {
      available.push({ key, name: val.name || key, symbol: val.symbol || key.toUpperCase(), family: val.family || "" });
    }
  }
  res.json({ ok: true, total: available.length, coins: available });
});

app.get("/api/coins/map", (_, res) => {
  res.json({ ok: true, coins: readCoinsMap() });
});

app.post("/api/pool/save", (req, res) => {
  const { poolId, enabled, address, feeAddress, feePercent } = req.body || {};
  if (!poolId) return res.status(400).json({ ok: false, error: "poolId required" });
  const cfg = readConfig();
  const idx = (cfg.pools || []).findIndex(p => p.id === poolId);
  if (idx < 0) return res.status(404).json({ ok: false, error: "pool not found" });
  const p = cfg.pools[idx];
  if (typeof enabled === "boolean") p.enabled = enabled;
  if (address !== undefined) p.address = address;
  if (feeAddress !== undefined || feePercent !== undefined) {
    if (!p.rewardRecipients) p.rewardRecipients = [{}];
    if (feeAddress !== undefined) p.rewardRecipients[0].address = feeAddress;
    if (feePercent !== undefined) p.rewardRecipients[0].percentage = Number(feePercent);
  }
  writeConfig(cfg);
  res.json({ ok: true });
});

app.post("/api/pool/toggle", (req, res) => {
  const { poolId } = req.body || {};
  if (!poolId) return res.status(400).json({ ok: false, error: "poolId required" });
  const cfg = readConfig();
  const p = (cfg.pools || []).find(p => p.id === poolId);
  if (!p) return res.status(404).json({ ok: false, error: "pool not found" });
  p.enabled = !p.enabled;
  writeConfig(cfg);
  res.json({ ok: true, enabled: p.enabled });
});

app.post("/api/pool/clear", (req, res) => {
  const { poolId } = req.body || {};
  if (!poolId) return res.status(400).json({ ok: false, error: "poolId required" });
  const cfg = readConfig();
  const p = (cfg.pools || []).find(p => p.id === poolId);
  if (!p) return res.status(404).json({ ok: false, error: "pool not found" });
  p.address = "xxx";
  if (p.rewardRecipients && p.rewardRecipients[0]) {
    p.rewardRecipients[0].address = "xxx";
    p.rewardRecipients[0].percentage = 0;
  }
  writeConfig(cfg);
  res.json({ ok: true });
});

app.post("/api/pool/add", (req, res) => {
  const { poolId, coinKey, containerName, rpcPort, zmqPort } = req.body || {};
  if (!poolId || !coinKey) return res.status(400).json({ ok: false, error: "poolId and coinKey required" });
  const coinsJson = readCoinsJson();
  if (!coinsJson[coinKey]) return res.status(400).json({ ok: false, error: `coin '${coinKey}' not found in coins.json` });
  const cfg = readConfig();
  if ((cfg.pools || []).find(p => p.id === poolId)) return res.status(400).json({ ok: false, error: `pool '${poolId}' already exists` });
  const stPorts = findFreeStratumQuad(cfg);
  if (!stPorts) return res.status(500).json({ ok: false, error: "no free stratum ports" });
  const container = containerName || `Node-${poolId.toUpperCase()}`;
  const pool = makePoolTemplate(poolId, coinKey, container, Number(rpcPort) || 0, Number(zmqPort) || 0, stPorts);
  cfg.pools.push(pool);
  writeConfig(cfg);
  res.json({ ok: true, pool: { id: poolId, coin: coinKey, ports: stPorts } });
});

app.post("/api/pool/remove", (req, res) => {
  const { poolId } = req.body || {};
  if (!poolId) return res.status(400).json({ ok: false, error: "poolId required" });
  const cfg = readConfig();
  const before = cfg.pools.length;
  cfg.pools = cfg.pools.filter(p => p.id !== poolId);
  writeConfig(cfg);
  res.json({ ok: true, removed: before - cfg.pools.length });
});

app.post("/api/wallet/create", (req, res) => {
  const { poolId } = req.body || {};
  if (!poolId) return res.status(400).json({ ok: false, error: "poolId required" });
  const result = createWalletAddress(poolId);
  if (!result.ok) return res.status(500).json(result);
  const cfg = readConfig();
  const p = (cfg.pools || []).find(p => p.id === poolId);
  if (p) {
    if (p.address === "xxx") p.address = result.address;
    if (p.rewardRecipients && p.rewardRecipients[0] && p.rewardRecipients[0].address === "xxx") {
      p.rewardRecipients[0].address = result.address;
    }
    writeConfig(cfg);
  }
  res.json({ ok: true, address: result.address, applied: true });
});

app.post("/api/restart/node", (req, res) => {
  const { container } = req.body || {};
  if (!container) return res.status(400).json({ ok: false, error: "container required" });
  res.json(dockerRestart(container));
});

app.post("/api/restart/miningcore", (_, res) => {
  res.json(dockerRestart(MC_CONTAINER));
});

app.post("/api/restart/all", (_, res) => {
  const cfg = readConfig();
  const results = [];
  results.push({ name: MC_CONTAINER, ...dockerRestart(MC_CONTAINER) });
  const nodes = new Set();
  for (const p of cfg.pools || []) {
    const d = (p.daemons || [])[0];
    if (d && d.host) nodes.add(d.host);
  }
  for (const n of nodes) results.push({ name: n, ...dockerRestart(n) });
  res.json({ ok: true, results });
});

fs.mkdirSync(DATA_DIR, { recursive: true });
app.listen(PORT, () => console.log(`Pool Configuration panel on port ${PORT}`));
