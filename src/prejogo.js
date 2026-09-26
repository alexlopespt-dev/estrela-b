/* ================= relatório pré-jogo (Monitorização → no dia anterior e no dia do jogo) ================= */
// Lê o resumo da monitorização (MON.data) e gera um PDF de 5 secções: resumo + tendência da equipa, variação do dia,
// prontidão vs condição (3 grupos), carga acumulada e casos a decidir. Textos gerados a partir dos números.
// A prontidão de ontem vem de um registo diário guardado neste dispositivo (monSnap); sem ele usa a variação do bem-estar.
const MONH_LS = LS+":monhist";
function monSnap(d){
  if(!d||!d.hoje||!Array.isArray(d.jogadores)) return;
  try{ const h=JSON.parse(localStorage.getItem(MONH_LS)||"{}"); h[d.hoje]={}; d.jogadores.forEach(j=>{ if(j.prontidao!=null) h[d.hoje][j.nome]=j.prontidao; });
    Object.keys(h).sort().slice(0,-21).forEach(k=>delete h[k]); localStorage.setItem(MONH_LS,JSON.stringify(h)); }catch(e){}
}
function monPrev(d){ try{ const h=JSON.parse(localStorage.getItem(MONH_LS)||"{}"); const k=Object.keys(h).filter(x=>x<d.hoje).sort().pop(); return k&&dayDiff(k,d.hoje)<=3?{date:k,v:h[k]}:null; }catch(e){ return null; } }
// Dia do microciclo contado a partir de HOJE: primeiro pelo calendário da app (próximo jogo até 7 dias),
// senão pelo resumo do Sheets acertado pelos dias que passaram desde que foi gerado (um resumo de ontem não diz "MD-2" hoje).
function monMd(d){
  const t=todayISO(), g=games().find(x=>x.date>=t);
  const lab=f=>f===0?"MD":"MD-"+f, fol=d&&d.hoje===t&&d.md?!!d.md.folga:false;
  if(g){ const f=dayDiff(t,g.date); if(f<=7) return {etiqueta:lab(f),falta:f,folga:fol,jogo:g.date}; }
  if(d&&d.md&&d.md.falta!=null&&d.hoje){ const f=d.md.falta-dayDiff(d.hoje,t); if(f>=0) return {...d.md,etiqueta:lab(f),falta:f,folga:fol,jogo:addDays(t,f)}; }
  return d&&d.hoje===t&&d.md?d.md:{etiqueta:"",falta:null,folga:false};
}
const preJogoOk = d => { if(!d) return false; const f=monMd(d).falta; return f===0||f===1; };
const pj1 = x => x==null||!isFinite(x)?"—":(Math.round(x*10)/10).toLocaleString("pt-PT");
const pj2 = x => x==null||!isFinite(x)?"—":(Math.round(x*100)/100).toLocaleString("pt-PT",{minimumFractionDigits:2,maximumFractionDigits:2});
const pj0 = x => x==null||!isFinite(x)?"—":Math.round(x).toLocaleString("pt-PT");
const listPt = a => a.length<2?a.join(""):a.slice(0,-1).join(", ")+" e "+a[a.length-1];
const pjDot = t => t.replace(/\.(<\/b>)?\./g,".$1");
const PJ = {grena:"#8f2239", gold:"#c9951a", pos:"#1f7a3d", neg:"#c62828", warn:"#d98b00", mute:"#b9aeb1", ink:"#221418", ink2:"#6b5a5f", grid:"#ece4e6"};

