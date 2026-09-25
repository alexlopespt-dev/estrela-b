/* ================= convocatória e horário de jogo (Jogos → Convocatória) ================= */
// Campos no jogo: place (local do jogo), meetT/meetP (hora e local da concentração), coach, cnote (observações),
// cnum:{pid:n} (número neste jogo; por omissão o n.º do atleta), cobs:{pid:texto}, sched:[{l,t}] (horário de jogo).
// No atleta: full (nome completo, usado nos documentos). Documentos em SVG A4 (794x1123): PDF (página inteira) e imagem PNG.
const CW=794, CH=1123;
const HOR_BG="__HORBG__";   // foto de fundo do horário de jogo (do cartaz enviado pela equipa)
const SCHED_DEF=[["Concentração",-200],["Almoço",-180],["Palestra tática",-130],["Saída do autocarro",-100],["Chegada ao campo",-80],
  ["Reconhecimento do relvado",-75],["Equipar",-65],["Aquecimento GR",-40],["Aquecimento da equipa",-30],["Retorno ao balneário",-10],["Jogo",0]];
const FCOND="'Barlow Condensed','Avenir Next Condensed','Arial Narrow',Arial,sans-serif", FTXT="'Barlow','Helvetica Neue',Arial,sans-serif";
const hm = t => { const m=/^(\d{1,2})[:h.](\d{2})$/.exec(String(t||"").trim()); return m?(+m[1])*60+(+m[2]):null; };
const hmTxt = (n,sep=":") => n==null?"":pad(Math.floor(((n%1440)+1440)%1440/60))+sep+pad(((n%60)+60)%60);
const hTxt = t => { const n=hm(t); return n==null?(t||""):hmTxt(n,"h"); };   // "15:00" -> "15h00"
const fullName = p => (p && (p.full||p.name)) || "";
function convGames(){ return games().slice().sort(byDT); }
function convDefaultGame(){ const t=todayISO(), gs=convGames(); return (gs.find(g=>g.date>=t && !g.closed)||gs[gs.length-1]||{}).id||null; }
function convCoach(g){ if(g.coach) return g.coach; const s=staff().find(x=>/principal/i.test(x.role||"")); return s?s.name:""; }
function convList(g){   // convocados com o número deste jogo, por ordem de número
  const cn=g.cnum||{};
  return (g.call||[]).map(P).filter(Boolean).map(p=>({p,num:cn[p.id]!=null&&cn[p.id]!==""?cn[p.id]:p.n,obs:(g.cobs||{})[p.id]||""}))
    .sort((a,b)=>((parseNum(a.num)??999)-(parseNum(b.num)??999))||BYPOS(a.p,b.p));
}
function convSides(g){ const m=meta(), o=oppByName(g.opp), home=g.venue!=="F";
  const us={name:"CF Estrela da Amadora"+(m.team&&/\bB\b/.test(m.team)?" B":""),short:m.team||"Estrela B",img:CREST}, them={name:g.opp||"Adversário",short:g.opp||"Adversário",img:oppCrestSrc(o)};
  return home?[us,them]:[them,us]; }
function schedOf(g){
  if((g.sched||[]).length) return g.sched;
  const k=hm(g.time); if(k==null) return [];
  return SCHED_DEF.map(([l,d])=>({l,t:l==="Concentração"&&hm(g.meetT)!=null?g.meetT:hmTxt(k+d)}));
}

