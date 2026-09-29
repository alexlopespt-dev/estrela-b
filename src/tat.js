/* ================= Plantel → Esquema tático (tipo Football Manager) ================= */
// Documento tactics/{id}: {name, form, sl:{CHAVE:{r,d,p,x?,y?,ins?}}, notes}
//  CHAVE = posição da formação (GR, LE, DCE, MDC, MOE, PL…); r = função (TAC_ROLES), d = missão (def|apo|ata), p = id do atleta,
//  x/y = posição arrastada (percentagem do campo, 0 = ataque em cima), ins = instruções da posição.
const TAC_POS = {GR:["Guarda-redes","gk"],LE:["Lateral esquerdo","lat"],LD:["Lateral direito","lat"],DCE:["Defesa central esquerdo","dc"],DC:["Defesa central","dc"],DCD:["Defesa central direito","dc"],
  ALE:["Ala esquerdo","wb"],ALD:["Ala direito","wb"],MDCE:["Médio defensivo esquerdo","dm"],MDC:["Médio defensivo","dm"],MDCD:["Médio defensivo direito","dm"],
  MCE:["Médio centro esquerdo","mc"],MC:["Médio centro","mc"],MCD:["Médio centro direito","mc"],ME:["Médio esquerdo","wm"],MD:["Médio direito","wm"],
  MOE:["Médio ofensivo esquerdo","wing"],MO:["Médio ofensivo","am"],MOD:["Médio ofensivo direito","wing"],EE:["Extremo esquerdo","wing"],ED:["Extremo direito","wing"],
  PLE:["Ponta de lança esquerdo","st"],PL:["Ponta de lança","st"],PLD:["Ponta de lança direito","st"]};
const TAC_B4 = {GR:[50,93],LE:[13,71],DCE:[37,77],DCD:[63,77],LD:[87,71]}, TAC_B3 = {GR:[50,93],DCE:[27,76],DC:[50,78],DCD:[73,76]};
const TAC_FORMS = {
  "4-4-2":   {...TAC_B4, ME:[13,46],MCE:[37,50],MCD:[63,50],MD:[87,46],PLE:[37,16],PLD:[63,16]},
  "4-3-3":   {...TAC_B4, MDC:[50,59],MCE:[29,43],MCD:[71,43],EE:[14,19],PL:[50,12],ED:[86,19]},
  "4-2-3-1": {...TAC_B4, MDCE:[37,57],MDCD:[63,57],MOE:[13,31],MO:[50,33],MOD:[87,31],PL:[50,11]},
  "4-1-4-1": {...TAC_B4, MDC:[50,60],ME:[13,41],MCE:[37,44],MCD:[63,44],MD:[87,41],PL:[50,12]},
  "4-3-1-2": {...TAC_B4, MCE:[27,52],MC:[50,56],MCD:[73,52],MO:[50,34],PLE:[37,13],PLD:[63,13]},
  "3-5-2":   {...TAC_B3, ALE:[10,49],MCE:[33,48],MDC:[50,60],MCD:[67,48],ALD:[90,49],PLE:[37,15],PLD:[63,15]},
  "3-4-3":   {...TAC_B3, ALE:[11,51],MCE:[37,53],MCD:[63,53],ALD:[89,51],EE:[16,20],PL:[50,12],ED:[84,20]},
  "5-3-2":   {GR:[50,93],ALE:[9,65],DCE:[29,75],DC:[50,78],DCD:[71,75],ALD:[91,65],MCE:[28,47],MC:[50,51],MCD:[72,47],PLE:[37,15],PLD:[63,15]},
  "5-4-1":   {GR:[50,93],ALE:[9,65],DCE:[29,75],DC:[50,78],DCD:[71,75],ALD:[91,65],ME:[13,43],MCE:[37,47],MCD:[63,47],MD:[87,43],PL:[50,13]}
};
// funções [sigla, nome, zonas onde é proposta]
const TAC_ROLES = [["GR","Guarda-redes",["gk"]],["GRL","Guarda-redes líbero",["gk"]],
  ["DC","Defesa central",["dc"]],["DCC","Central construtor",["dc"]],["LIB","Líbero",["dc"]],
  ["LAT","Lateral",["lat","wb"]],["LAI","Lateral invertido",["lat"]],["LAC","Lateral completo",["lat","wb"]],["ALA","Ala",["wb","lat"]],["ALI","Ala invertido",["wb","lat"]],
  ["MD","Médio defensivo",["dm"]],["TRI","Trinco",["dm"]],["PIV","Pivô organizador",["dm","mc"]],["MR","Médio recuperador",["dm","mc"]],["VOL","Volante",["dm"]],
  ["MC","Médio centro",["mc"]],["BB","Box-to-box",["mc"]],["ORG","Organizador",["mc","am"]],["MEZ","Mezzala",["mc"]],["CAR","Carrilero",["mc"]],
  ["ME","Médio ala",["wm"]],["AD","Ala defensivo",["wm"]],["EXT","Extremo",["wm","wing"]],["EI","Extremo invertido",["wm","wing"]],["AI","Avançado interior",["wing"]],["ORA","Organizador aberto",["wm","wing"]],
  ["MO","Médio ofensivo",["am"]],["N10","Número 10",["am"]],["AS","Avançado sombra",["am"]],
  ["PL","Ponta de lança",["st"]],["REF","Referência",["st"]],["F9","Falso 9",["st"]],["AA","Avançado de área",["st"]],["AC","Avançado completo",["st"]],["APR","Avançado pressionante",["st"]]];
