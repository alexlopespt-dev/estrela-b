/* ================= app do atleta — lado da equipa técnica (só na versão do Estrela) =================
   Cada atleta tem um código pessoal (players.atk, 24 caracteres ao acaso). O link pessoal leva o endereço do site da
   app do atleta (meta/cfg.atletaUrl), o endereço do script da partilha (o mesmo da partilha deste dispositivo) e o código:
     <site>/#s=<script>&t=<código>
   O script da partilha (dados_app.gs, secção "APP DO ATLETA") só aceita estes códigos e só devolve dados desse atleta.
   Gerar um link novo invalida o anterior. A convocatória só aparece na app do atleta depois de publicada (events.convPub). */
const atOn = () => EDITION==="estrela";
const atSite = () => String(cfg().atletaUrl||"").trim().replace(/[#?].*$/,"").replace(/\/+$/,"");
const atLink = p => p && p.atk && SYNC.cfg && atSite() ? `${atSite()}/#s=${encodeURIComponent(SYNC.cfg.url)}&t=${p.atk}` : "";
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
    <div class="form"><label class="fld full">Endereço do site da app do atleta<input name="site" value="${esc(atSite())}" placeholder="https://estrela-b-atleta.netlify.app"></label></div>
    ${miss&&SYNC.cfg?"":miss?`<div style="margin:10px 0">${miss}</div>`:""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button class="btn sm" data-a="atGenAll" ${sem?"":"disabled"}>Criar os links em falta (${sem})</button></div>
    <div class="list">${pls.map(p=>{ const l=atLink(p); return `<div class="li"><span class="main"><b>${esc(p.name)}</b><small>${p.atk?(l?"Link criado":"Link criado — falta o endereço do site"):"Sem link"}</small></span>
      ${l?`<button class="btn sm" data-a="atCopy" data-id="${esc(p.id)}">Copiar</button><a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(atMsg(p,l))}" target="_blank" rel="noopener">WhatsApp</a>`
        :p.atk?"":`<button class="btn sm" data-a="atGen" data-id="${esc(p.id)}">Criar</button>`}</div>`; }).join("")}</div>
    <p class="note">Nunca envies os links num grupo: cada um é a identidade do atleta na app. As respostas vão para as mesmas folhas dos formulários, por isso a monitorização continua igual (e os formulários continuam a funcionar).</p>`,
    foot:`<span></span><span class="right"><button class="btn" data-a="mClose">Fechar</button><button class="btn primary" data-a="mSave">Guardar endereço</button></span>`,
    ctx:{save:()=>{ const v=fv("site"); if(v&&!/^https:\/\/[^\s/]+\.[^\s]+/.test(v)) return toast("O endereço tem de começar por https://"); put("meta","cfg",{...clone(cfg()),atletaUrl:v}); toast("Endereço guardado"); atLinksForm(); }}});
}
function atSiteForm(){
  modal({title:"Site da app do atleta",body:`<p class="small muted" style="margin:0 0 10px">O endereço do site Netlify onde publicaste a pasta <b>dist/atleta</b>.</p>
    <div class="form"><label class="fld full">Endereço<input name="site" value="${esc(atSite())}" placeholder="https://estrela-b-atleta.netlify.app"></label></div>`,foot:footSave(),
    ctx:{save:()=>{ const v=fv("site"); if(!/^https:\/\/[^\s/]+\.[^\s]+/.test(v)) return toast("O endereço tem de começar por https://"); put("meta","cfg",{...clone(cfg()),atletaUrl:v}); closeModal(); toast("Endereço guardado"); }}});
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
Object.assign(A,{
  atGen: el => { const id=el.dataset.id, p=D.players[id]; if(!p) return;
    const go=()=>{ put("players",id,{...clone(p),atk:atToken()}); toast(p.atk?"Link novo criado — o anterior deixou de funcionar.":"Link pessoal criado"); if($("#dlg").open&&M&&M.save) atLinksForm(); };
    if(p.atk) askConfirm(`Criar um link novo para ${p.name}? O link anterior deixa de funcionar no telemóvel dele.`,"Criar link novo",true).then(ok=>{ if(ok) go(); }); else go(); },
  atGenAll: () => { let n=0; players().forEach(p=>{ if(!p.atk){ put("players",p.id,{...clone(D.players[p.id]),atk:atToken()}); n++; } }); toast(`${n} link(s) criado(s)`); atLinksForm(); },
  atCopy: async el => { const p=P(el.dataset.id), l=atLink(p); if(!l) return toast("Falta o endereço do site ou a partilha.");
    try{ await navigator.clipboard.writeText(l); toast(`Link de ${firstName(p.name)} copiado`); }catch(e){ const i=$("#atL_"+p.id); if(i){ i.select(); try{ document.execCommand("copy"); toast("Link copiado"); }catch(er){ toast("Seleciona e copia o link."); } } else toast("Não foi possível copiar."); } },
  atLinks: () => atLinksForm(),
  atSiteCfg: () => atSiteForm(),
  atPub: el => { const id=el.dataset.id, g=D.events[id]; if(!g) return; const pub=!g.convPub;
    put("events",id,{...clone(g),convPub:pub}); toast(pub?"Convocatória publicada na app dos atletas":"Convocatória retirada da app dos atletas"); }
});
