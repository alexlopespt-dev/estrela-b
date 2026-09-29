/* ================= desenho de exercícios ================= */
const DW=1050, DH=680;
const DTOOLS = [
  {k:"move",l:"Mover",ic:"✥"},
  {k:"A",l:"Jogador",ic:"●"},{k:"B",l:"Adversário",ic:"●"},{k:"G",l:"GR",ic:"●"},{k:"J",l:"Joker",ic:"●"},
  {k:"cone",l:"Cone",ic:"▲"},{k:"ball",l:"Bola",ic:"○"},{k:"mg",l:"Mini-baliza",ic:"⊓"},{k:"gl",l:"Baliza",ic:"⊓"},
  {k:"run",l:"Movimento",ic:"→"},{k:"pass",l:"Passe",ic:"⇢"},{k:"drib",l:"Condução",ic:"⤳"},{k:"zone",l:"Zona",ic:"▭"},
  {k:"del",l:"Apagar",ic:"✕"}
];
const DCOL = {A:"#8a1a30",B:"#1f5fa8",G:"#f2bd4b",J:"#ec8420"};
const ACOL = {run:"#ffffff",pass:"#f2bd4b",drib:"#9ed3ff"};
const LINE = 'stroke="rgba(255,255,255,.85)" stroke-width="3" fill="none"';