const TAC_DUT = {def:{l:"Def",n:"Defesa",c:"#ff8a80"},apo:{l:"Apo",n:"Apoio",c:"#9cc3ff"},ata:{l:"Ata",n:"Ataque",c:"#8bf59a"}};
const TAC_DEF = {gk:["GR","def"],dc:["DC","def"],lat:["LAT","apo"],wb:["ALA","apo"],dm:["MD","def"],mc:["MC","apo"],wm:["ME","apo"],am:["MO","apo"],wing:["EXT","apo"],st:["PL","ata"]};
// cor da faixa da função (como no FM: GR castanho, defesas azul, médios cinzento, ataque roxo)
const TAC_ZC = {gk:"#6f5a4c",dc:"#4a73b0",lat:"#4a73b0",wb:"#4a73b0",dm:"#6c7384",mc:"#2e333b",wm:"#2e333b",am:"#62559a",wing:"#2e333b",st:"#62559a"};
// posições do plantel que servem melhor cada zona (para "Preencher vazios")
const TAC_FIT = {gk:["GR"],dc:["DC"],lat:["LAT"],wb:["LAT","EXT"],dm:["MDF","MC"],mc:["MC","MDF"],wm:["EXT","MC"],am:["MC","EXT","EXT/PL"],wing:["EXT","EXT/PL"],st:["PL","EXT/PL"]};
const TW=680, TH=940;
// equipamento principal 2026/27: riscas verticais grená e verde com filete branco, gola polo branca, mangas grená com punho verde/branco
// (desenhado em coordenadas locais, centro da camisola em 0,0; reutilizado com <use>)
const TAC_SH = "M-9 -31 L-38 -8 L-31 0 L-25 -5 L-25 30 L25 30 L25 -5 L31 0 L38 -8 L9 -31 Q0 -26 -9 -31 Z";
const TAC_SLV = "M-11 -30.4 L-38 -8 L-31 0 L-25 -5 Z M11 -30.4 L38 -8 L31 0 L25 -5 Z";   // mangas raglan
const TAC_COL = "M-9 -31 Q0 -35 9 -31 L12 -28.5 L5 -21 L0 -25.5 L-5 -21 L-12 -28.5 Z";   // gola polo
const TAC_KIT = `<defs><clipPath id="tacClip"><path d="${TAC_SH}"/></clipPath>
  <g id="tacKit"><g clip-path="url(#tacClip)">
    ${[...Array(11)].map((_,i)=>`<rect x="${(-25+i*50/11).toFixed(2)}" y="-36" width="${(50/11+.05).toFixed(2)}" height="67" fill="${i%2?"#1f6b3a":"#6e1428"}"/>`).join("")}
    ${[...Array(10)].map((_,i)=>`<rect x="${(-25+(i+1)*50/11-.35).toFixed(2)}" y="-36" width=".7" height="67" fill="#fff"/>`).join("")}
    <path d="${TAC_SLV}" fill="#6e1428"/><path d="M-11 -30.4 L-25 -5 M11 -30.4 L25 -5" stroke="#4a0b18" stroke-width=".6"/>
    <path d="M-38 -8 L-31 0 M38 -8 L31 0" stroke="#1f6b3a" stroke-width="5.6"/><path d="M-35.7 -10 L-28.7 -2 M35.7 -10 L28.7 -2" stroke="#fff" stroke-width=".9"/></g>
    <path d="${TAC_COL}" fill="#fff" stroke="#c9c2c4" stroke-width=".5"/><path d="M0 -25.5 V-17" stroke="#fff" stroke-width="1.4"/>
    <image href="${CREST}" x="8" y="-21" width="8" height="9.5"/>
    <path d="${TAC_SH}" fill="none" stroke="#2a0a12" stroke-width="1.2" stroke-linejoin="round"/></g>
  <g id="tacGk"><path d="${TAC_SH}" fill="#8fe36f" stroke="#3d7a2a" stroke-width="1.2" stroke-linejoin="round"/><path d="${TAC_COL}" fill="#fff" opacity=".85"/></g></defs>`;
const tactics = () => Object.entries(D.tactics||{}).map(([id,x])=>({id,...x})).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pt"));
const tacZone = k => (TAC_POS[k]||["","mc"])[1];
const tacRole = r => TAC_ROLES.find(x=>x[0]===r);
const tacXY = (t,k) => { const s=(t.sl||{})[k]||{}, f=(TAC_FORMS[t.form]||{})[k]||[50,50]; return [s.x!=null?s.x:f[0], s.y!=null?s.y:f[1]]; };
const tacPx = ([x,y]) => [20+x/100*(TW-40), 20+y/100*(TH-100)];
function tacNew(form){ const sl={}; Object.keys(TAC_FORMS[form]).forEach(k=>{ const [r,d]=TAC_DEF[tacZone(k)]; sl[k]={r,d}; }); return sl; }
// muda a formação: posições com o mesmo nome ficam; os atletas das que desaparecem vão para a posição livre mais próxima
function tacRemap(t,form){
  const nf=TAC_FORMS[form], old=t.sl||{}, sl={}, lost=[];
  Object.keys(nf).forEach(k=>{ const [r,d]=TAC_DEF[tacZone(k)]; sl[k]=old[k]?{...old[k]}:{r,d}; delete sl[k].x; delete sl[k].y; });
  Object.keys(old).forEach(k=>{ if(!nf[k] && old[k].p) lost.push({p:old[k].p, xy:(TAC_FORMS[t.form]||{})[k]||[50,50]}); });
  lost.forEach(({p,xy})=>{ const free=Object.keys(nf).filter(k=>!sl[k].p); if(!free.length) return;
    free.sort((a,b)=>Math.hypot(nf[a][0]-xy[0],nf[a][1]-xy[1])-Math.hypot(nf[b][0]-xy[0],nf[b][1]-xy[1])); sl[free[0]].p=p; });
  return sl;
}
const tacShort = n => { n=String(n||""); return n.length>13 ? n.split(" ").map((w,i,a)=>i<a.length-1?w[0]+".":w).join(" ") : n; };

/* ---- campo em SVG (o mesmo no ecrã e na imagem PNG) ---- */
function tacSVG(t,{png=false,move=false,sel=""}={}){
  const hd=png?78:0, W=TW, H=TH+hd;
  const lines=`<g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5">
    <rect x="20" y="${20+hd}" width="${W-40}" height="${TH-40}"/><line x1="20" x2="${W-20}" y1="${TH/2+hd}" y2="${TH/2+hd}"/><circle cx="${W/2}" cy="${TH/2+hd}" r="74"/>
    <rect x="${W/2-165}" y="${20+hd}" width="330" height="140"/><rect x="${W/2-75}" y="${20+hd}" width="150" height="48"/><path d="M${W/2-66} ${160+hd} A 74 74 0 0 0 ${W/2+66} ${160+hd}"/>
    <rect x="${W/2-165}" y="${TH-160+hd}" width="330" height="140"/><rect x="${W/2-75}" y="${TH-68+hd}" width="150" height="48"/><path d="M${W/2-66} ${TH-160+hd} A 74 74 0 0 1 ${W/2+66} ${TH-160+hd}"/></g>
    <circle cx="${W/2}" cy="${TH/2+hd}" r="3.5" fill="rgba(255,255,255,.7)"/>`;
  const stripes=[...Array(10)].map((_,i)=>i%2?"":`<rect x="20" y="${20+hd+i*(TH-40)/10}" width="${W-40}" height="${(TH-40)/10}" fill="#3a7446"/>`).join("");
  const nome=p=>tacShort(p.name);
  const slot=k=>{ const s=t.sl[k]||{}, z=tacZone(k), [cx,cy0]=tacPx(tacXY(t,k)), cy=cy0+hd, p=s.p?P(s.p):null, du=TAC_DUT[s.d]||TAC_DUT.apo, ro=s.r||TAC_DEF[z][0];
    const av=p?avail(p.id):"ok", nm=p?nome(p):"—", cw=132, top=cy+16, gk=z==="gk";
    const shirt=`<use href="#${gk?"tacGk":"tacKit"}" transform="translate(${cx} ${cy-12}) scale(.95)"/>
      <text x="${cx}" y="${cy+6}" text-anchor="middle" font-size="21" font-weight="800" fill="${gk?"#1d3d12":"#fff"}"${gk?"":` stroke="#2a0a12" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"`} font-family="Barlow Condensed,Arial Narrow,sans-serif">${p&&p.n!=null?esc(p.n):""}</text>`;
    const warn=av!=="ok"?`<circle cx="${cx+24}" cy="${cy-20}" r="8" fill="${av==="les"?"#d93636":"#f2bd4b"}" stroke="#fff" stroke-width="1.5"/>`:"";
    const long=nm.length>11;
    return `<g class="ts${sel===k?" on":""}" data-k="${k}"${move||png?"":` data-a="tacSlot" role="button" tabindex="0" aria-label="${esc(TAC_POS[k][0])}: ${esc(p?p.name:"sem atleta")}"`}>
      ${shirt}${warn}
      <rect x="${cx-cw/2}" y="${top}" width="${cw}" height="62" rx="8" fill="#23473a" stroke="${sel===k?"#f2bd4b":"rgba(0,0,0,.25)"}" stroke-width="${sel===k?3:1}"/>
      <path d="M${cx-cw/2} ${top+8} a8 8 0 0 1 8 -8 h${cw-16} a8 8 0 0 1 8 8 v22 h-${cw} z" fill="${TAC_ZC[z]}"/>
      <text x="${cx}" y="${top+22}" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" font-family="Barlow,Arial,sans-serif">${esc(ro)} - <tspan fill="${du.c}">${du.l}</tspan></text>
      <text x="${cx}" y="${top+52}" text-anchor="middle" font-size="19" font-weight="700" fill="${p?"#fff":"rgba(255,255,255,.55)"}" font-family="Barlow,Arial,sans-serif"${long?` textLength="${cw-12}" lengthAdjust="spacingAndGlyphs"`:""}>${esc(nm)}</text></g>`; };
  const head=png?`<rect width="${W}" height="${hd}" fill="#3d0914"/><image href="${CREST}" x="18" y="10" width="58" height="58"/>
    <text x="88" y="38" font-size="26" font-weight="800" fill="#fff" font-family="Barlow,Arial,sans-serif">${esc(t.name||"Esquema tático")}</text>
    <text x="88" y="62" font-size="17" font-weight="600" fill="#f2bd4b" font-family="Barlow,Arial,sans-serif">${esc(t.form||"")}${meta().team?" · "+esc(meta().team):""}</text>`:"";
  return `<svg class="tac${move?" move":""}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Esquema ${esc(t.form||"")}">
    ${TAC_KIT}${head}<rect y="${hd}" width="${W}" height="${TH}" fill="#43824f"/>${stripes}${lines}${Object.keys(TAC_FORMS[t.form]||{}).map(slot).join("")}</svg>`;
}

