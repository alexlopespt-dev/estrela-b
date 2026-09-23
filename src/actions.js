/* ================= modais ================= */
let M = null;
function modal({title,sub="",body,foot,big=false,ctx={}}){
  const d=$("#dlg");
  d.className = big ? "big" : "";
  d.innerHTML = `<div class="dlg-h"><div style="flex:1;min-width:0"><h3>${title}</h3>${sub?`<p>${sub}</p>`:""}</div><button class="x" data-a="mClose" aria-label="Fechar">✕</button></div>
    <div class="dlg-b">${body}</div>${foot?`<div class="dlg-f">${foot}</div>`:""}`;
  M = {...ctx, dirty:false};
  if(!d.open) d.showModal();
  const f=d.querySelector(".dlg-b input:not([type=hidden]):not([readonly]), .dlg-b select, .dlg-b textarea");
  if(f && !big) { try{ f.focus(); }catch(e){} }
}
function closeModal(){ const d=$("#dlg"); if(d.open) d.close(); M=null; }
const footSave = (label="Guardar", delLabel) => `${delLabel?`<button class="btn ghost" data-a="mDel">${delLabel}</button>`:"<span></span>"}<span class="right"><button class="btn" data-a="mClose">Cancelar</button><button class="btn primary" data-a="mSave">${label}</button></span>`;
const fv = n => { const el=$(`#dlg [name="${n}"]`); if(!el) return ""; if(el.type==="checkbox") return el.checked; return String(el.value).trim(); };
$("#dlg").addEventListener("input", ()=>{ if(M && !M.pick) M.dirty=true; });
$("#dlg").addEventListener("cancel", e=>{ if(M&&M.dirty){ e.preventDefault(); askConfirm("Fechar sem guardar as alterações?","Fechar sem guardar",true).then(ok=>{ if(ok) closeModal(); }); } else { M=null; } });

function askConfirm(msg, okLabel, danger){
  return new Promise(res=>{
    const d=$("#dlgAsk");
    d.innerHTML=`<div class="ask-b">${esc(msg)}</div><div class="dlg-f"><span></span><span class="right"><button class="btn" data-ask="0">Cancelar</button><button class="btn ${danger?"danger":"primary"}" data-ask="1">${esc(okLabel||"Confirmar")}</button></span></div>`;
    const done=v=>{ d.onclick=null; d.oncancel=null; if(d.open) d.close(); res(v); };
    d.onclick=e=>{ const b=e.target.closest("button[data-ask]"); if(b) done(b.dataset.ask==="1"); };
    d.oncancel=e=>{ e.preventDefault(); done(false); };
    d.showModal(); d.querySelector('[data-ask="1"]').focus();
  });
}

/* ================= fotos ================= */
function thumb(file){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{ const s=240, c=document.createElement("canvas"); c.width=c.height=s; const x=c.getContext("2d");
      const m=Math.min(img.naturalWidth,img.naturalHeight), sx=(img.naturalWidth-m)/2, sy=Math.max(0,(img.naturalHeight-m)*0.2);
      x.drawImage(img,sx,sy,m,m,0,0,s,s); URL.revokeObjectURL(url); c.toBlob(b=>b?res(b):rej(new Error("blob")),"image/jpeg",0.85); };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error("img")); };
    img.src=url;
  });
}
const blobToData = b => new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(b); });
let photoTarget=null, exImgTarget=null;
function imgResize(file,maxW=560,q=0.62){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{ const w=Math.min(maxW,img.naturalWidth), h=Math.round(img.naturalHeight*w/img.naturalWidth);
      const c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg",q)); };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error("img")); };
    img.src=url;
  });
}
function imgBlob(file,maxW=1800,q=0.88){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{ const w=Math.min(maxW,img.naturalWidth), h=Math.round(img.naturalHeight*w/img.naturalWidth);
      const c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d"); x.imageSmoothingQuality="high"; x.drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url); c.toBlob(b=>b?res(b):rej(new Error("blob")),"image/jpeg",q); };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error("img")); };
    img.src=url;
  });
}
$("#fileIn").addEventListener("change", async e=>{
  const f=e.target.files[0]; e.target.value=""; if(!f||!photoTarget) return;
  if(String(photoTarget).startsWith("staff:")){ const sid=photoTarget.slice(6); if(!D.staff[sid]) return;
    let blob; try{ blob=await thumb(f); }catch(err){ toast("Esse ficheiro não é uma imagem que o browser consiga abrir."); return; }
    const s=clone(D.staff[sid]);
    if(assets){ try{ const r=await assets.upload(blob,{type:"image/jpeg"}); s.photo=r.id; delete s.photoData; put("staff",sid,s); toast("Foto guardada"); closeModal(); return; }catch(err){} }
    s.photoData=await blobToData(blob); s.photo=null; put("staff",sid,s); toast("Foto guardada"); closeModal(); return; }
  if(String(photoTarget).startsWith("opp:")){ const oid=photoTarget.slice(4); if(!D.opponents[oid]) return;
    let blob; try{ blob=await imgBlob(f,256,0.9); }catch(err){ toast("Esse ficheiro não é uma imagem que o browser consiga abrir."); return; }
    const st=await saveImg(blob); const o=clone(D.opponents[oid]); if(!o) return; dropImg(o); delete o.imgA; delete o.imgL; delete o.crk;
    if(st) Object.assign(o,st); else o.crest=await blobToData(blob);
    put("opponents",oid,o); toast("Emblema guardado"); return; }
  if(!D.players[photoTarget]) return;
  let blob; try{ toast("A carregar a foto…"); blob=await thumb(f); }catch(err){ toast("Esse ficheiro não é uma imagem que o browser consiga abrir. Usa JPG ou PNG."); return; }
  const p=clone(D.players[photoTarget]);
  if(assets){ try{ const r=await assets.upload(blob,{type:"image/jpeg"}); p.photo=r.id; delete p.photoData; put("players",photoTarget,p); toast("Foto guardada"); return; }catch(err){ /* segue para guardar no documento */ } }
  p.photoData=await blobToData(blob); p.photo=null; put("players",photoTarget,p); toast("Foto guardada");
});

/* ================= cópias de segurança ================= */
async function exportData(){
  toast("A preparar a cópia…");
  const out={app:"estrela-tecnico",v:1,exported:new Date().toISOString()};
  COLS.forEach(c=>out[c]=clone(D[c]));
  for(const x of Object.values(out.exercises)){ if(x.imgA||x.imgL){ const src=exImg(x); const data=src?await srcToData(src):null; if(data&&data.startsWith("data:")){ x.img=data; delete x.imgA; delete x.imgL; } } }
  for(const [id,p] of Object.entries(out.players)){ if(p.photo){ try{ const r=await fetch("/_blob/"+p.photo); if(r.ok){ p.photoData=await blobToData(await r.blob()); p.photo=null; } }catch(e){} } }
  const data=JSON.stringify(out), fname=`estrela-tecnico-${todayISO()}.json`;
  const dl=await use("downloads");
  if(dl){ try{ await dl.save({filename:fname,data}); }catch(e){ if(!e||e.code!=="declined") toast("Não foi possível descarregar a cópia."); } return; }
  try{ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([data],{type:"application/json"})); a.download=fname; document.body.appendChild(a); a.click(); a.remove(); toast("Cópia descarregada"); }
  catch(e){ toast("Não foi possível descarregar a cópia."); }
}
async function importData(file){
  let d=null; try{ d=JSON.parse(await file.text()); }catch(e){ d=null; }
  if(!d || d.app!=="estrela-tecnico" || typeof d.players!=="object"){ toast("Esse ficheiro não é uma cópia desta app."); return; }
  if(!(await askConfirm(`Substituir todos os dados atuais pela cópia de ${d.exported?fmtD(d.exported.slice(0,10),{day:"numeric",month:"long",year:"numeric"}):"um ficheiro"}?`,"Substituir",true))) return;
  for(const x of Object.values(d.exercises&&typeof d.exercises==="object"?d.exercises:{})){
    if(x && typeof x.img==="string" && x.img.startsWith("data:") && x.img.length>120000){
      try{ const st=await saveImg(await (await fetch(x.img)).blob()); if(st){ delete x.img; Object.assign(x,st); } }catch(e){} } }
  for(const c of COLS){
    const next=d[c]&&typeof d[c]==="object"?d[c]:{};
    Object.keys(D[c]).forEach(id=>{ if(!(id in next)) del(c,id); });
    Object.entries(next).forEach(([id,o])=>put(c,id,o));
  }
  toast("Cópia importada");
}
$("#jsonIn").addEventListener("change", e=>{ const f=e.target.files[0]; e.target.value=""; if(f) importAny(f); });
$("#exImgIn").addEventListener("change", async e=>{
  const f=e.target.files[0]; e.target.value=""; if(!f||!exImgTarget||!D.exercises[exImgTarget]) return;
  const tid=exImgTarget;
  try{ toast("A preparar a imagem…");
    const blob=await imgBlob(f); const stored=await saveImg(blob);
    const x=clone(D.exercises[tid]); if(!x) return; dropImg(x); delete x.img; delete x.imgA; delete x.imgL;
    if(stored) Object.assign(x,stored); else x.img=await imgResize(f, db?560:1000, db?0.62:0.75);
    put("exercises",tid,x); toast(stored?"Imagem guardada em alta resolução":"Imagem guardada"); exView(tid); }
  catch(err){ toast("Esse ficheiro não é uma imagem que o browser consiga abrir. Usa JPG ou PNG."); }
});
document.addEventListener("input", e=>{ if(e.target.id==="pickSearch") pickFilter(); });
async function importAny(file){
  let d=null; try{ d=JSON.parse(await file.text()); }catch(e){ d=null; }
  if(d && d.app==="ratings-plantel" && Array.isArray(d.players)){
    const nR=Object.values(d.rounds||{}).filter(r=>r&&Object.keys(r.p||{}).length).length;
    if(!nR){ toast("Essa cópia da app de ratings não tem jornadas com notas."); return; }
    if(!(await askConfirm(`Importar ${nR} jornada${nR>1?"s":""} com notas da app de ratings? Os jogos com a mesma data são atualizados, os outros são criados.`,"Importar"))) return;
    importRatings(d); return;
  }
  importData(file);
}

