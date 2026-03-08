/* PP_CUSTOM_JS_2026_BEGIN */
(function(){
  if (window.__PP_CUSTOM_JS_2026) return;
  window.__PP_CUSTOM_JS_2026 = true;

  const HIDE_IDS = [
    'langLabel','langCheckEn','langCheckRu',
    'themeIconSvg','themeCheckDark','themeCheckLight'
  ];

  function looksLikeAddress(s){
    if(!s) return false;
    s = String(s).trim();
    // base58-ish (BTC-like) or long hex-ish
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,60}(\.|_|:)/.test(s)) return true;
    if (/^(bc1|ltc1|bch1|ecash:|bitcoincash:)[0-9a-z]{20,}(\.|_|:)/i.test(s)) return true;
    if (/^[0-9a-f]{32,}(\.|_|:)/i.test(s)) return true;
    return false;
  }

  function workerFromLogin(s){
    s = String(s).trim();
    // wallet.worker / wallet_worker / wallet:worker
    if (s.includes('.')) return s.split('.').pop();
    if (s.includes('_')) return s.split('_').pop();
    if (s.includes(':')) return s.split(':').pop();
    return s;
  }

  function nukeLangTheme(){
    for (const id of HIDE_IDS){
      const el = document.getElementById(id);
      if(!el) continue;
      const pill = el.closest('.pill');
      if(pill){ pill.remove(); continue; }
      const btn = el.closest('button,a,div');
      if(btn) btn.remove();
    }
  }

  // Miner page: заменить "Worker" с адреса на имя воркера
  function fixWorkerNames(){
    const h = (location.hash || '').toLowerCase();
    if (!h.includes('miner')) return;

    // Проходим по всем ячейкам, где встречается login вида address.worker
    document.querySelectorAll('td, .mono, .v.mono').forEach(el=>{
      const t = (el.textContent || '').trim();
      if (!looksLikeAddress(t)) return;
      const w = workerFromLogin(t);
      if (w && w !== t){
        el.textContent = w;
        el.title = t; // адрес в tooltip чтобы не потерять
      }
    });
  }

  function runAll(){
    nukeLangTheme();
    fixWorkerNames();
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    runAll();
    // UI может перерендериваться — аккуратно добиваем
    setInterval(runAll, 1500);
  });
  window.addEventListener('hashchange', ()=>setTimeout(runAll, 50));
})();
/* PP_CUSTOM_JS_2026_END */
