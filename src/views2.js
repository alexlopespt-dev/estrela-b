/* ================= JOGOS ================= */
const I_BALL=`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.2l4.1 3-1.6 4.8h-5l-1.6-4.8z" fill="currentColor"/></svg>`;
const I_AST=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15.5c0-1 .8-1.6 1.7-1.4l4.6 1c.9.2 1.7-.3 2-1.1L13.4 5c.2-.6.8-1 1.4-.8l2.2.6c.6.2.9.8.8 1.4l-1.2 4.9 4 1.3c1 .3 1.6 1.2 1.6 2.2V17c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1z" fill="currentColor"/></svg>`;
const I_SUB=`<svg viewBox="0 0 24 24" aria-hidden="true"><path class="sub-in" d="M8 3l5 6H9.5v6h-3V9H3z" fill="currentColor"/><path class="sub-out" d="M16 21l-5-6h3.5V9h3v6H21z" fill="currentColor"/></svg>`;
function competitions(){ const s=new Set(); games().forEach(g=>{ if(g.comp) s.add(g.comp); }); return [...s].sort(); }

function vJogos(){
  const comps=competitions(), t=todayISO();
  const all=games().filter(g=>!S.jComp||g.comp===S.jComp);
  const upc=all.filter(g=>g.date>=t && !g.closed), past=all.filter(g=>!(g.date>=t && !g.closed)).reverse();
  const summary=comps.map(c=>{ const tm=stats(c).team; return `<tr><td class="l"><b>${esc(c)}</b></td><td>${tm.j}</td><td>${tm.V}</td><td>${tm.E}</td><td>${tm.D}</td><td>${tm.gf}</td><td>${tm.ga}</td><td><b>${tm.V*3+tm.E}</b></td></tr>`; }).join("");
  return `
  <div class="bar"><h2>Jogos</h2><button class="btn" data-a="sdCfg">Estatísticas de jogo</button><button class="btn primary" data-a="newEvent" data-type="jogo">+ Novo jogo</button></div>
  ${comps.length>1?`<div class="chips" style="margin-bottom:12px"><button class="chip ${!S.jComp?"on":""}" data-a="jComp" data-k="">Todas</button>${comps.map(c=>`<button class="chip ${S.jComp===c?"on":""}" data-a="jComp" data-k="${esc(c)}">${esc(c)}</button>`).join("")}</div>`:""}
  ${comps.length?`<section class="card" style="margin-bottom:14px"><div class="card-h"><h3>Competições</h3><span class="sub">Só jogos fechados</span></div><div class="tscroll"><table class="tb"><thead><tr><th class="l">Competição</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GM</th><th>GS</th><th>Pts</th></tr></thead><tbody>${summary}</tbody></table></div></section>`:""}
  <section class="card"><div class="card-h"><h3>Próximos jogos</h3><span class="sub">${upc.length}</span></div><div class="list">${upc.length?upc.map(eventRow).join(""):`<div class="empty"><b>Sem jogos marcados</b>Adiciona o próximo jogo para fazeres a convocatória.</div>`}</div></section>
  <section class="card"><div class="card-h"><h3>Jogos realizados</h3><span class="sub">${past.length}</span></div><div class="list">${past.length?past.map(eventRow).join(""):`<div class="empty"><b>Ainda sem jogos realizados</b></div>`}</div></section>`;
}

function callText(g){
  const m=meta(), c=(g.call||[]).map(P).filter(Boolean).sort(BYPOS);
  const byG={}; c.forEach(p=>{ const k=GSHORT[GROUP(p.pos)]; (byG[k]=byG[k]||[]).push(p.name+(p.n?` (${p.n})`:"")); });
  const lines=[`${m.team||"Estrela B"} — Convocatória`, [g.comp,g.phase].filter(Boolean).join(" — "), `${g.venue==="F"?"@":"vs"} ${g.opp||"Adversário por definir"} (${g.venue==="F"?"Fora":"Casa"})`, fmtLong(g.date)+(g.time?` — ${g.time}`:""), g.meet?`Concentração: ${g.meet}`:"", ""];
  ["GR","DEF","MED","AV","—"].forEach(k=>{ if(byG[k]) lines.push(`${k}: ${byG[k].join(", ")}`); });
  lines.push("", `${c.length} convocados`);
  return lines.filter((l,i,a)=>!(l===""&&a[i-1]==="")).join("\n").trim();
}

