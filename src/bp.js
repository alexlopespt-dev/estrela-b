/* ================= bolas paradas: quadro tático ================= */
// Campo igual ao modelo da equipa ("Livres Laterais Ofensivos"): meio-campo ofensivo com a baliza em cima, relva com faixas,
// círculos brancos com o nome por baixo. Coordenadas em 1000x682 (metade da imagem original, 2000x1364).
// Documento (coleção setpieces): {name, type, notes, tt:bool (título no campo), fr:[{it:[...]}]}  — fr = passos (animação)
// Itens (k = id do item, liga o mesmo elemento entre passos):
//   {t:"p",x,y,n,pid?,num?,c}  jogador (c: w branco = nós, r/b/k/y = outras cores)   {t:"g",x,y,n?}  GR
//   {t:"ball",x,y}  {t:"cone",x,y}  {t:"txt",x,y,s,c?}  {t:"zone",x,y,w,h,sh:"r"|"e",c}
//   {t:"ar",s:"pass"|"run"|"drib",x1,y1,x2,y2,cx,cy,c?}  seta (cx,cy = ponto de controlo da curva)
const BW=1000, BH=682;
const BP_CREST="__BPCREST__";   // emblema pequeno (80 px, fundo transparente) no canto do campo
const BP_TYPES = [
  {k:"lof",l:"Livre ofensivo",t:"Livres Ofensivos"},
  {k:"ldf",l:"Livre defensivo",t:"Livres Defensivos"},
  {k:"cco",l:"Canto ofensivo curto",t:"Canto Ofensivo Curto"},
  {k:"clo",l:"Canto ofensivo longo",t:"Canto Ofensivo Longo"},
  {k:"pen",l:"Penálti",t:"Penálti"},
  {k:"lan",l:"Lançamento",t:"Lançamento Lateral"}
];
const BPT = k => BP_TYPES.find(t=>t.k===k) || BP_TYPES[0];
const BP_COL = {w:{f:"#ffffff",s:"#0b0b0b",l:"Branco"},r:{f:"#d62839",s:"#3a0710",l:"Vermelho"},b:{f:"#1f5fd1",s:"#0a1d44",l:"Azul"},
  k:{f:"#1b1b1d",s:"#f4f4f4",l:"Preto"},y:{f:"#f7c531",s:"#3d2b00",l:"Amarelo"}};
const BP_ARC = {pass:{l:"Passe / cruzamento",c:"#ffffff"},run:{l:"Movimento",c:"#ffe14d"},drib:{l:"Condução",c:"#9ed3ff"}};
const BP_ZC = {y:"#ffe14d",r:"#ff5a6a",b:"#6fb2ff",w:"#ffffff"};
const BP_TOOLS = [
  {k:"sel",l:"Mover",ic:"✥"},{k:"p",l:"Jogador",ic:"●",st:"color:#fff;-webkit-text-stroke:1px #000"},{k:"o",l:"Adversário",ic:"●",st:"color:#d62839"},
  {k:"g",l:"GR",ic:"◉",st:"color:#2e9a2a"},{k:"wall",l:"Barreira",ic:"⁝⁝",st:"color:#d62839"},{k:"ball",l:"Bola",ic:"⚽"},{k:"cone",l:"Cone",ic:"▲",st:"color:#ff8a1f"},
  {k:"pass",l:"Passe",ic:"➝"},{k:"run",l:"Movimento",ic:"⇢",st:"color:#c9a400"},{k:"drib",l:"Condução",ic:"〰",st:"color:#3d8fd6"},
  {k:"zone",l:"Zona",ic:"▭",st:"color:#c9a400"},{k:"txt",l:"Texto",ic:"T"},{k:"del",l:"Apagar",ic:"✕"}
];
const setpieces = () => Object.entries(D.setpieces||{}).map(([id,x])=>({id,...x})).sort((a,b)=>BP_TYPES.findIndex(t=>t.k===a.type)-BP_TYPES.findIndex(t=>t.k===b.type)||String(a.name).localeCompare(String(b.name),"pt"));

