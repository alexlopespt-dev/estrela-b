/* ================= App do atleta — Estrela B =================
   Um link pessoal por atleta (criado na app da equipa técnica: Plantel → atleta → App do atleta):
     https://<site>/#s=<endereço do script da partilha>&t=<código pessoal>
   Guarda-se neste telemóvel e a partir daí a app abre sozinha. Fala só com o script da partilha (dados_app.gs,
   funções "APP DO ATLETA"), que devolve a agenda, a convocatória publicada, os números do atleta e as suas respostas,
   e grava o bem-estar e o PSE nas mesmas folhas dos formulários (a monitorização continua igual).
   Sem rede: as respostas ficam guardadas no telemóvel e são enviadas quando houver ligação. */
// nunca dentro de outra página (o _headers faz o mesmo com frame-ancestors, mas pode não estar no Netlify)
if(window.top!==window.self){ try{ window.top.location=window.location.href; }catch(e){} document.documentElement.innerHTML=""; throw new Error("framed"); }
const CREST = "__CREST__";
const LSK = "estrela-atleta-v1";
const $ = s => document.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ls = { get(k,d){ try{ const v=localStorage.getItem(LSK+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(LSK+k,JSON.stringify(v)); }catch(e){} }, del(k){ try{ localStorage.removeItem(LSK+k); }catch(e){} } };
const pad = n => String(n).padStart(2,"0");
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => isoOf(new Date());
const toD = iso => { const [y,m,d]=String(iso).split("-").map(Number); return new Date(y,m-1,d); };
const addDays = (iso,n) => { const d=toD(iso); d.setDate(d.getDate()+n); return isoOf(d); };
const fmt = (iso,o) => toD(iso).toLocaleDateString("pt-PT",o);
const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
const dayName = iso => iso===today()?"Hoje":iso===addDays(today(),1)?"Amanhã":cap(fmt(iso,{weekday:"long"}));
const first = n => String(n||"").trim().split(/\s+/)[0];
const lbl = t => String(t||"").replace(/^\s*\d+(?:[.,]\d+)?\s*[-–—.:]?\s*/,"");   // "3 - Normal" → "Normal"
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove("show"),2800); }

const S = { cfg:ls.get(":cfg",null), data:ls.get(":dados",null), at:ls.get(":dados_em",null), tab:"hoje", view:null, form:null, err:"", loading:false, fila:ls.get(":fila",[]) };

/* ---- ligação: o link pessoal chega no endereço (#s=…&t=…) e fica guardado ---- */
(function(){
  const h=new URLSearchParams(location.hash.replace(/^#/,""));
  if(h.get("s")&&h.get("t")){
    const cfg={s:h.get("s"),t:h.get("t")};
    if(!S.cfg||S.cfg.t!==cfg.t){ S.data=null; ls.del(":dados"); }
    S.cfg=cfg; ls.set(":cfg",cfg);
  }
  if(["hoje","agenda","jogo","eu"].includes(h.get("tab"))) S.tab=h.get("tab");
  // o link pessoal fica no endereço: no iPhone, "Adicionar ao ecrã principal" usa o endereço atual e a app do ecrã
  // principal não vê o que ficou guardado no Safari. Só o #tab= (vindo de um aviso) é tirado.
  if(h.get("tab")&&!h.get("t")) try{ history.replaceState(null,"",location.pathname+location.search+(S.cfg?`#s=${encodeURIComponent(S.cfg.s)}&t=${S.cfg.t}`:"")); }catch(e){}
})();
document.documentElement.style.setProperty("--wm",`url("${CREST}")`);


/* ---- pedidos ao script (fetch; se o browser bloquear, JSONP) ---- */
function jsonp(u){
  return new Promise((res,rej)=>{
    const cb="__at"+Date.now().toString(36), s=document.createElement("script");
    const end=()=>{ try{ delete window[cb]; }catch(e){} s.remove(); clearTimeout(tm); };
    const tm=setTimeout(()=>{ end(); rej(new Error("tempo")); },20000);
    window[cb]=d=>{ end(); res(d); }; s.onerror=()=>{ end(); rej(new Error("rede")); };
    s.src=u+"&cb="+cb; document.head.appendChild(s);
  });
}
async function apiGet(){
  const u=S.cfg.s+(S.cfg.s.includes("?")?"&":"?")+"a=atleta&t="+encodeURIComponent(S.cfg.t)+"&_="+Date.now();
  try{ const r=await fetch(u); if(!r.ok) throw new Error("HTTP "+r.status); return await r.json(); }
  catch(e){ return await jsonp(u); }
}
async function apiPost(body){
  const r=await fetch(S.cfg.s,{method:"POST",body:JSON.stringify({...body,t:S.cfg.t})});
  const j=await r.json(); if(j.erro) throw Object.assign(new Error(j.msg||j.erro),{srv:true,link:j.erro==="link",ja:j.erro==="ja"}); return j;
}
async function load(manual){
  if(!S.cfg||S.loading) return;
  S.loading=true; if(manual) render();
  try{
    const d=await apiGet();
    if(d.erro){ S.err = d.erro==="link" ? "link" : (d.msg||d.erro); }
    else { S.data=d; S.at=new Date().toISOString(); S.err=""; ls.set(":dados",d); ls.set(":dados_em",S.at); }
  }catch(e){ S.err="rede"; }
  S.loading=false; render();
  if(manual && S.err==="rede") toast("Sem ligação — a mostrar os últimos dados.");
}
/* uma resposta por dia (como no painel do Sheets): antes de abrir o formulário confirma com o Sheets */
function jaHoje(k){ const t=today(), r=(S.data&&S.data.respostas)||{};
  return k==="bem" ? !!(r.bem||S.fila.find(x=>x.a==="atleta_bem"&&x.d===t)) : !!((r.pse||[]).length||S.fila.find(x=>x.a==="atleta_pse"&&x.d===t)); }
async function livre(k){
  if(!jaHoje(k)&&navigator.onLine!==false&&(!S.at||Date.now()-new Date(S.at).getTime()>60000)) await load();
  if(jaHoje(k)){ toast(k==="bem"?"Já respondeste ao bem-estar hoje. Voltas a responder amanhã.":"Já registaste o PSE hoje. Voltas a registar amanhã."); render(); return false; }
  return true;
}
/* ---- respostas: enviadas logo; sem rede ficam na fila ---- */
async function send(item){
  item.quando=new Date().toISOString();   // conta para a hora em que respondeu, mesmo que só seja enviado mais tarde
  try{ const r=await apiPost(item); return r; }
  catch(e){
    if(e.srv){ throw e; }
    S.fila=S.fila.filter(x=>!(x.a===item.a&&x.a==="atleta_bem"&&x.d===item.d)); S.fila.push(item); ls.set(":fila",S.fila); return {fila:true};
  }
}
async function flush(){
  if(!S.cfg||!S.fila.length||flush.on) return; flush.on=true;
  const rest=[];
  for(const it of S.fila){
    if(Date.now()-new Date(it.quando).getTime()>36*3600e3) continue;   // mais de 36 h: já não entram nas contas desse dia
    try{ await apiPost(it); }catch(e){ if(!e.srv) rest.push(it); }
  }
  const sent=S.fila.length-rest.length; S.fila=rest; ls.set(":fila",rest); flush.on=false;
  if(sent){ toast("Respostas guardadas no telemóvel enviadas ✓"); load(); }
}
window.addEventListener("online",()=>{ flush(); load(); });
document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ flush(); load(); } });