/* ---- separador ---- */
function vTat(sub){
  const list=tactics();
  let id=S.tacId&&D.tactics[S.tacId]?S.tacId:(list[0]&&list[0].id);
  const bar=`<div class="bar"><h2>Plantel</h2>${sub}<span class="sp"></span><button class="btn primary" data-a="tacNew">+ Novo esquema</button></div>`;
  if(!id) return bar+`<div class="empty"><b>Ainda sem esquemas táticos</b>Cria um esquema: escolhe a formação, a função e a missão de cada posição e quem joga lá.<div style="margin-top:12px"><button class="btn primary" data-a="tacNew">+ Criar esquema</button></div></div>`;
  const t={id,...D.tactics[id]}, form=TAC_FORMS[t.form]?t.form:"4-2-3-1";
  if(t.form!==form) t.form=form;
  const used=new Set(Object.values(t.sl||{}).map(s=>s.p).filter(Boolean));
  const rest=players().filter(p=>!used.has(p.id)), groups={};
  rest.forEach(p=>{ const g=GROUP(p.pos); (groups[g]=groups[g]||[]).push(p); });
  const nFill=Object.keys(TAC_FORMS[form]).filter(k=>(t.sl[k]||{}).p).length;
  return bar+`
  ${list.length>1?`<div class="chips" style="margin-bottom:12px">${list.map(x=>`<button class="chip ${x.id===id?"on":""}" data-a="tacPick" data-id="${esc(x.id)}">${esc(x.name||"Sem nome")}</button>`).join("")}</div>`:""}
  <div class="tac-grid">
    <section class="card tac-card"><div class="tac-top">
        <label class="fld tac-nm"><span>Esquema</span><input value="${esc(t.name||"")}" data-c="f" data-col="tactics" data-id="${esc(id)}" data-f="name" placeholder="ex.: Bloco médio"></label>
        <label class="fld tac-fm"><span>Formação</span>${sel("form",Object.keys(TAC_FORMS),form,`data-c="tacForm" data-id="${esc(id)}"`)}</label></div>
      <div class="tac-pitch">${tacSVG(t,{move:!!S.tacMove})}</div>
      <div class="tac-tools"><button class="btn sm${S.tacMove?" primary":""}" data-a="tacMove">${S.tacMove?"✓ Acabar de mover":"✥ Mover posições"}</button>${S.tacMove?`<button class="btn sm" data-a="tacReset" data-id="${esc(id)}">Repor posições</button>`:""}
        <button class="btn sm" data-a="tacFill" data-id="${esc(id)}">Preencher vazios</button><button class="btn sm" data-a="tacPng" data-id="${esc(id)}">Imagem</button><button class="btn sm" data-a="tacCopy" data-id="${esc(id)}">⧉ Duplicar</button><button class="btn sm ghost" data-a="tacDel" data-id="${esc(id)}">Apagar</button></div>
      <p class="small muted" style="margin:6px 14px 12px">${S.tacMove?"Arrasta as camisolas para ajustar as posições no campo.":"Toca numa posição para escolher o atleta, a função e a missão."} ${nFill}/${Object.keys(TAC_FORMS[form]).length} posições com atleta.</p></section>
    <div class="tac-side">
      <section class="card"><div class="card-h"><h3>Ideias do esquema</h3></div><div class="card-b">
        <label class="fld"><textarea data-c="f" data-col="tactics" data-id="${esc(id)}" data-f="notes" rows="5" placeholder="Comportamentos com e sem bola, referências de pressão, saída de bola…">${esc(t.notes||"")}</textarea></label></div></section>
      <section class="card"><div class="card-h"><h3>Funções no campo</h3></div><div class="list tac-roles">${Object.keys(TAC_FORMS[form]).map(k=>{ const s=t.sl[k]||{}, p=s.p?P(s.p):null, r=tacRole(s.r), du=TAC_DUT[s.d]||TAC_DUT.apo;
        return `<button class="li" data-a="tacSlot" data-k="${k}"><span class="tac-k">${k}</span><span class="main"><b>${esc(p?p.name:"—")}</b><small>${esc(r?r[1]:s.r||"")} · ${du.n}${s.ins?" · "+esc(s.ins):""}</small></span>${p&&avail(p.id)!=="ok"?`<span class="tag ${AV[avail(p.id)].c}">${AV[avail(p.id)].l}</span>`:""}</button>`; }).join("")}</div></section>
      <section class="card"><div class="card-h"><h3>Fora do onze</h3><span class="sub">${rest.length}</span></div><div class="card-b tac-rest">${rest.length?["GR","DEF","MED","ATA","X"].filter(g=>groups[g]).map(g=>`<div><span class="small muted">${GNAME[g]}</span><div>${groups[g].map(p=>`<span class="tag ${avail(p.id)==="ok"?"":AV[avail(p.id)].c}">${p.n!=null?esc(p.n)+" · ":""}${esc(p.name)}</span>`).join(" ")}</div></div>`).join(""):`<span class="small muted">Todos os atletas estão no esquema.</span>`}</div></section>
    </div></div>`;
}

