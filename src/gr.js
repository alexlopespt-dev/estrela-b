/* ================= GUARDA-REDES =================
   Separador do treinador de guarda-redes: sessões de treino dos GR (plano com exercícios de GR, presenças, PSE e
   avaliação de cada GR), PSE e monitorização só dos GR, jogos dos GR (golos sofridos, defesas, erros, nota do
   treinador de GR) e a biblioteca de exercícios de GR (categoria "Guarda-redes" dos exercícios, campo gkt = tipo de trabalho).
   Coleção "gk":
     gk/<id>        = sessão {k:"s", date, time, dur, ev (treino da equipa), theme, int, obj, plan:[{ex,name,min,t,n}], ob:{pid:{s,r,t}}, notes}
     gk/j_<jogoId>  = jogo   {k:"j", g, d:{pid:{gs,def,err,r,t}}}
   Os GR são os atletas com posição "GR" (GROUP). */
const GK_T = [
  {k:"pos",l:"Posição base e deslocamentos"},{k:"enc",l:"Encaixe e receção"},{k:"que",l:"Quedas e mergulhos"},
  {k:"ref",l:"Reflexos e reação"},{k:"x1",l:"1x1 e saídas aos pés"},{k:"aer",l:"Cruzamentos e jogo aéreo"},
  {k:"pes",l:"Jogo de pés e distribuição"},{k:"jog",l:"Situação de jogo"},{k:"bp",l:"Penáltis e bolas paradas"},{k:"fis",l:"Ativação e físico"}
];
const GK_TL = k => (GK_T.find(t=>t.k===k)||{}).l || "";
const isGK = p => !!p && GROUP(p.pos)==="GR";
const gkPlayers = () => players().filter(isGK);
const gkCat = () => exCatsAll().find(c=>/guarda[\s-]*redes/i.test(c)) || "Guarda-redes";
const isGkEx = x => !!x && (/guarda[\s-]*redes/i.test(x.cat||"") || !!x.gkt);
const gkExs = () => exercises().filter(isGkEx);
const gkSess = () => Object.entries(D.gk||{}).filter(([,x])=>x&&x.k==="s"&&validISO(x.date)).map(([id,x])=>({id,...x}))
  .sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||"")));
const gkBlockT = x => x.t || (x.ex&&D.exercises[x.ex]&&D.exercises[x.ex].gkt) || "";
const gkMin = s => (s.plan||[]).reduce((a,x)=>a+(+x.min||0),0);
// treino da equipa ligado à sessão (sem treino ligado = sessão extra)
const gkTrOf = s => (s.ev&&D.events[s.ev]&&D.events[s.ev].type==="treino") ? {id:s.ev,...D.events[s.ev]} : null;
const gkSessOfTr = trId => gkSess().find(s=>s.ev===trId) || null;

/* ---- PSE de um GR num dia: app do atleta / formulário (resumo da monitorização) e as escritas nos treinos desta app ---- */
function gkPse(pid,d){
  const out=[], r=MON.data&&MON.data.respostas;
  if(r){ const {map}=monMatch(); (r.pse||[]).filter(x=>x.d===d&&map[x.n]===pid).forEach(x=>out.push({rpe:x.rpe,dur:x.dur,c:x.c,tipo:x.tipo||"",src:"mon"})); }
  if(!out.length) trainings().filter(t=>t.date===d).forEach(t=>{ const a=(t.att||{})[pid], v=a&&(a.s==="P"||a.s==="AT")?parseNum(a.rpe):null;
    if(v!=null) out.push({rpe:v,dur:+t.dur||null,c:t.dur?v*t.dur:null,tipo:"Treino",src:"app"}); });
  return out;
}
const gkBem = (pid,d) => { const r=MON.data&&MON.data.respostas; if(!r) return null; const {map}=monMatch();
  const x=(r.bem||[]).filter(b=>b.d===d&&map[b.n]===pid).pop(); if(!x) return null;
  const t=(x.i||[]).every(v=>typeof v==="number")?x.i.reduce((a,b)=>a+b,0):null; return {...x,tot:t}; };
const gkBemLast = pid => { const r=MON.data&&MON.data.respostas; if(!r) return null; const {map}=monMatch();
  const x=(r.bem||[]).filter(b=>map[b.n]===pid).sort((a,b)=>(a.d+(a.h||"")).localeCompare(b.d+(b.h||""))).pop(); return x?gkBem(pid,x.d):null; };
const gkRpeTag = v => v==null?"":`<span class="rv" style="background:${monCol(100-(v-1)/9*100)}">${esc(v)}</span>`;

/* ---- jogos: golos sofridos e defesas de cada GR ---- */
const gkDefId = () => { const s=statDefs().find(x=>/^def$/i.test(x.code||"")||/defesas/i.test(x.title||"")); return s?s.id:null; };
function gkGame(g,c){   // {pid:{min,st,gs,def,err,r,t,nota,gsAuto}} dos GR que jogaram ou foram convocados
  c=c||gameCalc(g); const rec=((D.gk||{})["j_"+g.id]||{}).d||{}, dId=gkDefId(), out={};
  const gk=gkPlayers().map(p=>p.id).concat(Object.keys(rec)).filter((v,i,a)=>a.indexOf(v)===i);
  const played=gk.filter(pid=>c.res[pid]&&c.res[pid].min>0);
  gk.forEach(pid=>{ const x=c.res[pid], r=rec[pid]||{}, inCall=(g.call||[]).includes(pid);
    if(!(x&&x.min>0) && !inCall && !rec[pid]) return;
    let gs=parseNum(r.gs), auto=false; if(gs==null && played.length===1 && played[0]===pid && c.ga!=null){ gs=c.ga; auto=true; }
    const st=((g.st||{})[pid]||{}), def=parseNum(r.def)!=null?parseNum(r.def):dId&&st[dId]!=null?+st[dId]:null;
    out[pid]={min:x?x.min:0,st:!!(x&&x.st),gs:x&&x.min>0?gs:null,gsAuto:auto,def,err:parseNum(r.err),r:parseNum(r.r),t:r.t||"",nota:parseNum((g.rt||{})[pid])}; });
  return out;
}
const gkGamesPast = () => games().filter(g=>g.date<=todayISO()).reverse();
function gkSeason(){
  const tot={}; gkPlayers().forEach(p=>tot[p.id]={j:0,tit:0,min:0,gs:0,gsMin:0,gsN:0,cs:0,def:0,defN:0,err:0,notas:[],rs:[],semGs:0});
  gkGamesPast().forEach(g=>{ const c=gameCalc(g); if(c.ga==null && !g.closed) return; const x=gkGame(g,c);
    Object.entries(x).forEach(([pid,v])=>{ const t=tot[pid]; if(!t||!(v.min>0)) return; t.j++; if(v.st) t.tit++; t.min+=v.min;
      if(v.gs!=null){ t.gs+=v.gs; t.gsMin+=v.min; t.gsN++; if(v.gs===0&&v.min>=60) t.cs++; } else t.semGs++;
      if(v.def!=null){ t.def+=v.def; t.defN++; } if(v.err) t.err+=v.err; if(v.nota!=null) t.notas.push(v.nota); if(v.r!=null) t.rs.push(v.r); }); });
  return tot;
}

/* ================= separador ================= */
function vGr(){
  const sub=`<div class="seg" role="tablist">${[["sessoes","Treinos de GR"],["mon","PSE e monitorização"],["jogos","Jogos"],["ex","Exercícios"]].map(([k,l])=>`<button data-a="gksub" data-k="${k}" class="${(S.grsub||"sessoes")===k?"on":""}">${l}</button>`).join("")}</div>`;
  const k=S.grsub||"sessoes";
  if(k==="mon") return gkVMon(sub);
  if(k==="jogos") return gkVJogos(sub);
  if(k==="ex") return gkVEx(sub);
  return gkVSess(sub);
}
function gkNoGK(){ return gkPlayers().length?"":`<div class="empty" style="margin-bottom:14px"><b>Ainda não há guarda-redes no plantel</b>Em Plantel, põe a posição "GR" na ficha dos guarda-redes.</div>`; }

/* ---- os GR em cartões pequenos (hoje) ---- */
function gkStrip(){
  const gk=gkPlayers(); if(!gk.length) return "";
  const t=todayISO();
  return `<div class="gkstrip">${gk.map(p=>{ const av=avail(p.id), j=MON.data?monOf(p.id):null, ps=gkPse(p.id,t), b=gkBem(p.id,t);
    return `<button class="gkp" data-a="page" data-p="atleta" data-id="${esc(p.id)}">${avatar(p)}<span class="main"><b>${esc(p.name)}</b>
      <small>${av!=="ok"?`<span class="tag ${AV[av].c}">${AV[av].l}</span> `:""}${b&&b.tot!=null?`Bem-estar <b>${b.tot}</b>/20`:"Sem bem-estar hoje"}${ps.length?` · PSE <b>${esc(ps[ps.length-1].rpe)}</b>`:""}</small></span>
      ${j&&j.prontidao!=null?monScore(j.prontidao):""}</button>`; }).join("")}</div>`;
}