/* ---- campo ---- */
function bpDefs(){
  return `<defs>
    <filter id="bpSh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.3" flood-color="#000" flood-opacity=".45"/></filter>
    <filter id="bpHalo" x="-20%" y="-40%" width="140%" height="180%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d"/><feGaussianBlur in="d" stdDeviation="1.3" result="b"/><feFlood flood-color="#d6e3cf" flood-opacity=".95"/><feComposite in2="b" operator="in" result="h"/><feMerge><feMergeNode in="h"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="bpTs" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity=".55"/></filter>
    <radialGradient id="bpGr" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#eef8ea"/><stop offset=".55" stop-color="#8fd08a"/><stop offset="1" stop-color="#2f9a2b"/></radialGradient>
    <pattern id="bpNet" width="9" height="7.8" patternUnits="userSpaceOnUse"><path d="M2.25 0h4.5l2.25 3.9-2.25 3.9h-4.5L0 3.9z" fill="none" stroke="#fff" stroke-width=".9"/></pattern>
    ${[...new Set([...Object.values(BP_ARC).map(a=>a.c),...Object.values(BP_ZC)])].map(c=>`<marker id="bpAh${c.slice(1)}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join("")}
  </defs>`;
}
function bpPitch(){
  const L='stroke="#fff" stroke-width="1.9" fill="none"';
  let s=`<rect width="${BW}" height="${BH}" fill="#0aa105"/>`;
  [55,215,375,535].forEach(y=>s+=`<rect x="55" y="${y}" width="890" height="80" fill="#068f03"/>`);
  // baliza (rede em favo, como no modelo)
  s+=`<rect x="440" y="22" width="121" height="33" fill="#1f8d1a"/><rect x="440" y="22" width="121" height="33" fill="url(#bpNet)" opacity=".9"/>`;
  s+=`<path d="M440 55V24.5L443 21.5H558L561 24.5V55" fill="none" stroke="#fff" stroke-width="1.8"/><line x1="440" y1="24.5" x2="561" y2="24.5" stroke="#fff" stroke-width="1"/>`;
  s+=`<path d="M55 ${BH}V55H945V${BH}" ${L}/>`;
  s+=`<rect x="162.5" y="55" width="676" height="272.5" ${L}/><rect x="347" y="55" width="306.5" height="90" ${L}/>`;
  s+=`<circle cx="500" cy="237" r="2.6" fill="#fff"/>`;
  s+=`<path d="M378.5 327.5A151.5 151.5 0 0 0 621.5 327.5" ${L}/>`;
  s+=`<path d="M355.5 ${BH}A155.2 155.2 0 0 1 644.5 ${BH}" ${L}/>`;
  s+=`<path d="M55 71A16 16 0 0 0 71 55M929 55A16 16 0 0 0 945 71" ${L}/>`;
  s+=`<line x1="440" y1="55" x2="561" y2="55" stroke="#fff" stroke-width="3"/>`;
  return s;
}

/* ---- elementos ---- */
const bpN = v => Math.round((+v||0)*10)/10;
function bpArrowPath(a){
  const x1=bpN(a.x1),y1=bpN(a.y1),x2=bpN(a.x2),y2=bpN(a.y2);
  const cx=a.cx==null?(x1+x2)/2:bpN(a.cx), cy=a.cy==null?(y1+y2)/2:bpN(a.cy);
  if(a.s!=="drib") return `M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`;
  // condução: linha ondulada ao longo da curva (a última parte fica direita para a ponta da seta)
  const q=t=>({x:(1-t)*(1-t)*x1+2*(1-t)*t*cx+t*t*x2, y:(1-t)*(1-t)*y1+2*(1-t)*t*cy+t*t*y2});
  let len=0, prev=q(0); for(let i=1;i<=20;i++){ const p=q(i/20); len+=Math.hypot(p.x-prev.x,p.y-prev.y); prev=p; }
  const n=Math.max(8,Math.round(len/4)), waves=Math.max(1,Math.round(len/22)), out=[];
  for(let i=0;i<=n;i++){ const t=i/n, p=q(t), p2=q(Math.min(1,t+0.01)), p1=q(Math.max(0,t-0.01));
    let dx=p2.x-p1.x, dy=p2.y-p1.y; const d=Math.hypot(dx,dy)||1; dx/=d; dy/=d;
    const amp = t>0.86 ? 0 : 5*Math.sin(t*waves*2*Math.PI);
    out.push(`${Math.round((p.x-dy*amp)*10)/10} ${Math.round((p.y+dx*amp)*10)/10}`); }
  return "M"+out.join("L");
}
function bpLabel(x,y,txt,dy=24){
  if(!txt) return "";
  return `<text x="${x}" y="${y+dy}" text-anchor="middle" font-family="'Open Sans','Segoe UI',Arial,sans-serif" font-size="13.5" font-weight="700" fill="#06110a" filter="url(#bpHalo)">${esc(txt)}</text>`;
}
function bpItemSVG(it,o={}){
  const hit = o.hit ? `data-k="${esc(it.k)}" class="bpi"` : "", x=bpN(it.x), y=bpN(it.y);
  const sel = o.sel ? " bpsel" : "", op = o.op!=null && o.op<1 ? ` opacity="${Math.round(o.op*100)/100}"` : "";
  if(it.t==="p"){
    const c=BP_COL[it.c]||BP_COL.w;
    return `<g ${hit}${op}>${o.hit?`<circle cx="${x}" cy="${y}" r="22" fill="transparent"/>`:""}${o.sel?`<circle class="bpring" cx="${x}" cy="${y}" r="19"/>`:""}
      <circle cx="${x}" cy="${y}" r="13" fill="${c.f}" stroke="${c.s}" stroke-width="2.6" filter="url(#bpSh)"/>
      ${it.num!=null&&it.num!==""?`<text x="${x}" y="${y+4.3}" text-anchor="middle" font-family="'Open Sans',Arial,sans-serif" font-size="12" font-weight="800" fill="${it.c==="w"||it.c==="y"||!it.c?"#111":"#fff"}">${esc(it.num)}</text>`:""}
      ${bpLabel(x,y,it.n)}</g>`;
  }
  if(it.t==="g"){
    return `<g ${hit}${op}>${o.hit?`<circle cx="${x}" cy="${y}" r="22" fill="transparent"/>`:""}${o.sel?`<circle class="bpring" cx="${x}" cy="${y}" r="19.5"/>`:""}
      <circle cx="${x}" cy="${y}" r="13" fill="url(#bpGr)" stroke="#0b0b0b" stroke-width="3.2" filter="url(#bpSh)"/>
      <text x="${x}" y="${y+4.4}" text-anchor="middle" font-family="'Open Sans',Arial,sans-serif" font-size="12.5" font-weight="800" fill="#0b150b">GR</text>${bpLabel(x,y,it.n)}</g>`;
  }
  if(it.t==="ball") return `<g ${hit}${op}>${o.hit?`<circle cx="${x}" cy="${y}" r="16" fill="transparent"/>`:""}${o.sel?`<circle class="bpring" cx="${x}" cy="${y}" r="11"/>`:""}
      <circle cx="${x}" cy="${y}" r="5.4" fill="#fff" stroke="#111" stroke-width="1.2"/><path d="M${x} ${y-2.1}l2 1.45-.76 2.35h-2.48l-.76-2.35z" fill="#111"/>
      <path d="M${x} ${y-2.1}V${y-5}M${x+2} ${y-.65}l2.9-.9M${x+1.24} ${y+1.7}l1.7 2.4M${x-1.24} ${y+1.7}l-1.7 2.4M${x-2} ${y-.65}l-2.9-.9" stroke="#111" stroke-width=".8"/></g>`;
  if(it.t==="cone") return `<g ${hit}${op}>${o.hit?`<circle cx="${x}" cy="${y}" r="16" fill="transparent"/>`:""}${o.sel?`<circle class="bpring" cx="${x}" cy="${y}" r="14"/>`:""}<path d="M${x} ${y-9}L${x+8} ${y+7}H${x-8}z" fill="#ff8a1f" stroke="#fff" stroke-width="1.4"/></g>`;
  if(it.t==="txt"){
    const col=BP_ZC[it.c]||"#fff";
    return `<g ${hit}${op}>${o.sel?`<rect class="bpring" x="${x-6}" y="${y-19}" width="${Math.max(30,String(it.s||"").length*9.5)+12}" height="26" rx="5"/>`:""}<text x="${x}" y="${y}" font-family="'Open Sans','Segoe UI',Arial,sans-serif" font-size="${it.fs||17}" font-weight="700" fill="${col}" filter="url(#bpTs)">${esc(it.s||"Texto")}</text></g>`;
  }
  if(it.t==="zone"){
    const col=BP_ZC[it.c]||BP_ZC.y, w=Math.abs(+it.w||0), h=Math.abs(+it.h||0), zx=Math.min(x,x+(+it.w||0)), zy=Math.min(y,y+(+it.h||0));
    const shape = it.sh==="e" ? `<ellipse cx="${bpN(zx+w/2)}" cy="${bpN(zy+h/2)}" rx="${bpN(w/2)}" ry="${bpN(h/2)}"` : `<rect x="${bpN(zx)}" y="${bpN(zy)}" width="${bpN(w)}" height="${bpN(h)}" rx="4"`;
    return `<g ${hit}${op}>${shape} fill="${col}" fill-opacity=".22" stroke="${col}" stroke-width="2" stroke-dasharray="8 6"/>${o.sel?`${shape} class="bpring" fill="none"/><circle class="bph" data-k="${esc(it.k)}" data-h="rs" cx="${bpN(zx+w)}" cy="${bpN(zy+h)}" r="9"/>`:""}</g>`;
  }
  if(it.t==="ar"){
    const s=BP_ARC[it.s]?it.s:"pass", col=it.c?(BP_ZC[it.c]||BP_ARC[s].c):BP_ARC[s].c, d=bpArrowPath(it);
    const dash = s==="run" ? ` stroke-dasharray="9 7"` : "";
    let hs="";
    if(o.sel){ const cx=it.cx==null?(it.x1+it.x2)/2:it.cx, cy=it.cy==null?(it.y1+it.y2)/2:it.cy, mx=bpN(0.25*it.x1+0.5*cx+0.25*it.x2), my=bpN(0.25*it.y1+0.5*cy+0.25*it.y2);
      hs=`<circle class="bph" data-k="${esc(it.k)}" data-h="p1" cx="${bpN(it.x1)}" cy="${bpN(it.y1)}" r="8"/><circle class="bph" data-k="${esc(it.k)}" data-h="p2" cx="${bpN(it.x2)}" cy="${bpN(it.y2)}" r="8"/><circle class="bph bphc" data-k="${esc(it.k)}" data-h="c" cx="${mx}" cy="${my}" r="8"/>`; }
    return `<g ${hit}${op}>${o.hit?`<path d="${bpArrowPath({...it,s:"pass"})}" fill="none" stroke="transparent" stroke-width="24"/>`:""}${o.sel?`<path class="bpring" d="${d}" fill="none"/>`:""}<path d="${d}" fill="none" stroke="${col}" stroke-width="${s==="drib"?2.4:2.8}" stroke-linecap="round" stroke-linejoin="round"${dash} marker-end="url(#bpAh${col.slice(1)})"/>${hs}</g>`;
  }
  return "";
}
const bpOrder = t => t==="zone"?0 : t==="ar"?1 : t==="txt"?3 : 2;
function bpItemsSVG(items,o={}){
  return (items||[]).slice().sort((a,b)=>bpOrder(a.t)-bpOrder(b.t)).map(it=>bpItemSVG(it,{hit:o.hit,sel:o.sel===it.k,op:o.ops&&o.ops[it.k]})).join("");
}
function bpTitle(b){ return b.tt===false||!b.name ? "" : `<text x="64" y="54" font-family="'Open Sans','Segoe UI',Arial,sans-serif" font-size="23" font-weight="600" fill="#fff" filter="url(#bpTs)">${esc(b.name)}</text>`; }
function bpSVG(b,fi=0,o={}){
  const fr=(b.fr||[])[fi]||{it:[]};
  return `<svg ${o.id?`id="${o.id}"`:""} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BH}" ${o.w?`width="${o.w}" height="${Math.round(o.w*BH/BW)}"`:""} class="bpsvg" role="img" aria-label="${esc(b.name||"Bola parada")}">${bpDefs()}${bpPitch()}<image href="${BP_CREST}" x="902" y="5" width="36" height="48.6" preserveAspectRatio="xMidYMid meet"/><g${o.id?` id="${o.id}T"`:""}>${bpTitle(b)}</g><g${o.id?` id="${o.id}I"`:""}>${bpItemsSVG(fr.it,{hit:o.hit,sel:o.sel})}</g></svg>`;
}

