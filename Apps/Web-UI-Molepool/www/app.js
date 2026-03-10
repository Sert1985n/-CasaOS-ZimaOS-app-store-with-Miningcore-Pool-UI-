const API="/api";
function $(q,r=document){return r.querySelector(q)}
function $$(q,r=document){return [...r.querySelectorAll(q)]}

function asNum(v){const n=Number(v);return isFinite(n)?n:null}
function fmtNum(n){const x=asNum(n);return x==null?'—':x.toLocaleString()}
function fmtHash(h){
  const x=asNum(h);if(x==null)return'—';
  const u=[{u:'H/s',v:1},{u:'kH/s',v:1e3},{u:'MH/s',v:1e6},{u:'GH/s',v:1e9},{u:'TH/s',v:1e12},{u:'PH/s',v:1e15},{u:'EH/s',v:1e18}];
  let c=u[0];for(const it of u){if(Math.abs(x)>=it.v)c=it}
  return(x/c.v).toFixed(2)+' '+c.u
}
function fmtCompact(n){
  const x=asNum(n);if(x==null)return'—';
  const u=[{u:'',v:1},{u:'K',v:1e3},{u:'M',v:1e6},{u:'G',v:1e9},{u:'T',v:1e12},{u:'P',v:1e15}];
  let c=u[0];for(const it of u){if(Math.abs(x)>=it.v)c=it}
  return c.u===''?fmtNum(x):(x/c.v).toFixed(3)+c.u
}
function fmtUsd(n){const x=asNum(n);return x==null?'—':'$'+(x<1?x.toFixed(4):x.toLocaleString(undefined,{maxFractionDigits:2}))}
function fmtPct(p){const x=asNum(p);return x==null?'':(x>=0?'+':'')+x.toFixed(2)+'%'}

const META={btc:{gecko:"bitcoin"},bch:{gecko:"bitcoin-cash"},bsv:{gecko:"bitcoin-sv"},bc2:{gecko:"bitcoin-ii"},xec:{gecko:"ecash"},fb:{gecko:"fractal-bitcoin"},dgb:{gecko:"digibyte"},ltc:{gecko:"litecoin"},doge:{gecko:"dogecoin"},rvn:{gecko:"ravencoin"},vtc:{gecko:"vertcoin"},ppc:{gecko:"peercoin"},xna:{gecko:"neurai"},grs:{gecko:"groestlcoin"},etc:{gecko:"ethereum-classic"},erg:{gecko:"ergo"},bitcoin:{gecko:"bitcoin"},'bitcoin-cash':{gecko:"bitcoin-cash"}};
let POOLS=[],POOL_BY_ID=new Map(),PRICE={};
async function loadPools(){const d=await fetch(API+'/pools').then(r=>r.json());POOLS=d?.pools||[];POOL_BY_ID=new Map(POOLS.map(p=>[p.id,p]));return POOLS}
async function loadPrices(){
  const ids=[...new Set(POOLS.map(p=>META[(p?.coin?.type||p?.id||'').toLowerCase()]?.gecko).filter(Boolean))];
  if(ids.length===0)ids=['bitcoin','bitcoin-cash','ecash','litecoin','dogecoin','digibyte','ravencoin'];
  try{const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids.join(',')+'&vs_currencies=usd&include_24hr_change=true');PRICE=await r.json()}catch(e){}
}

function icon(p){const s=(p?.coin?.symbol||p?.id||'?').toLowerCase();return `<img class="coin-icon-img" src="/assets/icons/${s}.png" onerror="this.outerHTML='<span class=\\'coin-icon-fallback\\'>${s[0]}</span>'" alt="">`}

function poolNums(p){
  const ps=p?.poolStats||{},ns=p?.networkStats||{};
  return{miners:ps.connectedMiners??ps.miners??0,poolHash:ps.poolHashrate??ps.poolHashRate??0,netHash:ns.networkHashrate??ns.networkHashRate??0,netDiff:ns.networkDifficulty??ns.difficulty??0,blocks:ps.totalBlocksFound??ps.totalBlocks??0}
}

function reward(p){
  const sym=(p?.coin?.symbol||p?.id||'').toUpperCase();
  const r=asNum(p?.coin?.blockReward??p?.networkStats?.blockReward)??asNum(p?.poolStats?.blockReward);
  if(r==null)return'—';
  const gId=META[(p?.coin?.type||p?.id||'').toLowerCase()]?.gecko;
  const pr=gId?PRICE[gId]?.usd:null;
  const usd=pr!=null?r*pr:null;
  return usd!=null?`${r} ${sym} (${fmtUsd(usd)})`:`${r} ${sym}`
}
function minPayout(p){
  const m=asNum(p?.paymentProcessing?.minimumPayment);
  const sym=(p?.coin?.symbol||p?.id||'').toUpperCase();
  return m!=null?`${m} ${sym}`:'—';
}
function poolFee(p){
  const f=p?.poolFeePercent??p?.paymentProcessing?.poolFeePercent;
  return f!=null?f+'%':'1.5%';
}

