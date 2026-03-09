const $ = (id)=>document.getElementById(id);
const logEl = $("log");
function log(...a){ logEl.textContent += a.join(" ") + "\n"; logEl.scrollTop = logEl.scrollHeight; }

async function api(path, method="GET", body=null){
  const r = await fetch(path, {
    method,
    headers: body ? {"Content-Type":"application/json"} : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(()=>null);
  if(!r.ok) throw new Error((j && (j.error||j.message)) || ("HTTP "+r.status));
  return j;
}

let statusPools = {};

function coinCard(c){
  const el = document.createElement("div");
  el.className = "coin";
  el.dataset.coinId = c.id;
  const pool = statusPools[c.id];
  const isEnabled = pool && pool.enabled;
  const addr = (pool && pool.address) || "";
  const feeAddr = (pool && pool.feeAddress) || "";
  const feePct = (pool && pool.feePercent) != null ? pool.feePercent : 1.5;
  const ps = pool && pool.ports ? pool.ports : {};
  const stratumFromConfig = Object.keys(ps).map(Number).filter(Boolean)[0] || c.stratum || "";

  el.innerHTML = `
    <div class="meta">
      <b>${c.symbol || c.id}</b>
      <span>${c.coin} • stratum ${c.stratum || "—"} • rpc ${c.rpc || "—"}</span>
      <div class="row">
        <label>Порт Stratum <input type="number" class="stratPort" placeholder="${c.stratum||''}" value="${stratumFromConfig}" min="1" max="65535"/></label>
      </div>
      <div class="row">
        <label>Pool Wallet <input class="walletInp" placeholder="адрес пула" value="${addr}"/></label>
      </div>
      <div class="row">
        <label>Fee Wallet <input class="feeInp" placeholder="адрес комиссии" value="${feeAddr}"/></label>
      </div>
      <div class="row">
        <label>Fee % <input type="number" class="feePctInp" step="0.1" min="0" max="100" value="${feePct}" placeholder="1.5"/></label>
      </div>
      <div class="actions">
        <button class="btn-enable" data-action="enable">ВКЛ</button>
        <button class="btn-disable" data-action="disable">ВЫКЛ</button>
        <button class="btn-remove" data-action="remove" title="Удалить пул">Удалить</button>
        <button class="btn-save" data-action="save" title="Сохранить">Сохранить</button>
      </div>
      ${isEnabled ? '<span class="badge on">ВКЛ</span>' : '<span class="badge off">ВЫКЛ</span>'}
    </div>
  `;

  const stratPort = el.querySelector(".stratPort");
  const walletInp = el.querySelector(".walletInp");
  const feeInp = el.querySelector(".feeInp");
  const feePctInp = el.querySelector(".feePctInp");

  const doEnable = async ()=>{
    const wallet = walletInp.value.trim() || $("wallet").value.trim();
    const feeWallet = feeInp.value.trim() || $("feeWallet").value.trim();
    const minimumPayment = $("minimumPayment").value.trim() ? parseFloat($("minimumPayment").value) : undefined;
    const customStratumPort = stratPort.value.trim() ? parseInt(stratPort.value,10) : undefined;
    const restart = $("doRestart").checked;
    log("== enable", c.id, "==");
    try{
      const out = await api("/api/enable","POST",{ coinId:c.id, wallet, poolFeeWallet: feeWallet, minimumPayment, customStratumPort, restart });
      log(JSON.stringify(out,null,2));
      await refreshStatus();
      renderCoins();
    }catch(e){ log("ERROR:", e.message); }
  };

  const doDisable = async ()=>{
    const restart = $("doRestart").checked;
    log("== disable", c.id, "==");
    try{
      const out = await api("/api/disable","POST",{ coinId:c.id, restart });
      log(JSON.stringify(out,null,2));
      await refreshStatus();
      renderCoins();
    }catch(e){ log("ERROR:", e.message); }
  };

  const doRemove = async ()=>{
    if(!confirm("Удалить пул "+c.id+" из config?")) return;
    const restart = $("doRestart").checked;
    log("== remove", c.id, "==");
    try{
      const out = await api("/api/pools/"+c.id+"/remove","POST",{ restart });
      log(JSON.stringify(out,null,2));
      await refreshStatus();
      renderCoins();
    }catch(e){ log("ERROR:", e.message); }
  };

  const doSave = async ()=>{
    const newAddr = walletInp.value.trim();
    const newFeeAddr = feeInp.value.trim();
    const newFeePct = parseFloat(feePctInp.value) || 1.5;
    const pool = statusPools[c.id];
    if(!pool) return log("Пул не найден. Сначала включите монету.");
    log("== save", c.id, "==");
    try{
      await api("/api/pools/"+c.id,"PUT",{ address: newAddr, feeAddress: newFeeAddr, feePercent: newFeePct, restart: $("doRestart").checked });
      log("OK");
      await refreshStatus();
      renderCoins();
    }catch(e){ log("ERROR:", e.message); }
  };

  el.querySelector(".btn-enable").onclick = doEnable;
  el.querySelector(".btn-disable").onclick = doDisable;
  el.querySelector(".btn-remove").onclick = doRemove;
  el.querySelector(".btn-save").onclick = doSave;

  return el;
}

async function refreshStatus(){
  try {
    const st = await api("/api/status");
    statusPools = {};
    (st.pools||[]).forEach(p=>{ statusPools[p.id]=p; });
  }catch(e){ statusPools = {}; }
}

async function renderCoins(){
  const data = await api("/api/coins");
  const box = $("coins");
  box.innerHTML = "";
  (data.coins||[]).forEach(c=>box.appendChild(coinCard(c)));
}

(async ()=>{
  log("loading settings...");
  try{
    const st = await api("/api/settings");
    if(st && st.settings){
      if(st.settings.poolFeeWallet) $("feeWallet").value = st.settings.poolFeeWallet;
      if(st.settings.defaultWallet) $("wallet").value = st.settings.defaultWallet;
    }
    $("feeWallet").addEventListener("change", async ()=>{
      try{ await api("/api/settings","POST",{ poolFeeWallet: $("feeWallet").value.trim() }); }catch(e){}
    });
    $("wallet").addEventListener("change", async ()=>{
      try{ await api("/api/settings","POST",{ defaultWallet: $("wallet").value.trim() }); }catch(e){}
    });
  }catch(e){}

  await refreshStatus();
  log("loading coins...");
  await renderCoins();
  log("ready");
})();