/* ---- modelos por tipo ---- */
function bpTemplate(type){
  const P=(x,y,n="")=>({t:"p",x,y,n,c:"w"}), O=(x,y,n="")=>({t:"p",x,y,n,c:"r"}), G=(x,y)=>({t:"g",x,y}), B=(x,y)=>({t:"ball",x,y});
  const AR=(s,x1,y1,x2,y2,cx,cy)=>({t:"ar",s,x1,y1,x2,y2,cx:cx==null?(x1+x2)/2:cx,cy:cy==null?(y1+y2)/2:cy});
  let it=[];
  if(type==="lof") it=[G(500,79),P(296,335),P(361,334),P(421,334),P(474,334),P(530,334),P(892,356),P(248,411),P(858,508),B(814,502),P(388,637),P(621,637)];
  else if(type==="ldf"){
    const bx=640, by=545, dx=500-bx, dy=55-by, d=Math.hypot(dx,dy), ux=dx/d, uy=dy/d, wx=bx+151*ux, wy=by+151*uy;
    it=[G(500,79),B(bx,by),O(bx+14,by+26)];
    [-1.5,-0.5,0.5,1.5].forEach(k=>it.push(P(Math.round(wx-uy*27*k),Math.round(wy+ux*27*k))));
    it.push(P(330,285),P(410,280),P(490,275),P(570,280),P(650,285),P(760,470));
    it.push(O(360,320),O(440,318),O(520,316),O(600,318),O(790,500));
  }
  else if(type==="cco") it=[G(500,79),B(938,60),P(956,44),P(872,112),AR("pass",938,60,878,108),
    P(425,215),P(500,190),P(578,212),P(650,262),P(560,350),P(420,352),P(380,610),P(620,610),
    O(468,112),O(540,118),O(440,188),O(528,160),O(612,178),O(846,148)];
  else if(type==="clo") it=[G(500,79),B(938,60),P(956,44),AR("pass",938,60,540,128,730,-20),
    P(420,300),P(480,318),P(560,308),P(625,290),AR("run",420,300,430,128),AR("run",480,318,505,160),AR("run",560,308,585,122),AR("run",625,290,560,225),
    P(500,392),P(650,380),P(380,610),P(620,610),O(445,100),O(505,108),O(565,100),O(470,170),O(540,168)];
  else if(type==="pen") it=[G(500,58),B(500,237),P(500,272),P(345,338),P(410,346),P(590,346),P(655,338),P(300,430),P(700,430),
    O(378,344),O(622,344),O(445,350),O(555,350)];
  else if(type==="lan") it=[B(947,404),P(963,420),P(880,356),P(884,478),P(820,420),P(740,330),AR("run",884,478,905,560),AR("pass",948,420,900,552,950,500),
    O(868,382),O(870,500),O(800,445),O(730,355)];
  return it.map((x,i)=>({k:"i"+(i+1),...x}));
}
// cópia de uma bola parada (ex.: o mesmo canto com outras setas): "Nome (cópia)", "Nome (cópia 2)"…
function bpCopyDoc(src){
  const o=clone(src), base=String(o.name||BPT(o.type).t).replace(/ \(cópia(?: \d+)?\)$/,""), names=new Set(setpieces().map(b=>b.name));
  let nm=base+" (cópia)", i=2; while(names.has(nm)) nm=base+` (cópia ${i++})`;
  o.name=nm; const id=uid("bp_"); put("setpieces",id,o); return id;
}
function bpNewDoc(type,name){ return {name:name||BPT(type).t, type, notes:"", tt:true, fr:[{it:bpTemplate(type)}]}; }

