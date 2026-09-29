/* ================= painel: próximo jogo, prontidão resumida, semana, notificações ================= */
// Desenho inspirado no conceito "Noite de jogo", nas cores da app: cartão grande do próximo jogo, prontidão e carga
// em resumo (o detalhe fica no separador Monitorização), "Precisa de atenção hoje" com frases curtas,
// a semana na horizontal e os alertas da app num sino no canto superior direito (como mensagens).

/* ---- próximo jogo ---- */
function countdown(g){
  const [h,m]=String(g.time||"15:00").split(":").map(Number), k=toD(g.date); k.setHours(h||0,m||0,0,0);
  const ms=k-Date.now(), dd=dayDiff(todayISO(),g.date);
  if(dd===0) return ms>0?`${Math.floor(ms/36e5)}H ${pad(Math.floor(ms%36e5/6e4))}M`:"HOJE";
  if(ms<=0) return "HOJE";
  const d=Math.floor(ms/864e5), hh=Math.floor(ms%864e5/36e5);
  return d ? `${d}D ${pad(hh)}H` : `${hh}H ${pad(Math.floor(ms%36e5/6e4))}M`;
}
function nextMatchCard(){
  const t=todayISO(), g=games().find(x=>x.date>=t&&!x.closed);
  if(!g) return `<section class="card nx nx-empty"><div class="nx-k">Próximo jogo</div><div class="empty" style="color:#fff"><b>Sem jogos marcados</b><button class="btn sm" data-a="newEvent" data-type="jogo" style="margin-top:8px">+ Jogo</button></div></section>`;
  const m=meta(), dd=dayDiff(t,g.date), oSrc=oppCrestSrc(oppByName(g.opp));
  const call=(g.call||[]).length, out=players().filter(p=>avail(p.id)!=="ok").length;
  const chips=[`<span class="nx-chip gold">${dd===0?"MD":"MD-"+dd}</span>`,
    call?`<span class="nx-chip">${call} convocados</span>`:`<span class="nx-chip">Convocatória por fazer</span>`,
    out?`<span class="nx-chip">${out} indisponíve${out>1?"is":"l"}</span>`:"",
    g.meetT?`<span class="nx-chip">Concentração ${esc(g.meetT)}</span>`:""].join("");
  // prontidão do onze (ou dos convocados) quando há monitorização
  let pr="";
  const ids=(g.xi||[]).length?g.xi:(g.call||[]);
  if(MON.data){ const {map}=monMatch(), byPid={}; Object.entries(map).forEach(([n,pid])=>{ const j=MON.data.jogadores.find(x=>x.nome===n); if(j) byPid[pid]=j; });
    const src=ids.length?ids:Object.keys(byPid).filter(pid=>avail(pid)==="ok"&&byPid[pid].estado==="Disponível").sort((a,b)=>byPid[b].prontidao-byPid[a].prontidao);
    const rows=src.map(pid=>({p:P(pid),j:byPid[pid]})).filter(x=>x.p&&x.j&&x.j.prontidao!=null).slice(0,ids.length?11:10);
    if(rows.length) pr=`<div class="nx-k" style="margin-top:18px">${(g.xi||[]).length?"Prontidão do onze":ids.length?"Prontidão dos convocados":"Mais prontos para o jogo"}</div><div class="nx-pr">${rows.map(({p,j})=>`<span>${esc(p.name)}</span><b class="${j.prontidao<65?"lo":""}">${Math.round(j.prontidao)}</b><i><em style="width:${Math.max(4,Math.min(100,j.prontidao))}%"></em></i>`).join("")}</div>`; }
  const us=`<div class="nx-t"><span class="nx-c"><img src="${CREST}" alt=""></span><b>${esc(m.team||"Estrela B")}</b></div>`;
  const th=`<div class="nx-t"><span class="nx-c">${oSrc?`<img src="${esc(oSrc)}" alt="">`:`<i>${esc(g.opp?initials(g.opp):"?")}</i>`}</span><b>${esc(g.opp||"Adversário")}</b></div>`;
  return `<section class="card nx"><div class="nx-k">Próximo jogo${g.phase?" · "+esc(g.phase):""}</div>
    <div class="nx-vs">${g.venue==="F"?th+`<div class="nx-clk"><b>${countdown(g)}</b><small>${esc(cap1(fmtD(g.date,{weekday:"long",day:"numeric",month:"short"})))} · ${esc(g.time||"")} · ${g.venue==="F"?"Fora":"Casa"}</small></div>`+us
      :us+`<div class="nx-clk"><b>${countdown(g)}</b><small>${esc(cap1(fmtD(g.date,{weekday:"long",day:"numeric",month:"short"})))} · ${esc(g.time||"")} · ${g.venue==="F"?"Fora":"Casa"}</small></div>`+th}</div>
    <div class="nx-chips">${chips}</div>${pr}
    <div class="nx-act"><button class="btn sm" data-a="page" data-p="jogo" data-id="${esc(g.id)}">Ficha do jogo</button><button class="btn sm" data-a="convOpen" data-id="${esc(g.id)}">Convocatória</button></div></section>`;
}