/* ---- sub-aba ---- */
function vConv(){
  const gs=convGames();
  if(!gs.length) return `<div class="empty" style="margin-top:14px"><b>Sem jogos</b>Cria o jogo primeiro (+ Novo jogo) para lançares a convocatória.</div>`;
  if(!S.convG || !D.events[S.convG]) S.convG=convDefaultGame();
  const id=S.convG, g={id,...D.events[id]}, pls=players(), call=g.call||[], list=convList(g), sc=schedOf(g), saved=(g.sched||[]).length>0;
  const F=(f,label,val,type="text",extra="")=>`<label class="fld">${label}<input type="${type}" value="${esc(val??"")}" data-c="f" data-col="events" data-id="${esc(id)}" data-f="${f}" ${extra}></label>`;
  const opt=x=>({v:x.id,l:`${fmtD(x.date,{day:"numeric",month:"short"})} — ${x.venue==="F"?"@":"vs"} ${x.opp||"?"}${x.phase?" ("+x.phase+")":""}`});
  const tile=p=>{ const on=call.includes(p.id), av=avail(p.id);
    return `<button class="tile ${on?"on":"off"}" data-a="call" data-id="${esc(id)}" data-p="${esc(p.id)}">${av!=="ok"?`<span class="flag ${av==="cond"?"cond":""}" title="${AV[av].l}"></span>`:""}${avatar(p)}<b>${esc(p.name)}</b><span class="st">${on?"Convocado":av!=="ok"?AV[av].l:"Fora"}</span></button>`; };
  const byGroup=fn=>["GR","DEF","MED","ATA","X"].map(k=>{ const l=pls.filter(p=>GROUP(p.pos)===k); return l.length?`<div class="gsec">${GNAME[k]}</div><div class="tiles">${l.map(fn).join("")}</div>`:""; }).join("");
  return `
  <section class="card"><div class="card-h"><h3>Jogo</h3>${sel("",gs.map(opt),id,'data-c="convG" class="inp" style="max-width:340px" aria-label="Jogo"')}</div><div class="card-b"><div class="form">
    ${F("comp","Prova",g.comp,"text",'placeholder="Ex.: III Divisão Distrital"')}${F("phase","Jornada",g.phase,"text",'placeholder="Ex.: Jornada 1"')}
    <label class="fld">Casa / fora${sel("",[{v:"C",l:"Casa (visitado)"},{v:"F",l:"Fora (visitante)"}],g.venue||"C",`data-c="f" data-col="events" data-id="${esc(id)}" data-f="venue"`)}</label>
    ${F("place","Local do jogo",g.place,"text",'placeholder="Ex.: Parque de Jogos C.E.R. Tenente Valdez"')}
    ${F("date","Data",g.date,"date")}${F("time","Hora do jogo",g.time,"time")}
    ${F("meetT","Hora de concentração",g.meetT,"time")}${F("meetP","Local de concentração",g.meetP,"text",'placeholder="Ex.: Estádio José Gomes"')}
    ${F("coach","Treinador",g.coach,"text",`placeholder="${esc(convCoach({}))}"`)}
    <label class="fld full">Observações<input value="${esc(g.cnote??"")}" data-c="f" data-col="events" data-id="${esc(id)}" data-f="cnote" placeholder="Números sujeitos a alterações!"></label>
  </div></div></section>
  <section class="card"><div class="card-h"><h3>Convocados</h3><span class="sub">${call.length} convocados</span></div><div class="card-b">${byGroup(tile)}</div></section>
  <section class="card"><div class="card-h"><h3>Números e nomes</h3><span class="sub">O nome completo fica guardado no atleta</span></div>
    ${list.length?`<div class="tscroll"><table class="tb convtb"><thead><tr><th>N.º</th><th class="l">Nome completo</th><th class="l">Observações</th></tr></thead><tbody>
    ${list.map(({p,num,obs})=>`<tr><td><input class="cell" inputmode="numeric" value="${esc((g.cnum||{})[p.id]??"")}" placeholder="${esc(p.n??"")}" data-c="cnum" data-id="${esc(id)}" data-p="${esc(p.id)}" aria-label="Número de ${esc(p.name)}"></td>
      <td class="l"><input class="cell wide" value="${esc(p.full||"")}" placeholder="${esc(p.name)}" data-c="f" data-col="players" data-id="${esc(p.id)}" data-f="full" aria-label="Nome completo de ${esc(p.name)}"></td>
      <td class="l"><input class="cell wide" value="${esc(obs)}" placeholder="—" data-c="cobs" data-id="${esc(id)}" data-p="${esc(p.id)}" aria-label="Observações de ${esc(p.name)}"></td></tr>`).join("")}</tbody></table></div>`
    :`<div class="empty"><b>Escolhe os convocados acima</b></div>`}</section>
  <section class="card"><div class="card-h"><h3>Horário de jogo</h3><span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-a="schedFill" data-id="${esc(id)}">${saved?"Recalcular pela hora do jogo":"Guardar este horário"}</button><button class="btn sm" data-a="schedAdd" data-id="${esc(id)}">+ Linha</button></span></div>
    ${sc.length?`<div class="card-b schedl">${sc.map((x,i)=>`<div class="schedr"><input class="inp" type="time" value="${esc(x.t||"")}" ${saved?`data-c="schedT" data-id="${esc(id)}" data-i="${i}"`:"disabled"} aria-label="Hora"><input class="inp" value="${esc(x.l||"")}" ${saved?`data-c="schedL" data-id="${esc(id)}" data-i="${i}"`:"disabled"} aria-label="Momento">${saved?`<button class="btn sm ghost" data-a="schedDel" data-id="${esc(id)}" data-i="${i}" aria-label="Apagar linha">✕</button>`:""}</div>`).join("")}
      ${saved?"":`<p class="note">Proposta calculada a partir da hora do jogo${hm(g.meetT)!=null?" e da concentração":""}. Carrega em "Guardar este horário" para mudares as horas.</p>`}</div>`
    :`<div class="empty"><b>Indica a hora do jogo</b>O horário é proposto a partir dela (concentração, almoço, palestra, saída, aquecimentos…).</div>`}</section>
  <section class="card"><div class="card-h"><h3>Documentos</h3><span class="sub">PDF para imprimir, imagem para o WhatsApp</span></div><div class="card-b">
    <div class="convdocs">
      <div class="convdoc"><div class="convprev">${convSVG(g)}</div><b>Convocatória</b><span><button class="btn sm primary" data-a="convDoc" data-k="conv" data-f="pdf" data-id="${esc(id)}">PDF</button><button class="btn sm" data-a="convDoc" data-k="conv" data-f="png" data-id="${esc(id)}">Imagem</button></span></div>
      <div class="convdoc"><div class="convprev">${horSVG(g)}</div><b>Horário de jogo</b><span><button class="btn sm primary" data-a="convDoc" data-k="hor" data-f="pdf" data-id="${esc(id)}">PDF</button><button class="btn sm" data-a="convDoc" data-k="hor" data-f="png" data-id="${esc(id)}">Imagem</button></span></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" data-a="convDoc" data-k="both" data-f="pdf" data-id="${esc(id)}">Os dois num PDF</button><button class="btn" data-a="copyCallG" data-id="${esc(id)}">Copiar mensagem (WhatsApp)</button></div>
  </div></section>`;
}

