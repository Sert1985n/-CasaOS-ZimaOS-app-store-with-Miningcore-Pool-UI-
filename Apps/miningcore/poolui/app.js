const API="/api";

/* ---- polling ---- */
const POLL_POOLS_MS  = 10000;
const POLL_MINERS_MS = 10000;
const POLL_PRICE_MS  = 60000;
const PUSH_MS        = 10000;

/* ---------- helpers ---------- */
function $(q,root=document){return root.querySelector(q)}
function $$(q,root=document){return Array.from(root.querySelectorAll(q))}
function closeAllDD(){ $$('.dd').forEach(d=>d.classList.remove('is-open')) }
document.addEventListener('click',e=>{ if(!e.target.closest('.dd')) closeAllDD() })

function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem('theme',theme);
  const cD=$('#themeCheckDark'), cL=$('#themeCheckLight');
  if(cD) cD.textContent=theme==='dark'?'?':'';
  if(cL) cL.textContent=theme==='light'?'?':'';
  const svg=$('#themeIconSvg');
  if(svg){
    svg.innerHTML=(theme==='light')
      ? '<path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"></path><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93 6.34 6.34"></path><path d="M17.66 17.66 19.07 19.07"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M4.93 19.07 6.34 17.66"></path><path d="M17.66 6.34 19.07 4.93"></path>'
      : '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path>';
  }
  closeAllDD();
}
function setLang(l){
  document.documentElement.dataset.lang=l;
  localStorage.setItem('lang',l);
  const lbl=$('#langLabel'), cE=$('#langCheckEn'), cR=$('#langCheckRu');
  if(lbl) lbl.textContent=l.toUpperCase();
  if(cE) cE.textContent=l==='en'?'?':'';
  if(cR) cR.textContent=l==='ru'?'?':'';
  closeAllDD();
}

/* ---------- format ---------- */
function isPlainNumberString(s){ return typeof s==='string' && /^[+-]?\d+(\.\d+)?$/.test(s.trim()) }
function asNumberOrNull(v){
  if(typeof v==='number' && isFinite(v)) return v;
  if(isPlainNumberString(v)) { const n=Number(v); return isFinite(n)?n:null; }
  return null;
}
function fmtNumber(n){ const x=asNumberOrNull(n); if(x==null) return (n??'—'); return x.toLocaleString('en-US') }
function pickUnitHps(hps){
  const x=asNumberOrNull(hps); if(x==null) return {u:'H/s',v:1};
  const abs=Math.abs(x);
  const u=[{u:'H/s',v:1},{u:'kH/s',v:1e3},{u:'MH/s',v:1e6},{u:'GH/s',v:1e9},{u:'TH/s',v:1e12},{u:'PH/s',v:1e15},{u:'EH/s',v:1e18}];
  let c=u[0]; for(const it of u){ if(abs>=it.v) c=it; } return c;
}
function fmtHashrate(hps){
  if(typeof hps==='string' && !isPlainNumberString(hps)) return hps;
  const x=asNumberOrNull(hps); if(x==null) return '—';
  if(x===0) return '0 H/s';
  const {u,v}=pickUnitHps(x);
  return (x/v).toFixed(2)+' '+u;
}
function pickUnitCompact(n){
  const x=asNumberOrNull(n); if(x==null) return {u:'',v:1};
  const abs=Math.abs(x);
  const u=[{u:'',v:1},{u:'K',v:1e3},{u:'M',v:1e6},{u:'G',v:1e9},{u:'T',v:1e12},{u:'P',v:1e15},{u:'E',v:1e18}];
  let c=u[0]; for(const it of u){ if(abs>=it.v) c=it; } return c;
}
function fmtCompact(n){
  if(typeof n==='string' && !isPlainNumberString(n)) return n;
  const x=asNumberOrNull(n); if(x==null) return '—';
  const {u,v}=pickUnitCompact(x);
  if(u==='') return fmtNumber(x);
  return (x/v).toFixed(3)+u;
}
function fmtMoneyUsd(n){
  const x=asNumberOrNull(n); if(x==null) return '—';
  if(x===0) return '$0.000';
  if(x<0.01) return '$'+x.toFixed(6);
  if(x<1) return '$'+x.toFixed(4);
  if(x<1000) return '$'+x.toFixed(3);
  return '$'+x.toLocaleString('en-US',{maximumFractionDigits:2});
}
function fmtPct(p){
  const x=asNumberOrNull(p); if(x==null) return '';
  const s=x>0?'+':'';
  return `${s}${x.toFixed(2)}%`;
}
function fmtCoinAmt(v){
  const x=asNumberOrNull(v); if(x==null) return '—';
  if(Math.abs(x) >= 1000) return fmtNumber(Math.round(x));
  if(Math.abs(x) >= 1) return x.toFixed(3).replace(/\.?0+$/,'');
  return x.toFixed(6).replace(/0+$/,'').replace(/\.$/,'');
}

/* ---------- API helpers ---------- */
async function fetchJson(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}
async function tryJson(urls){
  for(const u of urls){
    try{ return await fetchJson(u); }catch(e){}
  }
  return null;
}

/* ---------- state ---------- */
const KEY_ACTIVE_POOL="pp_active_pool";
const KEY_WALLET_PREFIX="pp_wallet_";
function setActivePool(id){ if(id) localStorage.setItem(KEY_ACTIVE_POOL, id); }
function getActivePool(){ return localStorage.getItem(KEY_ACTIVE_POOL) || ''; }
function walletKey(poolId){ return KEY_WALLET_PREFIX + String(poolId||'').toLowerCase(); }
function getSavedWallet(poolId){ return (localStorage.getItem(walletKey(poolId))||'').trim(); }
function saveWallet(poolId, addr){ const a=(addr||'').trim(); if(a) localStorage.setItem(walletKey(poolId), a); }

let POOLS=[];
let POOL_BY_ID=new Map();
let PRICE_CACHE={};
let CURRENT={page:'pools', poolId:null, addr:null, tab:null};

async function loadPools(){
  const main = await fetchJson(`${API}/pools`);
  let pools = Array.isArray(main?.pools) ? main.pools : [];
  try {
    const sec = await fetchJson(`${API.replace('/api','')}/api-secondary/pools`);
    if(Array.isArray(sec?.pools)&&sec.pools.length>0){
      pools = pools.concat(sec.pools.filter(p=>!pools.some(m=>String(m.id||'').toLowerCase()===String(p.id||'').toLowerCase())));
    }
  }catch(e){}
  POOLS = pools;
  POOL_BY_ID = new Map(POOLS.map(p=>[p.id, p]));
}
function ensureActivePool(){
  const cur=getActivePool();
  if(cur && POOL_BY_ID.has(cur)) return cur;
  const first=POOLS[0]?.id || '';
  if(first) setActivePool(first);
  return first;
}

/* ---------- icons ---------- */
function iconImg(pool){
  const id=(pool?.id||'').toLowerCase();
  const sym=(pool?.coin?.symbol||pool?.coin?.type||pool?.id||'').toLowerCase();
  const symChar=(pool?.coin?.symbol||pool?.coin?.type||pool?.id||'?').slice(0,1);
  return `<img class="coin-icon-img" src="/assets/icons/${sym}.png"
    onerror="if(!this.dataset.f){this.dataset.f=1;this.src='/assets/icons/${id}.png';}else{this.outerHTML='<span class=\\'coin-icon-fallback\\'>${symChar}</span>';}"
    alt="${id}">`;
}
function svgIcon(name){
  if(name==='home') return `<svg viewBox="0 0 24 24" class="ico"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5 10.5V20h14v-9.5"></path></svg>`;
  if(name==='blocks') return `<svg viewBox="0 0 24 24" class="ico"><path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3Z"></path><path d="M3.5 7.5V16.5L12 21l8.5-4.5V7.5"></path><path d="M12 12v9"></path></svg>`;
  if(name==='miners') return `<svg viewBox="0 0 24 24" class="ico"><path d="M16 11a4 4 0 1 0-8 0"></path><path d="M5 20a7 7 0 0 1 14 0"></path></svg>`;
  if(name==='help') return `<svg viewBox="0 0 24 24" class="ico"><path d="M12 18h.01"></path><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4"></path><path d="M12 22A10 10 0 1 0 12 2a10 10 0 0 0 0 20Z"></path></svg>`;
  if(name==='pools') return `<svg viewBox="0 0 24 24" class="ico"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path></svg>`;
  if(name==='ext') return `<svg viewBox="0 0 24 24" class="ico"><path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v7H3V3h7"></path></svg>`;
  if(name==='copy') return `<svg viewBox="0 0 24 24" class="ico"><rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect></svg>`;
  return '';
}

