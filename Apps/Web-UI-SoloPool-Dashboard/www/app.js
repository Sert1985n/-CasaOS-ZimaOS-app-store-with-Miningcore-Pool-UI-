const API="/api";
function $(q,r=document){return r.querySelector(q)}
function $$(q,r=document){return [...r.querySelectorAll(q)]}

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

let POOLS=[],POOL_BY_ID=new Map(),PRICE={},ACTIVE_POOL=null;

async function loadPools(){const d=await fetch(API+'/pools').then(r=>r.json());POOLS=d?.pools||[];POOL_BY_ID=new Map(POOLS.map(p=>[p.id,p]));return POOLS}
async function loadPrices(){
  const ids=['bitcoin','bitcoin-cash','ethereum-classic','ergo','litecoin','dogecoin','digibyte','ravencoin'];
  try{const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids.join(',')+'&vs_currencies=usd');PRICE=await r.json()}catch(e){}
}

function setById(id,v){const el=$(id);if(el)el.textContent=v}
function updateDashboard(p){
  if(!p)return;
  const ps=p.poolStats||{},ns=p.networkStats||{};
  const miners=ps.connectedMiners??ps.miners??0;
  const poolHash=ps.poolHashrate??ps.poolHashRate??0;
  const netHash=ns.networkHashrate??ns.networkHashRate??0;
  const netDiff=ns.networkDifficulty??ns.difficulty??0;
  const height=ns.blockHeight??ns.height??0;
  const blocks=ps.totalBlocksFound??ps.totalBlocks??0;
  const effort=asNum(ps.blockEffort??ps.effort)??0;
  const reward=asNum(p.coin?.blockReward??ns.blockReward)??0;
  const sym=(p.coin?.symbol||p.id||'').toUpperCase();
  const fee=p.poolFeePercent??p?.paymentProcessing?.poolFeePercent??1.5;

  const gid=(p.coin?.type||p.id||'').toLowerCase().replace('bitcoin-cash','bitcoin-cash');
  const price=PRICE[gid]?.usd??PRICE['bitcoin']?.usd;

  setById('netDiff',fmtCompact(netDiff));
  setById('netHash',fmtHash(netHash));
  setById('lastBlock',fmtNum(height));
  setById('blockHeight',fmtNum(height));
  setById('blockReward',reward?`${reward} ${sym}`:'–');
  setById('poolFee',`${fee}%`);
  const minPay=p?.paymentProcessing?.minimumPayment;setById('minPayout',minPay!=null?minPay+' '+(p.coin?.symbol||p.id):'–');
  setById('coinPrice',price!=null?fmtUsd(price):'–');
  setById('lastUpdate',new Date().toLocaleTimeString());
  setById('miners',fmtNum(miners));
  setById('poolHash',fmtHash(poolHash)+' (5 min. avg.)');
  setById('poolBlocks',fmtNum(blocks));
  setById('totalMined',blocks?`${blocks} blocks`:'–');
  setById('uptime','–');

  const effortEl=$('#effortFill');if(effortEl)effortEl.style.width=Math.min(100,effort)+'%';
  setById('effortPct',effort+'%');
  setById('effortEta','–');

  setById('pageTitle',`${p.coin?.name||p.coin?.type||p.id} Solo Pool`);
}

function renderCoinSelector(){
  const sel=$('#coinSelector');if(!sel)return;
  sel.innerHTML=POOLS.filter(p=>p.enabled!==false).map(p=>`<button class="coin-btn ${p.id===ACTIVE_POOL?'active':''}" data-id="${p.id}">${p.coin?.symbol||p.id}</button>`).join('');
  sel.querySelectorAll('.coin-btn').forEach(b=>{
    b.onclick=()=>{ACTIVE_POOL=b.dataset.id;renderCoinSelector();updateDashboard(POOL_BY_ID.get(ACTIVE_POOL));}
  });
}

async function route(){
  const hash=(location.hash||'#/').replace(/^#\/?/,'');
  const [page]=hash.split('/');

  if(page==='connect'||page==='blocks'||page==='miners'||page==='faq'){
    const dash=$('#dashboardSections'),pc=$('#pageContent');
    if(dash)dash.style.display='none';
    if(pc){pc.style.display='block';pc.innerHTML=`<h2>${page.charAt(0).toUpperCase()+page.slice(1)}</h2><p>Select a coin above for pool-specific ${page}. See each coin's stratum host and port in Pool Configuration.</p>`;}
    return;
  }

  const dash=$('#dashboardSections'),pc=$('#pageContent');
  if(dash)dash.style.display='block';
  if(pc)pc.style.display='none';

  await loadPools();await loadPrices();
  if(!ACTIVE_POOL&&POOLS.length)ACTIVE_POOL=POOLS[0].id;
  renderCoinSelector();
  const p=POOL_BY_ID.get(ACTIVE_POOL);
  updateDashboard(p);
}

route();
setInterval(route,10000);
window.onhashchange=route;