/* ================= formulários ================= */
function newEventForm(type,date){
  const m=meta(), d=validISO(date)?date:todayISO();
  const body = type==="treino" ? `<div class="form">
      <label class="fld">Data<input type="date" name="date" value="${d}"></label>
      <label class="fld">Hora<input type="time" name="time"></label>
      <label class="fld">Duração (min)<input name="dur" inputmode="numeric" value="90"></label>
      <label class="fld">Local<input name="place"></label>
      <label class="fld">Tipo de treino${sel("ttype",TR_TYPES.map(t=>({v:t.k,l:t.l})),"","","—")}</label>
      <label class="fld">Intensidade${sel("int",INTS.map(i=>i.l),"","","—")}</label>
      <label class="fld full">Tema / objetivo<input name="theme" placeholder="Ex.: Transição defensiva"></label></div>`
    : `<div class="form">
      <label class="fld full">Adversário<input name="opp" placeholder="Nome do adversário"></label>
      <label class="fld">Data<input type="date" name="date" value="${d}"></label>
      <label class="fld">Hora<input type="time" name="time"></label>
      <label class="fld">Local${sel("venue",[{v:"C",l:"Casa"},{v:"F",l:"Fora"}],"C")}</label>
      <label class="fld">Competição<input name="comp" list="compList2" value="${esc(m.comp||"")}"></label>
      <label class="fld">Fase / jornada<input name="phase" placeholder="Ex.: Jornada 2"></label>
      <datalist id="compList2">${competitions().map(x=>`<option value="${esc(x)}">`).join("")}</datalist></div>`;
  modal({title:type==="treino"?"Novo treino":"Novo jogo",body,foot:footSave("Criar"),ctx:{save:()=>{
    const date=fv("date"); if(!validISO(date)){ toast("Escolhe uma data."); return; }
    const id=uid(type==="treino"?"tr_":"jg_");
    const o = type==="treino" ? {type,date,time:fv("time"),dur:parseNum(fv("dur"))||90,place:fv("place"),ttype:fv("ttype"),int:fv("int"),theme:fv("theme"),plan:[],att:{},closed:false}
      : {type,date,time:fv("time"),opp:fv("opp"),venue:fv("venue")||"C",comp:fv("comp"),phase:fv("phase"),dur:90,call:[],xi:[],ev:[],rt:{},ga:null,closed:false};
    put("events",id,o); closeModal(); S.tab=type==="treino"?"treinos":"jogos"; saveUI(); openPage(type==="treino"?"treino":"jogo",id); toast(type==="treino"?"Treino criado":"Jogo criado");
  }}});
}