/* ---- documento: convocatória ---- */
function svgT(x,y,txt,o={}){   // texto SVG
  return `<text x="${x}" y="${y}"${o.a?` text-anchor="${o.a}"`:""} font-family="${o.f||FTXT}" font-size="${o.s||14}" font-weight="${o.w||400}" fill="${o.c||"#221418"}"${o.ls?` letter-spacing="${o.ls}"`:""}${o.op?` opacity="${o.op}"`:""}${o.fit?` textLength="${o.fit}" lengthAdjust="spacingAndGlyphs"`:""}>${esc(txt)}</text>`;
}
const fitW = (txt,size,maxW,k=0.6) => String(txt||"").length*size*k>maxW ? maxW : null;   // encolhe só textos que não cabem
function convSVG(g){
  const m=meta(), list=convList(g), [h,a]=convSides(g), d=validISO(g.date)?toD(g.date):null;
  const WD=["DOMINGO","SEGUNDA","TERÇA","QUARTA","QUINTA","SEXTA","SÁBADO"], MS=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const crest=(s,x,y,sz,name)=>s?`<image href="${esc(s)}" x="${x}" y="${y}" width="${sz}" height="${sz}" preserveAspectRatio="xMidYMid meet"/>`:`<circle cx="${x+sz/2}" cy="${y+sz/2}" r="${sz/2-4}" fill="#efe6e8"/>${svgT(x+sz/2,y+sz/2+9,initials(name),{a:"middle",f:FCOND,s:26,w:800,c:"#6b1426"})}`;
  let s=`<defs><linearGradient id="cvH" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f2239"/><stop offset=".55" stop-color="#6b1426"/><stop offset="1" stop-color="#3f0913"/></linearGradient>
    <linearGradient id="cvT" x1="0" x2="1"><stop offset="0" stop-color="#d62b2f"/><stop offset=".333" stop-color="#d62b2f"/><stop offset=".333" stop-color="#fff"/><stop offset=".666" stop-color="#fff"/><stop offset=".666" stop-color="#1f7a3d"/><stop offset="1" stop-color="#1f7a3d"/></linearGradient></defs>
    <rect width="${CW}" height="${CH}" fill="#fff"/>
    <rect width="${CW}" height="206" fill="url(#cvH)"/><circle cx="700" cy="10" r="150" fill="none" stroke="#fff" stroke-opacity=".05" stroke-width="34"/>
    <rect y="206" width="${CW}" height="7" fill="url(#cvT)"/>
    <image href="${CREST}" x="38" y="34" width="104" height="140" preserveAspectRatio="xMidYMid meet"/>
    ${svgT(160,72,"CF ESTRELA DA AMADORA · "+String(m.team||"Equipa B").toUpperCase(),{s:13,w:700,c:"#f2bd4b",ls:2})}
    ${svgT(156,138,"CONVOCATÓRIA",{f:FCOND,s:70,w:800,c:"#fff",fit:430})}
    ${svgT(160,172,[g.phase,g.comp].filter(Boolean).join("  ·  ")||" ",{s:17,w:500,c:"#fff",op:.85,fit:fitW([g.phase,g.comp].filter(Boolean).join("  ·  "),17,420)})}`;
  // data e hora (caixa à direita)
  s+=`<rect x="618" y="34" width="138" height="140" rx="14" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".25"/>
    ${svgT(687,62,d?WD[d.getDay()]:"DATA",{a:"middle",s:12,w:700,c:"#f2bd4b",ls:2})}
    ${svgT(687,112,d?String(d.getDate()):"—",{a:"middle",f:FCOND,s:54,w:800,c:"#fff"})}
    ${svgT(687,134,d?MS[d.getMonth()]+" "+d.getFullYear():"",{a:"middle",s:12,w:700,c:"#fff",op:.85,ls:1.5})}
    ${svgT(687,162,g.time?hTxt(g.time):"—",{a:"middle",f:FCOND,s:24,w:700,c:"#f2bd4b"})}`;
  // jogo: visitado vs visitante
  s+=`<rect x="38" y="232" width="718" height="104" rx="14" fill="#f8f3f4" stroke="#ecdfe2"/>
    ${crest(h.img,70,246,76,h.short)}${svgT(160,282,"VISITADO",{s:10.5,w:700,c:"#8a6a72",ls:1.5})}${svgT(160,306,h.name,{s:18,w:700,fit:fitW(h.name,18,205)})}
    ${svgT(397,300,"VS",{a:"middle",f:FCOND,s:34,w:800,c:"#6b1426"})}
    ${crest(a.img,648,246,76,a.short)}${svgT(634,282,"VISITANTE",{a:"end",s:10.5,w:700,c:"#8a6a72",ls:1.5})}${svgT(634,306,a.name,{a:"end",s:18,w:700,fit:fitW(a.name,18,205)})}`;
  // local e concentração
  const meet=[hTxt(g.meetT),g.meetP].filter(Boolean).join(" · ");
  s+=`<rect x="38" y="352" width="440" height="66" rx="12" fill="#fff" stroke="#e3d7da"/>${svgT(56,376,"LOCAL DO JOGO",{s:10.5,w:700,c:"#8a6a72",ls:1.5})}${svgT(56,401,g.place||"—",{s:16,w:700,fit:fitW(g.place,16,404)})}
    <rect x="490" y="352" width="266" height="66" rx="12" fill="#f2bd4b"/>${svgT(508,376,"CONCENTRAÇÃO",{s:10.5,w:800,c:"#4a3200",ls:1.5})}
    ${svgT(508,402,hTxt(g.meetT)||"—",{f:FCOND,s:24,w:800,c:"#3c0a14"})}${svgT(578,401,g.meetP||"",{s:13.5,w:700,c:"#3c0a14",fit:fitW(g.meetP,13.5,164)})}`;
  // convocados em duas colunas
  const n=list.length, per=Math.max(1,Math.ceil(n/2)), top=486, avail=460, rh=Math.min(46,avail/Math.max(per,1));
  s+=`${svgT(38,462,"JOGADORES CONVOCADOS",{f:FCOND,s:24,w:800,c:"#6b1426",fit:250})}<rect x="302" y="444" width="${String(n).length*11+28}" height="24" rx="12" fill="#6b1426"/>${svgT(302+(String(n).length*11+28)/2,461,String(n),{a:"middle",s:14,w:800,c:"#fff"})}
    <line x1="38" y1="474" x2="756" y2="474" stroke="#f2bd4b" stroke-width="3"/>`;
  list.forEach((x,i)=>{ const col=i<per?0:1, r=col?i-per:i, X=38+col*366, Y=top+r*rh, cy=Y+rh/2, rr=Math.min(15,rh/2-3);
    s+=`${r%2===0?`<rect x="${X}" y="${Y}" width="352" height="${rh}" rx="8" fill="#faf6f7"/>`:""}
      <circle cx="${X+24}" cy="${cy}" r="${rr}" fill="#6b1426"/>${svgT(X+24,cy+rr*0.42,x.num??"",{a:"middle",f:FCOND,s:rr*1.25,w:800,c:"#fff"})}
      ${svgT(X+50,x.obs?cy-1:cy+5.5,fullName(x.p),{s:Math.min(16,rh*0.42),w:700,fit:fitW(fullName(x.p),Math.min(16,rh*0.42),220)})}
      ${x.obs?svgT(X+50,cy+Math.min(13,rh*0.33),x.obs,{s:Math.min(11,rh*0.28),w:500,c:"#8a6a72",fit:fitW(x.obs,Math.min(11,rh*0.28),230)}):""}
      ${svgT(X+340,cy+4.5,x.p.pos||"",{a:"end",s:11,w:700,c:"#a88a92",ls:1})}`; });
  if(!n) s+=svgT(397,600,"Sem convocados",{a:"middle",s:16,w:600,c:"#a88a92"});
  // observações e treinador
  s+=`<rect x="38" y="976" width="440" height="84" rx="12" fill="#fff" stroke="#e3d7da"/>${svgT(56,1000,"OBSERVAÇÕES",{s:10.5,w:700,c:"#8a6a72",ls:1.5})}
    ${svgT(56,1030,(g.cnote||"Números sujeitos a alterações!").toUpperCase(),{s:15,w:800,c:"#6b1426",fit:fitW(g.cnote||"Números sujeitos a alterações!",15*1.1,404)})}
    ${svgT(508,1000,"TREINADOR",{s:10.5,w:700,c:"#8a6a72",ls:1.5})}<line x1="508" y1="1040" x2="756" y2="1040" stroke="#6b1426" stroke-width="1.5"/>${svgT(508,1033,convCoach(g),{s:17,w:700})}
    <rect y="${CH-8}" width="${CW}" height="8" fill="url(#cvT)"/>${svgT(397,CH-20,"CF ESTRELA DA AMADORA · DEPARTAMENTO TÉCNICO",{a:"middle",s:9.5,w:700,c:"#a88a92",ls:2})}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" class="convsvg" role="img" aria-label="Convocatória">${s}</svg>`;
}

