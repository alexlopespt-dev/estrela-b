/* ================= RELATÓRIO MENSAL POR ATLETA =================
   Ficha do atleta → "Relatório mensal" (ou Plantel → "Relatórios mensais", um atleta ou todos, uma página cada).
   Do mês escolhido: presenças, jogos/minutos/golos/notas, carga e bem-estar diários (gráficos separados, nunca dois eixos),
   semanas, avaliações, testes físicos, lesões e reabilitação, e um espaço para as notas da conversa com o atleta.
   Bem-estar e PSE vêm do Sheets (pedido "mensal" ao script da partilha, folhas inteiras); sem partilha, a carga usa as
   PSE escritas nos treinos da app e o bem-estar fica de fora (avisado no relatório). */
const MES_N = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const mesNome = m => { const [y,mm]=m.split("-").map(Number); return `${MES_N[mm-1]} de ${y}`; };
const mesFim = m => { const [y,mm]=m.split("-").map(Number); return isoOf(new Date(y,mm,0)); };
function mesLista(){ const t=todayISO(), out=[]; let [y,m]=t.split("-").map(Number);
  for(let i=0;i<12;i++){ out.push(`${y}-${pad(m)}`); m--; if(!m){ m=12; y--; } } return out; }
function mesForm(pid){
  const t=todayISO(), ms=mesLista(), def=+t.slice(8)<=7?ms[1]:ms[0];   // na primeira semana do mês, por omissão o mês anterior
  const pls=players();
  modal({title:"Relatório mensal",sub:"Uma página A4 por atleta, para imprimir ou guardar em PDF",
    body:`<div class="form"><label class="fld">Mês${sel("mes",ms.map(m=>({v:m,l:cap1(mesNome(m))})),def)}</label>
      <label class="fld">Atleta${sel("pid",[{v:"*",l:`Todos os atletas (${pls.length} páginas)`},...pls.map(p=>({v:p.id,l:(p.n?p.n+" — ":"")+p.name}))],pid||"*")}</label></div>
      <p class="note">${EDITION!=="estrela"?"A carga conta as PSE escritas nos treinos (presenças → PSE).":syncOn()?"O bem-estar e a carga (PSE) vêm das respostas no Sheets: o relatório demora alguns segundos a preparar.":"Sem a partilha ligada, o relatório não tem o bem-estar e a carga só conta as PSE escritas nos treinos desta app."}</p>`,
    foot:`<button class="btn" data-a="mesGo" data-k="open">Abrir numa aba</button><span class="right"><button class="btn primary" data-a="mesGo" data-k="dl">Descarregar</button></span>`,ctx:{pick:true}});
}
async function mesGo(el){
  const mes=fv("mes"), pid=fv("pid"); if(!/^\d{4}-\d{2}$/.test(mes)) return;
  closeModal(); PRINT_MODE=el.dataset.k; PRINT_WIN=null; if(PRINT_MODE==="open"){ try{ PRINT_WIN=window.open("","_blank"); }catch(e){} }
  let srv=null, aviso="";
  if(EDITION==="estrela"&&syncOn()){ toast("A ler o bem-estar e a carga do Sheets…");
    try{ srv=await syncGet({a:"mensal",mes},90000); if(srv&&srv.erros&&srv.erros.length) aviso="Não foi possível ler parte das respostas: "+srv.erros.join("; "); }
    catch(e){ srv=null; aviso=/desconhecido/i.test(e.message||"")?"O script da partilha ainda não tem a versão nova: sem bem-estar e com a carga só da app.":"Não foi possível ler o Sheets ("+(e&&e.name==="AbortError"?"demorou demasiado":e.message)+"): sem bem-estar e com a carga só da app."; } }
  else if(EDITION==="estrela") aviso="Partilha não ligada: sem bem-estar e com a carga só das PSE escritas nos treinos da app.";
  const ids = pid==="*" ? players().map(p=>p.id) : [pid];
  mesPrint(ids, mes, srv, aviso);
}
// números de um atleta num mês
function mesDados(pid, mes, srv){
  const ini=mes+"-01", fim=mesFim(mes), t=todayISO(), ate=fim<t?fim:t, dias=[], inM=d=>d>=ini&&d<=fim;
  for(let d=ini; d<=fim; d=addDays(d,1)) dias.push(d);
  const trs=trainings().filter(e=>inM(e.date)&&e.date<=t), att={P:0,AT:0,FJ:0,FI:0,L:0,D:0}, falt=[];
  const appC={}; trs.forEach(e=>{ const a=(e.att||{})[pid]; if(!a||!a.s) return; att[a.s]=(att[a.s]||0)+1; if(a.s!=="P"&&a.s!=="AT") falt.push({d:e.date,s:a.s});
    const r=parseNum(a.rpe); if(r!=null&&(a.s==="P"||a.s==="AT")) appC[e.date]=(appC[e.date]||0)+r*(+e.dur||0); });
  const marc=att.P+att.AT+att.FJ+att.FI, pres=marc?Math.round((att.P+att.AT)/marc*100):null;
  const gms=events().filter(e=>e.type==="jogo"&&inM(e.date)&&e.date<=t).sort(byDT), jogos=[]; let poss=0;
  gms.forEach(g=>{ const c=gameCalc(g), x=c.res[pid]; poss+=c.dur; if(!x) return; jogos.push({g,c,x,nota:parseNum((g.rt||{})[pid])}); });
  const sum=k=>jogos.reduce((s,j)=>s+(j.x[k]||0),0), jogou=jogos.filter(j=>j.x.min>0||j.x.st);
  const notas=jogos.map(j=>j.nota).filter(v=>v!=null);
  // carga e bem-estar por dia
  const sp=srv&&srv.pse&&srv.pse[pid]||null, sb=srv&&srv.bem&&srv.bem[pid]||null, fonte=srv?"sheets":"app";
  const carga={}, sess={}; dias.forEach(d=>{ if(srv){ const l=(sp&&sp[d])||[]; if(l.length){ carga[d]=l.reduce((s,x)=>s+(x.c||0),0); sess[d]=l.length; } } else if(appC[d]){ carga[d]=appC[d]; sess[d]=1; } });
  const bem={}; if(sb) dias.forEach(d=>{ if(sb[d]) bem[d]=sb[d].t; });
  const cT=Object.values(carga).reduce((s,v)=>s+v,0), nS=Object.values(sess).reduce((s,v)=>s+v,0), bv=Object.values(bem);
  // semanas (segunda a domingo) que tocam o mês
  const sem=[]; for(let w=mondayOf(ini); w<=fim; w=addDays(w,7)){ const ds=[...Array(7)].map((_,i)=>addDays(w,i)).filter(inM);
    const c=ds.reduce((s,d)=>s+(carga[d]||0),0), n=ds.reduce((s,d)=>s+(sess[d]||0),0), b=ds.map(d=>bem[d]).filter(v=>v!=null);
    sem.push({w,ds,c,n,b:b.length?avg(b):null,tr:trs.filter(e=>ds.includes(e.date)).length,jg:gms.filter(e=>ds.includes(e.date)).length}); }
  const evs=evalsOf(pid).filter(e=>inM(e.date));
  const ms=testMoments(), tst=ms.map((m,i)=>({m,i})).filter(o=>inM(o.m.date)&&(o.m.res||{})[pid]);
  const injs=injuries().filter(i=>i.pid===pid&&validISO(i.date)&&i.date<=fim&&!(i.status==="alta"&&validISO(i.ret)&&i.ret<ini));
  const diasLes=injs.reduce((n,i)=>{ const a=i.date>ini?i.date:ini, b0=i.status==="alta"&&validISO(i.ret)?i.ret:ate, b=b0<ate?b0:ate; return n+Math.max(0,dayDiff(a,b)+(b>=a?1:0)); },0);
  const reab=injs.map(i=>({i,pl:(D.rehab||{})[i.id]})).filter(o=>o.pl).map(o=>{ const lg=(o.pl.log||[]).filter(l=>inM(l.d)), dr=lg.map(l=>parseNum(l.dor)).filter(v=>v!=null);
    return {i:o.i,n:lg.length,app:lg.filter(l=>l.app).length,dor:dr.length?avg(dr):null,fase:o.pl.fase}; });
  return {pid,mes,ini,fim,ate,dias,trs,att,falt,marc,pres,gms,jogos,jogou,poss,min:sum("min"),g:sum("g"),a:sum("a"),y:sum("y"),r:sum("r"),tit:jogos.filter(j=>j.x.st).length,
    nota:notas.length?avg(notas):null,nNotas:notas.length,carga,sess,bem,cT,nS,bMed:bv.length?avg(bv):null,nB:bv.length,fonte,sem,evs,tst,ms,injs,diasLes,reab};
}
// gráfico de barras por dia (carga) e de pontos ligados (bem-estar): eixos próprios, mesma largura e mesmos dias (alinhados)
function mesBars(M,ref){
  const W=700,H=96,l=34,r=8,tp=8,bt=18,n=M.dias.length,cw=(W-l-r)/n, mx=Math.max(1,ref||0,...Object.values(M.carga))*1.08;
  const y=v=>tp+(H-tp-bt)*(1-v/mx), jg=new Set(M.gms.map(g=>g.date)), tk=[0,mx/2,mx].map(v=>Math.round(v/50)*50);
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Carga diária (UA)">`;
  tk.forEach(v=>{ s+=`<line x1="${l}" x2="${W-r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#eee"/><text x="${l-4}" y="${(y(v)+3).toFixed(1)}" font-size="8" text-anchor="end" fill="#8a7a80">${v}</text>`; });
  if(ref) s+=`<line x1="${l}" x2="${W-r}" y1="${y(ref).toFixed(1)}" y2="${y(ref).toFixed(1)}" stroke="#b07800" stroke-dasharray="4 3"/><text x="${W-r}" y="${(y(ref)-3).toFixed(1)}" font-size="8" text-anchor="end" fill="#8a5d00">média diária do plantel ${Math.round(ref)}</text>`;
  M.dias.forEach((d,i)=>{ const v=M.carga[d]||0, x=l+i*cw;
    if(v) s+=`<rect x="${(x+cw*.16).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(cw*.68).toFixed(1)}" height="${(H-bt-y(v)).toFixed(1)}" rx="1.5" fill="#8f2239"/>`;
    if(jg.has(d)) s+=`<path d="M${(x+cw/2).toFixed(1)} ${H-bt+2} l3.2 5 h-6.4z" fill="#b07800"/>`;
    if(i%2===0||n<=16) s+=`<text x="${(x+cw/2).toFixed(1)}" y="${H-4}" font-size="7.5" text-anchor="middle" fill="#8a7a80">${+d.slice(8)}</text>`; });
  return s+`</svg>`;
}
function mesBem(M){
  const W=700,H=64,l=34,r=8,tp=6,bt=8,n=M.dias.length,cw=(W-l-r)/n, y=v=>tp+(H-tp-bt)*(1-(v-4)/16);
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Bem-estar diário (4 a 20)">`;
  [4,12,20].forEach(v=>{ s+=`<line x1="${l}" x2="${W-r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#eee"/><text x="${l-4}" y="${(y(v)+3).toFixed(1)}" font-size="8" text-anchor="end" fill="#8a7a80">${v}</text>`; });
  let seg=[]; const segs=[]; M.dias.forEach((d,i)=>{ const v=M.bem[d]; if(v==null){ if(seg.length) segs.push(seg); seg=[]; } else seg.push([l+i*cw+cw/2,y(v)]); }); if(seg.length) segs.push(seg);
  segs.forEach(sg=>{ if(sg.length>1) s+=`<polyline points="${sg.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#2f6fa0" stroke-width="1.6"/>`; });
  M.dias.forEach((d,i)=>{ const v=M.bem[d]; if(v==null) return; s+=`<circle cx="${(l+i*cw+cw/2).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.6" fill="${v<=12?"#c62828":"#2f6fa0"}"/>`; });
  return s+`</svg>`;
}
function mesPagina(M,ctx){
  const p=P(M.pid), ST={P:"Presente",AT:"Atraso",FJ:"Falta justificada",FI:"Falta injustificada",L:"Lesionado",D:"Dispensado"};
  const kpi=(l,v,s)=>`<div><b>${esc(l)}</b>${v}${s?`<small>${s}</small>`:""}</div>`;
  const plCarga=ctx.plCarga;
  const resumo=`<div class="mk">${kpi("Presenças",M.pres==null?"–":M.pres+"%",`${M.att.P+M.att.AT} de ${M.marc} treinos`)}${kpi("Jogos",`${M.jogou.length}`,`${M.tit} titular · ${M.gms.length} da equipa`)}
    ${kpi("Minutos",`${M.min}'`,M.poss?`${Math.round(M.min/M.poss*100)}% dos possíveis`:"")}${kpi("Golos · Assist.",`${M.g} · ${M.a}`,M.y||M.r?`${M.y} am. · ${M.r} verm.`:"")}
    ${kpi("Nota média (jogos)",M.nota==null?"–":fmt1(M.nota),M.nNotas?`${M.nNotas} jogo${M.nNotas>1?"s":""}`:"")}
    ${kpi("Carga do mês",M.cT?`${Math.round(M.cT)} UA`:"–",`${M.nS} sessões${plCarga!=null?` · plantel ${Math.round(plCarga)}`:""}`)}
    ${kpi("Bem-estar médio",M.bMed==null?"–":fmt1(M.bMed)+"/20",M.nB?`${M.nB} respostas`:M.fonte==="sheets"?"sem respostas":"sem dados")}${kpi("Dias de lesão",String(M.diasLes),M.injs.length?`${M.injs.length} lesão${M.injs.length>1?"ões":""}`:"")}</div>`;
  const grafs=`<h2>Carga diária (UA = PSE × minutos)</h2>${M.cT?mesBars(M,ctx.plDia):`<p class="note">Sem PSE registadas neste mês.</p>`}
    ${M.fonte==="sheets"?`<h2>Bem-estar diário (4 a 20)</h2>${M.nB?mesBem(M):`<p class="note">Sem respostas de bem-estar neste mês.</p>`}`:""}
    <p class="note">▲ dia de jogo · bem-estar a vermelho = 12 ou menos.${M.fonte==="app"?" Carga só das PSE escritas nos treinos da app.":""}</p>`;
  const semanas=`<table class="msem"><thead><tr><th>Semana</th><th class="c">Treinos</th><th class="c">Jogos</th><th class="c" title="sessões com PSE">Sessões</th><th class="c">Carga UA</th>${M.fonte==="sheets"?`<th class="c">Bem-estar</th>`:""}</tr></thead><tbody>
    ${M.sem.map(w=>`<tr><td style="white-space:nowrap">${fmtD(w.ds[0],{day:"2-digit",month:"2-digit"})}–${fmtD(w.ds[w.ds.length-1],{day:"2-digit",month:"2-digit"})}</td><td class="c">${w.tr}</td><td class="c">${w.jg}</td><td class="c">${w.n||"–"}</td><td class="c"><b>${w.c?Math.round(w.c):"–"}</b></td>${M.fonte==="sheets"?`<td class="c">${w.b==null?"–":fmt1(w.b)}</td>`:""}</tr>`).join("")}</tbody></table>`;
  const jogos=M.jogos.length?`<table><thead><tr><th>Data</th><th>Jogo</th><th class="c">Res.</th><th class="c">Min</th><th class="c">G</th><th class="c">A</th><th class="c">Cart.</th><th class="c">Nota</th></tr></thead><tbody>
    ${M.jogos.map(j=>`<tr><td>${fmtD(j.g.date,{day:"2-digit",month:"2-digit"})}</td><td>${j.g.venue==="F"?"@ ":"vs "}${esc(j.g.opp||"")}</td><td class="c">${j.c.ga!=null?esc(scoreTxt(j.g,j.c)):"—"}</td><td class="c"><b>${j.x.min}'</b>${j.x.st?"":" <span class='note'>(S)</span>"}</td><td class="c">${j.x.g||""}</td><td class="c">${j.x.a||""}</td><td class="c">${j.x.y?"🟨".repeat(j.x.y):""}${j.x.r?"🟥":""}</td><td class="c">${j.nota==null?"":fmt1(j.nota)}</td></tr>`).join("")}</tbody></table>`:`<p class="note">Não foi convocado neste mês${M.gms.length?` (${M.gms.length} jogo${M.gms.length>1?"s":""} da equipa)`:""}.</p>`;
  const pres=M.marc?`<p style="margin:0 0 4px;font-size:11px">${Object.entries(M.att).filter(([,n])=>n).map(([k,n])=>`<b>${n}</b> ${esc(ST[k].toLowerCase())}`).join(" · ")}</p>
    ${M.falt.length?`<p class="note" style="margin:0">${M.falt.map(f=>`${fmtD(f.d,{day:"2-digit",month:"2-digit"})} ${ST[f.s].toLowerCase()}`).join(" · ")}</p>`:""}`:`<p class="note">Sem presenças marcadas neste mês.</p>`;
  const EC=evalCfg();
  const aval=M.evs.length?M.evs.map(e=>{ const a=evalAreas(e); return `<div class="mev"><b>${fmtD(e.date,{day:"numeric",month:"short"})}${e.by?" · "+esc(e.by):""}</b> — ${Object.entries(EC).map(([k,x])=>`${esc(x.l)} <b>${a[k]==null?"–":fmt1(a[k])}</b>`).join(" · ")} · média <b>${evalScore(e)==null?"–":fmt1(evalScore(e))}</b>
      ${e.str?`<div><i>Fortes:</i> ${esc(e.str)}</div>`:""}${e.weak?`<div><i>A melhorar:</i> ${esc(e.weak)}</div>`:""}${e.fin?`<div><i>Final:</i> ${esc(e.fin)}</div>`:""}</div>`; }).join(""):`<p class="note">Sem avaliações neste mês.</p>`;
  const nv=v=>v==null?"–":String(v).replace(".",",");
  const tests=M.tst.length?M.tst.map(o=>{ const r=o.m.res[M.pid]||{}, pv=o.i?(M.ms[o.i-1].res||{})[M.pid]||{}:{};
      const it=TESTS.filter(tt=>parseNum(r[tt.k])!=null).map(tt=>{ const v=parseNum(r[tt.k]), pr=parseNum(pv[tt.k]);
        return `${esc(tt.l)} <b>${nv(v)} ${esc(tt.u)}</b>${pr!=null?` <span class="note">(antes ${nv(pr)})</span>`:""}`; });
      return it.length?`<div class="mev"><b>${esc(o.m.label||fmtD(o.m.date))}</b> — ${it.join(" · ")}</div>`:""; }).join(""):"";
  const clin=M.injs.length?M.injs.map(i=>{ const rb=M.reab.find(x=>x.i.id===i.id); return `<div class="mev"><b>${esc([i.zone,i.side&&i.side!=="—"?i.side.toLowerCase():""].filter(Boolean).join(" ")||i.type||"Lesão")}</b> — ${esc(i.type||"")} · desde ${fmtD(i.date,{day:"2-digit",month:"2-digit"})} · ${esc(INJ_ST[i.status]?.l||"")}${i.status==="alta"&&i.ret?" "+fmtD(i.ret,{day:"2-digit",month:"2-digit"}):""}
      ${rb?`<div>Reabilitação: ${rb.n} sess${rb.n===1?"ão":"ões"} no mês${rb.app?` (${rb.app} registada${rb.app>1?"s":""} pelo atleta)`:""}${rb.dor!=null?` · dor média ${fmt1(rb.dor)}/10`:""}${rb.fase?` · fase ${rb.fase}`:""}</div>`:""}</div>`; }).join(""):`<p class="note">Sem lesões neste mês.</p>`;
  const monH=ctx.atual&&typeof monOf==="function"?monOf(M.pid):null;
  return `<section class="mes">
    <div class="mh"><div><b>${esc(p.name)}</b><span>${[p.n?"N.º "+p.n:"",p.pos,cap1(mesNome(M.mes))].filter(Boolean).map(esc).join(" · ")}</span></div>${monH&&monH.prontidao!=null?`<span class="mt">Hoje: prontidão <b>${monH.prontidao}</b>${monH.condicao!=null?` · condição <b>${monH.condicao}</b>`:""}</span>`:""}</div>
    ${resumo}<div class="mpres">${pres}</div>${grafs}
    ${p2(`<h2>Semanas</h2>${semanas}`,`<h2>Jogos</h2>${jogos}`)}
    ${p2(`<h2>Avaliações</h2>${aval}`,`<h2>Clínico</h2>${clin}${tests?`<h2>Testes físicos</h2>${tests}`:""}`)}
    <h2>Notas da conversa / objetivos para o próximo mês</h2><div class="mlines"><i></i><i></i><i></i></div>
  </section>`;
}
function mesPrint(ids, mes, srv, aviso){
  const pls=ids.map(id=>P(id)).filter(Boolean); if(!pls.length){ toast("Sem atletas."); return; }
  // referência do plantel: carga média do mês por atleta com PSE, e por dia
  const todos=players().map(p=>mesDados(p.id,mes,srv)), com=todos.filter(m=>m.cT>0);
  const plCarga=com.length?avg(com.map(m=>m.cT)):null, diasMes=todos[0]?todos[0].dias.filter(d=>d<=todos[0].ate).length:0;
  const plDia=plCarga&&diasMes?plCarga/diasMes:null, atual=mes===todayISO().slice(0,7);
  const css=`<style>.mes+.mes{page-break-before:always;break-before:page}.mpres{margin:2px 0 0}.mpres p{margin:0!important}
    .mes table th,.mes table td{padding:2px 4px;font-size:10px}.mes table th{font-size:8.5px}
    .mh{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;border-bottom:2px solid #6b1426;padding:2px 0 5px;margin:0 0 8px}
    .mh b{display:block;font:800 19px "Barlow Condensed",Arial Narrow,sans-serif;text-transform:uppercase;color:#6b1426}.mh span{font-size:11px;color:#6b5a5f}.mh .mt{font-size:10.5px}
    .mk{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:0 0 4px}.mk div{background:#f8f3f4;border:1px solid #ede3e5;border-radius:7px;padding:3px 8px;font:800 15px "Barlow Condensed",sans-serif;color:#221418;line-height:1.12}
    .mk b{display:block;font:700 8.5px Barlow,sans-serif;color:#8a6a72;text-transform:uppercase;letter-spacing:.06em}.mk small{display:block;font:500 9.5px Barlow,sans-serif;color:#7a666c}
    .mes svg{display:block;margin:2px 0}.mev{font-size:10.5px;margin:0 0 5px;line-height:1.35}.mev div{color:#4a3a3f}
    .mlines i{display:block;height:15px;border-bottom:1px solid #d8cdd0}.mes h2{margin-top:8px;margin-bottom:4px}</style>`;
  const head=aviso?`<p class="note" style="border:1px solid #f0d9a8;background:#fff8e6;padding:5px 8px;border-radius:6px">${esc(aviso)}</p>`:"";
  const body=css+head+pls.map(p=>mesPagina(todos.find(m=>m.pid===p.id)||mesDados(p.id,mes,srv),{plCarga,plDia,atual})).join("");
  const one=pls.length===1;
  printDoc(one?`relatorio-mensal-${slug(pls[0].name)}-${mes}`:`relatorios-mensais-${mes}`, one?`Relatório mensal — ${pls[0].name}`:`Relatórios mensais — ${cap1(mesNome(mes))}`, body);
}
Object.assign(A,{
  mesRel: el => mesForm(el.dataset.id||""),
  mesGo: el => mesGo(el)
});