/* ---------- header badges ---------- */
function setHeaderBadges(blocks, miners){
  const bB=$('#badgeBlocks');
  const bM=$('#badgeMiners');
  if(bB) bB.textContent=String(blocks||0);
  if(bM) bM.textContent=String(miners||0);
}

/* ---------- prices + rewards ---------- */
function poolSymbol(pool){ return (pool?.coin?.symbol||pool?.coin?.type||pool?.id||'').toLowerCase(); }

// Только BC2/XEC/BCH/FB — reward/price маппинг подстраивается под этот список
const META = {
  bc2: { gecko: "bitcoinii" },
  bch: { gecko: "bitcoin-cash" },
  xec: { gecko: "ecash" },
  fb:  { gecko: "french-connection-finance" },
};

const BLOCK_REWARD_FALLBACK = {
  bc2: 50,
  bch: 3.125,
  xec: 1812500,
  fb:  6.25,
};

async function refreshPrices(){
  const ids = POOLS.map(p=>META[poolSymbol(p)]?.gecko || null).filter(Boolean);
  const uniq=[...new Set(ids)];
  if(!uniq.length){ PRICE_CACHE={}; return; }
  const url=`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,${encodeURIComponent(uniq.join(','))}&vs_currencies=usd&include_24hr_change=true`;
  try{
    const data = await fetchJson(url);
    PRICE_CACHE = data || {};
  }catch(e){ PRICE_CACHE={}; }
}
function priceForPool(pool){
  const gid=META[poolSymbol(pool)]?.gecko || null;
  const g=gid?PRICE_CACHE[gid]:null;
  const btcUsd = PRICE_CACHE?.bitcoin?.usd;
  const usd = g?.usd ?? null;
  const btc = (usd != null && btcUsd != null && btcUsd > 0) ? (usd / btcUsd) : null;
  return { usd, chg: g?.usd_24h_change ?? null, btc };
}
function getBlockReward(pool){
  const sym=poolSymbol(pool);
  const ns=pool?.networkStats||{};
  const ps=pool?.poolStats||{};
  const v = asNumberOrNull(pool?.coin?.blockReward ?? ns.blockReward ?? ps.blockReward ?? null);
  if(v!=null) return v;
  return BLOCK_REWARD_FALLBACK[sym] ?? null;
}
function fmtReward(pool){
  const symU = (pool?.coin?.symbol||pool?.coin?.type||pool?.id||'').toUpperCase();
  const r = getBlockReward(pool);
  if(r==null) return '—';
  const pr = priceForPool(pool);
  const usd = (asNumberOrNull(pr.usd)!=null) ? (pr.usd * r) : null;
  const coinText = `${fmtCoinAmt(r)} ${symU}`;
  return (usd!=null) ? `${coinText} (${fmtMoneyUsd(usd)})` : coinText;
}

/* ---------- miningcore endpoints ---------- */
function pickMinersArray(data){
  if(!data) return [];
  if(Array.isArray(data.miners)) return data.miners;
  if(Array.isArray(data.results)) return data.results;
  if(Array.isArray(data.items)) return data.items;
  if(Array.isArray(data)) return data;
  return [];
}
function workerDisplayName(m){
  const name = m.workerName ?? m.worker ?? m.name;
  if(name) return name;
  const addr = m.miner ?? m.address ?? m.login ?? '';
  if(typeof addr==='string' && addr.includes('.')) return addr.split('.').slice(1).join('.') || addr;
  return addr || 'Default';
}
function minerAddress(m){
  return m.miner ?? m.address ?? m.login ?? '—';
}
async function fetchMiners(poolId){
  const p=encodeURIComponent(poolId);
  return await tryJson([
    `${API}/pools/${p}/miners?page=0&pageSize=500`,
    `${API}/pools/${p}/miners`,
    `${API}/pool/${p}/miners?page=0&pageSize=500`,
    `${API}/pool/${p}/miners`,
  ]);
}
async function fetchMinerStats(poolId, addr){
  const p=encodeURIComponent(poolId), a=encodeURIComponent(addr);
  return await tryJson([
    `${API}/pools/${p}/miners/${a}`,
    `${API}/pool/${p}/miners/${a}`,
  ]) || {};
}
async function fetchMinerPayments(poolId, addr){
  const p=encodeURIComponent(poolId), a=encodeURIComponent(addr);
  return await tryJson([
    `${API}/pools/${p}/miners/${a}/payments?page=0&pageSize=50`,
    `${API}/pools/${p}/miners/${a}/payments`,
    `${API}/pool/${p}/miners/${a}/payments?page=0&pageSize=50`,
    `${API}/pool/${p}/miners/${a}/payments`,
  ]);
}
function pickPaymentsArray(data){
  if(!data) return [];
  if(Array.isArray(data.payments)) return data.payments;
  if(Array.isArray(data.results)) return data.results;
  if(Array.isArray(data.items)) return data.items;
  if(Array.isArray(data)) return data;
  return [];
}

/* ---------- pool history (for coin chart) ---------- */
function pickHistoryArray(data){
  if(!data) return [];
  if(Array.isArray(data)) return data;
  if(Array.isArray(data.stats)) return data.stats;
  if(Array.isArray(data.results)) return data.results;
  if(Array.isArray(data.performance)) return data.performance;
  return [];
}
async function fetchPoolHourly(poolId){
  const p=encodeURIComponent(poolId);
  return await tryJson([
    `${API}/pools/${p}/stats/hourly`,
    `${API}/pool/${p}/stats/hourly`,
    `${API}/pools/${p}/performance?r=Day&i=Hour`,
    `${API}/pool/${p}/performance?r=Day&i=Hour`,
  ]);
}

/* ---------- chart series ---------- */
const MAX_POINTS = 720;
const SERIES = {
  coin: new Map(),   // poolId -> { t:[], a:[] (pool hashrate), bRaw:[] (network difficulty) }
  miner: new Map(),  // key -> {t:[], raw:[], a:[], b:[]}
};

function seedCoinHistory(poolId, arr){
  if(!arr || !arr.length) return;
  let s = SERIES.coin.get(poolId);
  if(!s){ s={t:[], a:[], bRaw:[]}; SERIES.coin.set(poolId,s); }

  for(const it of arr){
    const ts = Date.parse(it.created ?? it.createdAt ?? it.time ?? it.timestamp ?? it.date ?? '');
    const ph = asNumberOrNull(it.poolHashrate ?? it.poolHashRate ?? it.hashrate ?? it.hashRate ?? it.poolHash ?? null);
    const nd = asNumberOrNull(it.networkDifficulty ?? it.difficulty ?? it.networkDiff ?? it.netDiff ?? null);
    if(!isFinite(ts) || ph==null) continue;
    s.t.push(ts);
    s.a.push(ph);
    s.bRaw.push(nd != null ? nd : null);
  }

  while(s.t.length>MAX_POINTS){
    s.t.shift(); s.a.shift(); s.bRaw.shift();
  }
}

function pushCoinPoint(poolId, poolHash, netDiff){
  const ph=asNumberOrNull(poolHash);
  const nd=asNumberOrNull(netDiff);
  if(ph==null) return;

  let s = SERIES.coin.get(poolId);
  if(!s){ s={t:[], a:[], bRaw:[]}; SERIES.coin.set(poolId,s); }

  s.t.push(Date.now());
  s.a.push(ph);
  s.bRaw.push(nd);

  while(s.t.length>MAX_POINTS){
    s.t.shift(); s.a.shift(); s.bRaw.shift();
  }
}

function pushMinerPoint(key, inst){
  const x=asNumberOrNull(inst);
  if(x==null) return null;

  let s = SERIES.miner.get(key);
  if(!s){ s={t:[], raw:[], a:[], b:[]}; SERIES.miner.set(key, s); }

  const ts=Date.now();
  s.t.push(ts); s.raw.push(x);

  const avg=(winMs)=>{
    let sum=0, n=0;
    for(let i=s.t.length-1;i>=0;i--){
      if(ts - s.t[i] > winMs) break;
      sum += s.raw[i]; n++;
    }
    return n ? (sum/n) : x;
  };
  s.a.push(avg(30*60*1000)); // 30m
  s.b.push(avg(60*60*1000)); // 1h

  while(s.t.length>MAX_POINTS){
    s.t.shift(); s.raw.shift(); s.a.shift(); s.b.shift();
  }
  return s;
}

/* ---------- chart render (dual y for coin) ---------- */
function catmullRomToBezier(ctx, pts){
  if(pts.length<2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
    const cp1x=p1.x+(p2.x-p0.x)/6, cp1y=p1.y+(p2.y-p0.y)/6;
    const cp2x=p2.x-(p3.x-p1.x)/6, cp2y=p2.y-(p3.y-p1.y)/6;
    ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,p2.x,p2.y);
  }
}

