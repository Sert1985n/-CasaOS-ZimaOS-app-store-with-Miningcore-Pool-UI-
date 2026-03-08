(function(){
  var API=(window.__API_BASE__||"/api").replace(/\/+$/,"");
  var grid=document.getElementById("grid");
  var metaLine=document.getElementById("metaLine");
  var btnReload=document.getElementById("btnReload");
  function esc(s){ return String(s||"").replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function fmt(n){
    if(n===null||n===undefined||n==="") return "—";
    var x=Number(n);
    if(!Number.isFinite(x)) return String(n);
    if(Math.abs(x)>=1e12) return (x/1e12).toFixed(2)+" T";
    if(Math.abs(x)>=1e9) return (x/1e9).toFixed(2)+" G";
    if(Math.abs(x)>=1e6) return (x/1e6).toFixed(2)+" M";
    if(Math.abs(x)>=1e3) return (x/1e3).toFixed(2)+" K";
    return x.toFixed(2);
  }
  function fetchJson(url){
    return fetch(url,{cache:"no-store"}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); });
  }
  function tryFetch(u){ return fetchJson(u).catch(function(){ return null; }); }
  function render(pools,statsById){
    var enabled=pools.filter(function(p){ return p.enabled; }).length;
    metaLine.textContent="Пулов: "+pools.length+", включено: "+enabled+" | API: "+API;
    grid.innerHTML=pools.map(function(p){
      var st=statsById[p.id]||{};
      var miners=st.miners!=null?st.miners:(st.poolStats&&st.poolStats.connectedMiners);
      var hr=st.poolStats&&st.poolStats.poolHashrate;
      var ports=(p.ports||[]).map(function(x){ return "<span class=\"tag\">:"+esc(x)+"</span>"; }).join(" ");
      var statusTag=p.enabled?"<span class=\"tag tag--ok\">ON</span>":"<span class=\"tag tag--bad\">OFF</span>";
      return "<div class=\"pool\"><div class=\"pool__name\">"+esc(p.id)+" "+statusTag+"</div><div class=\"small\">"+esc(p.coin||"")+"</div><hr/><div class=\"kv\"><div><div class=\"k\">Порты</div><div class=\"v\">"+(ports||"—")+"</div></div><div><div class=\"k\">Miners</div><div class=\"v\">"+(miners!=null?miners:"—")+"</div></div><div><div class=\"k\">Hashrate</div><div class=\"v\">"+fmt(hr)+"</div></div></div></div>";
    }).join("");
  }
  function load(){
    fetchJson(API+"/pools").then(function(data){
      var pools=Array.isArray(data)?data:(data.pools||[]);
      var statsById={};
      Promise.all(pools.map(function(p){
        var id=p.id||p.name;
        if(!id) return;
        return tryFetch(API+"/pools/"+encodeURIComponent(id)+"/stats").then(function(st){ if(st) statsById[id]=st; });
      })).then(function(){ render(pools,statsById); });
    }).catch(function(e){ metaLine.textContent="Ошибка: "+e.message; });
  }
  if(btnReload) btnReload.addEventListener("click",load);
  load();
})();