/* ---- gráficos (SVG estático, uma medida por gráfico) ---- */
const pjNice = m => { const r=m/4, p=Math.pow(10,Math.floor(Math.log10(Math.max(r,1e-9)))), st=[1,2,2.5,5,10].map(k=>k*p).find(k=>k>=r); return {step:st, max:Math.max(st,Math.ceil(m/st-1e-9)*st)}; };
function pjBars(rows,o){   // barras horizontais: rows [{l, v, c, t}] ; o: {max, lines:[{v,l,c}], w}
  const W=o.w||380, LW=76, RW=34, rh=11, gap=3, H=rows.length*(rh+gap)+28, nm=pjNice(Math.max(1,...rows.map(r=>r.v||0),...(o.lines||[]).map(L=>L.v))), max=o.max||nm.max, X=v=>LW+(W-LW-RW)*Math.max(0,v)/max;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" font-family="Barlow,Arial,sans-serif" font-size="9.5">`;
  const tk=o.max?4:Math.round(max/nm.step); for(let k=0;k<=tk;k++){ const v=o.max?max*k/4:nm.step*k, x=X(v); s+=`<line x1="${x}" y1="0" x2="${x}" y2="${H-22}" stroke="${PJ.grid}"/><text x="${x}" y="${H-8}" text-anchor="middle" fill="${PJ.ink2}">${pj0(v)}</text>`; }
  (o.lines||[]).forEach(L=>{ const x=X(L.v); s+=`<line x1="${x}" y1="0" x2="${x}" y2="${H-22}" stroke="${L.c}" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${x+3}" y="${H-24}" fill="${L.c}" font-weight="700" font-size="8.5">${esc(L.l)}</text>`; });
  rows.forEach((r,i)=>{ const y=i*(rh+gap)+2, w=Math.max(2,X(r.v||0)-LW);
    s+=`<text x="${LW-5}" y="${y+rh-2}" text-anchor="end" fill="${PJ.ink}" font-weight="600">${esc(r.l)}</text><rect x="${LW}" y="${y}" width="${w}" height="${rh}" rx="2" fill="${r.c}"/>
      <text x="${LW+w+3}" y="${y+rh-2}" fill="${PJ.ink2}" font-weight="700">${esc(r.t??pj0(r.v))}</text>`; });
  return s+"</svg>";
}
function pjDiverging(rows,o){   // variação: positivo verde à direita, negativo vermelho à esquerda, zero ao centro
  const W=380, LW=76, rh=11, gap=3, H=rows.length*(rh+gap)+28, m=Math.max(0.01,...rows.map(r=>Math.abs(r.v))), C=LW+(W-LW-12)/2, half=(W-LW-60)/2, X=v=>C+half*v/m;
  let s=`<svg viewBox="0 0 ${W} ${H+8}" width="100%" font-family="Barlow,Arial,sans-serif" font-size="9.5">`;
  [-m,-m/2,0,m/2,m].forEach(v=>{ const x=X(v); s+=`<line x1="${x}" y1="0" x2="${x}" y2="${H-22}" stroke="${v===0?"#9a8a8f":PJ.grid}"/><text x="${x}" y="${H-8}" text-anchor="middle" fill="${PJ.ink2}">${v>0?"+":""}${o.fmt(v)}</text>`; });
  rows.forEach((r,i)=>{ const y=i*(rh+gap)+2, x0=Math.min(C,X(r.v)), w=Math.max(1.5,Math.abs(X(r.v)-C)), c=r.v>0?PJ.pos:r.v<0?PJ.neg:PJ.mute;
    s+=`<text x="${LW-5}" y="${y+rh-2}" text-anchor="end" fill="${PJ.ink}" font-weight="600">${esc(r.l)}</text><rect x="${x0}" y="${y}" width="${w}" height="${rh}" rx="2" fill="${c}"/>
      <text x="${r.v<0?x0-3:x0+w+3}" y="${y+rh-2}" text-anchor="${r.v<0?"end":"start"}" fill="${PJ.ink2}" font-weight="700">${r.v>0?"+":""}${o.fmt(r.v)}</text>`; });
  return s+`<text x="${C}" y="${H+5}" text-anchor="middle" fill="${PJ.ink2}" font-size="8.5">${esc(o.axis)}</text></svg>`;
}
function pjPaired(rows){   // prontidão (grená) e condição (dourado) lado a lado, 0–100
  const W=380, LW=76, rh=5, gap=4, H=rows.length*(rh*2+gap)+28, X=v=>LW+(W-LW-22)*Math.max(0,Math.min(100,v||0))/100;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" font-family="Barlow,Arial,sans-serif" font-size="9.5">`;
  [0,25,50,65,100].forEach(v=>{ const x=X(v); s+=`<line x1="${x}" y1="0" x2="${x}" y2="${H-22}" stroke="${v===65?"#9a8a8f":PJ.grid}" ${v===65?'stroke-dasharray="4 3"':""}/><text x="${x}" y="${H-8}" text-anchor="middle" fill="${PJ.ink2}">${v}</text>`; });
  rows.forEach((r,i)=>{ const y=i*(rh*2+gap)+2;
    s+=`<text x="${LW-5}" y="${y+rh*2-1}" text-anchor="end" fill="${PJ.ink}" font-weight="600">${esc(r.l)}</text>`;
    [[r.p,PJ.grena,0],[r.c,PJ.gold,rh+1]].forEach(([v,c,dy])=>{ if(v==null) return; const w=Math.max(2,X(v)-LW); s+=`<rect x="${LW}" y="${y+dy}" width="${w}" height="${rh}" rx="2" fill="${c}"/><text x="${LW+w+3}" y="${y+dy+rh}" fill="${PJ.ink2}" font-size="7" font-weight="700">${pj0(v)}</text>`; }); });
  return s+"</svg>";
}
function pjTeam(d){   // dois gráficos lado a lado, alinhados pelo dia: carga diária da equipa (barras) e bem-estar médio (linha) — nunca dois eixos
  const dias=d.dias||[], n=dias.length, js=d.jogadores;
  const load=dias.map((_,i)=>js.reduce((s,j)=>s+((j.serieCarga||[])[i]||0),0));
  const bem=dias.map((_,i)=>{ const v=js.map(j=>(j.serieBem||[])[i]).filter(x=>x!=null); return v.length?avg(v):null; });
  const W=380, L=38, R=8, H=112, B=H-18, T=10, cw=(W-L-R)/Math.max(1,n), bw=Math.max(5,cw*0.62), X=i=>L+cw*i+cw/2;
  const svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" font-family="Barlow,Arial,sans-serif" font-size="8.5">`;
  const days=()=>dias.map((k,i)=>i%2===n%2?"":`<text x="${X(i)}" y="${H-5}" text-anchor="middle" fill="${PJ.ink2}">${k.slice(8,10)}/${k.slice(5,7)}</text>`).join("");
  const nl=pjNice(Math.max(1,...load)), maxL=nl.max, YL=v=>B-(B-T)*v/maxL;
  let a=svg;
  for(let v=0;v<=maxL+1e-9;v+=nl.step) a+=`<line x1="${L}" y1="${YL(v)}" x2="${W-R}" y2="${YL(v)}" stroke="${PJ.grid}"/><text x="${L-4}" y="${YL(v)+3}" text-anchor="end" fill="${PJ.ink2}">${pj0(v)}</text>`;
  load.forEach((v,i)=>{ const h=B-YL(v); a+=`<rect x="${X(i)-bw/2}" y="${B-h}" width="${bw}" height="${Math.max(0,h)}" rx="2" fill="${PJ.grena}"/>`; });
  a+=days()+"</svg>";
  const vals=bem.filter(x=>x!=null), lo=vals.length?Math.floor((Math.min(...vals)-.15)*4)/4:1, hi=vals.length?Math.ceil((Math.max(...vals)+.15)*4)/4:5, Y=v=>B-(B-T)*(v-lo)/Math.max(.25,hi-lo);
  let c=svg;
  [lo,(lo+hi)/2,hi].forEach(v=>{ c+=`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="${PJ.grid}"/><text x="${L-4}" y="${Y(v)+3}" text-anchor="end" fill="${PJ.ink2}">${pj2(v)}</text>`; });
  let path=""; bem.forEach((v,i)=>{ if(v==null) return; path+=(path?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1); });
  c+=`<path d="${path}" fill="none" stroke="${PJ.grena}" stroke-width="2"/>`;
  bem.forEach((v,i)=>{ if(v==null) return; const last=i===n-1; c+=`<circle cx="${X(i)}" cy="${Y(v)}" r="${last?4:2.5}" fill="${last?PJ.gold:"#fff"}" stroke="${PJ.grena}" stroke-width="1.4"/>${last?`<text x="${X(i)-6}" y="${Y(v)-6}" text-anchor="end" font-weight="800" font-size="10" fill="${PJ.ink}">${pj2(v)}</text>`:""}`; });
  c+=days()+"</svg>";
  return {load:a, bemSvg:c, loadV:load, bem};
}

