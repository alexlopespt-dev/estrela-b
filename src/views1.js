/* ================= estado de navegação ================= */
const TABS = [
  {k:"painel",l:"Painel"},{k:"agenda",l:"Agenda"},{k:"treinos",l:"Treinos"},{k:"jogos",l:"Jogos"},
  {k:"plantel",l:"Plantel"},{k:"testes",l:"Testes físicos"},{k:"clinico",l:"Clínico"},{k:"mon",l:"Monitorização"},{k:"scouting",l:"Scouting"},{k:"adv",l:"Adversários"},{k:"stats",l:"Estatísticas"}
];
const S = { pm:todayISO().slice(0,7), mdl:"", dist:"", tab:"painel", page:null, cal:todayISO().slice(0,7), day:todayISO(), tsub:"sessoes", exCat:"", jComp:"", plGroup:"", tmom:null, scSt:"", stComp:"", stSort:"min", stDir:-1 };
try{ const s=JSON.parse(localStorage.getItem(LS+":ui")||"null"); if(s&&TABS.some(t=>t.k===s.tab)) S.tab=s.tab; }catch(e){}
function saveUI(){ try{ localStorage.setItem(LS+":ui",JSON.stringify({tab:S.tab})); }catch(e){} }
function go(tab){ S.tab=tab; S.page=null; saveUI(); render(); window.scrollTo({top:0}); }
function openPage(name,id){ S.page={name,id}; render(); window.scrollTo({top:0}); }
function back(){ S.page=null; render(); window.scrollTo({top:0}); }

/* ================= render principal ================= */
function render(){
  const m=meta();
  $("#tTeam").textContent = m.team || "Estrela B";
  $("#tSub").innerHTML = ["Departamento técnico", m.comp?esc(m.comp):"", m.season?"Época <b>"+esc(m.season)+"</b>":""].filter(Boolean).join(" — ");
  const nAl = alerts().filter(a=>a.cls!=="info").length, nInj = injuries().filter(i=>i.status!=="alta").length;
  $("#tabs").innerHTML = TABS.map(t=>{ const n = t.k==="painel"?nAl : t.k==="clinico"?nInj : 0;
    return `<button role="tab" data-a="tab" data-t="${t.k}" aria-selected="${S.tab===t.k && !S.page ? "true" : S.tab===t.k ? "true":"false"}">${t.l}${n?`<span class="dot">${n}</span>`:""}</button>`; }).join("");
  const main=$("#main");
  if(MODE==="loading"){ main.innerHTML=`<div class="empty" style="margin-top:20px"><b>A carregar…</b></div>`; return; }
  let h="";
  try{
    if(S.page){
      const f={treino:pTreino,jogo:pJogo,atleta:pAtleta,alvo:pAlvo,adversario:pOpp}[S.page.name];
      h = f ? f(S.page.id) : "";
      if(!h){ S.page=null; }
    }
    if(!S.page){
      h = ({painel:vPainel,agenda:vAgenda,treinos:vTreinos,jogos:vJogos,plantel:vPlantel,testes:vTestes,clinico:vClinico,mon:vMon,scouting:vScouting,adv:vOpp,stats:vStats}[S.tab]||vPainel)();
    }
  }catch(err){
    console.error(err);
    h=`<div class="empty" style="margin-top:20px"><b>Algo correu mal a mostrar esta página.</b>Volta ao painel e tenta de novo.<br><br><button class="btn" data-a="tab" data-t="painel">Ir para o painel</button></div>`;
  }
  main.innerHTML=h;
  const st=$("#tabs [aria-selected=true]"), tb=$("#tabs"); if(st&&tb) tb.scrollLeft=Math.max(0,st.offsetLeft-tb.clientWidth/2+st.clientWidth/2);
}

/* ================= alertas ================= */
function nextTestMonth(){
  const t=todayISO(), m=+t.slice(5,7), y=+t.slice(0,4);
  if(m>=9) return {m:1,y:y+1}; if(m>=5) return {m:9,y}; return {m:5,y};
}
const MONTHS=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function alerts(){
  const t=todayISO(), out=[];
  trainings().filter(tr=>tr.date<t && !tr.closed).forEach(tr=>out.push({cls:"warn",title:`Treino por fechar — ${fmtD(tr.date,{weekday:"short",day:"numeric",month:"short"})}`,sub:"Marca as presenças e fecha o treino.",a:"page",p:"treino",id:tr.id}));
  games().filter(g=>g.date<=t && !g.closed).forEach(g=>out.push({cls:"bad",title:`Jogo por fechar — ${g.opp?"vs "+g.opp:"adversário por definir"}`,sub:parseNum(g.ga)==null?"Falta o resultado do adversário e fechar a ficha de jogo.":"Revê a ficha de jogo e fecha-a.",a:"page",p:"jogo",id:g.id}));
  const ng=games().find(g=>g.date>=t);
  if(ng && !(ng.call||[]).length && dayDiff(t,ng.date)<=5) out.push({cls:"warn",title:`Convocatória por fazer — ${ng.opp?"vs "+ng.opp:"próximo jogo"}`,sub:fmtLong(ng.date),a:"page",p:"jogo",id:ng.id});
  injuries().filter(i=>i.status!=="alta" && validISO(i.exp) && i.exp<t).forEach(i=>out.push({cls:"warn",title:`Retorno previsto ultrapassado — ${pname(i.pid)}`,sub:`Previsto para ${fmtD(i.exp)}. Atualiza o estado da lesão.`,a:"tab",t:"clinico"}));
  const nt=nextTestMonth(), ms=testMoments(), last=ms[ms.length-1];
  if(last){ const n=Object.keys(last.res||{}).filter(pid=>Object.values(last.res[pid]||{}).some(v=>v!=null&&v!=="")).length, tot=players().length;
    if(n<tot) out.push({cls:"info",title:`Testes físicos — ${last.label||fmtD(last.date)}: ${n} de ${tot} atletas com registo`,sub:`Próximo momento: ${MONTHS[nt.m-1]} ${nt.y}.`,a:"tab",t:"testes"}); }
  else out.push({cls:"info",title:`Testes físicos — próximo momento em ${MONTHS[nt.m-1]} ${nt.y}`,sub:"Cria o momento no separador Testes físicos.",a:"tab",t:"testes"});
  return out;
}
const alertHTML = a => `<button class="alert ${a.cls}" data-a="${a.a}" ${a.p?`data-p="${a.p}" data-id="${esc(a.id)}"`:""} ${a.t?`data-t="${a.t}"`:""}><i></i><span class="main"><b>${esc(a.title)}</b><small>${esc(a.sub)}</small></span><span class="muted">›</span></button>`;

/* ================= tipo e intensidade do treino ================= */
const ttypeTag = e => { const t=TRT(e.ttype), c=INTC(e.int); if(!t&&!c) return "";
  return `<span class="ttype" style="background:${t?t.c:"#8a7a80"};${c?`--intc:${c}`:""}">${c?"<i></i>":""}${esc(t?t.l:"Sem tipo")}${e.int?` — ${esc(e.int.toLowerCase())}`:""}</span>`; };