/* ---- documento: horário de jogo (cartaz) ---- */
function horSVG(g){
  const [h,a]=convSides(g), d=validISO(g.date)?toD(g.date):null, sc=schedOf(g);
  const dTxt=d?cap1(d.toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).replace(/,/g,"").replace(/ de (\d{4})$/," $1")):"Data por definir";
  const circ=(s,cx,cy,name)=>`<circle cx="${cx}" cy="${cy}" r="62" fill="#fff" fill-opacity=".95"/>${s?`<image href="${esc(s)}" x="${cx-46}" y="${cy-46}" width="92" height="92" preserveAspectRatio="xMidYMid meet"/>`:svgT(cx,cy+12,initials(name),{a:"middle",f:FCOND,s:36,w:800,c:"#6b1426"})}`;
  let s=`<defs><linearGradient id="hvO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b06" stop-opacity=".82"/><stop offset=".42" stop-color="#050b06" stop-opacity=".55"/><stop offset="1" stop-color="#050b06" stop-opacity=".86"/></linearGradient>
    <linearGradient id="hvT" x1="0" x2="1"><stop offset="0" stop-color="#d62b2f"/><stop offset=".333" stop-color="#d62b2f"/><stop offset=".333" stop-color="#fff"/><stop offset=".666" stop-color="#fff"/><stop offset=".666" stop-color="#1f7a3d"/><stop offset="1" stop-color="#1f7a3d"/></linearGradient>
    <filter id="hvS" x="-10%" y="-20%" width="120%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity=".5"/></filter></defs>
    <rect width="${CW}" height="${CH}" fill="#16361c"/><image href="${HOR_BG}" x="0" y="0" width="${CW}" height="${CH}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${CW}" height="${CH}" fill="url(#hvO)"/><rect width="${CW}" height="8" fill="url(#hvT)"/>`;
  // data, hora, local (ícones simples)
  const ic=(x,y,k)=>k==="cal"?`<g fill="none" stroke="#f2bd4b" stroke-width="2.2"><rect x="${x}" y="${y}" width="24" height="22" rx="3"/><path d="M${x} ${y+7}h24M${x+6} ${y-4}v7M${x+18} ${y-4}v7"/></g>`
    : k==="clk"?`<g fill="none" stroke="#f2bd4b" stroke-width="2.2"><circle cx="${x+12}" cy="${y+11}" r="12"/><path d="M${x+12} ${y+4}v8l5 3"/></g>`
    : `<g fill="none" stroke="#f2bd4b" stroke-width="2.2"><path d="M${x+11} ${y+25}s-10-10-10-17a10 10 0 0 1 20 0c0 7-10 17-10 17z"/><circle cx="${x+11}" cy="${y+8}" r="3.5"/></g>`;
  const place=String(g.place||"Local por definir"), pl1=place.length>30?place.slice(0,place.lastIndexOf(" ",30)>10?place.lastIndexOf(" ",30):30):place, pl2=place.slice(pl1.length).trim();
  s+=`${ic(40,40,"cal")}${svgT(74,59,dTxt,{s:19,w:600,c:"#fff",fit:fitW(dTxt,19,300)})}
    ${ic(396,39,"clk")}${svgT(430,59,g.time?hTxt(g.time):"—",{s:21,w:700,c:"#fff"})}
    ${ic(520,37,"pin")}${svgT(548,55,pl1,{s:15,w:600,c:"#fff",fit:fitW(pl1,15,208)})}${pl2?svgT(548,75,pl2,{s:15,w:600,c:"#fff",fit:fitW(pl2,15,208)}):""}`;
  s+=`${circ(h.img,296,172,h.short)}${svgT(397,184,"VS",{a:"middle",f:FCOND,s:34,w:800,c:"#fff"})}${circ(a.img,498,172,a.short)}`;
  s+=`<g filter="url(#hvS)">${svgT(397,338,"HORÁRIO DE JOGO",{a:"middle",f:FCOND,s:96,w:800,c:"#fff",fit:640})}</g>`;
  const meet=g.meetP?`Local da concentração: ${g.meetP}`:"";
  if(meet) s+=`${svgT(397,384,meet,{a:"middle",s:22,w:600,c:"#fff",fit:fitW(meet,22,690)})}<rect x="${397-Math.min(690,meet.length*11)/2}" y="392" width="${Math.min(690,meet.length*11)}" height="3" rx="1.5" fill="#f2bd4b"/>`;
  // linha do tempo
  const n=sc.length, y0=440, span=CH-y0-120, step=n>1?Math.min(62,span/(n-1)):0;
  if(n) s+=`<line x1="128" y1="${y0}" x2="128" y2="${y0+step*(n-1)}" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`;
  sc.forEach((x,i)=>{ const y=y0+i*step, last=i===n-1 && /jogo/i.test(x.l||""), fs=Math.min(27,step*0.52||27);
    s+=`<circle cx="128" cy="${y}" r="${last?11:7}" fill="${last?"#f2bd4b":"#fff"}" stroke="#0b1a0e" stroke-width="3"/>
      ${svgT(156,y+fs*0.36,(x.l||"")+(last?"":":"),{s:fs,w:700,c:last?"#f2bd4b":"#fff",fit:fitW((x.l||"")+":",fs,420)})}
      <rect x="${last?586:600}" y="${y-fs*0.78}" width="${last?140:126}" height="${fs*1.56}" rx="${fs*0.78}" fill="${last?"#f2bd4b":"#fff"}" fill-opacity="${last?1:.14}" stroke="${last?"none":"#fff"}" stroke-opacity=".35"/>
      ${svgT(last?656:663,y+fs*0.4,hTxt(x.t)||"—",{a:"middle",f:FCOND,s:fs*1.12,w:800,c:last?"#3c0a14":"#fff"})}`; });
  if(!n) s+=svgT(397,640,"Indica a hora do jogo para gerar o horário",{a:"middle",s:20,w:600,c:"#fff",op:.8});
  s+=`${svgT(397,CH-34,"CF ESTRELA DA AMADORA · "+String(meta().team||"EQUIPA B").toUpperCase(),{a:"middle",s:12,w:700,c:"#fff",op:.75,ls:3})}<rect y="${CH-8}" width="${CW}" height="8" fill="url(#hvT)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" class="convsvg" role="img" aria-label="Horário de jogo">${s}</svg>`;
}

