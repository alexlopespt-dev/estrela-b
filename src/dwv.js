/* ================= editor de desenho dos exercícios (formato vetorial v2, o mesmo da biblioteca) =================
   Um só formato para tudo: desenhos novos, os 129 da biblioteca (EXVEC, passam a poder ser alterados) e os antigos do
   editor anterior (drw, convertidos ao abrir). Guarda-se no exercício como `vec` ({v:2,w,h,fld|bgc,it}) e ganha ao da
   biblioteca. Ecrã inteiro, como as bolas paradas: o campo cabe sempre no ecrã (no iPad arrasta-se para cima e para baixo
   sem a página fugir). Tipos de item e desenho: vec.js (vecItem). */
const DV_TOOLS = [
  {k:"sel",l:"Mover",ic:"✥"},
  {k:"pA",l:"Jogador",ic:"●",c:"#8a1a30"},{k:"pB",l:"Adversário",ic:"●",c:"#1f5fa8"},{k:"pG",l:"GR",ic:"●",c:"#f2bd4b"},{k:"pJ",l:"Joker",ic:"●",c:"#ec8420"},
  {k:"ball",l:"Bola",ic:"⚽"},{k:"balls",l:"Bolas",ic:"⚽"},{k:"cone",l:"Cone",ic:"▲",c:"#f08a24"},{k:"mk",l:"Sinalizador",ic:"◉",c:"#f2b42a"},
  {k:"mg",l:"Mini-baliza",ic:"⊓"},{k:"goal",l:"Baliza",ic:"⊓"},{k:"pole",l:"Estaca",ic:"│",c:"#e8742a"},{k:"ladder",l:"Escada",ic:"☰",c:"#c9a400"},{k:"hurdle",l:"Barreira",ic:"╥"},
  {k:"run",l:"Movimento",ic:"→"},{k:"pass",l:"Passe",ic:"⇢",c:"#c9a400"},{k:"drib",l:"Condução",ic:"⤳",c:"#2f7fb8"},
  {k:"line",l:"Linha",ic:"—"},{k:"dline",l:"Linha tracejada",ic:"┄"},{k:"zone",l:"Zona",ic:"▭",c:"#c9a400"},{k:"txt",l:"Texto",ic:"T"},
  {k:"del",l:"Apagar",ic:"✕",c:"var(--r5)"}
];
const DV_PCOL = {pA:["#8a1a30","#fff"],pB:["#1f5fa8","#fff"],pG:["#f2bd4b","#2a1a08"],pJ:["#ec8420","#fff"]};
const DV_SW = {d:["#8a1a30","#1f5fa8","#f2bd4b","#ec8420","#ffffff","#141414","#1c6a3d"], ln:["#ffffff","#141414","#f2bd4b","#e0283a","#9ed3ff"],
  rect:["#f2bd4b","#ffffff","#e0283a","#1f5fa8","#141414"], txt:["#ffffff","#141414","#f2bd4b"], cone:["#f08a24","#f2c02a","#e0283a","#1f5fa8","#ffffff"],
  mk:["#f2b42a","#f08a24","#e0283a","#1f5fa8","#ffffff"], pole:["#e8742a","#f2c02a","#e0283a","#1f5fa8"]};