/* ================= linhas reutilizáveis ================= */
function eventRow(e){
  const isG=e.type==="jogo", d=toD(e.date);
  let right="";
  if(isG){ const c=gameCalc(e); right = e.closed&&c.result ? `<span class="res ${c.result}">${c.result}</span> <b class="num">${esc(scoreTxt(e,c))}</b>` : e.date<todayISO()||e.date===todayISO()&&c.gf>0 ? `<span class="tag bad">Por fechar</span>` : `<span class="tag">Agendado</span>`; }
  else { const att=Object.values(e.att||{}).filter(a=>a&&a.s); const pres=att.filter(a=>a.s==="P"||a.s==="AT").length;
    right = e.closed ? `<span class="tag ok">Fechado</span>${att.length?` <span class="small muted num">${pres}/${att.length}</span>`:""}` : e.date<todayISO() ? `<span class="tag warn">Por fechar</span>` : `<span class="tag">Agendado</span>`; }
  const title = isG ? `${e.venue==="F"?"@ ":"vs "}${e.opp||"Adversário por definir"}` : (e.theme||"Treino");
  const oc = isG && oppCrestSrc(oppByName(e.opp)) ? oppCrest(e.opp,22)+" " : "";
  const sub = isG ? [e.comp,e.phase,e.time,e.venue==="F"?"Fora":"Casa"].filter(Boolean) : [e.time,e.dur?e.dur+"'":"",e.place,(cycleAt("micro",e.date)||{}).name].filter(Boolean);
  const tt = isG ? "" : ttypeTag(e);
  return `<button class="li" data-a="page" data-p="${isG?"jogo":"treino"}" data-id="${esc(e.id)}"><span class="datebox ${isG?"jogo":""}"><b>${d.getDate()}</b><span>${d.toLocaleDateString("pt-PT",{month:"short"}).replace(".","")}</span></span><span class="main"><b>${oc}${esc(title)}</b><small>${sub.map(esc).join(" — ")}</small>${tt?`<small style="margin-top:3px">${tt}</small>`:""}</span>${right}</button>`;
}
function playerLine(p,right=""){
  return `<button class="li" data-a="page" data-p="atleta" data-id="${esc(p.id)}">${avatar(p)}<span class="main"><b>${esc(p.name)}</b><small><span class="pos">${esc(p.pos||"—")}</span>${p.n?"n.º "+esc(p.n):""}</small></span>${right}</button>`;
}