function weekGenForm(){
  const t=todayISO(), wd=(toD(t).getDay()+6)%7;
  const mon = wd<=1 ? mondayOf(t) : addDays(mondayOf(t),7);
  const days=[["Seg",0,false],["Ter",1,true],["Qua",2,true],["Qui",3,true],["Sex",4,true],["Sáb",5,false]];
  const body=`<p class="small muted" style="margin:0 0 12px">Semana-tipo da equipa: treinos de 3.ª a 6.ª, folga à 2.ª e ao sábado, jogo ao domingo. Não duplica o que já existir nesses dias.</p>
  <div class="form">
    <label class="fld">Segunda-feira da semana<input type="date" name="mon" value="${mon}"></label>
    <label class="fld">Hora dos treinos<input type="time" name="time"></label>
    <label class="fld">Duração (min)<input name="dur" inputmode="numeric" value="90"></label>
    <label class="fld">Local<input name="place"></label>
    <div class="fld full">Dias de treino — tipo e intensidade<div class="wkdays">${days.map(([l,o,on])=>`<div class="wkday"><label class="chip" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" name="d${o}" ${on?"checked":""} style="accent-color:var(--grena)">${l}</label>${sel("tt"+o,TR_TYPES.map(t=>({v:t.k,l:t.l})),"",'aria-label="Tipo de treino"',"Tipo…")}${sel("in"+o,INTS.map(i=>i.l),"",'aria-label="Intensidade"',"Intensidade…")}</div>`).join("")}</div></div>
    <label class="fld full" style="flex-direction:row;align-items:center;gap:8px;color:var(--text)"><input type="checkbox" name="game" checked style="width:auto;accent-color:var(--grena)"> Criar jogo ao domingo</label>
    <label class="fld">Adversário<input name="opp"></label>
    <label class="fld">Hora do jogo<input type="time" name="gtime"></label>
    <label class="fld">Local do jogo${sel("venue",[{v:"C",l:"Casa"},{v:"F",l:"Fora"}],"C")}</label>
    <label class="fld">Fase / jornada<input name="phase" placeholder="Ex.: Jornada 2"></label>
    <label class="fld full">Objetivo do microciclo<input name="obj" placeholder="Ex.: Pressão alta após perda"></label>
  </div>`;
  modal({title:"Gerar semana-tipo",body,foot:footSave("Gerar semana"),ctx:{save:()=>{
    const mon=fv("mon"); if(!validISO(mon)){ toast("Escolhe a segunda-feira da semana."); return; }
    const monday=mondayOf(mon), evs=events(); let nT=0, nG=0;
    const dur=parseNum(fv("dur"))||90;
    for(let o=0;o<6;o++){ if(!fv("d"+o)) continue; const d=addDays(monday,o);
      if(evs.some(e=>e.type==="treino"&&e.date===d)) continue;
      put("events",uid("tr_"),{type:"treino",date:d,time:fv("time"),dur,place:fv("place"),ttype:fv("tt"+o),int:fv("in"+o),theme:"",plan:[],att:{},closed:false}); nT++; }
    if(fv("game")){ const d=addDays(monday,6);
      if(!evs.some(e=>e.type==="jogo"&&e.date===d)){ put("events",uid("jg_"),{type:"jogo",date:d,time:fv("gtime"),opp:fv("opp"),venue:fv("venue")||"C",comp:meta().comp||"",phase:fv("phase"),dur:90,call:[],xi:[],ev:[],rt:{},ga:null,closed:false}); nG++; } }
    let mc=false;
    if(!cycles("micro").some(c=>c.start<=addDays(monday,6)&&c.end>=monday)){ put("cycles",uid("cy_"),{kind:"micro",name:`Microciclo ${fmtD(monday)}`,start:monday,end:addDays(monday,6),obj:fv("obj"),notes:""}); mc=true; }
    closeModal(); S.day=monday; S.cal=monday.slice(0,7);
    toast(nT||nG||mc ? `Criado: ${[nT?nT+(nT>1?" treinos":" treino"):"",nG?"1 jogo":"",mc?"microciclo":""].filter(Boolean).join(", ")}.` : "Nada a criar: essa semana já tem os treinos e o jogo.");
  }}});
}

function cycleForm(kind,id){
  const c=id?D.cycles[id]:null; kind=c?c.kind:kind;
  const t=todayISO(), mon=addDays(mondayOf(t),7);
  const body=`<div class="form">
    <label class="fld full">Nome<input name="name" value="${esc(c?c.name:(kind==="meso"?"Mesociclo "+(cycles("meso").length+1):"Microciclo "+fmtD(mon)))}"></label>
    <label class="fld">Início<input type="date" name="start" value="${esc(c?c.start:mon)}"></label>
    <label class="fld">Fim<input type="date" name="end" value="${esc(c?c.end:addDays(mon,kind==="meso"?27:6))}"></label>
    <label class="fld">Período da época${sel("period",PERIODS,c?c.period:"","","—")}</label>
    <label class="fld full">Objetivo<input name="obj" value="${esc(c?c.obj:"")}"></label>
    <label class="fld full">Conteúdos / notas<textarea name="notes">${esc(c?c.notes:"")}</textarea></label></div>`;
  modal({title:(c?"Editar ":"Novo ")+(kind==="meso"?"mesociclo":"microciclo"),body,foot:footSave("Guardar",c?"Eliminar":null),ctx:{
    save:()=>{ const s=fv("start"), e=fv("end"); if(!validISO(s)||!validISO(e)){ toast("Indica o início e o fim."); return; } if(e<s){ toast("O fim tem de ser depois do início."); return; }
      put("cycles",id||uid("cy_"),{kind,name:fv("name")||(kind==="meso"?"Mesociclo":"Microciclo"),start:s,end:e,period:fv("period"),obj:fv("obj"),notes:fv("notes")}); closeModal(); toast("Guardado"); },
    del:()=>askConfirm("Eliminar este ciclo? Os treinos não são apagados.","Eliminar",true).then(ok=>{ if(ok){ del("cycles",id); closeModal(); } })
  }});
}

function exView(id){
  const x=D.exercises[id]; if(!x) return;
  const row=(l,v)=>v?`<p style="margin:0 0 10px"><b>${l}:</b> ${esc(v)}</p>`:"";
  modal({title:esc(x.name),sub:esc([x.cat,x.dur?x.dur+"'":"",x.players?x.players+" jogadores":""].filter(Boolean).join(" — ")),
    body:`${x.auto?`<p class="small" style="margin:0 0 10px;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--r6) 15%,transparent)"><b>Descrição proposta</b> a partir do nome e do desenho. Revê e carrega em Editar → Guardar para a confirmar.</p>`:""}${exImg(x)?`<div style="margin-bottom:12px"><img src="${esc(exImg(x))}" alt="" style="width:100%;border-radius:10px"></div>`:(x.drw&&(x.drw.it||[]).length?`<div style="margin-bottom:12px">${drawSVG(x.drw)}</div>`:"")}${row("Objetivo",x.obj)}${x.desc?`<p style="margin:0 0 10px;white-space:pre-line">${esc(x.desc)}</p>`:""}${row("Princípios",(x.pr||[]).filter(k=>D.principles[k]).map(k=>D.principles[k].name).join(", "))}${row("Espaço",x.space)}${row("Material",x.mat)}${x.cp?`<p style="margin:0;white-space:pre-line"><b>Pontos-chave e variantes:</b><br>${esc(x.cp)}</p>`:""}`,
    foot:`<button class="btn" data-a="exPhoto" data-id="${esc(id)}">${x.img||x.imgA||x.imgL?"Mudar foto":"Foto"}</button><button class="btn" data-a="drawEx" data-id="${esc(id)}">${x.drw&&(x.drw.it||[]).length?"Editar desenho":"Desenhar"}</button><span class="right"><button class="btn" data-a="mClose">Fechar</button><button class="btn primary" data-a="exEdit" data-id="${esc(id)}">Editar</button></span>`});
}
function exForm(id){
  const x=id?D.exercises[id]:{};
  const body=`<div class="form">
    <label class="fld full">Nome<input name="name" value="${esc(x.name||"")}"></label>
    <label class="fld">Categoria${sel("cat",exCats().includes(x.cat)||!x.cat?exCats():exCats().concat([x.cat]),x.cat||exCats()[0])}</label>
    <label class="fld">Duração (min)<input name="dur" inputmode="numeric" value="${esc(x.dur??"")}"></label>
    <label class="fld">N.º de jogadores<input name="players" value="${esc(x.players??"")}"></label>
    <label class="fld">Espaço<input name="space" value="${esc(x.space||"")}" placeholder="Ex.: 30x20 m"></label>
    <label class="fld full">Material<input name="mat" value="${esc(x.mat||"")}"></label>
    <label class="fld full">Objetivo<input name="obj" value="${esc(x.obj||"")}"></label>
    <label class="fld full">Descrição / organização<textarea name="desc">${esc(x.desc||"")}</textarea></label>
    <label class="fld full">Pontos-chave e variantes<textarea name="cp">${esc(x.cp||"")}</textarea></label></div>
    ${prChecks(x.pr||[])}`;
  modal({title:id?"Editar exercício":"Novo exercício",big:true,body,foot:footSave("Guardar",id?"Eliminar":null),ctx:{
    save:()=>{ const name=fv("name"); if(!name){ toast("Dá um nome ao exercício."); return; }
      const nid=id||uid("ex_");
      const base0=id?clone(D.exercises[id]):{}; delete base0.auto;
      put("exercises",nid,{...base0,pr:principles().filter(p=>fv("pr_"+p.id)).map(p=>p.id),name,cat:fv("cat"),dur:parseNum(fv("dur")),players:fv("players"),space:fv("space"),mat:fv("mat"),obj:fv("obj"),desc:fv("desc"),cp:fv("cp")});
      closeModal(); toast("Exercício guardado"); if(!id) setTimeout(()=>drawEditor(nid),60); },
    del:()=>askConfirm("Eliminar este exercício da biblioteca? Os treinos que o usam mantêm o nome do bloco.","Eliminar",true).then(ok=>{ if(ok){ del("exercises",id); closeModal(); } })
  }});
}

function evForm(gid){
  const g=D.events[gid]; if(!g) return;
  const call=(g.call||[]).map(P).filter(Boolean).sort(BYPOS);
  const opts=call.map(p=>({v:p.id,l:(p.n?p.n+" — ":"")+p.name}));
  const draw=()=>{
    const t=M.t;
    let f="";
    if(t==="golo") f=`<label class="fld">Marcador${sel("pid",[...opts,{v:"og",l:"Autogolo do adversário"}],"")}</label><label class="fld">Assistência${sel("ast",opts,"","", "Sem assistência")}</label>`;
    else if(t==="sub") f=`<label class="fld">Sai${sel("out",opts,"")}</label><label class="fld">Entra${sel("in",opts,"")}</label>`;
    else f=`<label class="fld">Jogador${sel("pid",opts,"")}</label>`;
    $("#evFields").innerHTML=`<label class="fld">Minuto${t==="sub"||t==="vermelho"?" (obrigatório)":""}<input name="min" inputmode="numeric" placeholder="Ex.: 63"></label>${f}`;
    $$("#dlg [data-a=evType]").forEach(b=>b.classList.toggle("on",b.dataset.k===t));
  };
  modal({title:"Novo evento",sub:esc((g.venue==="F"?"@ ":"vs ")+(g.opp||"")),
    body:`<div class="seg" style="margin-bottom:14px;flex-wrap:wrap">${[["golo","Golo"],["assist","Assistência"],["amarelo","Amarelo"],["vermelho","Vermelho"],["sub","Substituição"]].map(([k,l])=>`<button data-a="evType" data-k="${k}">${l}</button>`).join("")}</div><div class="form" id="evFields"></div>
      <p class="note">Os minutos jogados são calculados pelas substituições e expulsões (2 amarelos também contam como expulsão).</p>`,
    foot:footSave("Adicionar"),ctx:{t:"golo",draw,save:()=>{
      const t=M.t, min=parseNum(fv("min")), dur=+g.dur>0?+g.dur:90;
      if(min!=null && (min<0||min>dur+30)){ toast(`O minuto tem de estar entre 0 e ${dur+30}.`); return; }
      const ev=clone(g.ev||[]);
      if(t==="sub"){ const o=fv("out"), i=fv("in"); if(min==null){ toast("Indica o minuto da substituição."); return; } if(!o||!i){ toast("Escolhe quem sai e quem entra."); return; } if(o===i){ toast("Quem sai e quem entra têm de ser diferentes."); return; }
        const xi=new Set(g.xi||[]); if(xi.has(i)){ toast(`${pname(i)} é titular — não pode entrar como suplente.`); return; }
        if(ev.some(e=>e.t==="sub"&&e.in===i)){ toast(`${pname(i)} já entrou neste jogo.`); return; }
        if(ev.some(e=>e.t==="sub"&&e.out===o)){ toast(`${pname(o)} já foi substituído.`); return; }
        ev.push({id:uid("e"),t:"sub",min,out:o,in:i}); }
      else if(t==="golo"){ const pid=fv("pid"), ast=fv("ast"); if(!pid){ toast("Escolhe o marcador."); return; } if(ast&&ast===pid){ toast("O marcador não pode ser a assistência."); return; }
        const gid2=uid("e"); ev.push({id:gid2,t:"golo",min,pid:pid==="og"?"":pid}); if(ast) ev.push({id:uid("e"),t:"assist",min,pid:ast,of:gid2}); }
      else { const pid=fv("pid"); if(!pid){ toast("Escolhe o jogador."); return; } if(t==="vermelho"&&min==null){ toast("Indica o minuto da expulsão."); return; } ev.push({id:uid("e"),t,min,pid}); }
      put("events",gid,{...g,ev}); closeModal(); toast("Evento adicionado");
    }}});
  draw();
}

function playerForm(id){
  const p=id?D.players[id]:{};
  const body=`<div class="form">
    <label class="fld">N.º<input name="n" inputmode="numeric" value="${esc(p.n??"")}"></label>
    <label class="fld" style="grid-column:span 2">Nome<input name="name" value="${esc(p.name||"")}"></label>
    <label class="fld">Posição${sel("pos",POS,p.pos||"MC")}</label>
    <label class="fld">Pé${sel("foot",FEET,p.foot,"","—")}</label>
    <label class="fld">Data de nascimento<input type="date" name="birth" value="${esc(p.birth||"")}"></label>
    <label class="fld">Altura (cm)<input name="height" inputmode="numeric" value="${esc(p.height??"")}"></label>
    <label class="fld">Peso (kg)<input name="weight" inputmode="decimal" value="${esc(p.weight??"")}"></label></div>`;
  modal({title:id?"Editar atleta":"Novo atleta",body,foot:id?`<button class="btn ghost" data-a="mDel">${p.archived?"Repor no plantel":"Marcar como saído"}</button><span class="right"><button class="btn" data-a="mClose">Cancelar</button><button class="btn primary" data-a="mSave">Guardar</button></span>`:footSave("Adicionar"),ctx:{
    save:()=>{ const name=fv("name"); if(!name){ toast("Indica o nome do atleta."); return; }
      const o={...(id?clone(D.players[id]):{photo:null}),n:parseNum(fv("n")),name,pos:fv("pos"),foot:fv("foot"),birth:fv("birth"),height:parseNum(fv("height")),weight:parseNum(fv("weight"))};
      const nid=id||uid("p_"); put("players",nid,o); closeModal(); toast(id?"Dados guardados":"Atleta adicionado"); if(!id) openPage("atleta",nid); },
    del:()=>{ const o=clone(D.players[id]); o.archived=!o.archived; put("players",id,o); closeModal(); toast(o.archived?"Marcado como saído. O historial mantém-se.":"Reposto no plantel"); }
  }});
}

function evalForm(pid,evalId){
  const ev=evalId?clone(D.evals[evalId]):{pid,date:todayISO(),by:"",v:{},str:"",weak:"",fin:""};
  pid=ev.pid; const p=P(pid); if(!p) return;
  const v=ev.v||{};
  const areaAvg=k=>{ const a=Object.values(M.v[k]||{}).map(parseNum).filter(x=>x!=null); return avg(a); };
  const body=`<div class="form"><label class="fld">Data<input type="date" name="date" value="${esc(ev.date)}"></label><label class="fld">Responsável<input name="by" value="${esc(ev.by||"")}" placeholder="Ex.: Treinador principal"></label></div>
    <p class="note">Arrasta para avaliar de 0 a 10. Só contam os atributos que avaliares — toca no valor para limpar.</p>
    ${Object.entries(evalCfg()).map(([k,a0])=>{ const a={l:a0.l,a:a0.a.concat(Object.keys(v[k]||{}).filter(x=>!a0.a.includes(x)&&parseNum(v[k][x])!=null))}; return `<div class="asec"><span>${esc(a.l)}</span><span id="av_${k}" class="muted">–</span></div>${a.a.map((attr,i)=>{ const val=parseNum((v[k]||{})[attr]);
      return `<div class="slrow ${val==null?"unset":""}" id="sr_${k}_${i}"><span>${esc(attr)}</span><input type="range" min="0" max="10" step="0.5" value="${val==null?5:val}" data-sl="${k}" data-attr="${esc(attr)}" data-i="${i}" aria-label="${esc(attr)}"><button class="lnk" data-a="slClear" data-k="${k}" data-attr="${esc(attr)}" data-i="${i}"><output>${val==null?"–":fmt1(val)}</output></button></div>`; }).join("")}`; }).join("")}
    <div class="form" style="margin-top:14px">
      <label class="fld full">Principais qualidades<textarea name="str">${esc(ev.str||"")}</textarea></label>
      <label class="fld full">Aspetos a melhorar<textarea name="weak">${esc(ev.weak||"")}</textarea></label>
      <label class="fld full">Avaliação final<input name="fin" value="${esc(ev.fin||"")}" placeholder="Ex.: Titular indiscutível, a subir de forma"></label></div>`;
  modal({title:esc(p.name),sub:evalId?"Editar avaliação":"Nova avaliação",big:true,body,foot:footSave("Guardar avaliação",evalId?"Eliminar":null),ctx:{v:clone(v),areaAvg,
    save:()=>{ const date=fv("date"); if(!validISO(date)){ toast("Indica a data."); return; }
      const has=Object.values(M.v).some(o=>Object.values(o||{}).some(x=>parseNum(x)!=null));
      if(!has){ toast("Avalia pelo menos um atributo."); return; }
      put("evals",evalId||uid("av_"),{pid,date,by:fv("by"),v:M.v,str:fv("str"),weak:fv("weak"),fin:fv("fin")}); closeModal(); toast("Avaliação guardada"); },
    del:()=>askConfirm("Eliminar esta avaliação?","Eliminar",true).then(ok=>{ if(ok){ del("evals",evalId); closeModal(); } })
  }});
  Object.keys(evalCfg()).forEach(k=>{ const a=areaAvg(k); $("#av_"+k).textContent=a==null?"–":fmt1(a); });
}

function injForm(pid,injId){
  const i=injId?clone(D.injuries[injId]):{pid:pid||"",date:todayISO(),type:"Muscular",zone:"",side:"—",ctx:"Treino",sev:"",diag:"",exp:"",status:"ativa",ret:"",plan:[],notes:""};
  const pls=players().map(p=>({v:p.id,l:(p.n?p.n+" — ":"")+p.name}));
  if(i.pid && !pls.some(o=>o.v===i.pid)){ const p=P(i.pid); if(p) pls.push({v:p.id,l:p.name}); }
  const body=`<div class="form">
    <label class="fld full">Atleta${sel("pid",pls,i.pid,"","Escolhe o atleta")}</label>
    <label class="fld">Data da lesão<input type="date" name="date" value="${esc(i.date)}"></label>
    <label class="fld">Contexto${sel("ctx",["Treino","Jogo","Fora do clube"],i.ctx)}</label>
    <label class="fld">Tipo${sel("type",INJ_TYPES,i.type)}</label>
    <label class="fld">Zona${sel("zone",INJ_ZONES,i.zone,"","—")}</label>
    <label class="fld">Lado${sel("side",["—","Esquerdo","Direito"],i.side||"—")}</label>
    <label class="fld">Gravidade${sel("sev",INJ_SEV,i.sev,"","—")}</label>
    <label class="fld full">Diagnóstico<input name="diag" value="${esc(i.diag||"")}" placeholder="Ex.: Rotura grau I bicípite femoral"></label>
    <label class="fld">Regresso previsto<input type="date" name="exp" value="${esc(i.exp||"")}"></label>
    <label class="fld">Estado${sel("status",Object.entries(INJ_ST).map(([k,v])=>({v:k,l:v.l})),i.status)}</label>
    <label class="fld">Data da alta<input type="date" name="ret" value="${esc(i.ret||"")}"></label>
    <label class="fld full">Plano de recuperação — um passo por linha<textarea name="plan" placeholder="Fisioterapia diária&#10;Corrida contínua&#10;Treino condicionado&#10;Treino integrado">${esc((i.plan||[]).map(s=>s.t).join("\n"))}</textarea></label>
    <label class="fld full">Notas<textarea name="notes">${esc(i.notes||"")}</textarea></label></div>
    ${injId?`<div class="asec" style="margin-top:16px"><span>Tratamentos</span><button class="btn sm" data-a="trtNew" data-id="${esc(injId)}">+ Tratamento</button></div>${(i.trt||[]).length?(i.trt||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>`<button class="li" style="padding:7px 0" data-a="trtEdit" data-id="${esc(injId)}" data-t="${esc(x.id)}"><span class="main"><b style="font-size:13px">${fmtD(x.date,{day:"numeric",month:"short",year:"numeric"})}${x.by?" — "+esc(x.by):""}</b><small>${esc(x.desc||"")}${x.evo?" — "+esc(x.evo):""}</small></span>${parseNum(x.pain)!=null?`<span class="tag">Dor ${esc(x.pain)}</span>`:""}</button>`).join(""):`<p class="small muted">Sem tratamentos.</p>`}`:""}`;
  modal({title:injId?"Editar lesão":"Registar lesão",big:true,body,foot:footSave("Guardar",injId?"Eliminar":null),ctx:{
    save:()=>{ const p=fv("pid"), date=fv("date"); if(!p){ toast("Escolhe o atleta."); return; } if(!validISO(date)){ toast("Indica a data da lesão."); return; }
      const status=fv("status"); let ret=fv("ret"); if(status==="alta"&&!validISO(ret)) ret=todayISO();
      if(validISO(ret)&&ret<date){ toast("A data da alta não pode ser antes da lesão."); return; }
      const old=i.plan||[]; const plan=fv("plan").split("\n").map(s=>s.trim()).filter(Boolean).map(t=>({t,done:!!(old.find(o=>o.t===t)||{}).done}));
      put("injuries",injId||uid("in_"),{trt:clone((injId&&D.injuries[injId]&&D.injuries[injId].trt)||[]),pid:p,date,ctx:fv("ctx"),type:fv("type"),zone:fv("zone"),side:fv("side"),sev:fv("sev"),diag:fv("diag"),exp:fv("exp"),status,ret:status==="alta"?ret:"",plan,notes:fv("notes")});
      closeModal(); toast("Lesão guardada"); },
    del:()=>askConfirm("Eliminar este registo de lesão?","Eliminar",true).then(ok=>{ if(ok){ del("injuries",injId); closeModal(); } })
  }});
}

function tmForm(id){
  const t=id?D.tests[id]:null, n=nextTestMonth();
  const def=t?t:{label:`${MONTHS[n.m-1].replace(/^./,c=>c.toUpperCase())} ${n.y}`,date:`${n.y}-${pad(n.m)}-01`,proto:""};
  const body=`<div class="form"><label class="fld">Nome<input name="label" value="${esc(def.label||"")}"></label><label class="fld">Data<input type="date" name="date" value="${esc(def.date||"")}"></label>
    <label class="fld full">Protocolo / notas<textarea name="proto" placeholder="Ex.: Velocidade 30 m com células; vaivém Yo-Yo IR1">${esc(def.proto||"")}</textarea></label></div>
    <p class="note">Testes avaliados: ${TESTS.map(x=>x.l).join(", ")}.</p>`;
  modal({title:id?"Editar momento":"Novo momento de avaliação",body,foot:footSave("Guardar",id?"Eliminar":null),ctx:{
    save:()=>{ const date=fv("date"); if(!validISO(date)){ toast("Indica a data."); return; } const nid=id||uid("tm_");
      put("tests",nid,{...(t?clone(t):{res:{}}),label:fv("label")||fmtD(date,{month:"long",year:"numeric"}),date,proto:fv("proto")}); S.tmom=nid; closeModal(); toast("Momento guardado"); },
    del:()=>askConfirm("Eliminar este momento e todos os resultados registados nele?","Eliminar",true).then(ok=>{ if(ok){ del("tests",id); S.tmom=null; closeModal(); } })
  }});
}

function scoutForm(){
  const body=`<div class="form"><label class="fld full">Nome<input name="name"></label><label class="fld">Clube<input name="club"></label>
    <label class="fld">Posição${sel("pos",POS,"","","—")}</label><label class="fld">Ano de nascimento<input name="year" inputmode="numeric"></label><label class="fld">Pé${sel("foot",FEET,"","","—")}</label></div>`;
  modal({title:"Novo atleta a seguir",body,foot:footSave("Criar"),ctx:{save:()=>{ const name=fv("name"); if(!name){ toast("Indica o nome."); return; }
    const id=uid("sc_"); put("scout",id,{name,club:fv("club"),pos:fv("pos"),year:fv("year"),foot:fv("foot"),esc:"",st:"obs",contact:"",notes:"",reps:[]}); closeModal(); openPage("alvo",id); }}});
}
function repForm(sid,rid){
  const s=D.scout[sid]; if(!s) return;
  const r=rid?(s.reps||[]).find(x=>x.id===rid):{date:todayISO(),game:"",by:"",cur:"3",pot:"3",rec:"Seguir",str:"",weak:"",txt:""};
  if(!r) return;
  const five=[1,2,3,4,5].map(x=>({v:String(x),l:x+" — "+["Fraco","Abaixo","Razoável","Bom","Muito bom"][x-1]}));
  const body=`<div class="form"><label class="fld">Data<input type="date" name="date" value="${esc(r.date)}"></label><label class="fld">Observador<input name="by" value="${esc(r.by||"")}"></label>
    <label class="fld full">Jogo / contexto<input name="game" value="${esc(r.game||"")}" placeholder="Ex.: Sub-19 Clube X vs Clube Y"></label>
    <label class="fld">Nível atual${sel("cur",five,String(r.cur??"3"))}</label><label class="fld">Potencial${sel("pot",five,String(r.pot??"3"))}</label><label class="fld">Recomendação${sel("rec",SC_REC,r.rec||"Seguir")}</label>
    <label class="fld full">Pontos fortes<textarea name="str">${esc(r.str||"")}</textarea></label>
    <label class="fld full">Pontos fracos<textarea name="weak">${esc(r.weak||"")}</textarea></label>
    <label class="fld full">Relatório<textarea name="txt">${esc(r.txt||"")}</textarea></label></div>`;
  modal({title:rid?"Editar relatório":"Novo relatório",sub:esc(s.name),big:true,body,foot:footSave("Guardar",rid?"Eliminar":null),ctx:{
    save:()=>{ const date=fv("date"); if(!validISO(date)){ toast("Indica a data."); return; }
      const reps=clone(s.reps||[]); const o={id:rid||uid("r"),date,by:fv("by"),game:fv("game"),cur:fv("cur"),pot:fv("pot"),rec:fv("rec"),str:fv("str"),weak:fv("weak"),txt:fv("txt")};
      const k=reps.findIndex(x=>x.id===o.id); if(k>=0) reps[k]=o; else reps.push(o);
      const st = o.rec==="Contratar" && s.st==="obs" ? "prio" : s.st;
      put("scout",sid,{...clone(s),reps,st}); closeModal(); toast("Relatório guardado"); },
    del:()=>askConfirm("Eliminar este relatório?","Eliminar",true).then(ok=>{ if(ok){ put("scout",sid,{...clone(s),reps:(s.reps||[]).filter(x=>x.id!==rid)}); closeModal(); } })
  }});
}

/* ================= seletor de exercícios com fotos ================= */
function exPicker(trId){
  const all=exercises();
  const cats=exCatsAll().filter(c=>all.some(x=>x.cat===c));
  const card=x=>`<button class="pick" data-a="exPickAdd" data-id="${esc(trId)}" data-x="${esc(x.id)}" data-name="${esc((x.name+" "+(x.cat||"")+" "+(x.obj||"")+" "+(x.desc||"")).toLowerCase())}">
    ${exImg(x)?`<img src="${esc(exImg(x))}" alt="" loading="lazy">`:(x.drw&&(x.drw.it||[]).length?drawSVG(x.drw):`<span class="noimg">sem imagem</span>`)}
    <b>${esc(x.name)}</b><small>${esc([x.cat,x.dur?x.dur+"'":""].filter(Boolean).join(" — "))}</small></button>`;
  modal({title:"Biblioteca de exercícios",sub:`${all.length} exercícios — toca para adicionar ao plano`,big:true,
    body:`<input class="inp" id="pickSearch" placeholder="Procurar por nome, categoria ou objetivo…" autocomplete="off" style="margin-bottom:10px">
      <div class="chips" style="margin-bottom:10px"><button class="chip on" data-a="pickCat" data-k="">Todas (${all.length})</button>${cats.map(c=>`<button class="chip" data-a="pickCat" data-k="${esc(c)}">${esc(c)} (${all.filter(x=>x.cat===c).length})</button>`).join("")}</div>
      <div class="picks" id="pickGrid">${all.map(card).join("")}</div><p class="empty" id="pickNone" style="display:none"><b>Nenhum exercício encontrado</b></p>`,
    foot:`<span class="small muted">Podes adicionar vários seguidos.</span><span class="right"><button class="btn primary" data-a="mClose">Fechar</button></span>`,
    ctx:{pick:true}});
}
function pickFilter(){
  const q=(($("#pickSearch")||{}).value||"").trim().toLowerCase();
  const cat=M&&M.pickCat?M.pickCat.toLowerCase():"";
  let n=0;
  $$("#pickGrid .pick").forEach(c=>{ const d=c.dataset.name; const ok=(!q||d.includes(q))&&(!cat||d.includes(cat)); c.style.display=ok?"":"none"; if(ok) n++; });
  const none=$("#pickNone"); if(none) none.style.display=n?"none":"";
}

/* ================= princípios (checkboxes) ================= */
function prChecks(sel){
  const prs=principles(); if(!prs.length) return `<p class="note">Cria princípios em Treinos → Modelo de jogo para ligar este exercício ao modelo.</p>`;
  return `<div class="asec" style="margin-top:14px"><span>Princípios trabalhados</span></div>${MOMENTS.map(m=>{ const top=prs.filter(p=>MOMK(p.moment)===m.k&&!p.parent); if(!top.length) return "";
    const box=(p,sub)=>`<label class="chk" style="padding:3px 0 3px ${sub?24:0}px"><input type="checkbox" name="pr_${esc(p.id)}" ${sel.includes(p.id)?"checked":""}><span>${esc(p.name)}</span></label>`;
    return `<div class="small muted" style="font-weight:700;margin-top:8px">${m.l}</div>${top.map(p=>box(p,false)+prs.filter(s=>s.parent===p.id).map(s=>box(s,true)).join("")).join("")}`; }).join("")}`;
}
function prForm(id,moment,parent){
  const p=id?D.principles[id]:{name:"",moment,parent:parent||"",desc:""};
  if(!p) return;
  const tops=principles().filter(x=>!x.parent&&x.id!==id);
  const hasKids=id&&principles().some(x=>x.parent===id);
  const body=`<div class="form">
    <label class="fld full">Nome<input name="name" value="${esc(p.name||"")}" placeholder="${p.parent?"Ex.: Terceiro homem":"Ex.: Saída curta a 3"}"></label>
    <label class="fld">Momento${sel("moment",MOMENTS.map(m=>({v:m.k,l:m.l})),p.moment||"oo")}</label>
    <label class="fld">Tipo${sel("parent",[{v:"",l:"Princípio"},...tops.map(t=>({v:t.id,l:"Subprincípio de: "+t.name+" ("+MOM(t.moment)+")"}))],p.parent||"",hasKids?"disabled":"")}</label>
    <label class="fld full">Descrição / comportamentos<textarea name="desc">${esc(p.desc||"")}</textarea></label></div>`;
  modal({title:id?"Editar princípio":(p.parent?"Novo subprincípio":"Novo princípio"),sub:p.parent&&D.principles[p.parent]?esc(D.principles[p.parent].name):"",body,foot:footSave("Guardar",id?"Eliminar":null),ctx:{
    save:()=>{ const name=fv("name"); if(!name){ toast("Dá um nome ao princípio."); return; }
      let par=hasKids?"":fv("parent"), mom=fv("moment");
      if(par&&D.principles[par]) mom=D.principles[par].moment; else par="";
      put("principles",id||uid("pr_"),{name,moment:mom,parent:par,desc:fv("desc"),order:p.order??principles().length}); closeModal(); toast("Guardado"); },
    del:()=>askConfirm(hasKids?"Eliminar este princípio e os subprincípios? Os exercícios e treinos deixam de estar ligados a eles.":"Eliminar este princípio? Os exercícios e treinos deixam de estar ligados a ele.","Eliminar",true).then(ok=>{ if(!ok) return;
      principles().filter(x=>x.parent===id).forEach(x=>del("principles",x.id)); del("principles",id); closeModal(); })
  }});
}

/* ================= eventos de estatística ================= */
function sdCfg(){
  const defs=statDefs();
  modal({title:"Estatísticas de jogo",sub:"Eventos registados na ficha de jogo",
    body:`${defs.length?`<div class="list">${defs.map(d=>`<button class="li" style="padding:9px 0" data-a="sdEdit" data-id="${esc(d.id)}"><span class="tag ${d.neg?"bad":"ok"}" style="min-width:44px;justify-content:center">${esc(d.code||"—")}</span><span class="main"><b>${esc(d.title)}</b><small>${d.neg?"Ação negativa":"Ação positiva"}${d.hl?" — em destaque nas estatísticas":""}</small></span><span class="muted">›</span></button>`).join("")}</div>`:`<p class="muted">Ainda não há eventos.</p>`}
      <p class="note">Os eventos em destaque aparecem como colunas e totais no separador Estatísticas (se nenhum estiver em destaque, aparecem todos). Todos aparecem na ficha de jogo e na ficha do atleta.</p>`,
    foot:`<span></span><span class="right"><button class="btn" data-a="mClose">Fechar</button><button class="btn primary" data-a="sdEdit">+ Novo evento</button></span>`});
}
function sdForm(id){
  const d=id?D.statdefs[id]:{title:"",code:"",neg:false,hl:true,order:statDefs().length+1};
  if(!d) return;
  const body=`<div class="form"><label class="fld full">Nome<input name="title" value="${esc(d.title||"")}" placeholder="Ex.: Remates à baliza"></label>
    <label class="fld">Código (até 4 letras)<input name="code" maxlength="4" value="${esc(d.code||"")}" placeholder="RB"></label>
    <label class="fld">Comportamento${sel("neg",[{v:"0",l:"Ação positiva"},{v:"1",l:"Ação negativa"}],d.neg?"1":"0")}</label>
    <label class="fld">Ordem<input name="order" inputmode="numeric" value="${esc(d.order??"")}"></label>
    <label class="fld full" style="flex-direction:row;align-items:center;gap:8px;color:var(--text)"><input type="checkbox" name="hl" ${d.hl?"checked":""} style="width:auto;accent-color:var(--grena)"> Destacar nas estatísticas</label></div>`;
  modal({title:id?"Editar evento":"Novo evento",body,foot:footSave("Guardar",id?"Eliminar":null),ctx:{
    save:()=>{ const title=fv("title"); if(!title){ toast("Dá um nome ao evento."); return; }
      const code=(fv("code")||title.split(/\s+/).map(w=>w[0]).join("").slice(0,4)).toUpperCase();
      if(statDefs().some(x=>x.id!==id&&String(x.code).toUpperCase()===code)){ toast(`Já existe um evento com o código ${code}.`); return; }
      put("statdefs",id||uid("sd_"),{title,code,neg:fv("neg")==="1",hl:!!fv("hl"),order:parseNum(fv("order"))??99}); sdCfg(); toast("Evento guardado"); },
    del:()=>askConfirm("Eliminar este evento? Os valores registados nos jogos deixam de aparecer.","Eliminar",true).then(ok=>{ if(ok){ del("statdefs",id); sdCfg(); } })
  }});
}

/* ================= tratamentos ================= */
function trtForm(injId,tid){
  const inj=D.injuries[injId]; if(!inj) return;
  const t=tid?(inj.trt||[]).find(x=>x.id===tid):{date:todayISO(),by:"",desc:"",pain:"",evo:""};
  if(!t) return;
  const body=`<div class="form"><label class="fld">Data<input type="date" name="date" value="${esc(t.date)}"></label><label class="fld">Responsável<input name="by" value="${esc(t.by||"")}" placeholder="Ex.: Fisioterapeuta"></label>
    <label class="fld">Dor (0 a 10)${sel("pain",[0,1,2,3,4,5,6,7,8,9,10].map(String),t.pain==null?"":String(t.pain),"","—")}</label>
    <label class="fld full">Tratamento efetuado<textarea name="desc" placeholder="Ex.: Massagem, gelo, exercícios de ativação excêntrica">${esc(t.desc||"")}</textarea></label>
    <label class="fld full">Evolução / observações<input name="evo" value="${esc(t.evo||"")}" placeholder="Ex.: Já corre sem dor"></label></div>`;
  modal({title:tid?"Editar tratamento":"Novo tratamento",sub:esc(pname(inj.pid)+" — "+(inj.zone||inj.type||"")),body,foot:footSave("Guardar",tid?"Eliminar":null),ctx:{
    save:()=>{ const date=fv("date"); if(!validISO(date)){ toast("Indica a data."); return; } if(!fv("desc")){ toast("Descreve o tratamento."); return; }
      const cur=clone(D.injuries[injId]); if(!cur){ closeModal(); return; } cur.trt=cur.trt||[];
      const o={id:tid||uid("t"),date,by:fv("by"),pain:parseNum(fv("pain")),desc:fv("desc"),evo:fv("evo")};
      const k=cur.trt.findIndex(x=>x.id===o.id); if(k>=0) cur.trt[k]=o; else cur.trt.push(o);
      put("injuries",injId,cur); closeModal(); toast("Tratamento guardado"); },
    del:()=>askConfirm("Eliminar este tratamento?","Eliminar",true).then(ok=>{ if(!ok) return; const cur=clone(D.injuries[injId]); cur.trt=(cur.trt||[]).filter(x=>x.id!==tid); put("injuries",injId,cur); closeModal(); })
  }});
}

/* ================= avaliar treino um a um ================= */
function tevList(id){ const tr=D.events[id]||{}; const att=tr.att||{}; return players().filter(p=>{ const a=att[p.id]; return a&&(a.s==="P"||a.s==="AT"); }); }
function tevRead(){
  if(!M||!M.tev) return; const l=tevList(M.gid), p=l[M.i]; if(!p) return;
  const tr=clone(D.events[M.gid]); if(!tr) return; tr.pev=tr.pev||{};
  const rEl=$("#tevR"), tEl=$("#tevT");
  const r=rEl?parseNum(rEl.value):null, t=tEl?tEl.value.trim():"";
  const cur={...(tr.pev[p.id]||{})};
  if(r==null) delete cur.r; else cur.r=Math.max(0,Math.min(10,Math.round(r*10)/10));
  if(t) cur.t=t; else delete cur.t;
  if(cur.r==null&&!cur.t) delete tr.pev[p.id]; else tr.pev[p.id]=cur;
  put("events",M.gid,tr);
}
function tevForm(gid,i){
  const l=tevList(gid); if(!l.length){ toast("Marca primeiro as presenças."); return; }
  i=Math.max(0,Math.min(l.length-1,i)); const p=l[i], tr=D.events[gid]||{}, v=(tr.pev||{})[p.id]||{};
  const body=`<div class="qprog" style="background:var(--surface-2);margin-bottom:14px"><i style="width:${(i+1)/l.length*100}%"></i></div>
    <div class="qlbl"><span>Nota do treino</span><span class="small muted">${i+1} de ${l.length}</span></div>
    <div class="rates">${RATES.map(x=>`<button data-a="tevRate" data-n="${x}" class="${parseNum(v.r)===x?"on "+rc(x):""}">${Number.isInteger(x)?x:x.toFixed(1)}</button>`).join("")}</div>
    <div class="form" style="margin-top:14px">
      <label class="fld">Nota (0 a 10)<input id="tevR" inputmode="decimal" value="${esc(v.r??"")}" placeholder="–"></label>
      <label class="fld full">Observações<textarea id="tevT" placeholder="Atitude, execução, aspetos a corrigir…">${esc(v.t||"")}</textarea></label></div>`;
  modal({title:esc(p.name),sub:esc((p.pos||"")+" — "+(tr.theme||"Treino")+" "+fmtD(tr.date)),body,
    foot:`<button class="btn ghost" data-a="tevPrev" ${i?"":"disabled"}>Anterior</button><span class="right"><button class="btn" data-a="mClose">Fechar</button><button class="btn primary" data-a="tevNext">${i<l.length-1?"Seguinte":"Terminar"}</button></span>`,
    ctx:{tev:true,gid,i,save:()=>{ tevRead(); closeModal(); toast("Avaliações guardadas"); }}});
}


/* ================= staff ================= */
function staffForm(id){
  const s=id?D.staff[id]:{name:"",role:"",order:staff().length+1};
  if(!s) return;
  const body=`<div class="form"><label class="fld full">Nome<input name="name" value="${esc(s.name||"")}"></label>
    <label class="fld">Função<input name="role" value="${esc(s.role||"")}" placeholder="Ex.: Treinador adjunto"></label>
    <label class="fld">Ordem<input name="order" inputmode="numeric" value="${esc(s.order??"")}"></label></div>
    ${id?`<button class="btn sm" style="margin-top:10px" data-a="stfPhoto" data-id="${esc(id)}">${s.photo||s.photoData?"Mudar foto":"Adicionar foto"}</button>`:""}`;
  modal({title:id?"Editar elemento do staff":"Novo elemento do staff",body,foot:footSave("Guardar",id?"Eliminar":null),ctx:{
    save:()=>{ const name=fv("name"); if(!name){ toast("Indica o nome."); return; }
      put("staff",id||uid("st_"),{...(id?clone(D.staff[id]):{}),name,role:fv("role"),order:parseNum(fv("order"))??99}); closeModal(); toast("Guardado"); },
    del:()=>askConfirm("Eliminar este elemento do staff? As presenças já registadas deixam de aparecer.","Eliminar",true).then(ok=>{ if(ok){ del("staff",id); closeModal(); } })
  }});
}

/* ================= adversários ================= */
function oppOpenByName(name,comp){
  const n=String(name||"").trim(); if(!n){ toast("Indica primeiro o nome do adversário no jogo."); return; }
  const ex=opponents().find(o=>String(o.name).trim().toLowerCase()===n.toLowerCase());
  if(ex){ S.tab="adv"; saveUI(); openPage("adversario",ex.id); return; }
  const id=uid("op_"); put("opponents",id,{name:n,comp:comp||meta().comp||"",keys:[],reports:[]}); S.tab="adv"; saveUI(); openPage("adversario",id); toast("Ficha do adversário criada");
}
function oppKeyForm(oid,i){
  const o=D.opponents[oid]; if(!o) return;
  const k=i!=null?(o.keys||[])[i]:{name:"",n:"",pos:"",foot:"",note:""};
  if(!k) return;
  const body=`<div class="form"><label class="fld">N.º<input name="n" inputmode="numeric" value="${esc(k.n||"")}"></label>
    <label class="fld" style="grid-column:span 2">Nome<input name="name" value="${esc(k.name||"")}"></label>
    <label class="fld">Posição${sel("pos",POS,k.pos,"","—")}</label><label class="fld">Pé${sel("foot",FEET,k.foot,"","—")}</label>
    <label class="fld full">O que faz / como o anular<textarea name="note">${esc(k.note||"")}</textarea></label></div>`;
  modal({title:i!=null?"Editar jogador":"Jogador a vigiar",sub:esc(o.name),body,foot:footSave("Guardar",i!=null?"Eliminar":null),ctx:{
    save:()=>{ const name=fv("name"); if(!name){ toast("Indica o nome."); return; }
      const cur=clone(D.opponents[oid]); cur.keys=cur.keys||[]; const r={n:fv("n"),name,pos:fv("pos"),foot:fv("foot"),note:fv("note")};
      if(i!=null) cur.keys[i]=r; else cur.keys.push(r); put("opponents",oid,cur); closeModal(); },
    del:()=>{ const cur=clone(D.opponents[oid]); cur.keys.splice(i,1); put("opponents",oid,cur); closeModal(); }
  }});
}
function oppRepForm(oid,rid){
  const o=D.opponents[oid]; if(!o) return;
  const r=rid?(o.reports||[]).find(x=>x.id===rid):{date:todayISO(),game:"",by:"",txt:""};
  if(!r) return;
  const body=`<div class="form"><label class="fld">Data<input type="date" name="date" value="${esc(r.date)}"></label><label class="fld">Observador<input name="by" value="${esc(r.by||"")}"></label>
    <label class="fld full">Jogo observado<input name="game" value="${esc(r.game||"")}" placeholder="Ex.: ${esc(o.name)} 2-1 Clube X (vídeo)"></label>
    <label class="fld full">Observação<textarea name="txt" style="min-height:140px">${esc(r.txt||"")}</textarea></label></div>`;
  modal({title:rid?"Editar observação":"Nova observação",sub:esc(o.name),big:true,body,foot:footSave("Guardar",rid?"Eliminar":null),ctx:{
    save:()=>{ const date=fv("date"); if(!validISO(date)){ toast("Indica a data."); return; }
      const cur=clone(D.opponents[oid]); cur.reports=cur.reports||[]; const x={id:rid||uid("r"),date,by:fv("by"),game:fv("game"),txt:fv("txt")};
      const k=cur.reports.findIndex(y=>y.id===x.id); if(k>=0) cur.reports[k]=x; else cur.reports.push(x); put("opponents",oid,cur); closeModal(); },
    del:()=>{ const cur=clone(D.opponents[oid]); cur.reports=(cur.reports||[]).filter(y=>y.id!==rid); put("opponents",oid,cur); closeModal(); }
  }});
}

/* ================= opções de PDF ================= */
let PRINT_PREF={scale:125};
try{ const p=JSON.parse(localStorage.getItem(LS+":print")||"null"); if(p&&p.scale) PRINT_PREF=p; }catch(e){}
function printAsk(kind,id){
  const run={plan:planPrint,train:trainingPrint,ath:athletePrint,game:gamePrint,opp:oppPrint}[kind];
  if(!run) return;
  const titles={plan:"Plano de treino",train:"Relatório de treino",ath:"Relatório do atleta",game:"Ficha de jogo",opp:"Ficha do adversário"};
  modal({title:titles[kind],sub:"Documento para imprimir ou guardar em PDF",
    body: kind==="plan" ? `<p class="small muted" style="margin:0">Plano em A4 ao alto: cabeçalho da sessão e cada exercício com o desenho em grande. O ficheiro descarregado abre no browser; para PDF escolhe Imprimir → Guardar como PDF (ativa "Gráficos de fundo" se o campo sair branco).</p>` : `<div class="qlbl"><span>Tamanho da folha</span></div>
      <div class="seg" style="margin-bottom:14px">${[100,125,150,175].map(s=>`<button data-a="prScale" data-k="${s}" class="${PRINT_PREF.scale===s?"on":""}">${s}%</button>`).join("")}</div>
      <p class="small muted" style="margin:0">125% ou 150% deixam os desenhos dos exercícios maiores. O ficheiro descarregado abre no browser; para PDF escolhe Imprimir → Guardar como PDF.</p>`,
    foot:`<button class="btn" data-a="prGo" data-k="open">Abrir numa aba</button><span class="right"><button class="btn primary" data-a="prGo" data-k="dl">Descarregar</button></span>`,
    ctx:{print:{run,id}}});
}

/* ================= ações (cliques) ================= */
const A = {
  tab: el => go(el.dataset.t),
  page: el => { if(D[{treino:"events",jogo:"events",atleta:"players",alvo:"scout",adversario:"opponents"}[el.dataset.p]]?.[el.dataset.id]) openPage(el.dataset.p, el.dataset.id); else toast("Este registo já não existe."); },
  back: () => back(),
  mClose: () => { if(M&&M.dirty){ askConfirm("Fechar sem guardar as alterações?","Fechar sem guardar",true).then(ok=>{ if(ok) closeModal(); }); } else closeModal(); },
  mSave: () => M && M.save && M.save(),
  mDel: () => M && M.del && M.del(),
  calDay: el => { S.day=el.dataset.d; if(S.day.slice(0,7)!==S.cal) S.cal=S.day.slice(0,7); render(); },
  calNav: el => { const [y,m]=S.cal.split("-").map(Number); const d=new Date(y,m-1+(+el.dataset.n),1); S.cal=d.getFullYear()+"-"+pad(d.getMonth()+1); render(); },
  calToday: () => { S.day=todayISO(); S.cal=S.day.slice(0,7); render(); },
  weekGen: () => weekGenForm(),
  newEvent: el => newEventForm(el.dataset.type, el.dataset.d),
  tsub: el => { S.tsub=el.dataset.k; render(); },
  exCat: el => { S.exCat=el.dataset.k; render(); },
  exNew: () => exForm(null),
  exView: el => exView(el.dataset.id),
  exEdit: el => exForm(el.dataset.id),
  cycNew: el => cycleForm(el.dataset.k,null),
  cycEdit: el => cycleForm(null,el.dataset.id),
  trClose: async el => { const tr=D.events[el.dataset.id]; if(!tr) return; const n=Object.values(tr.att||{}).filter(a=>a&&a.s).length;
    if(!n && !(await askConfirm("Ainda não marcaste presenças. Fechar o treino mesmo assim?","Fechar treino"))) return;
    put("events",el.dataset.id,{...tr,closed:true}); toast("Treino fechado"); },
  trOpen: el => { const tr=D.events[el.dataset.id]; if(tr) put("events",el.dataset.id,{...tr,closed:false}); },
  dupTr: el => { const tr=D.events[el.dataset.id]; if(!tr) return; const id=uid("tr_"), date=addDays(tr.date,7);
    put("events",id,{type:"treino",date,time:tr.time||"",dur:tr.dur||90,place:tr.place||"",theme:tr.theme||"",int:tr.int||"",ttype:tr.ttype||"",clima:tr.clima||"",mat:tr.mat||"",objG:tr.objG||"",objE:tr.objE||"",plan:clone(tr.plan||[]),att:{},closed:false,notes:""}); openPage("treino",id); toast(`Duplicado para ${fmtLong(date)}`); },
  delEvent: el => { const e=D.events[el.dataset.id]; if(!e) return;
    askConfirm(e.type==="jogo"?"Eliminar este jogo, a convocatória e a ficha de jogo?":"Eliminar este treino e as presenças?","Eliminar",true).then(ok=>{ if(ok){ del("events",el.dataset.id); back(); toast("Eliminado"); } }); },
  att: el => { const id=el.dataset.id, pid=el.dataset.p, s=el.dataset.s; const tr=clone(D.events[id]); if(!tr) return; tr.att=tr.att||{};
    const cur=tr.att[pid]||{}; if(cur.s===s){ delete tr.att[pid]; } else { tr.att[pid]={...cur,s}; if(s!=="P"&&s!=="AT") delete tr.att[pid].rpe; }
    put("events",id,tr); },
  attAll: el => { const id=el.dataset.id; const tr=clone(D.events[id]); if(!tr) return; tr.att=tr.att||{}; let n=0;
    players().forEach(p=>{ if(!tr.att[p.id]||!tr.att[p.id].s){ tr.att[p.id]={s:avail(p.id)==="les"?"L":"P"}; n++; } });
    put("events",id,tr); toast(n?`${n} atletas marcados`:"Todos já tinham presença marcada"); },
  planMove: el => { const id=el.dataset.id, i=+el.dataset.i, n=+el.dataset.n; const tr=clone(D.events[id]); const p=tr.plan||[]; const j=i+n; if(j<0||j>=p.length) return; [p[i],p[j]]=[p[j],p[i]]; put("events",id,tr); },
  planDel: el => { const id=el.dataset.id; const tr=clone(D.events[id]); (tr.plan||[]).splice(+el.dataset.i,1); put("events",id,tr); },
  planFree: el => { const id=el.dataset.id; const tr=clone(D.events[id]); tr.plan=tr.plan||[]; tr.plan.push({ex:null,name:"Novo bloco",min:10}); put("events",id,tr); },
  jComp: el => { S.jComp=el.dataset.k; render(); },
  call: el => { const id=el.dataset.id, pid=el.dataset.p; const g=clone(D.events[id]); if(!g) return; const call=g.call||[];
    if(call.includes(pid)){
      const used=(g.ev||[]).some(e=>e.pid===pid||e.in===pid||e.out===pid);
      if(used){ toast(`${pname(pid)} tem eventos neste jogo. Apaga os eventos primeiro.`); return; }
      g.call=call.filter(x=>x!==pid); g.xi=(g.xi||[]).filter(x=>x!==pid); if(g.rt) delete g.rt[pid]; if(g.st) delete g.st[pid];
    } else { g.call=[...call,pid]; const av=avail(pid); if(av!=="ok") toast(`Atenção: ${pname(pid)} está ${AV[av].l.toLowerCase()}.`); }
    put("events",id,g); },
  xi: el => { const id=el.dataset.id, pid=el.dataset.p; const g=clone(D.events[id]); const xi=g.xi||[];
    if(xi.includes(pid)){ g.xi=xi.filter(x=>x!==pid); }
    else { if(xi.length>=11){ toast("Já tens 11 titulares. Tira um primeiro."); return; } if((g.ev||[]).some(e=>e.t==="sub"&&e.in===pid)){ toast(`${pname(pid)} entrou como suplente. Apaga essa substituição primeiro.`); return; } g.xi=[...xi,pid]; }
    put("events",id,g); },
  evNew: el => evForm(el.dataset.id),
  evType: el => { if(!M) return; M.t=el.dataset.k; M.draw(); },
  evDel: el => { const id=el.dataset.id, eid=el.dataset.e; const g=clone(D.events[id]); g.ev=(g.ev||[]).filter(e=>e.id!==eid && e.of!==eid); put("events",id,g); toast("Evento apagado"); },
  gClose: el => { const g=D.events[el.dataset.id]; if(!g) return;
    if(parseNum(g.ga)==null){ toast("Indica os golos sofridos (Dados do jogo) antes de fechar."); return; }
    if(!(g.call||[]).length){ toast("Faz a convocatória antes de fechar o jogo."); return; }
    put("events",el.dataset.id,{...g,closed:true}); toast("Jogo fechado"); },
  gOpen: el => { const g=D.events[el.dataset.id]; if(g) put("events",el.dataset.id,{...g,closed:false}); },
  copyCall: async () => { const ta=$("#callTxt"); if(!ta) return;
    try{ if(!navigator.clipboard) throw new Error("no"); await navigator.clipboard.writeText(ta.value); toast("Convocatória copiada"); }
    catch(e){ ta.focus(); ta.select(); toast("Texto selecionado — usa Copiar do teu dispositivo."); } },
  plGroup: el => { S.plGroup=el.dataset.k; render(); },
  plNew: () => playerForm(null),
  plEdit: el => playerForm(el.dataset.id),
  photo: el => { photoTarget=el.dataset.id; $("#fileIn").click(); },
  evalNew: el => evalForm(el.dataset.id,null),
  evalEdit: el => evalForm(null,el.dataset.id),
  slClear: el => { if(!M||!M.v) return; const k=el.dataset.k, attr=el.dataset.attr; if(M.v[k]) delete M.v[k][attr]; M.dirty=true;
    const row=$(`#sr_${k}_${el.dataset.i}`); row.classList.add("unset"); row.querySelector("output").textContent="–"; row.querySelector("input").value=5;
    const a=M.areaAvg(k); $("#av_"+k).textContent=a==null?"–":fmt1(a); },
  injNew: el => injForm(el.dataset.id||null,null),
  injEdit: el => injForm(null,el.dataset.id),
  injSt: el => { const i=clone(D.injuries[el.dataset.id]); if(!i) return; i.status=el.dataset.s; if(i.status==="alta"&&!validISO(i.ret)) i.ret=todayISO(); put("injuries",el.dataset.id,i); toast(i.status==="alta"?`Alta dada a ${pname(i.pid)}`:"Estado atualizado"); },
  tmNew: () => tmForm(null),
  tmEdit: el => tmForm(el.dataset.id),
  tmSel: el => { S.tmom=el.dataset.k; render(); },
  scNew: () => scoutForm(),
  scSt: el => { S.scSt=el.dataset.k; render(); },
  repNew: el => repForm(el.dataset.id,null),
  repEdit: el => repForm(el.dataset.id,el.dataset.r),
  scDel: el => askConfirm("Eliminar este atleta e todos os relatórios?","Eliminar",true).then(ok=>{ if(ok){ del("scout",el.dataset.id); back(); } }),
  stSort: el => { const k=el.dataset.k; if(S.stSort===k) S.stDir*=-1; else { S.stSort=k; S.stDir=k==="n"?1:-1; } render(); },
  export: () => exportData(),
  quick: el => openQuick(el.dataset.id),
  qExit: () => quickExit(),
  qSel: el => { const id=el.dataset.p, s=Q.sel[id]; if(!s) Q.sel[id]="T"; else if(s==="T") Q.sel[id]="S"; else delete Q.sel[id]; M.dirty=true; drawQuick(); },
  qStart: () => { Q.step="p"; Q.idx=0; drawQuick(); },
  qPrev: () => { qRead(); if(Q.idx>0) Q.idx--; else Q.step="sel"; drawQuick(); },
  qNext: () => { qRead(); const n=qList().length; if(Q.idx<n-1) Q.idx++; else Q.step="sum"; drawQuick(); },
  qGo: el => { Q.step="p"; Q.idx=+el.dataset.i; drawQuick(); },
  qBack: () => { Q.step="p"; Q.idx=Math.max(0,qList().length-1); drawQuick(); },
  qSave: () => quickSave(),
  qRate: el => { qRead(); qDraft(qList()[Q.idx].id).r=parseFloat(el.dataset.n); M.dirty=true; drawQuick(); },
  qFine: el => { qRead(); const d=qDraft(qList()[Q.idx].id); d.r=Math.max(0,Math.min(10,Math.round(((d.r??6)+parseFloat(el.dataset.n))*10)/10)); M.dirty=true; drawQuick(); },
  qSt: el => { qRead(); const p=qList()[Q.idx]; Q.sel[p.id]=el.dataset.k; const d=qDraft(p.id); if(el.dataset.k==="T"&&!d.min) d.min=90; M.dirty=true;
    const nl=qList(); Q.idx=Math.max(0,nl.findIndex(x=>x.id===p.id)); drawQuick(); },
  qMin: el => { qRead(); qDraft(qList()[Q.idx].id).min=+el.dataset.n; M.dirty=true; drawQuick(); },
  qInc: el => { qRead(); const d=qDraft(qList()[Q.idx].id), k=el.dataset.k; d[k]=Math.min(+el.dataset.max,(+d[k]||0)+1); M.dirty=true; drawQuick(); },
  qDec: el => { qRead(); const d=qDraft(qList()[Q.idx].id), k=el.dataset.k; d[k]=Math.max(0,(+d[k]||0)-1); M.dirty=true; drawQuick(); },
  ssub: el => { S.ssub=el.dataset.k; render(); },
  distSel: el => { S.dist=el.dataset.k; render(); },
  cycPer: el => { const c=clone(D.cycles[el.dataset.id]); if(!c) return; c.period = c.period===el.dataset.k ? "" : el.dataset.k; put("cycles",el.dataset.id,c); toast(c.period?`Microciclo marcado como ${c.period.toLowerCase()}`:"Período removido"); },
  prPlan: el => printAsk("plan",el.dataset.id),
  prTrain: el => printAsk("train",el.dataset.id),
  prAth: el => printAsk("ath",el.dataset.id),
  prGame: el => printAsk("game",el.dataset.id),
  prOpp: el => printAsk("opp",el.dataset.id),
  prScale: el => { PRINT_PREF.scale=+el.dataset.k; try{ localStorage.setItem(LS+":print",JSON.stringify(PRINT_PREF)); }catch(e){}
    $$("#dlg [data-a=prScale]").forEach(b=>b.classList.toggle("on",b.dataset.k===el.dataset.k)); },
  prGo: el => { if(!M||!M.print) return; const {run,id}=M.print; closeModal(); PRINT_MODE=el.dataset.k;
    // a aba abre já no clique (o plano demora a preparar e o browser bloquearia a aba depois)
    PRINT_WIN=null; if(PRINT_MODE==="open"){ try{ PRINT_WIN=window.open("","_blank"); }catch(e){} }
    run(id); },
  satt: el => { const id=el.dataset.id, pid=el.dataset.p, s=el.dataset.s; const tr=clone(D.events[id]); if(!tr) return; tr.satt=tr.satt||{};
    if((tr.satt[pid]||{}).s===s) delete tr.satt[pid]; else tr.satt[pid]={s}; put("events",id,tr); },
  sattAll: el => { const id=el.dataset.id; const tr=clone(D.events[id]); if(!tr) return; tr.satt=tr.satt||{}; let n=0;
    staff().forEach(p=>{ if(!tr.satt[p.id]||!tr.satt[p.id].s){ tr.satt[p.id]={s:"P"}; n++; } }); put("events",id,tr); toast(n?`${n} marcados como presentes`:"Todos já tinham presença"); },
  stfNew: () => staffForm(null),
  stfEdit: el => staffForm(el.dataset.id),
  stfPhoto: el => { photoTarget="staff:"+el.dataset.id; $("#fileIn").click(); },
  oppNew: () => { const id=uid("op_"); put("opponents",id,{name:"Novo adversário",comp:meta().comp||"",keys:[],reports:[]}); openPage("adversario",id); },
  oppFromGame: el => { const g=D.events[el.dataset.id]; if(g) oppOpenByName(g.opp,g.comp); },
  oppCrestUp: el => { photoTarget="opp:"+el.dataset.id; $("#fileIn").click(); },
  oppDel: el => askConfirm("Eliminar esta ficha de adversário?","Eliminar",true).then(ok=>{ if(ok){ del("opponents",el.dataset.id); back(); } }),
  oppKeyNew: el => oppKeyForm(el.dataset.id,null),
  oppKeyEdit: el => oppKeyForm(el.dataset.id,+el.dataset.i),
  oppRepNew: el => oppRepForm(el.dataset.id,null),
  oppRepEdit: el => oppRepForm(el.dataset.id,el.dataset.r),
  tevAll: el => tevForm(el.dataset.id,0),
  tevPrev: () => { tevRead(); if(M.i>0) tevForm(M.gid,M.i-1); },
  tevNext: () => { tevRead(); const l=tevList(M.gid); if(M.i<l.length-1) tevForm(M.gid,M.i+1); else { closeModal(); toast("Avaliações guardadas"); } },
  tevRate: el => { tevRead(); const l=tevList(M.gid), p=l[M.i]; const tr=clone(D.events[M.gid]); tr.pev=tr.pev||{}; tr.pev[p.id]={...(tr.pev[p.id]||{}),r:parseFloat(el.dataset.n)}; put("events",M.gid,tr); tevForm(M.gid,M.i); },
  minAuto: el => { const g=clone(D.events[el.dataset.id]); if(!g) return; delete g.minOv; put("events",el.dataset.id,g); toast("Minutos recalculados pelos eventos"); },
  drawEx: el => drawEditor(el.dataset.id),
  exPhoto: el => { exImgTarget=el.dataset.id; $("#exImgIn").click(); },
  exImgDel: el => { const x=clone(D.exercises[el.dataset.id]); if(!x) return; dropImg(x); delete x.img; delete x.imgA; delete x.imgL; put("exercises",el.dataset.id,x); exView(el.dataset.id); },
  exPick: el => exPicker(el.dataset.id),
  exPickAdd: el => { const id=el.dataset.id, exId=el.dataset.x; const tr=clone(D.events[id]), ex=D.exercises[exId]; if(!tr||!ex) return;
    tr.plan=tr.plan||[]; tr.plan.push({ex:exId,name:ex.name,min:ex.dur??null}); put("events",id,tr); toast(`${ex.name} adicionado`); },
  dwTool: el => { if(!M||!M.drw) return; M.tool=el.dataset.k; dwRefresh(); },
  dwField: el => { if(!M||!M.drw) return; M.hist.push(JSON.stringify(M.drw)); M.dirty=true; M.drw.f=el.dataset.k; $("#pitchField").innerHTML=fieldSVG(M.drw.f); dwRefresh(); },
  dwUndo: () => { if(!M||!M.drw) return; const h=M.hist.pop(); if(!h){ toast("Nada para desfazer."); return; } M.drw=JSON.parse(h); $("#pitchField").innerHTML=fieldSVG(M.drw.f||"half"); dwRefresh(); },
  dwClear: () => { if(!M||!M.drw||!M.drw.it.length) return; M.hist.push(JSON.stringify(M.drw)); M.dirty=true; M.drw.it=[]; dwRefresh(); },
  catCfg: () => catCfgForm(),
  evalCfg: () => evalCfgForm(),
  pickCat: el => { if(!M) return; M.pickCat=el.dataset.k; $$("#dlg [data-a=pickCat]").forEach(b=>b.classList.toggle("on",b.dataset.k===el.dataset.k)); pickFilter(); },
  cfgAdd: el => { const l=$("#"+el.dataset.l); l.insertAdjacentHTML("beforeend",cfgRow("","")); const i=l.lastElementChild.querySelector("input"); i.focus(); if(M) M.dirty=true; },
  cfgDel: el => { el.closest(".cfgrow").remove(); if(M) M.dirty=true; },
  cfgMove: el => { const r=el.closest(".cfgrow"); if(+el.dataset.n<0){ if(r.previousElementSibling) r.parentNode.insertBefore(r,r.previousElementSibling); } else if(r.nextElementSibling) r.parentNode.insertBefore(r.nextElementSibling,r); if(M) M.dirty=true; },
  gst: el => { const {id,p,k}=el.dataset, n=+el.dataset.n; const g=clone(D.events[id]); if(!g) return; g.st=g.st||{}; g.st[p]=g.st[p]||{};
    const v=Math.max(0,(+g.st[p][k]||0)+n); if(v) g.st[p][k]=v; else delete g.st[p][k]; if(!Object.keys(g.st[p]).length) delete g.st[p]; put("events",id,g); },
  sdCfg: () => sdCfg(),
  sdEdit: el => sdForm(el.dataset.id||null),
  trtNew: el => trtForm(el.dataset.id,null),
  trtEdit: el => trtForm(el.dataset.id,el.dataset.t),
  prNew: el => prForm(null,el.dataset.m,el.dataset.parent),
  prEdit: el => prForm(el.dataset.id),
  mdlPer: el => { S.mdl=el.dataset.k; render(); },
  pmNav: el => { const [y,m]=S.pm.split("-").map(Number); const d=new Date(y,m-1+(+el.dataset.n),1); S.pm=d.getFullYear()+"-"+pad(d.getMonth()+1); render(); },
  import: () => $("#jsonIn").click()
};

