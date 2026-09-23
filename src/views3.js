/* ================= TESTES FÍSICOS ================= */
function vTestes(){
  const ms=testMoments();
  if(!ms.length) return `<div class="bar"><h2>Testes físicos</h2><button class="btn primary" data-a="tmNew">+ Momento de avaliação</button></div>
    <div class="empty"><b>Sem momentos de avaliação</b>A época tem 3 momentos: setembro, janeiro e maio.</div>`;
  if(!S.tmom || !D.tests[S.tmom]) S.tmom=ms[ms.length-1].id;
  const i=ms.findIndex(x=>x.id===S.tmom), mo=ms[i], prev=i>0?ms[i-1]:null;
  const res=mo.res||{}, pls=players();
  const vals={}; TESTS.forEach(t=>{ vals[t.k]=pls.map(p=>parseNum((res[p.id]||{})[t.k])).filter(v=>v!=null); });
  const best={}; TESTS.forEach(t=>{ const v=vals[t.k]; best[t.k]=v.length?(t.low?Math.min(...v):Math.max(...v)):null; });
  const filled=pls.filter(p=>TESTS.some(t=>parseNum((res[p.id]||{})[t.k])!=null)).length;
  return `
  <div class="bar"><h2>Testes físicos</h2><button class="btn primary" data-a="tmNew">+ Momento de avaliação</button></div>
  <div class="chips" style="margin-bottom:12px">${ms.map(x=>`<button class="chip ${x.id===S.tmom?"on":""}" data-a="tmSel" data-k="${esc(x.id)}">${esc(x.label||fmtD(x.date))}</button>`).join("")}</div>
  <section class="card"><div class="card-h"><h3>${esc(mo.label||"Momento")}</h3><span style="display:flex;gap:6px;align-items:center"><span class="sub">${filled}/${pls.length} atletas — ${fmtD(mo.date,{day:"numeric",month:"long",year:"numeric"})}</span><button class="btn sm" data-a="tmEdit" data-id="${esc(mo.id)}">Editar</button></span></div>
    ${mo.proto?`<div class="card-b small muted" style="border-bottom:1px solid var(--line)">${esc(mo.proto)}</div>`:""}
    <div class="tscroll"><table class="tb"><thead><tr><th class="l stk">Atleta</th>${TESTS.map(t=>`<th>${t.l}<br><span class="small">${t.u} — ${t.low?"menor é melhor":"maior é melhor"}</span></th>`).join("")}</tr></thead><tbody>
    ${pls.map(p=>`<tr><td class="l stk"><div class="pin">${avatar(p)}<b>${esc(p.name)}</b></div></td>${TESTS.map(t=>{ const v=parseNum((res[p.id]||{})[t.k]); const pv=prev?parseNum(((prev.res||{})[p.id]||{})[t.k]):null;
      return `<td><input class="cell" inputmode="decimal" value="${esc(v??"")}" data-c="test" data-m="${esc(mo.id)}" data-p="${esc(p.id)}" data-k="${t.k}" aria-label="${t.l} de ${esc(p.name)}" style="${v!=null&&v===best[t.k]?"border-color:var(--ouro);box-shadow:0 0 0 1px var(--ouro)":""}">${deltaHTML(v,pv,t.low)}</td>`; }).join("")}</tr>`).join("")}
    <tr><td class="l stk"><b>Média da equipa</b></td>${TESTS.map(t=>`<td class="num"><b>${vals[t.k].length?Math.round(avg(vals[t.k])*100)/100:"–"}</b></td>`).join("")}</tr>
    </tbody></table></div>
    <p class="note" style="padding:0 16px 14px">A diferença por baixo de cada valor compara com ${prev?esc(prev.label||fmtD(prev.date)):"o momento anterior (quando existir)"}. Verde = melhorou. Contorno dourado = melhor valor do plantel.</p>
  </section>`;
}

