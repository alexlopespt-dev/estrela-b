/* ================= impressão / PDF ================= */
let PRINT_MODE="dl";
const PCSS = `
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#1b1014;font-family:"Barlow",system-ui,Arial,sans-serif;font-size:12px;line-height:1.35}
.page{max-width:780px;margin:0 auto;padding:22px}
header.p{display:flex;gap:14px;align-items:center;border-bottom:3px solid #6b1426;padding-bottom:10px;margin-bottom:14px}
header.p img{width:52px}
header.p h1{margin:0;font-family:"Barlow Condensed",Arial Narrow,sans-serif;font-size:26px;line-height:1}
header.p p{margin:3px 0 0;color:#6b5a5f;font-size:12px}
header.p .right{margin-left:auto;text-align:right;color:#6b5a5f;font-size:11px}
h2{font-family:"Barlow Condensed",Arial Narrow,sans-serif;font-size:17px;margin:16px 0 6px;padding-bottom:3px;border-bottom:1px solid #e0d8da;color:#6b1426;text-transform:uppercase;letter-spacing:.03em}
table{width:100%;border-collapse:collapse;font-size:11.5px}
th,td{border:1px solid #e0d8da;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f6f2f3;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.02em}
td.c,th.c{text-align:center}
.kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px 14px;margin-bottom:6px}
.kv div{font-size:11.5px}
.kv b{display:block;font-size:10px;color:#6b5a5f;text-transform:uppercase;letter-spacing:.03em;font-weight:700}
.blocks{display:flex;flex-direction:column;gap:10px}
.blk{border:1px solid #e0d8da;border-radius:6px;padding:8px 10px;page-break-inside:avoid}
.blk h3{margin:0 0 3px;font-size:13px}
.blk .meta{color:#6b5a5f;font-size:11px;margin-bottom:4px}
.blk p{margin:3px 0}
.blk .draw{max-width:62%;margin-top:6px}
.blk .draw svg,.blk .draw img{width:100%;height:auto;border-radius:5px}
.note{color:#6b5a5f;font-size:11px}
.sign{display:flex;gap:30px;margin-top:26px}
.sign div{flex:1;border-top:1px solid #9d9095;padding-top:4px;font-size:11px;color:#6b5a5f}
ul{margin:4px 0;padding-left:16px}
.bar{height:8px;background:#efeaec;border-radius:4px;overflow:hidden;min-width:60px}
.bar i{display:block;height:100%;background:#6b1426}
@media print{ .page{max-width:none;padding:0 6mm} @page{size:A4;margin:12mm} body{font-size:11px} }
`;
function printDoc(fname, title, body){
  const m=meta();
  const html=`<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">
<style>${PCSS}
body{zoom:${(PRINT_PREF.scale||100)/100}}
@media print{ body{zoom:${(PRINT_PREF.scale||100)/100}} }</style></head><body><div class="page">
<header class="p"><img src="${CREST}" alt=""><div><h1>${esc(title)}</h1><p>${esc([m.team||"Estrela B",m.comp,m.season?"Época "+m.season:""].filter(Boolean).join(" — "))}</p></div><div class="right">Departamento técnico<br>${fmtD(todayISO(),{day:"numeric",month:"long",year:"numeric"})}</div></header>
${body}</div><script>window.onload=function(){setTimeout(function(){try{window.print();}catch(e){}},400);};<\/script></body></html>`;
  openPrintable(fname, html);
}
async function openPrintable(fname, html){
  if(PRINT_MODE==="open"){
    try{ const w=window.open("","_blank"); if(w && w.document){ w.document.open(); w.document.write(html); w.document.close(); toast("Abre a janela e escolhe Imprimir ou Guardar como PDF."); return; } }catch(e){}
    toast("O browser bloqueou a aba nova — vou descarregar o ficheiro.");
  }
  html=html.replace("window.onload=function(){setTimeout(function(){try{window.print();}catch(e){}},400);};","");
  const dl=await use("downloads");
  if(dl){ try{ await dl.save({filename:fname+".html",data:html}); toast("Ficheiro guardado. Abre-o e escolhe Imprimir → Guardar como PDF."); return; }
    catch(e){ if(e&&e.code==="declined") return; } }
  try{
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([html],{type:"text/html"})); a.download=fname+".html";
    document.body.appendChild(a); a.click(); a.remove(); toast("Ficheiro descarregado. Abre-o e escolhe Imprimir → Guardar como PDF.");
  }catch(e){ toast("Não foi possível preparar o documento para impressão."); }
}
const pRow = (l,v) => `<div><b>${esc(l)}</b>${esc(v==null||v===""?"—":v)}</div>`;