/* ---- janela de uma posição ---- */
function tacSlotForm(id,k){
  const t=clone(D.tactics[id]); if(!t) return;
  const s=t.sl[k]||{}, z=tacZone(k), fit=TAC_FIT[z]||[];
  const pls=players().slice().sort((a,b)=>(fit.includes(a.pos)?0:1)-(fit.includes(b.pos)?0:1)), where={};
  Object.entries(t.sl).forEach(([kk,v])=>{ if(v.p&&kk!==k) where[v.p]=kk; });
  const opts=[{v:"",l:"— sem atleta —"},...pls.map(p=>({v:p.id,l:`${p.n!=null?p.n+" · ":""}${p.name} (${p.pos||"–"})${avail(p.id)!=="ok"?" — "+AV[avail(p.id)].l.toLowerCase():""}${where[p.id]?" — está em "+where[p.id]:""}`}))];
  const mine=TAC_ROLES.filter(r=>r[2].includes(z)), other=TAC_ROLES.filter(r=>!r[2].includes(z));
  const roleSel=`<select name="r"><optgroup label="Para esta posição">${mine.map(r=>`<option value="${r[0]}" ${s.r===r[0]?"selected":""}>${r[0]} — ${esc(r[1])}</option>`).join("")}</optgroup><optgroup label="Outras">${other.map(r=>`<option value="${r[0]}" ${s.r===r[0]?"selected":""}>${r[0]} — ${esc(r[1])}</option>`).join("")}</optgroup></select>`;
  const body=`<div class="form">
    <label class="fld full">Atleta${sel("p",opts,s.p||"")}</label>
    <label class="fld">Função${roleSel}</label>
    <div class="fld"><span>Missão</span><div class="seg tac-du">${Object.entries(TAC_DUT).map(([dk,d])=>`<label><input type="radio" name="d" value="${dk}" ${(s.d||"apo")===dk?"checked":""}><span>${d.n}</span></label>`).join("")}</div></div>
    <label class="fld full">Instruções para esta posição<input name="ins" value="${esc(s.ins||"")}" placeholder="ex.: fecha por dentro, ataca a profundidade"></label></div>`;
  modal({title:`${TAC_POS[k][0]} <span class="muted" style="font-weight:600">(${k})</span>`,body,foot:footSave(),ctx:{save:()=>{
    const cur=clone(D.tactics[id]); if(!cur) return closeModal(); const sl=cur.sl, np=fv("p");
    const d=($('#dlg [name="d"]:checked')||{}).value||"apo";
    if(np){ const other=Object.keys(sl).find(kk=>kk!==k&&sl[kk].p===np); if(other){ if(sl[k].p) sl[other].p=sl[k].p; else delete sl[other].p; } }   // troca com a outra posição
    sl[k]={...sl[k],r:fv("r"),d}; if(np) sl[k].p=np; else delete sl[k].p;
    const ins=fv("ins"); if(ins) sl[k].ins=ins; else delete sl[k].ins;
    put("tactics",id,cur); closeModal(); }}});
}