/* ---- exportar: PDF (página A4 inteira) e PNG ---- */
let FONT_CSS=null;
async function convFontCSS(){   // as imagens SVG não usam as fontes da página: embute a Barlow (se houver rede)
  if(FONT_CSS!=null) return FONT_CSS;
  try{
    const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),5000);
    const css=await (await fetch("https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap",{signal:ctl.signal})).text();
    const blocks=css.split("@font-face").filter(b=>/\/\* latin \*\//.test("/* latin */"+b) && /U\+0000-00FF/.test(b));
    let out="";
    for(const b of blocks){ const u=(/url\((https:[^)]+)\)/.exec(b)||[])[1]; if(!u) continue;
      const buf=await (await fetch(u,{signal:ctl.signal})).arrayBuffer(); let bin=""; const by=new Uint8Array(buf); for(let i=0;i<by.length;i+=8192) bin+=String.fromCharCode.apply(null,by.subarray(i,i+8192));
      out+="@font-face"+b.replace(/url\([^)]+\)/,`url(data:font/woff2;base64,${btoa(bin)})`); }
    clearTimeout(tm); FONT_CSS=out;
  }catch(e){ FONT_CSS=""; }
  return FONT_CSS;
}
async function inlineImgs(svg){   // imagens de fora (fotos do Drive/assets) passam a dataURL para entrarem no PNG
  const urls=[...new Set([...svg.matchAll(/href="((?!data:)[^"]+)"/g)].map(m=>m[1]))];
  for(const u of urls){ try{ const bl=await (await fetch(u.replace(/&amp;/g,"&"))).blob(); const du=await new Promise(r=>{ const f=new FileReader(); f.onload=()=>r(f.result); f.readAsDataURL(bl); }); svg=svg.split(`href="${u}"`).join(`href="${du}"`); }
    catch(e){ svg=svg.split(`href="${u}"`).join(`href=""`); } }
  return svg;
}
async function svgPng(svg,scale=2,type="image/png"){
  const css=await convFontCSS(); svg=await inlineImgs(svg);
  if(css) svg=svg.replace(/^<svg([^>]*)>/,`<svg$1 width="${CW}" height="${CH}"><style>${css}</style>`); else svg=svg.replace(/^<svg([^>]*)>/,`<svg$1 width="${CW}" height="${CH}">`);
  return new Promise((res,rej)=>{ const img=new Image();
    img.onload=()=>{ const c=document.createElement("canvas"); c.width=CW*scale; c.height=CH*scale; const x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,c.width,c.height); x.drawImage(img,0,0,c.width,c.height); c.toBlob(b=>b?res(b):rej(new Error("png")),type,0.9); };
    img.onerror=()=>rej(new Error("svg")); img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg); });
}
async function saveBlob(blob,fname,mime){
  const dl=await use("downloads");
  if(dl){ try{ await dl.save({filename:fname,data:new Uint8Array(await blob.arrayBuffer()),mimeType:mime}); toast("Guardado"); return; }catch(e){ if(e&&e.code==="declined") return; } }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); a.remove(); toast("Descarregado");
}
function convPdf(pages,fname,title){
  const html=`<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet">
<style>html,body{margin:0;background:#777;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pg{width:210mm;height:297mm;margin:10px auto;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.35);overflow:hidden;page-break-after:always}.pg:last-child{page-break-after:auto}.pg svg{width:100%;height:100%;display:block}
@page{size:A4;margin:0}@media print{html,body{background:#fff}.pg{margin:0;box-shadow:none}}</style></head><body>
${pages.map(p=>`<div class="pg">${p}</div>`).join("")}<script>window.onload=function(){setTimeout(function(){try{window.print();}catch(e){}},600);};<\/script></body></html>`;
  openPrintable(fname,html);
}
function convFname(g,k){ return `${k==="hor"?"horario-de-jogo":k==="both"?"convocatoria-e-horario":"convocatoria"}-${slug(g.phase||"")||g.date||"jogo"}`; }