function pJogo(id){
  const g0=D.events[id]; if(!g0||g0.type!=="jogo") return "";
  const g={id,...g0}, c=gameCalc(g), m=meta();
  const call=g.call||[], xi=new Set(g.xi||[]);
  const pls=players();
  const home=g.venue!=="F";
  const us=`<div class="side"><img src="${CREST}" alt="">${esc(m.team||"Estrela B")}</div>`;
  const oSrc=oppCrestSrc(oppByName(g.opp));
  const them=`<div class="side">${oSrc?`<img src="${esc(oSrc)}" alt="">`:`<div class="shield">${esc(g.opp?initials(g.opp):"?")}</div>`}${esc(g.opp||"Adversário")}</div>`;
  const F=(f,label,val,type="text",extra="")=>`<label class="fld">${label}<input type="${type}" value="${esc(val??"")}" data-c="f" data-col="events" data-id="${esc(id)}" data-f="${f}" ${extra}></label>`;
  const byGroup = (list,fn) => ["GR","DEF","MED","ATA","X"].map(k=>{ const l=list.filter(p=>GROUP(p.pos)===k); return l.length?`<div class="gsec">${GNAME[k]}</div><div class="tiles">${l.map(fn).join("")}</div>`:""; }).join("");
  const callTile=p=>{ const on=call.includes(p.id), av=avail(p.id);
    return `<button class="tile ${on?"on":"off"}" data-a="call" data-id="${esc(id)}" data-p="${esc(p.id)}">${av!=="ok"?`<span class="flag ${av==="cond"?"cond":""}" title="${AV[av].l}"></span>`:""}${monChip(p.id)}${avatar(p)}<b>${esc(p.name)}</b><span class="st">${on?"Convocado":av!=="ok"?AV[av].l:"Fora"}</span></button>`; };
  const callP=call.map(P).filter(Boolean).sort(BYPOS);
  const xiTile=p=>{ const on=xi.has(p.id); return `<button class="tile ${on?"xi":""}" data-a="xi" data-id="${esc(id)}" data-p="${esc(p.id)}">${monChip(p.id)}${avatar(p)}<b>${esc(p.name)}</b><span class="st">${on?"Titular":"Suplente"}</span></button>`; };
  const evs=(g.ev||[]).slice().sort((a,b)=>(parseNum(a.min)??999)-(parseNum(b.min)??999));
  const astOf={}; evs.forEach(e=>{ if(e.t==="assist"&&e.of) astOf[e.of]=e; });
  const evRow=e=>{
    if(e.t==="assist" && e.of && evs.some(x=>x.id===e.of)) return "";
    let ic="",tx="";
    if(e.t==="golo"){ ic=I_BALL; const a=astOf[e.id]; tx=`<b>Golo</b> — ${e.pid?esc(pname(e.pid)):"Autogolo do adversário"}${a?` <span class="muted">(assist. ${esc(pname(a.pid))})</span>`:""}`; }
    else if(e.t==="assist"){ ic=I_AST; tx=`<b>Assistência</b> — ${esc(pname(e.pid))}`; }
    else if(e.t==="amarelo"){ ic=`<span class="card-y"></span>`; tx=`<b>Amarelo</b> — ${esc(pname(e.pid))}`; }
    else if(e.t==="vermelho"){ ic=`<span class="card-r"></span>`; tx=`<b>Vermelho</b> — ${esc(pname(e.pid))}`; }
    else if(e.t==="sub"){ ic=I_SUB; tx=`<b>Substituição</b> — <span class="sub-in">entra ${esc(pname(e.in))}</span>, <span class="sub-out">sai ${esc(pname(e.out))}</span>`; }
    return `<div class="evl"><span class="m">${parseNum(e.min)!=null?esc(parseNum(e.min))+"'":"—"}</span><span class="ic">${ic}</span><span class="tx">${tx}</span><button class="btn sm ghost" data-a="evDel" data-id="${esc(id)}" data-e="${esc(e.id)}" aria-label="Apagar evento">✕</button></div>`; };
  const ficha=Object.entries(c.res).map(([pid,x])=>({p:P(pid)||{id:pid,name:"(removido)"},x})).sort((a,b)=>(b.x.st-a.x.st)||BYPOS(a.p,b.p));
  const rt=g.rt||{};
  const txt=callText(g);
  return `
  <div class="phead"><button class="back" data-a="back" aria-label="Voltar">‹</button>
    <div><h2>${home?"vs":"@"} ${esc(g.opp||"Adversário por definir")}</h2><p>${esc(fmtLong(g.date))}${g.time?" — "+esc(g.time):""}${g.comp?" — "+esc(g.comp):""}${g.phase?" — "+esc(g.phase):""}</p></div>
    <div class="acts">${g.closed?`<span class="tag ok">Fechado</span><button class="btn" data-a="gOpen" data-id="${esc(id)}">Reabrir</button>`:`<button class="btn gold" data-a="gClose" data-id="${esc(id)}">Fechar jogo</button>`}
      <button class="btn" data-a="oppFromGame" data-id="${esc(id)}">Ficha do adversário</button>
      <button class="btn" data-a="prGame" data-id="${esc(id)}">Ficha em PDF</button>
      <button class="btn ghost" data-a="delEvent" data-id="${esc(id)}">Eliminar</button></div></div>
  <button class="quickbar" data-a="quick" data-id="${esc(id)}">${Object.keys(g.rt||{}).length?"Rever notas — modo pós-jogo":"Lançar notas — modo pós-jogo"}</button>
  <section class="card"><div class="score">${home?us:them}<div class="goals">${esc(scoreTxt(g,c))}<small>${c.result?{V:"Vitória",E:"Empate",D:"Derrota"}[c.result]:"Falta o resultado do adversário"}</small></div>${home?them:us}</div></section>
  <div class="grid2" style="margin-top:14px">
    <section class="card"><div class="card-h"><h3>Dados do jogo</h3></div><div class="card-b"><div class="form">
      ${F("opp","Adversário",g.opp)}
      <label class="fld">Local${sel("",[{v:"C",l:"Casa"},{v:"F",l:"Fora"}],g.venue||"C",`data-c="f" data-col="events" data-id="${esc(id)}" data-f="venue"`)}</label>
      ${F("date","Data",g.date,"date")}${F("time","Hora",g.time,"time")}
      <label class="fld">Competição<input list="compList" value="${esc(g.comp||"")}" data-c="f" data-col="events" data-id="${esc(id)}" data-f="comp"></label>
      ${F("phase","Fase / jornada",g.phase,"text",'placeholder="Ex.: Jornada 2"')}
      ${F("meet","Concentração",g.meet,"text",'placeholder="Ex.: 13h00 no estádio"')}
      ${F("dur","Duração (min)",g.dur||90,"text",'inputmode="numeric" data-t="num"')}
      <label class="fld">Golos sofridos<input inputmode="numeric" value="${esc(g.ga??"")}" data-c="f" data-col="events" data-id="${esc(id)}" data-f="ga" data-t="num" placeholder="—"></label>
      <div class="fld"><span>Golos marcados</span><span class="inp" style="background:transparent">${c.gf} <span class="small muted">— pelos eventos</span></span></div>
    </div><datalist id="compList">${competitions().map(x=>`<option value="${esc(x)}">`).join("")}</datalist></div></section>
    <section class="card"><div class="card-h"><h3>Mensagem da convocatória</h3><button class="btn sm primary" data-a="copyCall">Copiar</button></div><div class="card-b">
      <textarea class="share" id="callTxt" readonly>${esc(txt)}</textarea><p class="note">Copia e cola no grupo de WhatsApp da equipa.</p></div></section>
  </div>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>1. Convocatória</h3><span class="sub">${call.length} convocados</span></div><div class="card-b">${byGroup(pls,callTile)}</div></section>
  <section class="card"><div class="card-h"><h3>2. Onze inicial</h3><span class="sub">${xi.size}/11 titulares</span></div><div class="card-b">${callP.length?byGroup(callP,xiTile):`<div class="empty"><b>Faz primeiro a convocatória</b></div>`}</div></section>
  <section class="card"><div class="card-h"><h3>3. Eventos do jogo</h3><button class="btn sm primary" data-a="evNew" data-id="${esc(id)}" ${callP.length?"":"disabled"}>+ Evento</button></div>
    <div>${evs.length?evs.map(evRow).join(""):`<div class="empty"><b>Sem eventos</b>Regista golos, assistências, cartões e substituições. Os minutos de cada jogador são calculados a partir das substituições e expulsões.</div>`}</div></section>
  <section class="card"><div class="card-h"><h3>4. Ficha individual</h3><span style="display:flex;gap:8px;align-items:center">${Object.keys(g.minOv||{}).length?`<button class="btn sm" data-a="minAuto" data-id="${esc(id)}">Recalcular minutos pelos eventos</button>`:`<span class="sub">Minutos calculados pelos eventos</span>`}</span></div>
    ${ficha.length?`<div class="tscroll"><table class="tb"><thead><tr><th class="l stk">Jogador</th><th>Min</th><th>G</th><th>A</th><th>Cartões</th><th>Nota (0–10)</th></tr></thead><tbody>
    ${ficha.map(({p,x})=>`<tr><td class="l stk"><div class="pin">${avatar(p)}<span><b>${esc(p.name)}</b><br><span class="small muted">${x.st?"Titular":x.min>0?"Suplente utilizado":"Não utilizado"}</span></span></div></td>
      <td class="num"><b>${x.min}'</b>${x.ovr?`<br><span class="small muted">manual</span>`:""}</td><td>${x.g||"–"}</td><td>${x.a||"–"}</td>
      <td>${x.y?`<span class="card-y"></span>${x.y>1?` <span class="card-y"></span>`:""}`:""}${x.r?` <span class="card-r"></span>`:""}${!x.y&&!x.r?"–":""}</td>
      <td><input class="cell" inputmode="decimal" value="${esc(rt[p.id]??"")}" data-c="rt" data-id="${esc(id)}" data-p="${esc(p.id)}" placeholder="–" aria-label="Nota de ${esc(p.name)}"></td></tr>`).join("")}
    </tbody></table></div>`:`<div class="empty"><b>A ficha aparece depois da convocatória</b></div>`}</section>
  ${gameStatsHTML(g,id,ficha)}
  <section class="card"><div class="card-h"><h3>Relatório do jogo</h3></div><div class="card-b">
    <label class="fld"><textarea data-c="f" data-col="events" data-id="${esc(id)}" data-f="notes" placeholder="Análise do jogo: momentos, comportamentos, ajustes para o próximo microciclo…">${esc(g.notes||"")}</textarea></label></div></section>`;
}

