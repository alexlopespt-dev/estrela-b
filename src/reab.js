/* ================= CLÍNICO → REABILITAÇÃO =================
   Biblioteca de exercícios de reabilitação (coleção rehabex) e plano por lesão (coleção rehab, id = id da lesão):
   rehabex/<id> = {name, reg, fase(1-4), tipo, s, r, t, desc, vid}
   rehab/<injId> = {pid, fase, items:[{id,x,s,r,t,n}], log:[{id,d,by,dor,ok:[itemId],n}]}
   Fisioterapeuta e preparador físico prescrevem os exercícios, registam cada sessão (dor 0-10) e enviam o plano ao atleta. */
const RB_FASES = {1:"Proteção e controlo da dor",2:"Mobilidade e ativação",3:"Força e controlo",4:"Retorno ao campo"};
const RB_REG = ["Coxa posterior","Coxa anterior","Adutores / virilha","Gémeos / Aquiles","Tornozelo","Joelho","Anca / glúteo","Core / lombar","Ombro","Geral"];
const RB_TIPO = ["Isometria","Mobilidade","Ativação","Força","Excêntrico","Propriocepção","Pliometria","Corrida","Cardio sem impacto"];
// exercícios base (ids fixos: juntar outra vez não duplica)
const RB_BASE = [
  ["rb01","Isometria de isquiotibiais (calcanhar contra o chão)","Coxa posterior",1,"Isometria",5,"","30 s","Deitado, joelho fletido a 30-90°. Empurra o calcanhar contra o chão sem dor. Sobe o ângulo à medida que tolera."],
  ["rb02","Ponte de glúteos","Anca / glúteo",1,"Ativação",3,"12","","Deitado, pés no chão. Sobe a anca até alinhar ombros, anca e joelhos; 2 s em cima."],
  ["rb03","Ponte de isquiotibiais com pés no banco","Coxa posterior",2,"Força",3,"10","","Calcanhares no banco, joelhos quase estendidos. Sobe a anca devagar. Progride para uma perna."],
  ["rb04","Deslizamento de isquiotibiais (slider)","Coxa posterior",3,"Excêntrico",3,"8","","Em ponte, deixa os calcanhares deslizar até estender as pernas em 3-4 s; volta com as duas."],
  ["rb05","Peso morto romeno unilateral","Coxa posterior",3,"Força",3,"8","Halter","Joelho ligeiramente fletido, inclina o tronco com as costas direitas até sentir alongar atrás da coxa."],
  ["rb06","Nordic (excêntrico de isquiotibiais)","Coxa posterior",3,"Excêntrico",3,"5","","De joelhos, pés presos. Desce o tronco o mais devagar possível; usa as mãos para amortecer."],
  ["rb07","Contração isométrica do quadricípite","Coxa anterior",1,"Isometria",3,"10","5 s","Perna estendida, empurra a parte de trás do joelho contra o chão (toalha enrolada por baixo)."],
  ["rb08","Elevação da perna estendida","Joelho",1,"Ativação",3,"12","","Deitado, contrai o quadricípite e sobe a perna estendida até à altura do outro joelho."],
  ["rb09","Spanish squat (isometria)","Joelho",2,"Isometria",5,"","45 s","Elástico atrás dos joelhos preso à frente. Agacha até 60-90° com a tíbia vertical e mantém."],
  ["rb10","Step-down excêntrico","Joelho",3,"Excêntrico",3,"10","","Num degrau, desce o calcanhar da outra perna ao chão em 3 s sem o joelho fugir para dentro."],
  ["rb11","Agachamento búlgaro","Coxa anterior",3,"Força",3,"8","Halteres","Pé de trás no banco. Desce até a coxa da frente ficar paralela ao chão; tronco direito."],
  ["rb12","Adução isométrica com bola","Adutores / virilha",1,"Isometria",5,"","30 s","Deitado, joelhos fletidos com a bola entre eles. Aperta a 50-70% sem dor."],
  ["rb13","Copenhagen (prancha lateral de adutores)","Adutores / virilha",3,"Força",3,"6","","Prancha lateral com a perna de cima apoiada no banco (joelho = curto, tornozelo = longo). Sobe e desce controlado."],
  ["rb14","Elevação de gémeos","Gémeos / Aquiles",2,"Força",3,"15","","Sobe nas pontas dos pés e desce devagar. Progride de duas pernas para uma e depois com carga."],
  ["rb15","Excêntrico de gémeos no degrau","Gémeos / Aquiles",3,"Excêntrico",3,"15","","Sobe com as duas pernas, desce só com a lesionada em 3 s até abaixo do degrau. Joelho estendido e fletido."],
  ["rb16","Mobilidade do tornozelo (alfabeto)","Tornozelo",1,"Mobilidade",2,"","1 alfabeto","Sentado, desenha as letras do alfabeto com o pé, só com o tornozelo."],
  ["rb17","Equilíbrio unipodal","Tornozelo",2,"Propriocepção",3,"","30 s","Numa perna, joelho ligeiramente fletido. Progride: olhos fechados, superfície instável, passes com bola."],
  ["rb18","Alcances em estrela (Y-balance)","Joelho",3,"Propriocepção",3,"5 por direção","","Apoio numa perna, alcança o mais longe possível à frente, atrás-dentro e atrás-fora sem perder o equilíbrio."],
  ["rb19","Saltos unipodais com estabilização","Tornozelo",4,"Pliometria",3,"6","","Salta numa perna e aterra a estabilizar 2 s (joelho sobre o pé). Progride: para os lados, em diagonal."],
  ["rb20","Monster walk com elástico","Anca / glúteo",2,"Ativação",3,"10 m","Elástico","Elástico acima dos joelhos ou nos tornozelos. Passos largos para o lado e em diagonal, tronco estável."],
  ["rb21","Prancha frontal","Core / lombar",1,"Isometria",3,"","30 s","Antebraços e pontas dos pés, corpo alinhado. Não deixes a anca cair."],
  ["rb22","Prancha lateral","Core / lombar",2,"Isometria",3,"","30 s por lado","Apoio no antebraço, anca alta e corpo alinhado."],
  ["rb23","Dead bug","Core / lombar",2,"Ativação",3,"10","","Deitado, braços e pernas no ar. Estende braço e perna opostos sem a lombar sair do chão."],
  ["rb24","Rotação externa do ombro com elástico","Ombro",2,"Força",3,"12","Elástico","Cotovelo junto ao corpo a 90°. Roda o antebraço para fora devagar."],
  ["rb25","Bicicleta estática","Geral",1,"Cardio sem impacto",1,"","15-20 min","Ritmo moderado, sem dor. Mantém a condição enquanto não pode correr."],
  ["rb26","Corrida progressiva em linha reta","Geral",4,"Corrida",6,"","60 m","Acelerações a 50%, 70% e 90%. Só avança se no dia seguinte não houver dor."],
  ["rb27","Mudanças de direção progressivas","Geral",4,"Corrida",4,"","6 por lado","Corridas com mudança a 45° e depois 90°, primeiro planeadas e depois reativas ao sinal."]
];
const rbEx = () => Object.entries(D.rehabex||{}).map(([id,x])=>({id,...x})).sort((a,b)=>(a.fase||9)-(b.fase||9)||String(a.name).localeCompare(String(b.name)));
const rbPlan = injId => (D.rehab||{})[injId] || null;
const rbDose = it => { const s=parseNum(it.s), r=String(it.r??"").trim(), t=String(it.t??"").trim();
  return [s&&(r||t)?`${s}×${r||t}`:s?`${s} séries`:r||"", r&&t?t:(!s&&t?t:"")].filter(Boolean).join(" · "); };
