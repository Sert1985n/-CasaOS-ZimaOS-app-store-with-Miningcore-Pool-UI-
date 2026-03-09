const API = "";
const logEl = document.getElementById("log");
function log(msg) { logEl.textContent = new Date().toLocaleTimeString() + " " + msg + "\n" + logEl.textContent; }

async function api(url, body) {
  const opts = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const r = await fetch(API + url, opts);
  const j = await r.json();
  if (!j.ok && j.error) log("ERROR: " + j.error);
  return j;
}

function esc(s) { return String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function isReal(addr) { return addr && addr !== "xxx" && addr.length > 5; }

async function loadPools() {
  const d = await api("/api/pools/full");
  if (!d.ok) return;
  document.getElementById("poolCount").textContent = d.total + " pools loaded";
  const el = document.getElementById("pools");
  if (!d.pools.length) { el.innerHTML = '<p class="muted">No pools in config.json</p>'; return; }
  el.innerHTML = d.pools.map(p => {
    const addrClass = isReal(p.address) ? "addr-ok" : "addr-xxx";
    const feeClass = isReal(p.feeAddress) ? "addr-ok" : "addr-xxx";
    const stPorts = p.stratumPorts.join(", ") || "none";
    return `
    <div class="pool-card" id="pool-${esc(p.id)}">
      <div class="pool-head">
        <span class="pool-id">${esc(p.id)}</span>
        <span class="pool-coin">${esc(p.coin)}</span>
        <span class="badge ${p.enabled ? "badge-on" : "badge-off"}">${p.enabled ? "ENABLED" : "DISABLED"}</span>
      </div>
      <div class="pool-info">
        <span>Daemon: <b>${esc(p.daemonHost)}:${p.daemonPort}</b></span>
        <span>Stratum: <b>${stPorts}</b></span>
      </div>
      <div class="pool-fields">
        <label>Pool Address <span class="${addrClass}">${isReal(p.address) ? "REAL" : "xxx"}</span>
          <input id="addr-${esc(p.id)}" value="${esc(p.address)}"/>
        </label>
        <label>Fee Address <span class="${feeClass}">${isReal(p.feeAddress) ? "REAL" : "xxx"}</span>
          <input id="fee-${esc(p.id)}" value="${esc(p.feeAddress)}"/>
        </label>
        <label>Fee %
          <input id="pct-${esc(p.id)}" type="number" step="0.01" value="${p.feePercent}"/>
        </label>
      </div>
      <div class="pool-btns">
        <button class="btn btn-ok" onclick="savePool('${esc(p.id)}')">Save</button>
        <button class="btn btn-blue" onclick="createWallet('${esc(p.id)}')">Create Wallet</button>
        <button class="btn" onclick="togglePool('${esc(p.id)}')">${p.enabled ? "Disable" : "Enable"}</button>
        <button class="btn btn-warn" onclick="clearPool('${esc(p.id)}')">Clear Wallet</button>
        <button class="btn" onclick="restartNode('${esc(p.daemonHost)}')">Restart Node</button>
        <button class="btn btn-danger" onclick="removePool('${esc(p.id)}')">Remove</button>
      </div>
    </div>`;
  }).join("");
}

async function loadAvailable() {
  const d = await api("/api/coins/available");
  if (!d.ok) return;
  const el = document.getElementById("available");
  if (!d.coins.length) { el.innerHTML = '<p class="muted">All coins already in config.json</p>'; return; }
  el.innerHTML = d.coins.map(c => `
    <div class="avail-coin" onclick="fillAdd('${esc(c.key)}','${esc(c.symbol)}')">
      <b>${esc(c.symbol)}</b> <span class="muted">${esc(c.name)}</span>
      <span class="muted">${esc(c.key)}</span>
    </div>
  `).join("");
}

function fillAdd(key, symbol) {
  const id = symbol.toLowerCase();
  document.getElementById("addId").value = id;
  document.getElementById("addCoin").value = key;
  document.getElementById("addContainer").value = "Node-" + symbol.toUpperCase();
  log("Filled form for " + symbol);
}

async function savePool(id) {
  const addr = document.getElementById("addr-" + id).value.trim();
  const fee = document.getElementById("fee-" + id).value.trim();
  const pct = document.getElementById("pct-" + id).value;
  const r = await api("/api/pool/save", { poolId: id, address: addr, feeAddress: fee, feePercent: Number(pct) });
  log(r.ok ? `Saved ${id}` : `Save failed: ${r.error}`);
  loadPools();
}

async function createWallet(id) {
  log(`Creating wallet for ${id}...`);
  const r = await api("/api/wallet/create", { poolId: id });
  if (r.ok) log(`Wallet created for ${id}: ${r.address}`);
  else log(`Wallet failed for ${id}: ${r.err || r.error}`);
  loadPools();
}

async function togglePool(id) {
  const r = await api("/api/pool/toggle", { poolId: id });
  log(r.ok ? `${id} is now ${r.enabled ? "ENABLED" : "DISABLED"}` : `Toggle failed`);
  loadPools();
}

async function clearPool(id) {
  if (!confirm(`Clear wallet/fee for ${id}?`)) return;
  const r = await api("/api/pool/clear", { poolId: id });
  log(r.ok ? `Cleared ${id}` : `Clear failed`);
  loadPools();
}

async function restartNode(container) {
  log(`Restarting ${container}...`);
  const r = await api("/api/restart/node", { container });
  log(r.ok ? `${container} restarted` : `Restart failed: ${r.err}`);
}

async function restartMC() {
  log("Restarting Miningcore...");
  const r = await api("/api/restart/miningcore");
  log(r.ok ? "Miningcore restarted" : `Failed: ${r.err}`);
}

async function restartAll() {
  if (!confirm("Restart Miningcore + all nodes?")) return;
  log("Restarting all...");
  const r = await api("/api/restart/all");
  if (r.ok) r.results.forEach(x => log(`  ${x.name}: ${x.ok ? "OK" : x.err}`));
}

async function addPool() {
  const poolId = document.getElementById("addId").value.trim();
  const coinKey = document.getElementById("addCoin").value.trim();
  const container = document.getElementById("addContainer").value.trim();
  const rpc = document.getElementById("addRpc").value;
  const zmq = document.getElementById("addZmq").value;
  if (!poolId || !coinKey) { log("Fill pool id and coin key"); return; }
  const r = await api("/api/pool/add", { poolId, coinKey, containerName: container, rpcPort: Number(rpc), zmqPort: Number(zmq) });
  if (r.ok) {
    log(`Added pool ${poolId} (${coinKey}) ports: ${JSON.stringify(r.pool.ports)}`);
    document.getElementById("addId").value = "";
    document.getElementById("addCoin").value = "";
    document.getElementById("addContainer").value = "";
    document.getElementById("addRpc").value = "";
    document.getElementById("addZmq").value = "";
  } else {
    log(`Add failed: ${r.error}`);
  }
  loadPools();
  loadAvailable();
}

async function removePool(id) {
  if (!confirm(`Remove pool ${id} from config.json?`)) return;
  const r = await api("/api/pool/remove", { poolId: id });
  log(r.ok ? `Removed ${id}` : `Remove failed`);
  loadPools();
  loadAvailable();
}

loadPools();
loadAvailable();