/* ---- plano de treino ---- */
function planPrint(id){
  const e=D.events[id]; if(!e) return; const tr={id,...e};
  const mi=cycleAt("micro",tr.date), me=cycleAt("meso",tr.date);
  const plan=tr.plan||[], total=plan.reduce((s,x)=>s+(+x.min||0),0);
  const blocks=plan.map((x,i)=>{ const ex=x.ex?D.exercises[x.ex]:null;
    const prs=blockPrinciples(x).map(k=>D.principles[k]).filter(Boolean);
    return `<div class="blk"><h3>${i+1}. ${esc(x.name||(ex&&ex.name)||"Bloco")}${x.min?` <span class="note">— ${esc(x.min)}'</span>`:""}</h3>
      <div class="meta">${esc([ex&&ex.cat,ex&&ex.players?ex.players+" jogadores":"",ex&&ex.space,prs.length?"Princípios: "+prs.map(p=>p.name).join(", "):""].filter(Boolean).join(" — "))}</div>
      ${ex&&ex.obj?`<p><b>Objetivo:</b> ${esc(ex.obj)}</p>`:""}
      ${ex&&ex.desc?`<p>${esc(ex.desc)}</p>`:""}
      ${ex&&ex.mat?`<p class="note"><b>Material:</b> ${esc(ex.mat)}</p>`:""}
      ${ex&&ex.cp?`<p class="note"><b>Pontos-chave:</b> ${esc(ex.cp).replace(/\n/g,"<br>")}</p>`:""}
      ${ex&&exImg(ex)?`<div class="draw"><img src="${esc(exImg(ex))}" alt=""></div>`:(ex&&ex.drw&&(ex.drw.it||[]).length?`<div class="draw">${drawSVG(ex.drw)}</div>`:"")}</div>`; }).join("");
  const out=players().filter(p=>avail(p.id)!=="ok");
  const body=`<div class="kv">${pRow("Data",fmtLong(tr.date))}${pRow("Hora",tr.time)}${pRow("Duração",(tr.dur||0)+" min")}${pRow("Local",tr.place)}${pRow("Intensidade",tr.int)}${pRow("Microciclo",mi&&mi.name)}${pRow("Mesociclo",me&&me.name)}</div>
    ${tr.theme?`<h2>Tema da sessão</h2><p>${esc(tr.theme)}</p>`:""}
    ${mi&&mi.obj?`<p class="note"><b>Objetivo do microciclo:</b> ${esc(mi.obj)}</p>`:""}
    <h2>Plano — ${total}' planeados</h2>${plan.length?`<div class="blocks">${blocks}</div>`:`<p class="note">Sem blocos no plano.</p>`}
    ${out.length?`<h2>Indisponíveis</h2><p>${out.map(p=>esc(p.name)+" ("+AV[avail(p.id)].l.toLowerCase()+")").join(", ")}</p>`:""}
    <h2>Notas</h2><p>${tr.notes?esc(tr.notes).replace(/\n/g,"<br>"):"&nbsp;"}</p>
    <div class="sign"><div>Treinador</div><div>Adjunto</div></div>`;
  printDoc(`plano-treino-${tr.date}`,"Plano de treino",body);
}

/* ---- relatório do treino ---- */
function trainingPrint(id){
  const e=D.events[id]; if(!e) return; const tr={id,...e};
  const att=tr.att||{}, pev=tr.pev||{}, dur=+tr.dur||0;
  const rows=players().map(p=>{ const a=att[p.id]||{}, v=pev[p.id]||{}; const rpe=parseNum(a.rpe);
    return {p,s:a.s,rpe,load:rpe==null?null:rpe*dur,r:parseNum(v.r),t:v.t||""}; }).filter(x=>x.s||x.r!=null||x.t);
  const pres=rows.filter(x=>x.s==="P"||x.s==="AT").length;
  const loads=rows.map(x=>x.load).filter(x=>x!=null), notas=rows.map(x=>x.r).filter(x=>x!=null);
  const mi=cycleAt("micro",tr.date);
  const body=`<div class="kv">${pRow("Data",fmtLong(tr.date))}${pRow("Hora",tr.time)}${pRow("Duração",dur+" min")}${pRow("Local",tr.place)}${pRow("Tema",tr.theme)}${pRow("Microciclo",mi&&mi.name)}${pRow("Presentes",pres+" de "+players().length)}${pRow("Carga média",loads.length?Math.round(avg(loads))+" UA":"—")}${pRow("Nota média",notas.length?fmt1(avg(notas)):"—")}</div>
    <h2>Presenças e avaliação individual</h2>
    <table><thead><tr><th>Atleta</th><th class="c">Pos.</th><th class="c">Presença</th><th class="c">RPE</th><th class="c">Carga</th><th class="c">Nota</th><th>Observações</th></tr></thead><tbody>
    ${rows.map(x=>`<tr><td>${esc(x.p.name)}</td><td class="c">${esc(x.p.pos||"")}</td><td class="c">${x.s?esc(ATT[x.s].l):"—"}</td><td class="c">${x.rpe??"—"}</td><td class="c">${x.load==null?"—":Math.round(x.load)}</td><td class="c"><b>${x.r==null?"—":fmt1(x.r)}</b></td><td>${esc(x.t)}</td></tr>`).join("")}
    </tbody></table>
    ${staff().length?`<h2>Equipa técnica</h2><table><thead><tr><th>Nome</th><th>Função</th><th class="c">Presença</th></tr></thead><tbody>${staff().map(p=>{ const a=(tr.satt||{})[p.id]; return `<tr><td>${esc(p.name)}</td><td>${esc(p.role||"")}</td><td class="c">${a&&a.s?esc(ATT[a.s].l):"—"}</td></tr>`; }).join("")}</tbody></table>`:""}
    ${(tr.plan||[]).length?`<h2>Plano realizado</h2><table><thead><tr><th class="c">#</th><th>Bloco</th><th class="c">Min</th><th>Princípios</th></tr></thead><tbody>${(tr.plan||[]).map((x,i)=>{ const ex=x.ex?D.exercises[x.ex]:null; const prs=blockPrinciples(x).map(k=>D.principles[k]).filter(Boolean).map(p=>p.name).join(", ");
      return `<tr><td class="c">${i+1}</td><td>${esc(x.name||(ex&&ex.name)||"")}</td><td class="c">${esc(x.min??"")}</td><td>${esc(prs)}</td></tr>`; }).join("")}</tbody></table>`:""}
    <h2>Notas do treinador</h2><p>${tr.notes?esc(tr.notes).replace(/\n/g,"<br>"):"&nbsp;"}</p>
    <div class="sign"><div>Treinador</div><div>Data</div></div>`;
  printDoc(`relatorio-treino-${tr.date}`,"Relatório de treino",body);
}

/* ---- relatório do atleta ---- */
function athletePrint(pid){
  const p=P(pid); if(!p) return;
  const s=stats().pl[pid], evs=evalsOf(pid), last=evs[evs.length-1], la=last?evalAreas(last):null;
  const ec=evalCfg(), ms=testMoments(), inj=injuries().filter(i=>i.pid===pid);
  const tevs=trainings().filter(t=>t.date<=todayISO()&&(t.pev||{})[pid]&&((t.pev[pid].r!=null&&t.pev[pid].r!=="")||t.pev[pid].t))
    .sort((a,b)=>b.date.localeCompare(a.date));
  const tNotas=tevs.map(t=>parseNum(t.pev[pid].r)).filter(x=>x!=null);
  const defs=statDefs();
  const body=`<div class="kv">${pRow("Nome",p.name)}${pRow("N.º",p.n)}${pRow("Posição",p.pos)}${pRow("Pé",p.foot)}${pRow("Idade",ageOf(p.birth)!=null?ageOf(p.birth)+" anos":"")}${pRow("Altura",p.height?p.height+" cm":"")}${pRow("Disponibilidade",AV[avail(pid)].l)}</div>
    <h2>Época</h2>
    <div class="kv">${pRow("Jogos (titular)",`${s.j} (${s.tit})`)}${pRow("Minutos",s.min+"'")}${pRow("Golos",s.g)}${pRow("Assistências",s.a)}${pRow("Nota média de jogo",s.avg==null?"":fmt1(s.avg))}${pRow("Assiduidade",s.att==null?"":s.att+"%")}${pRow("Nota média de treino",tNotas.length?fmt1(avg(tNotas)):"")}${pRow("Avaliações de treino",tevs.length)}</div>
    ${defs.length&&defs.some(d=>s.cs[d.id])?`<h2>Estatísticas de jogo</h2><table><thead><tr>${defs.map(d=>`<th class="c">${esc(d.title)}</th>`).join("")}</tr></thead><tbody><tr>${defs.map(d=>`<td class="c">${s.cs[d.id]||0}</td>`).join("")}</tr></tbody></table>`:""}
    ${last?`<h2>Avaliação — ${fmtD(last.date,{day:"numeric",month:"long",year:"numeric"})}</h2>
      <table><thead><tr><th>Área</th><th class="c">Nota</th><th>Atributos</th></tr></thead><tbody>
      ${Object.entries(ec).map(([k,a])=>`<tr><td><b>${esc(a.l)}</b></td><td class="c">${la[k]==null?"—":fmt1(la[k])}</td><td>${Object.entries((last.v||{})[k]||{}).map(([n,val])=>esc(n)+" "+fmt1(parseNum(val))).join(" · ")||"—"}</td></tr>`).join("")}
      </tbody></table>
      ${last.str?`<p><b>Principais qualidades:</b> ${esc(last.str).replace(/\n/g,"<br>")}</p>`:""}
      ${last.weak?`<p><b>Aspetos a melhorar:</b> ${esc(last.weak).replace(/\n/g,"<br>")}</p>`:""}
      ${last.fin?`<p><b>Avaliação final:</b> ${esc(last.fin)}</p>`:""}`:""}
    ${tevs.length?`<h2>Avaliações de treino</h2><table><thead><tr><th class="c">Data</th><th>Sessão</th><th class="c">Nota</th><th>Observações</th></tr></thead><tbody>
      ${tevs.slice(0,25).map(t=>`<tr><td class="c">${fmtD(t.date)}</td><td>${esc(t.theme||"Treino")}</td><td class="c"><b>${parseNum(t.pev[pid].r)==null?"—":fmt1(parseNum(t.pev[pid].r))}</b></td><td>${esc(t.pev[pid].t||"")}</td></tr>`).join("")}
      </tbody></table>${tevs.length>25?`<p class="note">Mostradas as 25 mais recentes de ${tevs.length}.</p>`:""}`:""}
    ${s.games.length?`<h2>Jogos</h2><table><thead><tr><th class="c">Data</th><th>Adversário</th><th class="c">Min</th><th class="c">G</th><th class="c">A</th><th class="c">Nota</th></tr></thead><tbody>
      ${s.games.slice().reverse().map(g=>`<tr><td class="c">${fmtD(g.date)}</td><td>${esc(g.opp||"")}</td><td class="c">${g.min}</td><td class="c">${g.g||""}</td><td class="c">${g.a||""}</td><td class="c">${g.rt==null?"—":fmt1(g.rt)}</td></tr>`).join("")}</tbody></table>`:""}
    ${ms.length?`<h2>Testes físicos</h2><table><thead><tr><th>Teste</th>${ms.map(m=>`<th class="c">${esc(m.label||fmtD(m.date))}</th>`).join("")}</tr></thead><tbody>
      ${TESTS.map(t=>`<tr><td>${t.l} (${t.u})</td>${ms.map(m=>{ const v=parseNum(((m.res||{})[pid]||{})[t.k]); return `<td class="c">${v==null?"—":v}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`:""}
    ${inj.length?`<h2>Historial clínico</h2><table><thead><tr><th class="c">Data</th><th>Lesão</th><th class="c">Estado</th><th class="c">Dias</th></tr></thead><tbody>
      ${inj.map(i=>{ const end=i.status==="alta"&&validISO(i.ret)?i.ret:todayISO(); return `<tr><td class="c">${fmtD(i.date)}</td><td>${esc([i.zone,i.type,i.diag].filter(Boolean).join(" — "))}</td><td class="c">${esc(INJ_ST[i.status]?INJ_ST[i.status].l:"")}</td><td class="c">${validISO(i.date)?Math.max(0,dayDiff(i.date,end)):""}</td></tr>`; }).join("")}</tbody></table>`:""}
    ${p.notes?`<h2>Notas</h2><p>${esc(p.notes).replace(/\n/g,"<br>")}</p>`:""}
    <div class="sign"><div>Treinador</div><div>Atleta / encarregado de educação</div></div>`;
  printDoc(`relatorio-${String(p.name).toLowerCase().replace(/\s+/g,"-")}`,`Relatório — ${p.name}`,body);
}

/* ---- ficha de jogo ---- */
function gamePrint(id){
  const g0=D.events[id]; if(!g0) return; const g={id,...g0}, c=gameCalc(g);
  const evs=(g.ev||[]).slice().sort((a,b)=>(parseNum(a.min)??999)-(parseNum(b.min)??999));
  const name=e=>e.t==="sub"?`Entra ${pname(e.in)}, sai ${pname(e.out)}`:(e.pid?pname(e.pid):"Autogolo do adversário");
  const tp={golo:"Golo",assist:"Assistência",amarelo:"Cartão amarelo",vermelho:"Cartão vermelho",sub:"Substituição"};
  const rows=Object.entries(c.res).map(([pid,x])=>({p:P(pid)||{name:"(removido)",pos:""},x})).sort((a,b)=>(b.x.st-a.x.st)||BYPOS(a.p,b.p));
  const defs=statDefs(), st=g.st||{};
  const body=`<div class="kv">${pRow("Adversário",g.opp)}${pRow("Data",fmtLong(g.date))}${pRow("Hora",g.time)}${pRow("Competição",g.comp)}${pRow("Jornada",g.phase)}${pRow("Local",g.venue==="F"?"Fora":"Casa")}${pRow("Resultado",scoreTxt(g,c)+(c.result?" ("+{V:"vitória",E:"empate",D:"derrota"}[c.result]+")":""))}</div>
    <h2>Ficha individual</h2>
    <table><thead><tr><th>Atleta</th><th class="c">Pos.</th><th class="c">Min</th><th class="c">G</th><th class="c">A</th><th class="c">Cartões</th><th class="c">Nota</th>${defs.map(d=>`<th class="c">${esc(d.code||d.title)}</th>`).join("")}</tr></thead><tbody>
    ${rows.map(({p,x})=>`<tr><td>${esc(p.name)}${x.st?"":" <span class='note'>(sup.)</span>"}</td><td class="c">${esc(p.pos||"")}</td><td class="c">${x.min}</td><td class="c">${x.g||""}</td><td class="c">${x.a||""}</td><td class="c">${(x.y?"A".repeat(x.y):"")+(x.r?" V":"")}</td><td class="c"><b>${parseNum((g.rt||{})[p.id])==null?"—":fmt1(parseNum(g.rt[p.id]))}</b></td>${defs.map(d=>`<td class="c">${(st[p.id]||{})[d.id]||""}</td>`).join("")}</tr>`).join("")}
    </tbody></table>
    ${evs.length?`<h2>Eventos</h2><table><thead><tr><th class="c">Min</th><th>Evento</th><th>Jogador</th></tr></thead><tbody>${evs.map(e=>`<tr><td class="c">${parseNum(e.min)!=null?esc(parseNum(e.min))+"'":"—"}</td><td>${tp[e.t]||e.t}</td><td>${esc(name(e))}</td></tr>`).join("")}</tbody></table>`:""}
    ${g.notes?`<h2>Relatório</h2><p>${esc(g.notes).replace(/\n/g,"<br>")}</p>`:""}
    <div class="sign"><div>Treinador</div><div>Data</div></div>`;
  printDoc(`ficha-jogo-${g.date}`,"Ficha de jogo",body);
}

/* ---- ficha do adversário ---- */
function oppPrint(id){
  const o=D.opponents[id]; if(!o) return;
  const sec=(t,v)=>v?`<h2>${t}</h2><p>${esc(v).replace(/\n/g,"<br>")}</p>`:"";
  const keys=o.keys||[], reps=(o.reports||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const body=`<div class="kv">${pRow("Adversário",o.name)}${pRow("Competição",o.comp)}${pRow("Sistema tático",o.formation)}${pRow("Estilo",o.style)}${pRow("Treinador",o.coach)}${pRow("Campo",o.venue)}</div>
    ${sec("Onze provável",o.form1)}${sec("Pontos fortes",o.strong)}${sec("Pontos fracos",o.weak)}
    ${sec("Com bola",o.oo)}${sec("Sem bola",o.od)}${sec("Transições",o.trans)}${sec("Bolas paradas",o.bp)}${sec("Guarda-redes",o.gk)}
    ${keys.length?`<h2>Jogadores a vigiar</h2><table><thead><tr><th class="c">N.º</th><th>Nome</th><th class="c">Pos.</th><th class="c">Pé</th><th>Notas</th></tr></thead><tbody>${keys.map(k=>`<tr><td class="c">${esc(k.n||"")}</td><td>${esc(k.name)}</td><td class="c">${esc(k.pos||"")}</td><td class="c">${esc(k.foot||"")}</td><td>${esc(k.note||"")}</td></tr>`).join("")}</tbody></table>`:""}
    ${sec("Plano para o jogo",o.plan)}${sec("Notas",o.notes)}
    ${reps.length?`<h2>Observações</h2>${reps.map(r=>`<p><b>${fmtD(r.date,{day:"numeric",month:"long",year:"numeric"})}${r.game?" — "+esc(r.game):""}</b>${r.by?` <span class="note">(${esc(r.by)})</span>`:""}<br>${esc(r.txt||"").replace(/\n/g,"<br>")}</p>`).join("")}`:""}`;
  printDoc(`adversario-${String(o.name).toLowerCase().replace(/\s+/g,"-")}`,`Análise do adversário — ${o.name}`,body);
}
