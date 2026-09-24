/* ================= dados partilhados (versão Netlify): Google Sheets via Apps Script ================= */
// Cada dispositivo continua a guardar tudo no browser (funciona sem rede) e, se estiver ligado, envia as suas
// alterações para o Apps Script (secção 11 de tools/apps-script/monitorizacao_completo.gs) e recebe as dos outros.
// - put/del chamam syncQ: a alteração fica numa fila (guardada no browser) até o servidor a confirmar.
// - de SYNC_MS em SYNC_MS (e ao voltar à app) pede as alterações desde a última versão recebida.
// - enquanto há alteração local por enviar para um registo, a versão do servidor desse registo é ignorada.
// A ligação (URL, chave, última versão) fica só neste browser: não vai nos dados partilhados.
const SYNC_LS=LS+":sync", SYNCQ_LS=LS+":syncq", SYNC_MS=15000;
const SYNC={cfg:null,last:0,q:{},err:"",at:null,pulling:false,pushing:false,busy:""};
try{ const c=JSON.parse(localStorage.getItem(SYNC_LS)||"null"); if(c&&c.url&&c.key){ SYNC.cfg={url:c.url,key:c.key}; SYNC.last=+c.last||0; } }catch(e){}
try{ const q=JSON.parse(localStorage.getItem(SYNCQ_LS)||"null"); if(q&&typeof q==="object") SYNC.q=q; }catch(e){}
const syncOn = () => !!(SYNC.cfg && MODE==="local");
const syncN = () => Object.keys(SYNC.q).length;
function syncSaveCfg(){ try{ if(SYNC.cfg) localStorage.setItem(SYNC_LS,JSON.stringify({...SYNC.cfg,last:SYNC.last})); else localStorage.removeItem(SYNC_LS); }catch(e){} }
function syncSaveQ(){ clearTimeout(SYNC.qs); SYNC.qs=null; try{ localStorage.setItem(SYNCQ_LS,JSON.stringify(SYNC.q)); }catch(e){} }
const gImg = id => "https://drive.google.com/thumbnail?id="+encodeURIComponent(id)+"&sz=w1600";

function syncQ(c,i,d){
  if(!syncOn()) return;
  SYNC.q[c+"/"+i]={c,i,d:d==null?null:d};
  if(!SYNC.qs) SYNC.qs=setTimeout(syncSaveQ,300);
  clearTimeout(SYNC.pt); SYNC.pt=setTimeout(syncPush,700);
  syncBadge();
}
const syncErr = e => e&&e.name==="AbortError" ? "O Google demorou demasiado a responder."
  : (e&&e.message&&!/fetch|network|load/i.test(e.message) ? e.message : "Sem ligação ao Google.");

async function syncGet(params){
  const u=SYNC.cfg.url.trim()+(SYNC.cfg.url.includes("?")?"&":"?")+"k="+encodeURIComponent(SYNC.cfg.key)+"&"+Object.entries(params).map(([k,v])=>k+"="+encodeURIComponent(v)).join("&");
  const ctl=typeof AbortController!=="undefined"?new AbortController():null, tm=setTimeout(()=>ctl&&ctl.abort(),30000);
  try{
    let d;
    try{ const r=await fetch(u,{signal:ctl?ctl.signal:undefined,cache:"no-store"}); if(!r.ok) throw new Error("HTTP "+r.status); d=await r.json(); }
    catch(e){ if(e&&e.name==="AbortError") throw e; d=await monJsonp(u); }
    if(d&&d.erro) throw new Error(d.erro==="chave"?"A chave não está certa.":d.erro);
    return d;
  }finally{ clearTimeout(tm); }
}
async function syncPost(body){
  const ctl=typeof AbortController!=="undefined"?new AbortController():null, tm=setTimeout(()=>ctl&&ctl.abort(),60000);
  try{
    // text/plain: pedido "simples" (sem pré-verificação CORS), que o Apps Script aceita
    const r=await fetch(SYNC.cfg.url.trim(),{method:"POST",body:JSON.stringify({...body,k:SYNC.cfg.key}),signal:ctl?ctl.signal:undefined});
    if(!r.ok) throw new Error("HTTP "+r.status);
    const d=await r.json();
    if(d&&d.erro) throw new Error(d.erro==="chave"?"A chave não está certa.":d.erro==="pedido desconhecido"?"O script ainda não tem a versão nova (Implementar → Gerir implementações → Nova versão).":d.erro);
    return d;
  }finally{ clearTimeout(tm); }
}

// aplica registos vindos do servidor; os que têm alteração local por enviar ficam como estão
function syncApply(docs){
  let ch=0;
  (docs||[]).forEach(x=>{
    if(!x||!COLS.includes(x.c)||SYNC.q[x.c+"/"+x.i]) return;
    if(x.x){ if(x.i in D[x.c]){ delete D[x.c][x.i]; ch++; } return; }
    if(x.d&&typeof x.d==="object"&&JSON.stringify(D[x.c][x.i])!==JSON.stringify(x.d)){ D[x.c][x.i]=x.d; ch++; }
  });
  return ch;
}