function renderChartDual({aArr,bArr,tArr,labels,fmtA,fmtB,axisBRight=true,fillB=true,showA=true,showB=true}){
  const canvas=$('#chartCanvas'), box=$('#chartBox'), tip=$('#chartTip'), xlbl=$('#chartXLabel');
  if(!canvas||!box||!tip||!xlbl) return;
  if(aArr.length<2){ tip.style.display='none'; xlbl.style.display='none'; return; }
  if(!showA && !showB){ tip.style.display='none'; xlbl.style.display='none'; return; }

  const dpr=Math.max(1, window.devicePixelRatio||1);
  const rect=box.getBoundingClientRect();
  const w=Math.floor(rect.width), h=Math.floor(rect.height);
  canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
  canvas.style.width=w+'px'; canvas.style.height=h+'px';

  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const padL=58,padR=58,padT=12,padB=28;
  const plotW=w-padL-padR, plotH=h-padT-padB;

  const n=aArr.length;

  const useT = Array.isArray(tArr) && tArr.length===n && tArr.every(x=>isFinite(x));
  const t0 = useT ? tArr[0] : 0;
  const tN = useT ? tArr[n-1] : (n-1);
  const xAt = (i)=>{
    const k = useT ? ((tArr[i]-t0)/((tN-t0)||1)) : (i/(n-1));
    return padL + k*plotW;
  };

  const maxA=showA ? Math.max(...aArr) : 0, minA=showA ? Math.min(...aArr) : 0;
  const maxB=showB ? Math.max(...bArr) : 0, minB=showB ? Math.min(...bArr) : 0;
  if (maxA === minA && maxA === 0 && (maxB === minB && maxB === 0)) { tip.style.display='none'; xlbl.style.display='none'; return; }

  const unitA=pickUnitHps(Math.max(maxA, 1));
  const unitB=axisBRight ? pickUnitCompact(Math.max(maxB, 1)) : pickUnitHps(Math.max(maxB, 1));

  const maxAU=(maxA/unitA.v)*1.10, minAU=Math.max(0,(minA/unitA.v)*0.90);
  const maxBU=(maxB/unitB.v)*1.10, minBU=Math.max(0,(minB/unitB.v)*0.90);

  function yA(v){
    const vu=(v/unitA.v);
    const k=(vu-minAU)/((maxAU-minAU)||1);
    return padT+(1-k)*plotH;
  }
  function yB(v){
    const vu=(v/unitB.v);
    const k=(vu-minBU)/((maxBU-minBU)||1);
    return padT+(1-k)*plotH;
  }

  const st = getComputedStyle(document.documentElement);
  const grid=(st.getPropertyValue('--border-soft')||'rgba(255,255,255,.08)').trim();
  const txt =(st.getPropertyValue('--muted')||'rgba(255,255,255,.7)').trim();
  const band=(st.getPropertyValue('--crossBand')||'rgba(255,255,255,.08)').trim();

  const cA='#1f7aff';
  const cB='#f0a61a';

  const times = new Array(n);
  for(let i=0;i<n;i++){
    const d = useT ? new Date(tArr[i]) : new Date(Date.now()-(n-1-i)*PUSH_MS);
    times[i]=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  function smooth(arr, yFn, color, shadow=true){
    const pts=arr.map((v,i)=>({x:xAt(i), y:yFn(v)}));
    ctx.save();
    ctx.strokeStyle=color;
    ctx.lineWidth=2;
    ctx.lineJoin='round';
    ctx.lineCap='round';
    if(shadow){ ctx.shadowColor=color; ctx.shadowBlur=7; }
    ctx.beginPath();
    catmullRomToBezier(ctx, pts);
    ctx.stroke();
    ctx.restore();
    return pts;
  }
  function fill(pts,color){
    ctx.save();
    ctx.fillStyle=color;
    ctx.globalAlpha=0.22;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, h-padB);
    catmullRomToBezier(ctx, pts);
    ctx.lineTo(pts[pts.length-1].x, h-padB);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBase(){
    ctx.clearRect(0,0,w,h);

    ctx.strokeStyle=grid;
    ctx.fillStyle=txt;
    ctx.font='12px Nunito, sans-serif';

    // grid lines
    for(let i=0;i<=4;i++){
      const y = padT + (i/4)*plotH;
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(w-padR,y); ctx.stroke();
    }

    ctx.textAlign='left';
    if(showA){
      for(let i=0;i<=4;i++){
        const val = maxAU - (i/4)*(maxAU-minAU);
        const y = padT + (i/4)*plotH;
        ctx.fillText(`${val.toFixed(val<10?1:0)} ${unitA.u}`, 8, y+4);
      }
    }
    if(showB && axisBRight){
      ctx.textAlign='right';
      for(let i=0;i<=4;i++){
        const val = maxBU - (i/4)*(maxBU-minBU);
        const y = padT + (i/4)*plotH;
        const txtv = `${val.toFixed(val<10?1:0)} ${unitB.u}`;
        ctx.fillText(txtv, w-8, y+4);
      }
    }
    if(showB && !showA){
      ctx.textAlign='left';
      for(let i=0;i<=4;i++){
        const val = maxBU - (i/4)*(maxBU-minBU);
        const y = padT + (i/4)*plotH;
        ctx.fillText(`${val.toFixed(val<10?1:0)} ${unitB.u}`, 8, y+4);
      }
    }

    // x labels
    ctx.textAlign='left';
    ctx.font='11px Nunito, sans-serif';
    const every=Math.max(1, Math.round(n/8));
    for(let i=0;i<n;i+=every){
      ctx.fillText(times[i], xAt(i)-14, h-10);
    }

    if(showB){ const ptsB = smooth(bArr, yB, cB, true); if(fillB) fill(ptsB, cB); }
    if(showA) smooth(aArr, yA, cA, true);
  }

  const BAND_W = 2;
  function drawOverlay(idx,mx,my){
    drawBase();
    ctx.save();
    ctx.fillStyle=band;
    ctx.fillRect(mx - (BAND_W>>1), padT, BAND_W, h-padT-padB);
    ctx.restore();

    xlbl.style.display='block';
    xlbl.style.left=mx+'px';
    xlbl.textContent=times[idx];

    tip.style.display='block';
    const rowsTip = [];
    if(showA) rowsTip.push(`<div class="row"><span>${labels[0]}</span><b>${fmtA(aArr[idx])}</b></div>`);
    if(showB) rowsTip.push(`<div class="row"><span>${labels[1]}</span><b>${fmtB(bArr[idx], idx)}</b></div>`);
    tip.innerHTML=`<div class="t">${times[idx]}</div>${rowsTip.join('')}`;

    const tw=tip.offsetWidth, th=tip.offsetHeight;
    const pad=10;
    let left=mx+14, top=my-14-th;
    if(left+tw+pad>w) left=mx-tw-pad-4;
    if(left<pad) left=pad;
    if(top<pad) top=my+16;
    if(top+th+pad>h) top=h-th-pad;
    tip.style.left=left+'px';
    tip.style.top=top+'px';
  }

  drawBase();
  let raf=null;
  canvas.onmousemove=(ev)=>{
    const r=canvas.getBoundingClientRect();
    const mx=ev.clientX-r.left, my=ev.clientY-r.top;
    if(mx<padL||mx>w-padR||my<padT||my>h-padB){
      tip.style.display='none'; xlbl.style.display='none'; drawBase(); return;
    }
    const idx = Math.max(0, Math.min(n-1, Math.round(((mx-padL)/plotW)*(n-1))));
    if(raf) cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>drawOverlay(idx,mx,my));
  };
  canvas.onmouseleave=()=>{tip.style.display='none'; xlbl.style.display='none'; drawBase();};
}

/* ---------- explorer ---------- */
function explorerAddr(poolId, addr){
  const id=(poolId||'').toLowerCase();
  if(id==='bch') return `https://blockchair.com/bitcoin-cash/address/${encodeURIComponent(addr)}`;
  if(id==='xec') return `https://explorer.e.cash/address/${encodeURIComponent(addr)}`;
  if(id==='bc2') return `https://explorer.bitcoinii.org/address/${encodeURIComponent(addr)}`;
  if(id==='fb') return `https://explorer.frenchconnection.finance/address/${encodeURIComponent(addr)}`;
  return `https://www.blockchain.com/explorer/addresses/btc/${encodeURIComponent(addr)}`;
}
function explorerTx(poolId, tx){
  const id=(poolId||'').toLowerCase();
  if(id==='bch') return `https://blockchair.com/bitcoin-cash/transaction/${encodeURIComponent(tx)}`;
  if(id==='xec') return `https://explorer.e.cash/tx/${encodeURIComponent(tx)}`;
  if(id==='bc2') return `https://explorer.bitcoinii.org/tx/${encodeURIComponent(tx)}`;
  if(id==='fb') return `https://explorer.frenchconnection.finance/tx/${encodeURIComponent(tx)}`;
  return `https://www.blockchain.com/explorer/transactions/btc/${encodeURIComponent(tx)}`;
}