/* ================= CLÍNICO ================= */
function injRow(i){
  const end=i.status==="alta"&&validISO(i.ret)?i.ret:todayISO();
  const days=validISO(i.date)?Math.max(0,dayDiff(i.date,end)):null;
  return `<button class="li" data-a="injEdit" data-id="${esc(i.id)}"><span class="main"><b>${esc(i.zone||"—")}${i.side&&i.side!=="—"?" "+esc(i.side.toLowerCase()):""} — ${esc(i.type||"")}</b><small>${fmtD(i.date,{day:"numeric",month:"short",year:"numeric"})}${days!=null?` — ${days} dias`:""}${i.ctx?" — em "+esc(i.ctx.toLowerCase()):""}</small></span><span class="tag ${INJ_ST[i.status]?.c||""}">${INJ_ST[i.status]?.l||"—"}</span></button>`;
}
function vClinico(){
  const all=injuries(), act=all.filter(i=>i.status!=="alta"), hist=all.filter(i=>i.status==="alta");
  const t=todayISO();
  const lost=all.reduce((s,i)=>{ if(!validISO(i.date)) return s; const end=i.status==="alta"&&validISO(i.ret)?i.ret:t; return s+Math.max(0,dayDiff(i.date,end)); },0);
  const byZone={}; all.forEach(i=>{ byZone[i.zone||"—"]=(byZone[i.zone||"—"]||0)+1; });
  const card=i=>{ const p=P(i.pid)||{name:"(removido)"}; const days=validISO(i.date)?Math.max(0,dayDiff(i.date,t)):0; const steps=i.plan||[]; const done=steps.filter(s=>s.done).length;
    return `<section class="card"><div class="card-h" style="gap:12px">${avatar(p)}<div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="small muted">${esc(i.zone||"—")}${i.side&&i.side!=="—"?" "+esc(i.side.toLowerCase()):""} — ${esc(i.type||"")} — ${days} dias${validISO(i.exp)?` — regresso previsto ${fmtD(i.exp)}`:""}</div></div><span class="tag ${INJ_ST[i.status].c}">${INJ_ST[i.status].l}</span></div>
      <div class="card-b">${i.diag?`<p style="margin:0 0 8px"><b>Diagnóstico:</b> ${esc(i.diag)}</p>`:""}
        ${steps.length?`<div class="small muted" style="font-weight:700;margin-bottom:4px">Plano de recuperação — ${done}/${steps.length}</div><div class="meter" style="margin-bottom:8px"><i style="width:${pct(done,steps.length)}%"></i></div>${steps.map((s,k)=>`<label class="chk ${s.done?"done":""}"><input type="checkbox" ${s.done?"checked":""} data-c="step" data-id="${esc(i.id)}" data-i="${k}"><span>${esc(s.t)}</span></label>`).join("")}`:`<div class="small muted">Sem plano de recuperação.</div>`}
        ${trtHTML(i)}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm primary" data-a="trtNew" data-id="${esc(i.id)}">+ Tratamento</button>${i.status==="ativa"?`<button class="btn sm" data-a="injSt" data-id="${esc(i.id)}" data-s="condicionado">Passar a condicionado</button>`:""}<button class="btn sm gold" data-a="injSt" data-id="${esc(i.id)}" data-s="alta">Dar alta</button><button class="btn sm" data-a="injEdit" data-id="${esc(i.id)}">Editar</button><button class="btn sm ghost" data-a="page" data-p="atleta" data-id="${esc(i.pid)}">Ficha do atleta</button></div>
      </div></section>`; };
  return `
  <div class="bar"><h2>Clínico</h2><button class="btn primary" data-a="injNew">+ Registar lesão</button></div>
  <div class="kpis" style="margin-bottom:14px">
    <div class="kpi"><span>Em tratamento</span><b>${act.filter(i=>i.status==="ativa").length}</b></div>
    <div class="kpi"><span>Condicionados</span><b>${act.filter(i=>i.status==="condicionado").length}</b></div>
    <div class="kpi"><span>Lesões na época</span><b>${all.length}</b></div>
    <div class="kpi"><span>Dias de ausência</span><b>${lost}</b></div>
  </div>
  ${act.length?`<div class="grid2">${act.map(card).join("")}</div>`:`<div class="empty"><b>Sem lesões ativas</b>O plantel está todo disponível.</div>`}
  <div class="grid2" style="margin-top:14px">
    <section class="card"><div class="card-h"><h3>Historial</h3><span class="sub">${hist.length} com alta</span></div><div class="list">${hist.length?hist.map(i=>{ const p=P(i.pid); return `<div style="display:flex;align-items:center;gap:0">${p?`<span style="padding-left:16px">${avatar(p)}</span>`:""}<div style="flex:1;min-width:0">${injRow(i)}</div></div>`; }).join(""):`<div class="empty"><b>Sem historial ainda</b></div>`}</div></section>
    <section class="card"><div class="card-h"><h3>Por zona</h3></div><div class="card-b">${Object.keys(byZone).length?Object.entries(byZone).sort((a,b)=>b[1]-a[1]).map(([z,n])=>`<div style="display:grid;grid-template-columns:130px 1fr 26px;gap:10px;align-items:center;margin:6px 0"><span class="small" style="font-weight:600">${esc(z)}</span><div class="meter"><i style="width:${pct(n,all.length)}%"></i></div><b class="num" style="text-align:right">${n}</b></div>`).join(""):`<div class="small muted">Sem dados.</div>`}</div></section>
  </div>`;
}

