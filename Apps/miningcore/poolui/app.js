const API="/api";

/* ---------- UI helpers ---------- */
function $(q,root=document){return root.querySelector(q)}
function $$(q,root=document){return Array.from(root.querySelectorAll(q))}
function closeAllDD(){ $$('.dd').forEach(d=>d.classList.remove('is-open')) }
function toggleDD(id){ const el=document.getElementById(id); if(!el) return; const o=el.classList.contains('is-open'); closeAllDD(); if(!o) el.classList.add('is-open') }
document.addEventListener('click',e=>{
  if(!e.target.closest('.dd')) closeAllDD();
  const cb=e.target.closest('.copy-addr-btn'); if(cb&&cb.dataset.addr){ copyText(cb.dataset.addr); return; }
  const cs=e.target.closest('.copy-stratum-btn'); if(cs&&cs.dataset.copy){ copyText(cs.dataset.copy); }
})

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
function formatTimeAgo(v){
  if(v==null||v==='') return '—';
  const t = typeof v==='number' ? v : new Date(v).getTime();
  if(!isFinite(t)) return String(v);
  const sec = Math.floor((Date.now()-t)/1000);
  if(sec<60) return sec+' seconds ago';
  if(sec<3600) return Math.floor(sec/60)+' minutes ago';
  if(sec<86400) return Math.floor(sec/3600)+' hours ago';
  return Math.floor(sec/86400)+' days ago';
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
  const list = Array.isArray(data?.pools) ? data.pools : (Array.isArray(data) ? data : []);
  const withStats = await Promise.all(list.map(async (p)=>{
    const id = p.id || p.name;
    if (!id) return p;
    try {
      const st = await fetchJson(`${API}/pools/${encodeURIComponent(id)}/stats`);
      return { ...p, poolStats: st?.poolStats ?? p.poolStats ?? {}, networkStats: st?.networkStats ?? p.networkStats ?? {} };
    } catch (_) { return p; }
  }));
  POOLS = withStats;
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
  btc:{gecko:"bitcoin"}, bch:{gecko:"bitcoin-cash"}, bsv:{gecko:"bitcoin-sv"},
  bc2:{gecko:"bitcoin-ii"}, xec:{gecko:"ecash"}, fb:{gecko:"fractal-bitcoin"},
  dgb:{gecko:"digibyte"}, ltc:{gecko:"litecoin"}, doge:{gecko:"dogecoin"},
  rvn:{gecko:"ravencoin"}, vtc:{gecko:"vertcoin"}, ppc:{gecko:"peercoin"},
  xna:{gecko:"neurai"}, grs:{gecko:"groestlcoin"}, xmr:{gecko:"monero"},
  etc:{gecko:"ethereum-classic"}, erg:{gecko:"ergo"}, flux:{gecko:"zel"},
  zec:{gecko:"zcash"}, zen:{gecko:"horizen"}, firo:{gecko:"firo"},
  kas:{gecko:"kaspa"}, nexa:{gecko:"nexa"}, btcs:{gecko:"bitcoin-cash-sv"},
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
  renderLoading("SOLO Mining Pools");
  await loadPools();
  ensureActivePool();

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
    const netHash=ns.networkHashrate ?? ns.hashrate ?? 0;
    const netDiff=ns.networkDifficulty ?? ns.difficulty ?? 0;

    const sym=(p.coin?.symbol||p.id||'').toLowerCase();
    const gId=META[sym]?.gecko || null;
    const g=gId?prices[gId]:null;
    const priceUsd=g?.usd ?? null;
    const chg=g?.usd_24h_change ?? null;
    const cls=(Number(chg)||0)>=0?'up':'down';
    const chgHtml=(chg==null)?'':` <span class="chg ${cls}">${fmtPct(Number(chg)||0)} ${cls==='down'?'↓':'↑'}</span>`;

    const reward = p.coin?.blockReward ?? ns.blockReward ?? ps.blockReward ?? null;
    let rewardNum = asNumberOrNull(reward);
    if (rewardNum==null && reward!=null) {
      const m = String(reward).match(/[\d.]+(?:e[+-]?\d+)?/i);
      if (m) rewardNum = asNumberOrNull(m[0]);
    }
    const rewardUsd = (rewardNum!=null && priceUsd!=null) ? rewardNum * priceUsd : null;
    const rewardHtml = reward==null ? '—' : `<span>${reward}</span>${rewardUsd!=null ? `<span class="reward-usd">${fmtMoneyUsd(rewardUsd)}</span>` : ''}`;
    const coinName=`${p.coin?.name || p.id} (${p.coin?.symbol || p.id})`;

    return `
    <tr class="row-link" onclick="localStorage.setItem('${KEY_ACTIVE_POOL}','${p.id}'); location.hash='#/coin/${encodeURIComponent(p.id)}'">
      <td><div class="coin-cell">${iconImg(p)}<span>${coinName}</span></div></td>
      <td>${p.coin?.algorithm || '—'}</td>
      <td>${fmtNumber(miners)}</td>
      <td>${fmtHashrate(poolHash)}</td>
      <td>${fmtHashrate(netHash)}</td>
      <td>${fmtCompact(netDiff)}</td>
      <td>${priceUsd==null?'—':fmtMoneyUsd(priceUsd)}${chgHtml}</td>
      <td>${rewardHtml}</td>
    </tr>`;
  }).join('');

  document.getElementById('app').innerHTML=`
    <section class="surface surface--dashboard">
      <div class="surface__head">
        <h1>SOLO Mining Pools</h1>
        <div class="hint" id="dashboardHint">Обновлено по API • ${new Date().toLocaleTimeString()}</div>
      </div>
      <div class="table-wrap">
        <table class="table table--dashboard">
          <thead><tr>
            <th>Pool</th><th>Algorithm</th><th>Miners</th><th>Hashrate</th>
            <th>Network Hashrate</th><th>Network Difficulty</th><th>Current Price</th><th>Reward</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="8">—</td></tr>'}</tbody>
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
  const currentEffort = ps.blockEffort ?? ps.effort ?? ps.currentBlockEffort ?? null;
  const lastBlockTime = ps.lastBlockTime ?? ps.lastBlock ?? null;
  let lastBlockAgo = '—';
  if (lastBlockTime) {
    const t = typeof lastBlockTime==='number' ? lastBlockTime : new Date(lastBlockTime).getTime();
    if (isFinite(t)) {
      const min = Math.floor((Date.now()-t)/60000);
      if (min<60) lastBlockAgo = min+' min ago';
      else if (min<1440) lastBlockAgo = Math.floor(min/60)+' hours ago';
      else lastBlockAgo = Math.floor(min/1440)+' days ago';
    }
  }

  setHeaderBadges(blocksFound, miners);

  const sym=(pool.coin?.symbol||pool.id||'').toLowerCase();
  const prices=await loadPrices([META[sym]?.gecko||null]);
  const gId=META[sym]?.gecko||null;
  const g=gId?prices[gId]:null;
  const priceUsd=g?.usd ?? null;
  const chgUsd=g?.usd_24h_change ?? null;
  const clsUsd=(Number(chgUsd)||0)>=0?'up':'down';
  const rewardRaw = pool.coin?.blockReward ?? ns.blockReward ?? null;
  let rewardNum = asNumberOrNull(rewardRaw);
  if (rewardNum==null && rewardRaw!=null) { const m=String(rewardRaw).match(/[\d.]+(?:e[+-]?\d+)?/i); if (m) rewardNum=asNumberOrNull(m[0]); }
  const blockRewardUsd = (rewardNum!=null && priceUsd!=null) ? fmtMoneyUsd(rewardNum*priceUsd) : null;
  const blockRewardStr = rewardRaw==null ? '—' : (blockRewardUsd ? `${rewardRaw} (${blockRewardUsd})` : rewardRaw);
  const poolFee = (pool.paymentProcessing?.minimumPayment != null) ? '—' : '1.5%';

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
          <div class="card__title">Статистика блоков</div>
            <div class="card__body"><div class="kv">
            <div class="k">Current Effort</div><div class="v ${currentEffort!=null?'effort-blue':''}">${currentEffort!=null ? (Number(currentEffort).toFixed(0)+'%') : '—'}</div>
            <div class="k">Last Block</div><div class="v">${lastBlockAgo}</div>
            <div class="k">Blocks found</div><div class="v">${fmtNumber(blocksFound)}</div>
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
            <div class="k">Price</div>
            <div class="v">${priceUsd==null?'—':(fmtMoneyUsd(priceUsd) + (chgUsd==null?'':` <span class="chg ${clsUsd}">${fmtPct(Number(chgUsd)||0)} ${clsUsd==='down'?'↓':'↑'}</span>`))}</div>
            </div></div>
          </div>
        </div>

      <div class="wallet-placeholder">
        <a href="#/help/${encodeURIComponent(poolId)}" class="wallet-placeholder__link">
          <svg class="wallet-placeholder__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <span>Your Wallet</span>
        </a>
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
        <div class="card"><div class="card__title">Block Reward</div><div class="card__body"><div class="v">${blockRewardStr}</div></div></div>
        <div class="card"><div class="card__title">Pool Fee</div><div class="card__body"><div class="v">${poolFee}</div></div></div>
      </div>
    </section>
  `;

  // если нет истории — рисуем красивый “живой” график от текущих значений
  const a=makeSeries(asNumberOrNull(poolHash)||1, 96);
  const b=makeSeries((asNumberOrNull(netDiff)||1)/1e9, 96);
  renderChart(a,b,'Pool Hashrate','Network Difficulty');
}