const rbFaseTag = f => f?`<span class="tag rbf rbf${f}" title="Fase ${f}: ${esc(RB_FASES[f])}">F${f}</span>`:"";
const rbAtivas = () => injuries().filter(i=>i.status!=="alta" && P(i.pid));

function rbSpark(log){ // dor das últimas sessões (0-10, mais baixo = melhor)
  const v=log.filter(l=>parseNum(l.dor)!=null).slice(-10).map(l=>parseNum(l.dor)); if(v.length<2) return "";
  const w=120,h=30, x=i=>4+i*(w-8)/(v.length-1), y=d=>4+(d/10)*(h-8);
  return `<svg class="rbsp" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Dor nas últimas ${v.length} sessões: ${v.join(", ")}"><polyline points="${v.map((d,i)=>x(i)+","+y(d)).join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>${v.map((d,i)=>`<circle cx="${x(i)}" cy="${y(d)}" r="2.6"/>`).join("")}</svg>`;
}
// linha curta usada no separador Lesões
function rbResumo(i){
  const pl=rbPlan(i.id); if(!pl) return "";
  const last=(pl.log||[]).slice(-1)[0];
  return `<div class="rbres small"><b>Reabilitação</b> — ${pl.fase?`fase ${pl.fase}`:"sem fase"} · ${plural((pl.items||[]).length,"exercício","exercícios")}${last?` · última sessão ${fmtD(last.d,{day:"numeric",month:"short"})}${parseNum(last.dor)!=null?` (dor ${last.dor})`:""}`:""}</div>`;
}

