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
  if(location.hash) try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
})();
document.documentElement.style.setProperty("--wm",`url("${CREST}")`);
(()=>{ const l=document.createElement("link"); l.rel="apple-touch-icon"; l.href=CREST; document.head.appendChild(l); })();

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
  const j=await r.json(); if(j.erro) throw Object.assign(new Error(j.msg||j.erro),{srv:true,link:j.erro==="link"}); return j;
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
function top(sub){
  const d=S.data, eq=(d&&d.equipa&&d.equipa.curto)||"Estrela B", nm=d&&d.me?first(d.me.name):"";
  const h=new Date().getHours(), ola=h<13?"Bom dia":h<20?"Boa tarde":"Boa noite";
  return `<header class="top"><div class="top-r"><img src="${CREST}" alt=""><div><small>${esc(eq)}</small><h1>${nm?`${ola}, ${esc(nm)}`:"App do atleta"}</h1></div></div>${sub?`<p>${sub}</p>`:""}</header>`;
}
function vLink(){
  return top()+`<main><div class="card empty"><b>${S.err==="link"?"Este link já não é válido":"Abre o teu link pessoal"}</b>
    ${S.err==="link"?"A equipa técnica gerou um link novo para ti (ou retirou o acesso). Pede-lhes o link atual e abre-o neste telemóvel.":"A equipa técnica envia-te um link só teu (por WhatsApp). Abre-o neste telemóvel uma vez e a app fica pronta."}</div></main>`;
}
const agendaDe = iso => ((S.data&&S.data.agenda)||[]).filter(a=>a.date===iso);
function evLine(a){
  const d=toD(a.date);
  const what = a.tipo==="jogo" ? `<b>${a.venue==="F"?"@ ":"vs "}${esc(a.opp)}</b><span>${esc([a.time,a.comp,a.place].filter(Boolean).join(" · "))}</span>`
    : `<b>Treino${a.time?" · "+esc(a.time):""}</b><span>${esc([a.dur?a.dur+"'":"",a.theme,a.place].filter(Boolean).join(" · "))||"&nbsp;"}</span>`;
  return `<div class="ev"><div class="d"><b>${d.getDate()}</b><span>${esc(fmt(a.date,{weekday:"short"}).replace(".",""))}</span></div><div class="t">${what}</div>${a.tipo==="jogo"?`<span class="tag jogo">Jogo</span>`:""}</div>`;
}
function vHoje(){
  const d=S.data, t=today(), r=(d&&d.respostas)||{}, hj=agendaDe(t);
  const pendBem=S.fila.find(x=>x.a==="atleta_bem"&&x.d===t), pendPse=S.fila.filter(x=>x.a==="atleta_pse"&&x.d===t);
  const bem=r.bem;
  const tot=bem?bem.i.reduce((s,v)=>s+v,0):null, est=bemEstado(tot);
  const cBem=`<section class="card"><p class="k">Bem-estar de hoje</p>${bem?`<div class="done"><span class="tick">✓</span><div><b>Respondido às ${esc(bem.h)}</b><div class="sub">Total ${tot}/20 · <span style="color:${est.c};font-weight:700">${est.l}</span></div></div></div>
      <button class="cta sec" data-a="bem">Corrigir</button>` : pendBem?`<span class="pend">Guardado no telemóvel — envia quando houver rede</span>`
      : `<h2>Como estás hoje?</h2><p class="sub">4 perguntas rápidas: sono, fadiga, dores e stress.</p><button class="cta" data-a="bem">Responder</button>`}</section>`;
  const sess=hj.length?hj.map(a=>a.tipo==="jogo"?`jogo às ${a.time||"—"}`:`treino às ${a.time||"—"}`).join(" e "):"";
  const cPse=`<section class="card"><p class="k">Esforço da sessão (PSE)</p>
    ${(r.pse||[]).map(p=>`<div class="done"><span class="tick">✓</span><div><b>${esc(p.tipo||"Sessão")} · PSE ${esc(p.rpe)}</b><div class="sub">${p.dur?esc(p.dur)+" min · ":""}às ${esc(p.h)}</div></div></div>`).join("")}
    ${pendPse.map(p=>`<span class="pend">${esc(p.tipo)} guardado no telemóvel — envia quando houver rede</span>`).join("")}
    ${(r.pse||[]).length||pendPse.length ? `<button class="cta sec" data-a="pse">Corrigir ou outra sessão</button>`
      : hj.length ? `<h2>Depois do ${esc(sess)}</h2><p class="sub">Diz-nos quão intenso foi, de 0 a 10.</p><button class="cta" data-a="pse">Registar esforço</button>`
      : `<p class="sub">Hoje não há treino nem jogo marcado.</p><button class="cta sec" data-a="pse">Registar outra sessão</button>`}</section>`;
  const conv=d&&d.conv;
  const cConv=conv?`<button class="card banner" data-a="tab" data-t="jogo" style="width:100%;text-align:left"><span class="tick" style="background:${conv.convocado?"var(--ouro)":"#ffffff33"};color:#2a0512">${conv.convocado?"✓":"–"}</span><div><b>${conv.convocado?"Estás convocado":"Convocatória publicada"}</b><span>${esc(dayName(conv.date))} · ${conv.venue==="F"?"@ ":"vs "}${esc(conv.opp)}${conv.meetT?` · concentração ${esc(conv.meetT)}`:""}</span></div></button>`:"";
  const prox=((d&&d.agenda)||[]).filter(a=>a.date>t||(a.date===t)).slice(0,3);
  return top(esc(cap(new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"}))))+`<main>${offline()}${cConv}${cBem}${cPse}
    <section class="card"><p class="k">A seguir</p>${prox.length?prox.map(evLine).join(""):`<p class="sub">Sem treinos nem jogos marcados.</p>`}</section></main>`;
}
function vAgenda(){
  const t=today(), days=[...Array(10)].map((_,i)=>addDays(t,i));
  return top("Treinos e jogos dos próximos dias")+`<main>${offline()}${days.map(iso=>{ const ev=agendaDe(iso);
    return `<div class="day">${esc(dayName(iso))}${iso!==t&&iso!==addDays(t,1)?"":" · "+esc(fmt(iso,{weekday:"long"}))}, ${esc(fmt(iso,{day:"numeric",month:"short"}))}</div>
      ${ev.length?`<section class="card" style="padding:6px 14px">${ev.map(evLine).join("")}</section>`:`<div class="folga">Folga</div>`}`; }).join("")}</main>`;
}
function vJogo(){
  const d=S.data, conv=d&&d.conv, prox=((d&&d.agenda)||[]).find(a=>a.tipo==="jogo");
  if(!conv) return top("Próximo jogo")+`<main>${offline()}${prox?`<section class="card"><p class="k">${esc(dayName(prox.date))}, ${esc(fmt(prox.date,{day:"numeric",month:"long"}))}</p>
      <h2>${prox.venue==="F"?"@ ":"vs "}${esc(prox.opp)}</h2><p class="sub">${esc([prox.time,prox.comp,prox.place].filter(Boolean).join(" · "))}</p>
      <p class="note">A convocatória aparece aqui quando a equipa técnica a publicar.</p></section>`:`<div class="card empty"><b>Sem jogos marcados</b>Quando houver, aparece aqui.</div>`}</main>`;
  return top("Convocatória")+`<main>${offline()}
    <section class="card"><p class="k">${esc(dayName(conv.date))}, ${esc(fmt(conv.date,{day:"numeric",month:"long"}))}${conv.time?" · "+esc(conv.time):""}</p>
      <h2>${conv.venue==="F"?"@ ":"vs "}${esc(conv.opp)}</h2><p class="sub">${esc([conv.comp,conv.place].filter(Boolean).join(" · "))}</p>
      <div class="done"><span class="tick" style="${conv.convocado?"":"background:var(--muted)"}">${conv.convocado?"✓":"–"}</span><b>${conv.convocado?"Estás convocado":"Não estás convocado para este jogo"}</b></div>
      ${conv.meetT||conv.meetP?`<p style="margin:12px 0 0"><b>Concentração:</b> ${esc([conv.meetT,conv.meetP].filter(Boolean).join(" — "))}</p>`:""}
      ${conv.cnote?`<p class="note">${esc(conv.cnote)}</p>`:""}</section>
    ${conv.sched&&conv.sched.length?`<section class="card"><p class="k">Horário</p><ul class="list">${conv.sched.map(s=>`<li><b style="width:56px">${esc(s.t)}</b><span>${esc(s.l)}</span></li>`).join("")}</ul></section>`:""}
    <section class="card"><p class="k">Convocados (${conv.lista.length})</p><ul class="list">${conv.lista.map(p=>`<li class="${p.eu?"eu":""}"><span class="num">${esc(p.n)}</span><b>${esc(p.name)}</b></li>`).join("")}</ul></section></main>`;
}
function vEu(){
  const d=S.data||{}, me=d.me||{}, n=d.numeros||{}, r=d.respostas||{}, hist=r.hist||[];
  const pres=n.treinos?Math.round(n.pres/n.treinos*100):null;
  const t=today(), days=[...Array(14)].map((_,i)=>addDays(t,i-13)), by={}; hist.forEach(h=>by[h.d]=h.t);
  const bars=`<div class="bars" role="img" aria-label="Bem-estar dos últimos 14 dias">${days.map(x=>{ const v=by[x]; const e=bemEstado(v);
    return `<i title="${esc(fmt(x,{day:"numeric",month:"short"}))}: ${v==null?"sem resposta":v+"/20"}" style="height:${v==null?3:Math.max(8,(v-4)/16*100)}%;background:${v==null?"var(--line)":e.c}"></i>`; }).join("")}</div>
    <div class="bars-x">${days.map((x,i)=>`<span>${i%2?"":toD(x).getDate()}</span>`).join("")}</div>`;
  return top(esc([me.n?"N.º "+me.n:"",me.pos].filter(Boolean).join(" · ")))+`<main>${offline()}
    <section class="card"><p class="k">A minha época</p><div class="nums">
      <div><b>${n.jogos||0}</b><span>Jogos</span></div><div><b>${n.min||0}</b><span>Minutos</span></div><div><b>${n.titular||0}</b><span>Titular</span></div>
      <div><b>${n.golos||0}</b><span>Golos</span></div><div><b>${n.assist||0}</b><span>Assistências</span></div><div><b>${pres==null?"–":pres+"%"}</b><span>Presenças</span></div></div>
      ${(n.amarelos||n.vermelhos)?`<p class="note">Cartões: ${n.amarelos||0} amarelo(s), ${n.vermelhos||0} vermelho(s).</p>`:""}</section>
    <section class="card"><p class="k">O meu bem-estar — 14 dias</p>${bars}<p class="note">Total de 4 a 20 (sono + fadiga + dores + stress). Verde OK, amarelo atenção, vermelho risco.</p></section>
    ${(d.jogos||[]).length?`<section class="card"><p class="k">Últimos jogos</p><ul class="list">${d.jogos.map(g=>`<li><div style="flex:1"><b>${g.venue==="F"?"@ ":"vs "}${esc(g.opp)}</b><div class="sub">${esc(fmt(g.date,{day:"numeric",month:"short"}))}${g.st?" · titular":""}</div></div><span>${g.min}'${g.g?` · ⚽ ${g.g}`:""}${g.a?` · 🅰️ ${g.a}`:""}</span></li>`).join("")}</ul></section>`:""}
    <section class="card"><p class="k">Este telemóvel</p><p class="sub">Para abrires a app como as outras: no iPhone, Partilhar → "Adicionar ao ecrã principal"; no Android, menu ⋮ → "Adicionar ao ecrã principal".</p>
      <button class="cta sec" data-a="refresh">${S.loading?"A atualizar…":"Atualizar"}</button><button class="cta sec" data-a="sair">Desligar este telemóvel</button></section></main>`;
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
  const nav=`<nav class="tabs" aria-label="Secções">${[["hoje","Hoje"],["agenda","Agenda"],["jogo","Jogo"],["eu","Eu"]].map(([k,l])=>`<button data-a="tab" data-t="${k}" ${S.tab===k?'aria-current="page"':""}>${IC[k]}${l}</button>`).join("")}</nav>`;
  const sheet=S.view==="bem"?vBemForm():S.view==="pse"?vPseForm():S.view&&S.view.t?vObrigado():"";
  app.innerHTML=v+nav+sheet;
  document.documentElement.style.overflow=sheet?"hidden":"";
  if(!sheet) window.scrollTo(0,sy);
}
/* ---- ações ---- */
const A={
  tab:el=>{ S.tab=el.dataset.t; S.view=null; window.scrollTo(0,0); render(); },
  refresh:()=>{ flush(); load(true); },
  sair:()=>{ if(!window.confirm||window.confirm("Desligar a app deste telemóvel? Vais precisar do link outra vez.")){ ls.del(":cfg"); ls.del(":dados"); ls.del(":fila"); S.cfg=null; S.data=null; render(); } },
  fechar:()=>{ S.view=null; S.form=null; render(); },
  bem:()=>{ const b=S.data&&S.data.respostas&&S.data.respostas.bem; S.form={i:b?b.i.slice():[0,0,0,0]}; S.view="bem"; render(); $(".sheet").scrollTop=0; },
  bemOpt:el=>{ const j=+el.dataset.j; S.form.i[j]=+el.dataset.n; const sc=$(".sheet").scrollTop; render(); const sh=$(".sheet"); sh.scrollTop=sc;
    const nx=$("#q"+(j+1)); if(nx&&!S.form.i[j+1]) nx.scrollIntoView({behavior:"smooth",block:"start"}); else if(S.form.i.every(v=>v)) $(".sheet .cta").scrollIntoView({behavior:"smooth",block:"end"}); },
  bemEnviar:async()=>{ const f=S.form; if(!f.i.every(v=>v)||f.busy) return; f.busy=true; render();
    try{ const r=await send({a:"atleta_bem",i:f.i,d:today()});
      if(r.fila){ S.view={t:"Guardado no telemóvel",s:"Sem rede agora — enviamos assim que houver ligação."}; }
      else { const tot=f.i.reduce((s,v)=>s+v,0); S.view={t:r.corrigido?"Corrigido":"Obrigado!",s:`Bem-estar de hoje: ${tot}/20.`}; load(); }
    }catch(e){ f.busy=false; if(e.link){ S.err="link"; S.view=null; } else toast(e.message||"Não foi possível enviar."); }
    S.form=null; render(); },
  pse:()=>{ const t=today(), ev=((S.data&&S.data.agenda)||[]).filter(a=>a.date===t), g=ev.find(a=>a.tipo==="jogo"), tr=ev.find(a=>a.tipo==="treino");
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
      S.view = r.fila ? {t:"Guardado no telemóvel",s:"Sem rede agora — enviamos assim que houver ligação."} : {t:r.corrigido?"Corrigido":"Obrigado!",s:`${f.tipo} · PSE ${f.rpe} · ${f.dur} min.`};
      if(!r.fila) load();
    }catch(e){ f.busy=false; if(e.link){ S.err="link"; S.view=null; } else toast(e.message||"Não foi possível enviar."); }
    S.form=null; render(); }
};
function keep(){ const sh=$(".sheet"), sc=sh?sh.scrollTop:0; const di=$("#pseDur"); if(di&&S.form&&document.activeElement===di) S.form.dur=parseInt(di.value,10)||S.form.dur; render(); const s2=$(".sheet"); if(s2) s2.scrollTop=sc; }
document.addEventListener("click",e=>{ const el=e.target.closest("[data-a]"); if(!el) return; const fn=A[el.dataset.a]; if(fn) fn(el,e); });
document.addEventListener("input",e=>{ if(e.target.id==="pseDur"&&S.form){ S.form.dur=parseInt(e.target.value,10)||0; const b=$(".sheet .cta"); const ok=S.form.tipo&&S.form.rpe!=null&&S.form.dur>0; if(b){ b.disabled=!ok; b.textContent=ok?"Enviar":"Escolhe a sessão, o tempo e o esforço"; } } });
render(); flush(); load();
setInterval(()=>{ if(!document.hidden&&!S.view) load(); }, 5*60*1000);
