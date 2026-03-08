const API="/api";

/* ---------- UI helpers ---------- */
function $(q,root=document){return root.querySelector(q)}
function $$(q,root=document){return Array.from(root.querySelectorAll(q))}
function closeAllDD(){ $$('.dd').forEach(d=>d.classList.remove('is-open')) }
function toggleDD(id){ const el=document.getElementById(id); if(!el) return; const o=el.classList.contains('is-open'); closeAllDD(); if(!o) el.classList.add('is-open') }
document.addEventListener('click',e=>{ if(!e.target.closest('.dd')) closeAllDD() })

function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  localStorage.setItem('theme',theme);
  const cD=document.getElementById('themeCheckDark');
  const cL=document.getElementById('themeCheckLight');
  if(cD) cD.textContent=theme==='dark'?'?':'';
  if(cL) cL.textContent=theme==='light'?'?':'';
  const svg=document.getElementById('themeIconSvg');
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
  const lbl=document.getElementById('langLabel');
  const cE=document.getElementById('langCheckEn');
  const cR=document.getElementById('langCheckRu');
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
  if(typeof hps==='string' && !isPlainNumberString(hps)) return hps; // уже с единицами
  const x=asNumberOrNull(hps); if(x==null) return '—';
  if(x===0) return '0 H/s';
  const {u,v}=pickUnitHps(x);
  return (x/v).toFixed(2)+' '+u;
}
function fmtCompact(n){
  if(typeof n==='string' && !isPlainNumberString(n)) return n;
  const x=asNumberOrNull(n); if(x==null) return '—';
  const abs=Math.abs(x);
  const u=[{u:'',v:1},{u:'K',v:1e3},{u:'M',v:1e6},{u:'G',v:1e9},{u:'T',v:1e12},{u:'P',v:1e15},{u:'E',v:1e18}];
  let c=u[0]; for(const it of u){ if(abs>=it.v) c=it; }
  if(c.u==='') return fmtNumber(x);
  return (x/c.v).toFixed(3)+c.u;
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
  const x=asNumberOrNull(p); if(x==null) return '—';
  const s=x>0?'+':'';
  return `${s}${x.toFixed(2)}%`;
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
function setActivePool(id){ if(id) localStorage.setItem(KEY_ACTIVE_POOL, id); }
function getActivePool(){ return localStorage.getItem(KEY_ACTIVE_POOL) || ''; }

let POOLS=[];
let POOL_BY_ID=new Map();

async function loadPools(){
  const data=await fetchJson(`${API}/pools`);
  POOLS = Array.isArray(data?.pools) ? data.pools : [];
  POOL_BY_ID = new Map(POOLS.map(p=>[p.id, p]));
  return POOLS;
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
  const sym=(pool?.coin?.symbol||pool?.id||'').toLowerCase();
  const symChar=(pool?.coin?.symbol||pool?.id||'?').slice(0,1);
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
  const bB=document.getElementById('badgeBlocks');
  const bM=document.getElementById('badgeMiners');
  if(bB) bB.textContent=String(blocks||0);
  if(bM) bM.textContent=String(miners||0);
}

/* ---------- coin switcher (for #/blocks, #/miners, #/help) ---------- */
function coinSwitcher(prefix, activeId){
  const chips = POOLS.map(p=>{
    const on = p.id===activeId;
    return `<a class="pill ${on?'pill--active':''}" href="#/${prefix}/${encodeURIComponent(p.id)}">
      <span class="pill__icon">${iconImg(p)}</span>
      <span>${(p.coin?.symbol||p.id)}</span>
    </a>`;
  }).join('');
  return `<div class="coin-menu" style="justify-content:flex-end">${chips}</div>`;
}

/* ---------- UI skeleton ---------- */
function renderLoading(title){
  document.getElementById('app').innerHTML=`
    <section class="surface">
      <div class="surface__head"><h1>${title}</h1><div class="hint">Loading…</div></div>
      <div style="padding:14px;color:var(--muted)">Please wait…</div>
    </section>`;
}
function go(h){ location.hash=h; }

/* ---------- prices (optional) ---------- */
const META = {
  btc:{gecko:"bitcoin"},
  bch:{gecko:"bitcoin-cash"},
  bsv:{gecko:"bitcoin-sv"},
  doge:{gecko:"dogecoin"},
  xec:{gecko:"ecash"},
  xmr:{gecko:"monero"},
  ltc:{gecko:"litecoin"},
};
async function loadPrices(ids){
  const uniq=[...new Set(ids.filter(Boolean))];
  if(!uniq.length) return {};
  const url=`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(uniq.join(','))}&vs_currencies=usd&include_24hr_change=true`;
  try{ return await fetchJson(url); }catch(e){ return {}; }
}

/* ---------- chart (same look you asked: smooth, orange fill, crosshair band via CSS var) ---------- */
function makeSeries(base, points=96){
  const out=[];
  let v=Math.max(1, Number(base)||1);
  for(let i=0;i<points;i++){
    v *= (0.992 + Math.random()*0.016);
    if(Math.random()<0.03) v*=1.08;
    out.push(v);
  }
  return out;
}
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
function renderChart(seriesA, seriesB, labelA, labelB){
  const canvas=document.getElementById('chartCanvas');
  const box=document.getElementById('chartBox');
  const tip=document.getElementById('chartTip');
  const xlbl=document.getElementById('chartXLabel');
  if(!canvas||!box||!tip||!xlbl) return;

  const dpr=Math.max(1, window.devicePixelRatio||1);
  const rect=box.getBoundingClientRect();
  const w=Math.floor(rect.width), h=Math.floor(rect.height);
  canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
  canvas.style.width=w+'px'; canvas.style.height=h+'px';

  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const padL=52,padR=14,padT=12,padB=28;
  const plotW=w-padL-padR, plotH=h-padT-padB;

  const maxY=Math.max(...seriesA,...seriesB)*1.10;
  const minY=Math.min(...seriesA,...seriesB)*0.90;
  const unit=pickUnitHps(maxY);

  const maxYU=maxY/unit.v, minYU=Math.max(0, minY/unit.v);
  function niceStep(maxVal){
    const p=Math.pow(10, Math.floor(Math.log10(maxVal||1)));
    const m=maxVal/p;
    if(m<=2) return 0.2*p;
    if(m<=5) return 0.5*p;
    return 1*p;
  }
  const step=niceStep(maxYU-minYU);
  const yTop=Math.ceil(maxYU/step)*step;
  const yBot=Math.floor(minYU/step)*step;

  function xAt(i){return padL+(i/(seriesA.length-1))*plotW}
  function yAt(v){
    const vu=v/unit.v;
    const t=(vu-yBot)/(yTop-yBot||1);
    return padT+(1-t)*plotH;
  }

  const st = getComputedStyle(document.documentElement);
  const grid=(st.getPropertyValue('--border-soft')||'rgba(255,255,255,.08)').trim();
  const txt =(st.getPropertyValue('--muted')||'rgba(255,255,255,.7)').trim();
  const band=(st.getPropertyValue('--crossBand')||'rgba(255,255,255,.08)').trim();

  const cA='#1f7aff';
  const cB='#f0a61a';

  const times=[];
  const now=Date.now();
  const span=12*60*60*1000;
  for(let i=0;i<seriesA.length;i++){
    const t0=new Date(now-(seriesA.length-1-i)*(span/(seriesA.length-1)));
    times.push(String(t0.getHours()).padStart(2,'0')+':'+String(t0.getMinutes()).padStart(2,'0'));
  }

  function drawSmooth(arr,color){
    const pts=arr.map((v,i)=>({x:xAt(i), y:yAt(v)}));
    ctx.save();
    ctx.strokeStyle=color;
    ctx.lineWidth=2;
    ctx.lineJoin='round';
    ctx.lineCap='round';
    ctx.shadowColor=color;
    ctx.shadowBlur=7;
    ctx.beginPath();
    catmullRomToBezier(ctx, pts);
    ctx.stroke();
    ctx.restore();
    return pts;
  }
  function fillUnder(pts){
    ctx.save();
    ctx.fillStyle=cB;
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

    for(let y=yBot; y<=yTop+1e-9; y+=step){
      const py=padT+(1-(y-yBot)/(yTop-yBot||1))*plotH;
      ctx.beginPath(); ctx.moveTo(padL,py); ctx.lineTo(w-padR,py); ctx.stroke();
      const label=(y===0?'0':y.toFixed((y<10)?1:0))+' '+unit.u;
      ctx.fillText(label, 8, py+4);
    }
    ctx.font='11px Nunito, sans-serif';
    const xEvery=Math.max(1, Math.round(seriesA.length/10));
    for(let i=0;i<seriesA.length;i+=xEvery){
      ctx.fillText(times[i], xAt(i)-14, h-10);
    }

    const ptsB=drawSmooth(seriesB,cB);
    fillUnder(ptsB);
    drawSmooth(seriesA,cA);
  }

  function drawOverlay(idx,mx,my){
    drawBase();
    const x=xAt(idx);
    ctx.save();
    ctx.fillStyle = band;
    ctx.fillRect(x-5, padT, 10, h-padT-padB);
    ctx.restore();

    xlbl.style.display='block';
    xlbl.style.left=x+'px';
    xlbl.textContent=times[idx];

    const a=seriesA[idx], b=seriesB[idx];
    tip.style.display='block';
    tip.innerHTML=`
      <div class="t">${times[idx]}</div>
      <div class="row"><span>${labelA}</span><b>${fmtHashrate(a)}</b></div>
      <div class="row"><span>${labelB}</span><b>${fmtHashrate(b)}</b></div>
    `;
    const tw=tip.offsetWidth, th=tip.offsetHeight;
    const pad=10;
    let left=mx+14, top=my-14-th;
    if(left+tw+pad>w) left=w-tw-pad;
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
    const idx=Math.max(0, Math.min(seriesA.length-1, Math.round(((mx-padL)/plotW)*(seriesA.length-1))));
    if(raf) cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>drawOverlay(idx,mx,my));
  };
  canvas.onmouseleave=()=>{tip.style.display='none'; xlbl.style.display='none'; drawBase();};
}