/* ---- semana: treinos da equipa e sessões de GR, dia a dia ---- */
function gkWeek(){
  const t=todayISO(), mon=addDays(mondayOf(t),7*(S.gkWk||0)), days=[...Array(7)].map((_,i)=>addDays(mon,i));
  const dn=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"], ss=gkSess();
  const trs=trainings().filter(e=>e.date>=days[0]&&e.date<=days[6]), gms=games().filter(e=>e.date>=days[0]&&e.date<=days[6]);
  const falta=trs.filter(tr=>!gkSessOfTr(tr.id)).length;
  const cell=(d,i)=>{ const tr=trs.filter(e=>e.date===d), g=gms.find(e=>e.date===d), s=ss.filter(x=>x.date===d);
    let body="";
    if(s.length) body+=s.map(x=>`<button class="gkw-s" data-a="page" data-p="gk" data-id="${esc(x.id)}"><b>${esc(x.theme||"Sessão de GR")}</b><small>${[x.time,gkMin(x)?gkMin(x)+"'":x.dur?x.dur+"'":""].filter(Boolean).map(esc).join(" · ")||"Por planear"}</small></button>`).join("");
    if(tr.length && tr.some(e=>!gkSessOfTr(e.id))) body+=`<button class="btn sm gkw-add" data-a="gkNew" data-d="${d}" data-ev="${esc(tr.find(e=>!gkSessOfTr(e.id)).id)}">+ Sessão de GR</button>`;
    const lbl = g ? `<span class="gkw-l game">Jogo ${esc((g.venue==="F"?"@ ":"vs ")+(g.opp||""))}</span>` : tr.length ? `<span class="gkw-l">Treino${tr[0].time?" "+esc(tr[0].time):""}</span>` : `<span class="gkw-l off">${s.length?"Sessão extra":"Folga"}</span>`;
    if(!tr.length && !g && !s.length) body+=`<button class="lnk small muted gkw-x" data-a="gkNew" data-d="${d}">+ sessão extra</button>`;
    return `<div class="wk-d gkw ${d===t?"today":""}"><span class="wk-h">${dn[i].toUpperCase()}<b>${toD(d).getDate()}</b></span>${lbl}${body}</div>`; };
  return `<section class="card wk"><div class="card-h"><h3>${S.gkWk?`Semana de ${fmtD(days[0],{day:"numeric",month:"short"})}`:"Esta semana"}</h3>
    <span style="display:flex;gap:6px;flex-wrap:wrap">${falta?`<button class="btn sm" data-a="gkWeekGen" data-w="${days[0]}">Criar as ${falta} sessões em falta</button>`:""}${ss.some(x=>x.date>=days[0]&&x.date<=days[6])?`<button class="btn sm" data-a="gkPrW" data-w="${days[0]}">PDF da semana</button>`:""}
    <button class="btn sm" data-a="gkWkNav" data-n="-1" aria-label="Semana anterior">‹</button>${S.gkWk?`<button class="btn sm" data-a="gkWkNav" data-n="0">Hoje</button>`:""}<button class="btn sm" data-a="gkWkNav" data-n="1" aria-label="Semana seguinte">›</button></span></div>
    <div class="wk-row">${days.map(cell).join("")}</div></section>`;
}

