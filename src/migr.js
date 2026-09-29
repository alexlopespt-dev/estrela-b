/* ================= atualizações de dados (correm uma vez, em qualquer dispositivo) ================= */
const slug = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const MJIMG = __MJIMG__;   // esquemas (campos) recortados dos diapositivos: chave -> dataURL; o princípio guarda só as chaves (imgs)
const prImgs = p => ((p&&p.imgs)||[]).filter(k=>MJIMG[k]);
function runMigrations(){
  if(MODE!=="local" && MODE!=="db") return;
  if(!MIGR.length) return;   // versão para clubes: sem atualizações próprias
  const done=clone(D.meta.mig||{}); let msg=[];
  NOSTAMP++;
  try{ MIGR.forEach(m=>{ if(done[m.id]) return; try{ const r=m.run(); if(r) msg.push(r); done[m.id]=todayISO(); }catch(e){ console.error(e); } }); }
  finally{ NOSTAMP--; }
  if(Object.keys(done).length!==Object.keys(D.meta.mig||{}).length){ put("meta","mig",done); if(msg.length) toast(msg.join(" ")); }
}

/* ================= emblemas dos adversários ================= */
const oppByName = name => { const n=String(name||"").trim().toLowerCase(); return n ? opponents().find(o=>String(o.name).trim().toLowerCase()===n) || null : null; };
const oppCrestSrc = o => o && ((o.imgA && blobSrc(o.imgA)) || (o.imgL && IMGC[o.imgL]) || (o.imgG && gImg(o.imgG)) || o.crest || (o.crk && OPPIMG[o.crk]) || null);
function oppCrest(nameOrOpp, size=34){
  const o = typeof nameOrOpp==="object" ? nameOrOpp : oppByName(nameOrOpp);
  const name = o ? o.name : nameOrOpp, src = oppCrestSrc(o);
  return src ? `<img class="ocrest" src="${esc(src)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="shield" style="width:${size}px;height:${Math.round(size*1.15)}px;font-size:${Math.round(size*.38)}px">${esc(name?initials(name):"?")}</span>`;
}