/* ---------- explorer mapping ---------- */
function explorerAddr(poolId, addr){
  const id=(poolId||'').toLowerCase();
  if(id==='bch') return `https://blockchair.com/bitcoin-cash/address/${encodeURIComponent(addr)}`;
  if(id==='xec') return `https://explorer.e.cash/address/${encodeURIComponent(addr)}`;
  return `https://www.blockchain.com/explorer/addresses/btc/${encodeURIComponent(addr)}`;
}
function explorerTx(poolId, tx){
  const id=(poolId||'').toLowerCase();
  if(id==='bch') return `https://blockchair.com/bitcoin-cash/transaction/${encodeURIComponent(tx)}`;
  if(id==='xec') return `https://explorer.e.cash/tx/${encodeURIComponent(tx)}`;
  return `https://www.blockchain.com/explorer/transactions/btc/${encodeURIComponent(tx)}`;
}

/* ---------- pages ---------- */
async function renderPools(){
  renderLoading("Mining Pools");
  await loadPools();
  const active=ensureActivePool();

  const geckoIds=POOLS.map(p=>META[(p.coin?.symbol||p.id||'').toLowerCase()]?.gecko||null);
  const prices=await loadPrices(geckoIds);

  const totalBlocks = POOLS.reduce((a,p)=>a+(Number(p.poolStats?.totalBlocksFound ?? p.poolStats?.totalBlocks ?? 0)||0),0);
  const totalMiners = POOLS.reduce((a,p)=>a+(Number(p.poolStats?.connectedMiners ?? p.poolStats?.miners ?? 0)||0),0);
  setHeaderBadges(totalBlocks, totalMiners);

  const rows=POOLS.map(p=>{
    const ps=p.poolStats||{};
    const ns=p.networkStats||{};
    const miners=ps.connectedMiners ?? ps.miners ?? 0;
    const poolHash=ps.poolHashrate ?? ps.hashrate ?? 0;
    const netDiff=ns.networkDifficulty ?? ns.difficulty ?? 0;

    const sym=(p.coin?.symbol||p.id||'').toLowerCase();
    const gId=META[sym]?.gecko || null;
    const g=gId?prices[gId]:null;
    const priceUsd=g?.usd ?? null;
    const chg=g?.usd_24h_change ?? null;
    const cls=(Number(chg)||0)>=0?'up':'down';
    const chgHtml=(chg==null)?'':` <span class="chg ${cls}">(${fmtPct(Number(chg)||0)} ${cls==='down'?'v':'^'})</span>`;

    const reward = p.coin?.blockReward ?? ns.blockReward ?? ps.blockReward ?? null;
    const coinName=`${p.coin?.name || p.id} (${p.coin?.symbol || p.id})`;

    return `
    <tr class="row-link" onclick="localStorage.setItem('${KEY_ACTIVE_POOL}','${p.id}'); location.hash='#/coin/${encodeURIComponent(p.id)}'">
      <td><div class="coin-cell">${iconImg(p)}<span>${coinName}</span></div></td>
      <td>${p.coin?.algorithm || '—'}</td>
      <td>${fmtNumber(miners)}</td>
      <td>${fmtHashrate(poolHash)}</td>
      <td>${fmtCompact(netDiff)}</td>
      <td>${priceUsd==null?'—':fmtMoneyUsd(priceUsd)}${chgHtml}</td>
      <td>${reward==null?'—':reward}</td>
    </tr>`;
  }).join('');

  document.getElementById('app').innerHTML=`
    <section class="surface">
      <div class="surface__head">
        <h1>Mining Pools</h1>
        <div class="hint">Clean table / cells</div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Pool</th><th>Algorithm</th><th>Miners</th><th>Hashrate</th>
            <th>Network Difficulty</th><th>Current Price</th><th>Reward</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="7">—</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  `;
}