/* ---- separador ---- */
function vBP(){
  const all=setpieces(), f=S.bpT||"";
  const list=f?all.filter(b=>b.type===f):all;
  const cnt=k=>all.filter(b=>b.type===k).length;
  const card=b=>`<div class="bpcard"><button class="bpc-open" data-a="bpOpen" data-id="${esc(b.id)}">${bpSVG(b,0)}<span class="bpc-b"><b>${esc(b.name||"Sem nome")}</b><small>${esc(BPT(b.type).l)}${(b.fr||[]).length>1?` · ${(b.fr||[]).length} passos`:""}</small>${b.notes?`<small class="muted bpc-n">${esc(b.notes)}</small>`:""}</span></button>
    <div class="bpc-f"><button class="btn sm" data-a="bpCopy" data-id="${esc(b.id)}" title="Cria uma cópia para alterar só o que queres">⧉ Duplicar</button></div></div>`;
  const groups = f ? [BPT(f)] : BP_TYPES.filter(t=>cnt(t.k));
  return `
  <div class="bar"><h2 style="margin:0;flex:1">Bolas paradas</h2>
    ${all.length?`<button class="btn" data-a="bpPrintAll">Imprimir / PDF</button>`:""}<button class="btn primary" data-a="bpNew">+ Nova bola parada</button></div>
  <div class="seg" style="margin:4px 0 14px"><button data-a="bpFilter" data-k="" class="${!f?"on":""}">Todas (${all.length})</button>${BP_TYPES.map(t=>`<button data-a="bpFilter" data-k="${t.k}" class="${f===t.k?"on":""}">${t.l}${cnt(t.k)?` (${cnt(t.k)})`:""}</button>`).join("")}</div>
  ${!list.length ? `<div class="empty"><b>${f?"Ainda não há "+esc(BPT(f).l.toLowerCase())+".":"Ainda não há bolas paradas."}</b>Cria uma a partir do modelo: livres ofensivos e defensivos, cantos curtos e longos, penáltis e lançamentos.<br><br><button class="btn primary" data-a="bpNew" data-k="${esc(f)}">+ Nova bola parada</button></div>`
    : groups.map(t=>`<section style="margin-bottom:18px"><div class="asec"><span>${esc(t.l)}</span><button class="btn sm" data-a="bpNew" data-k="${t.k}">+ ${esc(t.l)}</button></div><div class="bpgrid">${list.filter(b=>b.type===t.k).map(card).join("")}</div></section>`).join("")}`;
}
function bpNewForm(type){
  const body=`<div class="bptypes">${BP_TYPES.map(t=>`<button class="bptype${t.k===(type||"lof")?" on":""}" data-a="bpPickType" data-k="${t.k}">${bpSVG({name:"",fr:[{it:bpTemplate(t.k)}]},0)}<b>${esc(t.l)}</b></button>`).join("")}</div>
    <label class="fld full" style="margin-top:12px">Nome<input name="name" value="${esc(BPT(type||"lof").t)}" maxlength="60"></label>`;
  modal({title:"Nova bola parada",sub:"Escolhe o tipo: começa com a colocação do modelo, que depois alteras à vontade.",body,foot:footSave("Criar e abrir"),ctx:{bpType:type||"lof",
    save:()=>{ const id=uid("bp_"); put("setpieces",id,bpNewDoc(M.bpType,fv("name"))); bpEditor(id); }}});
}