function rbCard(i){
  const p=P(i.pid), pl=rbPlan(i.id)||{}, items=pl.items||[], log=(pl.log||[]).slice().sort((a,b)=>String(a.d).localeCompare(String(b.d)));
  const days=validISO(i.date)?Math.max(0,dayDiff(i.date,todayISO())):0, last=log[log.length-1], wk=addDays(todayISO(),-6);
  const nWk=log.filter(l=>l.d>=wk).length;
  return `<section class="card rbcard" id="rb_${esc(i.id)}"><div class="card-h" style="gap:12px">${avatar(p)}<div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="small muted">${esc(i.zone||"—")}${i.side&&i.side!=="—"?" "+esc(i.side.toLowerCase()):""} — ${esc(i.type||"")} — ${plural(days,"dia","dias")}${validISO(i.exp)?` — regresso previsto ${fmtD(i.exp)}`:""}</div></div><span class="tag ${INJ_ST[i.status].c}">${INJ_ST[i.status].l}</span></div>
    <div class="card-b">
      <div class="rbfases" role="group" aria-label="Fase da reabilitação">${[1,2,3,4].map(f=>`<button class="rbfb ${pl.fase===f?"on":""} rbf${f}" data-a="rbFase" data-id="${esc(i.id)}" data-f="${f}" aria-pressed="${pl.fase===f}"><b>F${f}</b><span>${esc(RB_FASES[f])}</span></button>`).join("")}</div>
      ${items.length?`<ol class="rbitems">${items.map(it=>{ const x=(D.rehabex||{})[it.x]; const nm=x?x.name:(it.name||"(exercício apagado)");
        return `<li><button class="rbit" data-a="rbItem" data-id="${esc(i.id)}" data-k="${esc(it.id)}"><span class="main"><b>${esc(nm)}</b>${it.n?`<small>${esc(it.n)}</small>`:x&&x.reg?`<small>${esc(x.reg)}</small>`:""}</span><span class="rbdose">${esc(rbDose(it)||"—")}</span></button></li>`; }).join("")}</ol>`
        :`<div class="small muted" style="margin:6px 0">Ainda sem exercícios prescritos.</div>`}
      <div class="rblast">${last?`<div><span class="small muted">Última sessão</span><b>${fmtD(last.d,{weekday:"short",day:"numeric",month:"short"})}${last.by?` · ${esc(last.by)}`:""}</b>${parseNum(last.dor)!=null?`<span class="tag ${last.dor>=6?"bad":last.dor>=3?"warn":"ok"}">Dor ${esc(last.dor)}/10</span>`:""}${last.n?`<small>${esc(last.n)}</small>`:""}</div>`:`<div><span class="small muted">Sessões</span><b>Nenhuma registada</b></div>`}
        <div class="rbsum"><span class="small muted">${plural(log.length,"sessão","sessões")} · ${nWk} esta semana</span>${rbSpark(log)}</div></div>
      <div class="rbacts"><button class="btn sm primary" data-a="rbSes" data-id="${esc(i.id)}">Registar sessão</button><button class="btn sm" data-a="rbAdd" data-id="${esc(i.id)}">+ Exercício</button>${log.length?`<button class="btn sm" data-a="rbLog" data-id="${esc(i.id)}">Sessões</button>`:""}${items.length?`<button class="btn sm" data-a="rbWa" data-id="${esc(i.id)}">Enviar ao atleta</button><button class="btn sm gold" data-a="rbPdf" data-id="${esc(i.id)}">PDF</button>`:""}</div>
    </div></section>`;
}