/* ---- prontidão e carga (resumo) + precisa de atenção hoje ---- */
function monRing(v){
  const r=34, c=2*Math.PI*r, k=v==null?0:Math.max(0,Math.min(100,v))/100;
  return `<svg class="ring" viewBox="0 0 84 84" width="84" height="84"><defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#8f2239"/><stop offset="1" stop-color="#f2bd4b"/></linearGradient></defs>
    <circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--line)" stroke-width="9"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="url(#rg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c*k).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/>
    <text x="42" y="51" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="27" fill="var(--text)">${v==null?"–":Math.round(v)}</text></svg>`;
}
// frase curta e etiqueta para cada jogador que precisa de atenção
function monAttn(j){
  const n1=x=>String(Math.round(x*10)/10).replace(".",","), n2=x=>String(Math.round(x*100)/100).replace(".",",");
  if(j.estado&&j.estado!=="Disponível") return {t:`${j.estado}${j.estadoNota?" · "+j.estadoNota:""}`,l:"Clínico",c:"ok"};
  if(j.estadoBem==="sem resposta"||j.prontidao==null) return {t:j.nResp?`Sem respostas recentes`:"Ainda sem respostas",l:"Perguntar",c:"warn"};
  const crit=j.critico?` · ${String(j.critico).replace(/\s*\(([\d.]+)\)/,(m,v)=>" "+n1(+v)).toLowerCase()}`:"";
  if(j.prontidao<50||j.estadoBem==="RISCO") return {t:`Prontidão ${Math.round(j.prontidao)}${crit}`,l:"Decidir",c:"bad"};
  if(j.estadoCarga==="PICO DE CARGA") return {t:`Pico de carga${j.acwr!=null?` (ACWR ${n2(j.acwr)})`:""}`,l:"Gerir minutos",c:"warn"};
  if(j.estadoCarga==="A subir") return {t:`Carga a subir depressa${j.acwr!=null?` (ACWR ${n2(j.acwr)})`:""}`,l:"Gerir minutos",c:"warn"};
  if(j.estadoBem==="Atenção") return {t:`Bem-estar abaixo do habitual${crit}`,l:"Vigiar",c:"warn"};
  return {t:`Prontidão ${Math.round(j.prontidao)}${crit}`,l:"Vigiar",c:"warn"};
}
function monPanel(){
  const c=monCfg();
  if(!c.url) return {top:`<section class="card mp"><div class="card-h"><h3>Prontidão</h3><button class="btn sm" data-a="monCfg">Ligar ao Sheets</button></div><div class="card-b small muted">Liga o painel de monitorização para veres aqui a prontidão, a carga e quem precisa de atenção.</div></section>`,att:""};
  const d=MON.data;
  if(!d) return {top:`<section class="card mp"><div class="card-h"><h3>Prontidão</h3><button class="btn sm" data-a="monRefresh">${MON.loading?"A carregar…":"Atualizar"}</button></div><div class="card-b small muted">${MON.loading?"A ler o Google Sheets…":esc(MON.err||"Ainda sem dados.")}</div></section>`,att:""};
  const js=d.jogadores, disp=js.filter(j=>j.estado==="Disponível"||!j.estado), com=disp.filter(j=>j.prontidao!=null);
  const med=com.length?avg(com.map(j=>j.prontidao)):null, ac=com.filter(j=>j.prontidao>=65).length;
  const vig=com.filter(j=>j.prontidao<65&&j.prontidao>=50).length+js.filter(j=>j.estadoBem==="Atenção").length, risco=js.filter(j=>j.estadoBem==="RISCO"||(j.prontidao!=null&&j.prontidao<50)).length;
  const c7=disp.map(j=>j.carga7).filter(x=>x!=null), cr=disp.map(j=>j.cronica).filter(x=>x!=null&&x>0);
  const m7=c7.length?avg(c7):null, mcr=cr.length?avg(cr):null, dif=m7!=null&&mcr?Math.round((m7/mcr-1)*100):null;
  const nd=(d.dias||[]).length, daily=(d.dias||[]).map((_,i)=>{ const v=disp.map(j=>(j.serieCarga||[])[i]).filter(x=>x!=null); return v.length?avg(v):0; }), mx=Math.max(1,...daily);
  const bars=`<svg class="mp-bars" viewBox="0 0 ${nd*14} 44" preserveAspectRatio="none">${daily.map((v,i)=>`<rect x="${i*14+2}" y="${44-v/mx*42}" width="10" height="${v/mx*42}" rx="2.5" fill="${i===nd-1?"#f2bd4b":"var(--mp-bar)"}"/>`).join("")}</svg>`;
  const {map}=monMatch();
  const need=js.filter(j=>j.prio>0||(j.prontidao!=null&&j.prontidao<50)||(j.estado&&j.estado!=="Disponível")||j.estadoBem==="sem resposta")
    .sort((a,b)=>(b.prio||0)-(a.prio||0)||(a.prontidao??999)-(b.prontidao??999)).slice(0,5);
  const nm=j=>{ const p=map[j.nome]?P(map[j.nome]):null; return p?p.name:j.nome; };
  const top=`<section class="card mp"><div class="card-h"><h3>Prontidão média</h3><span class="sub">${esc(monMd(d).etiqueta||"")}</span></div>
      <div class="card-b mp-ring">${monRing(med)}<div class="mp-l"><div><b>${ac}</b> acima de 65</div><div><b class="g">${vig}</b> a vigiar</div><div><b class="r">${risco}</b> em risco</div></div></div></section>
    <section class="card mp"><div class="card-h"><h3>Carga da semana</h3><span class="sub">média por jogador</span></div>
      <div class="card-b"><div class="mp-big">${m7==null?"–":Math.round(m7).toLocaleString("pt-PT")}<small> UA</small></div>${bars}
      <div class="small muted">${dif==null?"Últimos 7 dias (PSE × minutos).":`${dif>=0?"+":""}${dif}% face à média das 4 semanas`}</div></div></section>`;
  const att=`<section class="card mp-att"><div class="card-h"><h3>Precisa de atenção hoje</h3><span style="display:flex;gap:6px"><button class="btn sm" data-a="monRefresh" ${MON.loading?"disabled":""}>${MON.loading?"A atualizar…":"Atualizar"}</button><button class="btn sm" data-a="tab" data-t="mon">Ver tudo</button></span></div>
    ${monFaltaStrip()}<div class="list">${need.length?need.map(j=>{ const a=monAttn(j), pid=map[j.nome], p=pid?P(pid):null;
      return `<button class="li" ${p?`data-a="page" data-p="atleta" data-id="${esc(p.id)}"`:`data-a="tab" data-t="mon"`}>${p?avatar(p):`<span class="ph g-X">${esc(initials(j.nome))}</span>`}<span class="main"><b>${esc(nm(j))}</b><small>${esc(a.t)}</small></span><span class="tag ${a.c}">${a.l}</span></button>`; }).join("")
      :`<div class="empty"><b>Ninguém a precisar de atenção</b>${esc(monAge())}</div>`}</div></section>`;
  return {top,att};
}