const DV_ROT = ["goal","ladder","hurdle","stake","pen"];
function dvBands(start,len,n){ const out=[]; for(let i=1;i<n;i+=2) out.push([+(start+i*len/n).toFixed(2),+(start+(i+1)*len/n).toFixed(2)]); return out; }
const DV_PRE = {
  full: () => { const W=440, H=302, s=4, tx=(W-105*s)/2, ty=(H-68*s)/2; return {v:2,w:W,h:H,fld:{ori:"h",s,asp:1,tx,ty,L:105,W:68,bands:dvBands(tx,105*s,10)},it:[]}; },
  half: () => { const W=440, s=+((W-20)/68).toFixed(4), H=Math.round(12+52.5*s+20); return {v:2,w:W,h:H,fld:{ori:"v",s,asp:1,tx:10,ty:+(12-52.5*s).toFixed(2),L:105,W:68,bands:dvBands(12,52.5*s,5)},it:[]}; },
  free: () => ({v:2,w:440,h:302,bgc:"#4e9c36",it:[]})
};
/* desenho antigo (editor anterior, 1050x680) → v2, no mesmo sítio e com o mesmo tamanho */
function drwToVec(drw){
  if(!drw) return null;
  const f=drw.f||"half", v={v:2,w:DW,h:DH,it:[]};
  if(f==="free") v.bgc="#2d7a48";
  else if(f==="half") v.fld={ori:"v",s:640/52.5,asp:(1010/68)/(640/52.5),tx:20,ty:20,L:105,W:68,bands:[]};
  else v.fld={ori:"h",s:640/68,asp:(1010/105)/(640/68),tx:20,ty:20,L:105,W:68,bands:[]};
  (drw.it||[]).forEach(it=>{
    if(DV_PCOL["p"+it.t]){ const [c,tc]=DV_PCOL["p"+it.t]; v.it.push({t:"d",x:it.x,y:it.y,r:19,c,tc,o:"#ffffff",ow:3,fs:it.t==="G"?15:17,txt:it.t==="G"?"GR":it.t==="J"?"J":String(it.n??""),sh:0}); }
    else if(it.t==="cone") v.it.push({t:"cone",x:it.x,y:it.y,s:3});
    else if(it.t==="ball") v.it.push({t:"ball",x:it.x,y:it.y,r:11});
    else if(it.t==="mg"||it.t==="gl") v.it.push({t:"goal",x:it.x,y:it.y,w:it.t==="gl"?90:46,h:it.t==="gl"?24:16});
    else if(it.t==="zone") v.it.push({t:"rect",x:Math.min(it.x,it.x+it.w),y:Math.min(it.y,it.y+it.h),w:Math.abs(it.w),h:Math.abs(it.h),c:"#f2bd4b",fill:"#f2bd4b",fo:.18,lw:3,dash:"12 8"});
    else if(it.t==="run"||it.t==="pass"||it.t==="drib") v.it.push({t:"ln",pts:[[it.x1,it.y1],[it.x2,it.y2]],arr:1,lw:it.t==="drib"?5:4,
      c:it.t==="pass"?"#f2bd4b":it.t==="drib"?"#9ed3ff":"#ffffff",...(it.t==="pass"?{dash:"16 11"}:{}),...(it.t==="drib"?{wave:1,amp:5,wl:12}:{})});
  });
  return v;   // meio-campo antigo: baliza em cima (x=0 no v2), a outra metade fica fora do desenho
}
/* desenho de partida de um exercício: o seu, o da biblioteca, o antigo convertido, ou campo vazio */
const dvOf = x => x ? (x.vec ? clone(x.vec) : x.imgk && EXVEC[x.imgk] ? clone(EXVEC[x.imgk]) : x.drw && (x.drw.it||[]).length ? drwToVec(x.drw) : null) : null;
const dvK = () => (M&&M.vec&&M.vec.w||440)/440;
const dvR = v => Math.round(v*100)/100;

