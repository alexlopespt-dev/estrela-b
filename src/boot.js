/* ================= arranque ================= */
const use = n => (window.claude && typeof window.claude.use==="function") ? window.claude.use(n).catch(()=>null) : Promise.resolve(null);
document.getElementById("crest").src = CREST;
(()=>{ const l=document.createElement("link"); l.rel="apple-touch-icon"; l.href=CREST; document.head.appendChild(l); })();
render();
(async()=>{
  db = await use("db");
  assets = await use("assets");
  if(!db){ await idbLoadAll(); lsLoad(); MODE="local"; render(); return; }
  const got={};
  const ready=()=>{ if(MODE==="loading" && COLS.every(c=>got[c])){ MODE="db"; } schedule(); };
  COLS.forEach(c=>{
    db.collection(c).onSnapshot(q=>{
      const next={};
      q.docs.forEach(d=>{ const key=c+"/"+d.id; next[d.id] = busy(key) && D[c][d.id] ? D[c][d.id] : d.data(); });
      Object.keys(D[c]).forEach(id=>{ if(busy(c+"/"+id) && !(id in next) && pending[c+"/"+id] && !pending[c+"/"+id].del) next[id]=D[c][id]; });
      D[c]=next; VER++; got[c]=true; ready();
    }, ()=>{ got[c]=true; ready(); });
  });
  setTimeout(()=>{ if(MODE==="loading"){ COLS.forEach(c=>got[c]=true); ready(); } }, 12000);
})();