/* ---- editor ---- */
function bpEditor(id){
  const src=D.setpieces[id]; if(!src) return toast("Esta bola parada já não existe.");
  const b=clone(src); b.fr=(b.fr&&b.fr.length)?b.fr:[{it:[]}]; b.fr.forEach(f=>f.it=f.it||[]);
  const body=`
    <div class="bptop">
      <input class="bpname inp" name="bpname" value="${esc(b.name||"")}" placeholder="Nome (aparece no campo)" maxlength="60" aria-label="Nome">
      ${sel("bptype",BP_TYPES.map(t=>({v:t.k,l:t.l})),b.type,'class="inp" aria-label="Tipo"')}
      <label class="bpchk"><input type="checkbox" name="bptt" ${b.tt!==false?"checked":""}> Título no campo</label>
      <span class="bpact"><button class="btn sm" data-a="bpUndo" title="Desfazer (Ctrl+Z)">↶ Desfazer</button><button class="btn sm" data-a="bpRedo" title="Refazer (Ctrl+Y)">↷ Refazer</button>
      <button class="btn sm" data-a="bpTpl">Repor modelo</button><button class="btn sm" data-a="bpCopyEd" title="Cria uma cópia desta bola parada e abre-a">⧉ Duplicar</button><button class="btn sm" data-a="bpPng">Imagem</button><button class="btn sm" data-a="bpPrint">PDF</button></span>
    </div>
    <div class="dtools bptools">${BP_TOOLS.map(t=>`<button data-a="bpTool" data-k="${t.k}" title="${t.l}"><span class="dic" style="${t.st||""}">${t.ic}</span>${t.l}</button>`).join("")}</div>
    <div class="bpmain">
      <div class="bpstage"><div class="bppitch" id="bpWrap">${bpSVG(b,0,{id:"bpS",hit:true})}</div>
        <div class="bpsteps" id="bpSteps"></div><div class="small muted" id="bpHint" style="margin-top:4px"></div></div>
      <aside class="bpside">
        <div id="bpProps"></div>
        <div class="qlbl" style="margin-top:12px"><span>Plantel</span></div><p class="small muted" style="margin:-2px 0 6px">Toca para pôr no campo, ou para dar o nome ao círculo escolhido.</p>
        <div class="bproster" id="bpRoster"></div>
        <label class="fld full" style="margin-top:12px">Notas / instruções<textarea name="bpnotes" rows="4" placeholder="Sinal, quem bate, movimentos, zonas de ataque…">${esc(b.notes||"")}</textarea></label>
      </aside>
    </div>`;
  modal({title:"Bola parada",sub:esc(BPT(b.type).l),big:true,body,foot:footSave("Guardar","Eliminar"),ctx:{bp:b,bpId:id,fi:0,tool:"sel",selK:null,hist:[],fut:[],
    save:()=>{ bpStop(); const o=bpCollect(); put("setpieces",id,o); M.dirty=false; toast("Bola parada guardada"); closeModal(); },
    del:()=>askConfirm("Eliminar esta bola parada?","Eliminar",true).then(ok=>{ if(ok){ bpStop(); closeModal(); del("setpieces",id); toast("Bola parada eliminada"); } })
  }});
  $("#dlg").classList.add("bpdlg");
  bpBind(); bpRefresh(true);
}
function bpCollect(){
  const b=clone(M.bp);
  b.name=String(($("#dlg [name=bpname]")||{}).value||"").trim()||BPT(b.type).t;
  b.type=($("#dlg [name=bptype]")||{}).value||b.type;
  b.tt=!!($("#dlg [name=bptt]")||{}).checked;
  b.notes=String(($("#dlg [name=bpnotes]")||{}).value||"").trim();
  return b;
}
const bpItems = () => M.bp.fr[M.fi].it;
const bpFind = k => bpItems().find(x=>x.k===k);
function bpSnap(){ M.hist.push(JSON.stringify({fr:M.bp.fr,fi:M.fi})); if(M.hist.length>80) M.hist.shift(); M.fut=[]; M.dirty=true; }
function bpNextK(){ let n=0; M.bp.fr.forEach(f=>f.it.forEach(x=>{ const m=/^i(\d+)$/.exec(x.k); if(m) n=Math.max(n,+m[1]); })); return "i"+(n+1); }
function bpRefresh(all){
  if(!M||!M.bp) return;
  const svg=$("#bpS"); if(!svg) return;
  $("#bpSI").innerHTML=bpItemsSVG(bpItems(),{hit:true,sel:M.selK});
  if(all){
    $("#bpST").innerHTML=bpTitle({name:($("#dlg [name=bpname]")||{}).value, tt:($("#dlg [name=bptt]")||{}).checked});
    $$("#dlg [data-a=bpTool]").forEach(x=>x.classList.toggle("on",x.dataset.k===M.tool));
    const n=M.bp.fr.length;
    $("#bpSteps").innerHTML=`<span class="small muted" style="font-weight:700">Passos</span>${M.bp.fr.map((f,i)=>`<button class="bpstep${i===M.fi?" on":""}" data-a="bpFrame" data-k="${i}">${i+1}</button>`).join("")}
      <button class="btn sm" data-a="bpFrameAdd" title="Novo passo a partir deste">+ Passo</button>${n>1?`<button class="btn sm ghost" data-a="bpFrameDel">Apagar passo ${M.fi+1}</button><button class="btn sm primary" data-a="bpPlay">${M.play?"■ Parar":"▶ Animar"}</button>`:`<small class="muted">Acrescenta passos para mostrar os movimentos e depois anima.</small>`}`;
    bpProps(); bpRoster();
    const hints={sel:"Arrasta para mover. Toca num elemento para o editar; nas setas, arrasta o ponto do meio para curvar.",del:"Toca num elemento para o apagar.",pass:"Arrasta no campo para desenhar o passe ou cruzamento.",run:"Arrasta para desenhar o movimento (sem bola).",drib:"Arrasta para desenhar a condução.",zone:"Arrasta no campo para marcar a zona.",txt:"Toca no campo para escrever um texto.",wall:"Toca no campo onde fica o centro da barreira."};
    const h=$("#bpHint"); if(h) h.textContent=hints[M.tool]||"Toca no campo para colocar. Arrasta um elemento para o mover.";
  }
}
function bpProps(){
  const el=$("#bpProps"); if(!el) return;
  const it=M.selK?bpFind(M.selK):null;
  if(!it){ el.innerHTML=`<div class="qlbl"><span>Elemento</span></div><p class="small muted" style="margin:0">Toca num jogador, seta, zona ou texto para o editar. Teclado: Delete apaga, Ctrl+Z desfaz, Ctrl+D duplica.</p>`; return; }
  const sw=(cols,cur,f)=>`<div class="bpsw">${Object.entries(cols).map(([k,v])=>`<button data-a="bpSet" data-f="${f}" data-v="${k}" class="${cur===k?"on":""}" title="${esc(v.l||k)}" style="background:${v.f||v}"></button>`).join("")}</div>`;
  const lbl={p:"Jogador",g:"Guarda-redes",ball:"Bola",cone:"Cone",txt:"Texto",zone:"Zona",ar:"Seta"}[it.t]||"Elemento";
  let h=`<div class="qlbl"><span>${lbl}</span></div>`;
  if(it.t==="p"||it.t==="g") h+=`<label class="fld full">Nome (por baixo)<input data-bpf="n" value="${esc(it.n||"")}" maxlength="24"></label>`;
  if(it.t==="p") h+=`<label class="fld full">Número (dentro do círculo)<input data-bpf="num" value="${esc(it.num||"")}" maxlength="3" inputmode="numeric"></label>${sw(BP_COL,it.c||"w","c")}`;
  if(it.t==="txt") h+=`<label class="fld full">Texto<input data-bpf="s" value="${esc(it.s||"")}" maxlength="60"></label>${sw(Object.fromEntries(Object.entries(BP_ZC).map(([k,v])=>[k,{f:v}])),it.c||"w","c")}`;
  if(it.t==="zone") h+=`<div class="seg" style="margin-bottom:8px"><button data-a="bpSet" data-f="sh" data-v="r" class="${it.sh!=="e"?"on":""}">Retângulo</button><button data-a="bpSet" data-f="sh" data-v="e" class="${it.sh==="e"?"on":""}">Elipse</button></div>${sw(Object.fromEntries(Object.entries(BP_ZC).map(([k,v])=>[k,{f:v}])),it.c||"y","c")}`;
  if(it.t==="ar") h+=`<div class="seg" style="margin-bottom:8px">${Object.entries(BP_ARC).map(([k,a])=>`<button data-a="bpSet" data-f="s" data-v="${k}" class="${it.s===k?"on":""}">${a.l}</button>`).join("")}</div><button class="btn sm" data-a="bpStraight">Endireitar</button>`;
  h+=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" data-a="bpDup">Duplicar</button><button class="btn sm ghost" data-a="bpDelSel">Apagar</button></div>`;
  el.innerHTML=h;
}
function bpRoster(){
  const el=$("#bpRoster"); if(!el) return;
  const on=new Set(bpItems().filter(x=>x.pid).map(x=>x.pid)), names=new Set(bpItems().map(x=>x.n).filter(Boolean));
  const pl=players();
  el.innerHTML = pl.length ? pl.map(p=>`<button class="bprp${on.has(p.id)||names.has(p.name)?" on":""}" data-a="bpRoster" data-p="${esc(p.id)}"><i>${esc(p.n??"")}</i>${esc(p.name)}<small>${esc(p.pos||"")}</small></button>`).join("") : `<p class="small muted">Sem atletas no plantel.</p>`;
}
function bpBind(){
  const svg=$("#bpS"); let act=null;
  const pt=e=>{ const p=svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; const r=p.matrixTransform(svg.getScreenCTM().inverse()); return {x:Math.max(0,Math.min(BW,r.x)),y:Math.max(0,Math.min(BH,r.y))}; };
  const cap=e=>{ try{ svg.setPointerCapture(e.pointerId); }catch(err){} };
  svg.addEventListener("pointerdown",e=>{
    if(!M||!M.bp||M.play) return; e.preventDefault();
    const p=pt(e), hEl=e.target.closest("[data-h]"), g=e.target.closest("[data-k]"), k=g?g.dataset.k:null, T=M.tool, its=bpItems();
    if(hEl){ const keep={fut:M.fut.slice(),dirty:M.dirty}; bpSnap(); act={mode:"h",k:hEl.dataset.k,h:hEl.dataset.h,moved:false,keep}; cap(e); return; }
    if(T==="del"){ if(k){ bpSnap(); M.bp.fr[M.fi].it=its.filter(x=>x.k!==k); if(M.selK===k) M.selK=null; bpRefresh(true); } return; }
    if(k && (T==="sel"||!["pass","run","drib","zone"].includes(T))){
      const was=M.selK, keep={fut:M.fut.slice(),dirty:M.dirty}; M.selK=k; bpSnap(); act={mode:"drag",k,last:p,moved:false,was,keep}; cap(e); bpRefresh(was!==k); return; }
    if(T==="sel"){ if(M.selK){ M.selK=null; bpRefresh(true); } return; }
    if(["pass","run","drib"].includes(T)){ bpSnap(); const o={k:bpNextK(),t:"ar",s:T,x1:p.x,y1:p.y,x2:p.x,y2:p.y}; its.push(o); M.selK=o.k; act={mode:"line",k:o.k}; cap(e); bpRefresh(); return; }
    if(T==="zone"){ bpSnap(); const o={k:bpNextK(),t:"zone",x:p.x,y:p.y,w:0,h:0,sh:"r",c:"y"}; its.push(o); M.selK=o.k; act={mode:"zone",k:o.k}; cap(e); bpRefresh(); return; }
    bpSnap();
    if(T==="wall"){ // barreira: 4 adversários virados para a baliza
      const ux=500-p.x, uy=55-p.y, d=Math.hypot(ux,uy)||1;
      [-1.5,-0.5,0.5,1.5].forEach(i=>its.push({k:bpNextK(),t:"p",x:Math.round(p.x-uy/d*27*i),y:Math.round(p.y+ux/d*27*i),n:"",c:"r"}));
      M.selK=null; bpRefresh(true); return; }
    const o={k:bpNextK(),x:Math.round(p.x),y:Math.round(p.y)};
    if(T==="p"||T==="o"){ o.t="p"; o.c=T==="o"?"r":"w"; o.n=""; }
    else if(T==="g") o.t="g";
    else if(T==="txt"){ o.t="txt"; o.s="Texto"; o.c="w"; }
    else o.t=T;
    its.push(o); M.selK=o.k; bpRefresh(true);
    if(T==="txt"){ const inp=$("#bpProps [data-bpf=s]"); if(inp){ inp.focus(); inp.select(); } }
  });
  svg.addEventListener("pointermove",e=>{
    if(!act||!M||!M.bp) return; const p=pt(e), it=bpFind(act.k); if(!it) return;
    if(act.mode==="drag"){ const dx=p.x-act.last.x, dy=p.y-act.last.y; act.last=p; if(Math.abs(dx)+Math.abs(dy)>0) act.moved=true;
      if(it.t==="ar"){ it.x1+=dx; it.y1+=dy; it.x2+=dx; it.y2+=dy; if(it.cx!=null){ it.cx+=dx; it.cy+=dy; } } else { it.x+=dx; it.y+=dy; } }
    else if(act.mode==="line"){ it.x2=p.x; it.y2=p.y; it.cx=(it.x1+it.x2)/2; it.cy=(it.y1+it.y2)/2; }
    else if(act.mode==="zone"){ it.w=p.x-it.x; it.h=p.y-it.y; }
    else if(act.mode==="h"){ act.moved=true;
      if(act.h==="p1"){ const ox=it.x1, oy=it.y1; it.x1=p.x; it.y1=p.y; if(it.cx!=null){ it.cx+=(p.x-ox)/2; it.cy+=(p.y-oy)/2; } }
      else if(act.h==="p2"){ const ox=it.x2, oy=it.y2; it.x2=p.x; it.y2=p.y; if(it.cx!=null){ it.cx+=(p.x-ox)/2; it.cy+=(p.y-oy)/2; } }
      else if(act.h==="c"){ it.cx=2*p.x-(it.x1+it.x2)/2; it.cy=2*p.y-(it.y1+it.y2)/2; }   // a curva passa pelo ponto arrastado
      else if(act.h==="rs"){ const zx=Math.min(it.x,it.x+it.w), zy=Math.min(it.y,it.y+it.h); it.x=zx; it.y=zy; it.w=Math.max(12,p.x-zx); it.h=Math.max(12,p.y-zy); } }
    bpRefresh();
  });
  const end=()=>{
    if(!act||!M||!M.bp){ act=null; return; } const it=bpFind(act.k), its=bpItems();
    if(it && act.mode==="line" && Math.hypot(it.x2-it.x1,it.y2-it.y1)<18){ M.bp.fr[M.fi].it=its.filter(x=>x!==it); M.selK=null; M.hist.pop(); }
    if(it && act.mode==="zone"){ if(Math.abs(it.w)<14||Math.abs(it.h)<14){ M.bp.fr[M.fi].it=its.filter(x=>x!==it); M.selK=null; M.hist.pop(); }
      else { if(it.w<0){ it.x+=it.w; it.w=-it.w; } if(it.h<0){ it.y+=it.h; it.h=-it.h; } } }
    if((act.mode==="drag"||act.mode==="h") && !act.moved){ M.hist.pop(); M.fut=act.keep.fut; M.dirty=act.keep.dirty; }
    if(it && act.mode==="drag"){ ["x","y","x1","y1","x2","y2","cx","cy"].forEach(f=>{ if(it[f]!=null) it[f]=Math.round(it[f]); }); }
    act=null; bpRefresh(true);
  };
  svg.addEventListener("pointerup",end); svg.addEventListener("pointercancel",end);
  svg.addEventListener("dblclick",e=>{ const g=e.target.closest("[data-k]"); if(!g) return; M.selK=g.dataset.k; bpRefresh(true); const inp=$("#bpProps [data-bpf]"); if(inp){ inp.focus(); inp.select(); } });
  const pr=$("#bpProps");
  pr.addEventListener("focusin",e=>{ if(e.target.dataset.bpf){ bpSnap(); } });
  pr.addEventListener("input",e=>{ const f=e.target.dataset.bpf; if(!f) return; const it=bpFind(M.selK); if(!it) return;
    const v=e.target.value; if(v==="" && f!=="s") delete it[f]; else it[f]=v; if(f==="n") delete it.pid; bpRefresh(); bpRoster(); });
  ["bpname","bptt"].forEach(n=>{ const el=$(`#dlg [name=${n}]`); if(el) el.addEventListener("input",()=>bpRefresh(true)); if(el) el.addEventListener("change",()=>bpRefresh(true)); });
  const ty=$("#dlg [name=bptype]"); if(ty) ty.addEventListener("change",()=>{ M.bp.type=ty.value; M.dirty=true; const s=$("#dlg .dlg-h p"); if(s) s.textContent=BPT(ty.value).l; });
}
function bpKey(e){
  if(!M||!M.bp) return;
  const tag=(e.target&&e.target.tagName)||"", typing=/INPUT|TEXTAREA|SELECT/.test(tag);
  const mod=e.ctrlKey||e.metaKey, k=e.key.toLowerCase();
  if(mod && k==="z" && !typing){ e.preventDefault(); e.shiftKey?A.bpRedo():A.bpUndo(); return; }
  if(mod && k==="y" && !typing){ e.preventDefault(); A.bpRedo(); return; }
  if(mod && k==="d" && !typing){ e.preventDefault(); A.bpDup(); return; }
  if((e.key==="Delete"||e.key==="Backspace") && !typing && M.selK){ e.preventDefault(); A.bpDelSel(); return; }
  if(!typing && M.selK && e.key.startsWith("Arrow")){ e.preventDefault(); const it=bpFind(M.selK); if(!it) return; const s=e.shiftKey?10:2, dx=e.key==="ArrowLeft"?-s:e.key==="ArrowRight"?s:0, dy=e.key==="ArrowUp"?-s:e.key==="ArrowDown"?s:0;
    bpSnap(); if(it.t==="ar"){ it.x1+=dx; it.y1+=dy; it.x2+=dx; it.y2+=dy; if(it.cx!=null){ it.cx+=dx; it.cy+=dy; } } else { it.x+=dx; it.y+=dy; } bpRefresh(); }
}
document.addEventListener("keydown",bpKey);

