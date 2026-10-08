/* ================= COMPARAR DOIS ATLETAS =================
   Estatísticas → "Comparar atletas" (S.ssub="cmp", atletas em S.cmpA / S.cmpB; também a partir da ficha do atleta).
   Lado a lado: identificação, época (barras espelhadas por métrica, o melhor de cada linha a cheio), avaliação (radar
   sobreposto + áreas), testes físicos (última medição de cada), monitorização e presenças.
   Cores: A = --cmpA (grená), B = --cmpB (ocre), validadas com o skill dataviz nos dois temas; a identidade nunca é só
   a cor (nome e letra A/B em cada coluna). */
function cmpNum(v,d=0){ if(v==null||isNaN(v)) return "–"; return d?fmt1(v):String(Math.round(v)); }
// linha com barras espelhadas: A para a esquerda, B para a direita, escala = maior dos dois
function cmpRow(l,a,b,o={}){
  const va=a==null||isNaN(a)?null:+a, vb=b==null||isNaN(b)?null:+b, mx=Math.max(Math.abs(va||0),Math.abs(vb||0))||1;
  const win = va==null||vb==null||va===vb||o.neutral ? "" : (o.low ? (va<vb?"a":"b") : (va>vb?"a":"b"));
  const fa=o.f?o.f(va):cmpNum(va,o.d), fb=o.f?o.f(vb):cmpNum(vb,o.d);
  return `<div class="cmprow" role="row"><span class="cmpv a ${win==="a"?"win":""}" role="cell">${fa}</span>
    <span class="cmpbar a" aria-hidden="true"><i style="width:${va==null?0:Math.max(2,Math.abs(va)/mx*100)}%"></i></span>
    <span class="cmpl" role="rowheader">${esc(l)}${o.sub?`<small>${esc(o.sub)}</small>`:""}</span>
    <span class="cmpbar b" aria-hidden="true"><i style="width:${vb==null?0:Math.max(2,Math.abs(vb)/mx*100)}%"></i></span>
    <span class="cmpv b ${win==="b"?"win":""}" role="cell">${fb}</span></div>`;
}
function cmpRadar(ea,eb){
  const EC=evalCfg(), keys=Object.keys(EC); if(keys.length<3) return "";
  const cx=180, cy=128, R=92, pt=(i,v)=>{ const a=-Math.PI/2+i*2*Math.PI/keys.length, r=R*(Math.max(0,Math.min(10,v||0))/10); return [cx+r*Math.cos(a),cy+r*Math.sin(a)]; };
  const poly=vals=>keys.map((k,i)=>pt(i,vals[k]).map(n=>n.toFixed(1)).join(",")).join(" ");
  let s=`<svg class="radar cmpradar" viewBox="0 0 360 262" role="img" aria-label="Avaliação por área: ${keys.map(k=>`${EC[k].l} ${ea?cmpNum(ea[k],1):"–"} contra ${eb?cmpNum(eb[k],1):"–"}`).join(", ")}">`;
  [2,4,6,8,10].forEach(l=>{ s+=`<polygon points="${keys.map((k,i)=>pt(i,l).map(n=>n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="var(--line)" stroke-width="1"/>`; });
  keys.forEach((k,i)=>{ const [x,y]=pt(i,10), [lx,ly]=pt(i,11.4), c=Math.cos(-Math.PI/2+i*2*Math.PI/keys.length), anc=c>.3?"start":c<-.3?"end":"middle";
    s+=`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/><text x="${lx.toFixed(1)}" y="${(ly+(Math.abs(c)>.3?4:ly<cy?-2:12)).toFixed(1)}" text-anchor="${anc}" font-size="12" font-weight="700" fill="var(--muted)" font-family="Barlow, sans-serif">${esc(EC[k].l)}</text>`; });
  if(eb) s+=`<polygon points="${poly(eb)}" fill="color-mix(in srgb, var(--cmpB) 18%, transparent)" stroke="var(--cmpB)" stroke-width="2" stroke-dasharray="5 3"/>`;
  if(ea) s+=`<polygon points="${poly(ea)}" fill="color-mix(in srgb, var(--cmpA) 22%, transparent)" stroke="var(--cmpA)" stroke-width="2"/>`;
  [[ea,"var(--cmpA)"],[eb,"var(--cmpB)"]].forEach(([e,c])=>{ if(e) keys.forEach((k,i)=>{ if(e[k]==null) return; const [x,y]=pt(i,e[k]); s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${c}" stroke="var(--surface)" stroke-width="2"/>`; }); });
  return s+`</svg>`;
}
function cmpData(pid){
  const p=P(pid); if(!p) return null;
  const s=stats().pl[pid], evs=evalsOf(pid), ev=evs[evs.length-1]||null, ms=testMoments(), mon=typeof monOf==="function"?monOf(pid):null;
  const tests={}; TESTS.forEach(t=>{ for(let i=ms.length-1;i>=0;i--){ const v=parseNum(((ms[i].res||{})[pid]||{})[t.k]); if(v!=null){ tests[t.k]={v,m:ms[i].label||fmtD(ms[i].date)}; break; } } });
  const injs=injuries().filter(i=>i.pid===pid), dias=injs.reduce((n,i)=>{ if(!validISO(i.date)) return n; const end=i.status==="alta"&&validISO(i.ret)?i.ret:todayISO(); return n+Math.max(0,dayDiff(i.date,end)); },0);
  return {p,s,ev,ea:ev?evalAreas(ev):null,tests,mon,injs,dias,c7:carga7Of(pid,s)};
}
function vCmp(){
  const pls=players(); if(pls.length<2) return `<div class="empty"><b>São precisos pelo menos dois atletas</b></div>`;
  if(!S.cmpA||!P(S.cmpA)) S.cmpA=pls[0].id;
  if(!S.cmpB||!P(S.cmpB)||S.cmpB===S.cmpA) S.cmpB=(pls.find(p=>p.id!==S.cmpA&&GROUP(p.pos)===GROUP(P(S.cmpA).pos))||pls.find(p=>p.id!==S.cmpA)).id;
  const A=cmpData(S.cmpA), B=cmpData(S.cmpB), a=A.s, b=B.s;
  const opt=cur=>pls.map(p=>`<option value="${esc(p.id)}" ${p.id===cur?"selected":""}>${esc((p.n?p.n+" — ":"")+p.name)}${p.pos?" ("+esc(p.pos)+")":""}</option>`).join("");
  const head=(X,k)=>{ const p=X.p, age=ageOf(p.birth), av=avail(p.id); return `<div class="cmphead ${k}"><span class="cmpk">${k.toUpperCase()}</span>${avatar(p)}<div><b>${esc(p.name)}</b><small>${[p.pos,p.n?"N.º "+p.n:"",age!=null?age+" anos":"",p.foot?"pé "+p.foot.toLowerCase():""].filter(Boolean).map(esc).join(" · ")}</small><span class="tag ${AV[av].c}">${AV[av].l}</span></div><button class="btn sm ghost" data-a="page" data-p="atleta" data-id="${esc(p.id)}">Ficha</button></div>`; };
  const per90=(x,s)=>s.min?x/s.min*90:null, mpj=s=>s.j?s.min/s.j:null;
  const sec=(t,rows,note)=>`<section class="card cmpsec"><div class="card-h"><h3>${t}</h3></div><div class="card-b" role="table" aria-label="${esc(t)}">${rows}${note?`<p class="note">${note}</p>`:""}</div></section>`;
  const defs=statDefs();
  const epoca=[cmpRow("Jogos",a.j,b.j,{sub:"convocado "+a.conv+" · "+b.conv}),cmpRow("Titular",a.tit,b.tit),cmpRow("Minutos",a.min,b.min),cmpRow("Minutos por jogo",mpj(a),mpj(b)),
    cmpRow("Golos",a.g,b.g),cmpRow("Assistências",a.a,b.a),cmpRow("Golos + assist. por 90'",per90(a.g+a.a,a),per90(b.g+b.a,b),{d:1}),
    cmpRow("Nota média",a.avg,b.avg,{d:1,sub:`${a.rs.length} · ${b.rs.length} jogos`}),cmpRow("Amarelos",a.y,b.y,{low:true}),cmpRow("Vermelhos",a.r,b.r,{low:true}),
    ...defs.filter(d=>(a.cs[d.id]||0)||(b.cs[d.id]||0)).map(d=>cmpRow(d.title,a.cs[d.id]||0,b.cs[d.id]||0,{low:!!d.neg,sub:"por jogo "+(a.j?fmt1((a.cs[d.id]||0)/a.j):"–")+" · "+(b.j?fmt1((b.cs[d.id]||0)/b.j):"–")}))].join("");
  const treinos=[cmpRow("Assiduidade",a.att,b.att,{f:v=>v==null?"–":v+"%",sub:`${a.trTotal} · ${b.trTotal} treinos`}),cmpRow("Faltas injustificadas",a.tr.FI,b.tr.FI,{low:true}),
    cmpRow("Carga 7 dias",A.c7.v,B.c7.v,{neutral:true,sub:"UA (sem melhor/pior)"}),cmpRow("Dias de lesão na época",A.dias,B.dias,{low:true,sub:`${A.injs.length} · ${B.injs.length} lesões`})].join("");
  const EC=evalCfg();
  const aval=`<div class="cmpradarw">${cmpRadar(A.ea,B.ea)}<div class="cmpleg"><span><i class="la"></i>${esc(A.p.name)}${A.ev?` · ${fmtD(A.ev.date)}`:" · sem avaliação"}</span><span><i class="lb"></i>${esc(B.p.name)}${B.ev?` · ${fmtD(B.ev.date)}`:" · sem avaliação"}</span></div></div>
    ${Object.entries(EC).map(([k,ar])=>cmpRow(ar.l,A.ea&&A.ea[k],B.ea&&B.ea[k],{d:1})).join("")}${cmpRow("Média",A.ev?evalScore(A.ev):null,B.ev?evalScore(B.ev):null,{d:1})}`;
  const tests=TESTS.map(t=>cmpRow(t.l,A.tests[t.k]&&A.tests[t.k].v,B.tests[t.k]&&B.tests[t.k].v,{low:t.low,f:v=>v==null?"–":String(v).replace(".",","),sub:`${t.u}${t.low?" · menos é melhor":""}`})).join("");
  const hasT=TESTS.some(t=>A.tests[t.k]||B.tests[t.k]);
  const mon=A.mon||B.mon?[cmpRow("Prontidão",A.mon&&A.mon.prontidao,B.mon&&B.mon.prontidao),cmpRow("Condição",A.mon&&A.mon.condicao,B.mon&&B.mon.condicao),
    cmpRow("Bem-estar (3 dias)",A.mon&&A.mon.bem3,B.mon&&B.mon.bem3,{f:v=>v==null?"–":fmt1(v),sub:"1 a 5"}),cmpRow("ACWR",A.mon&&A.mon.acwr,B.mon&&B.mon.acwr,{neutral:true,f:v=>v==null?"–":String(Math.round(v*100)/100).replace(".",","),sub:"zona boa 0,8–1,3"})].join(""):"";
  return `<div class="cmppick"><label class="fld cmpA"><span>Atleta A</span><select data-c="cmpSel" data-k="A" aria-label="Atleta A">${opt(S.cmpA)}</select></label>
      <button class="btn" data-a="cmpSwap" title="Trocar A e B" aria-label="Trocar A e B">⇄</button>
      <label class="fld cmpB"><span>Atleta B</span><select data-c="cmpSel" data-k="B" aria-label="Atleta B">${opt(S.cmpB)}</select></label></div>
    <div class="cmpheads">${head(A,"a")}${head(B,"b")}</div>
    <p class="small muted cmphint">Em cada linha, o valor melhor fica a cheio. Barras: A para a esquerda, B para a direita.</p>
    <div class="grid2">${sec("Época",epoca)}${sec("Treinos, carga e lesões",treinos)}
      ${sec("Avaliação",aval,!A.ev&&!B.ev?"Nenhum dos dois tem avaliação.":"Última avaliação de cada um (0 a 10).")}
      ${sec("Testes físicos",hasT?tests:`<div class="small muted">Sem testes registados.</div>`,hasT?"Última medição de cada atleta.":"")}
      ${mon?sec("Monitorização (hoje)",mon,"Do resumo do Sheets."):""}</div>`;
}
Object.assign(A,{
  cmpSwap: () => { [S.cmpA,S.cmpB]=[S.cmpB,S.cmpA]; render(); },
  cmpWith: el => { S.cmpA=el.dataset.id; S.cmpB=""; S.ssub="cmp"; go("stats"); }
});
Object.assign(Cg,{ cmpSel: el => { const k=el.dataset.k, v=el.value; if(k==="A"){ if(v===S.cmpB) S.cmpB=S.cmpA; S.cmpA=v; } else { if(v===S.cmpA) S.cmpA=S.cmpB; S.cmpB=v; } render(); } });