/* ---------- block confirmations (maturation) ---------- */
const CONFIRM_BY_COIN = {
  btc:101, bch:10, bsv:101, bc2:101, dgb:101, doge:40, xec:10, xna:101, ppc:500,
  rvn:101, vtc:101, ltc:101, grs:101, fb:101, xmr:60, erg:720, etc:12, ethw:64,
  zeph:10, space:101, xel:10, octa:12, zec:10, zen:500, flux:100, firo:60,
  kas:24, nexa:12, btcs:101
};
function getBlockConfirmations(pool){
  const n = pool?.paymentProcessing?.confirmationDepth ?? pool?.network?.blockConfirmations
    ?? pool?.blockConfirmations ?? pool?.coin?.blockConfirmations;
  if (n != null && Number(n) > 0) return Number(n);
  const id = (pool?.id || pool?.coin?.symbol || '').toLowerCase();
  return CONFIRM_BY_COIN[id] ?? 101;
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

  function formatBlockTime(v){
    if(v==null||v==='') return '—';
    const d = typeof v==='number' ? new Date(v) : new Date(v);
    if(isNaN(d.getTime())) return String(v);
    const dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'), yyyy=d.getFullYear();
    const hh=String(d.getHours()).padStart(2,'0'), min=String(d.getMinutes()).padStart(2,'0');
    return `${dd}.${mm}.${yyyy}, ${hh}:${min}`;
  }
  function fmtSolution(v){
    if(v==null||v==='') return '—';
    const x=asNumberOrNull(v); if(x==null) return String(v);
    if(x>=1e12) return (x/1e12).toFixed(3)+' T';
    if(x>=1e9) return (x/1e9).toFixed(3)+' G';
    return fmtCompact(v);
  }

  const heights = blocks.map(b=>Number(b.blockHeight??b.height)).filter(n=>n>0);
  const efforts = blocks.map(b=>asNumberOrNull(b.effort??b.effortPercent)).filter(n=>n!=null);
  function avgEffort(n){ const s=efforts.slice(0,n); return s.length>=n ? (s.reduce((a,x)=>a+x,0)/s.length).toFixed(0)+'%' : '—'; }
  function orphanPct(n){ return '0%'; }
  const statsRows = [
    [64, avgEffort(64), orphanPct(64)],
    [128, avgEffort(128), orphanPct(128)],
    [256, avgEffort(256), orphanPct(256)],
    [1024, avgEffort(1024), orphanPct(1024)],
  ].map(([blks,eff,orph])=>`<tr><td>${blks}</td><td class="v--effort">${eff}</td><td>${orph}</td></tr>`).join('');

  const blockExplorer = (h)=>{
    const id=(poolId||'').toLowerCase();
    if(id==='bch') return `https://blockchair.com/bitcoin-cash/block/${h}`;
    if(id==='xec') return `https://explorer.e.cash/block/${h}`;
    return `https://www.blockchain.com/explorer/blocks/btc/${h}`;
  };

  const rows = blocks.length ? blocks.map(b=>{
    const height = b.blockHeight ?? b.height ?? '—';
    const type = b.type ?? 'Block';
    const time = formatBlockTime(b.created ?? b.createdAt ?? b.createdTime ?? b.time);
    const server = b.region ?? b.server ?? b.poolHost ?? '—';
    const miner = b.miner ?? b.minerAddress ?? b.worker ?? '—';
    const effort = b.effort ?? b.effortPercent ?? '—';
    const effortNum = asNumberOrNull(effort);
    const effortCls = (effortNum!=null && effortNum>0) ? ' v--effort' : '';
    const sol = fmtSolution(b.solution ?? b.blockRewardShares ?? b.shareDifficulty);
    const status = b.status ?? b.state ?? 'Confirmed';
    const percent = b.percent ?? '100%';
    const reward = b.reward ?? b.blockReward ?? '—';
    const heightLink = height!=='—' && Number(height) ? `<a href="${blockExplorer(height)}" target="_blank" rel="noopener">${fmtNumber(height)}</a>` : fmtNumber(height);
    const minerLink = miner!=='—' ? `<a href="#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(miner)}/dashboard">${miner}</a>` : '—';
    return `<tr>
      <td class="mono">${heightLink}</td>
      <td>${type}</td>
      <td class="mono">${time}</td>
      <td>${server}</td>
      <td class="mono">${minerLink}</td>
      <td class="${effortCls}">${effort}</td>
      <td>${sol}</td>
      <td>${status}</td>
      <td>${percent}</td>
      <td>${reward}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="9">—</td></tr>`;

  document.getElementById('app').innerHTML=`
    <section class="surface">
      ${coinSwitcher('blocks', poolId)}
      ${coinMenu(poolId,'blocks',{})}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Статистика блоков</h1>
        <div class="hint"></div>
      </div>

      <div class="blocks-summary-wrap">
        <table class="table blocks-summary-table">
          <thead><tr><th>Blocks</th><th>Effort</th><th>Orphan</th></tr></thead>
          <tbody>${statsRows}</tbody>
        </table>
        <p class="blocks-maturation">Для подтверждения блока требуется ${getBlockConfirmations(pool)} новых блоков в сети.</p>
      </div>

      <div class="expander" aria-expanded="false">
        <div class="expander__head" onclick="toggleExpander(this.parentElement)">
          <div class="title">Список блоков (Latest 50)</div>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="expander__body">
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
                <th>Height</th><th>Type</th><th>Time</th><th>Server</th><th>Miner</th><th>Effort</th><th>Solution</th><th>Status</th><th>Reward</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
          </div>
        </div>
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
async function fetchMiners(poolId, page=0, pageSize=200){
  const p=encodeURIComponent(poolId);
  return await tryJson([
    `${API}/pool/${p}/miners?page=${page}&pageSize=${pageSize}`,
    `${API}/pool/${p}/miners?page=0&pageSize=200`,
    `${API}/pool/${p}/miners?page=0`,
    `${API}/pool/${p}/miners`,
    `${API}/pools/${p}/miners?page=0&pageSize=200`,
    `${API}/pools/${p}/miners`,
  ]);
}
async function renderMiners(poolIdMaybe, pageNum){
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

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const page = Math.max(1, Math.min(totalPages, parseInt(pageNum, 10) || 1));
  const start = (page - 1) * pageSize;
  const pageList = list.slice(start, start + pageSize);

  const rows = pageList.length ? pageList.map(m=>{
    const addr = m.miner ?? m.address ?? m.login ?? '—';
    const hr = m.hashrate ?? m.hashrate30m ?? m.hashrate1h ?? 0;
    const lastStr = m.lastShare ?? m.lastShareTime ?? '—';
    const lastAgo = (lastStr && lastStr !== '—') ? formatTimeAgo(lastStr) : lastStr;
    return `<tr class="row-link" onclick="location.hash='#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(addr)}/dashboard'">
      <td class="mono miner-cell"><span class="miner-dot"></span>${addr}</td>
      <td>${fmtHashrate(hr)}</td>
      <td>${lastAgo}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="3">—</td></tr>`;

  function paginationHtml(){
    if(totalPages<=1) return '';
    const nums = [];
    const show = 5;
    let from = Math.max(1, page - 2);
    let to = Math.min(totalPages, from + show - 1);
    if(to - from < show - 1) from = Math.max(1, to - show + 1);
    for(let i=from; i<=to; i++) nums.push(i);
    let html = nums.map(n=>`<a class="pagination-num ${n===page?'is-active':''}" href="#/miners/${encodeURIComponent(poolId)}/${n}">${n}</a>`).join('');
    if(from>1) html = `<a class="pagination-num" href="#/miners/${encodeURIComponent(poolId)}/1">1</a>` + (from>2 ? ' <span class="pagination-ellipsis">...</span> ' : ' ') + html;
    if(to<totalPages) html += (to<totalPages-1 ? ' <span class="pagination-ellipsis">...</span> ' : ' ') + `<a class="pagination-num" href="#/miners/${encodeURIComponent(poolId)}/${totalPages}">${totalPages}</a>`;
    return `<div class="pagination">${html}</div>`;
  }

  document.getElementById('app').innerHTML=`
    <section class="surface">
      ${coinSwitcher('miners', poolId)}
      ${coinMenu(poolId,'miners',{})}
      <div class="surface__head">
        <h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Miners Online</h1>
        <div class="hint">Online: <b>${fmtNumber(online)}</b> • Total: <b>${fmtNumber(list.length)}</b></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Miner</th><th>Hashrate</th><th>Last Share</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${paginationHtml()}
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
    const safeUrl = url.replace(/"/g,'&quot;');
    return `<tr>
      <td>${p.tls?'TLS':'TCP'}</td>
      <td>${p.diff==null?'VarDiff':fmtNumber(p.diff)}</td>
      <td class="mono">${url}</td>
      <td>${p.name || '—'}</td>
      <td><span class="copy-btn copy-stratum-btn" data-copy="${safeUrl}" title="Copy">${svgIcon('copy')}</span></td>
    </tr>`;
  }).join('') : `<tr><td colspan="5">—</td></tr>`;

  const poolWallet = pool.address ?? '—';
  const walletLink = poolWallet==='—' ? '#' : explorerAddr(poolId, poolWallet);
  const safeWallet = (poolWallet==='—'?'':poolWallet).replace(/"/g,'&quot;');

  document.getElementById('app').innerHTML=`
    <section class="surface">
      ${coinSwitcher('help', poolId)}
      ${coinMenu(poolId,'help',{})}
      <div class="surface__head"><h1>${iconImg(pool)} ${pool.coin?.name||poolId} — Help</h1><div class="hint"></div></div>

      <div class="grid-2">
        <div class="card" style="grid-column:1/-1">
          <div class="card__title">CONNECTION TCP</div>
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
          <div class="card__title">POOL WALLET</div>
          <div class="card__body">
            <div class="copy-row wallet-row">
              <span class="mono">${poolWallet}</span>
              ${poolWallet==='—'?'':`<span class="copy-btn copy-stratum-btn" data-copy="${safeWallet}" title="Copy">${svgIcon('copy')}</span>`}
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
async function fetchMinerBlocks(poolId, addr){
  const p=encodeURIComponent(poolId), a=encodeURIComponent(addr);
  const data = await tryJson([
    `${API}/pool/${p}/blocks?page=0&pageSize=100&address=${a}`,
    `${API}/pool/${p}/blocks?page=0&pageSize=100&miner=${a}`,
    `${API}/pool/${p}/miner/${a}/blocks`,
    `${API}/pool/${p}/blocks?page=0&pageSize=100`,
    `${API}/pools/${p}/blocks?page=0&pageSize=100`,
  ]);
  const list = pickBlocksArray(data);
  if (!addr) return list;
  return list.filter(b=>(b.miner||b.minerAddress||b.worker||'').toLowerCase()===(addr||'').toLowerCase());
}

function tabsMiner(poolId, addr, activeTab){
  const base = `#/miner/${encodeURIComponent(poolId)}/${encodeURIComponent(addr)}`;
  return `
    <div class="tabs tabs--miner" role="tablist">
      <div class="tab ${activeTab==='dashboard'?'is-active':''}" onclick="location.hash='${base}/dashboard'"><span class="tab__ico">${svgIcon('blocks')}</span> DASHBOARD</div>
      <div class="tab ${activeTab==='rewards'?'is-active':''}" onclick="location.hash='${base}/rewards'"><span class="tab__ico">🎁</span> REWARDS</div>
      <div class="tab ${activeTab==='payouts'?'is-active':''}" onclick="location.hash='${base}/payouts'"><span class="tab__ico">💰</span> PAYOUTS</div>
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
  const ns = pool.networkStats || {};
  const netDiff = ns.networkDifficulty ?? ns.difficulty ?? 0;

  // workers
  const workers = Array.isArray(minerData?.workers) ? minerData.workers : [];
  const now = Date.now();
  const ONLINE_MS = 10*60*1000;
  let onlineCount = 0, offlineCount = 0;
  if (workers.length) {
    workers.forEach(w=>{
      const ls = w.lastShare ?? w.lastShareTime;
      const t = ls ? (typeof ls==='number' ? ls : new Date(ls).getTime()) : 0;
      if (t && now - t < ONLINE_MS) onlineCount++; else offlineCount++;
    });
  } else {
    onlineCount = (row && (hr30>0 || hr1h>0)) ? 1 : 0;
    offlineCount = onlineCount ? 0 : 1;
  }
  function fmtInvalidStale(val, total){
    if (val==null && total==null) return '—';
    const v = Number(val)||0, t = Number(total)||0;
    if (t===0) return v+' (0%)';
    return v+' ('+((v/t)*100).toFixed(0)+'%)';
  }
  const workerRows = (workers.length ? workers : [{
    worker: "—",
    hashrate30m: hr30,
    hashrate1h: hr1h,
    validShares: row?.validShares ?? row?.valids ?? "—",
    invalidShares: row?.invalidShares ?? row?.invalids ?? 0,
    staleShares: row?.staleShares ?? row?.stales ?? 0,
    totalShares: (Number(row?.validShares ?? row?.valids)||0) + (Number(row?.invalidShares ?? row?.invalids)||0) + (Number(row?.staleShares ?? row?.stales)||0),
    bestShare: row?.bestShare ?? minerData?.bestShare ?? "—",
    port: row?.port ?? "—",
    lastShare: row?.lastShare ?? row?.lastShareTime ?? "—"
  }]).map(w=>{
    const valid = w.validShares ?? w.valids ?? '—';
    const inv = w.invalidShares ?? w.invalids ?? 0;
    const st = w.staleShares ?? w.stales ?? 0;
    const total = w.totalShares ?? (Number(valid)||0) + Number(inv) + Number(st);
    const best = w.bestShare ?? '—';
    const bestFmt = (best!='—' && asNumberOrNull(best)!=null) ? fmtCompact(best) : best;
    const lastShareStr = w.lastShare ?? w.lastShareTime ?? '—';
    const lastShareAgo = (lastShareStr && lastShareStr!='—') ? formatTimeAgo(lastShareStr) : lastShareStr;
    return `<tr>
      <td>${w.worker ?? w.name ?? '—'}</td>
      <td>${fmtHashrate(w.hashrate30m ?? w.hashrate ?? 0)}</td>
      <td>${fmtHashrate(w.hashrate1h ?? w.hashrate3h ?? 0)}</td>
      <td>${valid}${(typeof valid==='number'||(valid!='—'&&valid!==''&&Number(valid)>=0)) ? ' <span class="valids-help" title="Valid shares">?</span>' : ''}</td>
      <td>${fmtInvalidStale(inv, total)}</td>
      <td>${fmtInvalidStale(st, total)}</td>
      <td>${bestFmt}</td>
      <td>${w.port ?? '—'}</td>
      <td>${lastShareAgo}</td>
    </tr>`;
  }).join('');

  // payouts/rewards data
  const payoutsData = (tab==='payouts') ? await fetchPayouts(poolId, addr) : null;
  const rewardsData = (tab==='rewards') ? await fetchRewards(poolId, addr) : null;
  const minerBlocks = (tab==='rewards') ? await fetchMinerBlocks(poolId, addr) : [];

  const shareSum = minerData?.pendingShares ?? minerData?.shareSum ?? row?.pendingShares ?? row?.shareSum ?? null;
  const personalEffort = minerData?.personalEffort ?? minerData?.effort ?? row?.personalEffort ?? row?.effort ?? null;
  const blocksFoundMiner = minerData?.blocksFound ?? minerData?.blocks ?? row?.blocksFound ?? 0;
  const lastBestShare = minerData?.lastBestShare ?? row?.lastBestShare ?? null;
  const bestShareGlobal = minerData?.bestShare ?? row?.bestShare ?? null;
  const portDiff = minerData?.portDifficulty ?? row?.portDifficulty ?? pool.ports?.[0]?.difficulty ?? null;
  function fmtRewardVal(v){ if(v==null||v==='') return '—'; const n=asNumberOrNull(v); return n===0?'0.000000':(n!=null?String(n):v); }

  let tabHtml = '';
  if(tab==='dashboard'){
    tabHtml = `
      <div class="grid-2" style="padding-top:0">
        <div class="card"><div class="card__title">Workers</div><div class="card__body"><div class="kv">
          <div class="k">Online</div><div class="v v--online">${onlineCount}</div>
          <div class="k">Offline</div><div class="v v--offline">${offlineCount}</div>
        </div></div></div>

        <div class="card"><div class="card__title">Hashrate</div><div class="card__body"><div class="kv">
          <div class="k">Current Hashrate (30m)</div><div class="v">${fmtHashrate(hr30)}</div>
          <div class="k">Average Hashrate (1h)</div><div class="v">${fmtHashrate(hr1h)}</div>
        </div></div></div>

        <div class="card"><div class="card__title">Work</div><div class="card__body"><div class="kv">
          <div class="k">Share Sum</div><div class="v mono">${shareSum!=null ? fmtCompact(shareSum) : '—'}</div>
          <div class="k">Personal Effort</div><div class="v v--effort">${personalEffort!=null ? (Number(personalEffort).toFixed(3)+'%') : '—'}</div>
          <div class="k">Blocks</div><div class="v">${fmtNumber(blocksFoundMiner)}</div>
        </div></div></div>

        <div class="card"><div class="card__title">Reward</div><div class="card__body"><div class="kv">
          <div class="k">Unconfirmed</div><div class="v mono">${fmtRewardVal(minerData?.unconfirmedBalance)}</div>
          <div class="k">Balance</div><div class="v mono">${fmtRewardVal(minerData?.balance)}</div>
          <div class="k">Pending</div><div class="v mono">${fmtRewardVal(minerData?.pending)}</div>
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
        <div class="chart-summary">
          <span>Last Best Share: ${lastBestShare!=null ? formatTimeAgo(lastBestShare) : '—'}</span>
          <span>Best Share: ${bestShareGlobal!=null ? fmtCompact(bestShareGlobal) : '—'}</span>
          <span>Network Difficulty: ${fmtCompact(netDiff)}</span>
          <span>Port Difficulty: ${portDiff!=null ? fmtNumber(portDiff) : '—'}</span>
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
    const sym = (pool.coin?.symbol || poolId || '').toUpperCase();
    const arr = pickPaymentsArray(payoutsData);
    function formatPayoutTime(v){
      if (v==null || v==='') return '—';
      const d = typeof v==='number' ? new Date(v) : new Date(v);
      if (isNaN(d.getTime())) return String(v);
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2,'0');
      const min = String(d.getMinutes()).padStart(2,'0');
      return `${dd}.${mm}.${yyyy}, ${hh}:${min}`;
    }
    const rows = arr.length ? arr.map(x=>{
      const time = formatPayoutTime(x.created ?? x.createdAt ?? x.time ?? x.timestamp);
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
          <thead><tr><th>Time</th><th>Amount ${sym}</th><th>TX (Transaction Hash)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      <div style="padding:0 14px 14px;color:var(--muted);font-size:12px">
        Если таблица пустая — проверь, что в Miningcore включён paymentProcessing и эндпоинты payments доступны.
      </div>
    `;
  }

  if(tab==='rewards'){
    const sym = (pool.coin?.symbol || poolId || '').toUpperCase();
    const data = rewardsData || null;
    const intervalLabels = { '1h':'Hour', 'hour':'Hour', '12h':'12 Hours', '12 hours':'12 Hours', '24h':'24 Hours', '24 hours':'24 Hours', 'day':'24 Hours', '7d':'Week', 'week':'Week', '30d':'Month', 'month':'Month' };
    let intervals = [];
    if(data && typeof data==='object'){
      const arr = data.intervals ?? data.summary ?? (Array.isArray(data) ? data : []);
      if(Array.isArray(arr)) intervals = arr;
    }
    const summaryLeftRows = intervals.length ? intervals.map(it=>{
      const label = intervalLabels[(it.interval||it.name||'').toLowerCase()] || it.interval || it.name || '—';
      const blocks = fmtNumber(it.blocks ?? it.blockCount ?? 0);
      const effort = it.effort ?? it.personalEffort ?? 0;
      const effortPct = (effort!=null && effort!=='—') ? (Number(effort).toFixed(0)+'%') : '0%';
      const bch = it.amount ?? it.reward ?? '0.000000';
      const usd = it.usd != null ? fmtMoneyUsd(it.usd) : '$0.00';
      return `<tr><td>${label}</td><td>${blocks}</td><td class="v--effort">${effortPct}</td><td>${bch}</td><td>${usd}</td></tr>`;
    }).join('') : ['Hour','12 Hours','24 Hours','Week','Month'].map(l=>`<tr><td>${l}</td><td>0</td><td class="v--effort">0%</td><td>0.000000</td><td>$0.00</td></tr>`).join('');

    const summaryRightRows = intervals.length>=3
      ? intervals.slice(0,3).map(it=>`<tr><td>${fmtNumber(it.blocks ?? it.blockCount ?? 0)}</td><td class="v--effort">${(it.effort ?? it.personalEffort ?? 0)!=null ? (Number(it.effort ?? it.personalEffort).toFixed(0)+'%') : '0%'}</td></tr>`).join('')
      : '<tr><td>0</td><td class="v--effort">0%</td></tr><tr><td>0</td><td class="v--effort">0%</td></tr><tr><td>0</td><td class="v--effort">0%</td></tr>';

    function formatRewardTime(v){
      if(v==null||v==='') return '—';
      const d = typeof v==='number' ? new Date(v) : new Date(v);
      if(isNaN(d.getTime())) return String(v);
      const dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'), yyyy=d.getFullYear();
      const hh=String(d.getHours()).padStart(2,'0'), min=String(d.getMinutes()).padStart(2,'0');
      return `${dd}.${mm}.${yyyy}, ${hh}:${min}`;
    }
    const detailRows = minerBlocks.length ? minerBlocks.slice(0,50).map(b=>{
      const height = b.blockHeight ?? b.height ?? '—';
      const type = b.type ?? 'Block';
      const time = formatRewardTime(b.created ?? b.createdAt ?? b.createdTime ?? b.time ?? b.timestamp);
      const worker = b.worker ?? b.workerName ?? b.miner ?? '—';
      const effort = b.effort ?? b.effortPercent ?? b.personalEffort ?? '—';
      const effortStr = effort!='—' && asNumberOrNull(effort)!=null ? (Number(effort).toFixed(0)+'%') : effort;
      const solution = b.solution ?? b.shareDifficulty ?? b.blockRewardShares ?? '—';
      const solutionStr = (solution!='—' && solution!=null) ? (fmtCompact(solution)+'†') : solution;
      const status = b.status ?? b.state ?? 'Confirmed';
      const pct = b.percent ?? '100%';
      const reward = b.reward ?? b.blockReward ?? '—';
      return `<tr>
        <td>${fmtNumber(height)}</td>
        <td>${type}</td>
        <td class="mono">${time}</td>
        <td>${worker}</td>
        <td class="v--effort">${effortStr}</td>
        <td>${solutionStr}</td>
        <td>${status}</td>
        <td>${pct}</td>
        <td>${reward}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="9">—</td></tr>';

    tabHtml = `
      <div class="rewards-summary">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Interval</th><th>Blocks</th><th>Personal Effort</th><th>${sym}</th><th>USD</th></tr></thead>
            <tbody>${summaryLeftRows}</tbody>
          </table>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Blocks</th><th>Personal Effort</th></tr></thead>
            <tbody>${summaryRightRows}</tbody>
          </table>
        </div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Height</th><th>Type</th><th>Time</th><th>Worker</th><th>Personal Effort</th><th>Solution</th><th>Status</th><th>Percent</th><th>Reward</th>
          </tr></thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>
      <div style="padding:0 14px 14px;color:var(--muted);font-size:12px">
        Детализация по блокам майнера. Если пусто — API блоков по адресу может не поддерживаться.
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

      <div class="miner-addr-row">
        <div class="mono miner-addr-row__addr" title="${addr}">${addr}</div>
        <span class="copy-btn copy-addr-btn" data-addr="${addr.replace(/"/g,'&quot;')}" title="Copy address">${svgIcon('copy')}</span>
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

/* ---------- dashboard auto-refresh (real-time API) ---------- */
let _dashboardRefresh=null;
function startDashboardRefresh(){
  if(_dashboardRefresh) return;
  _dashboardRefresh=setInterval(()=>{
    const h=(location.hash||'#/').replace(/^#\/?/,'');
    if(h==='') renderPools();
  }, 45000);
}
function stopDashboardRefresh(){ if(_dashboardRefresh){ clearInterval(_dashboardRefresh); _dashboardRefresh=null; } }

/* ---------- router ---------- */
async function router(){
  const hash=(location.hash||'#/').replace(/^#\/?/,'');
  const parts=hash.split('/').filter(Boolean);

  if(parts.length!==0) stopDashboardRefresh();
  if(parts.length===0){ await renderPools(); startDashboardRefresh(); return; }

  const [page,a,b,c]=parts;

  if(page==='coin' && a){ await renderCoin(a); return; }

  // ВАЖНО: теперь #/blocks работает (берёт active pool), и #/blocks/<poolId> тоже
  if(page==='blocks'){ await renderBlocks(a||null); return; }

  // Теперь #/miners работает (active pool) и #/miners/<poolId>
  if(page==='miners'){ const pg = b ? parseInt(b,10) : 1; await renderMiners(a||null, isFinite(pg)?pg:1); return; }

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