/* ================= alterações em campos ================= */
const Cg = {
  f: el => { const {col,id,f,t}=el.dataset; if(!D[col]||!D[col][id]) return; const o=clone(D[col][id]);
    let v = el.value; if(typeof v==="string") v=v.trim();
    if(t==="num"){ v=parseNum(v); if(v!=null && v<0){ toast("O valor não pode ser negativo."); schedule(); return; } }
    if(f==="date" && !validISO(v)){ toast("Data inválida."); schedule(); return; }
    if(f==="dur" && v!=null && (v<1||v>300)){ toast("A duração tem de estar entre 1 e 300 minutos."); schedule(); return; }
    o[f]=v; put(col,id,o); },
  meta: el => { const o=clone(D.meta.team||{}); o[el.dataset.f]=el.value.trim(); put("meta","team",o); },
  rpe: el => { const {id,p}=el.dataset; const tr=clone(D.events[id]); if(!tr) return; tr.att=tr.att||{}; const v=parseNum(el.value);
    if(v!=null && (v<1||v>10||!Number.isInteger(v))){ toast("O RPE é um número inteiro de 1 a 10."); schedule(); return; }
    tr.att[p]={...(tr.att[p]||{})}; if(v==null) delete tr.att[p].rpe; else tr.att[p].rpe=v; put("events",id,tr); },
  plan: el => { const {id,i,f}=el.dataset; const tr=clone(D.events[id]); const x=(tr.plan||[])[+i]; if(!x) return;
    if(f==="min"){ const v=parseNum(el.value); if(v!=null&&(v<0||v>300)){ toast("Minutos entre 0 e 300."); schedule(); return; } x.min=v; } else x[f]=el.value.trim();
    put("events",id,tr); },
  planAdd: el => { const exId=el.value; if(!exId) return; const id=el.dataset.id; const tr=clone(D.events[id]); const ex=D.exercises[exId]; if(!tr||!ex) return;
    tr.plan=tr.plan||[]; tr.plan.push({ex:exId,name:ex.name,min:ex.dur??null}); put("events",id,tr); toast(`${ex.name} adicionado`); },
  rt: el => { const {id,p}=el.dataset; const g=clone(D.events[id]); if(!g) return; g.rt=g.rt||{}; const v=parseNum(el.value);
    if(v!=null&&(v<0||v>10)){ toast("A nota tem de estar entre 0 e 10."); schedule(); return; }
    if(v==null) delete g.rt[p]; else g.rt[p]=Math.round(v*10)/10; put("events",id,g); },
  test: el => { const {m,p,k}=el.dataset; const t=clone(D.tests[m]); if(!t) return; t.res=t.res||{}; t.res[p]=t.res[p]||{}; const v=parseNum(el.value);
    if(v!=null && v<0){ toast("O valor não pode ser negativo."); schedule(); return; }
    if(el.value.trim()!=="" && v==null){ toast("Escreve só números, ex.: 4,52"); schedule(); return; }
    if(v==null) delete t.res[p][k]; else t.res[p][k]=v; if(!Object.keys(t.res[p]).length) delete t.res[p]; put("tests",m,t); },
  step: el => { const i=clone(D.injuries[el.dataset.id]); if(!i||!i.plan||!i.plan[+el.dataset.i]) return; i.plan[+el.dataset.i].done=el.checked; put("injuries",el.dataset.id,i); },
  stComp: el => { S.stComp=el.value; render(); },
  tev: el => { const {id,p,f}=el.dataset; const tr=clone(D.events[id]); if(!tr) return; tr.pev=tr.pev||{};
    const cur={...(tr.pev[p]||{})};
    if(f==="r"){ const v=parseNum(el.value); if(v!=null&&(v<0||v>10)){ toast("A nota tem de estar entre 0 e 10."); schedule(); return; } if(v==null) delete cur.r; else cur.r=Math.round(v*10)/10; }
    else { const t=el.value.trim(); if(t) cur.t=t; else delete cur.t; }
    if(cur.r==null&&!cur.t) delete tr.pev[p]; else tr.pev[p]=cur;
    put("events",id,tr); }
};

