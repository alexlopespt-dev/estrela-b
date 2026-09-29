/* App do atleta — service worker só para os avisos (não guarda a app em cache).
   O aviso chega vazio: pergunta ao script (?a=aviso&t=código) que mensagens mostrar. O endereço do script e o código
   ficam na cache "estrela-atleta" (a página grava-os em __cfg quando o atleta liga os avisos). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
const CFG = () => new URL("__cfg", self.registration.scope).href;
async function cfg(){ try{ const c=await caches.open("estrela-atleta"), r=await c.match(CFG()); return r ? await r.json() : null; }catch(e){ return null; } }
async function mensagens(e){
  try{ if(e.data){ const d=e.data.json(); const l=[].concat(d.pend||d); if(l.length&&l[0].t) return l; } }catch(x){}
  const c=await cfg(); if(!c||!c.s||!c.t) return [];
  try{ const u=c.s+(c.s.includes("?")?"&":"?")+"a=aviso&t="+encodeURIComponent(c.t)+"&_="+Date.now();
    const r=await fetch(u); const j=await r.json(); return j.pend||[]; }catch(x){ return []; }
}
self.addEventListener("push", e => e.waitUntil((async () => {
  let l=await mensagens(e);
  if(!l.length) l=[{t:"Estrela B",b:"Tens novidades na app.",tab:"hoje",id:"geral"}];
  await Promise.all(l.map(m => self.registration.showNotification(m.t, {body:m.b||"", tag:m.id||m.tab||"estrela", icon:"icon-192.png", badge:"icon-192.png", data:{tab:m.tab||"hoje"}})));
})()));
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL("#tab="+((e.notification.data&&e.notification.data.tab)||"hoje"), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(ws => {
    for(const w of ws){ if("focus" in w){ w.postMessage({tab:(e.notification.data&&e.notification.data.tab)||"hoje"}); return w.focus(); } }
    return self.clients.openWindow(url);
  }));
});