/* ---- relatório ---- */
function preJogoPrint(){
  const d=MON.data; if(!d) return toast("Sem dados da monitorização.");
  const md=monMd(d), js=d.jogadores, {map}=monMatch(), velho=d.hoje!==todayISO();
  const nm=j=>{ const p=map[j.nome]?P(map[j.nome]):null; return p?p.name:j.nome; };
  const disp=js.filter(j=>j.estado==="Disponível"), fora=js.filter(j=>j.estado!=="Disponível");
  const com=disp.filter(j=>j.prontidao!=null), med=com.length?avg(com.map(j=>j.prontidao)):null, ac65=com.filter(j=>j.prontidao>=65).length;
  const risco=js.filter(j=>j.estadoBem==="RISCO"), semResp=disp.filter(j=>j.estadoBem==="sem resposta"||j.prontidao==null);
  const gameDate=md.jogo||addDays(todayISO(),md.falta||0), g=games().find(x=>x.date===gameDate);
  const team=pjTeam(d), bem=team.bem, nb=bem.length, bHoje=bem[nb-1], iPrev=(()=>{ for(let i=nb-2;i>=0;i--) if(bem[i]!=null) return i; return -1; })(), bOntem=iPrev>=0?bem[iPrev]:null;
  let streak=0; for(let i=iPrev;i>0;i--){ if(bem[i]!=null&&bem[i-1]!=null&&bem[i]<bem[i-1]) streak++; else break; }
  const maxDesde=(()=>{ for(let i=nb-2;i>=0;i--) if(bem[i]!=null&&bem[i]>=bHoje) return d.dias[i]; return null; })();
  const folgaHoje=(d.folga||[])[nb-1];
  const prev=monPrev(d), dP=j=>prev&&prev.v[j.nome]!=null&&j.prontidao!=null?j.prontidao-prev.v[j.nome]:null;
  const medOntem=prev?(()=>{ const v=com.map(j=>prev.v[j.nome]).filter(x=>x!=null); return v.length?avg(v):null; })():null;
  const mono=avg(disp.map(j=>j.monotonia).filter(x=>x!=null));
  const dia=iso=>cap1(fmtD(iso,{weekday:"long",day:"numeric",month:"long"}));
  const quando=md.falta===0?`Jogo hoje, ${dia(gameDate).toLowerCase()}`:`Jogo amanhã, ${dia(gameDate).toLowerCase()}`;
  const sub=[quando, g&&g.opp?`${g.venue==="F"?"@":"vs"} ${g.opp}`:"", md.etiqueta||"", `dados ${velho?"de":"de hoje,"} ${fmtD(d.hoje,{weekday:"long",day:"2-digit",month:"2-digit"})}${velho?" (não são de hoje)":""}${folgaHoje&&!velho?" (dia de folga)":""}`].filter(Boolean).join("  ·  ");
  // --- texto do resumo
  const par=[];
  if(bHoje!=null && bOntem!=null){ const up=bHoje>bOntem+0.02, dn=bHoje<bOntem-0.02;
    par.push(up?`O bem-estar médio da equipa subiu de ${pj2(bOntem)} para <b>${pj2(bHoje)}</b>${streak>=2?`, depois de ${streak} dias seguidos a descer`:""}${maxDesde?` — o valor mais alto desde ${fmtD(maxDesde,{day:"numeric",month:"numeric"})}`:(nb>3?" — o valor mais alto dos últimos "+nb+" dias":"")}.`
      :dn?`O bem-estar médio da equipa desceu de ${pj2(bOntem)} para <b>${pj2(bHoje)}</b>${streak>=1?` (${streak+1}.º dia seguido a descer)`:""}.`
      :`O bem-estar médio da equipa mantém-se estável em <b>${pj2(bHoje)}</b>.`); }
  par.push(risco.length?`Há <b>${risco.length} ${risco.length>1?"jogadores":"jogador"} em risco</b>: ${listPt(risco.map(nm))}.`:`<b>Não há nenhum jogador em risco</b> neste momento.`);
  par.push(`A prontidão média é <b>${pj0(med)}</b>${medOntem!=null?` (ontem ${pj0(medOntem)})`:""}, com ${ac65} de ${com.length} jogadores acima de 65 e ${com.filter(j=>j.prontidao<50).length} abaixo de 50.`);
  if(mono!=null) par.push(`A monotonia semanal média está em ${pj2(mono)}${mono>=2?" — <b>acima do limiar de alerta (2,0)</b>: a carga tem sido pouco variada.":", abaixo do limiar de alerta (2,0)."}`);
  // --- indisponíveis (monitorização + clínico da app)
  const indisp=fora.map(j=>{ const p=map[j.nome]?P(map[j.nome]):null, inj=p?activeInjury(p.id):null;
    return {n:nm(j), s:j.estado, desde:inj&&inj.date?fmtD(inj.date,{day:"2-digit",month:"2-digit"}):"—", nota:j.estadoNota||(inj?[inj.diag||inj.zone||inj.type, validISO(inj.exp)?"regresso previsto a "+fmtD(inj.exp,{day:"2-digit",month:"2-digit"}):""].filter(Boolean).join(" — "):"")}; });
  players().filter(p=>avail(p.id)==="out" && !fora.some(j=>map[j.nome]===p.id) && !disp.some(j=>map[j.nome]===p.id)).forEach(p=>{ const inj=activeInjury(p.id)||{}; indisp.push({n:p.name,s:"Lesionado",desde:inj.date?fmtD(inj.date,{day:"2-digit",month:"2-digit"}):"—",nota:inj.diag||inj.zone||""}); });
  // --- variação do dia
  const useP=!!prev && disp.some(j=>dP(j)!=null);
  const lastTwo=j=>{ const s=(j.serieBem||[]); const a=s[s.length-1]; let b=null; for(let i=s.length-2;i>=0;i--) if(s[i]!=null){ b=s[i]; break; } return a!=null&&b!=null?a-b:null; };
  const vrows=disp.map(j=>({l:nm(j), v:useP?dP(j):lastTwo(j)})).filter(r=>r.v!=null).sort((a,b)=>b.v-a.v);
  const melh=vrows.filter(r=>r.v>0), pior=vrows.filter(r=>r.v<0);
  const fmtV=useP?(v=>pj0(v)):(v=>pj2(v));
  // --- grupos
  const G={nuc:[],div:[],fre:[],bai:[]};
  com.forEach(j=>{ const c=j.condicao; if(c==null) return; const k=j.prontidao>=65?(c>=65?"nuc":"fre"):(c>=65?"div":"bai"); G[k].push(j); });
  const byP=a=>a.slice().sort((x,y)=>y.prontidao-x.prontidao);
  const gName=j=>nm(j)+(j.posicao==="GR"?" (GR)":"");
  const topCarga=disp.filter(j=>j.cargaTopo||j.estadoCarga==="PICO DE CARGA").map(nm);
  // --- carga 7 dias
  const lim=d.limiarCarga||1500, top=Math.max(d.p80Carga||2100, lim+1);
  const crows=disp.filter(j=>j.carga7!=null).sort((a,b)=>b.carga7-a.carga7).map(j=>({l:nm(j), v:j.carga7, c:j.carga7>=top?PJ.neg:j.carga7>=lim?PJ.warn:PJ.mute}));
  const acima=crows.filter(r=>r.v>=top), meio=crows.filter(r=>r.v>=lim&&r.v<top);
  // --- casos a decidir
  const tag=j=>(j.prontidao!=null&&j.prontidao<50)||j.estadoBem==="RISCO"?["DECIDIR",PJ.neg]:(j.cargaTopo||j.estadoCarga==="PICO DE CARGA")?["GERIR MINUTOS",PJ.warn]:["VIGIAR","#b8860b"];
  const casos=disp.filter(j=>j.posicao!=="GR" && (j.prio>0||(j.prontidao!=null&&j.prontidao<55)||j.estadoCarga==="PICO DE CARGA")).sort((a,b)=>(b.prio||0)-(a.prio||0)||(a.prontidao??999)-(b.prontidao??999)).slice(0,6);
  const caso=j=>{ const [t,c]=tag(j), dv=useP?dP(j):null;
    return `<div class="pj-case"><div class="pj-case-h"><b>${esc(nm(j))}</b><span style="background:${c}">${t}</span></div>
      <p>${esc(j.leitura||"")}</p><p class="n">Prontidão <b>${pj0(j.prontidao)}</b>${dv!=null?` (${dv>0?"+":""}${pj0(dv)})`:""} · condição ${pj0(j.condicao)} · bem-estar ${pj2(j.bem3)} (habitual ${pj2(j.base)}) · ${pj0(j.carga7)} UA${j.acwr!=null?` · ACWR ${pj2(j.acwr)}`:""}${j.critico?` · mais baixo: ${esc(j.critico)}`:""}</p></div>`; };
  const grs=byP(disp.filter(j=>j.posicao==="GR"&&j.prontidao!=null));
  // --- leitura final
  const fin=[];
  fin.push(risco.length?`${risco.length} ${risco.length>1?"jogadores":"jogador"} em risco — confirmar antes de convocar: ${listPt(risco.map(nm))}.`:`Ninguém em risco. Prontidão média ${pj0(med)}, ${ac65}/${com.length} acima de 65.`);
  if(G.nuc.length) fin.push(`Onze natural a sair do núcleo utilizável (${G.nuc.length}). Em melhor estado: ${listPt(byP(G.nuc).slice(0,4).map(gName))}.`);
  if(topCarga.length) fin.push(`Gestão de minutos para ${listPt(topCarga)} — carga no topo do plantel.`);
  if(G.fre.length) fin.push(`Minutos de impacto (frescos, sem base para 90'): ${listPt(byP(G.fre).slice(0,5).map(gName))}.`);
  if(grs.length) fin.push(`Baliza: ${gName(grs[0])} é a opção em melhor estado (prontidão ${pj0(grs[0].prontidao)}).`);
  if(semResp.length) fin.push(`Sem dados suficientes: ${listPt(semResp.map(nm))} — perguntar como estão.`);
  const kp=(v,l)=>`<div class="pj-k"><b>${v}</b><span>${l}</span></div>`;
  const css=`<style>.pj-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:2px 0 8px}.pj-k{background:#f8f3f4;border:1px solid #ede3e5;border-radius:8px;padding:6px 4px;text-align:center}
    .pj-k b{display:block;font-family:"Barlow Condensed",Arial Narrow,sans-serif;font-size:22px;font-weight:800;color:#3c0a14;line-height:1}.pj-k span{font-size:8.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8a6a72}
    .pj-2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;align-items:start}.pj-2>div{min-width:0}.pj-2 h2{margin-top:10px}
    .pj-fig{border:1px solid #eadfe2;border-radius:8px;padding:6px 8px 3px;margin:5px 0;break-inside:avoid;page-break-inside:avoid}.pj-fig h4{margin:0 0 2px;font-size:10.5px;color:#3c0a14}.pj-cap{font-size:9.5px;color:#7a666c;margin:1px 0 3px}
    .pj-t{font-size:11px;margin:3px 0}.pj-t p{margin:3px 0}
    .pj-blk{break-inside:avoid;page-break-inside:avoid}
    .pj-grp{border:1px solid #eadfe2;border-radius:8px;padding:5px 9px;margin:0 0 5px;font-size:10.5px;break-inside:avoid}.pj-grp h3{margin:0 0 1px;font-size:11.5px}.pj-grp .who{font-weight:700;margin-top:2px}
    .pj-grp.z{color:#7a666c}.pj-grp.z h3{margin:0;color:#7a666c}.pj-grp.z .d,.pj-grp.z .who{display:none}
    .pj-old{background:#fdecea;border:1px solid #f3b8b3;border-radius:8px;padding:6px 10px;color:#8a1c14;margin:0 0 6px}
    .pj-cases{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}
    .pj-case{border:1px solid #eadfe2;border-radius:8px;padding:6px 9px;break-inside:avoid;page-break-inside:avoid;font-size:10.5px}.pj-case-h{display:flex;justify-content:space-between;align-items:center;gap:6px}.pj-case-h b{font-size:12px}
    .pj-case-h span{color:#fff;font-size:8.5px;font-weight:800;letter-spacing:.05em;padding:2px 6px;border-radius:4px;white-space:nowrap}.pj-case p{margin:3px 0 0}.pj-case .n{color:#6b5a5f}
    .pj-leg{display:flex;gap:10px;flex-wrap:wrap;font-size:9.5px;color:#6b5a5f;margin:0 0 2px}.pj-leg i{display:inline-block;width:10px;height:7px;border-radius:2px;margin-right:4px}
    table.pj-tb{font-size:10.5px}table.pj-tb th,table.pj-tb td{padding:3px 6px}
    ul.pj-fin{margin:2px 0}ul.pj-fin li{margin:2px 0}</style>`;
  const grp=(k,c,t,d)=>`<div class="pj-grp${G[k].length?"":" z"}" style="border-left:4px solid ${c}"><h3>${t} — ${G[k].length}</h3><span class="d">${d}</span><div class="who">${byP(G[k]).map(gName).join(" · ")}</div></div>`;
  const nucTop=topCarga.filter(n=>G.nuc.some(j=>nm(j)===n));
  const body=`${css}
    <p class="note" style="margin:-4px 0 6px">${esc(sub)}</p>
    <div class="pj-kpis">${kp(disp.length,"Disponíveis")}${kp(pj0(med),"Prontidão média")}${kp(`${ac65}/${com.length}`,"Acima de 65")}${kp(risco.length,"Em risco")}${kp(pj2(bHoje),"Bem-estar equipa")}${kp(indisp.length,"Indisponíveis")}</div>
    ${velho?`<p class="pj-old"><b>Atenção:</b> a monitorização não foi atualizada hoje — estes números são de ${fmtD(d.hoje,{weekday:"long",day:"2-digit",month:"2-digit"})}. Atualiza em Monitorização antes de usar o relatório.</p>`:""}
    <div class="pj-2">
      <div><h2>Leitura do dia</h2><div class="pj-t">${par.map(p=>`<p>${p}</p>`).join("")}</div></div>
      <div><h2>Indisponíveis (${indisp.length})</h2>
        ${indisp.length?`<table class="pj-tb"><thead><tr><th>Jogador</th><th>Situação</th><th class="c">Desde</th></tr></thead><tbody>${indisp.map(r=>`<tr><td><b>${esc(r.n)}</b>${r.nota?`<br><span class="note">${esc(r.nota)}</span>`:""}</td><td>${esc(r.s)}</td><td class="c">${esc(r.desde)}</td></tr>`).join("")}</tbody></table>`:"<p>Plantel todo disponível.</p>"}</div>
    </div>
    <div class="pj-2">
      <div class="pj-fig"><h4>Carga diária da equipa (UA)</h4>${team.load}<div class="pj-cap">Dias sem barra: folga ou sem registos.</div></div>
      <div class="pj-fig"><h4>Bem-estar médio da equipa (1–5)</h4>${team.bemSvg}<div class="pj-cap">O ponto dourado é o dia de hoje.</div></div>
    </div>
    <div class="pj-2 pj-blk">
      <div><h2>${useP?"Quem recuperou desde ontem":"Variação do bem-estar"}</h2>
        <p class="pj-t">${melh.length} de ${vrows.length} melhoraram${pior.length?`, ${pior.length} pioraram`:""}${useP?` (prontidão, desde ${fmtD(prev.date,{day:"2-digit",month:"2-digit"})})`:" (bem-estar 1–5)"}.${melh.length?` Maior subida: <b>${esc(melh[0].l)}</b> (+${fmtV(melh[0].v)}).`:""}${pior.length?` Maiores descidas: ${listPt(pior.slice(-3).reverse().map(r=>`<b>${esc(r.l)}</b> (${fmtV(r.v)})`))}.`:""}</p>
        <div class="pj-fig">${pjDiverging(vrows,{fmt:fmtV,axis:useP?"Variação da prontidão (pontos)":"Variação do bem-estar (1–5)"})}</div></div>
      <div><h2>Carga acumulada (7 dias)</h2>
        <p class="pj-t">Vermelho: a partir de ${pj0(top)} UA (patamar alto do plantel); amarelo: ${pj0(lim)}–${pj0(top)}. ${acima.length?`<b>${acima.length} no patamar alto</b>: ${listPt(acima.map(r=>esc(r.l)))}.`:"Ninguém no patamar alto."}</p>
        <div class="pj-fig">${pjBars(crows,{lines:[{v:lim,l:pj0(lim),c:PJ.warn},{v:top,l:pj0(top),c:PJ.neg}]})}<div class="pj-cap">PSE × minutos dos últimos 7 dias.</div></div></div>
    </div>
    <h2>Prontidão vs. condição</h2>
    <div class="pj-2 pj-blk">
      <div class="pj-fig"><div class="pj-leg"><span><i style="background:${PJ.grena}"></i>Prontidão (agora)</span><span><i style="background:${PJ.gold}"></i>Condição (o que construiu)</span><span>- - 65</span></div>
        ${pjPaired(byP(com).map(j=>({l:gName(j),p:j.prontidao,c:j.condicao})))}</div>
      <div><p class="pj-t" style="margin-top:0">A <b>prontidão</b> muda de dia para dia; a <b>condição</b> muda em semanas. Fresco e mal preparado, ou preparado e cansado, pedem decisões opostas.</p>
        ${grp("nuc",PJ.pos,"Núcleo utilizável",`Bem agora e com base para o jogo inteiro: daqui sai o onze natural.${nucTop.length?` ${listPt(nucTop)}: carga mais alta, candidatos a gestão de minutos.`:""}`)}
        ${grp("div",PJ.warn,"Preparados, ainda em dívida","Condição alta, prontidão em baixo: melhor entrar com o jogo em andamento.")}
        ${grp("fre",PJ.neg,"Frescos sem base","Frescos porque treinaram pouco: 90' seria um salto de carga. Minutos de impacto.")}
        ${G.bai.length?grp("bai","#6b5a5f","Em baixo nas duas","Prontidão e condição abaixo de 65."):""}</div>
    </div>
    <h2>Casos a decidir antes do jogo</h2>
    ${casos.length?`<div class="pj-cases">${casos.map(caso).join("")}</div>`:"<p>Sem casos a assinalar.</p>"}
    <div class="pj-2 pj-blk">
      <div>${grs.length?`<h2>Guarda-redes</h2><div class="pj-t">${grs.map((j,i)=>`<p>${i===0?"<b>":""}${esc(nm(j))}${i===0?"</b>":""}: prontidão ${pj0(j.prontidao)}, condição ${pj0(j.condicao)}, bem-estar ${pj2(j.bem3)}${j.critico?` (mais baixo: ${esc(j.critico)})`:""}</p>`).join("")}</div>`:""}
        ${semResp.length?`<h2>Sem dados suficientes</h2><p class="pj-t">${listPt(semResp.map(j=>`<b>${esc(nm(j))}</b> (${j.nResp||0} respostas, ${pj0(j.carga7)} UA)`))}. Se jogarem, com minutos controlados — não porque os números sejam maus, mas porque não existem.</p>`:""}</div>
      <div><h2>Leitura final para o jogo</h2><ul class="pj-fin pj-t">${fin.map(x=>`<li>${x}</li>`).join("")}</ul></div>
    </div>
    <p class="note">Gerado pela app a partir do painel de monitorização (${esc(monAge())}). Textos automáticos: confirmar com a equipa técnica.</p>`;
  printDoc(`relatorio-pre-jogo-${d.hoje}`, "Relatório pré-jogo", pjDot(body));
}
Object.assign(A,{
  preJogo: () => { if(!preJogoOk(MON.data)) return toast("O relatório pré-jogo fica disponível no dia anterior ao jogo e no dia do jogo."); printAsk("prejogo",""); }
});
monSnap(MON.data);   // dados já em cache no arranque