/* ---- avisos no telemóvel (push) ---- */
const PUSH_OK = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && location.protocol==="https:";
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const standalone = () => (window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone===true;
const u8 = b => { b=String(b).replace(/-/g,"+").replace(/_/g,"/"); b+="=".repeat((4-b.length%4)%4); return Uint8Array.from(atob(b),c=>c.charCodeAt(0)); };
// o site tem o sw.js? (quem só publicou o index.html não tem avisos — a app funciona na mesma)
S.swOk=null;
if(location.protocol==="https:") fetch("sw.js",{method:"HEAD",cache:"no-store"}).then(r=>{ S.swOk=r.ok&&/javascript/i.test(r.headers.get("content-type")||""); if(!S.swOk) render(); }).catch(()=>{ S.swOk=false; render(); });
function pushState(){
  if(!(S.data&&S.data.push&&S.data.push.key)) return "none";
  if(S.swOk===false) return "nofile";
  if(IOS&&!standalone()) return "ios";
  if(!PUSH_OK) return "none";
  if(Notification.permission==="denied") return "denied";
  return ls.get(":push",null)&&Notification.permission==="granted" ? "on" : "off";
}
async function swCfg(){ try{ const c=await caches.open("estrela-atleta"); await c.put(new URL("__cfg",location.href).href,new Response(JSON.stringify(S.cfg),{headers:{"Content-Type":"application/json"}})); }catch(e){} }
function pushCard(onde){
  const st=pushState(); if(st==="none") return "";
  if(onde==="hoje"&&(st==="on"||st==="nofile"||ls.get(":pushdepois",0)>Date.now())) return "";
  if(st==="nofile") return `<section class="card" id="pushCard"><p class="k">Avisos no telemóvel</p><p class="sub">Ainda não disponíveis: o site da app tem de ter também o ficheiro <b>sw.js</b>. Avisa a equipa técnica.</p></section>`;
  const bell='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  const h=`<div class="task-h"><span class="ico" style="--c:#b8860b">${bell}</span><div><p class="k">Avisos no telemóvel</p><h2>${st==="on"?"Ligados ✓":st==="denied"?"Bloqueados":"Recebe lembretes"}</h2></div></div>`;
  let b="";
  if(st==="ios") b=`<p class="sub">No iPhone, os avisos só funcionam com a app no ecrã principal:</p><ol class="steps"><li>Toca em <b>Partilhar</b> (o quadrado com a seta, em baixo no Safari).</li><li>Escolhe <b>"Adicionar ao ecrã principal"</b>.</li><li>Abre a app pelo ícone novo e toca em <b>Ativar avisos</b>.</li></ol><p class="note">Precisa do iOS 16.4 ou mais recente.</p>`;
  else if(st==="denied") b=`<p class="sub">Os avisos estão bloqueados neste telemóvel. ${IOS?"Vai a Definições → Notificações → Estrela B e ativa.":"Toca no cadeado ao lado do endereço (ou Definições do Chrome → Notificações) e permite."}</p>`;
  else if(st==="off") b=`<p class="sub">Um lembrete de manhã para o bem-estar, outro depois do treino para o PSE e um aviso quando fores convocado.</p><button class="cta" data-a="pushOn">Ativar avisos</button>${onde==="hoje"?`<button class="cta sec" data-a="pushDepois">Agora não</button>`:""}`;
  else b=`<p class="sub">Bem-estar às 8h30 (dias de treino ou jogo), PSE depois do treino e convocatória.</p><button class="cta sec" data-a="pushTeste">Enviar um aviso de teste</button><button class="cta sec" data-a="pushOff">Desligar neste telemóvel</button>`;
  return `<section class="card task" id="pushCard">${h}${b}</section>`;
}
if(PUSH_OK&&ls.get(":push",null)){ navigator.serviceWorker.register("sw.js").catch(()=>{}); swCfg(); }
if("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message",e=>{ const t=e.data&&e.data.tab; if(["hoje","agenda","jogo","eu"].includes(t)){ S.tab=t; S.view=null; render(); load(); } });

/* ---- escalas ---- */
const BEM_Q = [["sono","Como dormiste esta noite?","Qualidade do sono"],["fadiga","Como te sentes fisicamente?","Fadiga geral"],
  ["dor","Tens dores musculares?","Dor muscular"],["stress","Como está o teu nível de stress?","Stress"]];
const BEM_COR = ["#c62828","#e0702a","#c9a400","#3fa34d","#1f7a3d"];
const RPE = ["Repouso","Muito, muito fácil","Fácil","Moderado","Um pouco difícil","Difícil","Difícil +","Muito difícil","Muito difícil +","Quase máximo","Máximo"];
const rpeCor = n => `hsl(${Math.round(130-n*13)},62%,${n>=8?40:44}%)`;
const bemEstado = t => t==null?null : t<=12?{l:"Risco",c:"var(--bad)"} : t<=16?{l:"Atenção",c:"var(--warn)"} : {l:"OK",c:"var(--ok)"};

/* ---- ícones ---- */
const IC = {
  hoje:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  agenda:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  jogo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/></svg>',
  eu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>'};

/* ---- ecrãs ---- */
const OPPIMG = "__OPPIMG__";
const nk = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function oppSrc(name){ const k=nk(name); if(!k) return null; let best=null;
  Object.keys(OPPIMG).forEach(n=>{ const m=nk(n); if(m===k||(!best&&(k.includes(m)||m.includes(k)))) best=n; }); return best?OPPIMG[best]:null; }
const initials = n => String(n||"?").split(/\s+/).filter(w=>/^[A-Za-zÀ-ú]/.test(w)).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
const crest = (name,own,sz=44) => { const src=own?CREST:oppSrc(name);
  return src?`<img class="crest" src="${src}" alt="" style="width:${sz}px;height:${sz}px">`:`<span class="crest ini" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz*.34)}px">${esc(initials(name))}</span>`; };
const teamName = () => (S.data&&S.data.equipa&&S.data.equipa.curto)||"Estrela B";
const diasAte = iso => Math.round((toD(iso)-toD(today()))/864e5);
const quando = iso => { const n=diasAte(iso); return n===0?"Hoje":n===1?"Amanhã":n<7?`Daqui a ${n} dias`:cap(fmt(iso,{day:"numeric",month:"short"})); };
const RES_C = {V:"var(--ok)",E:"var(--warn)",D:"var(--bad)"};
const ST = {P:["Presente","var(--ok)"],AT:["Atraso","var(--warn)"],FJ:["Falta justificada","#8a7a80"],FI:["Falta injustificada","var(--bad)"],L:["Lesionado","#b0306a"],D:["Dispensado","#5a6b8a"],"":["Sem registo","var(--line)"]};
const I = {
  clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  cup:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M9 20h6M12 14v6"/></svg>',
  bus:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="13" rx="3"/><path d="M4 11h16M8 20v-3M16 20v-3"/></svg>',
  heart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>'};
function top(sub){
  const d=S.data, nm=d&&d.me?first(d.me.name):"";
  const h=new Date().getHours(), ola=h<13?"Bom dia":h<20?"Boa tarde":"Boa noite";
  const me=d&&d.me, face=me&&me.foto?`<img class="me-ph" src="${me.foto}" alt="">`:me?`<span class="me-ph ini">${esc(initials(me.name))}</span>`:`<img src="${CREST}" alt="">`;
  return `<header class="top"><div class="top-r">${face}<div><small>${esc(teamName())}</small><h1>${nm?`${ola}, ${esc(nm)}`:"App do atleta"}</h1></div>
    ${S.cfg&&S.data?`<button class="rf${S.loading?" spin":""}" data-a="refresh" aria-label="Atualizar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg></button>`:""}</div>${sub?`<p>${sub}</p>`:""}</header>`;
}
function vLink(){
  return top()+`<main><div class="card empty"><b>${S.err==="link"?"Este link já não é válido":"Abre o teu link pessoal"}</b>
    ${S.err==="link"?"A equipa técnica gerou um link novo para ti (ou retirou o acesso). Pede-lhes o link atual e abre-o neste telemóvel.":"A equipa técnica envia-te um link só teu (por WhatsApp). Abre-o neste telemóvel uma vez e a app fica pronta."}</div></main>`;
}
const agendaDe = iso => ((S.data&&S.data.agenda)||[]).filter(a=>a.date===iso);
/* cartão de jogo: casa à esquerda; com resultado ou com hora */
function matchCard(g,o={}){
  const home=g.venue!=="F", us=teamName(), L=home?[us,1]:[g.opp,0], R=home?[g.opp,0]:[us,1];
  const mid = g.gf!=null ? `<div class="mc-score">${home?g.gf:g.ga}<i>–</i>${home?g.ga:g.gf}</div>` : `<div class="mc-vs">${esc(g.time||"—")}<small>${esc(cap(fmt(g.date,{weekday:"short",day:"numeric",month:"short"})).replace(/\./g,""))}</small></div>`;
  return `<section class="mcard${o.cls?" "+o.cls:""}">
    <div class="mc-top"><span>${esc(g.comp||"Jogo")}</span>${o.chip||""}</div>
    <div class="mc-row"><div class="mc-t">${crest(L[0],L[1],52)}<b>${esc(L[0])}</b></div>${mid}<div class="mc-t">${crest(R[0],R[1],52)}<b>${esc(R[0])}</b></div></div>
    ${o.foot?`<div class="mc-foot">${o.foot}</div>`:""}</section>`;
}
function evCard(a){
  if(a.tipo==="jogo") return `<div class="ag jogo"><div class="ag-h"><b>${esc(a.time||"—")}</b><span>Jogo</span></div><div class="ag-b">
    <div class="ag-m">${crest(a.opp,0,30)}<div><b>${a.venue==="F"?"@ ":"vs "}${esc(a.opp)}</b><span class="meta">${a.comp?`${I.cup}${esc(a.comp)}`:""}${a.place?`${I.pin}${esc(a.place)}`:""}</span></div></div></div></div>`;
  return `<div class="ag"><div class="ag-h"><b>${esc(a.time||"—")}</b><span>Treino</span></div><div class="ag-b">
    <b>${esc(a.theme||"Treino")}</b><span class="meta">${a.dur?`${I.clock}${esc(a.dur)} min`:""}${a.place?`${I.pin}${esc(a.place)}`:""}</span></div></div>`;
}
function vHoje(){
  const d=S.data, t=today(), r=(d&&d.respostas)||{}, hj=agendaDe(t);
  const pendBem=S.fila.find(x=>x.a==="atleta_bem"&&x.d===t), pendPse=S.fila.filter(x=>x.a==="atleta_pse"&&x.d===t);
  const bem=r.bem, tot=bem?bem.i.reduce((s,v)=>s+v,0):null, est=bemEstado(tot);
  const cBem=`<section class="card task"><div class="task-h"><span class="ico" style="--c:#c2185b">${I.heart}</span><div><p class="k">Bem-estar de hoje</p>${bem?`<h2>Respondido às ${esc(bem.h)}</h2>`:pendBem?`<h2>Guardado no telemóvel</h2>`:`<h2>Como estás hoje?</h2>`}</div></div>
    ${bem?`<div class="pills">${BEM_Q.map(([k,,t],j)=>`<span style="--c:${BEM_COR[bem.i[j]-1]}"><i>${bem.i[j]}</i>${esc(cap(t.replace("Qualidade do ","").replace(" geral","").replace(" muscular","")))}</span>`).join("")}</div>
      <p class="sub">Total ${tot}/20 · <b style="color:${est.c}">${est.l}</b></p><p class="note">Já respondeste hoje. Voltas a responder amanhã.</p>`
    : pendBem?`<span class="pend">Guardado no telemóvel — envia quando houver rede</span>`
    : `<p class="sub">4 perguntas rápidas: sono, fadiga, dores e stress.</p><button class="cta" data-a="bem">Responder</button>`}</section>`;
  const sess=hj.length?hj.map(a=>a.tipo==="jogo"?`jogo das ${a.time||"—"}`:`treino das ${a.time||"—"}`).join(" e "):"";
  const cPse=`<section class="card task"><div class="task-h"><span class="ico" style="--c:#e0702a">${I.bolt}</span><div><p class="k">Esforço da sessão (PSE)</p><h2>${(r.pse||[]).length?"Registado":hj.length?`Depois do ${esc(sess)}`:"Sem sessão hoje"}</h2></div></div>
    ${(r.pse||[]).map(p=>`<div class="done"><span class="tick" style="background:${rpeCor(p.rpe||0)}">${esc(p.rpe)}</span><div><b>${esc(p.tipo||"Sessão")}</b><div class="sub">${p.dur?esc(p.dur)+" min · ":""}às ${esc(p.h)}</div></div></div>`).join("")}
    ${pendPse.map(p=>`<span class="pend">${esc(p.tipo)} guardado no telemóvel — envia quando houver rede</span>`).join("")}
    ${(r.pse||[]).length||pendPse.length ? `<p class="note">Já registaste o PSE hoje. Voltas a registar amanhã.</p>`
      : hj.length ? `<p class="sub">Diz-nos quão intenso foi, de 0 a 10.</p><button class="cta" data-a="pse">Registar esforço</button>`
      : `<p class="sub">Hoje não há treino nem jogo marcado.</p><button class="cta sec" data-a="pse">Registar outra sessão</button>`}</section>`;
  const conv=d&&d.conv, prox=((d&&d.agenda)||[]).find(a=>a.tipo==="jogo");
  let cJogo="";
  if(conv) cJogo=`<button class="plain" data-a="tab" data-t="jogo">${matchCard(conv,{chip:`<span class="chip-s ${conv.convocado?"gold":""}">${conv.convocado?"✓ Estás convocado":"Convocatória publicada"}</span>`,
      foot:`<span>${esc(quando(conv.date))}</span>${conv.meetT?`<span>${I.bus}Concentração ${esc(conv.meetT)}</span>`:""}`})}</button>`;
  else if(prox&&diasAte(prox.date)<=7) cJogo=`<button class="plain" data-a="tab" data-t="jogo">${matchCard(prox,{chip:`<span class="chip-s">${esc(quando(prox.date))}</span>`,foot:prox.place?`<span>${I.pin}${esc(prox.place)}</span>`:""})}</button>`;
  const seg=((d&&d.agenda)||[]).filter(a=>a.date>=t).slice(0,3);
  return top(esc(cap(new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"}))))+`<main>${offline()}${cJogo}${cBem}${cPse}${pushCard("hoje")}
    <h3 class="sec-t">A seguir</h3>${seg.length?seg.map(a=>`<div class="ag-day">${esc(dayName(a.date))}</div>${evCard(a)}`).join(""):`<div class="card empty"><b>Sem treinos nem jogos marcados</b></div>`}</main>`;
}
function vAgenda(){
  const t=today(), days=[...Array(14)].map((_,i)=>addDays(t,i));
  const strip=`<div class="wk" role="list">${days.map(iso=>{ const ev=agendaDe(iso), j=ev.some(a=>a.tipo==="jogo"), tr=ev.some(a=>a.tipo==="treino");
    return `<a class="wk-d${iso===t?" on":""}${j?" j":""}" href="#d${iso}" role="listitem"><span>${esc(fmt(iso,{weekday:"short"}).replace(".","").slice(0,3))}</span><b>${toD(iso).getDate()}</b><i class="${j?"dj":tr?"dt":"df"}"></i></a>`; }).join("")}</div>`;
  let out="", folga=[];
  const flushF=()=>{ if(!folga.length) return; const a=folga[0], b=folga[folga.length-1];
    out+=`<div class="folga-r"><span>Folga</span>${esc(a===b?`${dayName(a)}, ${fmt(a,{day:"numeric",month:"short"})}`:`${cap(fmt(a,{weekday:"short",day:"numeric"}))} a ${fmt(b,{weekday:"short",day:"numeric"})}`)}</div>`; folga=[]; };
  days.forEach((iso,i)=>{
    if(i===0) out+=`<h3 class="sec-t">Esta semana</h3>`;
    else if(toD(iso).getDay()===1){ flushF(); out+=`<h3 class="sec-t">${i<7?"Próxima semana":"Daqui a duas semanas"}</h3>`; }
    const ev=agendaDe(iso);
    if(!ev.length){ folga.push(iso); return; }
    flushF();
    out+=`<div class="ag-day" id="d${iso}">${esc(dayName(iso))}<span>${esc(fmt(iso,{day:"numeric",month:"long"}))}</span></div>${ev.map(evCard).join("")}`;
  });
  flushF();
  return top("Treinos e jogos das próximas duas semanas")+`<main>${offline()}${strip}${out}</main>`;
}
function vJogo(){
  const d=S.data||{}, conv=d.conv, prox=(d.agenda||[]).find(a=>a.tipo==="jogo");
  let h="";
  if(conv){
    h+=matchCard(conv,{chip:`<span class="chip-s">${esc(quando(conv.date))}</span>`,foot:conv.place?`<span>${I.pin}${esc(conv.place)}</span>`:""});
    h+=`<section class="card conv ${conv.convocado?"yes":"no"}"><span class="tick">${conv.convocado?"✓":"–"}</span><div><b>${conv.convocado?"Estás convocado":"Não estás convocado para este jogo"}</b>
      ${conv.meetT||conv.meetP?`<span>${I.bus}Concentração: ${esc([conv.meetT,conv.meetP].filter(Boolean).join(" — "))}</span>`:""}</div></section>`;
    if(conv.cnote) h+=`<p class="note">${esc(conv.cnote)}</p>`;
    if(conv.sched&&conv.sched.length) h+=`<section class="card"><p class="k">Horário</p><ol class="tl">${conv.sched.map(s=>`<li><b>${esc(s.t)}</b><span>${esc(s.l)}</span></li>`).join("")}</ol></section>`;
    h+=`<section class="card"><p class="k">Convocados · ${conv.lista.length}</p><div class="squad">${conv.lista.map(p=>`<div class="sq${p.eu?" eu":""}"><span class="num">${esc(p.n)}</span><b>${esc(p.name)}</b></div>`).join("")}</div></section>`;
  } else if(prox){
    h+=matchCard(prox,{chip:`<span class="chip-s">${esc(quando(prox.date))}</span>`,foot:prox.place?`<span>${I.pin}${esc(prox.place)}</span>`:""});
    h+=`<p class="note center">A convocatória aparece aqui quando a equipa técnica a publicar.</p>`;
  } else h+=`<div class="card empty"><b>Sem jogos marcados</b>Quando houver, aparece aqui.</div>`;
  const res=d.resultados||[], ep=d.epoca;
  if(ep&&ep.j){
    const form=res.slice(0,5).reverse();
    h+=`<h3 class="sec-t">A época da equipa</h3><section class="card"><div class="rec">
      <div><b>${ep.j}</b><span>Jogos</span></div><div style="--c:var(--ok)"><b>${ep.V}</b><span>Vitórias</span></div><div style="--c:var(--warn)"><b>${ep.E}</b><span>Empates</span></div><div style="--c:var(--bad)"><b>${ep.D}</b><span>Derrotas</span></div></div>
      <div class="rec-bar">${["V","E","D"].map(k=>ep[k]?`<i style="flex:${ep[k]};background:${RES_C[k]}"></i>`:"").join("")}</div>
      <div class="gls"><span>Golos marcados <b>${ep.gf}</b></span><span>Golos sofridos <b>${ep.ga}</b></span></div>
      ${form.length?`<div class="form"><span class="small">Últimos jogos</span>${form.map(g=>`<i style="background:${RES_C[g.r]}" title="${esc(g.opp)}">${g.r}</i>`).join("")}</div>`:""}</section>`;
    h+=`<h3 class="sec-t">Últimos resultados</h3>${res.map(g=>`<div class="res">
      <div class="res-d"><b>${toD(g.date).getDate()}</b><span>${esc(fmt(g.date,{month:"short"}).replace(".",""))}</span></div>
      ${crest(g.opp,0,34)}<div class="res-t"><b>${g.venue==="F"?"@ ":"vs "}${esc(g.opp)}</b><span>${g.eu?`Tu: ${g.eu.min}'${g.eu.st?" · titular":""}${g.eu.g?` · ⚽ ${g.eu.g}`:""}${g.eu.a?` · 🅰️ ${g.eu.a}`:""}`:esc(g.comp||"")}</span></div>
      <div class="res-s" style="--c:${RES_C[g.r]}"><b>${g.gf}–${g.ga}</b><i>${g.r}</i></div></div>`).join("")}`;
  }
  return top(conv?"Convocatória e resultados":"Próximo jogo e resultados")+`<main>${offline()}${h}</main>`;
}
function ring(p,c){ const R=34, L=2*Math.PI*R;
  return `<svg class="ring" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${R}" fill="none" stroke="var(--line)" stroke-width="9"/>
    <circle cx="42" cy="42" r="${R}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(L*p/100).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 42 42)"/></svg>`; }
function vEu(){
  const d=S.data||{}, me=d.me||{}, n=d.numeros||{}, r=d.respostas||{}, hist=r.hist||[], rk=d.rank||{};
  const pres=n.treinos?Math.round(n.pres/n.treinos*100):null;
  const rks=[["min","em minutos"],["g","em golos"],["a","em assistências"]].filter(([k])=>rk[k]&&rk[k]<=3).map(([k,l])=>`<span>${rk[k]}.º ${l}</span>`).join("");
  const card=`<section class="pcard">
    <div class="pc-ph">${me.foto?`<img src="${me.foto}" alt="">`:`<span>${esc(initials(me.name))}</span>`}</div>
    <div class="pc-id"><b class="pc-n">${esc(me.n||"")}</b><span class="pc-pos">${esc(me.pos||"")}</span></div>
    <h2>${esc(me.full||me.name||"")}</h2>
    ${rks?`<div class="pc-rk">${rks}</div>`:""}
    <div class="pc-st"><div><b>${n.jogos||0}</b><span>Jogos</span></div><div><b>${n.min||0}</b><span>Minutos</span></div><div><b>${n.golos||0}</b><span>Golos</span></div><div><b>${n.assist||0}</b><span>Assist.</span></div></div>
    <div class="pc-st sm"><div><b>${n.titular||0}</b><span>Titular</span></div><div><b>${n.jogos?Math.round((n.min||0)/n.jogos):0}'</b><span>Min./jogo</span></div><div><b>${n.amarelos||0}</b><span>Amarelos</span></div><div><b>${n.vermelhos||0}</b><span>Vermelhos</span></div></div>
  </section>`;
  const pl=(d.presencas||[]).slice().reverse(), cnt={}; pl.forEach(p=>cnt[p.s]=(cnt[p.s]||0)+1);
  const cPres=`<h3 class="sec-t">Presenças nos treinos</h3><section class="card"><div class="pres">
      <div class="pres-r">${ring(pres||0,pres==null?"var(--line)":pres>=90?"var(--ok)":pres>=75?"var(--warn)":"var(--bad)")}<b>${pres==null?"–":pres+"%"}</b></div>
      <div class="pres-c"><div><b>${n.pres||0}</b> de ${n.treinos||0} treinos</div>${["AT","FJ","FI","L"].filter(k=>cnt[k]).map(k=>`<div><i style="background:${ST[k][1]}"></i>${cnt[k]} ${esc(ST[k][0].toLowerCase())}${cnt[k]>1&&k!=="L"?"s":""}</div>`).join("")}</div></div>
    ${pl.length?`<div class="dots">${pl.map(p=>`<i style="background:${ST[p.s]?ST[p.s][1]:"var(--line)"}" title="${esc(fmt(p.date,{day:"numeric",month:"short"}))}: ${esc((ST[p.s]||ST[""])[0])}"></i>`).join("")}</div>
      <div class="dots-x"><span>${esc(fmt(pl[0].date,{day:"numeric",month:"short"}))}</span><span>Último treino</span></div>`:""}</section>`;
  const meus=(d.resultados||[]).filter(g=>g.eu);
  const cJogos=meus.length?`<h3 class="sec-t">Os meus jogos</h3>${meus.map(g=>`<div class="res">
      ${crest(g.opp,0,34)}<div class="res-t"><b>${g.venue==="F"?"@ ":"vs "}${esc(g.opp)}</b><span>${esc(fmt(g.date,{day:"numeric",month:"short"}))}${g.eu.st?" · titular":" · suplente"}</span></div>
      <div class="me-g"><b>${g.eu.min}'</b>${g.eu.g?`<span>⚽ ${g.eu.g}</span>`:""}${g.eu.a?`<span>🅰️ ${g.eu.a}</span>`:""}</div>
      <div class="res-s" style="--c:${RES_C[g.r]}"><b>${g.gf}–${g.ga}</b><i>${g.r}</i></div></div>`).join("")}`:"";
  const t=today(), days=[...Array(14)].map((_,i)=>addDays(t,i-13)), by={}; hist.forEach(h=>by[h.d]=h.t);
  const vals=hist.map(h=>h.t), med=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  const bars=`<div class="bars" role="img" aria-label="Bem-estar dos últimos 14 dias">${days.map(x=>{ const v=by[x]; const e=bemEstado(v);
    return `<i title="${esc(fmt(x,{day:"numeric",month:"short"}))}: ${v==null?"sem resposta":v+"/20"}" style="height:${v==null?4:Math.max(10,(v-4)/16*100)}%;background:${v==null?"var(--line)":e.c}">${v==null?"":`<em>${v}</em>`}</i>`; }).join("")}</div>
    <div class="bars-x">${days.map((x,i)=>`<span>${i%2?"":toD(x).getDate()}</span>`).join("")}</div>`;
  const cBem=`<h3 class="sec-t">O meu bem-estar · 14 dias</h3><section class="card">${med!=null?`<p class="sub" style="margin-bottom:4px">Média <b>${med.toFixed(1)}</b>/20 · ${vals.length} resposta${vals.length>1?"s":""}</p>`:""}${bars}
    <div class="lg"><span><i style="background:var(--ok)"></i>OK 17+</span><span><i style="background:var(--warn)"></i>Atenção 13-16</span><span><i style="background:var(--bad)"></i>Risco ≤12</span></div></section>`;
  return top("A minha época")+`<main>${offline()}${card}${cPres}${cJogos}${cBem}${pushCard("eu")?`<h3 class="sec-t">Avisos</h3>${pushCard("eu")}`:""}
    <details class="card cfg"><summary>Este telemóvel</summary><p class="sub">Para abrires a app como as outras: no iPhone, Partilhar → "Adicionar ao ecrã principal"; no Android, menu ⋮ → "Adicionar ao ecrã principal".</p>
      <button class="cta sec" data-a="refresh">${S.loading?"A atualizar…":"Atualizar"}</button><button class="cta sec" data-a="sair">Desligar este telemóvel</button></details></main>`;
}
function offline(){
  if(S.err==="rede"&&S.at) return `<div class="off">Sem ligação — a mostrar os dados de ${esc(new Date(S.at).toLocaleString("pt-PT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}.</div>`;
  if(S.err&&S.err!=="rede"&&S.err!=="link") return `<div class="off">${esc(S.err)}</div>`;
  return "";
}
/* ---- formulários ---- */
function vBemForm(){
  const f=S.form, op=(S.data&&S.data.opcoes&&S.data.opcoes.bem)||{};
  const full=f.i.every(v=>v);
  return `<div class="sheet"><div class="sheet-in"><div class="sheet-h"><h2>Bem-estar de hoje</h2><button class="x" data-a="fechar" aria-label="Fechar">✕</button></div>
    ${BEM_Q.map(([k,q,t],j)=>`<section class="q" id="q${j}"><h3>${esc(q)}<small>${esc(t)}</small></h3><div class="opts" role="group" aria-label="${esc(t)}">
      ${[5,4,3,2,1].map(n=>{ const txt=(op[k]||[]).find(x=>parseInt(x,10)===n)||String(n); return `<button class="opt" data-a="bemOpt" data-j="${j}" data-n="${n}" aria-pressed="${f.i[j]===n}"><i style="background:${BEM_COR[n-1]}">${n}</i>${esc(lbl(txt)||n)}</button>`; }).join("")}
    </div></section>`).join("")}
    <button class="cta" data-a="bemEnviar" ${full&&!f.busy?"":"disabled"}>${f.busy?"A enviar…":full?"Enviar":"Responde às 4 perguntas"}</button></div></div>`;
}
function vPseForm(){
  const f=S.form, op=(S.data&&S.data.opcoes&&S.data.opcoes.pse)||{}, tipos=(op.tipos&&op.tipos.length?op.tipos:["Treino","Jogo","Recuperação"]);
  const rl=n=>{ const x=(op.rpe||[]).find(v=>parseInt(v,10)===n&&/[a-zà-ú]/i.test(v)); return x?lbl(x):RPE[n]; };
  const ok=f.tipo&&f.rpe!=null&&f.dur>0;
  return `<div class="sheet"><div class="sheet-in"><div class="sheet-h"><h2>Esforço da sessão</h2><button class="x" data-a="fechar" aria-label="Fechar">✕</button></div>
    <section class="q"><h3>Que sessão?</h3><div class="chips">${tipos.map(t=>`<button class="chip" data-a="pseTipo" data-v="${esc(t)}" aria-pressed="${f.tipo===t}">${esc(t)}</button>`).join("")}</div></section>
    <section class="q"><h3>Quanto tempo?<small>Em minutos, do aquecimento ao fim</small></h3><div class="dur"><button data-a="pseDur" data-n="-5" aria-label="Menos 5 minutos">−</button><input id="pseDur" inputmode="numeric" value="${esc(f.dur||"")}" aria-label="Minutos"><button data-a="pseDur" data-n="5" aria-label="Mais 5 minutos">+</button></div></section>
    <section class="q rpe"><h3>Quão intenso foi?<small>0 = repouso · 10 = esforço máximo</small></h3><div class="opts">
      ${[10,9,8,7,6,5,4,3,2,1,0].map(n=>`<button class="opt" data-a="pseRpe" data-n="${n}" aria-pressed="${f.rpe===n}"><i style="background:${rpeCor(n)}">${n}</i>${esc(rl(n))}</button>`).join("")}</div></section>
    ${(op.sens||[]).length?`<section class="q"><h3>Como te sentes?<small>Opcional</small></h3><div class="chips">${op.sens.map(t=>`<button class="chip" data-a="pseSen" data-v="${esc(t)}" aria-pressed="${f.sen===t}">${esc(t)}</button>`).join("")}</div></section>`:""}
    <button class="cta" data-a="pseEnviar" ${ok&&!f.busy?"":"disabled"}>${f.busy?"A enviar…":ok?"Enviar":"Escolhe a sessão, o tempo e o esforço"}</button></div></div>`;
}
function vObrigado(){
  return `<div class="sheet"><div class="sheet-in ok-big"><span class="tick">✓</span><h2>${esc(S.view.t)}</h2><p class="sub">${esc(S.view.s||"")}</p><button class="cta" data-a="fechar">Voltar</button></div></div>`;
}
/* ---- desenho ---- */
function render(){
  const app=$("#app"); const sy=window.scrollY;
  if(!S.cfg||S.err==="link"){ app.innerHTML=vLink(); return; }
  if(!S.data){ app.innerHTML=top()+`<main><div class="card empty"><b>${S.err==="rede"?"Sem ligação":"A carregar…"}</b>${S.err==="rede"?"Liga os dados móveis ou o Wi-Fi e tenta de novo.":""}${S.err==="rede"?`<button class="cta" data-a="refresh">Tentar de novo</button>`:""}</div></main>`; return; }
  const v={hoje:vHoje,agenda:vAgenda,jogo:vJogo,eu:vEu}[S.tab]();
  const nav=`<nav class="tabs" aria-label="Secções">${[["hoje","Hoje"],["agenda","Agenda"],["jogo","Jogos"],["eu","Eu"]].map(([k,l])=>`<button data-a="tab" data-t="${k}" ${S.tab===k?'aria-current="page"':""}>${IC[k]}${l}</button>`).join("")}</nav>`;
  const sheet=S.view==="bem"?vBemForm():S.view==="pse"?vPseForm():S.view&&S.view.t?vObrigado():"";
  app.innerHTML=v+nav+sheet;
  document.documentElement.style.overflow=sheet?"hidden":"";
  if(!sheet) window.scrollTo(0,sy);
}
/* ---- ações ---- */
const A={
  pushOn:async()=>{
    const bt=$("#pushCard .cta"); if(bt){ bt.disabled=true; bt.textContent="A ligar…"; }
    try{
      const perm=await Notification.requestPermission();
      if(perm!=="granted"){ toast(perm==="denied"?"Avisos bloqueados — vê como os permitir.":"Sem autorização para avisos."); render(); return; }
      const reg=await navigator.serviceWorker.register("sw.js"); await navigator.serviceWorker.ready;
      const key=u8(S.data.push.key); let sub=await reg.pushManager.getSubscription();
      if(sub){ const k=sub.options&&sub.options.applicationServerKey; if(k&&btoa(String.fromCharCode(...new Uint8Array(k)))!==btoa(String.fromCharCode(...key))){ await sub.unsubscribe(); sub=null; } }
      if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      await swCfg();
      await apiPost({a:"atleta_push",sub:sub.toJSON?sub.toJSON():{endpoint:sub.endpoint}});
      ls.set(":push",sub.endpoint); toast("Avisos ligados ✓ — vais receber um aviso de teste");
      apiPost({a:"atleta_push_teste"}).catch(()=>{});
    }catch(e){ toast("Não foi possível ligar os avisos"+(e&&e.message?": "+e.message:"")); }
    render(); },
  pushOff:async()=>{
    try{ const reg=await navigator.serviceWorker.getRegistration(); const sub=reg&&await reg.pushManager.getSubscription();
      if(sub){ await apiPost({a:"atleta_push",sub:{endpoint:sub.endpoint},on:false}).catch(()=>{}); await sub.unsubscribe().catch(()=>{}); } }catch(e){}
    ls.del(":push"); toast("Avisos desligados neste telemóvel"); render(); },
  pushTeste:async()=>{ try{ const r=await apiPost({a:"atleta_push_teste"}); toast(r.enviados?"Aviso de teste enviado — deve chegar em segundos":"O aviso não chegou a sair. Desliga e volta a ligar."); }catch(e){ toast(e.message||"Sem ligação."); } },
  pushDepois:()=>{ ls.set(":pushdepois",Date.now()+7*864e5); render(); },
  tab:el=>{ S.tab=el.dataset.t; S.view=null; window.scrollTo(0,0); render(); },
  refresh:()=>{ flush(); load(true); },
  sair:()=>{ if(!window.confirm||window.confirm("Desligar a app deste telemóvel? Vais precisar do link outra vez.")){ ls.del(":cfg"); ls.del(":dados"); ls.del(":fila"); S.cfg=null; S.data=null; render(); } },
  fechar:()=>{ S.view=null; S.form=null; render(); },
  bem:async()=>{ if(!(await livre("bem"))) return; S.form={i:[0,0,0,0]}; S.view="bem"; render(); $(".sheet").scrollTop=0; },
  bemOpt:el=>{ const j=+el.dataset.j; S.form.i[j]=+el.dataset.n; const sc=$(".sheet").scrollTop; render(); const sh=$(".sheet"); sh.scrollTop=sc;
    const nx=$("#q"+(j+1)); if(nx&&!S.form.i[j+1]) nx.scrollIntoView({behavior:"smooth",block:"start"}); else if(S.form.i.every(v=>v)) $(".sheet .cta").scrollIntoView({behavior:"smooth",block:"end"}); },
  bemEnviar:async()=>{ const f=S.form; if(!f.i.every(v=>v)||f.busy) return; f.busy=true; render();
    try{ const r=await send({a:"atleta_bem",i:f.i,d:today()});
      if(r.fila){ S.view={t:"Guardado no telemóvel",s:"Sem rede agora — enviamos assim que houver ligação."}; }
      else { const tot=f.i.reduce((s,v)=>s+v,0); S.view={t:"Obrigado!",s:`Bem-estar de hoje: ${tot}/20.`}; load(); }
    }catch(e){ f.busy=false; if(e.link){ S.err="link"; S.view=null; } else { toast(e.message||"Não foi possível enviar."); if(e.ja){ S.view=null; load(); } } }
    S.form=null; render(); },
  pse:async()=>{ if(!(await livre("pse"))) return; const t=today(), ev=((S.data&&S.data.agenda)||[]).filter(a=>a.date===t), g=ev.find(a=>a.tipo==="jogo"), tr=ev.find(a=>a.tipo==="treino");
    const tipos=(S.data&&S.data.opcoes&&S.data.opcoes.pse&&S.data.opcoes.pse.tipos)||[];
    const pick=w=>tipos.find(x=>x.toLowerCase().startsWith(w))||(w==="jogo"?"Jogo":"Treino");
    const tipo=g?pick("jogo"):tr?pick("treino"):null, dur=g?(g.dur||90):tr?(tr.dur||90):60;
    S.form={tipo,dur,rpe:null,sen:null}; S.view="pse"; render(); $(".sheet").scrollTop=0; },
  pseTipo:el=>{ S.form.tipo=el.dataset.v; keep(); },
  pseDur:el=>{ const i=$("#pseDur"); S.form.dur=Math.max(5,Math.min(300,(parseInt(i.value,10)||0)+ +el.dataset.n)); keep(); },
  pseRpe:el=>{ S.form.rpe=+el.dataset.n; keep(); },
  pseSen:el=>{ S.form.sen=S.form.sen===el.dataset.v?null:el.dataset.v; keep(); },
  pseEnviar:async()=>{ const f=S.form; const di=$("#pseDur"); if(di) f.dur=parseInt(di.value,10)||f.dur;
    if(!(f.tipo&&f.rpe!=null&&f.dur>0)||f.busy) return; f.busy=true; render();
    try{ const r=await send({a:"atleta_pse",tipo:f.tipo,dur:f.dur,rpe:f.rpe,sen:f.sen||"",d:today()});
      S.view = r.fila ? {t:"Guardado no telemóvel",s:"Sem rede agora — enviamos assim que houver ligação."} : {t:"Obrigado!",s:`${f.tipo} · PSE ${f.rpe} · ${f.dur} min.`};
      if(!r.fila) load();
    }catch(e){ f.busy=false; if(e.link){ S.err="link"; S.view=null; } else { toast(e.message||"Não foi possível enviar."); if(e.ja){ S.view=null; load(); } } }
    S.form=null; render(); }
};
function keep(){ const sh=$(".sheet"), sc=sh?sh.scrollTop:0; const di=$("#pseDur"); if(di&&S.form&&document.activeElement===di) S.form.dur=parseInt(di.value,10)||S.form.dur; render(); const s2=$(".sheet"); if(s2) s2.scrollTop=sc; }
document.addEventListener("click",e=>{ const el=e.target.closest("[data-a]"); if(!el) return; const fn=A[el.dataset.a]; if(fn) fn(el,e); });
document.addEventListener("input",e=>{ if(e.target.id==="pseDur"&&S.form){ S.form.dur=parseInt(e.target.value,10)||0; const b=$(".sheet .cta"); const ok=S.form.tipo&&S.form.rpe!=null&&S.form.dur>0; if(b){ b.disabled=!ok; b.textContent=ok?"Enviar":"Escolhe a sessão, o tempo e o esforço"; } } });
render(); flush(); load();
setInterval(()=>{ if(!document.hidden&&!S.view) load(); }, 5*60*1000);