/* ---- desenho com zonas de toque ---- */
function dvHit(it,k){
  const t=10*k;
  if(it.t==="ln"){ const p=it.pts||[]; return p.length<2?"":`<path d="M${p.map(q=>dvR(q[0])+" "+dvR(q[1])).join("L")}" stroke="transparent" stroke-width="${dvR(t*1.4)}" fill="none" stroke-linecap="round"/>`; }
  if(it.t==="rect") return `<rect x="${dvR(it.x)}" y="${dvR(it.y)}" width="${dvR(it.w)}" height="${dvR(it.h)}" fill="none" stroke="transparent" stroke-width="${dvR(t*1.4)}"/>`;
  if(it.x==null) return "";
  return `<circle cx="${dvR(it.x)}" cy="${dvR(it.y)}" r="${dvR(Math.max(t,(it.r||0)+2*k,(it.w||0)/2,(it.h||0)/2))}" fill="transparent"/>`;
}
function dvSVG(){
  const v=M.vec, k=dvK(), uid="dv";
  const order={bib:7,rect:0,ln:1,goal:2,ladder:2,hurdle:2,stake:4,pen:4,dome:4,stick:4,mk:3,cone:3,pole:4,flag:4,ball:5,balls:5,sq:6,tri:6,x:6,fig:7,d:8,txt:9};
  const its=(v.it||[]).map((it,i)=>({it,i})).sort((a,b)=>((order[a.it.t]??5)-(order[b.it.t]??5))||((a.it.z||0)-(b.it.z||0))||(a.i-b.i));
  return `${vecDefs(uid)}${v.fld?vecField(v.fld,v.w,v.h,uid):`<rect width="${v.w}" height="${v.h}" fill="${v.bgc||VEC_GRASS[0]}"/>`}
    ${its.map(({it,i})=>`<g class="dvi" data-i="${i}">${vecItem(it,uid)}${dvHit(it,k)}</g>`).join("")}<g id="dvSel"></g>`;
}
function dvSelDraw(){
  const g=$("#dvSel"); if(!g) return; const i=M.sel, it=i==null?null:M.vec.it[i]; if(!it){ g.innerHTML=""; return; }
  const k=dvK(), el=$(`#dvS .dvi[data-i="${i}"]`); let bb=null; try{ bb=el&&el.getBBox(); }catch(e){}
  let s="";
  if(bb && it.t!=="ln") s+=`<rect x="${dvR(bb.x-3*k)}" y="${dvR(bb.y-3*k)}" width="${dvR(bb.width+6*k)}" height="${dvR(bb.height+6*k)}" rx="${dvR(3*k)}" class="dvring" style="stroke-width:${dvR(1.2*k)}"/>`;
  const H=(x,y,h)=>`<circle cx="${dvR(x)}" cy="${dvR(y)}" r="${dvR(4.5*k)}" class="dvh" data-h="${h}" style="stroke-width:${dvR(1.2*k)}"/>`;
  if(it.t==="ln"){ const p=it.pts; s+=H(p[0][0],p[0][1],"a")+H(p[p.length-1][0],p[p.length-1][1],"b"); }
  if(it.t==="rect") s+=H(it.x+it.w,it.y+it.h,"rs");
  g.innerHTML=s;
}
function dvRefresh(full){
  if(!M||!M.vec) return;
  const svg=$("#dvS"); if(!svg) return;
  svg.setAttribute("viewBox",`0 0 ${M.vec.w} ${M.vec.h}`);
  $("#dvWrap").style.maxWidth=`calc((100dvh - 300px) * ${(M.vec.w/M.vec.h).toFixed(3)})`;
  svg.innerHTML=dvSVG(); dvSelDraw();
  $$("#dlg [data-a=dvTool]").forEach(b=>b.classList.toggle("on",b.dataset.k===M.tool));
  const hints={sel:"Toca num elemento para o escolher; arrasta para o mover.",del:"Toca num elemento para o apagar.",run:"Arrasta no campo para desenhar o movimento.",pass:"Arrasta no campo para desenhar o passe.",
    drib:"Arrasta no campo para desenhar a condução.",line:"Arrasta no campo para desenhar a linha.",dline:"Arrasta no campo para desenhar a linha tracejada.",zone:"Arrasta no campo para marcar a zona."};
  const h=$("#dvHint"); if(h) h.textContent=hints[M.tool]||"Toca no campo para pôr. Arrasta um elemento para o mover.";
  if(full!==false) dvProps();
}
/* ---- painel do elemento escolhido ---- */
function dvProps(){
  const p=$("#dvProps"); if(!p) return; const it=M.sel==null?null:M.vec.it[M.sel];
  if(!it){ p.innerHTML=`<p class="small muted" style="margin:0">Escolhe um elemento (ferramenta Mover) para mudar a cor, o número, o tamanho ou rodar.</p>`; return; }
  const sw=(key,list,cur)=>`<div class="bpsw">${list.map(c=>`<button data-a="dvSet" data-f="${key}" data-v="${c}" class="${String(cur||"").toLowerCase()===c?"on":""}" style="background:${c}" aria-label="Cor ${c}"></button>`).join("")}</div>`;
  const names={d:"Jogador",ball:"Bola",balls:"Bolas",cone:"Cone",mk:"Sinalizador",goal:"Baliza",pole:"Estaca",ladder:"Escada",hurdle:"Barreira",ln:"Linha / seta",rect:"Zona",txt:"Texto",fig:"Jogador",x:"Marca",tri:"Marca",sq:"Marca",stake:"Estaca",pen:"Bandeirola",dome:"Prato",stick:"Estaca",flag:"Bandeira",bib:"Coletes"};
  let h=`<div class="qlbl"><span>${esc(names[it.t]||"Elemento")}</span></div>`;
  if(it.t==="d") h+=`<label class="fld">Número / letra<input data-dvf="txt" value="${esc(it.txt||"")}" maxlength="3"></label>${sw("c",DV_SW.d,it.c)}`;
  if(it.t==="txt") h+=`<label class="fld">Texto<input data-dvf="txt" value="${esc(it.txt||"")}" maxlength="40"></label>${sw("c",DV_SW.txt,it.c)}`;
  if(it.t==="ln") h+=`${sw("c",DV_SW.ln,it.c)}<div class="seg dvseg">${[["s","Contínua"],["d","Tracejada"],["w","Ondulada"]].map(([s,l])=>`<button data-a="dvLine" data-s="${s}" class="${(it.wave?"w":it.dash?"d":"s")===s?"on":""}">${l}</button>`).join("")}</div>
    <div class="seg dvseg">${[["0","Sem seta"],["1","Seta"],["2","Duas setas"]].map(([s,l])=>`<button data-a="dvArr" data-s="${s}" class="${String(it.arr||0)===s?"on":""}">${l}</button>`).join("")}</div>`;
  if(it.t==="rect") h+=`${sw("c",DV_SW.rect,it.c)}<div class="seg dvseg"><button data-a="dvFill" class="${it.fill&&it.fill!=="none"?"on":""}">Com fundo</button><button data-a="dvDash" class="${it.dash?"on":""}">Tracejado</button></div>`;
  if(DV_SW[it.t]&&!["d","ln","rect","txt"].includes(it.t)) h+=sw("c",DV_SW[it.t],it.c||DV_SW[it.t][0]);
  h+=`<div class="dvrow"><span class="small muted">Tamanho</span><button class="btn sm" data-a="dvSize" data-n="-1" aria-label="Mais pequeno">−</button><button class="btn sm" data-a="dvSize" data-n="1" aria-label="Maior">+</button></div>`;
  if(DV_ROT.includes(it.t)||it.t==="fig") h+=`<div class="dvrow"><span class="small muted">Rodar</span><button class="btn sm" data-a="dvRot" data-n="-15">↺ 15°</button><button class="btn sm" data-a="dvRot" data-n="15">↻ 15°</button><button class="btn sm" data-a="dvRot" data-n="90">90°</button></div>`;
  h+=`<div class="dvrow"><button class="btn sm" data-a="dvDup">⧉ Duplicar</button><button class="btn sm ghost" data-a="dvDel">Apagar</button></div>`;
  p.innerHTML=h;
}
/* ---- histórico ---- */
function dvSnap(){ M.hist.push(JSON.stringify(M.vec)); if(M.hist.length>80) M.hist.shift(); M.fut=[]; M.dirty=true; }
/* ---- criar elementos ---- */
function dvNew(T,p){
  const k=dvK(), r=v=>dvR(v*k), it=M.vec.it;
  if(DV_PCOL[T]){ const [c,tc]=DV_PCOL[T];
    const nums=it.filter(x=>x.t==="d"&&x.c===c).map(x=>parseInt(x.txt,10)||0);
    return {t:"d",x:p.x,y:p.y,r:r(6.5),c,tc,fs:r(6.2),txt:T==="pG"?"GR":T==="pJ"?"J":String((nums.length?Math.max(...nums):0)+1)}; }
  const o=({ball:{t:"ball",r:r(2.8)},balls:{t:"balls",r:r(2.4),n:6},cone:{t:"cone",s:dvR(1.25*k)},mk:{t:"mk",r:r(2.8)},
    mg:{t:"goal",w:r(12),h:r(4),a:0},goal:{t:"goal",w:r(30),h:r(8),a:0},pole:{t:"pole",h:r(13)},ladder:{t:"ladder",w:r(7),h:r(40),a:0},
    hurdle:{t:"hurdle",w:r(13),a:0},txt:{t:"txt",s:r(10),c:"#ffffff",stroke:"#1c1c1c",sw:r(2),txt:"Texto"}})[T];
  return o ? {...o,x:p.x,y:p.y} : null;
}
function dvLineNew(T,p){
  const k=dvK(), r=v=>dvR(v*k), base={t:"ln",pts:[[p.x,p.y],[p.x,p.y]],lw:r(1.4)};
  return ({run:{...base,c:"#ffffff",arr:1},pass:{...base,c:"#f2bd4b",arr:1,dash:`${r(5)} ${r(3.5)}`},drib:{...base,c:"#9ed3ff",arr:1,wave:1,amp:r(1.8),wl:r(4.5)},
    line:{...base,c:"#ffffff",lw:r(1.3)},dline:{...base,c:"#ffffff",lw:r(1.3),dash:`${r(4)} ${r(3)}`}})[T];
}
/* ---- mover um elemento ---- */
function dvMove(it,dx,dy){
  if(it.t==="ln") it.pts=it.pts.map(q=>[dvR(q[0]+dx),dvR(q[1]+dy)]);
  else { it.x=dvR(it.x+dx); it.y=dvR(it.y+dy); }
}
function dvBind(){
  const svg=$("#dvS"); let act=null;
  const pt=e=>{ const p=svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY; const r=p.matrixTransform(svg.getScreenCTM().inverse());
    return {x:dvR(Math.max(0,Math.min(M.vec.w,r.x))),y:dvR(Math.max(0,Math.min(M.vec.h,r.y)))}; };
  const cap=e=>{ try{ svg.setPointerCapture(e.pointerId); }catch(err){} };
  // Safari (iPad/iPhone): enquanto se arrasta um elemento, a página não se mexe
  svg.addEventListener("touchmove",e=>{ if(act) e.preventDefault(); },{passive:false});
  svg.addEventListener("touchstart",e=>{ if(e.touches.length===1) e.preventDefault(); },{passive:false});
  svg.addEventListener("pointerdown",e=>{
    if(!M||!M.vec) return; e.preventDefault();
    const p=pt(e), hEl=e.target.closest("[data-h]"), g=e.target.closest(".dvi"), i=g?+g.dataset.i:null, T=M.tool, its=M.vec.it;
    if(hEl&&M.sel!=null){ dvSnap(); act={mode:"h",h:hEl.dataset.h,i:M.sel}; cap(e); return; }
    if(T==="del"){ if(i!=null){ dvSnap(); its.splice(i,1); M.sel=null; dvRefresh(); } return; }
    if(i!=null && !["run","pass","drib","line","dline","zone"].includes(T)){ const was=M.sel; M.sel=i; dvSnap(); act={mode:"drag",i,last:p,moved:false}; cap(e); if(was!==i) dvRefresh(); else dvSelDraw(); return; }
    if(T==="sel"){ if(M.sel!=null){ M.sel=null; dvRefresh(); } return; }
    if(["run","pass","drib","line","dline"].includes(T)){ dvSnap(); its.push(dvLineNew(T,p)); M.sel=its.length-1; act={mode:"line",i:M.sel}; cap(e); dvRefresh(false); return; }
    if(T==="zone"){ dvSnap(); const k=dvK(); its.push({t:"rect",x:p.x,y:p.y,w:0,h:0,c:"#f2bd4b",fill:"#f2bd4b",fo:.18,lw:dvR(1.2*k),dash:`${dvR(5*k)} ${dvR(3*k)}`}); M.sel=its.length-1; act={mode:"zone",i:M.sel,x0:p.x,y0:p.y}; cap(e); dvRefresh(false); return; }
    const o=dvNew(T,p); if(!o) return;
    dvSnap(); its.push(o); M.sel=its.length-1; dvRefresh();
    if(T==="txt"){ const inp=$("#dvProps [data-dvf=txt]"); if(inp){ inp.focus(); inp.select(); } }
  });
  svg.addEventListener("pointermove",e=>{
    if(!act||!M||!M.vec) return; const p=pt(e), it=M.vec.it[act.i]; if(!it) return;
    if(act.mode==="drag"){ const dx=p.x-act.last.x, dy=p.y-act.last.y; act.last=p; if(dx||dy){ act.moved=true; dvMove(it,dx,dy); } }
    else if(act.mode==="line"){ it.pts[it.pts.length-1]=[p.x,p.y]; }
    else if(act.mode==="zone"){ it.x=Math.min(act.x0,p.x); it.y=Math.min(act.y0,p.y); it.w=dvR(Math.abs(p.x-act.x0)); it.h=dvR(Math.abs(p.y-act.y0)); }
    else if(act.mode==="h"){ if(act.h==="a") it.pts[0]=[p.x,p.y]; else if(act.h==="b") it.pts[it.pts.length-1]=[p.x,p.y];
      else if(act.h==="rs"){ it.w=dvR(Math.max(6*dvK(),p.x-it.x)); it.h=dvR(Math.max(6*dvK(),p.y-it.y)); } }
    dvRefresh(false);
  });
  const end=()=>{ if(!act||!M||!M.vec){ act=null; return; } const it=M.vec.it[act.i], k=dvK();
    if(act.mode==="drag"&&!act.moved){ M.hist.pop(); }   // só escolheu, não mexeu
    if(it&&act.mode==="line"){ const a=it.pts[0], b=it.pts[it.pts.length-1]; if(Math.hypot(b[0]-a[0],b[1]-a[1])<8*k){ M.vec.it.splice(act.i,1); M.sel=null; M.hist.pop(); } }
    if(it&&act.mode==="zone"&&(it.w<8*k||it.h<8*k)){ M.vec.it.splice(act.i,1); M.sel=null; M.hist.pop(); }
    act=null; dvRefresh(); };
  svg.addEventListener("pointerup",end); svg.addEventListener("pointercancel",end);
}
/* ---- abrir o editor ---- */
function drawEditor(exId){
  const ex=D.exercises[exId]; if(!ex) return;
  const vec=dvOf(ex)||DV_PRE.half(); vec.it=vec.it||[];
  const lib=!!(ex.imgk&&EXVEC[ex.imgk]);
  const photo=!!(ex.img||ex.imgA||ex.imgL||ex.imgG);
  const body=`
    <div class="bptop">
      <div class="seg" aria-label="Campo">${[["full","Campo inteiro"],["half","Meio-campo"],["free","Espaço livre"]].map(([k,l])=>`<button data-a="dvField" data-k="${k}">${l}</button>`).join("")}</div>
      <span class="bpact"><button class="btn sm" data-a="dvUndo" title="Desfazer (Ctrl+Z)">↶ Desfazer</button><button class="btn sm" data-a="dvRedo" title="Refazer (Ctrl+Y)">↷ Refazer</button>
      <button class="btn sm" data-a="dvImport">Importar desenho</button>${lib?`<button class="btn sm" data-a="dvLib">Repor o da biblioteca</button>`:""}<button class="btn sm ghost" data-a="dvClear">Limpar</button></span>
    </div>
    ${photo?`<p class="note" style="margin:0">Este exercício tem uma foto: a foto é mostrada em vez do desenho. Para usares o desenho, apaga a foto na ficha do exercício.</p>`:""}
    <div class="dtools bptools">${DV_TOOLS.map(t=>`<button data-a="dvTool" data-k="${t.k}" title="${t.l}"><span class="dic" style="${t.c?`color:${t.c}`:""}">${t.k==="ball"||t.k==="balls"?`<svg viewBox="-1.2 -1.2 2.4 2.4" width="16" height="16" aria-hidden="true">${BALL_IN}<circle r="1" fill="none" stroke="#1d1f33" stroke-width=".2"/></svg>`:t.ic}</span>${t.l}</button>`).join("")}</div>
    <div class="bpmain">
      <div class="bpstage"><div class="bppitch dvpitch" id="dvWrap"><svg id="dvS" viewBox="0 0 ${vec.w} ${vec.h}" role="img" aria-label="Desenho do exercício"></svg></div>
        <div class="small muted" id="dvHint" style="margin-top:6px"></div></div>
      <aside class="bpside"><div id="dvProps"></div></aside>
    </div>
    <div class="dvimp" id="dvImp" hidden></div>`;
  modal({title:"Desenho do exercício",sub:esc(ex.name),big:true,body,foot:footSave("Guardar desenho"),ctx:{vec,tool:"sel",sel:null,hist:[],fut:[],exId,
    save:()=>{ const cur=D.exercises[exId]; if(!cur){ closeModal(); return; }
      const o={...clone(cur),vec:clone(M.vec)}; delete o.drw; put("exercises",exId,o); M.dirty=false; closeModal();
      toast(photo?"Desenho guardado (a foto continua a ser mostrada)":"Desenho guardado"); exView(exId); }
  }});
  $("#dlg").classList.add("bpdlg");
  dvBind(); dvRefresh();
  $$("#dlg [data-a=dvField]").forEach(b=>b.classList.remove("on"));
}
/* ---- importar o desenho de outro exercício ---- */
function dvImportList(q){
  const box=$("#dvImp"); if(!box) return;
  const nk=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const list=exercises().filter(x=>x.id!==M.exId&&(x.vec||(x.imgk&&EXVEC[x.imgk])||(x.drw&&(x.drw.it||[]).length)))
    .filter(x=>!q||nk(x.name+" "+(x.cat||"")).includes(nk(q)));
  box.querySelector(".dvimp-l").innerHTML=list.length?list.slice(0,60).map(x=>{ const v=dvOf(x);
    return `<button class="dvimp-i" data-a="dvPick" data-id="${esc(x.id)}"><span class="dvimp-t">${v?vecSVG(v,{r:6}):""}</span><b>${esc(x.name)}</b><small>${esc(x.cat||"")}</small></button>`; }).join("")
    :`<div class="empty"><b>Nenhum exercício com desenho</b></div>`;
}
Object.assign(A,{
  dvTool: el => { if(!M||!M.vec) return; M.tool=el.dataset.k; dvRefresh(false); },
  dvField: el => { if(!M||!M.vec) return; const k=el.dataset.k, n=DV_PRE[k]();
    const go=()=>{ dvSnap(); const sx=n.w/M.vec.w, sy=n.h/M.vec.h;   // os elementos ficam no mesmo sítio relativo
      n.it=M.vec.it.map(it=>{ const o=clone(it); if(o.t==="ln") o.pts=o.pts.map(q=>[dvR(q[0]*sx),dvR(q[1]*sy)]); else { o.x=dvR(o.x*sx); o.y=dvR(o.y*sy); } return o; });
      M.vec=n; M.sel=null; dvRefresh(); };
    go(); },
  dvUndo: () => { if(!M||!M.vec) return; const h=M.hist.pop(); if(!h) return toast("Nada para desfazer."); M.fut.push(JSON.stringify(M.vec)); M.vec=JSON.parse(h); M.sel=null; M.dirty=true; dvRefresh(); },
  dvRedo: () => { if(!M||!M.vec) return; const h=M.fut.pop(); if(!h) return toast("Nada para refazer."); M.hist.push(JSON.stringify(M.vec)); M.vec=JSON.parse(h); M.sel=null; M.dirty=true; dvRefresh(); },
  dvClear: () => { if(!M||!M.vec||!M.vec.it.length) return; dvSnap(); M.vec.it=[]; M.sel=null; dvRefresh(); },
  dvLib: () => { const ex=D.exercises[M.exId]; if(!ex||!EXVEC[ex.imgk]) return; dvSnap(); M.vec=clone(EXVEC[ex.imgk]); M.sel=null; dvRefresh(); toast("Reposto o desenho da biblioteca"); },
  dvImport: () => { const box=$("#dvImp"); box.hidden=false; box.innerHTML=`<div class="dvimp-h"><b>Importar o desenho de outro exercício</b><button class="btn sm" data-a="dvImpClose">Fechar</button></div>
      <input class="inp" id="dvImpQ" placeholder="Procurar por nome ou categoria" autocomplete="off"><div class="dvimp-l"></div>`;
    dvImportList(""); const q=$("#dvImpQ"); q.addEventListener("input",()=>dvImportList(q.value.trim())); },
  dvImpClose: () => { const b=$("#dvImp"); if(b){ b.hidden=true; b.innerHTML=""; } },
  dvPick: el => { const x=D.exercises[el.dataset.id]; if(!x) return; const v=dvOf({id:el.dataset.id,...x}); if(!v) return;
    dvSnap(); M.vec=v; M.vec.it=M.vec.it||[]; M.sel=null; A.dvImpClose(); dvRefresh(); toast(`Desenho de "${x.name}" importado — agora podes alterá-lo.`); },
  dvSet: el => { const it=M.vec.it[M.sel]; if(!it) return; dvSnap(); it[el.dataset.f]=el.dataset.v;
    if(it.t==="d"&&el.dataset.f==="c") it.tc=/^#(f2bd4b|ffffff)$/i.test(el.dataset.v)?"#2a1a08":"#ffffff";
    if(it.t==="rect"&&el.dataset.f==="c"&&it.fill&&it.fill!=="none") it.fill=el.dataset.v; dvRefresh(); },
  dvLine: el => { const it=M.vec.it[M.sel]; if(!it||it.t!=="ln") return; dvSnap(); const k=dvK(), s=el.dataset.s;
    delete it.wave; delete it.dash; if(s==="d") it.dash=`${dvR(5*k)} ${dvR(3.5*k)}`; if(s==="w"){ it.wave=1; it.amp=it.amp||dvR(1.8*k); it.wl=it.wl||dvR(4.5*k); } dvRefresh(); },
  dvArr: el => { const it=M.vec.it[M.sel]; if(!it||it.t!=="ln") return; dvSnap(); const n=+el.dataset.s; if(n) it.arr=n; else delete it.arr; dvRefresh(); },
  dvFill: () => { const it=M.vec.it[M.sel]; if(!it||it.t!=="rect") return; dvSnap(); if(it.fill&&it.fill!=="none"){ it.fill="none"; } else { it.fill=it.c||"#f2bd4b"; it.fo=.18; } dvRefresh(); },
  dvDash: () => { const it=M.vec.it[M.sel]; if(!it||it.t!=="rect") return; dvSnap(); const k=dvK(); if(it.dash) delete it.dash; else it.dash=`${dvR(5*k)} ${dvR(3*k)}`; dvRefresh(); },
  dvSize: el => { const it=M.vec.it[M.sel]; if(!it) return; dvSnap(); const f=+el.dataset.n>0?1.15:1/1.15;
    ["r","s","fs","lw","amp","wl","sw"].forEach(k=>{ if(typeof it[k]==="number") it[k]=dvR(it[k]*f); });
    if(it.t==="rect"){ const cx=it.x+it.w/2, cy=it.y+it.h/2; it.w=dvR(it.w*f); it.h=dvR(it.h*f); it.x=dvR(cx-it.w/2); it.y=dvR(cy-it.h/2); }
    else if(it.t!=="ln"){ ["w","h"].forEach(k=>{ if(typeof it[k]==="number") it[k]=dvR(it[k]*f); }); }
    if(it.t==="d"&&it.fs==null) it.fs=dvR((it.r||6.5)*0.9);
    dvRefresh(); },
  dvRot: el => { const it=M.vec.it[M.sel]; if(!it) return; dvSnap(); it.a=((+it.a||0)+ +el.dataset.n+360)%360; dvRefresh(); },
  dvDup: () => { const it=M.vec.it[M.sel]; if(!it) return; dvSnap(); const o=clone(it), d=8*dvK(); dvMove(o,d,d); M.vec.it.push(o); M.sel=M.vec.it.length-1; dvRefresh(); },
  dvDel: () => { if(M.sel==null) return; dvSnap(); M.vec.it.splice(M.sel,1); M.sel=null; dvRefresh(); }
});
document.addEventListener("change",e=>{ const el=e.target; if(!el.dataset||!el.dataset.dvf||!M||!M.vec||M.sel==null) return;
  const it=M.vec.it[M.sel]; if(!it) return; dvSnap(); it[el.dataset.dvf]=el.value; dvRefresh(false); });