/* ================= PAINEL ================= */
function vPainel(){
  const t=todayISO(), st=stats(), tm=st.team;
  const up=events().filter(e=>e.date>=t).sort(byDT).slice(0,6);
  const al=alerts();
  const a30=attendanceSince(addDays(t,-29));
  const out=players().filter(p=>avail(p.id)!=="ok");
  const pl=players().map(p=>({p,s:st.pl[p.id]}));
  const topR=pl.filter(x=>x.s.rs.length).sort((a,b)=>b.s.avg-a.s.avg).slice(0,3);
  const topG=pl.filter(x=>x.s.g>0).sort((a,b)=>b.s.g-a.s.g||b.s.a-a.s.a).slice(0,3);
  const topM=pl.filter(x=>x.s.min>0).sort((a,b)=>b.s.min-a.s.min).slice(0,3);
  const lead=(title,arr,val)=>`<div><div class="small muted" style="font-weight:700;margin-bottom:6px">${title}</div>${arr.length?arr.map(x=>`<div style="display:flex;align-items:center;gap:8px;margin:5px 0">${avatar(x.p)}<span style="flex:1;font-weight:600">${esc(x.p.name)}</span>${val(x)}</div>`).join(""):`<div class="small muted">Sem dados ainda.</div>`}</div>`;
  const form=tm.form.slice(-5);
  return `
  <div class="bar"><h2>Painel</h2>
    <button class="btn" data-a="newEvent" data-type="treino">+ Treino</button>
    <button class="btn" data-a="newEvent" data-type="jogo">+ Jogo</button>
    <button class="btn" data-a="weekGen">Gerar semana-tipo</button>
    <button class="btn primary" data-a="injNew">Registar lesão</button>
  </div>
  <div class="kpis">
    <div class="kpi"><span>Jogos fechados</span><b>${tm.j}</b></div>
    <div class="kpi"><span>Vitórias-empates-derrotas</span><b>${tm.V}-${tm.E}-${tm.D}</b></div>
    <div class="kpi"><span>Golos marcados-sofridos</span><b>${tm.gf}-${tm.ga}</b></div>
    <div class="kpi"><span>Assiduidade (30 dias)</span><b>${a30.pct==null?"–":a30.pct+"%"}<small> ${a30.sessions} treinos</small></b></div>
    <div class="kpi"><span>Indisponíveis</span><b>${out.length}<small> de ${players().length}</small></b></div>
  </div>
  <div style="margin-top:14px">${monCard()}</div>
  <div class="grid2" style="margin-top:14px">
    <section class="card"><div class="card-h"><h3>Alertas</h3><span class="sub">${al.length}</span></div>
      <div>${al.length?al.map(alertHTML).join(""):`<div class="empty"><b>Tudo em dia</b>Não há treinos nem jogos por fechar.</div>`}</div></section>
    <section class="card"><div class="card-h"><h3>Próximos</h3><button class="btn sm" data-a="tab" data-t="agenda">Ver agenda</button></div>
      <div class="list">${up.length?up.map(eventRow).join(""):`<div class="empty"><b>Sem treinos nem jogos marcados</b>Usa “Gerar semana-tipo” para criar a semana de uma vez.</div>`}</div></section>
    <section class="card"><div class="card-h"><h3>Disponibilidade</h3><button class="btn sm" data-a="tab" data-t="clinico">Clínico</button></div>
      <div class="list">${out.length?out.map(p=>{ const i=activeInjury(p.id); return playerLine(p,`<span class="tag ${AV[avail(p.id)].c}">${AV[avail(p.id)].l}</span><span class="small muted">${esc(i.zone||i.type||"")}${validISO(i.exp)?" — regresso "+fmtD(i.exp):""}</span>`); }).join(""):`<div class="empty"><b>Plantel todo disponível</b></div>`}</div></section>
    <section class="card"><div class="card-h"><h3>Forma e destaques</h3><span class="sub">${form.length?"Últimos "+form.length+" jogos":""}</span></div>
      <div class="card-b">
        <div class="chips" style="margin-bottom:14px">${form.length?form.map(f=>`<button class="lnk" data-a="page" data-p="jogo" data-id="${esc(f.id)}" title="${esc((f.opp||"")+" "+f.txt)}"><span class="res ${f.res}">${f.res}</span></button>`).join(""):`<span class="small muted">A forma aparece quando fechares o primeiro jogo.</span>`}</div>
        <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
          ${lead("Melhor nota média",topR,x=>badge(x.s.avg))}
          ${lead("Golos",topG,x=>`<b class="num">${x.s.g}</b>`)}
          ${lead("Minutos",topM,x=>`<b class="num">${x.s.min}'</b>`)}
        </div>
      </div></section>
  </div>`;
}

/* ================= AGENDA ================= */
function vAgenda(){
  const [y,m]=S.cal.split("-").map(Number);
  const first=`${y}-${pad(m)}-01`, start=mondayOf(first);
  const lastDay=new Date(y,m,0).getDate(), end=`${y}-${pad(m)}-${pad(lastDay)}`;
  const t=todayISO();
  const byDay={}; events().forEach(e=>{ (byDay[e.date]=byDay[e.date]||[]).push(e); });
  Object.values(byDay).forEach(a=>a.sort(byDT));
  let cells=""; let d=start;
  const weeks = Math.ceil((dayDiff(start,end)+1)/7);
  ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].forEach(x=>cells+=`<div class="dow">${x}</div>`);
  for(let i=0;i<weeks*7;i++){
    const evs=byDay[d]||[], wd=toD(d).getDay();
    cells+=`<button class="d ${d.slice(0,7)!==S.cal?"out":""} ${d===t?"today":""} ${d===S.day?"sel":""}" data-a="calDay" data-d="${d}">
      <span class="n">${toD(d).getDate()}</span>
      ${evs.map(e=>{ if(e.type==="jogo") return `<span class="ev j ${e.closed?"done":""}">${oppCrestSrc(oppByName(e.opp))?oppCrest(e.opp,14):""}${esc((e.venue==="F"?"@ ":"vs ")+(e.opp||"Jogo"))}</span>`;
        const t=TRT(e.ttype), c=INTC(e.int);
        return `<span class="ev t ${t||c?"typed":""} ${e.closed?"done":""}" style="${t?`background:${t.c};`:""}${c?`--intc:${c}`:""}" title="${esc([t&&t.l,e.int&&"Intensidade "+e.int.toLowerCase(),e.theme].filter(Boolean).join(" — "))}">${t?`<span class="ttag">${t.s}</span>`:""}${esc((e.time?e.time+" ":"")+(e.theme||(t?"":"Treino")))}</span>`; }).join("")}
      ${!evs.length&&(wd===1||wd===6)?`<span class="folga">Folga</span>`:""}
    </button>`;
    d=addDays(d,1);
  }
  const dayEv=(byDay[S.day]||[]);
  const mi=cycleAt("micro",S.day), me=cycleAt("meso",S.day);
  const title=new Date(y,m-1,1).toLocaleDateString("pt-PT",{month:"long",year:"numeric"});
  return `
  <div class="bar"><h2>${esc(cap1(title))}</h2>
    <button class="btn" data-a="calNav" data-n="-1" aria-label="Mês anterior">‹</button>
    <button class="btn" data-a="calToday">Hoje</button>
    <button class="btn" data-a="calNav" data-n="1" aria-label="Mês seguinte">›</button>
    <button class="btn gold" data-a="weekGen">Gerar semana-tipo</button>
  </div>
  <section class="card"><div class="cal">${cells}</div>
    <div class="leg"><b>Tipo</b>${TR_TYPES.map(t=>`<span><span class="sw" style="background:${t.c}"></span>${t.s} ${esc(t.l)}</span>`).join("")}<b style="margin-left:6px">Intensidade (faixa à esquerda)</b>${INTS.map(i=>`<span><span class="sw" style="background:${i.c}"></span>${esc(i.l)}</span>`).join("")}</div></section>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>${esc(fmtLong(S.day))}</h3>
    <span style="display:flex;gap:6px"><button class="btn sm" data-a="newEvent" data-type="treino" data-d="${S.day}">+ Treino</button><button class="btn sm primary" data-a="newEvent" data-type="jogo" data-d="${S.day}">+ Jogo</button></span></div>
    ${me||mi?`<div class="card-b small muted" style="border-bottom:1px solid var(--line);padding-top:10px;padding-bottom:10px">${me?`<b style="color:var(--text)">${esc(me.name)}</b>${me.obj?" — "+esc(me.obj):""}`:""}${me&&mi?"<br>":""}${mi?`<b style="color:var(--text)">${esc(mi.name)}</b>${mi.obj?" — "+esc(mi.obj):""}`:""}</div>`:""}
    <div class="list">${dayEv.length?dayEv.map(eventRow).join(""):`<div class="empty"><b>Nada marcado neste dia</b>${[1,6].includes(toD(S.day).getDay())?"Dia de folga na semana-tipo.":"Adiciona um treino ou um jogo."}</div>`}</div>
  </section>`;
}

/* ================= TREINOS ================= */
function vTreinos(){
  const sub = `<div class="seg" role="tablist">${[["sessoes","Sessões"],["plan","Planeamento"],["modelo","Modelo de jogo"],["ex","Exercícios"],["pres","Presenças"]].map(([k,l])=>`<button data-a="tsub" data-k="${k}" class="${S.tsub===k?"on":""}">${l}</button>`).join("")}</div>`;
  if(S.tsub==="plan") return vPlan(sub);
  if(S.tsub==="ex") return vEx(sub);
  if(S.tsub==="modelo") return vModelo(sub);
  if(S.tsub==="pres") return vPresencas(sub);
  const t=todayISO(), all=trainings();
  const upc=all.filter(e=>e.date>=t), past=all.filter(e=>e.date<t).reverse();
  const group = arr => { const g={}; arr.forEach(e=>{ const w=mondayOf(e.date); (g[w]=g[w]||[]).push(e); }); return g; };
  const block = (arr,asc) => { const g=group(arr); const ks=Object.keys(g).sort(); if(!asc) ks.reverse();
    return ks.map(w=>{ const mi=cycleAt("micro",w)||cycleAt("micro",addDays(w,3)); return `<div class="gsec" style="padding:10px 16px 0">Semana de ${fmtD(w)} a ${fmtD(addDays(w,6))}${mi?" — "+esc(mi.name):""}</div><div class="list">${g[w].map(eventRow).join("")}</div>`; }).join(""); };
  return `
  <div class="bar"><h2>Treinos</h2>${sub}<span class="sp"></span>
    <button class="btn" data-a="weekGen">Gerar semana-tipo</button>
    <button class="btn primary" data-a="newEvent" data-type="treino">+ Novo treino</button></div>
  <section class="card"><div class="card-h"><h3>Próximos</h3><span class="sub">${upc.length}</span></div>${upc.length?block(upc,true):`<div class="empty"><b>Sem treinos agendados</b>Cria um treino ou gera a semana-tipo (3.ª a 6.ª).</div>`}</section>
  <section class="card"><div class="card-h"><h3>Anteriores</h3><span class="sub">${past.length}</span></div>${past.length?block(past,false):`<div class="empty"><b>Ainda não há treinos registados</b></div>`}</section>`;
}

function pTreino(id){
  const tr=D.events[id]; if(!tr||tr.type!=="treino") return "";
  const e={id,...tr};
  const mi=cycleAt("micro",e.date), me=cycleAt("meso",e.date);
  const plan=e.plan||[];
  const totalMin=plan.reduce((s,x)=>s+(+x.min||0),0);
  const exs=exercises();
  const prs=principles();
  const att=e.att||{};
  const pls=players();
  const counts={}; Object.keys(ATT).forEach(k=>counts[k]=0);
  pls.forEach(p=>{ const a=att[p.id]; if(a&&a.s) counts[a.s]++; });
  const marked=pls.filter(p=>att[p.id]&&att[p.id].s).length;
  const F=(f,label,val,type="text",extra="")=>`<label class="fld">${label}<input type="${type}" value="${esc(val??"")}" data-c="f" data-col="events" data-id="${esc(id)}" data-f="${f}" ${extra}></label>`;
  const attRow=p=>{ const a=att[p.id]||{}; const av=avail(p.id);
    return `<div class="att">${avatar(p)}<div class="nm"><b>${esc(p.name)}</b><small><span class="pos">${esc(p.pos||"—")}</span>${av!=="ok"?` <span class="tag ${AV[av].c}">${AV[av].l}</span>`:""}</small></div>
      <div class="ctl"><span class="stbtns">${Object.values(ATT).map(s=>`<button title="${s.l}" data-a="att" data-id="${esc(id)}" data-p="${esc(p.id)}" data-s="${s.s}" class="${a.s===s.s?"on":""}" style="${a.s===s.s?`background:${s.c}`:""}">${s.s}</button>`).join("")}</span>
      <input class="rpe" inputmode="numeric" placeholder="RPE" value="${esc(a.rpe??"")}" data-c="rpe" data-id="${esc(id)}" data-p="${esc(p.id)}" aria-label="RPE de ${esc(p.name)}" ${a.s==="P"||a.s==="AT"?"":"disabled"}></div></div>`; };
  const loads=pls.map(p=>{ const a=att[p.id]; const r=a&&(a.s==="P"||a.s==="AT")?parseNum(a.rpe):null; return r==null?null:r*(+e.dur||0); }).filter(x=>x!=null);
  return `
  <div class="phead"><button class="back" data-a="back" aria-label="Voltar">‹</button>
    <div><h2>${esc(e.theme||"Treino")}</h2><p>${esc(fmtLong(e.date))}${e.time?" — "+esc(e.time):""}${mi?" — "+esc(mi.name):""}</p>${ttypeTag(e)?`<p style="margin-top:4px">${ttypeTag(e)}</p>`:""}</div>
    <div class="acts">${e.closed?`<span class="tag ok">Fechado</span><button class="btn" data-a="trOpen" data-id="${esc(id)}">Reabrir</button>`:`<button class="btn gold" data-a="trClose" data-id="${esc(id)}">Fechar treino</button>`}
      <button class="btn" data-a="prPlan" data-id="${esc(id)}">Plano em PDF</button>
      <button class="btn" data-a="prTrain" data-id="${esc(id)}">Relatório em PDF</button>
      <button class="btn" data-a="dupTr" data-id="${esc(id)}">Duplicar</button>
      <button class="btn ghost" data-a="delEvent" data-id="${esc(id)}">Eliminar</button></div></div>
  <div class="grid2">
    <section class="card"><div class="card-h"><h3>Dados da sessão</h3></div><div class="card-b"><div class="form">
      ${F("date","Data",e.date,"date")}${F("time","Hora",e.time,"time")}${F("dur","Duração (min)",e.dur,"text",'inputmode="numeric" data-t="num"')}
      ${F("place","Local",e.place)}
      <label class="fld">Tipo de treino${sel("",TR_TYPES.map(t=>({v:t.k,l:t.l})),e.ttype,`data-c="f" data-col="events" data-id="${esc(id)}" data-f="ttype"`,"—")}</label>
      <label class="fld">Intensidade${sel("",INTS.map(i=>i.l).concat(e.int&&!INTC(e.int)?[e.int]:[]),e.int,`data-c="f" data-col="events" data-id="${esc(id)}" data-f="int"`,"—")}</label>
      ${F("clima","Clima",e.clima,"text",'list="climaList" placeholder="Ex.: Quente sem chuva"')}<datalist id="climaList">${CLIMAS.map(c=>`<option value="${esc(c)}">`).join("")}</datalist>
      <div class="full">${F("theme","Tema / objetivo da sessão",e.theme,"text",'placeholder="Ex.: Organização ofensiva — saída curta"')}</div>
    </div>
    <details style="margin-top:12px"${e.mat||e.objG||e.objE?" open":""}><summary class="small" style="cursor:pointer;font-weight:700">Material e objetivos (plano em PDF)</summary>
      <div class="form" style="margin-top:8px">
        <label class="fld full">Material<textarea data-c="f" data-col="events" data-id="${esc(id)}" data-f="mat" placeholder="Vazio = junta o material dos exercícios">${esc(e.mat||"")}</textarea></label>
        <label class="fld full">Objetivos gerais<textarea data-c="f" data-col="events" data-id="${esc(id)}" data-f="objG">${esc(e.objG||"")}</textarea></label>
        <label class="fld full">Objetivos específicos<textarea data-c="f" data-col="events" data-id="${esc(id)}" data-f="objE">${esc(e.objE||"")}</textarea></label>
      </div></details>
    ${me?`<p class="note"><b>${esc(me.name)}</b>${me.obj?" — "+esc(me.obj):""}</p>`:""}${mi&&mi.obj?`<p class="note"><b>${esc(mi.name)}</b> — ${esc(mi.obj)}</p>`:""}
    </div></section>
    <section class="card"><div class="card-h"><h3>Plano da sessão</h3><span class="sub">${totalMin}' planeados${e.dur?" de "+esc(e.dur)+"'":""}</span></div>
      <div>${plan.length?plan.map((x,i)=>{ const ex=x.ex?D.exercises[x.ex]:null;
        return `<div class="plan"><span class="o">${i+1}</span><div style="min-width:0"><input class="inp" value="${esc(x.name||(ex&&ex.name)||"")}" data-c="plan" data-id="${esc(id)}" data-i="${i}" data-f="name" aria-label="Nome do bloco">${ex?`<button class="lnk small muted" data-a="exView" data-id="${esc(x.ex)}">${esc(ex.cat||"")} — ver exercício</button>`:""}${prs.length?prSelect(x,ex,id,i):""}</div>
          <input class="inp" inputmode="numeric" value="${esc(x.min??"")}" data-c="plan" data-id="${esc(id)}" data-i="${i}" data-f="min" aria-label="Minutos" placeholder="min">
          <span class="acts"><button class="btn sm" data-a="planMove" data-id="${esc(id)}" data-i="${i}" data-n="-1" ${i===0?"disabled":""} aria-label="Subir">↑</button><button class="btn sm" data-a="planMove" data-id="${esc(id)}" data-i="${i}" data-n="1" ${i===plan.length-1?"disabled":""} aria-label="Descer">↓</button><button class="btn sm" data-a="planDel" data-id="${esc(id)}" data-i="${i}" aria-label="Remover">✕</button></span></div>`; }).join(""):`<div class="empty"><b>Plano vazio</b>Adiciona exercícios da biblioteca ou blocos livres.</div>`}</div>
      <div class="card-b" style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line)">
        <button class="btn primary" data-a="exPick" data-id="${esc(id)}">+ Escolher da biblioteca</button>
        <select class="inp" style="flex:1;min-width:150px" data-c="planAdd" data-id="${esc(id)}"><option value="">Adicionar pelo nome…</option>${exCatsAll().map(c=>{ const l=exs.filter(x=>x.cat===c); return l.length?`<optgroup label="${esc(c)}">${l.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}${x.dur?" ("+esc(x.dur)+"')":""}</option>`).join("")}</optgroup>`:""; }).join("")}</select>
        <button class="btn" data-a="planFree" data-id="${esc(id)}">+ Bloco livre</button>
      </div></section>
  </div>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Presenças e carga</h3><span class="sub">${marked}/${pls.length} marcados</span></div>
    <div class="card-b" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--line)">
      <button class="btn primary" data-a="attAll" data-id="${esc(id)}">Marcar restantes como presentes</button>
      <span class="small muted">${Object.values(ATT).filter(s=>counts[s.s]).map(s=>`${s.l}: <b>${counts[s.s]}</b>`).join(" — ")||"Ainda sem presenças."}</span>
      <span class="small muted" style="margin-left:auto">${loads.length?`Carga média: <b>${Math.round(avg(loads))}</b> UA (RPE × ${esc(e.dur||0)}')`:"RPE de 1 a 10 no fim do treino"}</span>
    </div>
    <div>${pls.map(attRow).join("")}</div>
    <p class="note" style="padding:0 16px 14px">P presente — AT atraso — FJ falta justificada — FI falta injustificada — L lesionado — D dispensado. Atletas com lesão ativa ficam como L ao marcar os restantes.</p>
  </section>
  ${staffAttHTML(e,id)}
  ${trEvalHTML(e,id)}
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Notas do treinador</h3></div><div class="card-b">
    <label class="fld"><textarea data-c="f" data-col="events" data-id="${esc(id)}" data-f="notes" placeholder="O que correu bem, o que ajustar, comportamentos a destacar…">${esc(e.notes||"")}</textarea></label></div></section>`;
}

/* ================= PLANEAMENTO ================= */
function vPlan(sub){
  const mesos=cycles("meso"), micros=cycles("micro");
  const trs=trainings();
  const row=c=>{ const s=trs.filter(t=>t.date>=c.start&&t.date<=c.end); const mins=s.reduce((a,t)=>a+(+t.dur||0),0);
    return `<button class="li" data-a="cycEdit" data-id="${esc(c.id)}"><span class="main"><b>${esc(c.name)}</b><small>${fmtD(c.start)} a ${fmtD(c.end)}${c.period?` — <span class="tag grena">${esc(c.period)}</span>`:""}${c.obj?" — "+esc(c.obj):""}</small></span>${c.kind==="micro"?`<span class="small muted num">${s.length} treinos — ${mins}'</span>`:`<span class="small muted num">${dayDiff(c.start,c.end)+1} dias</span>`}</button>`; };
  return `
  <div class="bar"><h2>Treinos</h2>${sub}<span class="sp"></span>
    <button class="btn" data-a="cycNew" data-k="meso">+ Mesociclo</button>
    <button class="btn primary" data-a="cycNew" data-k="micro">+ Microciclo</button></div>
  ${vDistrib()}
  <div class="grid2" style="margin-top:14px">
    <section class="card"><div class="card-h"><h3>Mesociclos</h3><span class="sub">Blocos de várias semanas</span></div>
      <div class="list">${mesos.length?mesos.map(row).join(""):`<div class="empty"><b>Sem mesociclos</b>Ex.: “Mesociclo 1 — consolidação do modelo”, 4 semanas.</div>`}</div></section>
    <section class="card"><div class="card-h"><h3>Microciclos</h3><span class="sub">Semanas de treino</span></div>
      <div class="list">${micros.length?micros.slice().reverse().map(row).join(""):`<div class="empty"><b>Sem microciclos</b>O “Gerar semana-tipo” cria o microciclo da semana automaticamente.</div>`}</div></section>
  </div>
  <p class="note">Os treinos ficam associados ao micro e ao mesociclo pela data.</p>`;
}

/* ================= EXERCÍCIOS ================= */
function vEx(sub){
  const all=exercises();
  const noTxt = x => !((x.obj||"").trim()||(x.desc||"").trim());
  const list=all.filter(x=> S.exCat==="__sem" ? noTxt(x) : S.exCat==="__auto" ? !!x.auto : (!S.exCat||x.cat===S.exCat));
  const nAuto=all.filter(x=>x.auto).length, nSem=all.filter(noTxt).length;
  const used={}; trainings().forEach(t=>(t.plan||[]).forEach(p=>{ if(p.ex) used[p.ex]=(used[p.ex]||0)+1; }));
  return `
  <div class="bar"><h2>Treinos</h2>${sub}<span class="sp"></span>
    <button class="btn" data-a="catCfg">Categorias</button><button class="btn primary" data-a="exNew">+ Novo exercício (com desenho)</button></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
    <input class="inp" id="exSearch" placeholder="Procurar exercício…" style="max-width:260px" autocomplete="off">
    <div class="chips"><button class="chip ${!S.exCat?"on":""}" data-a="exCat" data-k="">Todos (${all.length})</button>${nSem?`<button class="chip ${S.exCat==="__sem"?"on":""}" data-a="exCat" data-k="__sem">Sem descrição (${nSem})</button>`:""}${nAuto?`<button class="chip ${S.exCat==="__auto"?"on":""}" data-a="exCat" data-k="__auto">Descrição por confirmar (${nAuto})</button>`:""}${exCatsAll().map(c=>{ const n=all.filter(x=>x.cat===c).length; return n?`<button class="chip ${S.exCat===c?"on":""}" data-a="exCat" data-k="${esc(c)}">${esc(c)} (${n})</button>`:""; }).join("")}</div>
  </div>
  ${list.length?`<div class="excards">${list.map(x=>`<button class="ex" data-a="exView" data-id="${esc(x.id)}" data-name="${esc((x.name+" "+(x.obj||"")+" "+(x.desc||"")).toLowerCase())}">
    <span class="meta"><span class="tag grena">${esc(x.cat||"—")}</span>${x.dur?`<span class="tag">${esc(x.dur)}'</span>`:""}${x.players?`<span class="tag">${esc(x.players)} jog.</span>`:""}${used[x.id]?`<span class="tag ok">Usado ${used[x.id]}×</span>`:""}</span>
    ${exThumb(x)}${x.auto?`<span class="tag warn" style="align-self:flex-start">Descrição por confirmar</span>`:""}<b>${esc(x.name)}</b><p>${x.obj||x.desc?esc(x.obj||x.desc):`<span style="color:var(--r6)">Sem descrição — toca para escrever</span>`}</p></button>`).join("")}</div><p class="empty" id="exNone" style="display:none"><b>Nenhum exercício encontrado</b></p>`:`<div class="empty"><b>Biblioteca vazia${S.exCat?" nesta categoria":""}</b>Cria o primeiro exercício.</div>`}`;
}

/* ================= princípio num bloco do plano ================= */
function prOptions(sel){
  const prs=principles();
  return MOMENTS.map(m=>{ const top=prs.filter(p=>MOMK(p.moment)===m.k&&!p.parent); if(!top.length) return "";
    return `<optgroup label="${esc(m.l)}">${top.map(p=>`<option value="${esc(p.id)}" ${sel===p.id?"selected":""}>${esc(p.name)}</option>${prs.filter(s=>s.parent===p.id).map(s=>`<option value="${esc(s.id)}" ${sel===s.id?"selected":""}>— ${esc(s.name)}</option>`).join("")}`).join("")}</optgroup>`; }).join("");
}
function prSelect(x,ex,id,i){
  const exPr=((ex&&ex.pr)||[]).filter(k=>D.principles[k]);
  const def = exPr.length ? `Do exercício: ${exPr.map(k=>D.principles[k].name).join(", ")}` : "Sem princípio associado";
  const cur = x.pr && D.principles[x.pr] ? x.pr : "";
  return `<select class="inp" style="margin-top:5px;font-size:12px;padding:4px 6px" data-c="plan" data-id="${esc(id)}" data-i="${i}" data-f="pr" aria-label="Princípio trabalhado"><option value="">${esc(def)}</option>${prOptions(cur)}</select>`;
}

/* ================= MODELO DE JOGO ================= */
function vModelo(sub){
  const prs=principles(), mesos=cycles("meso");
  if(S.mdl && !D.cycles[S.mdl]) S.mdl="";
  const per = S.mdl ? D.cycles[S.mdl] : null;
  const mt = modelTime(per?per.start:null, per?per.end:null);
  const maxM = Math.max(1,...MOMENTS.map(m=>mt.byM[m.k]||0));
  const exCount={}; exercises().forEach(x=>(x.pr||[]).forEach(k=>exCount[k]=(exCount[k]||0)+1));
  const prRow=(p,isSub)=>`<button class="li" data-a="prEdit" data-id="${esc(p.id)}" style="${isSub?"padding-left:40px":""}"><span class="main"><b style="${isSub?"font-weight:600":""}">${isSub?"— ":""}${esc(p.name)}</b>${p.desc?`<small>${esc(p.desc)}</small>`:""}</span><span class="small muted num" style="text-align:right">${mt.byP[p.id]||0}'<br>${exCount[p.id]||0} exerc.</span></button>`;
  return `
  <div class="bar"><h2>Treinos</h2>${sub}<span class="sp"></span></div>
  <section class="card"><div class="card-h"><h3>Tempo de treino por momento do jogo</h3>
    <span class="chips"><button class="chip ${!S.mdl?"on":""}" data-a="mdlPer" data-k="">Época</button>${mesos.map(m=>`<button class="chip ${S.mdl===m.id?"on":""}" data-a="mdlPer" data-k="${esc(m.id)}">${esc(m.name)}</button>`).join("")}</span></div>
    <div class="card-b">
      ${mt.total?`${momentBars(mt)}
      <p class="note">${plural(mt.sessions,"treino")} com plano — ${mt.total}' planeados, dos quais ${mt.linked}' (${pct(mt.linked,mt.total)}%) ligados a princípios. Um bloco pode trabalhar mais do que um momento.</p>`
      :`<div class="small muted">Ainda não há treinos realizados com plano${per?" neste mesociclo":""}. O tempo aparece quando os blocos do plano estiverem ligados a princípios.</div>`}
    </div></section>
  <div class="grid2" style="margin-top:14px">${MOMENTS.map(m=>{ const top=prs.filter(p=>MOMK(p.moment)===m.k&&!p.parent);
    return `<section class="card"><div class="card-h"><h3>${m.l}</h3><button class="btn sm" data-a="prNew" data-m="${m.k}">+ Princípio</button></div>
      <div class="list">${top.length?top.map(p=>prRow(p,false)+prs.filter(s=>s.parent===p.id).map(s=>prRow(s,true)).join("")+`<div style="padding:4px 16px 8px 40px"><button class="btn sm ghost" data-a="prNew" data-m="${m.k}" data-parent="${esc(p.id)}">+ Subprincípio</button></div>`).join(""):`<div class="empty"><b>Sem princípios</b>Define os princípios deste momento.</div>`}</div></section>`; }).join("")}</div>
  <p class="note">Liga os exercícios da biblioteca aos princípios (ao editar o exercício) ou escolhe o princípio diretamente em cada bloco do plano do treino.</p>`;
}

/* ================= MAPA DE PRESENÇAS ================= */
function vPresencas(sub){
  const [y,m]=S.pm.split("-").map(Number);
  const from=`${y}-${pad(m)}-01`, to=`${y}-${pad(m)}-${pad(new Date(y,m,0).getDate())}`;
  const evs=events().filter(e=>e.date>=from&&e.date<=to).sort(byDT);
  const pls=players();
  const title=cap1(new Date(y,m-1,1).toLocaleDateString("pt-PT",{month:"long",year:"numeric"}));
  const calcs={}; evs.filter(e=>e.type==="jogo").forEach(g=>calcs[g.id]=gameCalc(g));
  const GC={T:{l:"Titular",c:"var(--ouro)",f:"var(--accent-ink)"},S:{l:"Suplente utilizado",c:"var(--r8)",f:"#fff"},C:{l:"Convocado, não utilizado",c:"#8a7a80",f:"#fff"},N:{l:"Não convocado",c:"transparent",f:"var(--muted)"}};
  const cell=(e,pid)=>{
    if(e.type==="treino"){ const a=(e.att||{})[pid]; if(!a||!a.s) return `<td class="muted">·</td>`; const s=ATT[a.s]; return `<td><span class="rt" style="background:${s.c};min-width:30px;height:22px;font-size:13px" title="${s.l}">${s.s}</span></td>`; }
    const c=calcs[e.id]; if(!(e.call||[]).length) return `<td class="muted">·</td>`;
    const x=c.res[pid]; const k=!x?"N":x.st?"T":x.min>0?"S":"C"; const s=GC[k];
    return `<td><span class="rt" style="background:${s.c};color:${s.f};min-width:30px;height:22px;font-size:13px;${k==="N"?"border:1px dashed var(--line)":""}" title="${s.l}${x&&x.min?" — "+x.min+"'":""}">${k==="N"?"–":k}</span></td>`; };
  const rows=pls.map(p=>{ let pr=0,base=0,conv=0,jg=0;
    evs.forEach(e=>{ if(e.type==="treino"){ const a=(e.att||{})[p.id]; if(a&&a.s){ if(a.s==="P"||a.s==="AT"){pr++;base++;} else if(a.s==="FJ"||a.s==="FI") base++; } }
      else { const x=(calcs[e.id].res||{})[p.id]; if(x){ conv++; if(x.min>0||x.st) jg++; } } });
    return `<tr><td class="l stk"><button class="lnk pin" data-a="page" data-p="atleta" data-id="${esc(p.id)}">${avatar(p)}<b>${esc(p.name)}</b></button></td>${evs.map(e=>cell(e,p.id)).join("")}<td class="num"><b>${base?pct(pr,base)+"%":"–"}</b></td><td class="num">${conv?jg+"/"+conv:"–"}</td></tr>`; }).join("");
  return `
  <div class="bar"><h2>Treinos</h2>${sub}<span class="sp"></span>
    <button class="btn" data-a="pmNav" data-n="-1" aria-label="Mês anterior">‹</button><b style="font-family:var(--fc);font-size:18px;min-width:140px;text-align:center">${esc(title)}</b><button class="btn" data-a="pmNav" data-n="1" aria-label="Mês seguinte">›</button></div>
  ${evs.length?`<section class="card"><div class="tscroll"><table class="tb"><thead><tr><th class="l stk">Atleta</th>${evs.map(e=>`<th style="${e.type==="jogo"?"background:var(--grena);color:#fff":""}"><button class="lnk" data-a="page" data-p="${e.type==="jogo"?"jogo":"treino"}" data-id="${esc(e.id)}" title="${esc(e.type==="jogo"?"Jogo vs "+(e.opp||""):(e.theme||"Treino"))}">${toD(e.date).getDate()}<br><span class="small">${e.type==="jogo"?"Jogo":["dom","seg","ter","qua","qui","sex","sáb"][toD(e.date).getDay()]}</span></button></th>`).join("")}<th>Treinos</th><th>Jogos</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="card-b small muted" style="border-top:1px solid var(--line);display:flex;gap:12px;flex-wrap:wrap">${Object.values(ATT).map(s=>`<span><span class="rt" style="background:${s.c};min-width:26px;height:20px;font-size:12px">${s.s}</span> ${s.l}</span>`).join("")}${["T","S","C"].map(k=>`<span><span class="rt" style="background:${GC[k].c};color:${GC[k].f};min-width:26px;height:20px;font-size:12px">${k}</span> ${GC[k].l}</span>`).join("")}</div></section>
    <p class="note">Treinos: presenças e atrasos sobre o total com faltas (lesões e dispensas não contam). Jogos: jogos em que jogou sobre convocatórias. Toca na data para abrir o treino ou o jogo.</p>`
  :`<div class="empty"><b>Sem treinos nem jogos em ${esc(title.toLowerCase())}</b></div>`}`;
}

/* ================= distribuição por momentos ================= */
function momentBars(mt){
  const base = MOMENTS.reduce((s,m)=>s+(mt.byM[m.k]||0),0);
  return MOMENTS.map(m=>{ const v=mt.byM[m.k]||0, p=base?v/base*100:0;
    return `<div class="mrow"><span class="small" style="font-weight:700">${m.l}</span>
      <div class="meter tgt" style="height:14px"><i style="width:${Math.round(p)}%;${v?"":"opacity:.3"}"></i></div>
      <b class="num">${base?fmt1(p)+"%":"–"}</b><span class="small muted num">${Math.round(v)}'</span></div>`; }).join("")
    + `<p class="note" style="margin-top:8px">A soma dá 100%. O traço dourado marca os 20%, ou seja, as cinco partes iguais. Um bloco que trabalhe dois momentos divide o tempo pelos dois.</p>`;
}
function vDistrib(){
  const micros=cycles("micro").slice().reverse();
  if(S.dist && !D.cycles[S.dist]) S.dist="";
  const cur = micros.find(c=>c.start<=todayISO()&&c.end>=todayISO());
  const selId = S.dist || (cur?cur.id:(micros[0]?micros[0].id:""));
  const sel = selId?D.cycles[selId]:null;
  const week = sel ? modelTime(sel.start,sel.end) : null;
  const per = sel && sel.period ? sel.period : "";
  const periodMicros = p => cycles("micro").filter(c=>(c.period||"")===p);
  const periodTime = p => { const cs=periodMicros(p); if(!cs.length) return null;
    const out={byM:{},byP:{},total:0,linked:0,sessions:0};
    cs.forEach(c=>{ const t=modelTime(c.start,c.end); out.total+=t.total; out.linked+=t.linked; out.sessions+=t.sessions;
      MOMENTS.forEach(m=>out.byM[m.k]=(out.byM[m.k]||0)+(t.byM[m.k]||0)); });
    return out; };
  const season = modelTime(null,null);
  const col=(title,mt,sub)=>`<div><div class="small muted" style="font-weight:700;margin-bottom:6px">${esc(title)}${sub?` — <span style="font-weight:600">${esc(sub)}</span>`:""}</div>${mt&&mt.total?momentBars(mt):`<div class="small muted">Sem treinos com plano.</div>`}</div>`;
  const pt = per?periodTime(per):null;
  return `<section class="card"><div class="card-h"><h3>O que temos trabalhado</h3>
    ${micros.length?`<span class="chips">${micros.slice(0,8).map(c=>`<button class="chip ${selId===c.id?"on":""}" data-a="distSel" data-k="${esc(c.id)}">${esc(c.name)}</button>`).join("")}</span>`:""}</div>
    <div class="card-b">
      ${sel?`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <b>${esc(sel.name)}</b><span class="small muted">${fmtD(sel.start)} a ${fmtD(sel.end)}</span>
        <span class="seg" style="margin-left:auto">${PERIODS.map(p=>`<button data-a="cycPer" data-id="${esc(selId)}" data-k="${esc(p)}" class="${per===p?"on":""}">${p}</button>`).join("")}</span></div>`
      :`<p class="small muted">Cria um microciclo em Planeamento para veres a distribuição por semana.</p>`}
      <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
        ${col("Este microciclo", week, sel?`${Math.round(week.total)}' planeados`:"sem microciclo")}
        ${pt?col("Período "+per.toLowerCase(), pt, `${plural(periodMicros(per).length,"microciclo")} — ${Math.round(pt.total)}'`):""}
        ${col("Época até agora", season, `${plural(season.sessions,"treino")} — ${season.total}'`)}
      </div>
      <p class="note">${season.total?`Na época, ${pct(season.linked,season.total)}% do tempo planeado está ligado a princípios do modelo de jogo. Só esse tempo entra nas percentagens.`:""}</p>
    </div></section>
  ${micros.length?`<section class="card" style="margin-top:14px"><div class="card-h"><h3>Microciclos por período da época</h3></div>
    <div class="tscroll"><table class="tb"><thead><tr><th class="l stk">Microciclo</th><th>Período</th>${MOMENTS.map(m=>`<th>${esc(m.l)}</th>`).join("")}<th>Total</th></tr></thead><tbody>
    ${micros.map(c=>{ const t=modelTime(c.start,c.end); const base=MOMENTS.reduce((s,m)=>s+(t.byM[m.k]||0),0);
      return `<tr><td class="l stk"><button class="lnk" data-a="cycEdit" data-id="${esc(c.id)}"><b>${esc(c.name)}</b><br><span class="small muted">${fmtD(c.start)} a ${fmtD(c.end)}</span></button></td>
        <td><span class="tag ${c.period?"grena":""}">${esc(c.period||"—")}</span></td>
        ${MOMENTS.map(m=>{ const v=t.byM[m.k]||0; return `<td class="num">${base?fmt1(v/base*100)+"%":"–"}</td>`; }).join("")}
        <td class="num">${Math.round(t.total)}'</td></tr>`; }).join("")}
    ${PERIODS.filter(p=>periodMicros(p).length).map(p=>{ const t=periodTime(p); const base=MOMENTS.reduce((s,m)=>s+(t.byM[m.k]||0),0);
      return `<tr><td class="l stk"><b>Total ${esc(p.toLowerCase())}</b></td><td><span class="tag">${plural(periodMicros(p).length,"micro")}</span></td>${MOMENTS.map(m=>`<td class="num"><b>${base?fmt1((t.byM[m.k]||0)/base*100)+"%":"–"}</b></td>`).join("")}<td class="num"><b>${Math.round(t.total)}'</b></td></tr>`; }).join("")}
    </tbody></table></div></section>`:""}`;
}

function trEvalHTML(e,id){
  const att=e.att||{}, pev=e.pev||{};
  const list=players().filter(p=>{ const a=att[p.id]; return (a&&(a.s==="P"||a.s==="AT")) || (pev[p.id]&&(pev[p.id].r!=null&&pev[p.id].r!==""||pev[p.id].t)); });
  const notas=list.map(p=>parseNum((pev[p.id]||{}).r)).filter(x=>x!=null);
  return `<section class="card" style="margin-top:14px"><div class="card-h"><h3>Avaliação individual do treino</h3>
    <span style="display:flex;gap:8px;align-items:center"><span class="sub">${notas.length}/${list.length} avaliados${notas.length?` — média ${fmt1(avg(notas))}`:""}</span>${list.length?`<button class="btn sm primary" data-a="tevAll" data-id="${esc(id)}">Avaliar um a um</button>`:""}</span></div>
    ${list.length?`<div>${list.map(p=>{ const v=pev[p.id]||{};
      return `<div class="att" style="grid-template-columns:40px 1fr auto">${avatar(p)}<div class="nm"><b>${esc(p.name)}</b><small><span class="pos">${esc(p.pos||"—")}</span>${att[p.id]&&att[p.id].s==="AT"?"<span class='tag warn'>Atraso</span>":""}</small>
        <input class="inp" style="margin-top:4px;font-size:13px;padding:5px 8px" value="${esc(v.t||"")}" placeholder="Observação do treino…" data-c="tev" data-id="${esc(id)}" data-p="${esc(p.id)}" data-f="t" aria-label="Observação sobre ${esc(p.name)}"></div>
        <div class="ctl" style="align-items:center"><input class="cell" inputmode="decimal" value="${esc(v.r??"")}" placeholder="–" data-c="tev" data-id="${esc(id)}" data-p="${esc(p.id)}" data-f="r" aria-label="Nota de treino de ${esc(p.name)}">${badge(parseNum(v.r))}</div></div>`; }).join("")}</div>
      <p class="note" style="padding:0 16px 14px">Notas de 0 a 10 e uma observação por atleta. Entram no relatório do treino e no relatório individual do atleta.</p>`
    :`<div class="empty"><b>Marca primeiro as presenças</b>A avaliação aparece para quem esteve presente.</div>`}</section>`;
}


const exThumb = x => { const src=exImg(x);
  return src ? `<span class="exthumb"><img src="${esc(src)}" alt="" loading="lazy"></span>`
    : (x.drw&&(x.drw.it||[]).length ? `<span class="exthumb">${drawSVG(x.drw)}</span>` : ""); };

/* ================= presenças do staff ================= */
function staffAttHTML(e,id){
  const st=staff(), sa=e.satt||{};
  if(!st.length) return `<section class="card" style="margin-top:14px"><div class="card-h"><h3>Equipa técnica</h3><button class="btn sm" data-a="tab" data-t="plantel">Adicionar staff</button></div><div class="empty"><b>Sem staff registado</b>Adiciona a equipa técnica no separador Plantel.</div></section>`;
  const n=st.filter(p=>sa[p.id]&&sa[p.id].s).length;
  return `<section class="card" style="margin-top:14px"><div class="card-h"><h3>Presenças da equipa técnica</h3>
    <span style="display:flex;gap:8px;align-items:center"><span class="sub">${n}/${st.length}</span><button class="btn sm" data-a="sattAll" data-id="${esc(id)}">Marcar todos presentes</button></span></div>
    <div>${st.map(p=>{ const a=sa[p.id]||{};
      return `<div class="att" style="grid-template-columns:40px 1fr auto">${avatar({id:p.id,name:p.name,pos:"",photo:p.photo,photoData:p.photoData})}<div class="nm"><b>${esc(p.name)}</b><small>${esc(p.role||"")}</small></div>
        <div class="ctl"><span class="stbtns">${SATT.map(k=>{ const s=ATT[k];
          return `<button title="${s.l}" data-a="satt" data-id="${esc(id)}" data-p="${esc(p.id)}" data-s="${k}" class="${a.s===k?"on":""}" style="${a.s===k?`background:${s.c}`:""}">${k}</button>`; }).join("")}</span></div></div>`; }).join("")}</div></section>`;
}

/* ================= ADVERSÁRIOS ================= */
function vOpp(){
  const list=opponents();
  const t=todayISO();
  const nextFor = name => games().find(g=>g.date>=t && String(g.opp||"").trim().toLowerCase()===String(name).trim().toLowerCase());
  return `
  <div class="bar"><h2>Adversários</h2><button class="btn primary" data-a="oppNew">+ Novo adversário</button></div>
  ${list.length?`<section class="card"><div class="list">${list.map(o=>{ const ng=nextFor(o.name);
    return `<button class="li" data-a="page" data-p="adversario" data-id="${esc(o.id)}">${oppCrest(o,36)}
      <span class="main"><b>${esc(o.name)}</b><small>${[o.comp,o.formation,o.style].filter(Boolean).map(esc).join(" — ")}</small></span>
      ${ng?`<span class="tag grena">Jogo ${fmtD(ng.date)}</span>`:""}<span class="small muted">${(o.reports||[]).length} relatórios</span></button>`; }).join("")}</div></section>`
  :`<div class="empty"><b>Sem adversários</b>Cria a ficha de um adversário: sistema tático, pontos fortes e fracos, jogadores a vigiar e bolas paradas.</div>`}
  <p class="note">Podes abrir a ficha do adversário a partir de cada jogo, no botão “Ficha do adversário”.</p>`;
}
function pOpp(id){
  const o0=D.opponents[id]; if(!o0) return "";
  const o={id,...o0}, t=todayISO();
  const gs=games().filter(g=>String(g.opp||"").trim().toLowerCase()===String(o.name).trim().toLowerCase()).sort(byDT);
  const F=(f,label,val,extra="")=>`<label class="fld">${label}<input value="${esc(val??"")}" data-c="f" data-col="opponents" data-id="${esc(id)}" data-f="${f}" ${extra}></label>`;
  const T=(f,label,val,ph="")=>`<label class="fld full">${label}<textarea data-c="f" data-col="opponents" data-id="${esc(id)}" data-f="${f}" placeholder="${esc(ph)}">${esc(val||"")}</textarea></label>`;
  const S2=(f,label,opts,val)=>`<label class="fld">${label}${sel("",opts,val,`data-c="f" data-col="opponents" data-id="${esc(id)}" data-f="${f}"`,"—")}</label>`;
  const keys=o.keys||[];
  const reps=(o.reports||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return `
  <div class="phead"><button class="back" data-a="back" aria-label="Voltar">‹</button>
    ${oppCrest(o,52)}<div><h2>${esc(o.name)}</h2><p>${[o.comp,o.formation,o.style].filter(Boolean).map(esc).join(" — ")||"Ficha de adversário"}</p></div>
    <div class="acts"><button class="btn" data-a="oppCrestUp" data-id="${esc(id)}">${oppCrestSrc(o)?"Mudar emblema":"Adicionar emblema"}</button><button class="btn" data-a="prOpp" data-id="${esc(id)}">Ficha em PDF</button><button class="btn ghost" data-a="oppDel" data-id="${esc(id)}">Eliminar</button></div></div>
  <div class="grid2">
    <section class="card"><div class="card-h"><h3>Identificação</h3></div><div class="card-b"><div class="form">
      ${F("name","Nome",o.name)}${F("comp","Competição",o.comp)}
      ${S2("formation","Sistema tático",FORMATIONS,o.formation)}${S2("style","Estilo de jogo",STYLES,o.style)}
      ${F("coach","Treinador",o.coach)}${F("venue","Campo",o.venue)}
      ${T("form1","Onze provável","" + (o.form1||""),"Ex.: 1 Silva; 2 Costa, 4 Pinto, 5 Dias, 3 Nuno; 6 Rui, 8 Tó, 10 Zé; 7 Vaz, 9 Cruz, 11 Melo")}
    </div>${formationSVG(o.formation)}</div></section>
    <section class="card"><div class="card-h"><h3>Como jogam</h3></div><div class="card-b"><div class="form">
      ${T("strong","Pontos fortes",o.strong,"O que fazem bem: construção, pressão, transições, bola aérea…")}
      ${T("weak","Pontos fracos",o.weak,"Onde podemos explorar: costas dos laterais, segunda bola, reação à perda…")}
      ${T("oo","Com bola",o.oo,"Saída, corredores preferidos, referências ofensivas")}
      ${T("od","Sem bola",o.od,"Zona de pressão, linha defensiva, marcação")}
      ${T("trans","Transições",o.trans,"Como reagem à perda e à recuperação")}
      ${T("bp","Bolas paradas",o.bp,"Cantos e livres: marcadores, movimentações, marcação à zona ou individual")}
      ${T("gk","Guarda-redes",o.gk,"Jogo de pés, saídas, pontos fracos")}
    </div></div></section>
  </div>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Jogadores a vigiar</h3><button class="btn sm primary" data-a="oppKeyNew" data-id="${esc(id)}">+ Jogador</button></div>
    <div class="list">${keys.length?keys.map((k,i)=>`<button class="li" data-a="oppKeyEdit" data-id="${esc(id)}" data-i="${i}"><span class="ph g-${GROUP(k.pos)}">${esc(k.n||initials(k.name))}</span><span class="main"><b>${esc(k.name)}</b><small>${[k.pos,k.foot?"pé "+String(k.foot).toLowerCase():"",k.note].filter(Boolean).map(esc).join(" — ")}</small></span></button>`).join(""):`<div class="empty"><b>Sem jogadores marcados</b></div>`}</div></section>
  <section class="card"><div class="card-h"><h3>Plano para o jogo</h3></div><div class="card-b"><div class="form">
    ${T("plan","O que vamos fazer",o.plan,"Ideias para o nosso jogo: onde pressionar, por onde progredir, ajustes de bolas paradas")}
    ${T("notes","Notas",o.notes)}
  </div></div></section>
  <section class="card"><div class="card-h"><h3>Observações e jogos</h3><button class="btn sm primary" data-a="oppRepNew" data-id="${esc(id)}">+ Observação</button></div>
    <div class="list">${reps.length?reps.map(r=>`<button class="li" data-a="oppRepEdit" data-id="${esc(id)}" data-r="${esc(r.id)}" style="align-items:flex-start"><span class="main"><b>${fmtD(r.date,{day:"numeric",month:"long",year:"numeric"})}${r.game?" — "+esc(r.game):""}</b><small>${esc(r.by||"")}</small><small style="display:block;margin-top:4px">${esc((r.txt||"").slice(0,180))}</small></span></button>`).join(""):`<div class="empty"><b>Sem observações</b></div>`}
    ${gs.length?gs.map(g=>{ const c=gameCalc(g); return `<button class="li" data-a="page" data-p="jogo" data-id="${esc(g.id)}"><span class="datebox jogo"><b>${toD(g.date).getDate()}</b><span>${toD(g.date).toLocaleDateString("pt-PT",{month:"short"}).replace(".","")}</span></span><span class="main"><b>${g.venue==="F"?"@ ":"vs "}${esc(g.opp)}</b><small>${[g.comp,g.phase,fmtD(g.date,{year:"numeric",month:"short",day:"numeric"}),g.time].filter(Boolean).map(esc).join(" — ")}</small></span>${g.closed&&c.result?`<span class="res ${c.result}">${c.result}</span> <b class="num">${esc(scoreTxt(g,c))}</b>`:`<span class="tag">Agendado</span>`}</button>`; }).join(""):""}</div></section>`;
}

/* esquema tático desenhado a partir do sistema */
function formationSVG(f){
  const lines=String(f||"").match(/\d/g); if(!lines||lines.reduce((s,x)=>s+ +x,0)!==10) return "";
  const L=lines.map(Number), it=[{t:"G",x:525,y:80}];
  let n=2; const y0=200, y1=600;
  L.forEach((k,li)=>{ const y=Math.round(y0+(y1-y0)*(L.length===1?0:li/(L.length-1)));
    for(let j=0;j<k;j++){ const x=Math.round(k===1?525:140+(770*j/(k-1))); it.push({t:"B",x,y,n:n++}); } });
  return `<div style="margin-top:12px"><div class="small muted" style="font-weight:700;margin-bottom:6px">Esquema — ${esc(f)}</div>${drawSVG({f:"half",it})}</div>`;
}