function priceStr(p){
  const id=(p?.coin?.type||p?.id||'').toLowerCase();
  const gId=META[id]?.gecko;
  const g=gId?PRICE[gId]:null;
  if(!g)return'—';
  const chg=g.usd_24h_change??0;
  const arrow=chg>=0?'↑':'↓';
  return fmtUsd(g.usd)+(chg!=null?` <span class="chg ${chg>=0?'up':'down'}">${fmtPct(chg)} ${arrow}</span>`:'')
}

async function renderPools(){
  $('#app').innerHTML='<div class="table-wrap"><p>Loading…</p></div>';
  await loadPools();await loadPrices();
  const rows=POOLS.filter(p=>p.enabled!==false).map(p=>{
    const n=poolNums(p);const name=p.coin?.name||p.coin?.type||p.id;const sym=p.coin?.symbol||p.id;
    return `<tr onclick="location.hash='#/coin/${p.id}'"><td><div class="coin-cell">${icon(p)}<a href="#/coin/${p.id}">${sym}</a></div></td><td>${p.coin?.algorithm||'—'}</td><td>${fmtNum(n.miners)}</td><td>${fmtHash(n.poolHash)}</td><td>${fmtHash(n.netHash)}</td><td>${fmtCompact(n.netDiff)}</td><td>${priceStr(p)}</td><td>${reward(p)}</td><td>${minPayout(p)}</td><td>${poolFee(p)}</td></tr>`
  }).join('');
  $('#app').innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Pool</th><th>Algorithm</th><th>Miners</th><th>Hashrate</th><th>Network Hashrate</th><th>Network Difficulty</th><th>Current Price</th><th>Block Reward</th><th>Min Payout</th><th>Pool Fee</th></tr></thead><tbody>${rows||'<tr><td colspan="10">No pools</td></tr>}</tbody></table></div>`;
}

async function renderCoin(id){
  await loadPools();await loadPrices();
  const p=POOL_BY_ID.get(id);if(!p){renderPools();return}
  const n=poolNums(p);
  const priceHtml=priceStr(p);
  $('#app').innerHTML=`<div class="coin-page">
    <h2>${icon(p)} ${p.coin?.name||p.coin?.type||id} (${p.coin?.symbol||id}) SOLO Mining Pool</h2>
    <div class="grid-stats">
      <div class="stat-card"><div class="label">Current Price</div><div class="value">${priceHtml}</div></div>
      <div class="stat-card"><div class="label">Miners</div><div class="value">${fmtNum(n.miners)}</div></div>
      <div class="stat-card"><div class="label">Hashrate</div><div class="value">${fmtHash(n.poolHash)}</div></div>
      <div class="stat-card"><div class="label">Network Difficulty</div><div class="value">${fmtCompact(n.netDiff)}</div></div>
      <div class="stat-card"><div class="label">Network Hashrate</div><div class="value">${fmtHash(n.netHash)}</div></div>
      <div class="stat-card"><div class="label">Blocks found</div><div class="value">${fmtNum(n.blocks)}</div></div>
      <div class="stat-card"><div class="label">Algorithm</div><div class="value">${p.coin?.algorithm||'—'}</div></div>
      <div class="stat-card"><div class="label">Block Reward</div><div class="value">${reward(p)}</div></div>
      <div class="stat-card"><div class="label">Pool Fee</div><div class="value">${poolFee(p)}</div></div>
      <div class="stat-card"><div class="label">Minimum Payout</div><div class="value">${minPayout(p)}</div></div>
    </div>
    <a href="#/">← Back to Pools</a>
  </div>`;
}

async function renderHelp(){
  $('#app').innerHTML=`<div class="coin-page"><h2>Help</h2><p>How to connect: use stratum+tcp://YOUR_POOL:PORT with your wallet address as username.</p><p>Example: stratum+tcp://pool.example.com:6004</p><a href="#/">← Pools</a></div>`;
}

async function renderConnect(){
  $('#app').innerHTML=`<div class="coin-page"><h2>Connect</h2><p>Connect your miner to the pool. See each coin page for stratum host and port.</p><a href="#/">← Pools</a></div>`;
}

async function route(){
  const hash=(location.hash||'#/').replace(/^#\/?/,'');
  const [page,id]=hash.split('/');
  $$('.sidebar__link').forEach(l=>l.classList.remove('sidebar__link--active'));
  $$(`.sidebar__link[href="#/${page||''}"]`).forEach(l=>l.classList.add('sidebar__link--active'));
  if(page==='coin'&&id)await renderCoin(id);
  else if(page==='help')await renderHelp();
  else if(page==='connect')await renderConnect();
  else await renderPools();
}

route();setInterval(()=>{if(location.hash.startsWith('#/')&&!location.hash.includes('/coin/'))loadPools().then(route)},15000);
window.onhashchange=route;