function vReab(sub){
  const act=rbAtivas(), lib=rbEx(), wk=addDays(todayISO(),-6);
  const ses=act.reduce((s,i)=>s+((rbPlan(i.id)||{}).log||[]).filter(l=>l.d>=wk).length,0);
  const fq=S.rbFase||0, rq=S.rbReg||"", list=lib.filter(x=>(!fq||x.fase===fq)&&(!rq||x.reg===rq));
  const regs=RB_REG.filter(r=>lib.some(x=>x.reg===r));
  return `<div class="bar"><h2>Clínico</h2><button class="btn primary" data-a="rbNew">+ Exercício na biblioteca</button></div>${sub}
  <div class="kpis" style="margin-bottom:14px">
    <div class="kpi"><span>Em reabilitação</span><b>${act.length}</b></div>
    <div class="kpi"><span>Sessões esta semana</span><b>${ses}</b></div>
    <div class="kpi"><span>Exercícios na biblioteca</span><b>${lib.length}</b></div>
  </div>
  ${act.length?`<div class="grid2">${act.map(rbCard).join("")}</div>`:`<div class="empty"><b>Ninguém em reabilitação</b>Quando houver uma lesão ativa ou um atleta condicionado, o plano dele aparece aqui.</div>`}
  <section class="card" style="margin-top:14px"><div class="card-h"><h3>Biblioteca de exercícios</h3><span class="sub">${lib.length} exercícios</span></div>
    ${lib.length?`<div class="rbfilt"><input class="inp" id="rbSearch" placeholder="Procurar exercício…" autocomplete="off">
      <div class="chips"><button class="chip ${!fq?"on":""}" data-a="rbFq" data-k="0">Todas as fases</button>${[1,2,3,4].map(f=>`<button class="chip ${fq===f?"on":""}" data-a="rbFq" data-k="${f}">F${f} ${esc(RB_FASES[f])}</button>`).join("")}</div>
      ${regs.length>1?`<label class="fld" style="flex-direction:row;align-items:center;gap:8px;margin:0">Zona ${sel("",regs,rq,'data-c="rbReg" class="inp" style="width:auto"',"Todas")}</label>`:""}</div>
    <div class="list" id="rbList">${list.length?list.map(x=>`<button class="li" data-a="rbEdit" data-id="${esc(x.id)}" data-name="${esc([x.name,x.reg,x.tipo,x.desc].join(" ").toLowerCase())}"><span class="main"><b>${esc(x.name)}</b><small>${[x.reg,x.tipo,rbDose(x)].filter(Boolean).map(esc).join(" — ")}</small></span>${rbFaseTag(x.fase)}</button>`).join(""):`<div class="empty"><b>Nenhum exercício com estes filtros</b></div>`}</div>
    <p class="empty" id="rbNone" style="display:none"><b>Nenhum resultado</b></p>
    ${(n=>n?`<div class="card-b"><button class="btn sm ghost" data-a="rbBase">Repor exercícios base (${n} em falta)</button></div>`:"")(RB_BASE.filter(b=>!D.rehabex[b[0]]).length)}`
    :`<div class="empty"><b>Biblioteca vazia</b>Começa com ${RB_BASE.length} exercícios base (isquiotibiais, joelho, adutores, tornozelo, core, retorno ao campo) e edita-os à vontade.<div style="margin-top:12px"><button class="btn primary" data-a="rbBase">Juntar ${RB_BASE.length} exercícios base</button></div></div>`}
  </section>`;
}