/* ---- o que temos trabalhado (minutos por tipo de trabalho) ---- */
function gkWork(){
  const t=todayISO(), per=S.gkPer||"4s", from=per==="4s"?addDays(mondayOf(t),-21):per==="mes"?t.slice(0,8)+"01":"0000";
  const ss=gkSess().filter(s=>s.date>=from&&s.date<=t), m={}; let tot=0, sem=0;
  ss.forEach(s=>(s.plan||[]).forEach(x=>{ const v=+x.min||0; if(!v) return; const k=gkBlockT(x); if(k){ m[k]=(m[k]||0)+v; tot+=v; } else sem+=v; }));
  const rows=GK_T.map(g=>({...g,v:m[g.k]||0})).sort((a,b)=>b.v-a.v), mx=Math.max(1,...rows.map(r=>r.v));
  const chips=[["4s","Últimas 4 semanas"],["mes","Este mês"],["epoca","Época"]].map(([k,l])=>`<button class="chip ${per===k?"on":""}" data-a="gkPer" data-k="${k}">${l}</button>`).join("");
  return `<section class="card"><div class="card-h"><h3>O que temos trabalhado</h3><span class="sub">${plural(ss.length,"sessão","sessões")} · ${tot+sem}'</span></div>
    <div class="card-b"><div class="chips" style="margin-bottom:10px">${chips}</div>
    ${tot?`<div class="gkbars" role="list">${rows.map(r=>`<div class="gkbar" role="listitem"><span class="l">${esc(r.l)}</span><span class="b"><i style="width:${(r.v/mx*100).toFixed(1)}%"></i></span><span class="v num">${r.v?`${r.v}' <small>${Math.round(r.v/tot*100)}%</small>`:"–"}</span></div>`).join("")}</div>`
      :`<div class="empty" style="padding:14px"><b>Sem minutos registados neste período</b>Os minutos contam a partir do plano de cada sessão (tipo de trabalho de cada exercício).</div>`}
    ${sem?`<p class="note" style="margin:8px 0 0">${sem}' em blocos sem tipo de trabalho — escolhe o tipo no plano da sessão.</p>`:""}</div></section>`;
}

function gkVSess(sub){
  const t=todayISO(), all=gkSess(), upc=all.filter(s=>s.date>=t), past=all.filter(s=>s.date<t).reverse();
  const row=s=>{ const d=toD(s.date), tipos=[...new Set((s.plan||[]).map(gkBlockT).filter(Boolean))], tr=gkTrOf(s), n=Object.values(s.ob||{}).filter(o=>o&&o.r).length;
    return `<button class="li" data-a="page" data-p="gk" data-id="${esc(s.id)}"><span class="datebox"><b>${d.getDate()}</b><span>${d.toLocaleDateString("pt-PT",{month:"short"}).replace(".","")}</span></span>
      <span class="main"><b>${esc(s.theme||"Sessão de GR")}</b><small>${[cap1(fmtD(s.date,{weekday:"long"})),s.time,gkMin(s)?gkMin(s)+"' planeados":"",tr?"com o treino da equipa":"sessão extra"].filter(Boolean).map(esc).join(" — ")}</small>
      ${tipos.length?`<small style="margin-top:3px">${tipos.map(k=>`<span class="tag">${esc(GK_TL(k))}</span>`).join(" ")}</small>`:""}</span>
      ${(s.plan||[]).length?`<span class="small muted num">${plural((s.plan||[]).length,"exercício")}${n?` · ${n} aval.`:""}</span>`:`<span class="tag warn">Por planear</span>`}</button>`; };
  const group=(arr,asc)=>{ const g={}; arr.forEach(s=>{ const w=mondayOf(s.date); (g[w]=g[w]||[]).push(s); }); const ks=Object.keys(g).sort(); if(!asc) ks.reverse();
    return ks.map(w=>`<div class="gsec" style="padding:10px 16px 0">Semana de ${fmtD(w)} a ${fmtD(addDays(w,6))} · ${g[w].reduce((a,s)=>a+gkMin(s),0)}'</div><div class="list">${g[w].map(row).join("")}</div>`).join(""); };
  return `<div class="bar"><h2>Guarda-redes</h2>${sub}<span class="sp"></span><button class="btn primary" data-a="gkNew">+ Sessão de GR</button></div>
  ${gkNoGK()}${gkStrip()}${gkWeek()}
  <div class="grid2" style="margin-top:14px">
    <section class="card"><div class="card-h"><h3>Próximas sessões</h3><span class="sub">${upc.length}</span></div>${upc.length?group(upc,true):`<div class="empty"><b>Sem sessões agendadas</b>Cria a sessão a partir dos treinos da semana (acima) ou com “+ Sessão de GR”.</div>`}</section>
    ${gkWork()}
  </div>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Sessões anteriores</h3><span class="sub">${past.length}</span></div>${past.length?group(past.slice(0,40),false):`<div class="empty"><b>Ainda não há sessões de GR</b></div>`}${past.length>40?`<p class="note" style="padding:0 16px 12px">A mostrar as 40 mais recentes.</p>`:""}</section>`;
}

/* ---- ficha da sessão ---- */
function pGk(id){
  const s0=(D.gk||{})[id]; if(!s0||s0.k!=="s") return "";
  const s={id,...s0}, plan=s.plan||[], tot=gkMin(s), tr=gkTrOf(s), gk=gkPlayers(), ob=s.ob||{};
  const F=(f,label,val,type="text",extra="")=>`<label class="fld">${label}<input type="${type}" value="${esc(val??"")}" data-c="f" data-col="gk" data-id="${esc(id)}" data-f="${f}" ${extra}></label>`;
  const trs=trainings().filter(e=>e.date===s.date);
  const exs=gkExs(), cat=gkCat();
  const blk=(x,i)=>{ const ex=x.ex?D.exercises[x.ex]:null, tk=gkBlockT(x);
    return `<div class="plan gkplan"><span class="o">${i+1}</span><div style="min-width:0">
      <input class="inp" value="${esc(x.name||(ex&&ex.name)||"")}" data-c="gkPlan" data-id="${esc(id)}" data-i="${i}" data-f="name" aria-label="Nome do bloco">
      ${ex?`<button class="lnk small muted" data-a="exView" data-id="${esc(x.ex)}">ver exercício</button>`:""}
      <div class="gkrow2">${sel("",GK_T.map(g=>({v:g.k,l:g.l})),tk,`class="inp" data-c="gkPlan" data-id="${esc(id)}" data-i="${i}" data-f="t" aria-label="Tipo de trabalho"`,"Tipo de trabalho…")}
      <input class="inp" value="${esc(x.n||"")}" data-c="gkPlan" data-id="${esc(id)}" data-i="${i}" data-f="n" placeholder="Indicações (séries, distância, foco…)" aria-label="Indicações"></div></div>
      <input class="inp" inputmode="numeric" value="${esc(x.min??"")}" data-c="gkPlan" data-id="${esc(id)}" data-i="${i}" data-f="min" aria-label="Minutos" placeholder="min">
      <span class="acts"><button class="btn sm" data-a="gkMove" data-id="${esc(id)}" data-i="${i}" data-n="-1" ${i===0?"disabled":""} aria-label="Subir">↑</button><button class="btn sm" data-a="gkMove" data-id="${esc(id)}" data-i="${i}" data-n="1" ${i===plan.length-1?"disabled":""} aria-label="Descer">↓</button><button class="btn sm" data-a="gkDelB" data-id="${esc(id)}" data-i="${i}" aria-label="Remover">✕</button></span></div>`; };
  const gkRow=p=>{ const o=ob[p.id]||{}, a=tr&&(tr.att||{})[p.id], av=avail(p.id), ps=gkPse(p.id,s.date), b=gkBem(p.id,s.date);
    const pres = tr ? (a&&a.s?`<span class="tag" style="background:${ATT[a.s].c};color:#fff">${esc(ATT[a.s].l)}</span>`:`<span class="small muted">Presença por marcar no treino</span>`)
      : `<span class="stbtns">${["P","FJ","FI","L","D"].map(k=>`<button title="${esc(ATT[k].l)}" data-a="gkAtt" data-id="${esc(id)}" data-p="${esc(p.id)}" data-s="${k}" class="${o.s===k?"on":""}" style="${o.s===k?`background:${ATT[k].c}`:""}">${k}</button>`).join("")}</span>`;
    return `<div class="gkath">${avatar(p)}<div class="nm"><b>${esc(p.name)}</b><small>${av!=="ok"?`<span class="tag ${AV[av].c}">${AV[av].l}</span> `:""}${pres}</small>
        <small>${ps.length?ps.map(x=>`PSE ${gkRpeTag(x.rpe)}${x.dur?` ${esc(x.dur)}'`:""}${x.c?` · ${Math.round(x.c)} UA`:""} <span class="muted">(${x.src==="mon"?"app do atleta":"treino"})</span>`).join(" · "):"Sem PSE neste dia"}${b&&b.tot!=null?` · bem-estar <b>${b.tot}</b>/20`:""}</small></div>
      <div class="gkev"><span class="gkrate" role="group" aria-label="Avaliação de ${esc(p.name)} na sessão">${[1,2,3,4,5].map(n=>`<button class="${+o.r===n?"on":""}" data-a="gkRate" data-id="${esc(id)}" data-p="${esc(p.id)}" data-n="${n}" title="${["","Fraco","Abaixo","Bom","Muito bom","Excelente"][n]}">${n}</button>`).join("")}</span>
        <input class="inp" value="${esc(o.t||"")}" data-c="gkOb" data-id="${esc(id)}" data-p="${esc(p.id)}" placeholder="Como esteve, o que corrigir…" aria-label="Observações de ${esc(p.name)}"></div></div>`; };
  return `
  <div class="phead"><button class="back" data-a="back" aria-label="Voltar">‹</button>
    <div><h2>${esc(s.theme||"Sessão de GR")}</h2><p>${esc(fmtLong(s.date))}${s.time?" — "+esc(s.time):""}</p>
      <p style="margin-top:4px">${tr?`<button class="lnk small" data-a="page" data-p="treino" data-id="${esc(tr.id)}">Com o treino da equipa${tr.time?" das "+esc(tr.time):""}${tr.theme?" — "+esc(tr.theme):""} ›</button>`:`<span class="tag">Sessão extra (sem treino da equipa)</span>`}</p></div>
    <div class="acts"><button class="btn" data-a="gkPr" data-id="${esc(id)}">Plano em PDF</button><button class="btn" data-a="gkDup" data-id="${esc(id)}">Duplicar</button><button class="btn ghost" data-a="gkDel" data-id="${esc(id)}">Eliminar</button></div></div>
  <div class="grid2">
    <section class="card"><div class="card-h"><h3>Dados da sessão</h3></div><div class="card-b"><div class="form">
      ${F("date","Data",s.date,"date")}${F("time","Hora",s.time,"time")}${F("dur","Duração (min)",s.dur,"text",'inputmode="numeric" data-t="num"')}
      <label class="fld">Intensidade${sel("",INTS.map(i=>i.l),s.int,`data-c="f" data-col="gk" data-id="${esc(id)}" data-f="int"`,"—")}</label>
      <label class="fld full">Treino da equipa${sel("",trs.map(e=>({v:e.id,l:[e.time,e.theme||"Treino"].filter(Boolean).join(" — ")})),s.ev&&D.events[s.ev]?s.ev:"",`data-c="f" data-col="gk" data-id="${esc(id)}" data-f="ev"`,trs.length?"Nenhum (sessão extra)":"Não há treino da equipa neste dia")}</label>
      <div class="full">${F("theme","Tema da sessão",s.theme,"text",'placeholder="Ex.: Saídas aéreas e reposição rápida"')}</div>
      <label class="fld full">Objetivos<textarea data-c="f" data-col="gk" data-id="${esc(id)}" data-f="obj" placeholder="O que queres ver hoje nos guarda-redes">${esc(s.obj||"")}</textarea></label>
    </div></div></section>
    <section class="card"><div class="card-h"><h3>Plano da sessão</h3><span class="sub">${tot}' planeados${s.dur?" de "+esc(s.dur)+"'":""}</span></div>
      <div>${plan.length?plan.map(blk).join(""):`<div class="empty"><b>Plano vazio</b>Junta exercícios de GR da biblioteca ou blocos livres.</div>`}</div>
      <div class="card-b" style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line)">
        <button class="btn primary" data-a="gkPick" data-id="${esc(id)}">+ Exercício de GR</button>
        <select class="inp" style="flex:1;min-width:150px" data-c="gkAddEx" data-id="${esc(id)}"><option value="">Adicionar pelo nome…</option>${exs.length?`<optgroup label="${esc(cat)}">${exs.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}${x.dur?" ("+esc(x.dur)+"')":""}</option>`).join("")}</optgroup>`:""}</select>
        <button class="btn" data-a="gkFree" data-id="${esc(id)}">+ Bloco livre</button>
      </div></section>
  </div>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Os guarda-redes nesta sessão</h3><span class="sub">${tr?"presença do treino da equipa":"presença marcada aqui"} · PSE da app do atleta</span></div>
    ${gk.length?`<div>${gk.map(gkRow).join("")}</div>`:`<div class="empty"><b>Sem guarda-redes no plantel</b>Põe a posição "GR" na ficha dos guarda-redes.</div>`}
    <p class="note" style="padding:0 16px 14px">Avaliação da sessão de 1 (fraco) a 5 (excelente). O PSE vem das respostas na app do atleta (resumo da monitorização) e, sem essas, do RPE escrito no treino.</p></section>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Notas do treinador de GR</h3></div><div class="card-b">
    <label class="fld"><textarea data-c="f" data-col="gk" data-id="${esc(id)}" data-f="notes" placeholder="O que correu bem, o que ajustar na próxima sessão…">${esc(s.notes||"")}</textarea></label></div></section>`;
}

/* ---- PSE e monitorização dos GR ---- */
function gkVMon(sub){
  const gk=gkPlayers(), c=monCfg(), d=MON.data, t=todayISO();
  const head=`<div class="bar"><h2>Guarda-redes</h2>${sub}<span class="sp"></span>${c.url?`<button class="btn" data-a="monRefresh" ${MON.loading?"disabled":""}>${MON.loading?"A atualizar…":"Atualizar"}</button>`:`<button class="btn primary" data-a="monCfg">Ligar ao Google Sheets</button>`}</div>`;
  if(!gk.length) return head+gkNoGK();
  const r=d&&d.respostas, {map}=d?monMatch():{map:{}};
  // dias: os da monitorização (últimos 7) ou, sem ela, os últimos 7 dias
  const dias=(d&&d.dias&&d.dias.length?d.dias.slice(-7):[...Array(7)].map((_,i)=>addDays(t,i-6)));
  const folga=d&&d.folga?d.folga.slice(-7):null;
  const dl=x=>cap1(fmtD(x,{weekday:"short",day:"numeric"}).replace(".",""));
  const squadAvg=(fn)=>dias.map(x=>{ const v=fn(x).filter(v=>v!=null); return v.length?avg(v):null; });
  const allBem=x=>r?(r.bem||[]).filter(b=>b.d===x).map(b=>(b.i||[]).every(v=>typeof v==="number")?b.i.reduce((a,v)=>a+v,0):null):[];
  const allPse=x=>r?(r.pse||[]).filter(b=>b.d===x&&typeof b.rpe==="number").map(b=>b.rpe):[];
  const n1=v=>v==null?"–":String(Math.round(v*10)/10).replace(".",",");
  const card=p=>{ const j=d?monOf(p.id):null, av=avail(p.id), b=gkBemLast(p.id), last=dias.slice().reverse().map(x=>({x,l:gkPse(p.id,x)})).find(o=>o.l.length);
    const items=b?["Sono","Fadiga","Dor","Stress"].map((l,k)=>`<span class="gki"><span class="rv" style="background:${monRv((b.i||[])[k])}">${(b.i||[])[k]??"–"}</span>${l}</span>`).join(""):"";
    return `<section class="card gkmon"><div class="card-h"><button class="lnk pin" data-a="page" data-p="atleta" data-id="${esc(p.id)}">${avatar(p)}<b>${esc(p.name)}</b></button>${av!=="ok"?`<span class="tag ${AV[av].c}">${AV[av].l}</span>`:j&&j.estado&&j.estado!=="Disponível"?`<span class="tag warn">${esc(j.estado)}</span>`:""}</div><div class="card-b">
      ${j?`<div class="mkpis"><div><span>Prontidão</span>${monScore(j.prontidao,true)}<small class="muted">${esc(j.prontidao==null?j.prontidaoPorque||"":j.faixa||"")}</small></div>
        <div><span>Condição</span>${j.condicao==null?`<small class="muted">${esc(j.condicaoPorque||"–")}</small>`:monScore(j.condicao,true)}</div>
        <div><span>Carga 7 dias</span><b>${j.carga7==null?"–":Math.round(j.carga7)}</b><small class="muted">ACWR ${n2(j.acwr)}</small></div>
        <div><span>Bem-estar 3 dias</span><b>${n2(j.bem3)}</b><small class="muted">base ${n2(j.base)}</small></div></div>`
        :`<p class="small muted" style="margin:0 0 8px">${d?"Sem dados da monitorização para este GR (liga o nome em Monitorização → Ligação).":"Monitorização por ligar: só o PSE escrito nos treinos desta app."}</p>`}
      <div class="gkl"><div><div class="small muted">Bem-estar ${b?`(${esc(b.d===t?"hoje":dl(b.d))})`:""}</div>${b?`<div class="gkis">${items}<b class="num">${b.tot??"–"}<small>/20</small></b></div>`:`<div class="small muted">Sem resposta recente</div>`}</div>
        <div><div class="small muted">Último PSE</div>${last?last.l.map(x=>`<div>${gkRpeTag(x.rpe)} <span class="small">${esc(x.tipo||"")}${x.dur?` · ${esc(x.dur)}'`:""}${x.c?` · ${Math.round(x.c)} UA`:""} · ${esc(last.x===t?"hoje":dl(last.x))}</span></div>`).join(""):`<div class="small muted">Sem PSE nos últimos 7 dias</div>`}</div></div>
      ${j?`<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;align-items:flex-end"><div><div class="small muted">Bem-estar (14 dias)</div>${spark(j.serieBem||[],{w:160,h:36})}</div><div><div class="small muted">Carga diária (14 dias)</div>${spark(j.serieCarga||[],{bars:true,w:160,h:36,folga:d.folga})}</div><div>${monTag(j.estadoBem)} ${monTag(j.estadoCarga)}</div></div>
        <p class="note" style="margin-top:8px"><b>${esc(j.leitura||"")}</b>${j.critico?` Item mais baixo: ${esc(j.critico)}.`:""}</p>`:""}
    </div></section>`; };
  // tabelas dos últimos 7 dias, com a média do plantel por baixo
  const th=dias.map((x,i)=>`<th class="${folga&&folga[i]?"gkfolga":""}">${esc(x===t?"Hoje":dl(x))}</th>`).join("");
  const pseCell=(pid,x)=>{ const l=gkPse(pid,x); if(!l.length) return `<td class="muted">–</td>`; const v=l[l.length-1], c=l.reduce((a,y)=>a+(+y.c||0),0);
    return `<td>${gkRpeTag(v.rpe)}${c?`<small class="num">${Math.round(c)} UA</small>`:""}${l.length>1?`<small>${l.length} sessões</small>`:""}</td>`; };
  const bemCell=(pid,x)=>{ const b=gkBem(pid,x); if(!b||b.tot==null) return `<td class="muted">–</td>`; const h=monHooper(b.tot);
    return `<td><b class="num">${b.tot}</b>${h?`<small><span class="tag ${h.c}">${h.l}</span></small>`:""}</td>`; };
  const sqB=squadAvg(allBem), sqP=squadAvg(allPse);
  const tbl=(title,cell,sq,unit,note)=>`<section class="card" style="margin-top:14px"><div class="card-h"><h3>${title}</h3><span class="sub">últimos 7 dias</span></div>
    <div class="tscroll"><table class="tb gktb"><thead><tr><th class="l stk">Guarda-redes</th>${th}</tr></thead><tbody>
    ${gk.map(p=>`<tr><td class="l stk"><button class="lnk pin" data-a="page" data-p="atleta" data-id="${esc(p.id)}">${avatar(p)}<b>${esc(p.name)}</b></button></td>${dias.map(x=>cell(p.id,x)).join("")}</tr>`).join("")}
    ${r?`<tr class="gksq"><td class="l stk">Média do plantel</td>${sq.map(v=>`<td class="num">${v==null?"–":n1(v)}${v==null?"":`<small>${unit}</small>`}</td>`).join("")}</tr>`:""}</tbody></table></div>
    ${note?`<p class="note" style="padding:0 16px 12px">${note}</p>`:""}</section>`;
  return head+`${d?`<p class="small muted" style="margin:-4px 0 12px">${esc(monAge())}</p>`:MON.err?`<p class="small" style="color:var(--r5)">${esc(MON.err)}</p>`:""}
    <div class="gkmons">${gk.map(card).join("")}</div>
    ${tbl("PSE dos guarda-redes",pseCell,sqP,"PSE",r?"PSE e carga (UA = PSE × minutos) das respostas na app do atleta; sem resposta, o RPE escrito no treino. Na última linha, o PSE médio de todo o plantel nesse dia.":"Monitorização por ligar: PSE escrito nos treinos desta app.")}
    ${r?tbl("Bem-estar dos guarda-redes (total 4 a 20)",bemCell,sqB,"/20","Sono + fadiga + dor + stress: até 12 risco, 13-16 atenção, 17+ OK. Na última linha, a média do plantel nesse dia."):""}`;
}

/* ---- jogos dos GR ---- */
function gkVJogos(sub){
  const gk=gkPlayers(), head=`<div class="bar"><h2>Guarda-redes</h2>${sub}</div>`;
  if(!gk.length) return head+gkNoGK();
  const tot=gkSeason(), n1=v=>v==null?"–":fmt1(v).replace(".",",");
  const sum=`<section class="card"><div class="card-h"><h3>Época dos guarda-redes</h3><span class="sub">jogos com resultado</span></div><div class="tscroll"><table class="tb gktb"><thead><tr>
    <th class="l stk">Guarda-redes</th><th title="Jogos">J</th><th title="Titular">Tit</th><th>Min</th><th title="Golos sofridos">GS</th><th title="Golos sofridos por 90 minutos">GS/90</th><th title="Jogos sem sofrer golos (60 minutos ou mais)">Sem sofrer</th><th>Defesas</th><th title="Erros que deram golo">Erros</th><th title="Nota do jogo (ficha de jogo)">Nota</th><th title="Nota do treinador de GR">Nota GR</th></tr></thead><tbody>
    ${gk.map(p=>{ const t=tot[p.id];
      return `<tr><td class="l stk"><button class="lnk pin" data-a="page" data-p="atleta" data-id="${esc(p.id)}">${avatar(p)}<b>${esc(p.name)}</b></button></td><td class="num">${t.j}</td><td class="num">${t.tit}</td><td class="num">${t.min}</td>
        <td class="num"><b>${t.gs}</b>${t.semGs?`<small class="muted" title="Jogos com dois GR e golos sofridos por repartir"> +${t.semGs}?</small>`:""}</td><td class="num">${t.gsMin?n1(t.gs*90/t.gsMin):"–"}</td><td class="num">${t.cs}</td><td class="num">${t.defN?t.def:"–"}</td><td class="num">${t.err||0}</td><td class="num">${t.notas.length?n1(avg(t.notas)):"–"}</td><td class="num">${t.rs.length?n1(avg(t.rs)):"–"}</td></tr>`; }).join("")}
    </tbody></table></div><p class="note" style="padding:0 16px 12px">Golos sofridos: com um só GR em campo contam todos os do jogo; quando jogaram dois, reparte-os em “Registo dos GR”. Defesas: as do registo dos GR ou, sem ele, a estatística “Defesas” da ficha de jogo.</p></section>`;
  const gs=gkGamesPast();
  const row=g=>{ const c=gameCalc(g), x=gkGame(g,c), pl=Object.entries(x).filter(([,v])=>v.min>0), falta=pl.length>1&&pl.some(([,v])=>v.gs==null)&&c.ga!=null;
    return `<div class="gkg"><button class="li" data-a="page" data-p="jogo" data-id="${esc(g.id)}"><span class="datebox jogo"><b>${toD(g.date).getDate()}</b><span>${toD(g.date).toLocaleDateString("pt-PT",{month:"short"}).replace(".","")}</span></span>
      <span class="main"><b>${oppCrestSrc(oppByName(g.opp))?oppCrest(g.opp,20)+" ":""}${esc((g.venue==="F"?"@ ":"vs ")+(g.opp||"Adversário"))}</b><small>${pl.length?pl.map(([pid,v])=>`${esc(pname(pid))} ${v.min}'${v.gs!=null?` · ${v.gs} GS`:""}${v.def!=null?` · ${v.def} def.`:""}${v.r!=null?` · nota GR ${n1(v.r)}`:""}`).join(" | "):"Nenhum GR com minutos"}</small></span>
      ${c.result?`<span class="res ${c.result}">${c.result}</span> <b class="num">${esc(scoreTxt(g,c))}</b>`:`<span class="tag">${g.closed?"Fechado":"Sem resultado"}</span>`}</button>
      <div class="gkg-a">${falta?`<span class="tag warn">Golos por repartir</span>`:""}<button class="btn sm" data-a="gkGame" data-id="${esc(g.id)}">${(D.gk||{})["j_"+g.id]?"Editar registo dos GR":"Registo dos GR"}</button></div></div>`; };
  return head+sum+`<section class="card" style="margin-top:14px"><div class="card-h"><h3>Jogos</h3><span class="sub">${gs.length}</span></div>${gs.length?`<div>${gs.map(row).join("")}</div>`:`<div class="empty"><b>Ainda não há jogos</b></div>`}</section>`;
}
function gkGameForm(gid){
  const g=D.events[gid]; if(!g) return; const c=gameCalc({id:gid,...g}), x=gkGame({id:gid,...g},c);
  const ids=Object.keys(x).sort((a,b)=>(x[b].min-x[a].min)); if(!ids.length){ toast("Nenhum guarda-redes convocado ou com minutos neste jogo."); return; }
  const rec=((D.gk||{})["j_"+gid]||{}).d||{};
  const body=ids.map(pid=>{ const v=x[pid], r=rec[pid]||{};
    return `<fieldset class="gkf"><legend>${esc(pname(pid))} <span class="small muted">${v.min?`${v.min}' ${v.st?"(titular)":"(entrou)"}`:"não jogou"}</span></legend><div class="form">
      <label class="fld">Golos sofridos<input name="gs_${pid}" inputmode="numeric" value="${esc(r.gs??(v.gsAuto?v.gs:""))}" ${v.min?"":"disabled"}></label>
      <label class="fld">Defesas<input name="def_${pid}" inputmode="numeric" value="${esc(r.def??v.def??"")}"></label>
      <label class="fld">Erros que deram golo<input name="err_${pid}" inputmode="numeric" value="${esc(r.err??"")}"></label>
      <label class="fld">Nota do treinador de GR (1-10)<input name="r_${pid}" inputmode="decimal" value="${esc(r.r??"")}"></label>
      <label class="fld full">Análise (golos sofridos, decisões, o que trabalhar)<textarea name="t_${pid}" style="min-height:56px">${esc(r.t||"")}</textarea></label></div></fieldset>`; }).join("");
  modal({title:"Registo dos guarda-redes",sub:esc(`${g.venue==="F"?"@ ":"vs "}${g.opp||""} — ${fmtD(g.date)}${c.ga!=null?` — ${c.ga} golo${c.ga===1?"":"s"} sofrido${c.ga===1?"":"s"}`:""}`),body,
    foot:footSave("Guardar",(D.gk||{})["j_"+gid]?"Apagar registo":null),ctx:{
    save:()=>{ const d={}; let somaGs=0, nGs=0, err="";
      ids.forEach(pid=>{ const o={}; const num=(k,lo,hi,int)=>{ const raw=fv(k+"_"+pid); if(raw==="") return null; const n=parseNum(raw); if(n==null||n<lo||n>hi||(int&&!Number.isInteger(n))){ err=err||`${pname(pid)}: valor inválido em “${{gs:"golos sofridos",def:"defesas",err:"erros",r:"nota"}[k]}”.`; return null; } return n; };
        const gs=x[pid].min?num("gs",0,30,true):null, def=num("def",0,60,true), er=num("err",0,30,true), r=num("r",1,10,false), t=fv("t_"+pid);
        if(gs!=null){ o.gs=gs; somaGs+=gs; nGs++; } if(def!=null) o.def=def; if(er!=null) o.err=er; if(r!=null) o.r=r; if(t) o.t=t;
        if(Object.keys(o).length) d[pid]=o; });
      if(err){ toast(err); return; }
      const jog=ids.filter(pid=>x[pid].min>0);
      if(c.ga!=null && nGs===jog.length && nGs && somaGs!==c.ga){ toast(`Os golos sofridos (${somaGs}) não batem certo com o resultado (${c.ga}).`); return; }
      if(c.ga!=null && somaGs>c.ga){ toast(`Os golos sofridos (${somaGs}) passam os do jogo (${c.ga}).`); return; }
      if(Object.keys(d).length) put("gk","j_"+gid,{k:"j",g:gid,d}); else if((D.gk||{})["j_"+gid]) del("gk","j_"+gid);
      closeModal(); toast("Registo dos GR guardado"); },
    del:()=>askConfirm("Apagar o registo dos guarda-redes deste jogo?","Apagar",true).then(ok=>{ if(ok){ del("gk","j_"+gid); closeModal(); } })
  }});
}

/* ---- exercícios de GR ---- */
function gkVEx(sub){
  const all=gkExs(), k=S.gkT||"", list=all.filter(x=>!k||(k==="__sem"?!x.gkt:x.gkt===k)), falta=GK_BASE.filter(b=>!D.exercises[b.id]).length;
  return `<div class="bar"><h2>Guarda-redes</h2>${sub}<span class="sp"></span>${falta?`<button class="btn" data-a="gkBase">${falta===GK_BASE.length?`Juntar ${falta} exercícios base`:`Repor exercícios base (${falta} em falta)`}</button>`:""}<button class="btn primary" data-a="gkExNew">+ Exercício de GR (com desenho)</button></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
    <input class="inp" id="exSearch" placeholder="Procurar exercício…" style="max-width:260px" autocomplete="off">
    <div class="chips"><button class="chip ${!k?"on":""}" data-a="gkT" data-k="">Todos (${all.length})</button>${GK_T.map(g=>{ const n=all.filter(x=>x.gkt===g.k).length; return n?`<button class="chip ${k===g.k?"on":""}" data-a="gkT" data-k="${g.k}">${esc(g.l)} (${n})</button>`:""; }).join("")}${all.some(x=>!x.gkt)?`<button class="chip ${k==="__sem"?"on":""}" data-a="gkT" data-k="__sem">Sem tipo (${all.filter(x=>!x.gkt).length})</button>`:""}</div></div>
  ${list.length?`<div class="excards">${list.map(x=>`<button class="ex" data-a="exView" data-id="${esc(x.id)}" data-name="${esc((x.name+" "+(x.obj||"")+" "+(x.desc||"")+" "+GK_TL(x.gkt)).toLowerCase())}">
    <span class="meta">${x.gkt?`<span class="tag grena">${esc(GK_TL(x.gkt))}</span>`:`<span class="tag warn">Sem tipo</span>`}${x.dur?`<span class="tag">${esc(x.dur)}'</span>`:""}</span>
    ${exThumb(x)}<b>${esc(x.name)}</b><p>${x.obj||x.desc?esc(x.obj||x.desc):`<span style="color:var(--r6)">Sem descrição — toca para escrever</span>`}</p></button>`).join("")}</div><p class="empty" id="exNone" style="display:none"><b>Nenhum exercício encontrado</b></p>`
    :`<div class="empty"><b>${all.length?"Nenhum exercício deste tipo":"Ainda não há exercícios de GR"}</b>${all.length?"":`Começa com os ${GK_BASE.length} exercícios base (com desenho) ou cria os teus. Ficam também na biblioteca de Treinos → Exercícios, na categoria “${esc(gkCat())}”.`}${!all.length&&falta?`<div style="margin-top:12px"><button class="btn primary" data-a="gkBase">Juntar ${falta} exercícios base</button></div>`:""}</div>`}
  <p class="note">Os exercícios de GR são os da categoria “${esc(gkCat())}” da biblioteca. O tipo de trabalho escolhe-se em Editar e conta para “O que temos trabalhado”.</p>`;
}

/* ---- desenhos dos exercícios base: zona da baliza vista de cima (baliza em baixo), 8 px por metro ----
   coordenadas em metros: x a partir do centro da baliza (+ = direita), y a partir da linha de golo (para cima) */
function gkVec(spec){
  const W=440, H=300, s=8, gy=H-18, tx=+(W/2-34*s).toFixed(2), ty=+(gy-105*s).toFixed(2);
  const X=x=>+(W/2+x*s).toFixed(1), Y=y=>+(gy-y*s).toFixed(1), it=[];
  const dsc=(x,y,c,tc,txt)=>it.push({t:"d",x:X(x),y:Y(y),r:8,c,tc,fs:txt.length>2?5.8:7.4,txt});
  const ln=(pts,o)=>it.push({t:"ln",pts:pts.map(([x,y])=>[X(x),Y(y)]),lw:1.8,...o});
  spec.forEach(([k,...a])=>{
    if(k==="G") dsc(a[0],a[1],"#f2bd4b","#2a1a08",a[2]||"GR");
    else if(k==="T") dsc(a[0],a[1],"#ec8420","#fff",a[2]||"T");
    else if(k==="A") dsc(a[0],a[1],"#8a1a30","#fff",a[2]||"");
    else if(k==="B") dsc(a[0],a[1],"#1f5fa8","#fff",a[2]||"");
    else if(k==="b") it.push({t:"ball",x:X(a[0]),y:Y(a[1]),r:3.4});
    else if(k==="bs") it.push({t:"balls",x:X(a[0]),y:Y(a[1]),r:2.9,n:5});
    else if(k==="c") it.push({t:"cone",x:X(a[0]),y:Y(a[1]),s:1.5});
    else if(k==="k") it.push({t:"mk",x:X(a[0]),y:Y(a[1]),r:3.2});
    else if(k==="h") it.push({t:"hurdle",x:X(a[0]),y:Y(a[1]),w:13,a:a[2]||0});
    else if(k==="mg") it.push({t:"goal",x:X(a[0]),y:Y(a[1]),w:20,h:6,a:a[2]||0});
    else if(k==="r") ln(a[0],{c:"#ffffff",arr:a[1]||1});                                   // movimento
    else if(k==="p") ln(a[0],{c:"#f2bd4b",arr:1,dash:"5 3.5",curve:a[0].length>2?1:0});     // passe / cruzamento
    else if(k==="s") ln(a[0],{c:"#e0283a",arr:1,lw:2,curve:a[0].length>2?1:0});          // remate
    else if(k==="d") ln(a[0],{c:"#9ed3ff",arr:1,wave:1,amp:1.8,wl:4.5});                    // condução
    else if(k==="l") ln(a[0],{c:"#ffffff",lw:1.2,dash:"4 3"});                              // linha tracejada
    else if(k==="z"){ const [x0,y0,x1,y1]=a; it.push({t:"rect",x:X(Math.min(x0,x1)),y:Y(Math.max(y0,y1)),w:Math.abs(x1-x0)*s,h:Math.abs(y1-y0)*s,fill:"#f2bd4b",fo:.16,c:"#f2bd4b",lw:1.1,dash:"4 3"}); }
    else if(k==="tx") it.push({t:"txt",x:X(a[0]),y:Y(a[1]),s:9,c:"#ffffff",stroke:"#1c1c1c",sw:1.8,txt:a[2]});
  });
  return {v:2,w:W,h:H,fld:{ori:"v",s,asp:1,tx,ty,L:105,W:68,bands:dvBands(ty,105*s,30)},it};
}
// exercícios base (ids fixos gk01…: juntar outra vez não duplica). Sem dados do Estrela (servem as duas versões).
const GK_BASE = [
  {id:"gk01",name:"Ativação: posição base e deslocamentos laterais",gkt:"pos",dur:8,players:"2-3 GR + treinador",space:"Baliza",mat:"4 sinalizadores, bolas",
    obj:"Ativar e consolidar a posição base: apoios ativos, peso à frente, mãos prontas e deslocamento lateral sem cruzar as pernas.",
    desc:"Quatro sinalizadores em linha a 1 m da linha de golo, de poste a poste. O GR desloca-se lateralmente entre eles em posição base (passos curtos, sem cruzar as pernas). Ao sinal do treinador, ataca a bola em frente (rasteira ou à altura do peito), encaixa e devolve. 6 repetições por GR, alternando o lado da saída.",
    cp:"Cabeça estável na receção. Último apoio orientado para a bola.\nVariante: sinal visual (cor do cone) em vez de sonoro.",
    d:[["k",-3,1],["k",-1,1],["k",1,1],["k",3,1],["G",-2,2.2],["r",[[-2.6,3.3],[2.6,3.3]],2],["T",0,10],["bs",2,10.6],["p",[[0,9.2],[-0.4,3.4]]]]},
  {id:"gk02",name:"Encaixe frontal: rasteira, meia altura e alta",gkt:"enc",dur:10,players:"2-3 GR + treinador",space:"Baliza",mat:"Bolas",
    obj:"Técnica de encaixe nas três alturas: mãos em \"W\" nas bolas altas, em concha nas de meia altura e joelho de apoio nas rasteiras.",
    desc:"Treinador a 9-11 m com bolas. Sequência de 3 bolas — rasteira, à meia altura e alta —, sempre ao corpo do GR. O GR encaixa e devolve à mão. 3 séries de 6 bolas por GR; na última série o remate é mais forte.",
    cp:"Atacar a bola, não esperar por ela. Bola segura junto ao peito antes de se levantar.\nVariante: remate em volley.",
    d:[["G",0,1.8],["T",0,10.5],["bs",2.2,11.2],["s",[[-0.5,9.5],[-1.8,3.2]]],["s",[[0,9.5],[0,3.4]]],["s",[[0.5,9.5],[1.8,3.2]]]]},
  {id:"gk03",name:"Quedas laterais com barreira",gkt:"que",dur:12,players:"2-3 GR + treinador",space:"Baliza",mat:"1 barreira baixa (30 cm), bolas",
    obj:"Queda lateral correta (sobre o lado do corpo, sem cair de costas) depois de um estímulo de saltos.",
    desc:"Barreira baixa a 1 m à frente do GR. O GR salta a barreira a pés juntos, recupera a posição base e faz queda lateral para defender a bola rasteira que o treinador envia para o lado (direita e esquerda alternadas). Levanta-se e regressa por fora. 2 × 6 por lado.",
    cp:"Passo de ataque lateral antes da queda. Mãos à frente do corpo.\nVariante: barreira mais alta ou duas barreiras seguidas.",
    d:[["G",0,1.2],["h",0,2.8],["r",[[0,1.9],[0,3.6]]],["T",0,10],["bs",-2,10.6],["s",[[0.3,9.2],[-3,4]]],["s",[[0.5,9.2],[3.2,4]]]]},
  {id:"gk04",name:"Mergulhos ao poste longe — dois servidores",gkt:"que",dur:12,players:"2 GR + 2 servidores",space:"Área",mat:"Bolas",
    obj:"Mergulho (voo) à meia altura e ajuste da posição ao ângulo de cada remate.",
    desc:"Dois servidores na entrada da área, um à esquerda e outro à direita (13-14 m). Rematam alternadamente para o poste mais distante, à meia altura. O GR ajusta a posição ao ângulo de cada remate e mergulha. 2 séries de 8 remates.",
    cp:"Passo de ajuste antes do remate e apoios paralelos no momento do remate. Desviar para fora, nunca para a frente.\nVariante: só o sinal do treinador diz quem remata.",
    d:[["G",0,1.8],["T",-8,13,"S1"],["bs",-10,13.6],["T",8,13,"S2"],["bs",10,13.6],["s",[[-7.3,12.2],[3.3,0.6]]],["s",[[7.3,12.2],[-3.3,0.6]]],["l",[[0,0],[-8,13]]]]},
  {id:"gk05",name:"Reação com bloqueio de visão",gkt:"ref",dur:10,players:"2 GR + treinador + 1 jogador",space:"Área",mat:"Bolas",
    obj:"Reagir a uma bola que aparece tarde, como num remate tapado em jogo.",
    desc:"Um jogador de pé entre o treinador e o GR, a 5 m da baliza, sai para o lado no último momento antes do remate (ou deixa passar a bola entre as pernas). Remate a 10-12 m. 3 × 5 remates por GR.",
    cp:"Posição base baixa e mãos ativas. Não se adiantar.\nVariante: dois jogadores a tapar.",
    d:[["G",0,1.6],["A",0,5.2,"J"],["r",[[0.8,5.6],[3.4,6.4]]],["T",0,11.5],["bs",2,12.1],["s",[[-0.4,10.6],[-1.6,1.4]]]]},
  {id:"gk06",name:"Reflexos de perto: bolas rápidas a 5-6 m",gkt:"ref",dur:8,players:"2 GR + treinador",space:"Baliza",mat:"Bolas",
    obj:"Velocidade de reação e de mãos em bolas a curta distância.",
    desc:"GR em posição base; o treinador, a 5-6 m, remata ou lança rápido para os lados do corpo e à cabeça. 4 séries de 6 bolas com 30 s de pausa.",
    cp:"Mãos à frente dos olhos, cotovelos fletidos.\nVariante: GR de costas que roda ao sinal.",
    d:[["G",0,1.6],["T",0,7.5],["bs",2,8.1],["s",[[-0.6,6.6],[-2.4,2.4]]],["s",[[0.6,6.6],[2.4,2.4]]],["s",[[0,6.5],[0,3.4]]]]},
  {id:"gk07",name:"1x1: saída aos pés",gkt:"x1",dur:15,players:"2 GR + 3-4 atacantes",space:"Área + 10 m",mat:"2 cones, bolas",
    obj:"Saídas aos pés no 1x1: tempo de saída, redução do ângulo e técnica de bloqueio.",
    desc:"O atacante parte com bola dos 25 m (cones), conduz para a baliza e tenta marcar. O GR lê o momento da saída: encurta quando a bola se afasta do pé e fica em bloco (\"K\" ou \"estrela\") à distância de remate. 2 × 5 por GR; o atacante seguinte parte quando o anterior termina.",
    cp:"Sair quando o atacante toca a bola longe; parar e baixar antes do remate. Nunca ir ao chão primeiro.\nVariante: um defensor a recuperar por trás do atacante.",
    d:[["c",-2.5,26],["c",2.5,26],["A",0,25,"A"],["b",0.9,24],["d",[[0.4,23.2],[0.2,12.5]]],["G",0,1.6],["r",[[0,2.6],[0,7.6]]],["l",[[-3.66,0],[0.2,12]]],["l",[[3.66,0],[0.2,12]]]]},
  {id:"gk08",name:"Fecho do ângulo em remates de diagonal",gkt:"pos",dur:12,players:"2 GR + treinador",space:"Área",mat:"5 cones, bolas",
    obj:"Posicionamento na baliza em função da bola (bissetriz) e distância à linha.",
    desc:"Bolas em 5 posições em arco na entrada da área (cones). O treinador remata de cada posição pela ordem; antes de cada remate o GR ajusta a posição na bissetriz do ângulo (linha imaginária bola – centro da baliza). 2 voltas por GR.",
    cp:"Ajustar com passos curtos e estar parado no remate. Nas posições de ângulo fechado, cobrir o primeiro poste.\nVariante: passe e remate ao primeiro toque.",
    d:[["c",-12,12.5],["b",-11.2,12],["c",-7,15.6],["b",-6.2,15.1],["c",0,17],["b",0.8,16.5],["c",7,15.6],["b",7.8,15.1],["c",12,12.5],["b",12.8,12],["l",[[0,0],[-11.2,12]]],["G",-1.4,2.2]]},
  {id:"gk09",name:"Cruzamentos: saída aérea com oposição",gkt:"aer",dur:15,players:"2 GR + 2 cruzadores + 1x1 na área",space:"Meio-campo",mat:"Bolas",
    obj:"Decisão e técnica na saída aérea: atacar a bola no ponto mais alto, joelho de proteção e comunicação (\"minha\" / \"fora\").",
    desc:"Cruzamentos alternados dos dois corredores, junto à linha de fundo. Na área estão 1 atacante e 1 defensor. O GR decide: sai e agarra ou soca, ou fica e orienta a defesa. 2 × 6 cruzamentos por GR.",
    cp:"Posição inicial ligeiramente à frente da linha e virada para o cruzador. Chamar alto e cedo. Socar para os lados quando há contacto.",
    d:[["T",-22,5,"C"],["bs",-23.5,3.6],["p",[[-21,5.6],[-10,11],[1,7.4]]],["T",22,5,"C"],["bs",23.5,3.6],["A",2.6,8.6,"9"],["B",0.6,6,"4"],["G",0,1.8],["r",[[0.2,2.8],[0.8,6.2]]]]},
  {id:"gk10",name:"Remate e recarga (segunda bola)",gkt:"que",dur:12,players:"2 GR + treinador + 1 jogador",space:"Área",mat:"Bolas",
    obj:"Defender para fora da zona de recarga e levantar-se depressa para a segunda defesa.",
    desc:"O treinador remata de 14 m; o GR defende para o lado. Um segundo jogador, a 8 m, ataca a bola solta e remata de imediato. O GR levanta-se e defende a recarga. 3 × 5.",
    cp:"Na primeira defesa, desviar para os lados (nunca para a frente). Levantar com o apoio mais próximo da bola.\nVariante: recarga de cabeça (bola lançada à mão).",
    d:[["G",0,1.6],["T",0,14],["bs",2,14.6],["s",[[0,13.2],[-3,1.6]]],["A",6,8,"2"],["r",[[5.3,7.6],[-1.6,4.4]]]]},
  {id:"gk11",name:"Jogo de pés: receção orientada e passe para os corredores",gkt:"pes",dur:12,players:"2 GR + 2 jogadores",space:"Meio-campo",mat:"2 mini-balizas, bolas",
    obj:"Receção orientada, primeiro toque para fora da pressão e passe tenso e preciso.",
    desc:"O defesa central passa ao GR (atraso de 15-20 m). O GR recebe orientado para o lado contrário ao da pressão (o treinador indica o lado) e passa para uma das duas mini-balizas nos corredores, a 25 m. 2 × 8 por GR, com o pé direito e com o esquerdo.",
    cp:"Olhar antes de receber. Abrir o corpo. Pé de apoio orientado para o alvo.\nVariante: pressão real de um avançado.",
    d:[["A",-9,15,"4"],["p",[[-8.3,14.4],[-0.7,4]]],["G",0,3.2],["B",5,10,"9"],["r",[[4.4,9.3],[1.8,5.6]]],["mg",-23,27],["mg",23,27],["p",[[0.8,3.8],[21.5,25.5]]]]},
  {id:"gk12",name:"Reposição: lançamento à mão e pontapé",gkt:"pes",dur:10,players:"2 GR + 3 recetores",space:"Meio-campo",mat:"Sinalizadores, bolas",
    obj:"Precisão e rapidez de reposição para começar o ataque (transição).",
    desc:"Três zonas-alvo marcadas (corredor direito, corredor esquerdo e centro a 28-32 m). O treinador diz a zona e o GR repõe: lançamento rasteiro ou picado à mão para as zonas perto, pontapé de baliza ou de volley para as longe. Pontos por bola recebida dentro da zona.",
    cp:"Escolher a reposição pela distância: mão até 25 m, pé acima disso. Lançamento com o braço estendido e passo à frente.\nVariante: contra-ataque depois de uma defesa (repor em menos de 3 s).",
    d:[["z",-25,17,-16,23],["z",16,17,25,23],["z",-5,27,5,33],["A",-20.5,20,"2"],["A",20.5,20,"3"],["A",0,30,"8"],["G",0,4],["b",1,4.8],["p",[[-0.6,4.6],[-19,19.4]]],["p",[[0.6,4.8],[19,19.4]]],["p",[[0,5],[0,28.6]]]]},
  {id:"gk13",name:"Saída de pressão: GR + 2 centrais contra 2 avançados",gkt:"jog",dur:15,players:"GR + 4 jogadores",space:"Área até aos 30 m",mat:"2 mini-balizas, coletes, bolas",
    obj:"Construção desde o GR sob pressão: apoio do GR, ligação com os centrais e decisão (curto ou longo).",
    desc:"Espaço da área até aos 30 m. O GR e 2 centrais contra 2 avançados. Cada jogada começa no GR; a equipa do GR marca ao passar ou conduzir para uma das duas mini-balizas no limite do espaço; os avançados marcam na baliza grande. 4 × 2 minutos.",
    cp:"O GR sempre disponível em linha de passe. Receção para o lado contrário da pressão.\nVariante: 3x2 com um médio.",
    d:[["mg",-12,30],["mg",12,30],["A",-11,10,"4"],["A",11,10,"5"],["B",-4,13,"9"],["B",5,14,"10"],["G",0,3],["b",0.9,3.8],["p",[[-0.8,3.6],[-10,9.2]]],["r",[[-4.4,12.2],[-9,10.6]]]]},
  {id:"gk14",name:"Penáltis: leitura do rematador",gkt:"bp",dur:10,players:"2 GR + rematadores",space:"Área",mat:"Bolas",
    obj:"Ler os sinais do rematador (corrida, pé de apoio) e técnica no penálti (um pé na linha).",
    desc:"Série de penáltis com rematadores diferentes. Antes da série, o GR revê as tendências (pé, lado, corrida). Mantém pelo menos um pé na linha até ao remate, lê a corrida e o pé de apoio e só depois escolhe o lado. 2 séries de 5.",
    cp:"Corpo grande, braços abertos e movimento para atrasar a decisão do rematador. No fim, registar quem marcou e para que lado.",
    d:[["G",0,0.9],["b",0,11],["A",-2.8,14.2,"9"],["r",[[-2.3,13.5],[-0.8,11.7]]],["s",[[0.4,10.5],[2.8,0.5]]]]},
  {id:"gk15",name:"Situação de jogo: defender a área em 3x2",gkt:"jog",dur:15,players:"GR + 5 jogadores",space:"Área até aos 30 m",mat:"Coletes, bolas",
    obj:"Comunicação e organização defensiva do GR em inferioridade numérica; decidir entre sair e ficar.",
    desc:"Três atacantes partem dos 30 m contra 2 defensores e o GR. O GR comunica e organiza (posição dos defesas, linha de passe a fechar) e defende o remate. Ao recuperar a bola, a equipa do GR sai em passe para o corredor. 6 a 8 ataques por GR.",
    cp:"Falar cedo e curto (\"sai\", \"fecha\", \"tempo\"). Posição na baliza em função do portador e do passe provável.",
    d:[["B",-11,28,"7"],["B",0,30,"9"],["b",0.9,29],["B",11,28,"11"],["r",[[-10.6,27],[-7,20]]],["d",[[0.2,28.4],[0.2,22]]],["r",[[10.6,27],[7,20]]],["A",-5,17,"4"],["A",5,17,"5"],["G",0,2.4]]},
  {id:"gk16",name:"Ativação: potência de pernas e quedas",gkt:"fis",dur:8,players:"2-3 GR",space:"Junto à baliza",mat:"4 barreiras baixas, 4 cones, bola",
    obj:"Ativar os membros inferiores e preparar as quedas antes do treino de baliza.",
    desc:"Circuito curto: 4 barreiras baixas em linha (saltos a pés juntos), slalom entre 4 cones em posição base e queda para a bola parada no fim. 4 voltas com recuperação a andar.",
    cp:"Aterragens silenciosas, com o peso nas pontas dos pés. Na queda, apoio lateral (anca, coxa, ombro).",
    d:[["G",-22,18],["h",-18,18,90],["h",-15.5,18,90],["h",-13,18,90],["h",-10.5,18,90],["c",-6,19.2],["c",-3,16.8],["c",0,19.2],["c",3,16.8],["b",8,18],["r",[[-20.6,18],[-8.2,18],[-4.5,16.6],[-1.5,19.4],[1.5,16.6],[4.5,19.4],[7,18.2]]]]}
];

/* ---- PDF: plano de uma sessão e plano da semana ---- */
const GK_PCSS = `<style>.gkpl{width:100%;border-collapse:collapse}.gkex{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
  .gkex>div{border:1px solid #e3d6d9;border-radius:8px;padding:6px 8px;break-inside:avoid;page-break-inside:avoid}.gkex svg{border-radius:6px}
  .gkex h4{margin:4px 0 2px;font-size:12.5px;color:#6b1426}.gkex p{margin:0;font-size:10.5px;line-height:1.35;white-space:pre-line;color:#3a2a2f}
  .gkex .k{font-size:10px;color:#7a666c;margin:2px 0}.gkday{break-inside:avoid;page-break-inside:avoid;margin-bottom:6px}</style>`;
function gkPlanHTML(s,{ex=true}={}){
  const plan=s.plan||[], tr=gkTrOf(s), gk=gkPlayers();
  const rows=plan.map((x,i)=>{ const e=x.ex?D.exercises[x.ex]:null; return `<tr><td class="c">${i+1}</td><td><b>${esc(x.name||(e&&e.name)||"Bloco")}</b>${x.n?`<div style="color:#5a4a50">${esc(x.n)}</div>`:""}</td><td>${esc(GK_TL(gkBlockT(x))||"—")}</td><td class="c">${x.min!=null&&x.min!==""?esc(x.min)+"'":"—"}</td></tr>`; }).join("");
  const cards=ex?plan.map(x=>{ const e=x.ex?D.exercises[x.ex]:null; if(!e) return ""; const v=exVecOf(e);
    return `<div>${v?vecSVG(v,{r:6}):""}<h4>${esc(x.name||e.name)}</h4><div class="k">${esc([GK_TL(gkBlockT(x)),x.min?x.min+"'":"",e.players,e.space].filter(Boolean).join(" · "))}</div>${e.desc?`<p>${esc(e.desc)}</p>`:""}${e.cp?`<p style="margin-top:3px"><i>${esc(e.cp)}</i></p>`:""}${e.mat?`<p style="margin-top:3px"><b>Material:</b> ${esc(e.mat)}</p>`:""}</div>`; }).filter(Boolean):[];
  const info=[["Data",cap1(fmtD(s.date,{weekday:"long",day:"numeric",month:"long"}))],["Hora",s.time||"—"],["Duração",s.dur?s.dur+"'":gkMin(s)?gkMin(s)+"' (plano)":"—"],["Intensidade",s.int||"—"],["Treino da equipa",tr?[tr.time,tr.theme].filter(Boolean).join(" — ")||"Sim":"Sessão extra"],["Guarda-redes",gk.map(p=>p.name+(avail(p.id)!=="ok"?` (${AV[avail(p.id)].l.toLowerCase()})`:"")).join(", ")||"—"]];
  return `<div class="kv">${info.map(([l,v])=>pRow(l,v)).join("")}</div>
    ${s.obj?`<p style="margin:6px 0"><b>Objetivos:</b> ${esc(s.obj)}</p>`:""}
    ${plan.length?`<table class="gkpl"><thead><tr><th class="c">#</th><th>Exercício</th><th>Tipo de trabalho</th><th class="c">Min</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td></td><td colspan="2"><b>Total</b></td><td class="c"><b>${gkMin(s)}'</b></td></tr></tfoot></table>`:`<p class="note">Plano por fazer.</p>`}
    ${cards.length?`<div class="gkex">${cards.join("")}</div>`:""}`;
}
function gkPrint(id){
  const s0=(D.gk||{})[id]; if(!s0) return; const s={id,...s0};
  printDoc(`sessao-gr-${s.date}`,`Treino de guarda-redes — ${s.theme||fmtD(s.date)}`,GK_PCSS+gkPlanHTML(s)+(s.notes?`<h2>Notas</h2><p>${esc(s.notes)}</p>`:""));
}
function gkWeekPrint(mon){
  const end=addDays(mon,6), ss=gkSess().filter(s=>s.date>=mon&&s.date<=end); if(!ss.length){ toast("Sem sessões de GR nesta semana."); return; }
  const tot=ss.reduce((a,s)=>a+gkMin(s),0), m={}; ss.forEach(s=>(s.plan||[]).forEach(x=>{ const k=gkBlockT(x); if(k&&+x.min) m[k]=(m[k]||0)+(+x.min); }));
  const res=Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${esc(GK_TL(k))} <b>${v}'</b>`).join(" · ");
  const body=GK_PCSS+`<p style="margin:0 0 6px"><b>${plural(ss.length,"sessão","sessões")}</b> · ${tot}' planeados${res?` — ${res}`:""}</p>`
    +ss.map(s=>`<div class="gkday"><h2>${esc(cap1(fmtD(s.date,{weekday:"long",day:"numeric",month:"short"})))}${s.theme?" — "+esc(s.theme):""}</h2>${gkPlanHTML(s,{ex:false})}</div>`).join("");
  printDoc(`semana-gr-${mon}`,`Treinos de guarda-redes — semana de ${fmtD(mon,{day:"numeric",month:"short"})}`,body);
}

/* ---- formulários ---- */
function gkNewForm(d,ev){
  const t=todayISO(), date=validISO(d)?d:(trainings().find(e=>e.date>=t&&!gkSessOfTr(e.id))||{}).date||t;
  const trs=trainings().filter(e=>e.date===date);
  modal({title:"Nova sessão de GR",body:`<div class="form">
      <label class="fld">Data<input type="date" name="date" value="${esc(date)}" data-c="gkNewD"></label>
      <label class="fld">Hora<input type="time" name="time" value="${esc((trs.find(e=>e.id===ev)||trs[0]||{}).time||"")}"></label>
      <label class="fld full" id="gkNewTr">Treino da equipa${sel("ev",trs.map(e=>({v:e.id,l:[e.time,e.theme||"Treino"].filter(Boolean).join(" — ")})),ev||(trs[0]||{}).id||"","",trs.length?"Nenhum (sessão extra)":"Não há treino da equipa neste dia")}</label>
      <label class="fld full">Tema<input name="theme" placeholder="Ex.: Quedas e 1x1"></label>
      <label class="fld">Duração (min)<input name="dur" inputmode="numeric" placeholder="Ex.: 30"></label></div>`,
    foot:footSave("Criar"),ctx:{save:()=>{ const dt=fv("date"), dur=parseNum(fv("dur"));
      if(!validISO(dt)){ toast("Escolhe a data."); return; } if(dur!=null&&(dur<1||dur>300)){ toast("A duração tem de estar entre 1 e 300 minutos."); return; }
      const ev2=fv("ev"), tr=ev2&&D.events[ev2]; if(ev2&&gkSessOfTr(ev2)&&gkSessOfTr(ev2).ev===ev2){ toast("Esse treino já tem sessão de GR."); return; }
      const nid=uid("gk_"); put("gk",nid,{k:"s",date:dt,time:fv("time")||(tr&&tr.time)||"",dur,ev:ev2||"",theme:fv("theme"),int:"",obj:"",plan:[],ob:{},notes:""});
      closeModal(); openPage("gk",nid); }}});
}
function gkDupForm(id){
  const s=(D.gk||{})[id]; if(!s) return; const t=todayISO();
  const nx=trainings().find(e=>e.date>t&&e.date!==s.date&&!gkSessOfTr(e.id)), def=nx?nx.date:addDays(s.date,7);
  modal({title:"Duplicar sessão de GR",sub:"Copia o plano e os objetivos (sem presenças, avaliações nem notas).",body:`<div class="form"><label class="fld">Para o dia<input type="date" name="date" value="${esc(def)}"></label></div>`,
    foot:footSave("Duplicar"),ctx:{save:()=>{ const dt=fv("date"); if(!validISO(dt)){ toast("Escolhe a data."); return; }
      const tr=trainings().find(e=>e.date===dt&&!gkSessOfTr(e.id)), nid=uid("gk_");
      put("gk",nid,{k:"s",date:dt,time:tr?tr.time||"":s.time||"",dur:s.dur??null,ev:tr?tr.id:"",theme:s.theme||"",int:s.int||"",obj:s.obj||"",plan:clone(s.plan||[]),ob:{},notes:""});
      closeModal(); toast("Sessão duplicada"); openPage("gk",nid); }}});
}
function gkPicker(id){
  const all=exercises(), cat=gkCat(), gk=all.filter(isGkEx);
  const card=x=>`<button class="pick" data-a="gkPickAdd" data-id="${esc(id)}" data-x="${esc(x.id)}" data-name="${esc((x.name+" "+(x.cat||"")+" "+GK_TL(x.gkt)+" "+(x.obj||"")).toLowerCase())}">
    ${exImg(x)?`<img src="${esc(exImg(x))}" alt="" loading="lazy">`:`<span class="noimg">sem desenho</span>`}<b>${esc(x.name)}</b><small>${esc([GK_TL(x.gkt)||x.cat,x.dur?x.dur+"'":""].filter(Boolean).join(" — "))}</small></button>`;
  modal({title:"Exercícios de GR",sub:"Toca para juntar ao plano (podes juntar vários seguidos)",big:true,
    body:`<input class="inp" id="pickSearch" placeholder="Procurar…" autocomplete="off" style="margin-bottom:10px">
      <div class="chips" style="margin-bottom:10px"><button class="chip on" data-a="pickCat" data-k="">Todos os de GR (${gk.length})</button>${GK_T.filter(g=>gk.some(x=>x.gkt===g.k)).map(g=>`<button class="chip" data-a="pickCat" data-k="${esc(g.l.toLowerCase())}">${esc(g.l)}</button>`).join("")}</div>
      ${gk.length?`<div class="picks" id="pickGrid">${gk.map(card).join("")}</div>`:`<div class="empty"><b>Ainda não há exercícios de GR</b>Em Guarda-redes → Exercícios junta os exercícios base ou cria os teus (categoria “${esc(cat)}”).</div>`}<p class="empty" id="pickNone" style="display:none"><b>Nenhum exercício encontrado</b></p>`,
    foot:`<span class="small muted">${plural(gk.length,"exercício")} de GR</span><span class="right"><button class="btn primary" data-a="mClose">Fechar</button></span>`,ctx:{pick:true}});
}
const gkSave = (id,fn) => { const s=clone((D.gk||{})[id]); if(!s) return; fn(s); put("gk",id,s); };

/* ---- ligação no treino da equipa ---- */
function gkTrCard(trId){
  const s=gkSessOfTr(trId), gk=gkPlayers(); if(!gk.length && !s) return "";
  return `<section class="card" style="margin-top:14px"><div class="card-h"><h3>Treino de guarda-redes</h3>${s?`<button class="btn sm" data-a="page" data-p="gk" data-id="${esc(s.id)}">Abrir</button>`:`<button class="btn sm" data-a="gkNew" data-d="${esc(D.events[trId].date)}" data-ev="${esc(trId)}">+ Sessão de GR</button>`}</div>
    <div class="card-b small">${s?`<b>${esc(s.theme||"Sessão de GR")}</b> — ${(s.plan||[]).length?`${plural((s.plan||[]).length,"exercício")} · ${gkMin({plan:s.plan})}'`:"por planear"}${(s.plan||[]).length?`<div class="muted" style="margin-top:4px">${(s.plan||[]).map(x=>esc(x.name||"Bloco")).join(" · ")}</div>`:""}`:`<span class="muted">Ainda sem sessão do treinador de GR para este treino.</span>`}</div></section>`;
}

/* ---- ficha do atleta (só GR): época na baliza e últimas avaliações nas sessões de GR ---- */
function gkAthCard(pid){
  const p=P(pid); if(!isGK(p)) return "";
  const t=gkSeason()[pid]||{j:0,min:0,gs:0,gsMin:0,cs:0,def:0,defN:0,err:0,notas:[],rs:[],semGs:0};
  const ss=gkSess().filter(s=>s.ob&&s.ob[pid]&&(s.ob[pid].r||s.ob[pid].t)).reverse().slice(0,5), n1=v=>fmt1(v).replace(".",",");
  const rs=gkSess().map(s=>s.ob&&s.ob[pid]&&+s.ob[pid].r).filter(Boolean);
  return `<section class="card"><div class="card-h"><h3>Guarda-redes</h3><button class="btn sm" data-a="tab" data-t="gr">Abrir separador</button></div><div class="card-b">
    <div class="mkpis"><div><span>Jogos</span><b>${t.j}</b><small class="muted">${t.min}'</small></div><div><span>Golos sofridos</span><b>${t.gs}${t.semGs?`<small class="muted"> +${t.semGs}?</small>`:""}</b><small class="muted">${t.gsMin?n1(t.gs*90/t.gsMin)+" por 90'":""}</small></div>
      <div><span>Sem sofrer</span><b>${t.cs}</b></div><div><span>Defesas</span><b>${t.defN?t.def:"–"}</b></div><div><span>Sessões de GR</span><b>${rs.length?n1(avg(rs)):"–"}</b><small class="muted">${rs.length?`média de ${plural(rs.length,"avaliação","avaliações")} (1-5)`:"sem avaliações"}</small></div></div>
    ${ss.length?`<div class="list" style="margin-top:10px">${ss.map(s=>{ const o=s.ob[pid]; return `<button class="li" data-a="page" data-p="gk" data-id="${esc(s.id)}"><span class="main"><b>${esc(fmtD(s.date,{day:"numeric",month:"short"}))} — ${esc(s.theme||"Sessão de GR")}</b>${o.t?`<small>${esc(o.t)}</small>`:""}</span>${o.r?`<span class="tag ${o.r>=4?"ok":o.r<=2?"bad":"warn"}">${o.r}/5</span>`:""}</button>`; }).join("")}</div>`:""}
  </div></section>`;
}

Object.assign(A,{
  gksub: el => { S.grsub=el.dataset.k; render(); },
  gkWkNav: el => { const n=+el.dataset.n; S.gkWk=n?(S.gkWk||0)+n:0; render(); },
  gkPer: el => { S.gkPer=el.dataset.k; render(); },
  gkT: el => { S.gkT=el.dataset.k; render(); },
  gkNew: el => gkNewForm(el.dataset.d||"",el.dataset.ev||""),
  gkWeekGen: el => { const mon=el.dataset.w, trs=trainings().filter(e=>e.date>=mon&&e.date<=addDays(mon,6)&&!gkSessOfTr(e.id)); if(!trs.length){ toast("Todos os treinos desta semana já têm sessão de GR."); return; }
    trs.forEach(tr=>put("gk",uid("gk_"),{k:"s",date:tr.date,time:tr.time||"",dur:null,ev:tr.id,theme:"",int:"",obj:"",plan:[],ob:{},notes:""}));
    toast(trs.length===1?"1 sessão de GR criada":`${trs.length} sessões de GR criadas`); },
  gkDel: el => { const id=el.dataset.id; askConfirm("Eliminar esta sessão de GR?","Eliminar",true).then(ok=>{ if(ok){ del("gk",id); back(); } }); },
  gkDup: el => gkDupForm(el.dataset.id),
  gkPick: el => gkPicker(el.dataset.id),
  gkPickAdd: el => { const ex=D.exercises[el.dataset.x]; if(!ex) return; gkSave(el.dataset.id,s=>{ s.plan=s.plan||[]; s.plan.push({ex:el.dataset.x,name:ex.name,min:ex.dur??null,t:ex.gkt||"",n:""}); }); toast(`${ex.name} adicionado`); },
  gkFree: el => gkSave(el.dataset.id,s=>{ s.plan=s.plan||[]; s.plan.push({ex:"",name:"Bloco livre",min:null,t:"",n:""}); }),
  gkMove: el => { const i=+el.dataset.i, n=+el.dataset.n; gkSave(el.dataset.id,s=>{ const p=s.plan||[], j=i+n; if(j<0||j>=p.length) return; [p[i],p[j]]=[p[j],p[i]]; }); },
  gkDelB: el => { const i=+el.dataset.i; gkSave(el.dataset.id,s=>{ (s.plan||[]).splice(i,1); }); },
  gkRate: el => { const {id,p}=el.dataset, n=+el.dataset.n; gkSave(id,s=>{ s.ob=s.ob||{}; const o={...(s.ob[p]||{})}; if(+o.r===n) delete o.r; else o.r=n; if(Object.keys(o).length) s.ob[p]=o; else delete s.ob[p]; }); },
  gkAtt: el => { const {id,p,s:st}=el.dataset; gkSave(id,s=>{ s.ob=s.ob||{}; const o={...(s.ob[p]||{})}; if(o.s===st) delete o.s; else o.s=st; if(Object.keys(o).length) s.ob[p]=o; else delete s.ob[p]; }); },
  gkGame: el => gkGameForm(el.dataset.id),
  gkPr: el => printAsk("gk",el.dataset.id),
  gkPrW: el => printAsk("gkw",el.dataset.w),
  gkExNew: () => exForm(null,{cat:gkCat()}),
  gkBase: () => { const cat=gkCat(); let n=0;
    GK_BASE.forEach(b=>{ if(D.exercises[b.id]) return; const {id,d,...x}=b; put("exercises",id,{...x,cat,mom:[],pr:[],vec:gkVec(d)}); n++; });
    toast(n===1?"1 exercício juntado à biblioteca":n?`${n} exercícios de GR juntados à biblioteca`:"A biblioteca já tem os exercícios base."); }
});
Object.assign(Cg,{
  gkPlan: el => { const {id,f}=el.dataset, i=+el.dataset.i; let v=el.value.trim();
    if(f==="min"){ v=parseNum(v); if(v!=null&&(v<0||v>300)){ toast("Os minutos têm de estar entre 0 e 300."); schedule(); return; } }
    gkSave(id,s=>{ const b=(s.plan||[])[i]; if(b) b[f]=v; }); },
  gkOb: el => { const {id,p}=el.dataset, v=el.value.trim(); gkSave(id,s=>{ s.ob=s.ob||{}; const o={...(s.ob[p]||{})}; if(v) o.t=v; else delete o.t; if(Object.keys(o).length) s.ob[p]=o; else delete s.ob[p]; }); },
  gkAddEx: el => { const x=el.value; el.value=""; const ex=D.exercises[x]; if(!ex) return; gkSave(el.dataset.id,s=>{ s.plan=s.plan||[]; s.plan.push({ex:x,name:ex.name,min:ex.dur??null,t:ex.gkt||"",n:""}); }); },
  gkNewD: el => { const d=el.value, trs=trainings().filter(e=>e.date===d), box=$("#gkNewTr"); if(!box) return;
    box.innerHTML=`Treino da equipa${sel("ev",trs.map(e=>({v:e.id,l:[e.time,e.theme||"Treino"].filter(Boolean).join(" — ")})),(trs.find(e=>!gkSessOfTr(e.id))||trs[0]||{}).id||"","",trs.length?"Nenhum (sessão extra)":"Não há treino da equipa neste dia")}`;
    const tm=$('#dlg [name="time"]'); if(tm&&!tm.value&&trs[0]&&trs[0].time) tm.value=trs[0].time; },
  exCatChg: el => { const g=/guarda[\s-]*redes/i.test(el.value); $$("#dlg [data-gkonly]").forEach(x=>x.style.display=g?"":"none"); }
});