/* ---------- UI skeleton ---------- */
function renderLoading(title){
  $('#app').innerHTML=`
    <section class="surface">
      <div class="surface__head"><h1>${title}</h1><div class="hint">Loading…</div></div>
      <div style="padding:14px;color:var(--muted)">Please wait…</div>
    </section>`;
}
function toggleExpander(el){
  const open = el.getAttribute('aria-expanded') !== 'false';
  el.setAttribute('aria-expanded', open ? 'false' : 'true');
}

/* ---------- menu ---------- */
function coinMenu(poolId, active){
  const p=POOL_BY_ID.get(poolId);
  const blocks = p?.poolStats?.totalBlocksFound ?? p?.poolStats?.totalBlocks ?? 0;
  const miners = p?.poolStats?.connectedMiners ?? p?.poolStats?.miners ?? 0;
  return `
  <div class="coin-menu">
    <a class="pill ${active==='home'?'pill--active':''}" href="#/coin/${encodeURIComponent(poolId)}"><span class="pill__icon">${svgIcon('home')}</span><span>Home</span></a>
    <a class="pill ${active==='blocks'?'pill--active':''}" href="#/blocks/${encodeURIComponent(poolId)}"><span class="pill__icon">${svgIcon('blocks')}</span><span>Blocks</span><span class="badge-count">${fmtNumber(blocks)}</span></a>
    <a class="pill ${active==='miners'?'pill--active':''}" href="#/miners/${encodeURIComponent(poolId)}"><span class="pill__icon">${svgIcon('miners')}</span><span>Miners</span><span class="badge-count">${fmtNumber(miners)}</span></a>
    <a class="pill ${active==='help'?'pill--active':''}" href="#/help/${encodeURIComponent(poolId)}"><span class="pill__icon">${svgIcon('help')}</span><span>Help</span></a>
    <a class="pill" href="#/"><span class="pill__icon">${svgIcon('pools')}</span><span>Pools</span></a>
  </div>`;
}

/* ---------- pool numbers ---------- */
function poolNumbers(pool){
  const ps=pool?.poolStats||{};
  const ns=pool?.networkStats||{};
  const effort = asNumberOrNull(ps.blockEffort ?? ps.effort ?? ps.currentEffort ?? null);
  return {
    miners: ps.connectedMiners ?? ps.miners ?? 0,
    poolHash: ps.poolHashrate ?? ps.poolHashRate ?? ps.hashrate ?? ps.hashRate ?? 0,
    netHash: ns.networkHashrate ?? ns.networkHashRate ?? ns.hashrate ?? ns.hashRate ?? 0,
    netDiff: ns.networkDifficulty ?? ns.difficulty ?? ns.networkDiff ?? 0,
    height: ns.blockHeight ?? ns.height ?? 0,
    blocks: ps.totalBlocksFound ?? ps.totalBlocks ?? ps.blocksFound ?? 0,
    effort: effort != null ? effort : null,
    lastBlock: ps.lastBlockTime ?? ps.lastBlock ?? null
  };
}

/* ---------- pages ---------- */
async function renderPools(){
  renderLoading("Mining Pools");
  await loadPools();
  await refreshPrices();

  const totalBlocks = POOLS.reduce((a,p)=>a+(Number(p.poolStats?.totalBlocksFound ?? p.poolStats?.totalBlocks ?? 0)||0),0);
  const totalMiners = POOLS.reduce((a,p)=>a+(Number(p.poolStats?.connectedMiners ?? p.poolStats?.miners ?? 0)||0),0);
  setHeaderBadges(totalBlocks, totalMiners);

  const rows=POOLS.map(p=>{
    const n=poolNumbers(p);
    const totalPaid = p?.poolStats?.totalPaid ?? p?.poolStats?.totalPayments ?? p?.poolStats?.totalPaidOut ?? null;
    const poolFee = p?.poolFeePercent != null ? (p.poolFeePercent+'%') : (p?.paymentProcessing?.poolFeePercent != null ? (p.paymentProcessing.poolFeePercent+'%') : '1.5%');
    const minPay = p?.paymentProcessing?.minimumPayment != null ? fmtCoinAmt(p.paymentProcessing.minimumPayment) + ' ' + (p.coin?.symbol || p.id) : '—';

    return `
    <tr class="row-link" data-pool="${p.id}" onclick="localStorage.setItem('${KEY_ACTIVE_POOL}','${p.id}'); location.hash='#/coin/${encodeURIComponent(p.id)}'">
      <td><div class="coin-cell">${iconImg(p)}<span>${p.coin?.name || p.coin?.type || p.id} (${p.coin?.symbol || p.coin?.type || p.id})</span></div></td>
      <td>${p.coin?.algorithm || '—'}</td>
      <td>${fmtNumber(n.miners)}</td>
      <td>${fmtHashrate(n.poolHash)}</td>
      <td>${fmtNumber(n.blocks)}</td>
      <td>${totalPaid!=null ? fmtCoinAmt(totalPaid) : '—'}</td>
      <td>${poolFee}</td>
      <td>${minPay}</td>
      <td>${fmtHashrate(n.netHash)}</td>
      <td>${fmtCompact(n.netDiff)}</td>
    </tr>`;
  }).join('');

  $('#app').innerHTML=`
    <section class="surface surface--pools">
      <div class="table-wrap">
        <table class="table table--pools">
          <thead><tr>
            <th class="th-sort" data-sort="name">Coin Name <span class="sort-arrow">▲</span></th>
            <th>Algorithm</th>
            <th>Miner Count</th>
            <th>Pool Hashrate</th>
            <th>Blocks</th>
            <th>Total Paid</th>
            <th>Pool Fee</th>
            <th>Min Payout</th>
            <th>Network Hashrate</th>
            <th>Network Difficulty</th>
          </tr></thead>
          <tbody id="poolsTbody">${rows || '<tr><td colspan="10">No pools — start Miningcore and add pools in Pool Configuration</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  `;
}