/* ---- formulários ---- */
function rbExForm(id){
  const x=id?clone(D.rehabex[id]):{name:"",reg:"",fase:2,tipo:"",s:3,r:"",t:"",desc:"",vid:""}; if(id&&!D.rehabex[id]) return;
  const body=`<div class="form"><label class="fld full">Nome<input name="name" value="${esc(x.name)}" placeholder="Ex.: Ponte de isquiotibiais"></label>
    <label class="fld">Zona${sel("reg",RB_REG,x.reg,"","—")}</label><label class="fld">Fase${sel("fase",[1,2,3,4].map(f=>({v:f,l:`F${f} — ${RB_FASES[f]}`})),x.fase,"","—")}</label>
    <label class="fld">Tipo${sel("tipo",RB_TIPO,x.tipo,"","—")}</label><label class="fld">Séries<input name="s" inputmode="numeric" value="${esc(x.s??"")}"></label>
    <label class="fld">Repetições<input name="r" value="${esc(x.r||"")}" placeholder="Ex.: 12 ou 8 cada perna"></label><label class="fld">Tempo / carga<input name="t" value="${esc(x.t||"")}" placeholder="Ex.: 30 s, 5 kg, elástico"></label>
    <label class="fld full">Como se faz<textarea name="desc" placeholder="Posição, execução, progressão e o que evitar">${esc(x.desc||"")}</textarea></label>
    <label class="fld full">Vídeo (link do YouTube, Drive…)<input name="vid" type="url" value="${esc(x.vid||"")}" placeholder="https://"></label>
    ${x.vid?`<p class="small" style="margin:0"><a href="${esc(x.vid)}" target="_blank" rel="noopener">Abrir vídeo</a></p>`:""}</div>`;
  const used=id?Object.values(D.rehab||{}).some(pl=>(pl.items||[]).some(it=>it.x===id)):false;
  modal({title:id?"Exercício de reabilitação":"Novo exercício de reabilitação",body,foot:footSave("Guardar",id?"Eliminar":null),ctx:{
    save:()=>{ const name=fv("name"); if(!name){ toast("Dá um nome ao exercício."); return; }
      const vid=fv("vid"); if(vid&&!/^https?:\/\//i.test(vid)){ toast("O vídeo tem de ser um link (https://…)."); return; }
      const o={...(id?clone(D.rehabex[id]):{}),name,reg:fv("reg"),fase:parseNum(fv("fase"))||null,tipo:fv("tipo"),s:parseNum(fv("s")),r:fv("r"),t:fv("t"),desc:fv("desc"),vid};
      put("rehabex",id||uid("rx_"),o); closeModal(); toast("Exercício guardado"); },
    del:()=>askConfirm(used?"Este exercício está no plano de algum atleta. Eliminar mesmo? Nos planos fica o nome.":"Eliminar este exercício da biblioteca?","Eliminar",true).then(ok=>{ if(!ok) return;
      Object.entries(D.rehab||{}).forEach(([pid,pl])=>{ if((pl.items||[]).some(it=>it.x===id)){ const c=clone(pl); c.items=c.items.map(it=>it.x===id?{...it,name:D.rehabex[id].name}:it); put("rehab",pid,c); } });
      del("rehabex",id); closeModal(); toast("Exercício eliminado"); })
  }});
}
function rbPlanOf(injId){ const i=D.injuries[injId]; if(!i) return null; const cur=rbPlan(injId); return cur?clone(cur):{pid:i.pid,fase:null,items:[],log:[]}; }
function rbPick(injId){
  const i=D.injuries[injId]; if(!i) return; const pl=rbPlan(injId)||{}, have=new Set((pl.items||[]).map(it=>it.x)), lib=rbEx();
  if(!lib.length){ toast("A biblioteca está vazia: junta os exercícios base primeiro."); return; }
  const f=pl.fase||0;
  const body=`<input class="inp" id="rbPickQ" placeholder="Procurar…" autocomplete="off" style="margin-bottom:10px">
    <div class="chips" style="margin-bottom:8px"><button class="chip ${!f?"on":""}" data-a="rbPickF" data-k="0">Todas</button>${[1,2,3,4].map(k=>`<button class="chip ${f===k?"on":""}" data-a="rbPickF" data-k="${k}">F${k}</button>`).join("")}</div>
    <div class="list" id="rbPickL">${lib.map(x=>`<label class="chk rbpick" data-f="${x.fase||0}" data-name="${esc([x.name,x.reg,x.tipo].join(" ").toLowerCase())}" ${f&&x.fase!==f?'style="display:none"':""}><input type="checkbox" value="${esc(x.id)}" ${have.has(x.id)?"checked disabled":""}><span><b>${esc(x.name)}</b><small class="muted"> — ${[x.reg,rbDose(x)].filter(Boolean).map(esc).join(" · ")}</small></span></label>`).join("")}</div>`;
  modal({title:"Juntar exercícios ao plano",sub:esc(pname(i.pid)),body,foot:footSave("Juntar"),ctx:{pick:true,
    save:()=>{ const ids=$$("#rbPickL input:checked:not(:disabled)").map(e=>e.value); if(!ids.length){ toast("Escolhe pelo menos um exercício."); return; }
      const c=rbPlanOf(injId); if(!c){ closeModal(); return; }
      ids.forEach(x=>{ const e=D.rehabex[x]; if(e) c.items.push({id:uid("ri"),x,s:e.s??null,r:e.r||"",t:e.t||"",n:""}); });
      if(!c.fase){ const fs=ids.map(x=>(D.rehabex[x]||{}).fase).filter(Boolean); if(fs.length) c.fase=Math.min(...fs); }
      put("rehab",injId,c); closeModal(); toast(ids.length===1?"Exercício juntado ao plano":`${ids.length} exercícios juntados ao plano`); }}});
}
function rbItemForm(injId,k){
  const pl=rbPlan(injId); const it=pl&&(pl.items||[]).find(x=>x.id===k); if(!it) return;
  const x=(D.rehabex||{})[it.x], idx=pl.items.indexOf(it);
  const body=`<div class="form"><label class="fld">Séries<input name="s" inputmode="numeric" value="${esc(it.s??"")}"></label><label class="fld">Repetições<input name="r" value="${esc(it.r||"")}"></label>
    <label class="fld">Tempo / carga<input name="t" value="${esc(it.t||"")}"></label><label class="fld">Ordem${sel("ord",pl.items.map((_,j)=>({v:j,l:String(j+1)})),idx)}</label>
    <label class="fld full">Indicações para este atleta<input name="n" value="${esc(it.n||"")}" placeholder="Ex.: só até aos 60°, sem dor"></label>
    ${x&&x.desc?`<p class="small muted full" style="margin:0">${esc(x.desc)}</p>`:""}${x&&x.vid?`<p class="small full" style="margin:0"><a href="${esc(x.vid)}" target="_blank" rel="noopener">Ver vídeo</a></p>`:""}</div>`;
  modal({title:esc(x?x.name:it.name||"Exercício"),sub:esc(pname(pl.pid)),body,foot:footSave("Guardar","Tirar do plano"),ctx:{
    save:()=>{ const c=clone(rbPlan(injId)); const j=c.items.findIndex(y=>y.id===k); if(j<0){ closeModal(); return; }
      const o={...c.items[j],s:parseNum(fv("s")),r:fv("r"),t:fv("t"),n:fv("n")}; c.items.splice(j,1); const to=Math.max(0,Math.min(c.items.length,parseNum(fv("ord"))??j)); c.items.splice(to,0,o);
      put("rehab",injId,c); closeModal(); toast("Plano atualizado"); },
    del:()=>{ const c=clone(rbPlan(injId)); c.items=c.items.filter(y=>y.id!==k); put("rehab",injId,c); closeModal(); toast("Exercício tirado do plano"); }}});
}
function rbSesForm(injId,sid){
  const i=D.injuries[injId]; if(!i) return; const pl=rbPlan(injId)||{items:[],log:[]};
  const l=sid?(pl.log||[]).find(x=>x.id===sid):{d:todayISO(),by:rbQuem(),dor:"",ok:(pl.items||[]).map(it=>it.id),n:""}; if(!l) return;
  const nm=it=>{ const x=(D.rehabex||{})[it.x]; return x?x.name:it.name||"Exercício"; };
  const quem=[...new Set([...staff().filter(s=>/fisio|prepar|f[ií]sic|m[eé]dic|reab/i.test(s.role||"")).map(s=>s.name),l.by].filter(Boolean))];
  const body=`<div class="form"><label class="fld">Data<input type="date" name="d" value="${esc(l.d)}"></label>
    <label class="fld">Quem acompanhou<input name="by" list="rbQuemL" value="${esc(l.by||"")}" placeholder="Ex.: Fisioterapeuta"><datalist id="rbQuemL">${quem.map(q=>`<option value="${esc(q)}">`).join("")}</datalist></label>
    <div class="fld full"><span>Dor durante a sessão (0 = nenhuma, 10 = máxima)</span><div class="rbdor" role="radiogroup" aria-label="Dor">${[0,1,2,3,4,5,6,7,8,9,10].map(v=>`<label><input type="radio" name="dor" value="${v}" ${String(l.dor)===String(v)?"checked":""}><span>${v}</span></label>`).join("")}</div></div>
    ${(pl.items||[]).length?`<div class="fld full"><span>Exercícios feitos</span>${pl.items.map(it=>`<label class="chk"><input type="checkbox" name="ok" value="${esc(it.id)}" ${(l.ok||[]).includes(it.id)?"checked":""}><span>${esc(nm(it))} <small class="muted">${esc(rbDose(it))}</small></span></label>`).join("")}</div>`:""}
    <label class="fld full">Notas / evolução<textarea name="n" placeholder="Ex.: Já faz o Nordic completo sem dor; amanhã corrida a 70%">${esc(l.n||"")}</textarea></label></div>`;
  modal({title:sid?"Editar sessão":"Registar sessão de reabilitação",sub:esc(pname(i.pid)+" — "+(i.zone||i.type||"")),body,foot:footSave("Guardar",sid?"Eliminar":null),ctx:{
    save:()=>{ const d=fv("d"); if(!validISO(d)){ toast("Indica a data."); return; } if(d>todayISO()){ toast("A data não pode ser no futuro."); return; }
      const r=$('#dlg [name="dor"]:checked'), ok=$$('#dlg [name="ok"]:checked').map(e=>e.value);
      const c=rbPlanOf(injId); if(!c){ closeModal(); return; } c.log=c.log||[];
      const o={id:sid||uid("rs"),d,by:fv("by"),dor:r?+r.value:null,ok,n:fv("n")};
      const j=c.log.findIndex(x=>x.id===o.id); if(j>=0) c.log[j]=o; else c.log.push(o);
      c.log.sort((a,b)=>String(a.d).localeCompare(String(b.d)));
      put("rehab",injId,c); closeModal(); toast("Sessão registada"); },
    del:()=>askConfirm("Eliminar esta sessão?","Eliminar",true).then(ok=>{ if(!ok) return; const c=clone(rbPlan(injId)); c.log=(c.log||[]).filter(x=>x.id!==sid); put("rehab",injId,c); closeModal(); })
  }});
}
const rbQuem = () => { const me=typeof meGet==="function"?meGet():{}; return me&&me.nome?me.nome:""; };
function rbLogForm(injId){
  const i=D.injuries[injId], pl=rbPlan(injId); if(!i||!pl) return;
  const log=(pl.log||[]).slice().sort((a,b)=>String(b.d).localeCompare(String(a.d))), n=(pl.items||[]).length;
  modal({title:"Sessões de reabilitação",sub:esc(pname(i.pid)),body:`<div class="list">${log.map(l=>`<button class="li" data-a="rbSesEdit" data-id="${esc(injId)}" data-k="${esc(l.id)}"><span class="main"><b>${fmtD(l.d,{weekday:"short",day:"numeric",month:"short"})}${l.by?" — "+esc(l.by):""}</b><small>${n?`${(l.ok||[]).filter(k=>pl.items.some(it=>it.id===k)).length}/${n} exercícios`:""}${l.n?(n?" — ":"")+esc(l.n):""}</small></span>${parseNum(l.dor)!=null?`<span class="tag ${l.dor>=6?"bad":l.dor>=3?"warn":"ok"}">Dor ${esc(l.dor)}</span>`:""}</button>`).join("")}</div>`,
    foot:`<span></span><span class="right"><button class="btn" data-a="mClose">Fechar</button><button class="btn primary" data-a="rbSes" data-id="${esc(injId)}">+ Sessão</button></span>`});
}
function rbText(injId){
  const i=D.injuries[injId], pl=rbPlan(injId), p=P(i.pid);
  return `*Plano de reabilitação — ${p?firstName(p.name):""}*\n${pl.fase?`Fase ${pl.fase}: ${RB_FASES[pl.fase]}\n`:""}\n`+(pl.items||[]).map((it,k)=>{ const x=(D.rehabex||{})[it.x]; const d=rbDose(it);
    return `${k+1}. ${x?x.name:it.name||"Exercício"}${d?` — ${d}`:""}${it.n?`\n   ${it.n}`:""}${x&&x.vid?`\n   Vídeo: ${x.vid}`:""}`; }).join("\n")+`\n\nSe tiveres dor acima de 3/10, para e avisa o departamento clínico.`;
}
function rbPrint(injId){
  const i=D.injuries[injId], pl=rbPlan(injId); if(!i||!pl) return; const p=P(i.pid)||{name:"—"};
  const log=(pl.log||[]).slice().sort((a,b)=>String(b.d).localeCompare(String(a.d))).slice(0,12);
  const rows=(pl.items||[]).map((it,k)=>{ const x=(D.rehabex||{})[it.x]||{};
    return `<tr><td class="c">${k+1}</td><td><b>${esc(x.name||it.name||"Exercício")}</b>${x.desc?`<div class="note">${esc(x.desc)}</div>`:""}${it.n?`<div class="note"><b>Indicação:</b> ${esc(it.n)}</div>`:""}</td><td class="c">${esc(rbDose(it)||"—")}</td><td class="c">☐ ☐ ☐ ☐ ☐ ☐ ☐</td></tr>`; }).join("");
  const body=`<div class="kv">${pRow("Atleta",p.name)}${pRow("Lesão",[i.zone,i.side&&i.side!=="—"?i.side.toLowerCase():"",i.type?"— "+i.type:""].filter(Boolean).join(" "))}${pRow("Desde",fmtD(i.date))}${pRow("Regresso previsto",validISO(i.exp)?fmtD(i.exp):"")}${pRow("Fase",pl.fase?`F${pl.fase} — ${RB_FASES[pl.fase]}`:"")}</div>
    <h2>Exercícios</h2><table><thead><tr><th class="c">#</th><th>Exercício</th><th class="c">Dose</th><th class="c">Feito (7 dias)</th></tr></thead><tbody>${rows||`<tr><td colspan="4">Sem exercícios.</td></tr>`}</tbody></table>
    <p class="note">Se a dor passar de 3 em 10 durante ou depois de um exercício, para e avisa o departamento clínico.</p>
    ${log.length?`<h2>Últimas sessões</h2><table><thead><tr><th class="c">Data</th><th>Quem</th><th class="c">Dor</th><th>Notas</th></tr></thead><tbody>${log.map(l=>`<tr><td class="c">${fmtD(l.d,{day:"2-digit",month:"2-digit"})}</td><td>${esc(l.by||"—")}</td><td class="c">${parseNum(l.dor)!=null?esc(l.dor)+"/10":"—"}</td><td>${esc(l.n||"")}</td></tr>`).join("")}</tbody></table>`:""}`;
  printDoc(`reabilitacao-${String(p.name).toLowerCase().replace(/\s+/g,"-")}`,`Plano de reabilitação — ${p.name}`,body);
}

Object.assign(A,{
  csub: el => { S.csub=el.dataset.k||""; render(); },
  rbNew: () => rbExForm(null),
  rbEdit: el => rbExForm(el.dataset.id),
  rbFq: el => { S.rbFase=+el.dataset.k||0; render(); },
  rbBase: () => { let n=0; RB_BASE.forEach(([id,name,reg,fase,tipo,s,r,t,desc])=>{ if(D.rehabex[id]) return; put("rehabex",id,{name,reg,fase,tipo,s,r,t,desc,vid:""}); n++; }); toast(n===1?"1 exercício juntado à biblioteca":n?`${n} exercícios juntados à biblioteca`:"A biblioteca já tem os exercícios base."); },
  rbFase: el => { const c=rbPlanOf(el.dataset.id); if(!c) return; const f=+el.dataset.f; c.fase=c.fase===f?null:f; put("rehab",el.dataset.id,c); },
  rbAdd: el => rbPick(el.dataset.id),
  rbPickF: el => { const f=+el.dataset.k||0; $$("#dlg [data-a=rbPickF]").forEach(b=>b.classList.toggle("on",b===el)); const q=($("#rbPickQ")||{}).value||""; rbPickFilter(f,q); },
  rbItem: el => rbItemForm(el.dataset.id,el.dataset.k),
  rbSes: el => rbSesForm(el.dataset.id,null),
  rbSesEdit: el => rbSesForm(el.dataset.id,el.dataset.k),
  rbLog: el => rbLogForm(el.dataset.id),
  rbPdf: el => { if(!rbPlan(el.dataset.id)) return; printAsk("rehab",el.dataset.id); },
  rbWa: el => { const i=D.injuries[el.dataset.id]; if(!i||!rbPlan(el.dataset.id)) return; const p=P(i.pid)||{}, tel=telWa(p.tel);
    const u=`https://wa.me/${tel}?text=${encodeURIComponent(rbText(el.dataset.id))}`; try{ window.open(u,"_blank","noopener"); }catch(e){} if(!tel) toast("Sem telemóvel na ficha do atleta: escolhe o contacto no WhatsApp."); }
});
Object.assign(Cg,{ rbReg: el => { S.rbReg=el.value; render(); } });
function rbPickFilter(f,q){ q=String(q).trim().toLowerCase(); $$("#rbPickL .rbpick").forEach(c=>{ c.style.display=(!f||+c.dataset.f===f)&&(!q||c.dataset.name.includes(q))?"":"none"; }); }
document.addEventListener("input", e=>{
  const el=e.target;
  if(el.id==="rbSearch"){ const q=el.value.trim().toLowerCase(); let n=0; $$("#rbList [data-name]").forEach(c=>{ const ok=!q||c.dataset.name.includes(q); c.style.display=ok?"":"none"; if(ok) n++; }); const none=$("#rbNone"); if(none) none.style.display=n?"none":""; }
  if(el.id==="rbPickQ"){ const on=$("#dlg [data-a=rbPickF].on"); rbPickFilter(on?+on.dataset.k||0:0,el.value); }
});