document.addEventListener("click", e=>{
  const el=e.target.closest("[data-a]"); if(!el) return;
  if(el.closest("#dlgAsk")) return;
  const fn=A[el.dataset.a]; if(!fn) return;
  if(el.tagName==="A") e.preventDefault();
  try{ fn(el,e); }catch(err){ console.error(err); toast("Algo correu mal. Tenta de novo."); }
});
document.addEventListener("change", e=>{
  const el=e.target.closest("[data-c]"); if(!el) return;
  const fn=Cg[el.dataset.c]; if(!fn) return;
  try{ fn(el,e); }catch(err){ console.error(err); toast("Não foi possível guardar esse campo."); }
});
document.addEventListener("input", e=>{
  const el=e.target;
  if(el.id==="exSearch"){ const q=el.value.trim().toLowerCase(); let n=0; $$(".ex[data-name]").forEach(c=>{ const ok=!q||c.dataset.name.includes(q); c.style.display=ok?"":"none"; if(ok) n++; }); const none=$("#exNone"); if(none) none.style.display=n?"none":""; return; }
  if(el.id==="scSearch"){ const q=el.value.trim().toLowerCase(); let n=0; $$("#scList [data-name]").forEach(c=>{ const ok=!q||c.dataset.name.includes(q); c.style.display=ok?"":"none"; if(ok) n++; }); const none=$("#scNone"); if(none) none.style.display=n?"none":""; return; }
  if(el.dataset && el.dataset.sl && M && M.v){ const k=el.dataset.sl, attr=el.dataset.attr, v=parseFloat(el.value); M.v[k]=M.v[k]||{}; M.v[k][attr]=v; M.dirty=true;
    const row=$(`#sr_${k}_${el.dataset.i}`); row.classList.remove("unset"); row.querySelector("output").textContent=fmt1(v);
    const a=M.areaAvg(k); $("#av_"+k).textContent=a==null?"–":fmt1(a); }
});
$("#crest").addEventListener("click", ()=>go("painel"));