/* ---- ações e campos ---- */
Object.assign(A,{
  jsub: el => { S.jsub=el.dataset.k; render(); },
  convOpen: el => { S.jsub="conv"; S.convG=el.dataset.id; S.page=null; S.tab="jogos"; saveUI(); render(); window.scrollTo({top:0}); },
  schedFill: el => { const id=el.dataset.id, g=clone(D.events[id]); if(!g) return; const had=(g.sched||[]).length;
    const k=hm(g.time); if(k==null){ toast("Indica primeiro a hora do jogo."); return; }
    const run=()=>{ const cur=clone(D.events[id]); cur.sched=SCHED_DEF.map(([l,dm])=>({l,t:l==="Concentração"&&hm(cur.meetT)!=null?cur.meetT:hmTxt(k+dm)}));
      if(!cur.meetT) cur.meetT=hmTxt(k-200); put("events",id,cur); toast("Horário guardado — já podes mudar as horas."); };
    if(had) askConfirm("Recalcular o horário a partir da hora do jogo? As horas que mudaste à mão perdem-se.","Recalcular").then(ok=>{ if(ok) run(); }); else run(); },
  schedAdd: el => { const id=el.dataset.id, g=clone(D.events[id]); if(!g) return; g.sched=(g.sched&&g.sched.length)?g.sched:clone(schedOf(g)); g.sched.push({l:"",t:""}); put("events",id,g);
    setTimeout(()=>{ const l=$$(".schedr input[data-c=schedL]").pop(); if(l) l.focus(); },60); },
  schedDel: el => { const id=el.dataset.id, g=clone(D.events[id]); if(!g) return; g.sched=(g.sched||[]).filter((x,i)=>i!==+el.dataset.i); put("events",id,g); },
  convDoc: async el => { const id=el.dataset.id, g0=D.events[id]; if(!g0) return; const g={id,...g0}, k=el.dataset.k;
    if(!(g.call||[]).length && k!=="hor") toast("Atenção: ainda não há convocados.");
    if(el.dataset.f==="pdf"){ PRINT_MODE="dl"; convPdf(k==="both"?[convSVG(g),horSVG(g)]:[k==="hor"?horSVG(g):convSVG(g)],convFname(g,k),k==="hor"?"Horário de jogo":"Convocatória"); return; }
    // horário (foto de fundo) em JPEG, convocatória (texto) em PNG — ficheiros leves para o WhatsApp
    try{ toast("A preparar a imagem…"); const jp=k==="hor", b=await svgPng(jp?horSVG(g):convSVG(g),2,jp?"image/jpeg":"image/png"); await saveBlob(b,convFname(g,k)+(jp?".jpg":".png"),jp?"image/jpeg":"image/png"); }
    catch(e){ console.error(e); toast("Não foi possível criar a imagem."); } },
  copyCallG: async el => { const g=D.events[el.dataset.id]; if(!g) return; const t=callText({id:el.dataset.id,...g});
    try{ if(!navigator.clipboard) throw new Error("no"); await navigator.clipboard.writeText(t); toast("Mensagem copiada"); }catch(e){ toast("Não foi possível copiar neste dispositivo."); } }
});
Object.assign(Cg,{
  convG: el => { S.convG=el.value; render(); },
  cnum: el => { const {id,p}=el.dataset, g=clone(D.events[id]); if(!g) return; const v=parseNum(el.value); g.cnum=g.cnum||{};
    if(v==null) delete g.cnum[p]; else if(v<0||v>99||v!==Math.round(v)){ toast("Número entre 0 e 99."); schedule(); return; } else g.cnum[p]=v; put("events",id,g); },
  cobs: el => { const {id,p}=el.dataset, g=clone(D.events[id]); if(!g) return; g.cobs=g.cobs||{}; const v=el.value.trim(); if(v) g.cobs[p]=v; else delete g.cobs[p]; put("events",id,g); },
  schedT: el => { const {id,i}=el.dataset, g=clone(D.events[id]); if(!g||!g.sched||!g.sched[+i]) return; g.sched[+i].t=el.value; put("events",id,g); },
  schedL: el => { const {id,i}=el.dataset, g=clone(D.events[id]); if(!g||!g.sched||!g.sched[+i]) return; g.sched[+i].l=el.value.trim(); put("events",id,g); }
});