function toggleExpander(el){
  const open = el.getAttribute('aria-expanded') !== 'false';
  el.setAttribute('aria-expanded', open ? 'false' : 'true');
}

function coinMenu(poolId, active, badges){
  const p=POOL_BY_ID.get(poolId);
  const blocks = badges?.blocks ?? (p?.poolStats?.totalBlocksFound ?? 0);
  const miners = badges?.miners ?? (p?.poolStats?.connectedMiners ?? p?.poolStats?.miners ?? 0);
  return `
  <div class="coin-menu">
    <a class="pill ${active==='home'?'pill--active':''}" href="#/coin/${encodeURIComponent(poolId)}"><span class="pill__icon">${svgIcon('home')}</span><span>Home</span></a>
    <a class="pill ${active==='blocks'?'pill--active':''}" href="#/blocks/${encodeURIComponent(poolId)}"><span class="pill__icon">${svgIcon('blocks')}</span><span>Blocks</span><span class="badge-count">${fmtNumber(blocks)}</span></a>
    <a class="pill ${active==='miners'?'pill--active':''}" href="#/miners/${encodeURIComponent(poolId)}"><span class="pill__icon">${svgIcon('miners')}</span><span>Miners</span><span class="badge-count">${fmtNumber(miners)}</span></a>
    <a class="pill ${active==='help'?'pill--active':''}" href="#/help/${encodeURIComponent(poolId)}"><span class="pill__icon">${svgIcon('help')}</span><span>Help</span></a>
    <a class="pill" href="#/"><span class="pill__icon">${svgIcon('pools')}</span><span>Pools</span></a>
  </div>`;
}

