/* ================= arranque ================= */
const use = n => (window.claude && typeof window.claude.use==="function") ? window.claude.use(n).catch(()=>null) : Promise.resolve(null);
document.getElementById("crest").src = CREST;
/* tema: automático (segue o sistema), escuro ou claro — escolha guardada neste dispositivo */
const THEMES=[["auto","Tema automático (segue o sistema)"],["dark","Modo noite"],["light","Modo dia"]];
let THEME="auto"; try{ const t=localStorage.getItem(LS+":theme"); if(t==="dark"||t==="light") THEME=t; }catch(e){}
const THEME_ICO={
  auto:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>`,
  dark:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>`,
  light:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>`};
function applyTheme(){
  const r=document.documentElement; if(THEME==="auto") delete r.dataset.theme; else r.dataset.theme=THEME;
  const b=document.getElementById("themeBt"); if(b){ b.innerHTML=THEME_ICO[THEME]; const l=THEMES.find(t=>t[0]===THEME)[1]; b.title=l; b.setAttribute("aria-label",l+" — tocar para mudar"); }
}
applyTheme();
(()=>{ const l=document.createElement("link"); l.rel="apple-touch-icon"; l.href=CREST; document.head.appendChild(l); })();
render();
(async()=>{
  db = await use("db");
  assets = await use("assets");
  if(!db){ await idbLoadAll(); lsLoad(); MODE="local"; runMigrations(); render(); monAuto(); syncStart(); return; }
  const got={}, ok={};
  // as atualizações de dados só correm se todas as coleções chegaram bem (nunca sobre dados incompletos)
  const ready=()=>{ if(MODE==="loading" && COLS.every(c=>got[c])){ MODE="db"; if(COLS.every(c=>ok[c])) runMigrations(); monAuto(); } schedule(); };
  COLS.forEach(c=>{
    db.collection(c).onSnapshot(q=>{
      const next={};
      q.docs.forEach(d=>{ const key=c+"/"+d.id; next[d.id] = busy(key) && D[c][d.id] ? D[c][d.id] : d.data(); });
      Object.keys(D[c]).forEach(id=>{ if(busy(c+"/"+id) && !(id in next) && pending[c+"/"+id] && !pending[c+"/"+id].del) next[id]=D[c][id]; });
      D[c]=next; VER++; got[c]=true; ok[c]=true; ready();
    }, ()=>{ got[c]=true; ready(); });
  });
  setTimeout(()=>{ if(MODE==="loading"){ COLS.forEach(c=>got[c]=true); ready(); } }, 12000);
})();