/* ---- arrastar posições (modo "Mover posições") ---- */
let TAC_DRAG=null;
document.addEventListener("pointerdown",e=>{
  const g=e.target.closest&&e.target.closest("svg.tac.move g.ts"); if(!g) return;
  const svg=g.ownerSVGElement, id=S.tacId&&D.tactics[S.tacId]?S.tacId:(tactics()[0]||{}).id; if(!id) return;
  e.preventDefault(); try{ g.setPointerCapture(e.pointerId); }catch(er){}
  TAC_DRAG={g,svg,id,k:g.dataset.k,x0:e.clientX,y0:e.clientY,dx:0,dy:0};
});
document.addEventListener("pointermove",e=>{
  if(!TAC_DRAG) return; const r=TAC_DRAG.svg.getBoundingClientRect(), f=TW/r.width;
  TAC_DRAG.dx=(e.clientX-TAC_DRAG.x0)*f; TAC_DRAG.dy=(e.clientY-TAC_DRAG.y0)*f;
  TAC_DRAG.g.setAttribute("transform",`translate(${TAC_DRAG.dx} ${TAC_DRAG.dy})`);
});
const tacDrop=()=>{ const d=TAC_DRAG; TAC_DRAG=null; if(!d||(Math.abs(d.dx)<3&&Math.abs(d.dy)<3)){ if(d) d.g.removeAttribute("transform"); return; }
  const t=clone(D.tactics[d.id]); if(!t) return; const [x,y]=tacXY(t,d.k);
  const nx=Math.max(4,Math.min(96,x+d.dx/(TW-40)*100)), ny=Math.max(3,Math.min(94,y+d.dy/(TH-100)*100));
  t.sl[d.k]={...t.sl[d.k],x:Math.round(nx*10)/10,y:Math.round(ny*10)/10}; put("tactics",d.id,t); };
