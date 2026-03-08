const API="/api";
function $(q,r=document){return r.querySelector(q)}

function asNum(v){const n=Number(v);return isFinite(n)?n:null}
function fmtNum(n){const x=asNum(n);return x==null?'–':x.toLocaleString()}
function fmtHash(h){
  const x=asNum(h);if(x==null)return'–';
  const u=[{u:'H/s',v:1},{u:'kH/s',v:1e3},{u:'MH/s',v:1e6},{u:'GH/s',v:1e9},{u:'TH/s',v:1e12},{u:'PH/s',v:1e15},{u:'EH/s',v:1e18}];
  let c=u[0];for(const it of u){if(Math.abs(x)>=it.v)c=it}
  return(x/c.v).toFixed(2)+' '+c.u
}
function fmtCompact(n){
  const x=asNum(n);if(x==null)return'–';
  const u=[{u:'',v:1},{u:'K',v:1e3},{u:'M',v:1e6},{u:'G',v:1e9},{u:'T',v:1e12},{u:'P',v:1e15}];
  let c=u[0];for(const it of u){if(Math.abs(x)>=it.v)c=it}
  return c.u===''?fmtNum(x):(x/c.v).toFixed(3)+c.u
}
function fmtUsd(n){const x=asNum(n);return x==null?'–':'$'+(x<1?x.toFixed(4):x.toLocaleString(undefined,{maxFractionDigits:2}))}

let POOLS=[],PRICE={};

async function loadPools(){const d=await fetch(API+'/pools').then(r=>r.json());POOLS=d?.pools||[];return POOLS}
async function loadPrices(){
  const ids=['bitcoin','bitcoin-cash','ethereum-classic','ergo','litecoin','dogecoin','digibyte','ravencoin','ecash'];
  try{const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids.join(',')+'&vs_currencies=usd');PRICE=await r.json()}catch(e){}
}

function icon(p){const s=(p?.coin?.symbol||p?.id||'?').toLowerCase();return `<img class="coin-icon-img" src="/assets/icons/${s}.png" onerror="this.outerHTML='<span class=\\'coin-icon-fallback\\'>${s[0]}</span>'" alt="">`}

function luck(p){
  const e=asNum(p?.poolStats?.blockEffort??p?.poolStats?.effort);
  return e!=null?e.toFixed(0)+'%':'–';
}

function reward(p){
  const r=asNum(p?.coin?.blockReward??p?.networkStats?.blockReward??p?.poolStats?.blockReward);
  const sym=(p?.coin?.symbol||p?.id||'').toUpperCase();
  return r!=null?`${r} ${sym}`:'–';
}
function minPayout(p){
  const m=asNum(p?.paymentProcessing?.minimumPayment);
  const sym=(p?.coin?.symbol||p?.id||'').toUpperCase();
  return m!=null?`${m} ${sym}`:'–';
}
function poolFee(p){const f=p?.poolFeePercent??p?.paymentProcessing?.poolFeePercent;return f!=null?f+'%':'1.5%';}

function price(p){
  const gid=(p?.coin?.type||p?.id||'').toLowerCase().replace('bitcoin-cash','bitcoin-cash');
  const u=PRICE[gid]?.usd??PRICE['bitcoin']?.usd;
  return u!=null?fmtUsd(u):'–';
}

async function render(){
  const body=$('#poolsBody');if(!body)return;
  body.innerHTML='<tr><td colspan="10">Loading…</td></tr>';
  await loadPools();await loadPrices();

  const rows=POOLS.filter(p=>p.enabled!==false).map(p=>{
    const ps=p.poolStats||{},ns=p.networkStats||{};
    const poolHash=ps.poolHashrate??ps.poolHashRate??0;
    const netHash=ns.networkHashrate??ns.networkHashRate??0;
    const netDiff=ns.networkDifficulty??ns.difficulty??0;
    const blocks=ps.totalBlocksFound??ps.totalBlocks??0;
    const name=p.coin?.name||p.coin?.type||p.id;
    const sym=p.coin?.symbol||p.id;
    return `<tr onclick="location.hash='#/coin/${p.id}'"><td><div class="coin-cell">${icon(p)}<a href="#/coin/${p.id}">${name}</a></div></td><td>${fmtHash(poolHash)}</td><td>${fmtNum(blocks)}</td><td>${luck(p)}</td><td>${fmtHash(netHash)}</td><td>${fmtCompact(netDiff)}</td><td>${price(p)}</td><td>${reward(p)}</td><td>${minPayout(p)}</td><td>${poolFee(p)}</td></tr>`;
  }).join('');

  body.innerHTML=rows||'<tr><td colspan="10">No pools — start Miningcore</td></tr>';
}

async function renderCoin(id){
  await loadPools();await loadPrices();
  const p=POOLS.find(x=>x.id===id);if(!p){location.hash='';return}
  const ps=p.poolStats||{},ns=p.networkStats||{};
  $('#poolsView').style.display='none';
  const cv=$('#coinView');cv.style.display='block';
  cv.innerHTML=`<h2><a href="#/">←</a> ${p.coin?.name||p.id} (${p.coin?.symbol||p.id})</h2>
    <div class="news-item"><strong>Pool Hashrate:</strong> ${fmtHash(ps.poolHashrate??ps.poolHashRate)}</div>
    <div class="news-item"><strong>Blocks:</strong> ${fmtNum(ps.totalBlocksFound??ps.totalBlocks)}</div>
    <div class="news-item"><strong>Network Difficulty:</strong> ${fmtCompact(ns.networkDifficulty??ns.difficulty)}</div>
    <div class="news-item"><strong>Block Reward:</strong> ${reward(p)}</div>
    <div class="news-item"><strong>Minimum Payout:</strong> ${minPayout(p)}</div>
    <div class="news-item"><strong>Pool Fee:</strong> ${poolFee(p)}</div>
    <div class="news-item"><strong>Miners:</strong> ${fmtNum(ps.connectedMiners??ps.miners)}</div>`;
}

function route(){
  const hash=(location.hash||'#/').replace(/^#\/?/,'');
  const [page,id]=hash.split('/');
  if(page==='coin'&&id){renderCoin(id);return}
  $('#poolsView').style.display='block';
  $('#coinView').style.display='none';
}

$('#cookieAccept')?.addEventListener('click',()=>{
  localStorage.setItem('cookie-accept','1');
  $('#cookieBanner')?.classList.add('hidden');
});
if(localStorage.getItem('cookie-accept'))$('#cookieBanner')?.classList.add('hidden');

route();render();
setInterval(()=>{if(!location.hash.includes('/coin/')){render();route()}},15000);
window.onhashchange=route;