function fieldSVG(f){
  let s=`<rect x="0" y="0" width="${DW}" height="${DH}" fill="#2d7a48"/>`;
  for(let i=0;i<10;i++) if(i%2) s+=`<rect x="${i*DW/10}" y="0" width="${DW/10}" height="${DH}" fill="#2a7143"/>`;
  if(f==="free") return s;
  if(f==="half"){
    const sx=1010/68, sy=640/52.5, X=m=>20+m*sx, Y=m=>20+m*sy, cx=X(34);
    s+=`<rect x="20" y="20" width="1010" height="640" ${LINE}/>`;
    s+=`<rect x="${X(34-20.16)}" y="${Y(0)}" width="${40.32*sx}" height="${16.5*sy}" ${LINE}/>`;
    s+=`<rect x="${X(34-9.16)}" y="${Y(0)}" width="${18.32*sx}" height="${5.5*sy}" ${LINE}/>`;
    s+=`<rect x="${X(34-3.66)}" y="4" width="${7.32*sx}" height="16" ${LINE}/>`;
    s+=`<circle cx="${cx}" cy="${Y(11)}" r="4" fill="rgba(255,255,255,.85)"/>`;
    const dx=Math.sqrt(9.15*9.15-5.5*5.5);
    s+=`<path d="M${X(34-dx)} ${Y(16.5)} A${9.15*sx} ${9.15*sy} 0 0 0 ${X(34+dx)} ${Y(16.5)}" ${LINE}/>`;
    s+=`<path d="M${X(34-9.15)} 660 A${9.15*sx} ${9.15*sy} 0 0 1 ${X(34+9.15)} 660" ${LINE}/>`;
    return s;
  }
  const sx=1010/105, sy=640/68, X=m=>20+m*sx, Y=m=>20+m*sy;
  s+=`<rect x="20" y="20" width="1010" height="640" ${LINE}/><line x1="${X(52.5)}" y1="20" x2="${X(52.5)}" y2="660" ${LINE}/>`;
  s+=`<ellipse cx="${X(52.5)}" cy="${Y(34)}" rx="${9.15*sx}" ry="${9.15*sy}" ${LINE}/><circle cx="${X(52.5)}" cy="${Y(34)}" r="4" fill="rgba(255,255,255,.85)"/>`;
  const dy=Math.sqrt(9.15*9.15-5.5*5.5);
  [0,1].forEach(side=>{
    const gx = side ? m=>X(105-m) : m=>X(m);
    const x0=gx(0), x16=gx(16.5), x5=gx(5.5);
    s+=`<rect x="${Math.min(x0,x16)}" y="${Y(34-20.16)}" width="${16.5*sx}" height="${40.32*sy}" ${LINE}/>`;
    s+=`<rect x="${Math.min(x0,x5)}" y="${Y(34-9.16)}" width="${5.5*sx}" height="${18.32*sy}" ${LINE}/>`;
    s+=`<rect x="${side?1030:4}" y="${Y(34-3.66)}" width="16" height="${7.32*sy}" ${LINE}/>`;
    s+=`<circle cx="${gx(11)}" cy="${Y(34)}" r="4" fill="rgba(255,255,255,.85)"/>`;
    s+=`<path d="M${x16} ${Y(34-dy)} A${9.15*sx} ${9.15*sy} 0 0 ${side?0:1} ${x16} ${Y(34+dy)}" ${LINE}/>`;
  });
  return s;
}
function arrowDefs(){ return `<defs>${Object.entries(ACOL).map(([k,c])=>`<marker id="ah_${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join("")}</defs>`; }
function itemSVG(it,i,sel){
  const hit = i==null ? "" : `data-i="${i}" style="cursor:grab"`;
  const n=v=>Math.round(+v||0);
  if(it.t==="A"||it.t==="B"||it.t==="G"||it.t==="J"){
    const lab = it.t==="G"?"GR":it.t==="J"?"J":(it.n??"");
    return `<g ${hit}><circle cx="${n(it.x)}" cy="${n(it.y)}" r="19" fill="${DCOL[it.t]}" stroke="#fff" stroke-width="3"/><text x="${n(it.x)}" y="${n(it.y)+6}" text-anchor="middle" font-size="${it.t==="G"?15:17}" font-weight="700" font-family="Barlow, Arial, sans-serif" fill="${it.t==="G"?"#2a1a08":"#fff"}">${esc(lab)}</text></g>`;
  }
  if(it.t==="cone") return `<g ${hit}><path d="M${n(it.x)} ${n(it.y)-13}L${n(it.x)+12} ${n(it.y)+10}H${n(it.x)-12}z" fill="#ff8a1f" stroke="#fff" stroke-width="2"/></g>`;
  if(it.t==="ball") return `<g ${hit}>${vecBall(n(it.x),n(it.y),11)}</g>`;
  if(it.t==="mg"||it.t==="gl"){ const w=it.t==="gl"?90:46, h=it.t==="gl"?24:16; return `<g ${hit}><rect x="${n(it.x)-w/2}" y="${n(it.y)-h/2}" width="${w}" height="${h}" fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width="3"/><line x1="${n(it.x)-w/2}" y1="${n(it.y)}" x2="${n(it.x)+w/2}" y2="${n(it.y)}" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/></g>`; }
  if(it.t==="zone"){ const x=Math.min(it.x,it.x+it.w), y=Math.min(it.y,it.y+it.h); return `<g ${hit}><rect x="${n(x)}" y="${n(y)}" width="${n(Math.abs(it.w))}" height="${n(Math.abs(it.h))}" fill="rgba(242,189,75,.18)" stroke="#f2bd4b" stroke-width="3" stroke-dasharray="12 8" rx="6"/></g>`; }
  if(it.t==="run"||it.t==="pass"||it.t==="drib"){
    const dash = it.t==="pass" ? 'stroke-dasharray="16 11"' : it.t==="drib" ? 'stroke-dasharray="3 9" stroke-linecap="round"' : "";
    return `<g ${hit}><line x1="${n(it.x1)}" y1="${n(it.y1)}" x2="${n(it.x2)}" y2="${n(it.y2)}" stroke="transparent" stroke-width="26"/><line x1="${n(it.x1)}" y1="${n(it.y1)}" x2="${n(it.x2)}" y2="${n(it.y2)}" stroke="${ACOL[it.t]}" stroke-width="${it.t==="drib"?6:4}" ${dash} marker-end="url(#ah_${it.t})"/></g>`;
  }
  return "";
}
function drawSVG(drw,opts={}){
  const d=drw||{f:"half",it:[]};
  const order=t=>(t==="zone"?0:(t==="run"||t==="pass"||t==="drib")?1:2);
  const items=(d.it||[]).map((it,i)=>({it,i})).sort((a,b)=>order(a.it.t)-order(b.it.t));
  return `<svg ${opts.id?`id="${opts.id}"`:""} viewBox="0 0 ${DW} ${DH}" style="width:100%;height:auto;display:block;border-radius:10px;${opts.interactive?"touch-action:none;user-select:none;-webkit-user-select:none;":""}" role="img" aria-label="Desenho do exercício">${arrowDefs()}<g id="${opts.id?opts.id+"Field":""}">${fieldSVG(d.f||"half")}</g><g id="${opts.id?opts.id+"Items":""}">${items.map(({it,i})=>itemSVG(it,opts.interactive?i:null)).join("")}</g></svg>`;
}

/* o editor está em dwv.js (formato vetorial v2); isto só desenha os desenhos antigos (drw) que ainda não foram abertos no editor */
