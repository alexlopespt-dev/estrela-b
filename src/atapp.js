/* ================= app do atleta — lado da equipa técnica (só na versão do Estrela) =================
   Cada atleta tem um código pessoal (players.atk, 24 caracteres ao acaso). O link pessoal leva o endereço do site da
   app do atleta (meta/cfg.atletaUrl), o endereço do script da partilha (o mesmo da partilha deste dispositivo) e o código:
     <site>/#s=<script>&t=<código>
   O script da partilha (dados_app.gs, secção "APP DO ATLETA") só aceita estes códigos e só devolve dados desse atleta.
   Gerar um link novo invalida o anterior. A convocatória só aparece na app do atleta depois de publicada (events.convPub). */
const atOn = () => EDITION==="estrela";
const atSite = () => { const v=String(cfg().atletaUrl||"").trim().replace(/[#?].*$/,"").replace(/\/+$/,""); return v&&!/^https?:\/\//i.test(v)?"https://"+v:v; };
const atLink = p => p && p.atk && SYNC.cfg && atSite() ? `${atSite()}/#s=${encodeURIComponent(SYNC.cfg.url)}&t=${p.atk}` : "";
/* endereço escrito à mão: aceita sem https:// e sem barra final; recusa o próprio site da equipa técnica */
function atNormSite(v){
  v=String(v||"").trim().replace(/\s+/g,""); if(!v) return {v:""};
  if(!/^https?:\/\//i.test(v)) v="https://"+v;
  v=v.replace(/^http:\/\//i,"https://").replace(/[#?].*$/,"").replace(/\/+$/,"");
  let u; try{ u=new URL(v); }catch(e){ return {err:"Endereço inválido. Exemplo: estrela-b-atleta.netlify.app"}; }
  if(!/\./.test(u.hostname)) return {err:"Endereço inválido. Exemplo: estrela-b-atleta.netlify.app"};
  if(/^https?:$/.test(location.protocol) && u.host===location.host && (u.pathname.replace(/\/+$/,"")===location.pathname.replace(/\/(index\.html)?$/,"").replace(/\/+$/,"")))
    return {err:"Esse é o endereço desta app (da equipa técnica). A app do atleta tem de ser um site Netlify à parte: cria um site novo e arrasta lá a pasta atleta."};
  return {v:u.origin+u.pathname.replace(/\/+$/,"")};
}
function atSaveSite(raw){ const r=atNormSite(raw); if(r.err){ toast(r.err); return false; }
  put("meta","cfg",{...clone(cfg()),atletaUrl:r.v}); toast(r.v?"Endereço guardado — os links estão prontos":"Endereço apagado"); return true; }
function atToken(){ const b=new Uint8Array(18); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
const atMsg = (p,link) => `Olá ${firstName(p.name)}! Este é o teu link pessoal para a app do atleta do ${meta().team||"Estrela B"}: bem-estar de manhã, PSE depois do treino, agenda e convocatórias. Abre-o no teu telemóvel e adiciona ao ecrã principal. É só teu — não partilhes. ${link}`;
function atMissing(){
  if(!SYNC.cfg) return `<p class="note" style="margin:0">A app do atleta recebe os dados pela <b>partilha com a equipa técnica</b>. Liga-a primeiro em Plantel → "Partilhar com a equipa técnica".</p>`;
  if(!atSite()) return `<p class="note" style="margin:0 0 8px">Falta o endereço do site da app do atleta (o site Netlify onde publicaste a pasta <b>dist/atleta</b>).</p><button class="btn sm primary" data-a="atSiteCfg">Definir o endereço</button>`;
  return "";
}
/* ---- ficha do atleta ---- */
function atCard(pid){
  if(!atOn()) return "";
  const p=P(pid); if(!p) return "";
  const miss=atMissing(), link=atLink(p);
  return `<section class="card"><div class="card-h"><h3>App do atleta</h3>${p.atk?`<span class="tag ok">Link criado</span>`:""}</div><div class="card-b">
    ${miss || (p.atk ? `<label class="fld full">Link pessoal (só para ${esc(firstName(p.name))})<input readonly value="${esc(link)}" id="atL_${esc(pid)}"></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn sm primary" data-a="atCopy" data-id="${esc(pid)}">Copiar</button>
      <a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(atMsg(p,link))}" target="_blank" rel="noopener">WhatsApp</a>
      <button class="btn sm ghost" data-a="atGen" data-id="${esc(pid)}">Novo link</button></div>
      <p class="note">Envia só a ${esc(firstName(p.name))}, em privado. "Novo link" desliga o anterior (ex.: telemóvel perdido ou link partilhado).</p>`
    : `<p class="note" style="margin:0 0 8px">Com o link pessoal, ${esc(firstName(p.name))} responde ao bem-estar e ao PSE na app (em vez dos formulários) e vê a agenda, a convocatória e os seus números.</p><button class="btn sm primary" data-a="atGen" data-id="${esc(pid)}">Criar link pessoal</button>`)}
  </div></section>`;
}
/* ---- Plantel: todos os links ---- */
function atLinksForm(){
  const pls=players(), miss=atMissing(), sem=pls.filter(p=>!p.atk).length;
  modal({title:"App do atleta",sub:"Links pessoais — um por atleta, enviados em privado",big:true,body:`
    <div class="form"><label class="fld full">Endereço do site da app do atleta<input name="site" value="${esc(atSite())}" placeholder="estrela-b-atleta.netlify.app"></label></div>
    ${miss&&SYNC.cfg?"":miss?`<div style="margin:10px 0">${miss}</div>`:""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button class="btn sm" data-a="atGenAll" ${sem?"":"disabled"}>Criar os links em falta (${sem})</button>
      <button class="btn sm" data-a="atDiag" ${pls.some(p=>p.atk)&&SYNC.cfg?"":"disabled"}>Verificar o que os atletas veem</button></div>
    <div class="list">${pls.map(p=>{ const l=atLink(p); return `<div class="li"><span class="main"><b>${esc(p.name)}</b><small>${p.atk?(l?"Link criado":"Link criado — falta o endereço do site"):"Sem link"}</small></span>
      ${l?`<button class="btn sm" data-a="atCopy" data-id="${esc(p.id)}">Copiar</button><a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(atMsg(p,l))}" target="_blank" rel="noopener">WhatsApp</a>`
        :p.atk?"":`<button class="btn sm" data-a="atGen" data-id="${esc(p.id)}">Criar</button>`}</div>`; }).join("")}</div>
    <p class="note">Nunca envies os links num grupo: cada um é a identidade do atleta na app. As respostas vão para as mesmas folhas dos formulários, por isso a monitorização continua igual (e os formulários continuam a funcionar).</p>`,
    foot:`<span></span><span class="right"><button class="btn" data-a="mClose">Fechar</button><button class="btn primary" data-a="mSave">Guardar endereço</button></span>`,
    ctx:{save:()=>{ if(atSaveSite(fv("site"))) atLinksForm(); }}});
  const inp=$("#dlg input[name=site]"); if(inp) inp.addEventListener("change",()=>{ if(atNormSite(inp.value).v!==atSite() && atSaveSite(inp.value)) atLinksForm(); });
}
function atSiteForm(){
  modal({title:"Site da app do atleta",body:`<p class="small muted" style="margin:0 0 10px">O endereço do site Netlify onde publicaste a pasta <b>dist/atleta</b>.</p>
    <div class="form"><label class="fld full">Endereço<input name="site" value="${esc(atSite())}" placeholder="estrela-b-atleta.netlify.app"></label></div>`,foot:footSave(),
    ctx:{save:()=>{ if(!fv("site")) return toast("Escreve o endereço do site."); if(atSaveSite(fv("site"))) closeModal(); }}});
}
/* ---- Jogos → Convocatória: publicar na app ---- */
function atConvCard(g){
  if(!atOn()) return "";
  const n=(g.call||[]).length, pub=!!g.convPub;
  return `<section class="card"><div class="card-h"><h3>App dos atletas</h3>${pub?`<span class="tag ok">Publicada</span>`:`<span class="tag">Não publicada</span>`}</div><div class="card-b">
    <p class="note" style="margin:0 0 10px">${pub?`Os atletas veem na app se estão convocados, a concentração, o horário e a lista (${n}). As alterações que fizeres aqui aparecem lá.`
      :`Enquanto não publicares, a app dos atletas só mostra o jogo, sem convocatória.`}</p>
    <button class="btn sm ${pub?"ghost":"primary"}" data-a="atPub" data-id="${esc(g.id)}" ${!pub&&!n?"disabled":""}>${pub?"Retirar da app":"Publicar na app dos atletas"}</button></div></section>`;
}
/* antes de criar links: receber primeiro o que está na partilha (outro dispositivo pode já ter criado o link desse atleta;
   criar outro aqui apagava o que o atleta já tem no telemóvel) */
async function atFresh(){ if(typeof syncOn!=="function"||!syncOn()) return; try{ await syncPush(); await syncPull(); }catch(e){} }
/* ---- verificar: o que o script da partilha entrega à app do atleta vs o que está nesta app ----
   A app do atleta só vê o que chegou ao Sheets pela partilha. Treinos/jogos criados num dispositivo sem a partilha ligada
   (ou na versão online do Claude, que não usa a partilha) não aparecem lá: aqui mostra quais e deixa enviá-los. */
async function atFetchAtleta(tok){
  const u=SYNC.cfg.url.trim()+(SYNC.cfg.url.includes("?")?"&":"?")+"a=atleta&t="+encodeURIComponent(tok)+"&_="+Date.now().toString(36);
  let d; try{ const r=await fetch(u); if(!r.ok) throw new Error("HTTP "+r.status); d=await r.json(); }catch(e){ d=await monJsonp(u); }
  if(d&&d.erro) throw new Error(d.msg||d.erro); return d;
}
async function atDiagForm(){
  const p=players().find(x=>x.atk); if(!p||!SYNC.cfg) return toast("Precisa da partilha ligada e de pelo menos um link criado.");
  modal({title:"O que os atletas veem",sub:"A comparar com o script da partilha…",body:`<div class="empty"><b>A perguntar ao Google…</b>Pode demorar uns segundos.</div>`,foot:`<span></span><span class="right"><button class="btn" data-a="mClose">Fechar</button></span>`});
  const srvP={}, srvE={}, srvDel=new Set(); let d, rd=null;
  try{
    await atFresh();
    const all=await syncGet({a:"pull",since:0});
    (all.docs||[]).forEach(x=>{ if(!x) return; if(x.c==="events"){ if(x.x) srvDel.add(x.i); else if(x.d) srvE[x.i]=x.d; } if(x.c==="players"&&!x.x&&x.d) srvP[x.i]=x.d; });
    d=await atFetchAtleta((players().find(x=>x.atk&&srvP[x.id]&&srvP[x.id].atk===x.atk)||p).atk);
    try{ rd=await syncGet({a:"atletas_diag"}); }catch(e){ rd={erro:e.message}; }
  }catch(e){ if($("#dlg").open) $("#dlg .dlg-b").innerHTML=`<div class="empty"><b>Não foi possível ler o script</b>${esc(e.message||String(e))}</div>`; return; }
  const t=todayISO(), ate=addDays(t,14), J=o=>JSON.stringify(o);
  const loc=events().filter(e=>(e.type==="treino"||e.type==="jogo")&&e.date>=t&&e.date<=ate).sort(byDT);
  // todos os treinos e jogos (também os passados: minutos, golos, presenças) que aqui estão diferentes ou não existem na partilha
  const falta=events().filter(e=>{ if(srvDel.has(e.id)) return false; const l=D.events[e.id], v=srvE[e.id]; if(!v) return true; if(J(l)===J(v)) return false;
    const la=l._at||"", sa=v._at||""; return la||sa ? la>sa : J(l).length>J(v).length; }).sort(byDT);
  const fut=falta.filter(e=>e.date>=t), pas=falta.filter(e=>e.date<t);
  const n=syncN(), online=MODE!=="local";
  const lk=players().filter(x=>x.atk), lkMal=lk.filter(x=>!srvP[x.id]||srvP[x.id].atk!==x.atk);
  const row=e=>`<div class="li"><span class="main"><b>${e.type==="jogo"?"Jogo "+esc((e.venue==="F"?"@ ":"vs ")+(e.opp||"")):"Treino"+(e.theme?" · "+esc(e.theme):"")}</b><small>${esc(fmtD(e.date,{weekday:"short",day:"numeric",month:"short"}))}${e.time?" · "+esc(e.time):""}</small></span><span class="tag bad">${srvE[e.id]?"Diferente":"Não chegou"}</span></div>`;
  // respostas por atleta (bem-estar/PSE, 14 dias)
  let resp="";
  if(rd&&rd.erro) resp=`<p class="note">Para ver as respostas por atleta, atualiza o script da partilha (dados_app.gs) e faz "Nova versão". (${esc(rd.erro)})</p>`;
  else if(rd&&rd.atletas){
    const pls=players().filter(x=>rd.atletas[x.id]).sort((a,b)=>(rd.atletas[a.id].bem-rd.atletas[b.id].bem)||a.name.localeCompare(b.name));
    const sem=Object.entries(rd.semAtleta||{}).sort((a,b)=>b[1]-a[1]);
    const opts=`<option value="">— escolhe o atleta —</option>`+players().map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
    resp=`<h3 style="margin:16px 0 6px">Bem-estar e PSE nos últimos 14 dias</h3>
      ${sem.length?`<div class="card" style="padding:12px;margin:0 0 10px"><p style="margin:0 0 8px"><b>Nomes escritos nas folhas que não correspondem a nenhum atleta</b> — as respostas destes não aparecem na app do atleta. Diz a quem pertencem:</p>
        ${sem.map(([nm,c])=>`<div class="li" style="gap:8px"><span class="main"><b>${esc(nm)}</b><small>${c} resposta${c>1?"s":""}</small></span><select data-c="atNome" data-n="${esc(nm)}" aria-label="Atleta de ${esc(nm)}">${opts}</select></div>`).join("")}</div>`:""}
      ${(rd.erros||[]).length?`<p class="note">${rd.erros.map(esc).join(" · ")}</p>`:""}
      <div class="tscroll"><table class="tb"><thead><tr><th class="l">Atleta</th><th class="l">Nome na folha</th><th>Bem-estar</th><th>PSE</th></tr></thead><tbody>
      ${pls.map(x=>{ const r=rd.atletas[x.id]; return `<tr><td class="l">${esc(x.name)}</td><td class="l small">${esc(r.nome)}</td><td class="num"${r.bem?"":' style="color:var(--r5);font-weight:700"'}>${r.bem}</td><td class="num">${r.pse}</td></tr>`; }).join("")}
      </tbody></table></div><p class="small muted">0 no bem-estar = a app do atleta não encontra as respostas dele: o nome na folha é diferente (liga-o acima) ou não tem respondido.</p>`;
  }
  const body=`<div class="kpis" style="margin-bottom:12px">
      <div class="kpi"><span>Nesta app (15 dias)</span><b>${loc.filter(e=>e.type==="treino").length}<small> treinos</small> · ${loc.filter(e=>e.type==="jogo").length}<small> jogos</small></b></div>
      <div class="kpi"><span>A app do atleta vê</span><b>${(d.agenda||[]).filter(a=>a.tipo==="treino").length}<small> treinos</small> · ${(d.agenda||[]).filter(a=>a.tipo==="jogo").length}<small> jogos</small></b></div>
      <div class="kpi"><span>Por enviar daqui</span><b>${n}</b></div></div>
    <p class="note" style="margin:0 0 10px">${lkMal.length?`<b>${lkMal.length} link(s) desta lista não são os que estão na partilha:</b> ${lkMal.map(x=>esc(x.name)).join(", ")}. Carrega em "Enviar agora" ou volta a abrir esta lista.`:`<b>Links:</b> os ${lk.length} links desta lista são os que funcionam. Um atleta com "link expirado" tem um link antigo (foi criado um novo depois): envia-lhe outra vez o link desta lista.`}</p>
    ${online?`<p class="note" style="margin:0 0 10px"><b>Estás na versão online (no Claude).</b> Esta versão não envia para o Sheets, por isso a app do atleta não vê o que fazes aqui. Cria os treinos e jogos na versão do Netlify com a partilha ligada.</p>`:""}
    ${falta.length?`<p style="margin:0 0 8px"><b>${falta.length} ${falta.length>1?"treinos/jogos estão":"treino/jogo está"} diferente${falta.length>1?"s":""} ou em falta na partilha</b> — os atletas não os veem assim${pas.length?` (${pas.length} já passados: resultados, minutos, golos e presenças contam para as estatísticas deles)`:""}:</p>
      <div class="list">${fut.slice(0,20).map(row).join("")}${pas.slice(-20).reverse().map(row).join("")}</div>
      ${online?"":`<button class="btn primary" data-a="atDiagSend" style="margin-top:8px">Enviar ${falta.length>1?"estes "+falta.length:"este"} para a partilha</button>`}`
    :`<div class="empty"><b>Treinos e jogos: está tudo igual</b>A app do atleta tem os mesmos treinos, jogos e resultados. Se o telemóvel mostra outra coisa, carrega no botão de atualizar da app do atleta.</div>`}
    ${n&&!online?`<p class="small muted">Há ${n} alteraç${n>1?"ões":"ão"} deste dispositivo por enviar. <button class="btn sm" data-a="atDiagPush">Enviar agora</button></p>`:""}
    ${resp}`;
  modal({title:"O que os atletas veem",sub:`Pelo link de ${esc(p.name)} · script da partilha`,big:true,body,
    foot:`<span></span><span class="right"><button class="btn" data-a="mClose">Fechar</button></span>`,ctx:{falta:falta.map(e=>e.id)}});
}
Object.assign(Cg,{
  atNome: el => { const pid=el.value, nm=el.dataset.n; if(!pid||!nm) return; const c=clone(cfg());
    put("meta","cfg",{...c,atNomes:{...(c.atNomes||{}),[nm]:pid}}); toast(`"${nm}" ligado a ${P(pid)?P(pid).name:""} — a app do atleta passa a mostrar estas respostas.`); setTimeout(atDiagForm,1500); }
});
Object.assign(A,{
  atDiag: () => atDiagForm(),
  atDiagPush: async () => { toast("A enviar…"); await syncPush(); toast(SYNC.err||"Enviado"); atDiagForm(); },
  atDiagSend: async () => { const ids=(M&&M.falta)||[]; if(!ids.length||!syncOn()) return;
    ids.forEach(id=>{ if(D.events[id]) SYNC.q["events/"+id]={c:"events",i:id,d:D.events[id]}; }); syncSaveQ(); syncBadge();
    toast("A enviar…"); await syncPush(); if(SYNC.err) return toast(SYNC.err); toast(`${ids.length} registo(s) enviados — a app do atleta já os vê`); atDiagForm(); },
  atGen: async el => { const id=el.dataset.id; if(!D.players[id]) return;
    const had=!!D.players[id].atk; await atFresh(); const p=D.players[id]; if(!p) return;
    if(!had&&p.atk){ toast(`${firstName(p.name)} já tinha link (criado noutro dispositivo) — usa esse.`); if($("#dlg").open&&M&&M.save) atLinksForm(); else render(); return; }
    const go=()=>{ put("players",id,{...clone(p),atk:atToken()}); toast(p.atk?"Link novo criado — o anterior deixou de funcionar.":"Link pessoal criado"); if($("#dlg").open&&M&&M.save) atLinksForm(); };
    if(p.atk) askConfirm(`Criar um link novo para ${p.name}? O link anterior deixa de funcionar no telemóvel dele.`,"Criar link novo",true).then(ok=>{ if(ok) go(); }); else go(); },
  atGenAll: async () => { await atFresh(); let n=0; players().forEach(p=>{ if(!p.atk){ put("players",p.id,{...clone(D.players[p.id]),atk:atToken()}); n++; } }); toast(`${n} link(s) criado(s)`); atLinksForm(); },
  atCopy: async el => { const p=P(el.dataset.id), l=atLink(p); if(!l) return toast("Falta o endereço do site ou a partilha.");
    try{ await navigator.clipboard.writeText(l); toast(`Link de ${firstName(p.name)} copiado`); }catch(e){ const i=$("#atL_"+p.id); if(i){ i.select(); try{ document.execCommand("copy"); toast("Link copiado"); }catch(er){ toast("Seleciona e copia o link."); } } else toast("Não foi possível copiar."); } },
  atLinks: async () => { atLinksForm(); await atFresh(); if($("#dlg").open&&M&&M.save) atLinksForm(); },
  atSiteCfg: () => atSiteForm(),
  atPub: el => { const id=el.dataset.id, g=D.events[id]; if(!g) return; const pub=!g.convPub;
    put("events",id,{...clone(g),convPub:pub}); toast(pub?"Convocatória publicada na app dos atletas":"Convocatória retirada da app dos atletas"); }
});