document.addEventListener("input",e=>{ const el=e.target; if(!el.dataset||!el.dataset.dvf||!M||!M.vec||M.sel==null) return;
  const it=M.vec.it[M.sel]; if(!it) return; it[el.dataset.dvf]=el.value; M.dirty=true; const s=$("#dvS"); if(s){ s.innerHTML=dvSVG(); dvSelDraw(); } });
document.addEventListener("keydown",e=>{ if(!M||!M.vec||!$("#dlg").open) return; const t=e.target;
  if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==="z"){ e.preventDefault(); e.shiftKey?A.dvRedo():A.dvUndo(); }
  else if(mod&&e.key.toLowerCase()==="y"){ e.preventDefault(); A.dvRedo(); }
  else if(mod&&e.key.toLowerCase()==="d"&&M.sel!=null){ e.preventDefault(); A.dvDup(); }
  else if((e.key==="Delete"||e.key==="Backspace")&&M.sel!=null){ e.preventDefault(); A.dvDel(); }
  else if(M.sel!=null&&e.key.startsWith("Arrow")){ e.preventDefault(); const it=M.vec.it[M.sel], s=(e.shiftKey?5:1)*dvK(); dvSnap();
    dvMove(it,e.key==="ArrowLeft"?-s:e.key==="ArrowRight"?s:0,e.key==="ArrowUp"?-s:e.key==="ArrowDown"?s:0); dvRefresh(false); }
});

/* ---- novo exercício a partir de um que já existe (copia tudo, incluindo o desenho, e abre o editor) ---- */
function exFromCopy(srcId){
  const x=D.exercises[srcId]; if(!x) return null;
  const names=new Set(exercises().map(e=>e.name)); let nm=`${x.name} (cópia)`, i=2; while(names.has(nm)) nm=`${x.name} (cópia ${i++})`;
  const o=clone(x); o.name=nm; delete o._by; delete o._at; delete o.auto;
  const v=dvOf({id:srcId,...x}); if(v){ o.vec=v; delete o.drw; if(!x.vec&&x.imgk&&EXVEC[x.imgk]) delete o.imgk; }
  const id=uid("ex"); put("exercises",id,o); return id;
}
Object.assign(A,{
  exFrom: el => { const id=exFromCopy(el.dataset.id); if(!id) return; toast("Cópia criada — altera o desenho e depois, em Editar, o nome e a descrição."); drawEditor(id); }
});