async function syncPull(manual){
  if(!syncOn()||SYNC.pulling) return;
  SYNC.pulling=true; syncBadge();
  try{
    const d=await syncGet({a:"pull",since:SYNC.last});
    if(!Array.isArray(d.docs)) throw new Error("O script ainda não tem a versão nova (Implementar → Gerir implementações → Nova versão).");
    const ch=syncApply(d.docs);
    SYNC.last=Math.max(SYNC.last,+d.now||0); syncSaveCfg();
    if(ch){ lsSave(); VER++; schedule(); }
    SYNC.err=""; SYNC.at=Date.now();
    if(manual) toast(ch?`${ch} alteraç${ch===1?"ão":"ões"} recebida${ch===1?"":"s"}`:"Tudo atualizado");
  }catch(e){ SYNC.err=syncErr(e); if(manual) toast(SYNC.err); }
  finally{ SYNC.pulling=false; syncBadge(); }
}

async function syncPush(){
  if(!syncOn()||SYNC.pushing||!syncN()) return;
  SYNC.pushing=true; syncBadge();
  let again=false;
  try{
    const batch=[]; let size=0;
    for(const [k,op] of Object.entries(SYNC.q)){ const s=JSON.stringify(op).length; if(batch.length&&size+s>250000) break; batch.push([k,op]); size+=s; }
    const r=await syncPost({a:"push",ops:batch.map(([,o])=>o)});
    batch.forEach(([k,o])=>{ if(SYNC.q[k]===o) delete SYNC.q[k]; });   // se mudou entretanto, segue no próximo envio
    (r.erros||[]).forEach(x=>{ delete SYNC.q[x.c+"/"+x.i]; });
    if((r.erros||[]).length) toast(`Não foi possível partilhar ${r.erros.length} registo(s): ${r.erros.some(x=>x.m==="grande")?"são grandes demais (fotos muito pesadas?).":"dados inválidos."}`);
    syncSaveQ(); SYNC.err=""; SYNC.at=Date.now(); again=syncN()>0;
  }catch(e){ SYNC.err=syncErr(e); }
  finally{ SYNC.pushing=false; syncBadge(); }
  if(again) setTimeout(syncPush,50);
}

// fotos novas: para o Drive (os outros dispositivos veem-nas); devolve o id do ficheiro ou null
async function syncImg(blob){
  if(!syncOn()) return null;
  try{
    const data=await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(String(fr.result).split(",")[1]||""); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(blob); });
    const r=await syncPost({a:"img",data,type:blob.type||"image/jpeg"});
    return r&&r.id ? String(r.id) : null;
  }catch(e){ toast("A foto não foi para o Drive ("+syncErr(e)+"). Fica só neste dispositivo."); return null; }
}
// fotos que só estavam neste browser (IndexedDB ou dentro do registo) passam para o Drive
async function syncMoveImgs(){
  let n=0;
  for(const c of ["exercises","opponents"]) for(const [id,x] of Object.entries(D[c])){
    let blob=null;
    try{
      if(x.imgL && IMGC[x.imgL]) blob=await (await fetch(IMGC[x.imgL])).blob();
      else if(c==="exercises" && typeof x.img==="string" && x.img.startsWith("data:")) blob=await (await fetch(x.img)).blob();
    }catch(e){ blob=null; }
    if(!blob) continue;
    const g=await syncImg(blob); if(!g) continue;
    const o=clone(D[c][id]); if(!o) continue;
    delete o.imgL; delete o.img; o.imgG=g; put(c,id,o); n++;
  }
  return n;
}

// primeira ligação: junta os dados deste dispositivo com os do servidor (o servidor ganha nos registos que existem
// nos dois, exceto se aqui houver uma foto que lá não há); o que só existe aqui é enviado
async function syncConnect(url,key){
  const prev={cfg:SYNC.cfg,last:SYNC.last};
  SYNC.cfg={url:url.trim(),key:key.trim()}; SYNC.last=0;
  let d;
  try{ d=await syncGet({a:"pull",since:0}); if(!Array.isArray(d.docs)) throw new Error("O script ainda não tem a versão nova (Implementar → Gerir implementações → Nova versão)."); }
  catch(e){ SYNC.cfg=prev.cfg; SYNC.last=prev.last; throw new Error(syncErr(e)); }
  const srv={}; d.docs.forEach(x=>{ if(x&&COLS.includes(x.c)) srv[x.c+"/"+x.i]=x; });
  const hasOwnImg = o => o && (o.imgL || o.imgG || o.imgA || (typeof o.img==="string" && o.img.startsWith("data:")));
  let got=0, sent=0;
  Object.values(srv).forEach(x=>{
    const loc=D[x.c][x.i];
    if(x.x){ if(loc){ delete D[x.c][x.i]; got++; } return; }
    if(hasOwnImg(loc) && !hasOwnImg(x.d)) return;           // fica a versão daqui (com foto), que será enviada
    if(JSON.stringify(loc)!==JSON.stringify(x.d)){ D[x.c][x.i]=x.d; got++; }
  });
  COLS.forEach(c=>Object.entries(D[c]).forEach(([i,doc])=>{ const k=c+"/"+i, s=srv[k];
    if(!s || (hasOwnImg(doc) && !s.x && !hasOwnImg(s.d))){ SYNC.q[k]={c,i,d:doc}; sent++; } }));
  SYNC.last=+d.now||0; SYNC.err=""; SYNC.at=Date.now();
  syncSaveCfg(); syncSaveQ(); lsSave(); VER++; schedule();
  await syncMoveImgs();
  await syncPush();
  return {got,sent,server:d.docs.length};
}
function syncDisconnect(){ SYNC.cfg=null; SYNC.last=0; SYNC.q={}; SYNC.err=""; syncSaveCfg(); syncSaveQ(); syncBadge(); }