/* ---- animação entre passos ---- */
function bpStop(){ if(M&&M.play){ cancelAnimationFrame(M.play.raf); M.play=null; } }
function bpLerpFrames(a,b,t){
  const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2, ka=new Map(a.map(x=>[x.k,x])), out=[], ops={};
  b.forEach(y=>{ const x=ka.get(y.k); if(!x){ out.push(y); ops[y.k]=e; return; }
    const z={...y}; ["x","y","x1","y1","x2","y2","cx","cy","w","h"].forEach(f=>{ if(typeof y[f]==="number" && typeof x[f]==="number") z[f]=x[f]+(y[f]-x[f])*e; }); out.push(z); });
  a.forEach(x=>{ if(!b.some(y=>y.k===x.k)){ out.push(x); ops[x.k]=1-e; } });
  return {out,ops};
}
function bpPlay(){
  if(!M||!M.bp) return;
  if(M.play){ bpStop(); M.fi=M.bp.fr.length-1; bpRefresh(true); return; }
  const fr=M.bp.fr; if(fr.length<2) return;
  M.selK=null; M.play={raf:0}; const DUR=1300, HOLD=450; let i=0, t0=performance.now();
  M.fi=0; bpRefresh(true);
  const step=now=>{
    if(!M||!M.play) return;
    const el=now-t0;
    if(el<HOLD){ M.play.raf=requestAnimationFrame(step); return; }
    const t=Math.min(1,(el-HOLD)/DUR), {out,ops}=bpLerpFrames(fr[i].it,fr[i+1].it,t);
    const g=$("#bpSI"); if(g) g.innerHTML=bpItemsSVG(out,{ops});
    if(t>=1){ i++; M.fi=i; $$("#bpSteps .bpstep").forEach((x,j)=>x.classList.toggle("on",j===i)); t0=now;
      if(i>=fr.length-1){ M.play=null; bpRefresh(true); return; } }
    M.play.raf=requestAnimationFrame(step);
  };
  M.play.raf=requestAnimationFrame(step);
}