async function renderCoin(poolId){
  renderLoading("Coin");
  await loadPools();
  await refreshPrices();
  if(!POOL_BY_ID.has(poolId)){ await renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  const n=poolNumbers(pool);
  const pr=priceForPool(pool);

  const priceUsd = pr.usd==null?'—':fmtMoneyUsd(pr.usd);
  const chg = pr.chg==null?'':` <span class="chg ${(Number(pr.chg)||0)>=0?'up':'down'}">${fmtPct(Number(pr.chg)||0)} ${(Number(pr.chg)||0)>=0?'↑':'↓'}</span>`;
  const priceBtc = pr.btc != null ? (pr.btc.toFixed(8) + ' BTC') : '—';
  const chgBtc = pr.chg==null?'':` <span class="chg ${(Number(pr.chg)||0)>=0?'up':'down'}">${fmtPct(Number(pr.chg)||0)}</span>`;
  const lastBlockStr = n.lastBlock != null ? String(n.lastBlock) : '—';
  const effortStr = n.effort != null ? (n.effort.toFixed(0) + '%') : '—';

  $('#app').innerHTML=`
    <section class="surface">
      ${coinMenu(poolId,'home')}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||pool.coin?.type||poolId} (${pool.coin?.symbol||pool.coin?.type||poolId})</h1>
        <div class="hint"></div>
      </div>

      <div class="coin-page-layout">
        <div class="coin-page-left">
          <div class="card"><div class="card__title">POOL STATISTICS</div>
            <div class="card__body"><div class="kv">
              <div class="k">Miners</div><div class="v" id="cMiners">${fmtNumber(n.miners)}</div>
              <div class="k">Hashrate</div><div class="v" id="cPoolHash">${fmtHashrate(n.poolHash)}</div>
            </div></div>
          </div>
          <div class="card"><div class="card__title">BLOCK STATISTICS</div>
            <div class="card__body"><div class="kv">
              <div class="k">Current Effort</div><div class="v" id="cEffort">${effortStr}</div>
              <div class="k">Last Block</div><div class="v" id="cLastBlock">${lastBlockStr}</div>
              <div class="k">Blocks found</div><div class="v" id="cBlocks">${fmtNumber(n.blocks)}</div>
            </div></div>
          </div>
          <div class="card"><div class="card__title">NETWORK STATISTICS</div>
            <div class="card__body"><div class="kv">
              <div class="k">Network Difficulty</div><div class="v mono" id="cNetDiff">${fmtCompact(n.netDiff)}</div>
              <div class="k">Network Hashrate</div><div class="v" id="cNetHash">${fmtHashrate(n.netHash)}</div>
              <div class="k">Current Height</div><div class="v" id="cHeight">${fmtNumber(n.height)}</div>
            </div></div>
          </div>
        </div>
        <div class="coin-page-right">
          <div class="card"><div class="card__title">CURRENT PRICE</div>
            <div class="card__body"><div class="kv">
              <div class="k">Current Price</div><div class="v" id="cPrice">${priceUsd}${chg}</div>
              <div class="k">Price BTC</div><div class="v mono" id="cPriceBtc">${priceBtc}${chgBtc}</div>
            </div></div>
          </div>
        </div>
      </div>

      <div class="expander coin-chart-expander" aria-expanded="true" data-pool-id="${poolId}">
        <div class="expander__head" onclick="toggleExpander(this.parentElement)">
          <div class="title">Hashrate Chart</div>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="expander__body">
          <div class="legend legend--toggles">
            <label class="legend-item"><input type="checkbox" id="coinChartPool" checked/><span class="dot"></span> Pool Hashrate</label>
            <label class="legend-item"><input type="checkbox" id="coinChartDiff" checked/><span class="dot dot--avg"></span> Network Difficulty</label>
          </div>
          <div class="chart" id="chartBox">
            <canvas id="chartCanvas"></canvas>
            <div class="chart-xlabel" id="chartXLabel"></div>
            <div class="chart-tooltip" id="chartTip"></div>
          </div>
        </div>
      </div>

      <div class="grid-4 coin-page-meta">
        <div class="card"><div class="card__title">Algorithm</div><div class="card__body"><div class="v">${pool.coin?.algorithm || '—'}</div></div></div>
        <div class="card"><div class="card__title">Reward Scheme</div><div class="card__body"><div class="v">${pool.paymentProcessing?.payoutScheme ?? pool.paymentProcessing?.rewardScheme ?? '—'}</div></div></div>
        <div class="card"><div class="card__title">Block Reward</div><div class="card__body"><div class="v">${fmtReward(pool)}</div></div></div>
        <div class="card"><div class="card__title">Pool Fee</div><div class="card__body"><div class="v">${pool.poolFeePercent!=null ? (pool.poolFeePercent+'%') : (pool?.paymentProcessing?.poolFeePercent!=null ? pool.paymentProcessing.poolFeePercent+'%' : '1.5%')}</div></div></div>
        <div class="card"><div class="card__title">Minimum Payout</div><div class="card__body"><div class="v">${(pool?.paymentProcessing?.minimumPayment != null) ? fmtCoinAmt(pool.paymentProcessing.minimumPayment) + ' ' + (pool.coin?.symbol || pool.coin?.type || pool.id || '') : '—'}</div></div></div>
        <div class="card"><div class="card__title">Network Difficulty</div><div class="card__body"><div class="v mono">${fmtCompact(n.netDiff)}</div></div></div>
        <div class="card"><div class="card__title">Current Price</div><div class="card__body"><div class="v">${priceUsd}${chg}</div></div></div>
      </div>

      <div class="wallet">
        <p class="wallet__label">Your Wallet</p>
        <div class="wallet__row">
          <input id="walletInput" class="input mono" placeholder="Enter your wallet address" value="${getSavedWallet(poolId)}" />
          <button class="btn" id="walletGo" type="button">Search</button>
        </div>
      </div>

      <div class="coin-page-connect">
        <a class="btn btn--secondary" href="#/help/${encodeURIComponent(poolId)}">How to Connect</a>
      </div>
    </section>
  `;

  const wi=$('#walletInput');
  $('#walletGo').onclick=()=>{
    const addr=(wi?.value||'').trim();
    if(!addr) return;
    saveWallet(poolId, addr);
    location.hash = `#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(addr)}/dashboard`;
  };
  wi?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') $('#walletGo')?.click(); });
  wi?.addEventListener('input', ()=>{ const v=(wi.value||'').trim(); if(v) saveWallet(poolId, v); });

  // ? загрузка истории (если endpoint есть) + realtime точки дальше
  const hist = await fetchPoolHourly(poolId);
  const arr = pickHistoryArray(hist);
  if(arr.length){
    seedCoinHistory(poolId, arr);
  }
  pushCoinPoint(poolId, n.poolHash, n.netDiff);
  drawCoinChart(poolId);
  const poolCb=$('#coinChartPool'), diffCb=$('#coinChartDiff');
  if(poolCb) poolCb.onchange=()=>drawCoinChart(poolId);
  if(diffCb) diffCb.onchange=()=>drawCoinChart(poolId);
}

function ensureCoinDifficultySeries(poolId){
  const s = SERIES.coin.get(poolId);
  if(!s || !s.t.length) return s;
  const pool = POOL_BY_ID.get(poolId);
  const curDiff = pool ? asNumberOrNull(pool.networkStats?.networkDifficulty ?? pool.networkStats?.difficulty ?? pool.poolStats?.networkDifficulty) : null;
  const fillVal = curDiff != null ? curDiff : (s.bRaw.filter(Boolean)[0] ?? 0);
  while(s.bRaw.length < s.t.length) s.bRaw.push(fillVal);
  for(let i = 0; i < s.bRaw.length; i++) if(s.bRaw[i] == null) s.bRaw[i] = fillVal;
  return s;
}

function drawCoinChart(poolId){
  ensureCoinDifficultySeries(poolId);
  const s = SERIES.coin.get(poolId);
  if(!s || s.a.length<2) return;
  const showA = !$('#coinChartPool') || $('#coinChartPool').checked;
  const showB = !$('#coinChartDiff') || $('#coinChartDiff').checked;
  if(!showA && !showB) return;
  const bArr = s.bRaw.length === s.a.length ? s.bRaw : s.a.map(() => s.bRaw[s.bRaw.length-1] ?? 0);
  renderChartDual({
    aArr: s.a,
    bArr: bArr,
    tArr: s.t,
    labels: ['Pool Hashrate','Network Difficulty'],
    fmtA: (v)=>fmtHashrate(v),
    fmtB: (v)=>fmtCompact(v),
    axisBRight: true,
    fillB: true,
    showA,
    showB
  });
}

async function renderBlocks(poolIdMaybe){
  renderLoading("Blocks");
  await loadPools();
  const poolId = poolIdMaybe || ensureActivePool();
  if(!POOL_BY_ID.has(poolId)){ await renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  const n=poolNumbers(pool);
  setHeaderBadges(n.blocks, n.miners);

  const data = await tryJson([
    `${API}/pools/${encodeURIComponent(poolId)}/blocks?page=0&pageSize=50`,
    `${API}/pools/${encodeURIComponent(poolId)}/blocks`,
    `${API}/pool/${encodeURIComponent(poolId)}/blocks?page=0&pageSize=50`,
    `${API}/pool/${encodeURIComponent(poolId)}/blocks`,
  ]);

  const arr = Array.isArray(data?.blocks) ? data.blocks : (Array.isArray(data)?data:(Array.isArray(data?.results)?data.results:[]));
  const blocks = arr.slice(0,50);

  const rows = blocks.length ? blocks.map(b=>{
    const height = b.blockHeight ?? b.height ?? '—';
    const status = b.status ?? b.state ?? '—';
    const time = b.created ?? b.createdAt ?? b.time ?? '—';
    const miner = b.miner ?? b.minerAddress ?? b.worker ?? '—';
    const effort = b.effort ?? b.effortPercent ?? '—';
    const sol = b.solution ?? b.shareDifficulty ?? '—';
    const reward = b.reward ?? b.blockReward ?? '—';
    return `<tr>
      <td>${fmtNumber(height)}</td>
      <td>${status}</td>
      <td class="mono">${time}</td>
      <td class="mono">${miner}</td>
      <td>${effort}</td>
      <td>${sol}</td>
      <td>${reward}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7">—</td></tr>`;

  $('#app').innerHTML=`
    <section class="surface">
      ${coinMenu(poolId,'blocks')}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Blocks</h1>
        <div class="hint"></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Height</th><th>Status</th><th>Time</th><th>Miner</th><th>Effort</th><th>Solution</th><th>Reward</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

async function renderMiners(poolIdMaybe){
  renderLoading("Miners");
  await loadPools();
  const poolId = poolIdMaybe || ensureActivePool();
  if(!POOL_BY_ID.has(poolId)){ await renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  const n=poolNumbers(pool);
  setHeaderBadges(n.blocks, n.miners);

  // ? НИКАКИХ “фантомов”: если connectedMiners=0 -> пусто
  if((n.miners||0) === 0){
    $('#app').innerHTML=`
      <section class="surface">
        ${coinMenu(poolId,'miners')}
        <div class="surface__head">
          <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Miners</h1>
          <div class="hint">Connected: <b>0</b></div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Miner</th><th>Hashrate</th><th>Last Share</th></tr></thead>
            <tbody><tr><td colspan="3">—</td></tr></tbody>
          </table>
        </div>
      </section>`;
    return;
  }

  const data = await fetchMiners(poolId);
  const listRaw = pickMinersArray(data);

  const rows = listRaw.length ? listRaw.map(m=>{
    const addr = minerAddress(m);
    const wname = workerDisplayName(m);
    const hr = m.hashrate ?? m.hashRate ?? 0;
    const last = m.lastShare ?? m.lastShareTime ?? '—';
    return `<tr class="row-link" onclick="location.hash='#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(addr)}/dashboard'">
      <td>${wname}</td>
      <td>${fmtHashrate(hr)}</td>
      <td>${last}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="3">—</td></tr>`;

  $('#app').innerHTML=`
    <section class="surface">
      ${coinMenu(poolId,'miners')}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Miners</h1>
        <div class="hint">Connected: <b>${fmtNumber(n.miners)}</b></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Miner</th><th>Hashrate</th><th>Last Share</th></tr></thead>
          <tbody id="minersTbody">${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

async function copyText(txt){
  try{ await navigator.clipboard.writeText(txt); }
  catch(e){
    const ta=document.createElement('textarea');
    ta.value=txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
  }
}
async function renderHelp(poolIdMaybe){
  renderLoading("Help");
  await loadPools();
  const poolId = poolIdMaybe || ensureActivePool();
  if(!POOL_BY_ID.has(poolId)){ await renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  const n=poolNumbers(pool);
  setHeaderBadges(n.blocks, n.miners);

  const host = location.hostname || "public-pool-btc.ru";
  const ports = pool.ports ? Object.entries(pool.ports).map(([port,cfg])=>({
    port:Number(port),
    name: cfg.name || '',
    diff: cfg.difficulty ?? null,
    tls: !!cfg.tls
  })).sort((a,b)=>a.port-b.port) : [];

  const rows = ports.length ? ports.map(p=>{
    const url=`stratum+tcp://${host}:${p.port}`;
    return `<tr>
      <td>${p.tls?'TLS':'TCP'}</td>
      <td>${p.diff==null?'VarDiff':fmtNumber(p.diff)}</td>
      <td class="mono">${url}</td>
      <td>${p.name}</td>
      <td><span class="copy-btn" title="Copy" onclick="copyText('${url}')">${svgIcon('copy')}</span></td>
    </tr>`;
  }).join('') : `<tr><td colspan="5">—</td></tr>`;

  const poolWallet = pool.address ?? '—';
  const walletLink = poolWallet==='—' ? '#' : explorerAddr(poolId, poolWallet);

  $('#app').innerHTML=`
    <section class="surface">
      ${coinMenu(poolId,'help')}
      <div class="surface__head"><h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Help</h1><div class="hint"></div></div>

      <div class="grid-2">
        <div class="card" style="grid-column:1/-1">
          <div class="card__title">Connection TCP</div>
          <div class="card__body" style="padding:0">
            <div class="table-wrap" style="padding:0">
              <table class="table">
                <thead><tr><th>Protocol</th><th>Difficulty</th><th>Server</th><th>Description</th><th>Copy</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card" style="grid-column:1/-1">
          <div class="card__title">Pool Wallet</div>
          <div class="card__body">
            <div class="copy-row">
              <span class="mono">${poolWallet}</span>
              ${poolWallet==='—'?'':`<span class="copy-btn" title="Copy" onclick="copyText('${poolWallet}')">${svgIcon('copy')}</span>`}
              ${poolWallet==='—'?'':`<a class="copy-btn" href="${walletLink}" target="_blank" rel="noopener" title="Open in explorer">${svgIcon('ext')}</a>`}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ---------- miner dashboard ---------- */
function tabsMiner(poolId, addr, activeTab){
  const base = `#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(addr)}`;
  return `
    <div class="tabs" role="tablist">
      <div class="tab ${activeTab==='dashboard'?'is-active':''}" onclick="location.hash='${base}/dashboard'">DASHBOARD</div>
      <div class="tab ${activeTab==='rewards'?'is-active':''}" onclick="location.hash='${base}/rewards'">REWARDS</div>
      <div class="tab ${activeTab==='payouts'?'is-active':''}" onclick="location.hash='${base}/payouts'">PAYOUTS</div>
    </div>`;
}
function drawMinerChart(poolId, addr){
  const key=`${poolId}:${addr}`;
  const s=SERIES.miner.get(key);
  if(!s || s.a.length<2) return;
  const showA = !$('#minerChart30m') || $('#minerChart30m').checked;
  const showB = !$('#minerChart1h') || $('#minerChart1h').checked;
  if(!showA && !showB) return;
  renderChartDual({
    aArr: s.a,
    bArr: s.b,
    tArr: s.t,
    labels: ['Current Hashrate (30m)','Average Hashrate (1h)'],
    fmtA: (v)=>fmtHashrate(v),
    fmtB: (v)=>fmtHashrate(v),
    axisBRight: false,
    fillB: true,
    showA,
    showB
  });
}

async function renderMiner(poolId, addr, tab='dashboard'){
  renderLoading("Miner");
  await loadPools();
  if(!POOL_BY_ID.has(poolId)){ await renderPools(); return; }
  setActivePool(poolId);
  saveWallet(poolId, addr);

  const pool=POOL_BY_ID.get(poolId);
  const n=poolNumbers(pool);
  setHeaderBadges(n.blocks, n.miners);

  const connectedNow = (n.miners||0) > 0;

  // ? если нет подключений — никакого “левого” майнера
  let row=null;
  if(connectedNow){
    const minersData = await fetchMiners(poolId);
    const miners = pickMinersArray(minersData);
    row = miners.find(x => (x.miner||x.address||x.login) === addr) || null;
  }

  const online = !!row;
  const inst = online ? asNumberOrNull(row.hashrate ?? row.hashRate ?? 0) : null;
  if(inst!=null && inst>0){
    pushMinerPoint(`${poolId}:${addr}`, inst);
  }

  const ss=SERIES.miner.get(`${poolId}:${addr}`);
  const hr30 = ss?.a?.length ? ss.a[ss.a.length-1] : null;
  const hr1h = ss?.b?.length ? ss.b[ss.b.length-1] : null;

  const st = await fetchMinerStats(poolId, addr);
  const pendingShares = st.pendingShares ?? null;
  const unconfirmed = st.unconfirmed ?? st.unconfirmedBalance ?? null;
  const pendingBalance = st.pendingBalance ?? st.pending ?? null;
  const balance = st.balance ?? null;
  const totalPaid = st.totalPaid ?? null;
  const todayPaid = st.todayPaid ?? null;
  const minerEffort = st.minerEffort ?? null;
  const blocksFound = st.blocksFound ?? st.blocks ?? null;
  const lastBestShare = st.lastBestShare ?? st.lastBestShareTime ?? st.lastShare ?? null;
  const bestShare = st.bestShare ?? st.bestShareDifficulty ?? st.bestDifficulty ?? row?.bestShare ?? null;
  const portDiff = st.portDifficulty ?? st.port ?? pool?.ports?.[Object.keys(pool.ports||{})[0]]?.difficulty ?? null;
  const workerName = row ? workerDisplayName(row) : (addr.includes('.') ? addr.split('.').slice(1).join('.') : 'Default');
  const workersList = Array.isArray(st.workers) ? st.workers : (row && row.workers ? (Array.isArray(row.workers) ? row.workers : [row]) : (row ? [row] : []));

  const extAddr = explorerAddr(poolId, addr);
  const netDiffStr = n.netDiff != null ? fmtHashrate(n.netDiff) : (n.netDiff != null ? fmtCompact(n.netDiff) : '—');

  let body='';
  if(tab==='dashboard'){
    body = `
      <div class="grid-2" style="padding-top:0">
        <div class="card"><div class="card__title">WORKERS</div><div class="card__body"><div class="kv">
          <div class="k">Online</div><div class="v">${online ? '1' : '0'}</div>
          <div class="k">Offline</div><div class="v">${online ? '0' : '1'}</div>
        </div></div></div>

        <div class="card"><div class="card__title">HASHRATE</div><div class="card__body"><div class="kv">
          <div class="k">Current Hashrate (30m)</div><div class="v" id="mHr30">${hr30==null?'—':fmtHashrate(hr30)}</div>
          <div class="k">Average Hashrate (1h)</div><div class="v" id="mHr1h">${hr1h==null?'—':fmtHashrate(hr1h)}</div>
        </div></div></div>

        <div class="card"><div class="card__title">WORK</div><div class="card__body"><div class="kv">
          <div class="k">Share Sum</div><div class="v mono">${pendingShares==null?'—':fmtNumber(pendingShares)}</div>
          <div class="k">Personal Effort</div><div class="v">${minerEffort==null?'—':(Number(minerEffort).toFixed(3)+'%')}</div>
          <div class="k">Blocks</div><div class="v">${blocksFound==null?'—':fmtNumber(blocksFound)}</div>
        </div></div></div>

        <div class="card"><div class="card__title">REWARD</div><div class="card__body"><div class="kv">
          <div class="k">Unconfirmed</div><div class="v mono">${unconfirmed==null?'0.000000':String(unconfirmed)}</div>
          <div class="k">Balance</div><div class="v mono">${balance==null?'0.000000':String(balance)}</div>
          <div class="k">Pending</div><div class="v mono">${pendingBalance==null?'0.000000':String(pendingBalance)}</div>
        </div></div></div>
      </div>

      <div class="expander" aria-expanded="true">
        <div class="expander__head" onclick="toggleExpander(this.parentElement)">
          <div class="title">Hashrate Chart</div>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="expander__body">
          <div class="legend legend--toggles">
            <label class="legend-item"><input type="checkbox" id="minerChart30m" checked/><span class="dot"></span> Current Hashrate (30m)</label>
            <label class="legend-item"><input type="checkbox" id="minerChart1h" checked/><span class="dot dot--avg"></span> Average Hashrate (1h)</label>
          </div>
          <div class="chart" id="chartBox">
            <canvas id="chartCanvas"></canvas>
            <div class="chart-xlabel" id="chartXLabel"></div>
            <div class="chart-tooltip" id="chartTip"></div>
          </div>
        </div>
      </div>

      <div class="grid-4 miner-extra">
        <div class="card"><div class="card__title">Last Best Share</div><div class="card__body"><div class="v mono">${lastBestShare==null?'—':String(lastBestShare)}</div></div></div>
        <div class="card"><div class="card__title">Best Share</div><div class="card__body"><div class="v">${bestShare==null?'—':fmtCompact(bestShare)}</div></div></div>
        <div class="card"><div class="card__title">Network Difficulty</div><div class="card__body"><div class="v">${netDiffStr}</div></div></div>
        <div class="card"><div class="card__title">Port Difficulty</div><div class="card__body"><div class="v">${portDiff==null?'—':fmtNumber(portDiff)}</div></div></div>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Worker</th><th>Hashrate (30m)</th><th>Hashrate (1h)</th>
              <th>Valids</th><th>Invalid</th><th>Stale</th><th>Best Share</th><th>Port</th><th>Last Share</th>
            </tr>
          </thead>
          <tbody>
            ${workersList.length ? workersList.map(w=>{
              const wn = w.name ?? w.workerName ?? w.worker ?? (w.miner && String(w.miner).includes('.') ? String(w.miner).split('.').slice(1).join('.') : null) ?? 'Default';
              const wh30 = w.hashrate ?? w.hashRate ?? w.reportedHashrate ?? (w===row ? hr30 : null);
              const wh1h = w.averageHashrate ?? w.avgHashrate ?? (w===row ? hr1h : null);
              const valids = w.validShares ?? w.validSharesCount ?? w.accepted ?? '—';
              const inv = w.invalidShares ?? w.invalidSharesCount ?? w.rejected ?? '—';
              const stale = w.staleShares ?? w.staleSharesCount ?? '—';
              const bshare = w.bestShare ?? w.bestShareDifficulty ?? w.difficulty ?? '—';
              const port = w.port ?? w.portName ?? w.difficulty ?? '—';
              const lastSh = w.lastShare ?? w.lastShareTime ?? '—';
              return `<tr><td>${wn}</td><td>${wh30==null?'—':fmtHashrate(wh30)}</td><td>${wh1h==null?'—':fmtHashrate(wh1h)}</td><td>${fmtNumber(valids)}</td><td>${fmtNumber(inv)}</td><td>${fmtNumber(stale)}</td><td>${typeof bshare==='number'?fmtCompact(bshare):bshare}</td><td>${port}</td><td class="mono">${lastSh}</td></tr>`;
            }).join('') : `<tr><td>${workerName}</td><td>${hr30==null?'—':fmtHashrate(hr30)}</td><td>${hr1h==null?'—':fmtHashrate(hr1h)}</td><td>—</td><td>—</td><td>—</td><td>${bestShare==null?'—':fmtCompact(bestShare)}</td><td>${portDiff==null?'—':String(portDiff)}</td><td class="mono">${lastBestShare==null?'—':String(lastBestShare)}</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  } else if(tab==='payouts'){
    const pay = await fetchMinerPayments(poolId, addr);
    const arr = pickPaymentsArray(pay);
    const rows = arr.length ? arr.slice(0,50).map(x=>{
      const time = x.created ?? x.createdAt ?? x.time ?? x.timestamp ?? '—';
      const amount = x.amount ?? x.value ?? x.total ?? '—';
      const tx = x.txid ?? x.txHash ?? x.transactionHash ?? x.tx ?? '—';
      const txLink = tx==='—' ? '#' : explorerTx(poolId, tx);
      return `<tr><td class="mono">${time}</td><td>${amount}</td><td class="mono">${tx==='—'?'—':`<a href="${txLink}" target="_blank" rel="noopener">${tx}</a>`}</td></tr>`;
    }).join('') : `<tr><td colspan="3">—</td></tr>`;
    body = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Time</th><th>Amount</th><th>TX</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } else {
    body = `
      <div class="grid-2" style="padding-top:0">
        <div class="card" style="grid-column:1/-1"><div class="card__title">REWARDS</div>
          <div class="card__body"><div class="kv">
            <div class="k">Pending Balance</div><div class="v mono">${pendingBalance==null?'—':String(pendingBalance)}</div>
            <div class="k">Total Paid</div><div class="v mono">${totalPaid==null?'—':String(totalPaid)}</div>
            <div class="k">Today Paid</div><div class="v mono">${todayPaid==null?'—':String(todayPaid)}</div>
            <div class="k">Miner Effort</div><div class="v">${minerEffort==null?'—':(Number(minerEffort).toFixed(2)+'%')}</div>
          </div></div>
        </div>
      </div>`;
  }

  $('#app').innerHTML=`
    <section class="surface">
      ${coinMenu(poolId,'miners')}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Miner</h1>
        <div class="hint">${connectedNow ? '' : 'OFFLINE'}</div>
      </div>

      <div style="padding:10px 14px; display:flex; align-items:center; justify-content:center; gap:10px;">
        <div class="mono" style="font-weight:900;overflow:hidden;text-overflow:ellipsis;max-width:80%;">${addr}</div>
        <a class="copy-btn" href="${extAddr}" target="_blank" rel="noopener" title="Open in explorer">${svgIcon('ext')}</a>
      </div>

      ${tabsMiner(poolId, addr, tab)}
      ${body}
    </section>
  `;

  if(tab==='dashboard'){
    drawMinerChart(poolId, addr);
    const m30=$('#minerChart30m'), m1h=$('#minerChart1h');
    if(m30) m30.onchange=()=>drawMinerChart(poolId, addr);
    if(m1h) m1h.onchange=()=>drawMinerChart(poolId, addr);
  }
}

/* ---------- realtime updates (no hard reload) ---------- */
function updateCoinDOM(poolId){
  const pool=POOL_BY_ID.get(poolId);
  if(!pool) return;
  const n=poolNumbers(pool);

  const setTxt=(id,val)=>{ const el=document.getElementById(id); if(el && el.textContent!==val) el.textContent=val; };
  const setHtml=(id,html)=>{ const el=document.getElementById(id); if(el && el.innerHTML!==html) el.innerHTML=html; };

  setTxt('cMiners', fmtNumber(n.miners));
  setTxt('cPoolHash', fmtHashrate(n.poolHash));
  setTxt('cBlocks', fmtNumber(n.blocks));
  setTxt('cEffort', n.effort != null ? (n.effort.toFixed(0) + '%') : '—');
  setTxt('cLastBlock', n.lastBlock != null ? String(n.lastBlock) : '—');
  setTxt('cNetDiff', fmtCompact(n.netDiff));
  setTxt('cNetHash', fmtHashrate(n.netHash));
  setTxt('cHeight', fmtNumber(n.height));

  const pr=priceForPool(pool);
  const priceUsd = pr.usd==null?'—':fmtMoneyUsd(pr.usd);
  const chg = pr.chg==null?'':` <span class="chg ${(Number(pr.chg)||0)>=0?'up':'down'}">${fmtPct(Number(pr.chg)||0)} ${(Number(pr.chg)||0)>=0?'↑':'↓'}</span>`;
  setHtml('cPrice', priceUsd + chg);
  const priceBtc = pr.btc != null ? (pr.btc.toFixed(8) + ' BTC') : '—';
  setHtml('cPriceBtc', priceBtc + (pr.chg!=null ? ` <span class="chg ${(Number(pr.chg)||0)>=0?'up':'down'}">${fmtPct(Number(pr.chg)||0)}</span>` : ''));

  pushCoinPoint(poolId, n.poolHash, n.netDiff);
  drawCoinChart(poolId);
}

async function tickMinerRealtime(){
  if(!(CURRENT.page==='miner' && CURRENT.poolId && CURRENT.addr && CURRENT.tab==='dashboard')) return;
  const pool=POOL_BY_ID.get(CURRENT.poolId);
  if(!pool) return;

  const n=poolNumbers(pool);
  if((n.miners||0)===0) return;

  try{
    const data = await fetchMiners(CURRENT.poolId);
    const miners = pickMinersArray(data);
    const row = miners.find(x => (x.miner||x.address||x.login) === CURRENT.addr) || null;
    if(!row) return;

    const inst = asNumberOrNull(row.hashrate ?? row.hashRate ?? null);
    if(inst==null || inst<=0) return;

    pushMinerPoint(`${CURRENT.poolId}:${CURRENT.addr}`, inst);

    const s=SERIES.miner.get(`${CURRENT.poolId}:${CURRENT.addr}`);
    const el30=$('#mHr30'), el60=$('#mHr1h');
    if(el30 && s?.a?.length) el30.textContent=fmtHashrate(s.a[s.a.length-1]);
    if(el60 && s?.b?.length) el60.textContent=fmtHashrate(s.b[s.b.length-1]);
    drawMinerChart(CURRENT.poolId, CURRENT.addr);
  }catch(e){}
}

/* ---------- router ---------- */
async function router(){
  const hash=(location.hash||'#/').replace(/^#\/?/,'');
  const parts=hash.split('/').filter(Boolean);

  if(parts.length===0){
    CURRENT={page:'pools', poolId:null, addr:null, tab:null};
    updateSidebarActive('pools');
    await renderPools();
    return;
  }

  const [page,a,b,c]=parts;

  if(page==='coin' && a){
    CURRENT={page:'coin', poolId:a, addr:null, tab:null};
    updateSidebarActive('pools');
    await renderCoin(a);
    return;
  }
  if(page==='blocks'){
    CURRENT={page:'blocks', poolId:a||null, addr:null, tab:null};
    updateSidebarActive('pools');
    await renderBlocks(a||null);
    return;
  }
  if(page==='miners'){
    CURRENT={page:'miners', poolId:a||null, addr:null, tab:null};
    updateSidebarActive('pools');
    await renderMiners(a||null);
    return;
  }
  if(page==='help'){
    CURRENT={page:'help', poolId:a||null, addr:null, tab:null};
    updateSidebarActive('pools');
    await renderHelp(a||null);
    return;
  }
  if(page==='miner' && a && b){
    const tab=c||'dashboard';
    CURRENT={page:'miner', poolId:a, addr:decodeURIComponent(b), tab:tab};
    updateSidebarActive('pools');
    await renderMiner(a, decodeURIComponent(b), tab);
    return;
  }

  CURRENT={page:'pools', poolId:null, addr:null, tab:null};
  updateSidebarActive('pools');
  await renderPools();
}

function updateSidebarActive(page){
  $$('.sidebar__link').forEach(l=>{
    l.classList.toggle('sidebar__link--active', (l.dataset.page||'')===page);
  });
}

/* ---------- timers ---------- */
let tPools=null, tPrices=null, tMiners=null, tPush=null;

async function tickPools(){
  try{
    await loadPools();
    if(CURRENT.page==='pools'){
      const tb=$('#poolsTbody');
      if(tb){
        tb.innerHTML = POOLS.map(p=>{
          const n=poolNumbers(p);
          const totalPaid = p?.poolStats?.totalPaid ?? p?.poolStats?.totalPayments ?? p?.poolStats?.totalPaidOut ?? null;
          const poolFee = p?.poolFeePercent != null ? (p.poolFeePercent+'%') : (p?.paymentProcessing?.poolFeePercent != null ? (p.paymentProcessing.poolFeePercent+'%') : '1.5%');
          const minPay = p?.paymentProcessing?.minimumPayment != null ? fmtCoinAmt(p.paymentProcessing.minimumPayment) + ' ' + (p.coin?.symbol || p.id) : '—';
          return `<tr class="row-link" data-pool="${p.id}" onclick="localStorage.setItem('${KEY_ACTIVE_POOL}','${p.id}'); location.hash='#/coin/${encodeURIComponent(p.id)}'">
            <td><div class="coin-cell">${iconImg(p)}<span>${p.coin?.name || p.coin?.type || p.id} (${p.coin?.symbol || p.coin?.type || p.id})</span></div></td>
            <td>${p.coin?.algorithm || '—'}</td>
            <td>${fmtNumber(n.miners)}</td>
            <td>${fmtHashrate(n.poolHash)}</td>
            <td>${fmtNumber(n.blocks)}</td>
            <td>${totalPaid!=null ? fmtCoinAmt(totalPaid) : '—'}</td>
            <td>${poolFee}</td>
            <td>${minPay}</td>
            <td>${fmtHashrate(n.netHash)}</td>
            <td>${fmtCompact(n.netDiff)}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="10">No pools</td></tr>';
      }
    }
    if(CURRENT.page==='coin' && CURRENT.poolId){
      updateCoinDOM(CURRENT.poolId);
    }
  }catch(e){}
}
async function tickPrices(){
  try{
    await refreshPrices();
    if(CURRENT.page==='coin' && CURRENT.poolId) updateCoinDOM(CURRENT.poolId);
  }catch(e){}
}
async function tickMiners(){
  if(CURRENT.page!=='miners') return;
  const poolId = CURRENT.poolId || ensureActivePool();
  const pool=POOL_BY_ID.get(poolId);
  if(!pool) return;

  const n=poolNumbers(pool);
  if((n.miners||0)===0){
    const tb=$('#minersTbody');
    if(tb) tb.innerHTML = `<tr><td colspan="3">—</td></tr>`;
    return;
  }

  try{
    const data = await fetchMiners(poolId);
    const listRaw = pickMinersArray(data);

    const tb=$('#minersTbody');
    if(!tb) return;

    tb.innerHTML = (listRaw.length ? listRaw.map(m=>{
      const addr = minerAddress(m);
      const wname = workerDisplayName(m);
      const hr = m.hashrate ?? m.hashRate ?? 0;
      const last = m.lastShare ?? m.lastShareTime ?? '—';
      return `<tr class="row-link" onclick="location.hash='#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(addr)}/dashboard'">
        <td>${wname}</td><td>${fmtHashrate(hr)}</td><td>${last}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="3">—</td></tr>`);
  }catch(e){}
}

function ensureTimers(){
  if(!tPools)  tPools=setInterval(tickPools, POLL_POOLS_MS);
  if(!tPrices) tPrices=setInterval(tickPrices, POLL_PRICE_MS);
  if(!tMiners) tMiners=setInterval(tickMiners, POLL_MINERS_MS);
  if(!tPush)   tPush=setInterval(tickMinerRealtime, PUSH_MS);
}

/* ---------- header dropdowns (Home / EN / Theme) ---------- */
function initHeaderDD(){
  const langBtn = document.getElementById('langBtn');
  const themeBtn = document.getElementById('themeBtn');
  const ddLang = document.getElementById('ddLang');
  const ddTheme = document.getElementById('ddTheme');
  if (langBtn && ddLang) {
    langBtn.onclick = (e) => { e.stopPropagation(); ddLang.classList.toggle('is-open'); ddTheme?.classList.remove('is-open'); };
    ddLang.querySelectorAll('.dd__item[data-lang]').forEach(el => {
      el.onclick = () => { setLang(el.dataset.lang); ddLang.classList.remove('is-open'); };
    });
  }
  if (themeBtn && ddTheme) {
    themeBtn.onclick = (e) => { e.stopPropagation(); ddTheme.classList.toggle('is-open'); ddLang?.classList.remove('is-open'); };
    ddTheme.querySelectorAll('.dd__item[data-theme]').forEach(el => {
      el.onclick = () => { setTheme(el.dataset.theme); ddTheme.classList.remove('is-open'); };
    });
  }
}

/* ---------- boot ---------- */
(function boot(){
  setTheme(localStorage.getItem('theme')||'dark');
  setLang(localStorage.getItem('lang')||'en');
  initHeaderDD();
  router();
  ensureTimers();
  window.addEventListener('hashchange', router);
})();