/* estado no cabeçalho */
function syncBadge(){
  const el=document.getElementById("syncSt"); if(!el) return;
  if(!syncOn()){ el.hidden=true; return; }
  const n=syncN(), busy=SYNC.pulling||SYNC.pushing;
  const t = SYNC.err ? `Sem ligação${n?` · ${n} por enviar`:""}` : busy ? "A sincronizar…" : n ? `${n} por enviar` : "Partilhado";
  el.hidden=false; el.className="syncst "+(SYNC.err?"err":busy||n?"busy":"ok"); el.textContent=t;
  el.title = SYNC.err ? SYNC.err : SYNC.at ? "Última sincronização: "+new Date(SYNC.at).toLocaleTimeString("pt-PT") : "";
}
function syncStart(){
  syncBadge();
  if(!syncOn()) return;
  syncPush(); syncPull();
  if(SYNC.iv) return;
  SYNC.iv=setInterval(()=>{ if(document.visibilityState!=="hidden"){ syncPush(); syncPull(); } }, SYNC_MS);
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ syncPush(); syncPull(); } else if(SYNC.qs) syncSaveQ(); });
  window.addEventListener("online",()=>{ syncPush(); syncPull(); });
  window.addEventListener("pagehide",()=>{ if(SYNC.qs) syncSaveQ(); });
}

/* janela de ligação */
function syncForm(){
  const c=SYNC.cfg||{}, mc=monCfg();
  const on=syncOn();
  modal({title:"Partilhar dados com a equipa técnica",sub:"Google Sheets através do Apps Script da monitorização",
    body:`${on?`<p class="small" style="margin:0 0 12px"><b>Ligado.</b> ${SYNC.err?`<span style="color:var(--r5)">${esc(SYNC.err)}</span>`:SYNC.at?"Última sincronização às "+new Date(SYNC.at).toLocaleTimeString("pt-PT")+".":""}${syncN()?` ${syncN()} alteração(ões) por enviar.`:""}</p>`:""}
      <div class="form"><label class="fld full">Endereço (URL)<input name="url" value="${esc(c.url||mc.url||"")}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"></label>
      <label class="fld full">Chave<input name="key" value="${esc(c.key||mc.key||"")}" autocomplete="off"></label></div>
      <p class="note">É o mesmo endereço e a mesma chave da monitorização. Cada pessoa da equipa técnica liga uma vez no seu dispositivo.
      Ao ligar, o que existe só aqui é enviado e o que já está partilhado passa para este dispositivo (nos registos que existem nos dois, fica o partilhado).
      As alterações dos outros aparecem em cerca de ${SYNC_MS/1000} segundos.</p>`,
    foot:`${on?`<button class="btn ghost" data-a="mDel">Desligar</button>`:"<span></span>"}<span class="right"><button class="btn" data-a="mClose">Cancelar</button><button class="btn primary" data-a="mSave">${on?"Guardar":"Ligar"}</button></span>`,
    ctx:{
      save:async()=>{ if(M.busy) return; const url=fv("url"), key=fv("key");
        if(!/^https:\/\//.test(url)){ toast("O endereço tem de começar por https://"); return; }
        if(!key){ toast("Falta a chave."); return; }
        if(on && url===c.url && key===c.key){ closeModal(); syncPush(); syncPull(true); return; }
        toast("A ligar e a juntar os dados…"); M.busy=true;
        try{ const r=await syncConnect(url,key); closeModal(); syncStart();
          toast(`Ligado. ${r.got} registo(s) recebido(s), ${r.sent} enviado(s).`); }
        catch(e){ if(M) M.busy=false; toast(e.message||"Não foi possível ligar."); }
      },
      del:()=>askConfirm("Desligar a partilha neste dispositivo? Os dados ficam aqui, mas deixas de receber e enviar alterações.","Desligar",true).then(ok=>{ if(ok){ syncDisconnect(); closeModal(); render(); toast("Partilha desligada neste dispositivo"); } })
    }});
}