/* ---- imagem (PNG) e impressão ---- */
function bpPngBlob(b,fi,scale=2){
  return new Promise((res,rej)=>{
    const s=bpSVG(b,fi,{w:BW}), url="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(s), img=new Image();
    img.onload=()=>{ const c=document.createElement("canvas"); c.width=BW*scale; c.height=BH*scale; const x=c.getContext("2d"); x.drawImage(img,0,0,c.width,c.height); c.toBlob(bl=>bl?res(bl):rej(new Error("png")),"image/png"); };
    img.onerror=()=>rej(new Error("svg")); img.src=url;
  });
}
async function bpPng(){
  const b=bpCollect(), fname=(slug(b.name)||"bola-parada")+(b.fr.length>1?"-passo"+(M.fi+1):"")+".png";
  try{
    const blob=await bpPngBlob(b,M.fi);
    const dl=await use("downloads");
    if(dl){ try{ const u8=new Uint8Array(await blob.arrayBuffer()); await dl.save({filename:fname,data:u8,mimeType:"image/png"}); toast("Imagem guardada"); return; }catch(e){ if(e&&e.code==="declined") return; } }
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); a.remove(); toast("Imagem descarregada");
  }catch(e){ console.error(e); toast("Não foi possível criar a imagem."); }
}
// id: "all", um id, ou vários separados por vírgulas (escolhidos em bpPrintForm); lay "2" = seguidas (dois campos por folha)
function bpPrint(id,lay){
  const ids = id==="all" ? setpieces().map(b=>b.id) : String(id).split(",").filter(Boolean);
  const docs = ids.map(i=>D.setpieces[i]?{id:i,...D.setpieces[i]}:null).filter(Boolean);
  if(!docs.length) return toast("Sem bolas paradas para imprimir.");
  const one=b=>`<section class="bpp"><h2>${esc(b.name||"")} <small style="color:#6b5a5f;text-transform:none;letter-spacing:0">— ${esc(BPT(b.type).l)}</small></h2>
    ${(b.fr||[]).map((f,i)=>`<div class="bpf">${(b.fr||[]).length>1?`<div class="note"><b>Passo ${i+1}</b></div>`:""}${bpSVG({...b,tt:b.tt},i)}</div>`).join("")}
    ${b.notes?`<div class="blk"><h3>Notas</h3><p>${esc(b.notes).replace(/\n/g,"<br>")}</p></div>`:""}</section>`;
  const css=`<style>${lay==="2"?`.bpp{margin-bottom:14px}.bpp h2{page-break-after:avoid}.bpf svg{max-height:${Math.round(9800/(PRINT_PREF.scale||100))}mm;width:auto;max-width:100%;margin:0 auto}.bpf{margin:2px 0 6px}`:".bpp{page-break-after:always}.bpp:last-child{page-break-after:auto}"}.bpf{margin:6px 0 10px;page-break-inside:avoid}.bpf svg{width:100%;height:auto;display:block;border-radius:4px}.bpidx{columns:2;margin:0 0 6px;padding-left:18px}.bpidx li{margin:2px 0}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>`;
  const many=docs.length>1;
  const idx = many ? `<ol class="bpidx">${docs.map(b=>`<li><b>${esc(b.name||"")}</b> <span class="note">— ${esc(BPT(b.type).l)}</span></li>`).join("")}</ol>${lay==="2"?"":`<div style="page-break-after:always"></div>`}` : "";
  printDoc(many?"bolas-paradas":"bola-parada-"+(slug(docs[0].name)||"sem-nome"), many?"Bolas paradas":docs[0].name||"Bola parada", css+idx+docs.map(one).join(""));
}
// escolher que bolas paradas entram no PDF
function bpPrintForm(){
  const all=setpieces(); if(!all.length) return toast("Sem bolas paradas para imprimir.");
  const pre=S.bpT?new Set(all.filter(b=>b.type===S.bpT).map(b=>b.id)):new Set(all.map(b=>b.id));
  const types=BP_TYPES.filter(t=>all.some(b=>b.type===t.k));
  const body=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><button class="btn sm" data-a="bpPrSel" data-k="*">Todas</button><button class="btn sm" data-a="bpPrSel" data-k="">Nenhuma</button>${types.map(t=>`<button class="btn sm ghost" data-a="bpPrSel" data-k="${t.k}">+ ${esc(t.l)}</button>`).join("")}</div>
    <div class="bpprl">${types.map(t=>`<div class="qlbl"><span>${esc(t.l)}</span></div>${all.filter(b=>b.type===t.k).map(b=>`<label class="bppri"><input type="checkbox" name="bpsel" value="${esc(b.id)}" data-t="${b.type}" ${pre.has(b.id)?"checked":""}>${bpSVG(b,0,{w:84})}<span><b>${esc(b.name||"Sem nome")}</b><small class="muted">${(b.fr||[]).length>1?`${(b.fr||[]).length} passos`:"1 passo"}${b.notes?" · com notas":""}</small></span></label>`).join("")}`).join("")}</div>
    <div class="qlbl" style="margin-top:12px"><span>Folhas</span></div>
    <div class="seg" style="margin-bottom:10px"><button data-a="bpPrLay" data-k="1" class="on">Uma por página</button><button data-a="bpPrLay" data-k="2">Seguidas (2 campos por folha)</button></div>
    <div class="qlbl"><span>Tamanho da folha</span></div>
    <div class="seg" style="margin-bottom:8px">${[100,125,150,175].map(s=>`<button data-a="prScale" data-k="${s}" class="${PRINT_PREF.scale===s?"on":""}">${s}%</button>`).join("")}</div>
    <p class="small muted" style="margin:0"><b id="bpPrN"></b> O ficheiro descarregado abre no browser; para PDF escolhe Imprimir → Guardar como PDF (ativa "Gráficos de fundo" se o campo sair branco).</p>`;
  modal({title:"Imprimir bolas paradas",sub:"Escolhe as que entram no PDF",body,
    foot:`<button class="btn" data-a="bpPrGo" data-k="open">Abrir numa aba</button><span class="right"><button class="btn primary" data-a="bpPrGo" data-k="dl">Descarregar</button></span>`,ctx:{bpLay:"1",pick:true}});
  bpPrCount();
}
$("#dlg").addEventListener("change",e=>{ if(e.target && e.target.name==="bpsel") bpPrCount(); });
function bpPrCount(){ const n=$$("#dlg [name=bpsel]:checked").length, el=$("#bpPrN"); if(el) el.textContent=n?`${plural(n,"bola parada selecionada","bolas paradas selecionadas")}.`:"Nenhuma selecionada."; }

/* ---- ações ---- */
Object.assign(A,{
  bpFilter: el => { S.bpT=el.dataset.k; render(); },
  bpNew: el => bpNewForm(el.dataset.k||S.bpT||"lof"),
  bpPickType: el => { if(!M) return; const nm=$("#dlg [name=name]"), old=BPT(M.bpType).t; M.bpType=el.dataset.k;
    $$("#dlg .bptype").forEach(x=>x.classList.toggle("on",x.dataset.k===M.bpType)); if(nm && (!nm.value.trim()||nm.value===old)) nm.value=BPT(M.bpType).t; },
  bpOpen: el => bpEditor(el.dataset.id),
  bpTool: el => { if(!M||!M.bp) return; M.tool=el.dataset.k; if(M.tool==="del") M.selK=null; bpRefresh(true); },
  bpUndo: () => { if(!M||!M.bp||!M.hist.length) return; bpStop(); M.fut.push(JSON.stringify({fr:M.bp.fr,fi:M.fi})); const s=JSON.parse(M.hist.pop()); M.bp.fr=s.fr; M.fi=Math.min(s.fi,s.fr.length-1); if(M.selK&&!bpFind(M.selK)) M.selK=null; M.dirty=true; bpRefresh(true); },
  bpRedo: () => { if(!M||!M.bp||!M.fut.length) return; bpStop(); M.hist.push(JSON.stringify({fr:M.bp.fr,fi:M.fi})); const s=JSON.parse(M.fut.pop()); M.bp.fr=s.fr; M.fi=Math.min(s.fi,s.fr.length-1); if(M.selK&&!bpFind(M.selK)) M.selK=null; M.dirty=true; bpRefresh(true); },
  bpTpl: () => { if(!M||!M.bp) return; const ty=($("#dlg [name=bptype]")||{}).value||M.bp.type;
    askConfirm(`Repor a colocação do modelo "${BPT(ty).l}" neste passo? (Podes desfazer.)`,"Repor").then(ok=>{ if(!ok||!M||!M.bp) return; bpSnap(); M.bp.fr[M.fi].it=bpTemplate(ty); M.selK=null; bpRefresh(true); }); },
  bpSet: el => { if(!M||!M.bp) return; const it=bpFind(M.selK); if(!it) return; bpSnap(); it[el.dataset.f]=el.dataset.v; bpRefresh(true); },
  bpStraight: () => { const it=M&&M.bp&&bpFind(M.selK); if(!it||it.t!=="ar") return; bpSnap(); it.cx=(it.x1+it.x2)/2; it.cy=(it.y1+it.y2)/2; bpRefresh(true); },
  bpDup: () => { if(!M||!M.bp) return; const it=bpFind(M.selK); if(!it) return; bpSnap(); const o={...clone(it),k:bpNextK()};
    if(o.t==="ar"){ ["x1","x2","cx"].forEach(f=>o[f]+=24); ["y1","y2","cy"].forEach(f=>o[f]+=24); } else { o.x+=28; o.y+=28; } delete o.pid; bpItems().push(o); M.selK=o.k; bpRefresh(true); },
  bpDelSel: () => { if(!M||!M.bp||!M.selK) return; bpSnap(); M.bp.fr[M.fi].it=bpItems().filter(x=>x.k!==M.selK); M.selK=null; bpRefresh(true); },
  bpRoster: el => { if(!M||!M.bp) return; const pl=P(el.dataset.p); if(!pl) return; const it=M.selK&&bpFind(M.selK);
    if(it && (it.t==="p"||it.t==="g")){ bpSnap(); it.n=pl.name; it.pid=pl.id; bpRefresh(true); return; }
    bpSnap(); const n=bpItems().filter(x=>x.t==="p").length, o={k:bpNextK(),t:"p",x:120+(n%8)*34,y:600+Math.floor(n/8)%2*40,n:pl.name,pid:pl.id,c:"w"};
    bpItems().push(o); M.selK=o.k; M.tool="sel"; bpRefresh(true); toast(`${pl.name} no campo — arrasta para o colocar.`); },
  bpFrame: el => { if(!M||!M.bp) return; bpStop(); M.fi=+el.dataset.k; if(M.selK&&!bpFind(M.selK)) M.selK=null; bpRefresh(true); },
  bpFrameAdd: () => { if(!M||!M.bp) return; bpStop(); bpSnap(); M.bp.fr.splice(M.fi+1,0,{it:clone(bpItems())}); M.fi++; bpRefresh(true); toast(`Passo ${M.fi+1}: mexe os jogadores para onde vão.`); },
  bpFrameDel: () => { if(!M||!M.bp||M.bp.fr.length<2) return; bpStop(); bpSnap(); M.bp.fr.splice(M.fi,1); M.fi=Math.max(0,M.fi-1); if(M.selK&&!bpFind(M.selK)) M.selK=null; bpRefresh(true); },
  bpPlay: () => bpPlay(),
  bpPng: () => { if(M&&M.bp) bpPng(); },
  bpPrint: () => { if(!M||!M.bp) return; const id=M.bpId;   // no editor: guarda e descarrega logo (o editor fica aberto)
    const go=()=>{ PRINT_MODE="dl"; bpPrint(id); };
    if(M.dirty){ askConfirm("Guardar as alterações antes de criar o PDF?","Guardar e criar PDF").then(ok=>{ if(!ok||!M||!M.bp) return; put("setpieces",id,bpCollect()); M.dirty=false; go(); }); }
    else go(); },
  bpPrintAll: () => bpPrintForm(),
  bpPrSel: el => { const k=el.dataset.k; $$("#dlg [name=bpsel]").forEach(c=>{ if(k==="*") c.checked=true; else if(k==="") c.checked=false; else if(c.dataset.t===k) c.checked=true; }); bpPrCount(); },
  bpPrLay: el => { if(!M) return; M.bpLay=el.dataset.k; $$("#dlg [data-a=bpPrLay]").forEach(b=>b.classList.toggle("on",b===el)); },
  bpPrGo: el => { if(!M) return; const ids=$$("#dlg [name=bpsel]:checked").map(c=>c.value), lay=M.bpLay;
    if(!ids.length) return toast("Escolhe pelo menos uma bola parada.");
    closeModal(); PRINT_MODE=el.dataset.k; PRINT_WIN=null; if(PRINT_MODE==="open"){ try{ PRINT_WIN=window.open("","_blank"); }catch(e){} }
    bpPrint(ids.join(","),lay); },
  bpCopy: el => { const s=D.setpieces[el.dataset.id]; if(!s) return toast("Esta bola parada já não existe."); const id=bpCopyDoc(s); toast(`Cópia criada: ${D.setpieces[id].name}`); bpEditor(id); },
  bpCopyEd: () => { if(!M||!M.bp) return; const src=M.bpId;
    const go=()=>{ if(!M||!M.bp) return; bpStop(); const id=bpCopyDoc(D.setpieces[src]||bpCollect()); bpEditor(id); toast("Cópia criada — estás a editar a cópia; o original ficou igual."); };
    if(M.dirty){ askConfirm("Guardar as alterações no original antes de criar a cópia?","Guardar e duplicar").then(ok=>{ if(!ok||!M||!M.bp) return; put("setpieces",src,bpCollect()); M.dirty=false; go(); }); }
    else go(); }
});