/* ================= SCOUTING ================= */
const scoutList = () => Object.entries(D.scout).map(([id,s])=>({id,...s}));
const scoutLast = s => { const r=(s.reps||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))); return r[r.length-1]||null; };
const stars = n => { n=Math.max(0,Math.min(5,Math.round(parseNum(n)||0))); return `<span aria-label="${n} de 5" style="color:var(--ouro);letter-spacing:1px">${"★".repeat(n)}<span style="color:var(--line)">${"★".repeat(5-n)}</span></span>`; };
function vScouting(){
  const all=scoutList().sort((a,b)=>{ const o={prio:0,obs:1,contr:2,desc:3}; return (o[a.st]??9)-(o[b.st]??9) || String(a.name).localeCompare(String(b.name)); });
  const list=all.filter(s=>!S.scSt||s.st===S.scSt);
  return `
  <div class="bar"><h2>Scouting</h2><button class="btn primary" data-a="scNew">+ Novo atleta a seguir</button></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
    <input class="inp" id="scSearch" placeholder="Procurar por nome, clube ou posição…" style="max-width:300px" autocomplete="off">
    <div class="chips"><button class="chip ${!S.scSt?"on":""}" data-a="scSt" data-k="">Todos (${all.length})</button>${Object.entries(SC_ST).map(([k,v])=>`<button class="chip ${S.scSt===k?"on":""}" data-a="scSt" data-k="${k}">${v.l} (${all.filter(s=>s.st===k).length})</button>`).join("")}</div>
  </div>
  <section class="card"><div class="list" id="scList">${list.length?list.map(s=>{ const l=scoutLast(s);
    return `<button class="li" data-a="page" data-p="alvo" data-id="${esc(s.id)}" data-name="${esc([s.name,s.club,s.pos].join(" ").toLowerCase())}"><span class="ph g-${GROUP(s.pos)}">${esc(initials(s.name))}</span><span class="main"><b>${esc(s.name)}</b><small>${[s.club,s.pos,s.year?"n. "+s.year:"",s.foot?"pé "+s.foot.toLowerCase():""].filter(Boolean).map(esc).join(" — ")}</small></span>
      <span style="text-align:right"><span class="tag ${SC_ST[s.st]?.c||""}">${SC_ST[s.st]?.l||"—"}</span><br><span class="small muted">${(s.reps||[]).length} relatórios${l?" — "+fmtD(l.date):""}</span></span>${l?`<span>${stars(l.cur)}</span>`:""}</button>`; }).join(""):`<div class="empty"><b>Sem atletas ${S.scSt?"neste estado":"a seguir"}</b>Adiciona um atleta e regista relatórios de observação.</div>`}</div></section>
  <p class="empty" id="scNone" style="display:none;margin-top:10px"><b>Nenhum resultado</b></p>`;
}
function pAlvo(id){
  const s0=D.scout[id]; if(!s0) return "";
  const s={id,...s0}, reps=(s.reps||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const F=(f,label,val,type="text",extra="")=>`<label class="fld">${label}<input type="${type}" value="${esc(val??"")}" data-c="f" data-col="scout" data-id="${esc(id)}" data-f="${f}" ${extra}></label>`;
  const S2=(f,label,opts,val,empty)=>`<label class="fld">${label}${sel("",opts,val,`data-c="f" data-col="scout" data-id="${esc(id)}" data-f="${f}"`,empty)}</label>`;
  const avgCur=avg(reps.map(r=>parseNum(r.cur)).filter(x=>x!=null)), avgPot=avg(reps.map(r=>parseNum(r.pot)).filter(x=>x!=null));
  return `
  <div class="phead"><button class="back" data-a="back" aria-label="Voltar">‹</button>
    <div><h2>${esc(s.name)}</h2><p>${[s.club,s.pos,s.year?"nascido em "+s.year:""].filter(Boolean).map(esc).join(" — ")}</p></div>
    <div class="acts"><span class="tag ${SC_ST[s.st]?.c||""}">${SC_ST[s.st]?.l||"—"}</span><button class="btn ghost" data-a="scDel" data-id="${esc(id)}">Eliminar</button></div></div>
  <div class="grid2">
    <section class="card"><div class="card-h"><h3>Dados</h3></div><div class="card-b"><div class="form">
      ${F("name","Nome",s.name)}${F("club","Clube",s.club)}
      ${S2("pos","Posição",POS,s.pos,"—")}${F("year","Ano de nascimento",s.year,"text",'inputmode="numeric"')}
      ${S2("foot","Pé",FEET,s.foot,"—")}${F("esc","Escalão",s.esc,"text",'placeholder="Ex.: Sub-19"')}
      ${S2("st","Estado",Object.entries(SC_ST).map(([k,v])=>({v:k,l:v.l})),s.st)}${F("contact","Contacto / agente",s.contact)}
      <div class="full"><label class="fld">Perfil / notas gerais<textarea data-c="f" data-col="scout" data-id="${esc(id)}" data-f="notes">${esc(s.notes||"")}</textarea></label></div>
    </div></div></section>
    <section class="card"><div class="card-h"><h3>Resumo das observações</h3></div><div class="card-b">
      <div class="kpis"><div class="kpi"><span>Relatórios</span><b>${reps.length}</b></div><div class="kpi"><span>Nível atual (média)</span><b>${avgCur==null?"–":fmt1(avgCur)}<small>/5</small></b></div><div class="kpi"><span>Potencial (média)</span><b>${avgPot==null?"–":fmt1(avgPot)}<small>/5</small></b></div></div>
      ${reps[0]?`<p class="note">Última recomendação: <b>${esc(reps[0].rec||"—")}</b> (${fmtD(reps[0].date)}${reps[0].by?", "+esc(reps[0].by):""})</p>`:""}
    </div></section>
  </div>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Relatórios de observação</h3><button class="btn sm primary" data-a="repNew" data-id="${esc(id)}">+ Relatório</button></div>
    <div class="list">${reps.length?reps.map(r=>`<button class="li" data-a="repEdit" data-id="${esc(id)}" data-r="${esc(r.id)}" style="align-items:flex-start"><span class="main"><b>${fmtD(r.date,{day:"numeric",month:"long",year:"numeric"})}${r.game?" — "+esc(r.game):""}</b><small>${esc(r.by||"Sem observador")} — Atual ${stars(r.cur)} Potencial ${stars(r.pot)} — ${esc(r.rec||"")}</small>${r.str||r.weak?`<small style="display:block;margin-top:4px">${r.str?"<b>+</b> "+esc(r.str):""}${r.str&&r.weak?"<br>":""}${r.weak?"<b>−</b> "+esc(r.weak):""}</small>`:""}</span></button>`).join(""):`<div class="empty"><b>Sem relatórios</b>Regista cada observação: jogo, nível atual, potencial e recomendação.</div>`}</div></section>`;
}

/* ================= ESTATÍSTICAS ================= */
function vStats(){
  const comps=competitions();
  if(S.stComp && !comps.includes(S.stComp)) S.stComp="";
  const st=stats(S.stComp||undefined), tm=st.team;
  const rows=players().map(p=>({p,s:st.pl[p.id]}));
  const defs=statDefs(), hl=defs.filter(d=>d.hl), sdCols=(hl.length?hl:defs);
  if(S.stSort.startsWith("cs:") && !D.statdefs[S.stSort.slice(3)]) S.stSort="min";
  const cols=[["n","N.º"],["conv","Conv."],["j","J"],["tit","Tit."],["min","Min"],["g","G"],["a","A"],["y","🟨"],["r","🟥"],["avg","Nota"],...sdCols.map(d=>["cs:"+d.id,d.code||d.title]),["att","Treinos %"],["load7","Carga 7d"]];
  const val=(x,k)=>k==="n"?(x.p.n||99):k==="avg"?(x.s.avg??-1):k==="att"?(x.s.att??-1):k.startsWith("cs:")?(x.s.cs[k.slice(3)]||0):x.s[k];
  rows.sort((a,b)=>{ const d=(val(a,S.stSort)-val(b,S.stSort))*S.stDir; return d || BYPOS(a.p,b.p); });
  const avgTeam=avg(tm.rs);
  const sub=`<div class="seg">${[["por","Por atleta"],["grelha","Grelha da época"]].map(([k,l])=>`<button data-a="ssub" data-k="${k}" class="${(S.ssub||"por")===k?"on":""}">${l}</button>`).join("")}</div>`;
  if((S.ssub||"por")==="grelha") return `<div class="bar"><h2>Estatísticas</h2>${sub}</div>`+vGrid();
  return `
  <div class="bar"><h2>Estatísticas</h2>${sub}${comps.length?`<label class="fld" style="flex-direction:row;align-items:center;gap:8px">Competição ${sel("",comps,S.stComp,'data-c="stComp" class="inp" style="width:auto"',"Todas")}</label>`:""}</div>
  <div class="kpis" style="margin-bottom:14px">
    <div class="kpi"><span>Jogos fechados</span><b>${tm.j}</b></div>
    <div class="kpi"><span>Vitórias-empates-derrotas</span><b>${tm.V}-${tm.E}-${tm.D}</b></div>
    <div class="kpi"><span>Golos marcados</span><b>${tm.gf}<small> ${tm.j?fmt1(tm.gf/tm.j)+"/jogo":""}</small></b></div>
    <div class="kpi"><span>Golos sofridos</span><b>${tm.ga}<small> ${tm.j?fmt1(tm.ga/tm.j)+"/jogo":""}</small></b></div>
    <div class="kpi"><span>Nota média da equipa</span><b>${avgTeam==null?"–":fmt1(avgTeam)}</b></div>
    ${sdCols.map(d=>`<div class="kpi"><span>${esc(d.title)}</span><b>${tm.cs[d.id]||0}</b></div>`).join("")}
  </div>
  <section class="card"><div class="card-h"><h3>Por atleta</h3><span class="sub">Toca num cabeçalho para ordenar</span></div>
  <div class="tscroll"><table class="tb"><thead><tr><th class="l stk">Atleta</th>${cols.map(([k,l])=>`<th><button data-a="stSort" data-k="${k}" class="${S.stSort===k?"on":""}">${l}${S.stSort===k?(S.stDir<0?" ↓":" ↑"):""}</button></th>`).join("")}</tr></thead><tbody>
  ${rows.map(({p,s})=>`<tr><td class="l stk"><button class="lnk pin" data-a="page" data-p="atleta" data-id="${esc(p.id)}">${avatar(p)}<b>${esc(p.name)}</b></button></td><td class="muted">${esc(p.n||"")}</td><td>${s.conv}</td><td>${s.j}</td><td>${s.tit}</td><td class="num"><b>${s.min}</b></td><td>${s.g||"–"}</td><td>${s.a||"–"}</td><td>${s.y||"–"}</td><td>${s.r||"–"}</td><td>${badge(s.avg)}</td>${sdCols.map(d=>`<td class="num">${s.cs[d.id]||"–"}</td>`).join("")}<td class="num">${s.att==null?"–":s.att+"%"}</td><td class="num">${Math.round(s.load7)||"–"}</td></tr>`).join("")}
  </tbody></table></div></section>
  <p class="note">Jogos: contam os que já se realizaram (até hoje). Resultados, vitórias e golos contam só com o jogo fechado. Treinos %: presenças e atrasos sobre o total com faltas (lesões e dispensas não contam). Carga: RPE × minutos dos treinos dos últimos 7 dias.</p>`;
}

/* ================= tratamentos ================= */
function trtHTML(i){
  const t=(i.trt||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const pain=(i.trt||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(x=>parseNum(x.pain)).filter(x=>x!=null);
  return `<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><div class="small muted" style="font-weight:700;margin-bottom:4px">Tratamentos — ${t.length}${pain.length>1?` — dor ${pain.slice(-6).join(" → ")}`:""}</div>
    ${t.length?t.slice(0,4).map(x=>`<button class="li" style="padding:6px 0" data-a="trtEdit" data-id="${esc(i.id)}" data-t="${esc(x.id)}"><span class="main"><b style="font-size:13px">${fmtD(x.date)}${x.by?" — "+esc(x.by):""}</b><small>${esc(x.desc||"")}</small></span>${parseNum(x.pain)!=null?`<span class="tag ${x.pain>=6?"bad":x.pain>=3?"warn":"ok"}">Dor ${esc(x.pain)}</span>`:""}</button>`).join("")+(t.length>4?`<button class="btn sm ghost" data-a="injEdit" data-id="${esc(i.id)}">Ver todos (${t.length})</button>`:""):`<div class="small muted">Sem tratamentos registados.</div>`}</div>`;
}