async function renderCoin(poolId){
  renderLoading("Coin");
  await loadPools();
  if(!POOL_BY_ID.has(poolId)){ renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  const ps=pool.poolStats||{};
  const ns=pool.networkStats||{};

  const miners=ps.connectedMiners ?? ps.miners ?? 0;
  const poolHash=ps.poolHashrate ?? ps.hashrate ?? 0;
  const netHash=ns.networkHashrate ?? ns.hashrate ?? 0;
  const netDiff=ns.networkDifficulty ?? ns.difficulty ?? 0;
  const height=ns.blockHeight ?? ns.height ?? 0;
  const blocksFound = ps.totalBlocksFound ?? ps.totalBlocks ?? ps.blocksFound ?? 0;

  setHeaderBadges(blocksFound, miners);

  const sym=(pool.coin?.symbol||pool.id||'').toLowerCase();
  const prices=await loadPrices([META[sym]?.gecko||null]);
  const gId=META[sym]?.gecko||null;
  const g=gId?prices[gId]:null;
  const priceUsd=g?.usd ?? null;
  const chgUsd=g?.usd_24h_change ?? null;
  const clsUsd=(Number(chgUsd)||0)>=0?'up':'down';

  document.getElementById('app').innerHTML=`
    <section class="surface">
      ${coinMenu(poolId,'home',{blocks: blocksFound, miners: miners})}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name || poolId} (${pool.coin?.symbol || poolId})</h1>
        <div class="hint"></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card__title">Pool Statistics</div>
          <div class="card__body"><div class="kv">
            <div class="k">Miners</div><div class="v">${fmtNumber(miners)}</div>
            <div class="k">Hashrate</div><div class="v">${fmtHashrate(poolHash)}</div>
          </div></div>
        </div>

        <div class="card">
          <div class="card__title">Block Statistics</div>
          <div class="card__body"><div class="kv">
            <div class="k">Blocks found</div><div class="v">${fmtNumber(blocksFound)}</div>
            <div class="k">Last Block</div><div class="v">—</div>
          </div></div>
        </div>

        <div class="card">
          <div class="card__title">Network Statistics</div>
          <div class="card__body"><div class="kv">
            <div class="k">Network Difficulty</div><div class="v mono">${fmtCompact(netDiff)}</div>
            <div class="k">Network Hashrate</div><div class="v">${fmtHashrate(netHash)}</div>
            <div class="k">Current Height</div><div class="v">${fmtNumber(height)}</div>
          </div></div>
        </div>

        <div class="card">
          <div class="card__title">Current Price</div>
          <div class="card__body"><div class="kv">
            <div class="k">Price USD</div>
            <div class="v">${priceUsd==null?'—':(fmtMoneyUsd(priceUsd) + (chgUsd==null?'':` <span class="chg ${clsUsd}">${fmtPct(Number(chgUsd)||0)} ${clsUsd==='down'?'v':'^'}</span>`))}</div>
            <div class="k">Price BTC</div><div class="v mono">—</div>
          </div></div>
        </div>
      </div>

      <div class="expander" aria-expanded="true">
        <div class="expander__head" onclick="toggleExpander(this.parentElement)">
          <div class="title">Hashrate Chart</div>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="expander__body">
          <div class="legend">
            <span><span class="dot"></span> Pool Hashrate</span>
            <span><span class="dot dot--avg"></span> Network Difficulty</span>
          </div>
          <div class="chart" id="chartBox">
            <canvas id="chartCanvas"></canvas>
            <div class="chart-xlabel" id="chartXLabel"></div>
            <div class="chart-tooltip" id="chartTip"></div>
          </div>
        </div>
      </div>

      <div class="grid-4" style="padding-top:0">
        <div class="card"><div class="card__title">Algorithm</div><div class="card__body"><div class="v">${pool.coin?.algorithm || '—'}</div></div></div>
        <div class="card"><div class="card__title">Reward Scheme</div><div class="card__body"><div class="v">SOLO</div></div></div>
        <div class="card"><div class="card__title">Block Reward</div><div class="card__body"><div class="v">${pool.coin?.blockReward ?? '—'}</div></div></div>
        <div class="card"><div class="card__title">Pool Fee</div><div class="card__body"><div class="v">${pool.paymentProcessing?.minimumPayment ? '—' : '0.05%'}</div></div></div>
      </div>
    </section>
  `;

  // если нет истории — рисуем красивый “живой” график от текущих значений
  const a=makeSeries(asNumberOrNull(poolHash)||1, 96);
  const b=makeSeries((asNumberOrNull(netDiff)||1)/1e9, 96);
  renderChart(a,b,'Pool Hashrate','Network Difficulty');
}

/* ---------- blocks ---------- */
function pickBlocksArray(data){
  if(!data) return [];
  if(Array.isArray(data.blocks)) return data.blocks;
  if(Array.isArray(data.results)) return data.results;
  if(Array.isArray(data.items)) return data.items;
  if(Array.isArray(data)) return data;
  return [];
}
async function renderBlocks(poolIdMaybe){
  renderLoading("Blocks");
  await loadPools();
  const active = ensureActivePool();
  const poolId = poolIdMaybe || active;
  if(!POOL_BY_ID.has(poolId)){ renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  setHeaderBadges(pool.poolStats?.totalBlocksFound ?? 0, pool.poolStats?.connectedMiners ?? 0);

  const data = await tryJson([
    `${API}/pool/${encodeURIComponent(poolId)}/blocks?page=0&pageSize=50`,
    `${API}/pool/${encodeURIComponent(poolId)}/blocks?page=0`,
    `${API}/pool/${encodeURIComponent(poolId)}/blocks`,
    `${API}/pools/${encodeURIComponent(poolId)}/blocks?page=0&pageSize=50`,
    `${API}/pools/${encodeURIComponent(poolId)}/blocks`,
  ]);

  const blocks = pickBlocksArray(data).slice(0,50);

  const rows = blocks.length ? blocks.map(b=>{
    const height = b.blockHeight ?? b.height ?? '—';
    const status = b.status ?? b.state ?? '—';
    const time = b.created ?? b.createdAt ?? b.createdTime ?? b.time ?? '—';
    const miner = b.miner ?? b.minerAddress ?? b.worker ?? '—';
    const effort = b.effort ?? b.effortPercent ?? '—';
    const sol = b.solution ?? b.blockRewardShares ?? b.shareDifficulty ?? '—';
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

  document.getElementById('app').innerHTML=`
    <section class="surface">
      ${coinSwitcher('blocks', poolId)}
      ${coinMenu(poolId,'blocks',{})}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Blocks</h1>
        <div class="hint">Latest 50</div>
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

/* ---------- miners list ---------- */
function pickMinersArray(data){
  if(!data) return [];
  if(Array.isArray(data.miners)) return data.miners;
  if(Array.isArray(data.results)) return data.results;
  if(Array.isArray(data.items)) return data.items;
  if(Array.isArray(data)) return data;
  return [];
}
async function fetchMiners(poolId){
  const p=encodeURIComponent(poolId);
  return await tryJson([
    `${API}/pool/${p}/miners?page=0&pageSize=200`,
    `${API}/pool/${p}/miners?page=0`,
    `${API}/pool/${p}/miners`,
    `${API}/pools/${p}/miners?page=0&pageSize=200`,
    `${API}/pools/${p}/miners`,
  ]);
}
async function renderMiners(poolIdMaybe){
  renderLoading("Miners");
  await loadPools();
  const active = ensureActivePool();
  const poolId = poolIdMaybe || active;
  if(!POOL_BY_ID.has(poolId)){ renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  const data = await fetchMiners(poolId);
  const listRaw = pickMinersArray(data);

  const list=[];
  const seen=new Set();
  for(const m of listRaw){
    const addr = m.miner ?? m.address ?? m.login;
    if(!addr) continue;
    if(seen.has(addr)) continue;
    seen.add(addr);
    list.push(m);
  }

  const online = pool.poolStats?.connectedMiners ?? pool.poolStats?.miners ?? list.length;
  setHeaderBadges(pool.poolStats?.totalBlocksFound ?? 0, online);

  const rows = list.length ? list.map(m=>{
    const addr = m.miner ?? m.address ?? m.login ?? '—';
    const hr = m.hashrate ?? m.hashrate30m ?? m.hashrate1h ?? 0;
    const last = m.lastShare ?? m.lastShareTime ?? '—';
    return `<tr class="row-link" onclick="location.hash='#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(addr)}/dashboard'">
      <td class="mono">${addr}</td>
      <td>${fmtHashrate(hr)}</td>
      <td>${last}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="3">—</td></tr>`;

  document.getElementById('app').innerHTML=`
    <section class="surface">
      ${coinSwitcher('miners', poolId)}
      ${coinMenu(poolId,'miners',{})}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Miners</h1>
        <div class="hint">Online: <b>${fmtNumber(online)}</b> • Total: <b>${fmtNumber(list.length)}</b></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Miner</th><th>Hashrate</th><th>Last Share</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

/* ---------- help ---------- */
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
  const active = ensureActivePool();
  const poolId = poolIdMaybe || active;
  if(!POOL_BY_ID.has(poolId)){ renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  setHeaderBadges(pool.poolStats?.totalBlocksFound ?? 0, pool.poolStats?.connectedMiners ?? 0);

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

  // pool wallet (если нет — просто показываем —)
  const poolWallet = pool.address ?? '—';
  const walletLink = poolWallet==='—' ? '#' : explorerAddr(poolId, poolWallet);

  document.getElementById('app').innerHTML=`
    <section class="surface">
      ${coinSwitcher('help', poolId)}
      ${coinMenu(poolId,'help',{})}
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

/* ---------- miner dashboard / rewards / payouts ---------- */
async function fetchMiner(poolId, addr){
  const p=encodeURIComponent(poolId), a=encodeURIComponent(addr);
  return await tryJson([
    `${API}/pool/${p}/miner/${a}`,
    `${API}/pool/${p}/miners/${a}`,
    `${API}/pool/${p}/miner?address=${a}`,
    `${API}/pools/${p}/miner/${a}`,
    `${API}/pools/${p}/miners/${a}`,
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
async function fetchPayouts(poolId, addr){
  const p=encodeURIComponent(poolId), a=encodeURIComponent(addr);
  return await tryJson([
    `${API}/pool/${p}/payments?page=0&pageSize=50&address=${a}`,
    `${API}/pool/${p}/payments?page=0&pageSize=50&miner=${a}`,
    `${API}/pool/${p}/miner/${a}/payments?page=0&pageSize=50`,
    `${API}/pool/${p}/miner/${a}/payouts?page=0&pageSize=50`,
    `${API}/pool/${p}/payments?address=${a}`,
    `${API}/pools/${p}/payments?address=${a}`,
  ]);
}
async function fetchRewards(poolId, addr){
  const p=encodeURIComponent(poolId), a=encodeURIComponent(addr);
  return await tryJson([
    `${API}/pool/${p}/miner/${a}/rewards`,
    `${API}/pool/${p}/miner/${a}/rewards/summary`,
    `${API}/pool/${p}/rewards?address=${a}`,
    `${API}/pools/${p}/rewards?address=${a}`,
  ]);
}

function tabsMiner(poolId, addr, activeTab){
  const base = `#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(addr)}`;
  return `
    <div class="tabs" role="tablist">
      <div class="tab ${activeTab==='dashboard'?'is-active':''}" onclick="location.hash='${base}/dashboard'">DASHBOARD</div>
      <div class="tab ${activeTab==='rewards'?'is-active':''}" onclick="location.hash='${base}/rewards'">REWARDS</div>
      <div class="tab ${activeTab==='payouts'?'is-active':''}" onclick="location.hash='${base}/payouts'">PAYOUTS</div>
    </div>`;
}

async function renderMiner(poolId, addr, tab='dashboard'){
  renderLoading("Miner");
  await loadPools();
  if(!POOL_BY_ID.has(poolId)){ renderPools(); return; }
  setActivePool(poolId);

  const pool=POOL_BY_ID.get(poolId);
  const minerData = await fetchMiner(poolId, addr);
  const minersListData = await fetchMiners(poolId);
  const minersList = pickMinersArray(minersListData);

  const row = minersList.find(x => (x.miner||x.address||x.login) === addr) || null;

  const hr30 = (minerData?.hashrate30m ?? minerData?.hashrate ?? row?.hashrate30m ?? row?.hashrate ?? 0);
  const hr1h = (minerData?.hashrate1h ?? row?.hashrate1h ?? hr30);

  const extAddr = explorerAddr(poolId, addr);

  // workers
  const workers = Array.isArray(minerData?.workers) ? minerData.workers : [];
  const workerRows = (workers.length ? workers : [{
    worker: "—",
    hashrate30m: hr30,
    hashrate1h: hr1h,
    validShares: "—",
    invalidShares: "—",
    staleShares: "—",
    bestShare: "—",
    port: row?.port ?? "—",
    lastShare: row?.lastShare ?? row?.lastShareTime ?? "—"
  }]).map(w=>`
    <tr>
      <td>${w.worker ?? w.name ?? '—'}</td>
      <td>${fmtHashrate(w.hashrate30m ?? w.hashrate ?? 0)}</td>
      <td>${fmtHashrate(w.hashrate1h ?? w.hashrate3h ?? 0)}</td>
      <td>${w.validShares ?? w.valids ?? '—'}</td>
      <td>${w.invalidShares ?? w.invalids ?? '—'}</td>
      <td>${w.staleShares ?? w.stales ?? '—'}</td>
      <td>${w.bestShare ?? '—'}</td>
      <td>${w.port ?? '—'}</td>
      <td>${w.lastShare ?? w.lastShareTime ?? '—'}</td>
    </tr>
  `).join('');

  // payouts/rewards data
  const payoutsData = (tab==='payouts') ? await fetchPayouts(poolId, addr) : null;
  const rewardsData = (tab==='rewards') ? await fetchRewards(poolId, addr) : null;

  let tabHtml = '';
  if(tab==='dashboard'){
    tabHtml = `
      <div class="grid-2" style="padding-top:0">
        <div class="card"><div class="card__title">Workers</div><div class="card__body"><div class="kv">
          <div class="k">Online</div><div class="v">—</div>
          <div class="k">Offline</div><div class="v">—</div>
        </div></div></div>

        <div class="card"><div class="card__title">Hashrate</div><div class="card__body"><div class="kv">
          <div class="k">Current Hashrate (30m)</div><div class="v">${fmtHashrate(hr30)}</div>
          <div class="k">Average Hashrate (1h)</div><div class="v">${fmtHashrate(hr1h)}</div>
        </div></div></div>

        <div class="card"><div class="card__title">Work</div><div class="card__body"><div class="kv">
          <div class="k">Share Sum</div><div class="v mono">—</div>
          <div class="k">Personal Effort</div><div class="v">—</div>
          <div class="k">Blocks</div><div class="v">—</div>
        </div></div></div>

        <div class="card"><div class="card__title">Reward</div><div class="card__body"><div class="kv">
          <div class="k">Unconfirmed</div><div class="v mono">${minerData?.unconfirmedBalance ?? '—'}</div>
          <div class="k">Balance</div><div class="v mono">${minerData?.balance ?? '—'}</div>
          <div class="k">Pending</div><div class="v mono">${minerData?.pending ?? '—'}</div>
        </div></div></div>
      </div>

      <div class="expander" aria-expanded="true">
        <div class="expander__head" onclick="toggleExpander(this.parentElement)">
          <div class="title">Hashrate Chart</div>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="expander__body">
          <div class="legend">
            <span><span class="dot"></span> Current Hashrate (30m)</span>
            <span><span class="dot dot--avg"></span> Average Hashrate (1h)</span>
          </div>
          <div class="chart" id="chartBox">
            <canvas id="chartCanvas"></canvas>
            <div class="chart-xlabel" id="chartXLabel"></div>
            <div class="chart-tooltip" id="chartTip"></div>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Worker</th><th>Hashrate (30m)</th><th>Hashrate (1h)</th>
              <th>Valids</th><th>Invalid</th><th>Stale</th><th>Best Share</th><th>Port</th><th>Last Share</th>
            </tr>
          </thead>
          <tbody>${workerRows}</tbody>
        </table>
      </div>
    `;
  }

  if(tab==='payouts'){
    const arr = pickPaymentsArray(payoutsData);
    const rows = arr.length ? arr.map(x=>{
      const time = x.created ?? x.createdAt ?? x.time ?? x.timestamp ?? '—';
      const amount = x.amount ?? x.value ?? x.total ?? '—';
      const tx = x.txid ?? x.txHash ?? x.transactionHash ?? x.tx ?? '—';
      const txLink = tx==='—' ? '#' : explorerTx(poolId, tx);
      return `<tr>
        <td class="mono">${time}</td>
        <td>${amount}</td>
        <td class="mono">${tx==='—'?'—':`<a href="${txLink}" target="_blank" rel="noopener">${tx}</a>`}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="3">—</td></tr>`;

    tabHtml = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Time</th><th>Amount</th><th>TX</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="padding:0 14px 14px;color:var(--muted);font-size:12px">
        Если таблица пустая — проверь, что в Miningcore включён paymentProcessing и эндпоинты payments доступны.
      </div>
    `;
  }

  if(tab==='rewards'){
    const data = rewardsData || null;
    let summaryRows = '';
    if(data && typeof data==='object'){
      // пытаемся вытащить интервалами, если API такое отдаёт
      const intervals = data.intervals ?? data.summary ?? data;
      if(Array.isArray(intervals)){
        summaryRows = intervals.map(it=>`
          <tr>
            <td>${it.interval ?? it.name ?? '—'}</td>
            <td>${fmtNumber(it.blocks ?? it.blockCount ?? '—')}</td>
            <td>${it.effort ?? it.personalEffort ?? '—'}</td>
            <td>${it.amount ?? it.reward ?? '—'}</td>
            <td>${it.usd ? fmtMoneyUsd(it.usd) : '—'}</td>
          </tr>`).join('');
      }
    }
    if(!summaryRows) summaryRows = `<tr><td colspan="5">—</td></tr>`;

    tabHtml = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Interval</th><th>Blocks</th><th>Personal Effort</th><th>Reward</th><th>USD</th></tr></thead>
          <tbody>${summaryRows}</tbody>
        </table>
      </div>
      <div style="padding:0 14px 14px;color:var(--muted);font-size:12px">
        Если пусто — нужна точная схема reward-endpoint из твоего Miningcore. Я уже добавил авто-поиск по нескольким URL.
      </div>
    `;
  }

  document.getElementById('app').innerHTML=`
    <section class="surface">
      ${coinMenu(poolId,'miners',{})}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Miner</h1>
        <div class="hint"></div>
      </div>

      <div style="padding:10px 14px; display:flex; align-items:center; justify-content:center; gap:10px;">
        <div class="mono" style="font-weight:900;overflow:hidden;text-overflow:ellipsis;max-width:80%;">${addr}</div>
        <a class="copy-btn" href="${extAddr}" target="_blank" rel="noopener" title="Open in explorer">${svgIcon('ext')}</a>
      </div>

      ${tabsMiner(poolId, addr, tab)}
      ${tabHtml}
    </section>
  `;

  // график только на dashboard
  if(tab==='dashboard'){
    const a = makeSeries(asNumberOrNull(hr30)||1, 96);
    const b = makeSeries(asNumberOrNull(hr1h)||1, 96);
    renderChart(a,b,'Current Hashrate (30m)','Average Hashrate (1h)');
  }
}

/* ---------- router ---------- */
async function router(){
  const hash=(location.hash||'#/').replace(/^#\/?/,'');
  const parts=hash.split('/').filter(Boolean);

  if(parts.length===0){ await renderPools(); return; }

  const [page,a,b,c]=parts;

  if(page==='coin' && a){ await renderCoin(a); return; }

  // ВАЖНО: теперь #/blocks работает (берёт active pool), и #/blocks/<poolId> тоже
  if(page==='blocks'){ await renderBlocks(a||null); return; }

  // Теперь #/miners работает (active pool) и #/miners/<poolId>
  if(page==='miners'){ await renderMiners(a||null); return; }

  // Теперь #/help работает (active pool) и #/help/<poolId>
  if(page==='help'){ await renderHelp(a||null); return; }

  // miner pages
  if(page==='miner' && a && b){
    const tab = c || 'dashboard';
    await renderMiner(a, decodeURIComponent(b), tab);
    return;
  }

  await renderPools();
}

/* ---------- boot ---------- */
(function boot(){
  setTheme(localStorage.getItem('theme')||'dark');
  setLang(localStorage.getItem('lang')||'en');
  router();
  window.addEventListener('hashchange', router);
})();

/* PP_MINERS_GATE_20260302 */
(() => {
  if (window.__PP_MINERS_GATE_20260302) return;
  window.__PP_MINERS_GATE_20260302 = true;

  const API = "/api";
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function fetchJson(url){
    const r = await fetch(url, { cache: "no-store" });
    if(!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }

  function parseMinersRoute(){
    const h = location.hash || "#/";
    const m = h.match(/^#\/miners\/([^\/?#]+)/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  }

  function renderEmpty(poolId, poolObj){
    const app = document.getElementById("app");
    if (!app) return;

    // если уже показали пустую — не трогаем
    if (app.dataset.ppMinersGate === poolId) return;
    app.dataset.ppMinersGate = poolId;

    const menu = (typeof window.coinMenu === "function") ? window.coinMenu(poolId, "miners") : "";
    const icon = (typeof window.iconImg === "function") ? window.iconImg(poolObj) : "";
    const name =
      (poolObj && poolObj.coin && (poolObj.coin.name || poolObj.coin.type)) ? (poolObj.coin.name || poolObj.coin.type) : poolId;

    app.innerHTML =
      '<section class="surface">' +
        menu +
        '<div class="surface__head"><h1>' + icon + ' ' + name + ' — Miners</h1><div class="hint"></div></div>' +
        '<div class="table-wrap">' +
          '<table class="table">' +
            '<thead><tr><th>Miner</th><th>Hashrate</th><th>Last Share</th></tr></thead>' +
            '<tbody><tr><td colspan="3">—</td></tr></tbody>' +
          '</table>' +
        '</div>' +
      '</section>';
  }

  async function gateOnce(){
    const poolId = parseMinersRoute();
    if (!poolId) return;

    let pools;
    try { pools = await fetchJson(API + "/pools"); }
    catch(e){ return; }

    const poolObj = (pools && Array.isArray(pools.pools)) ? pools.pools.find(p => p.id === poolId) : null;
    const ps = (poolObj && poolObj.poolStats) ? poolObj.poolStats : {};
    const connected = (ps.connectedMiners ?? ps.miners ?? 0);

    if (!connected) renderEmpty(poolId, poolObj);
    else {
      // если майнеры появились — убираем флаг, чтобы штатная страница работала
      const app = document.getElementById("app");
      if (app && app.dataset.ppMinersGate) delete app.dataset.ppMinersGate;
    }
  }

  async function onRoute(){
    // несколько запусков, чтобы перебить рендер роутера (без перезагрузки страницы)
    gateOnce();
    await sleep(200);
    gateOnce();
    await sleep(800);
    gateOnce();
  }

  window.addEventListener("hashchange", onRoute);
  document.addEventListener("DOMContentLoaded", onRoute);
  setTimeout(onRoute, 300);
})();