/* ---- esta semana (horizontal) ---- */
function weekStrip(){
  const t=todayISO(), mon=addDays(mondayOf(t),7*(S.wkOff||0)), days=[...Array(7)].map((_,i)=>addDays(mon,i));
  const mi=cycleAt("micro",mon), byDay={}; events().forEach(e=>{ if(e.date>=days[0]&&e.date<=days[6]) (byDay[e.date]=byDay[e.date]||[]).push(e); });
  const dn=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  const cell=(d,i)=>{ const evs=(byDay[d]||[]).sort(byDT), g=evs.find(e=>e.type==="jogo"), e=g||evs[0];
    let body;
    if(!e) body=`<b class="wk-t off">Folga</b><small>${i===5||i===6?"":"&nbsp;"}</small>`;
    else if(g) body=`<b class="wk-t">Jogo</b><small>${esc((g.venue==="F"?"@ ":"vs ")+(g.opp||""))}${g.time?" · "+esc(g.time):""}</small>${g.closed?`<span class="tag ok">Fechado</span>`:""}`;
    else { const tt=TRT(e.ttype), dur=e.dur?e.dur+"'":"";
      body=`<b class="wk-t">Treino</b><small>${esc([e.theme||(tt&&tt.l)||"",dur].filter(Boolean).join(" · ")||e.time||"")}</small>${e.int?`<span class="tag ${e.int==="Baixa"?"ok":e.int==="Média"?"warn":"bad"}">${esc(e.int)}</span>`:""}${evs.length>1?`<small>+${evs.length-1}</small>`:""}`; }
    return `<button class="wk-d ${g?"game":""} ${d===t?"today":""}" ${e?`data-a="page" data-p="${e.type==="jogo"?"jogo":"treino"}" data-id="${esc(e.id)}"`:`data-a="calDay" data-d="${d}"`}><span class="wk-h">${dn[i].toUpperCase()}<b>${toD(d).getDate()}</b></span>${body}</button>`; };
  return `<section class="card wk"><div class="card-h"><h3>${S.wkOff?`Semana de ${fmtD(days[0],{day:"numeric",month:"short"})}`:"Esta semana"}${mi?` <span class="sub">· ${esc(mi.name||"")}</span>`:""}</h3>
    <span style="display:flex;gap:6px"><button class="btn sm" data-a="wkNav" data-n="-1" aria-label="Semana anterior">‹</button>${S.wkOff?`<button class="btn sm" data-a="wkNav" data-n="0">Hoje</button>`:""}<button class="btn sm" data-a="wkNav" data-n="1" aria-label="Semana seguinte">›</button><button class="btn sm" data-a="tab" data-t="agenda">Agenda</button></span></div>
    <div class="wk-row">${days.map(cell).join("")}</div></section>`;
}