/* ================= PLANTEL ================= */
function vPlantel(){
  const st=stats(), m=meta();
  const list=players().filter(p=>!S.plGroup||GROUP(p.pos)===S.plGroup);
  const arch=allPlayers().filter(p=>p.archived);
  return `
  <div class="bar"><h2>Plantel</h2><button class="btn primary" data-a="plNew">+ Adicionar atleta</button></div>
  <div class="chips" style="margin-bottom:12px"><button class="chip ${!S.plGroup?"on":""}" data-a="plGroup" data-k="">Todos (${players().length})</button>${["GR","DEF","MED","ATA"].map(k=>`<button class="chip ${S.plGroup===k?"on":""}" data-a="plGroup" data-k="${k}">${GNAME[k]}</button>`).join("")}</div>
  <section class="card"><div class="list">${list.length?list.map(p=>{ const s=st.pl[p.id], av=avail(p.id);
    return playerLine(p,`${av!=="ok"?`<span class="tag ${AV[av].c}">${AV[av].l}</span>`:""}<span class="small muted num" style="text-align:right">${s.j} J — ${s.min}'<br>${s.att==null?"–":s.att+"%"} treinos</span>${badge(s.avg)}`); }).join(""):`<div class="empty"><b>Sem atletas</b></div>`}</div></section>
  ${arch.length?`<details class="card" style="margin-top:14px"><summary class="card-h" style="cursor:pointer"><h3>Atletas que saíram</h3><span class="sub">${arch.length}</span></summary><div class="list">${arch.map(p=>playerLine(p,`<span class="tag">Saiu</span>`)).join("")}</div></details>`:""}
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Equipa técnica</h3><button class="btn sm primary" data-a="stfNew">+ Elemento</button></div>
    <div class="list">${staff().length?staff().map(s=>`<button class="li" data-a="stfEdit" data-id="${esc(s.id)}">${avatar({id:s.id,name:s.name,pos:"",photo:s.photo,photoData:s.photoData})}<span class="main"><b>${esc(s.name)}</b><small>${esc(s.role||"")}</small></span><span class="muted">›</span></button>`).join(""):`<div class="empty"><b>Sem staff</b></div>`}</div></section>
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Equipa e cópias de segurança</h3></div><div class="card-b">
    <div class="form">
      <label class="fld">Equipa<input value="${esc(m.team||"")}" data-c="meta" data-f="team"></label>
      <label class="fld">Época<input value="${esc(m.season||"")}" data-c="meta" data-f="season"></label>
      <label class="fld">Competição principal<input value="${esc(m.comp||"")}" data-c="meta" data-f="comp"></label>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn" data-a="evalCfg">Atributos de avaliação</button><button class="btn" data-a="catCfg">Categorias de exercícios</button><button class="btn" data-a="syncCfg">${MODE==="local"&&SYNC.cfg?"Partilha com a equipa técnica":"Partilhar com a equipa técnica"}</button><button class="btn" data-a="export">Exportar cópia</button><button class="btn" data-a="import">Importar cópia</button></div>
    <p class="note">${MODE==="local"?(SYNC.cfg?"Dados partilhados com a equipa técnica através do Google Sheets (cópia também neste browser, para funcionar sem rede).":"Sem partilha ligada, os dados ficam só neste dispositivo e browser. Liga a partilha para a equipa técnica ver o mesmo, e exporta uma cópia de vez em quando."):"Os dados ficam guardados online e sincronizados. A cópia serve de backup ou para a versão offline."}</p>
  </div></section>`;
}

function radarSVG(cur,prev){
  const EC=evalCfg(), keys=Object.keys(EC), cx=130, cy=120, R=88;
  const pt=(i,v)=>{ const a=-Math.PI/2+i*2*Math.PI/keys.length, r=R*(Math.max(0,Math.min(10,v||0))/10); return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; };
  const poly=vals=>keys.map((k,i)=>pt(i,vals[k]).map(n=>n.toFixed(1)).join(",")).join(" ");
  let s=`<svg class="radar" viewBox="0 0 260 245" role="img" aria-label="Avaliação por área">`;
  [2,4,6,8,10].forEach(l=>{ s+=`<polygon points="${keys.map((k,i)=>pt(i,l).map(n=>n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="var(--line)" stroke-width="1"/>`; });
  keys.forEach((k,i)=>{ const [x,y]=pt(i,10); s+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`;
    const [lx,ly]=pt(i,12.3); s+=`<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)" font-family="Barlow, sans-serif">${esc(EC[k].l)}</text>`; });
  if(prev) s+=`<polygon points="${poly(prev)}" fill="none" stroke="var(--muted)" stroke-dasharray="4 3" stroke-width="1.5"/>`;
  if(cur) s+=`<polygon points="${poly(cur)}" fill="color-mix(in srgb, var(--grena) 30%, transparent)" stroke="var(--grena)" stroke-width="2"/>`;
  return s+`</svg>`;
}
function evalAreas(ev){ const o={}; Object.keys(EVAL).forEach(k=>{ const v=Object.values((ev.v||{})[k]||{}).map(parseNum).filter(x=>x!=null); o[k]=avg(v); }); return o; }
function evalScore(ev){ const a=Object.values(evalAreas(ev)).filter(x=>x!=null); return avg(a); }
const evalsOf = pid => Object.entries(D.evals).map(([id,e])=>({id,...e})).filter(e=>e.pid===pid&&validISO(e.date)).sort((a,b)=>a.date.localeCompare(b.date));

function pAtleta(id){
  const p=P(id); if(!p) return "";
  const s=stats().pl[id], av=avail(id), inj=injuries().filter(i=>i.pid===id);
  const evs=evalsOf(id), last=evs[evs.length-1], prev=evs[evs.length-2];
  const la=last?evalAreas(last):null, pa=prev?evalAreas(prev):null;
  const ms=testMoments(), age=ageOf(p.birth);
  const testRows=TESTS.map(t=>`<tr><td class="l"><b>${t.l}</b> <span class="small muted">(${t.u})</span></td>${ms.map((mo,i)=>{ const v=parseNum(((mo.res||{})[id]||{})[t.k]); const pv=i?parseNum(((ms[i-1].res||{})[id]||{})[t.k]):null; return `<td class="num">${v==null?"–":esc(v)}${deltaHTML(v,pv,t.low)}</td>`; }).join("")}</tr>`).join("");
  return `
  <div class="phead" style="margin-bottom:10px"><button class="back" data-a="back" aria-label="Voltar">‹</button><div><h2>Ficha do atleta</h2></div></div>
  <section class="card">
    <div class="ahead">${avatar(p,`data-a="photo" data-id="${esc(id)}" aria-label="Mudar foto" title="Mudar foto"`)}
      <div><h2>${esc(p.name)}</h2><p><span class="tag gold">${esc(p.pos||"—")}</span>${p.n?`<span>N.º ${esc(p.n)}</span>`:""}${p.foot?`<span>— Pé ${esc(p.foot.toLowerCase())}</span>`:""}${age!=null?`<span>— ${age} anos</span>`:""}${p.height?`<span>— ${esc(p.height)} cm</span>`:""}${p.weight?`<span>— ${esc(p.weight)} kg</span>`:""}<span class="tag ${AV[av].c}">${AV[av].l}</span></p></div>
      <div class="acts"><button class="btn sm" data-a="plEdit" data-id="${esc(id)}">Editar dados</button><button class="btn sm" data-a="evalNew" data-id="${esc(id)}">Nova avaliação</button><button class="btn sm" data-a="injNew" data-id="${esc(id)}">Registar lesão</button><button class="btn sm gold" data-a="prAth" data-id="${esc(id)}">Relatório em PDF</button></div></div>
    <div class="card-b"><div class="kpis">
      <div class="kpi"><span>Jogos (titular)</span><b>${s.j}<small> (${s.tit})</small></b></div>
      <div class="kpi"><span>Minutos</span><b>${s.min}'</b></div>
      <div class="kpi"><span>Golos — assist.</span><b>${s.g} — ${s.a}</b></div>
      <div class="kpi"><span>Nota média</span><b>${s.avg==null?"–":fmt1(s.avg)}<small> ${s.rs.length} jogos</small></b></div>
      <div class="kpi"><span>Assiduidade</span><b>${s.att==null?"–":s.att+"%"}<small> ${s.trTotal} treinos</small></b></div>
      <div class="kpi"><span>Carga 7 dias</span><b>${Math.round(s.load7)}<small> UA</small></b></div>
    </div></div>
  </section>
  <div class="grid2" style="margin-top:14px">
    ${monAth(id)}
    <section class="card"><div class="card-h"><h3>Avaliação</h3><button class="btn sm primary" data-a="evalNew" data-id="${esc(id)}">+ Avaliação</button></div><div class="card-b">
      ${last?`${radarSVG(la,pa)}<div class="areas" style="margin-top:8px">${Object.entries(evalCfg()).map(([k,a])=>`<div class="area"><span>${esc(a.l)}</span><b>${la[k]==null?"–":fmt1(la[k])}</b>${pa&&la[k]!=null&&pa[k]!=null?deltaHTML(la[k],pa[k],false,1):""}</div>`).join("")}</div>
        ${prev?`<p class="note">Linha tracejada: avaliação anterior (${fmtD(prev.date)}).</p>`:""}`:`<div class="empty"><b>Sem avaliações</b>Avalia técnica, tática, física e psicológica de 0 a 10.</div>`}
    </div>${evs.length?`<div class="list" style="border-top:1px solid var(--line)">${evs.slice().reverse().map(e=>`<button class="li" data-a="evalEdit" data-id="${esc(e.id)}"><span class="main"><b>${fmtD(e.date,{day:"numeric",month:"long",year:"numeric"})}</b><small>${esc(e.by||"Sem responsável")}${e.fin?" — "+esc(e.fin):""}</small></span>${badge(evalScore(e))}</button>`).join("")}</div>`:""}</section>
    <section class="card"><div class="card-h"><h3>Testes físicos</h3><button class="btn sm" data-a="tab" data-t="testes">Registar</button></div>
      ${ms.length?`<div class="tscroll"><table class="tb"><thead><tr><th class="l">Teste</th>${ms.map(mo=>`<th>${esc(mo.label||fmtD(mo.date))}</th>`).join("")}</tr></thead><tbody>${testRows}</tbody></table></div>`:`<div class="empty"><b>Sem momentos de avaliação</b></div>`}</section>
    <section class="card"><div class="card-h"><h3>Jogos</h3><span class="sub">${s.games.length} convocatórias</span></div>
      ${s.games.length?`<div class="tscroll"><table class="tb"><thead><tr><th class="l">Jogo</th><th>Min</th><th>G</th><th>A</th><th>Nota</th></tr></thead><tbody>${s.games.slice().reverse().map(x=>`<tr><td class="l"><button class="lnk" data-a="page" data-p="jogo" data-id="${esc(x.id)}"><b>${esc(x.opp||"Jogo")}</b> <span class="small muted">${fmtD(x.date)}</span></button></td><td class="num">${x.min}'${x.st?"":` <span class="small muted">sup.</span>`}</td><td>${x.g||"–"}</td><td>${x.a||"–"}</td><td>${badge(x.rt)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty"><b>Ainda sem jogos</b></div>`}</section>
    ${athStatsHTML(s)}
    <section class="card"><div class="card-h"><h3>Treinos</h3><span class="sub">${s.trTotal} registos</span></div><div class="card-b">
      ${s.trTotal?`<div class="chips">${Object.values(ATT).map(a=>`<span class="tag" style="${s.tr[a.s]?`background:${a.c};color:#fff;border-color:transparent`:""}">${a.l}: ${s.tr[a.s]}</span>`).join("")}</div>`:`<div class="small muted">Sem presenças registadas.</div>`}</div></section>
    <section class="card"><div class="card-h"><h3>Historial clínico</h3><button class="btn sm" data-a="injNew" data-id="${esc(id)}">+ Lesão</button></div>
      <div class="list">${inj.length?inj.map(injRow).join(""):`<div class="empty"><b>Sem lesões registadas</b></div>`}</div></section>
    <section class="card"><div class="card-h"><h3>Notas</h3></div><div class="card-b"><label class="fld"><textarea data-c="f" data-col="players" data-id="${esc(id)}" data-f="notes" placeholder="Observações do treinador, objetivos individuais…">${esc(p.notes||"")}</textarea></label></div></section>
  </div>`;
}
function deltaHTML(v,pv,lowBetter,dec){
  if(v==null||pv==null) return "";
  const d=v-pv; if(Math.abs(d)<1e-9) return `<span class="delta eq">=</span>`;
  const better = lowBetter ? d<0 : d>0;
  const val = dec ? fmt1(Math.abs(d)) : String(Math.round(Math.abs(d)*100)/100);
  return `<span class="delta ${better?"up":"down"}">${d>0?"+":"−"}${val}</span>`;
}

/* ================= estatísticas de jogo personalizadas ================= */
function gameStatsHTML(g,id,ficha){
  const defs=statDefs();
  const head=`<div class="card-h"><h3>5. Estatísticas de jogo</h3><button class="btn sm" data-a="sdCfg">Configurar</button></div>`;
  if(!defs.length) return `<section class="card">${head}<div class="empty"><b>Sem eventos configurados</b>Cria os teus eventos (remates, recuperações, perdas de bola…).</div></section>`;
  const rows=ficha.filter(({x})=>x.st||x.min>0);
  if(!rows.length) return `<section class="card">${head}<div class="empty"><b>Aparece quando houver jogadores utilizados</b></div></section>`;
  const st=g.st||{}, tot={};
  rows.forEach(({p})=>defs.forEach(d=>{ tot[d.id]=(tot[d.id]||0)+(+((st[p.id]||{})[d.id])||0); }));
  return `<section class="card">${head}
    <div class="tscroll"><table class="tb"><thead><tr><th class="l stk">Jogador</th>${defs.map(d=>`<th title="${esc(d.title)}"><span style="color:${d.neg?"var(--r5)":"var(--r8)"}">${esc(d.code||d.title)}</span></th>`).join("")}</tr></thead><tbody>
    ${rows.map(({p})=>`<tr><td class="l stk"><div class="pin">${avatar(p)}<b>${esc(p.name)}</b></div></td>${defs.map(d=>{ const v=+((st[p.id]||{})[d.id])||0;
      return `<td><span class="cnt"><button data-a="gst" data-id="${esc(id)}" data-p="${esc(p.id)}" data-k="${esc(d.id)}" data-n="-1" ${v?"":"disabled"} aria-label="Menos ${esc(d.title)}">−</button><b class="num">${v}</b><button data-a="gst" data-id="${esc(id)}" data-p="${esc(p.id)}" data-k="${esc(d.id)}" data-n="1" aria-label="Mais ${esc(d.title)} de ${esc(p.name)}">+</button></span></td>`; }).join("")}</tr>`).join("")}
    <tr><td class="l stk"><b>Equipa</b></td>${defs.map(d=>`<td class="num"><b>${tot[d.id]||0}</b></td>`).join("")}</tr>
    </tbody></table></div>
    <p class="note" style="padding:0 16px 14px">${defs.map(d=>`<b>${esc(d.code||"")}</b> ${esc(d.title)}`).join(" — ")}. Verde = ação positiva, vermelho = negativa.</p></section>`;
}
function athStatsHTML(s){
  const defs=statDefs(); if(!defs.length) return "";
  return `<section class="card"><div class="card-h"><h3>Estatísticas de jogo</h3><span class="sub">Total — por jogo</span></div>
    <div class="card-b"><div class="kpis">${defs.map(d=>{ const v=s.cs[d.id]||0; return `<div class="kpi"><span>${esc(d.title)}</span><b style="color:${v&&d.neg?"var(--r5)":"inherit"}">${v}<small> ${s.j?fmt1(v/s.j):"–"}/jogo</small></b></div>`; }).join("")}</div></div></section>`;
}