document.addEventListener("pointerup",tacDrop); document.addEventListener("pointercancel",tacDrop);

async function tacPngBlob(t,scale=2){
  return new Promise((res,rej)=>{ const s=tacSVG(t,{png:true}), img=new Image(), H=TH+78;
    img.onload=()=>{ const c=document.createElement("canvas"); c.width=TW*scale; c.height=H*scale; c.getContext("2d").drawImage(img,0,0,c.width,c.height); c.toBlob(b=>b?res(b):rej(new Error("png")),"image/png"); };
    img.onerror=()=>rej(new Error("svg")); img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(s); });
}

Object.assign(A,{
  tacNew: () => { const id=uid("tac"), n=tactics().length; put("tactics",id,{name:n?`Esquema ${n+1}`:"Esquema principal",form:"4-2-3-1",sl:tacNew("4-2-3-1"),notes:""}); S.tacId=id; S.plsub="tat"; render(); },
  tacPick: el => { S.tacId=el.dataset.id; S.tacMove=false; render(); },
  tacSlot: el => { const id=S.tacId&&D.tactics[S.tacId]?S.tacId:(tactics()[0]||{}).id; if(id) tacSlotForm(id,el.dataset.k); },
  tacMove: () => { S.tacMove=!S.tacMove; render(); },
  tacReset: el => { const t=clone(D.tactics[el.dataset.id]); if(!t) return; Object.values(t.sl).forEach(s=>{ delete s.x; delete s.y; }); put("tactics",el.dataset.id,t); toast("Posições repostas"); },
  tacFill: el => { const t=clone(D.tactics[el.dataset.id]); if(!t) return;
    const used=new Set(Object.values(t.sl).map(s=>s.p).filter(Boolean)), keys=Object.keys(TAC_FORMS[t.form]||{}).filter(k=>!(t.sl[k]||{}).p);
    let n=0; [["ok"],["ok","cond"]].forEach(ok=>[0,1].forEach(pass=>keys.forEach(k=>{ if(t.sl[k].p) return; const fit=TAC_FIT[tacZone(k)];
      const c=players().filter(p=>!used.has(p.id)&&ok.includes(avail(p.id))&&(pass?fit.some(f=>String(p.pos||"").includes(f.split("/")[0])):fit.includes(p.pos)))
        .sort((a,b)=>fit.indexOf(a.pos)-fit.indexOf(b.pos))[0];
      if(c){ t.sl[k].p=c.id; used.add(c.id); n++; } })));
    if(!n) return toast(keys.length?"Não há atletas disponíveis para as posições vazias.":"Todas as posições já têm atleta.");
    put("tactics",el.dataset.id,t); toast(`${n} posição(ões) preenchida(s) com atletas disponíveis`); },
  tacCopy: el => { const s=D.tactics[el.dataset.id]; if(!s) return; const names=new Set(tactics().map(x=>x.name)); let nm=`${s.name||"Esquema"} (cópia)`, i=2; while(names.has(nm)) nm=`${s.name||"Esquema"} (cópia ${i++})`;
    const id=uid("tac"); put("tactics",id,{...clone(s),name:nm}); S.tacId=id; toast(`Cópia criada: ${nm}`); },
  tacDel: el => { const id=el.dataset.id, t=D.tactics[id]; if(!t) return; askConfirm(`Apagar o esquema "${t.name||""}"?`,"Apagar",true).then(ok=>{ if(!ok) return; del("tactics",id); S.tacId=null; S.tacMove=false; render(); }); },
  tacPng: async el => { const t=D.tactics[el.dataset.id]; if(!t) return; try{ await saveBlob(await tacPngBlob(t),(slug(t.name||"esquema")||"esquema")+"-"+t.form+".png","image/png"); }catch(e){ console.error(e); toast("Não foi possível criar a imagem."); } }
});
Object.assign(Cg,{
  tacForm: el => { const id=el.dataset.id, t=clone(D.tactics[id]); if(!t||!TAC_FORMS[el.value]) return; t.sl=tacRemap(t,el.value); t.form=el.value; put("tactics",id,t); }
});