/* ---- notificações (alertas da app) no cabeçalho ---- */
const BELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
let NOTI_OPEN=false;
function notiRender(){
  const al=alerts(), n=al.filter(a=>a.cls!=="info").length, b=document.getElementById("notiBt");
  if(b){ const html=BELL+(n?`<span class="nb">${n}</span>`:""); if(b.innerHTML!==html) b.innerHTML=html;   /* não recriar o ícone a cada render: o clique perdia o alvo */ b.title=n?`${n} alerta${n>1?"s":""}`:"Sem alertas"; b.setAttribute("aria-expanded",NOTI_OPEN?"true":"false"); }
  let p=document.getElementById("notiPanel");
  if(!NOTI_OPEN){ if(p) p.remove(); return; }
  if(!p){ p=document.createElement("div"); p.id="notiPanel"; p.className="noti"; document.body.appendChild(p); }
  p.innerHTML=`<div class="noti-h"><b>Notificações</b><span class="sub">${al.length}</span></div><div class="noti-l">${al.length?al.map(alertHTML).join(""):`<div class="empty"><b>Tudo em dia</b>Não há treinos nem jogos por fechar.</div>`}</div>`;
  const r=b?b.getBoundingClientRect():{bottom:60,right:window.innerWidth-12};
  p.style.top=(r.bottom+window.scrollY+8)+"px"; p.style.right=Math.max(8,window.innerWidth-r.right-4)+"px";
}
// fecha ao tocar fora ou num alerta; usa o percurso do clique (fixado no início) porque o render pode substituir o elemento tocado
document.addEventListener("click",e=>{ if(!NOTI_OPEN) return;
  const path=e.composedPath(), has=f=>path.some(n=>n&&n.nodeType===1&&f(n));
  if(has(n=>n.id==="notiBt")) return;
  if(has(n=>n.id==="notiPanel")&&!has(n=>n.classList.contains("alert"))) return;
  NOTI_OPEN=false; notiRender(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&NOTI_OPEN){ NOTI_OPEN=false; notiRender(); } });
Object.assign(A,{
  noti: () => { NOTI_OPEN=!NOTI_OPEN; notiRender(); },
  wkNav: el => { const n=+el.dataset.n; S.wkOff=n===0?0:(S.wkOff||0)+n; render(); }
});
