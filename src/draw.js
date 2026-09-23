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
  if(it.t==="ball") return `<g ${hit}><circle cx="${n(it.x)}" cy="${n(it.y)}" r="10" fill="#fff" stroke="#222" stroke-width="2"/><circle cx="${n(it.x)}" cy="${n(it.y)}" r="3.5" fill="#222"/></g>`;
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

/* ================= editor ================= */
function drawEditor(exId){
  const ex=D.exercises[exId]; if(!ex) return;
  const drw=clone(ex.drw||{f:"half",it:[]}); drw.it=drw.it||[];
  const body=`
    <div class="seg" style="margin-bottom:10px">${[["full","Campo inteiro"],["half","Meio-campo"],["free","Espaço livre"]].map(([k,l])=>`<button data-a="dwField" data-k="${k}">${l}</button>`).join("")}</div>
    <div class="dtools">${DTOOLS.map(t=>`<button data-a="dwTool" data-k="${t.k}" title="${t.l}"><span class="dic" style="${DCOL[t.k]?`color:${DCOL[t.k]}`:ACOL[t.k]?`color:${t.k==="run"?"var(--text)":ACOL[t.k]}`:""}">${t.ic}</span>${t.l}</button>`).join("")}</div>
    <div id="dwWrap" style="margin-top:10px">${drawSVG(drw,{id:"pitch",interactive:true})}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center"><button class="btn sm" data-a="dwUndo">Desfazer</button><button class="btn sm ghost" data-a="dwClear">Limpar tudo</button><span class="small muted" id="dwHint"></span></div>`;
  modal({title:"Desenho do exercício",sub:esc(ex.name),big:true,body,foot:footSave("Guardar desenho"),ctx:{drw,tool:"A",hist:[],
    save:()=>{ const cur=D.exercises[exId]; if(!cur){ closeModal(); return; } put("exercises",exId,{...clone(cur),drw:M.drw}); closeModal(); toast("Desenho guardado"); exView(exId); }
  }});
  $("#dlg").classList.add("wide");
  dwRefresh();
  const svg=$("#pitch");
  let act=null;
  const cap=e=>{ try{ svg.setPointerCapture(e.pointerId); }catch(err){} };
  const pt=e=>{ const p=svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; const r=p.matrixTransform(svg.getScreenCTM().inverse()); return {x:Math.max(0,Math.min(DW,r.x)),y:Math.max(0,Math.min(DH,r.y))}; };
  const snap=()=>{ M.hist.push(JSON.stringify(M.drw)); if(M.hist.length>60) M.hist.shift(); M.dirty=true; };
  svg.addEventListener("pointerdown",e=>{
    if(!M||!M.drw) return; e.preventDefault();
    const p=pt(e), g=e.target.closest("[data-i]"), idx=g?+g.dataset.i:null, T=M.tool, it=M.drw.it;
    if(T==="del"){ if(idx!=null){ snap(); it.splice(idx,1); dwRefresh(); } return; }
    if(T==="move"||(idx!=null && !["run","pass","drib","zone"].includes(T))){
      if(idx==null) return; snap(); act={mode:"drag",i:idx,last:p}; cap(e); return; }
    if(["run","pass","drib"].includes(T)){ snap(); it.push({t:T,x1:p.x,y1:p.y,x2:p.x,y2:p.y}); act={mode:"line",i:it.length-1}; cap(e); dwRefresh(); return; }
    if(T==="zone"){ snap(); it.push({t:"zone",x:p.x,y:p.y,w:0,h:0}); act={mode:"zone",i:it.length-1}; cap(e); dwRefresh(); return; }
    snap();
    const o={t:T,x:p.x,y:p.y};
    if(T==="A"||T==="B"){ const nums=it.filter(x=>x.t===T).map(x=>+x.n||0); o.n=(nums.length?Math.max(...nums):0)+1; }
    it.push(o); dwRefresh();
  });
  svg.addEventListener("pointermove",e=>{
    if(!act||!M||!M.drw) return; const p=pt(e), it=M.drw.it[act.i]; if(!it) return;
    if(act.mode==="drag"){ const dx=p.x-act.last.x, dy=p.y-act.last.y; act.last=p;
      if("x1" in it){ it.x1+=dx; it.y1+=dy; it.x2+=dx; it.y2+=dy; } else { it.x+=dx; it.y+=dy; } }
    else if(act.mode==="line"){ it.x2=p.x; it.y2=p.y; }
    else if(act.mode==="zone"){ it.w=p.x-it.x; it.h=p.y-it.y; }
    dwRefresh();
  });
  const end=()=>{ if(!act||!M||!M.drw){ act=null; return; } const it=M.drw.it[act.i];
    if(it && act.mode==="line" && Math.hypot(it.x2-it.x1,it.y2-it.y1)<20){ M.drw.it.splice(act.i,1); M.hist.pop(); }
    if(it && act.mode==="zone" && (Math.abs(it.w)<20||Math.abs(it.h)<20)){ M.drw.it.splice(act.i,1); M.hist.pop(); }
    if(it && act.mode==="zone"){ if(it.w<0){ it.x+=it.w; it.w=-it.w; } if(it.h<0){ it.y+=it.h; it.h=-it.h; } }
    act=null; dwRefresh(); };
  svg.addEventListener("pointerup",end); svg.addEventListener("pointercancel",end);
}
function dwRefresh(){
  if(!M||!M.drw) return;
  {
    const order=t=>(t==="zone"?0:(t==="run"||t==="pass"||t==="drib")?1:2);
    $("#pitchItems").innerHTML=M.drw.it.map((it,i)=>({it,i})).sort((a,b)=>order(a.it.t)-order(b.it.t)).map(({it,i})=>itemSVG(it,i)).join("");
  }
  $$("#dlg [data-a=dwTool]").forEach(b=>b.classList.toggle("on",b.dataset.k===M.tool));
  $$("#dlg [data-a=dwField]").forEach(b=>b.classList.toggle("on",b.dataset.k===(M.drw.f||"half")));
  const hints={move:"Arrasta os elementos para os mover.",del:"Toca num elemento para o apagar.",run:"Arrasta no campo para desenhar a seta.",pass:"Arrasta no campo para desenhar o passe.",drib:"Arrasta no campo para desenhar a condução.",zone:"Arrasta no campo para marcar a zona."};
  const h=$("#dwHint"); if(h) h.textContent = hints[M.tool] || "Toca no campo para colocar. Arrasta um elemento para o mover.";
}
