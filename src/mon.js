/* ================= monitorização (Google Sheets: bem-estar, PSE, prontidão) ================= */
// A app lê o resumo publicado pelo Apps Script do ficheiro "Estrela B - Painel" (ver tools/apps-script/ligacao_app.gs).
// O endereço e a chave ficam em meta/cfg; o último resumo recebido fica guardado neste browser para abrir sem rede.
const MON = { data:null, at:null, err:"", loading:false };
const MON_LS = LS+":mon";
try{ const c=JSON.parse(localStorage.getItem(MON_LS)||"null"); if(c&&c.data){ MON.data=c.data; MON.at=c.at; } }catch(e){}
const monCfg = () => cfg().mon || {};
const nameKey = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();

async function monFetch(manual){
  const c=monCfg(); if(!c.url){ if(manual) toast("Liga primeiro ao Google Sheets."); return; }
  if(MON.loading) return;
  MON.loading=true; MON.err=""; schedule();
  const ctl=typeof AbortController!=="undefined"?new AbortController():null, tm=setTimeout(()=>ctl&&ctl.abort(),25000);
  try{
    const u=c.url.trim()+(c.url.includes("?")?"&":"?")+"k="+encodeURIComponent(c.key||"");
    const r=await fetch(u,{signal:ctl?ctl.signal:undefined}); if(!r.ok) throw new Error("HTTP "+r.status);
    const d=await r.json();
    if(d.erro) throw new Error(d.erro==="chave"?"A chave não está certa.":d.erro);
    if(!Array.isArray(d.jogadores)) throw new Error("A resposta não tem jogadores.");
    MON.data=d; MON.at=new Date().toISOString();
    try{ localStorage.setItem(MON_LS,JSON.stringify({data:d,at:MON.at})); }catch(e){}
    if(manual) toast(`Monitorização atualizada — ${d.jogadores.length} jogadores`);
  }catch(e){
    MON.err = e&&e.name==="AbortError" ? "O Google demorou demasiado a responder." : (e&&e.message&&!/fetch|network|load/i.test(e.message) ? e.message : "Não foi possível ligar ao Google Sheets. Se tens um bloqueador de anúncios (AdBlock, uBlock…), desliga-o para este site; senão confirma a rede e o endereço.");
    if(manual) toast(MON.err);
  }finally{ clearTimeout(tm); MON.loading=false; VER++; schedule(); }
}
function monAuto(){ const c=monCfg(); if(!c.url) return; if(MON.at && Date.now()-new Date(MON.at).getTime()<10*60*1000) return; monFetch(false); }

/* ligação nome da folha -> atleta da app: igual, depois abreviaturas ("Bruno Vunge" = "Bruno V."), depois o que foi escolhido à mão */
function monMatch(){
  const d=MON.data; if(!d) return {map:{},miss:[]};
  const man=monCfg().map||{}, pls=allPlayers(), map={}, used=new Set();
  const names=d.jogadores.map(j=>j.nome);
  names.forEach(n=>{ if(man[n]!==undefined){ if(man[n] && D.players[man[n]]){ map[n]=man[n]; used.add(man[n]); } else map[n]=null; } });
  names.forEach(n=>{ if(n in map) return; const p=pls.find(p=>!used.has(p.id)&&nameKey(p.name)===nameKey(n)); if(p){ map[n]=p.id; used.add(p.id); } });
  const tok = s => nameKey(s).split(" ").filter(Boolean);
  const fits = (app,sheet) => { const a=tok(app), s=tok(sheet); return a.length && a.every(t=>s.some(x=>x===t||(t.length===1&&x.startsWith(t)))); };
  names.forEach(n=>{ if(n in map) return; const c=pls.filter(p=>!used.has(p.id)&&fits(p.name,n)); if(c.length===1){ map[n]=c[0].id; used.add(c[0].id); } });
  const miss=names.filter(n=>!(n in map));
  return {map,miss};
}
function monOf(pid){ const d=MON.data; if(!d) return null; const {map}=monMatch(); const n=Object.keys(map).find(k=>map[k]===pid); return n?d.jogadores.find(j=>j.nome===n)||null:null; }

/* cores iguais às do Sheets */
function monCol(s){ if(s==null) return "var(--surface-2)"; const t=Math.max(0,Math.min(1,s/100)); const h=v=>Math.round(v);
  if(t<.5){ const u=t/.5; return `rgb(${h(248+7*u)},${h(105+130*u)},${h(107+25*u)})`; } const u=(t-.5)/.5; return `rgb(${h(255-156*u)},${h(235-45*u)},${h(132-9*u)})`; }
const MON_EST = {RISCO:"bad","PICO DE CARGA":"bad","Atenção":"warn","A subir":"warn",Normal:"ok","Carga baixa":"blue"};
const monTag = v => v ? `<span class="tag ${MON_EST[v]||""}">${esc(v)}</span>` : "";
const monScore = (s,big) => `<span class="mscore ${big?"big":""}" style="background:${monCol(s)}">${s==null?"–":esc(s)}</span>`;
const n2 = x => x==null ? "–" : String(Math.round(x*100)/100).replace(".",",");
function spark(vals,{min=1,max=5,bars=false,w=112,h=26,folga}={}){
  const n=vals.length; if(!n) return "";
  if(bars){ const mx=Math.max(1,...vals.map(v=>v||0)), bw=w/n;
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${vals.map((v,i)=>`<rect x="${(i*bw+1).toFixed(1)}" y="${(h-(v||0)/mx*(h-2)).toFixed(1)}" width="${(bw-2).toFixed(1)}" height="${((v||0)/mx*(h-2)).toFixed(1)}" fill="${folga&&folga[i]?"#b9aeb2":"var(--grena)"}"/>`).join("")}</svg>`; }
  const X=i=>(n===1?w/2:i*(w-4)/(n-1)+2), Y=v=>h-2-(Math.max(min,Math.min(max,v))-min)/(max-min)*(h-4);
  let d="", pen=false; vals.forEach((v,i)=>{ if(v==null){ pen=false; return; } d+=(pen?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1); pen=true; });
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><line x1="0" x2="${w}" y1="${Y(3).toFixed(1)}" y2="${Y(3).toFixed(1)}" stroke="var(--line)"/><path d="${d}" fill="none" stroke="var(--verde)" stroke-width="2"/>${vals.map((v,i)=>v==null?"":`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="1.8" fill="var(--verde)"/>`).join("")}</svg>`;
}
function monAge(){ if(!MON.data) return ""; const a=MON.data.atualizado?new Date(MON.data.atualizado):null;
  const t=a&&!isNaN(a)?a.toLocaleString("pt-PT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";
  return `Sheets atualizado ${t}${MON.data.diasAtraso>0?` — sem respostas há ${MON.data.diasAtraso} dia(s)`:""}`; }

/* ---- cartão do painel ---- */
function monCard(){
  const c=monCfg();
  if(!c.url) return `<section class="card"><div class="card-h"><h3>Prontidão e bem-estar</h3><button class="btn sm" data-a="monCfg">Ligar ao Sheets</button></div><div class="empty"><b>Painel de monitorização por ligar</b>Liga o ficheiro "Estrela B - Painel" para veres aqui a prontidão, o bem-estar e a carga.</div></section>`;
  const d=MON.data;
  if(!d) return `<section class="card"><div class="card-h"><h3>Prontidão e bem-estar</h3><button class="btn sm" data-a="monRefresh">${MON.loading?"A carregar…":"Atualizar"}</button></div><div class="empty"><b>${MON.loading?"A ler o Google Sheets…":"Ainda sem dados"}</b>${esc(MON.err||"")}</div></section>`;
  const js=d.jogadores, com=js.filter(j=>j.prontidao!=null), med=com.length?Math.round(avg(com.map(j=>j.prontidao))):null;
  const {map}=monMatch();
  const top=js.filter(j=>j.prio>0||(j.prontidao!=null&&j.prontidao<50)).sort((a,b)=>b.prio-a.prio||(a.prontidao??999)-(b.prontidao??999)).slice(0,6);
  const cnt=k=>js.filter(j=>j.estadoBem===k).length;
  return `<section class="card"><div class="card-h"><h3>Prontidão — ${esc(d.md&&d.md.etiqueta||"")}</h3><span style="display:flex;gap:6px"><button class="btn sm" data-a="monRefresh" ${MON.loading?"disabled":""}>${MON.loading?"A atualizar…":"Atualizar"}</button><button class="btn sm" data-a="tab" data-t="mon">Ver tudo</button></span></div>
    <div class="card-b" style="padding-bottom:6px"><div class="mkpis" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
      <div><span>Prontidão média</span>${monScore(med,true)}</div>
      <div><span>Em risco</span><b class="${cnt("RISCO")?"bad":""}">${cnt("RISCO")}</b></div>
      <div><span>Atenção</span><b>${cnt("Atenção")}</b></div>
      <div><span>Pico de carga</span><b>${js.filter(j=>j.estadoCarga==="PICO DE CARGA").length}</b></div>
      <div><span>Sem resposta</span><b>${cnt("sem resposta")}</b></div></div>
      <p class="small muted" style="margin:8px 0 0">${esc(monAge())}${MON.err?` — <span style="color:var(--r5)">${esc(MON.err)}</span>`:""}</p></div>
    <div class="list two">${top.length?top.map(j=>{ const p=map[j.nome]?P(map[j.nome]):null;
      return `<button class="li" ${p?`data-a="page" data-p="atleta" data-id="${esc(p.id)}"`:`data-a="tab" data-t="mon"`}>${p?avatar(p):`<span class="ph g-X">${esc(initials(j.nome))}</span>`}<span class="main"><b>${esc(p?p.name:j.nome)}</b><small class="clamp">${esc(j.leitura)}</small></span>${monTag(j.estadoBem!=="Normal"?j.estadoBem:j.estadoCarga)}${monScore(j.prontidao)}</button>`; }).join("")
      :`<div class="empty"><b>Sem sinais de alerta</b></div>`}</div></section>`;
}

/* ---- separador Monitorização ---- */
function vMon(){
  const c=monCfg(), d=MON.data;
  const head=`<div class="bar"><h2>Monitorização</h2>${d?`<span class="small muted">${esc(monAge())}</span>`:""}<span class="sp"></span>
    <button class="btn" data-a="monCfg">${c.url?"Ligação ao Sheets":"Ligar ao Google Sheets"}</button>${c.url?`<button class="btn primary" data-a="monRefresh" ${MON.loading?"disabled":""}>${MON.loading?"A atualizar…":"Atualizar"}</button>`:""}</div>
    ${MON.err?`<div class="alert bad" style="cursor:default"><i></i><span class="main"><b>${esc(MON.err)}</b><small>${d?"A mostrar os últimos dados recebidos.":"Confirma o endereço e a chave em “Ligação ao Sheets”."}</small></span></div>`:""}`;
  if(!c.url) return head+`<div class="empty"><b>Sem ligação ao painel de monitorização</b>Os questionários de bem-estar e de PSE são tratados no Google Sheets "Estrela B - Painel". Liga-o aqui para veres a prontidão, o bem-estar e a carga de cada atleta na app.</div>`;
  if(!d) return head+`<div class="empty"><b>${MON.loading?"A ler o Google Sheets…":"Ainda sem dados"}</b></div>`;
  const {map,miss}=monMatch();
  const js=d.jogadores.slice(), com=js.filter(j=>j.prontidao!=null);
  const flt=S.monF||"";
  let rows=js.filter(j=>!flt || (flt==="al"?(j.prio>0||(j.prontidao!=null&&j.prontidao<50)):flt==="gr"?j.posicao==="GR":j.estado!=="Disponível"));
  const k=S.monSort||"prontidao", dir=S.monDir||1;
  const val=j=>{ const v=j[k]; return v==null?(dir>0?1e9:-1e9):typeof v==="string"?v.toLowerCase():v; };
  rows.sort((a,b)=>{ const x=val(a), y=val(b); return (x>y?1:x<y?-1:0)*dir || String(a.nome).localeCompare(b.nome); });
  const cols=[["nome","Atleta"],["estado","Estado"],["prontidao","Prontidão"],["condicao","Condição"],["confianca","Confiança"],["bem3","Bem-estar 3d"],["z","Z-score"],["critico","Item crítico"],["carga7","Carga 7d"],["acwr","ACWR"],["monotonia","Monotonia"],["estadoBem","Bem-estar"],["estadoCarga","Carga"],["",`Bem-estar ${(d.dias||[]).length}d`],["","Carga diária"],["leitura","Leitura"]];
  const cnt=x=>js.filter(j=>j.estadoBem===x).length, med=com.length?Math.round(avg(com.map(j=>j.prontidao))):null;
  const nm=j=>{ const p=map[j.nome]?P(map[j.nome]):null; return p?`<button class="lnk pin" data-a="page" data-p="atleta" data-id="${esc(p.id)}">${avatar(p)}<b>${esc(p.name)}</b></button>`:`<div class="pin"><span class="ph g-X">${esc(initials(j.nome))}</span><b>${esc(j.nome)}</b></div>`; };
  const md=d.md||{};
  return head+`
  <div class="kpis" style="margin-bottom:14px">
    <div class="kpi"><span>Microciclo</span><b>${esc(md.etiqueta||"–")}<small> ${md.falta===0?"jogo hoje":md.falta===1?"jogo amanhã":md.falta!=null?"jogo daqui a "+md.falta+" dias":""}${md.folga?" — folga":""}</small></b></div>
    <div class="kpi"><span>Prontidão média</span><b>${med==null?"–":med}<small> ${com.filter(j=>j.prontidao>=65).length} acima de 65</small></b></div>
    <div class="kpi"><span>Em risco / atenção</span><b>${cnt("RISCO")} / ${cnt("Atenção")}</b></div>
    <div class="kpi"><span>Pico de carga</span><b>${js.filter(j=>j.estadoCarga==="PICO DE CARGA").length}<small> patamar ${esc(d.limiarCarga||"")} UA${d.preEpoca?" (pré-época)":""}</small></b></div>
    <div class="kpi"><span>Sem resposta</span><b>${cnt("sem resposta")}<small> de ${js.length}</small></b></div>
    <div class="kpi"><span>ACWR</span><b style="font-size:17px">${d.acwrFiavel?"Fiável":"Ainda não"}<small> ${esc(d.diasHist||0)} dias de histórico</small></b></div>
  </div>
  ${miss.length?`<p class="note" style="margin:0 0 10px">Sem ligação ao plantel da app: <b>${miss.map(esc).join(", ")}</b>. <button class="lnk" style="text-decoration:underline" data-a="monCfg">Escolher o atleta</button></p>`:""}
  <div class="chips" style="margin-bottom:10px">${[["","Todos ("+js.length+")"],["al","Com alerta"],["ind","Indisponíveis/condicionados"],["gr","Guarda-redes"]].map(([k2,l])=>`<button class="chip ${flt===k2?"on":""}" data-a="monF" data-k="${k2}">${l}</button>`).join("")}</div>
  <section class="card"><div class="tscroll"><table class="tb mon"><thead><tr>${cols.map(([ck,l],i)=>`<th class="${i===0?"l stk":""}">${ck?`<button data-a="monSort" data-k="${ck}" class="${k===ck?"on":""}">${l}${k===ck?(dir>0?" ↑":" ↓"):""}</button>`:l}</th>`).join("")}</tr></thead><tbody>
  ${rows.map(j=>`<tr><td class="l stk">${nm(j)}</td>
    <td><span class="small">${esc(j.estado||"")}</span></td>
    <td title="${esc(j.prontidaoPorque||"")}">${monScore(j.prontidao)}<div class="small muted">${esc(j.prontidao==null?j.prontidaoPorque:j.faixa||"")}</div></td>
    <td title="${esc(j.condicaoPorque||"")}">${j.condicao==null?`<span class="small muted">${esc(j.condicaoPorque||"–")}</span>`:monScore(j.condicao)}</td>
    <td title="${esc(j.confiancaPorque||"")}"><span class="tag ${j.confianca==="Alta"?"ok":j.confianca==="Média"?"warn":"bad"}">${esc(j.confianca||"–")}</span></td>
    <td class="num">${n2(j.bem3)}</td><td class="num">${j.z==null?"–":(j.z>0?"+":"")+n2(j.z)}</td><td class="small">${esc(j.critico||"")}</td>
    <td class="num ${j.cargaAlta?"hot":""}">${j.carga7==null?"–":Math.round(j.carga7)}</td><td class="num">${n2(j.acwr)}</td><td class="num">${n2(j.monotonia)}</td>
    <td>${monTag(j.estadoBem)}</td><td>${monTag(j.estadoCarga)}</td>
    <td>${spark(j.serieBem||[])}</td><td>${spark(j.serieCarga||[],{bars:true,folga:d.folga})}</td>
    <td class="small" style="min-width:260px;text-align:left;white-space:normal">${esc(j.leitura)}${j.folga?`<br><span class="muted">${esc(j.folga)}</span>`:""}</td></tr>`).join("")}
  </tbody></table></div></section>
  <p class="note">Dados calculados no Google Sheets "Estrela B - Painel" (bem-estar de 1 a 5, carga = duração × PSE). Prontidão e condição de 0 a 100: 80+ excelente, 65+ bom, 50+ aceitável, 35+ baixo. Passa o dedo/rato pela prontidão, condição e confiança para veres o porquê. Toca num cabeçalho para ordenar.</p>`;
}

/* ---- ficha do atleta ---- */
function monAth(pid){
  const j=monOf(pid); if(!j) return "";
  const d=MON.data;
  return `<section class="card"><div class="card-h"><h3>Monitorização</h3><span class="sub">${esc(d.md&&d.md.etiqueta||"")} — ${esc(monAge())}</span></div><div class="card-b">
    <div class="mkpis">
      <div><span>Prontidão</span>${monScore(j.prontidao,true)}<small class="muted">${esc(j.prontidao==null?j.prontidaoPorque:j.faixa||"")}</small></div>
      <div><span>Condição</span>${j.condicao==null?`<small class="muted">${esc(j.condicaoPorque||"–")}</small>`:monScore(j.condicao,true)}</div>
      <div><span>Bem-estar 3d</span><b>${n2(j.bem3)}</b><small class="muted">base ${n2(j.base)}</small></div>
      <div><span>Carga 7d</span><b>${j.carga7==null?"–":Math.round(j.carga7)}</b><small class="muted">ACWR ${n2(j.acwr)}</small></div></div>
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;align-items:flex-end"><div><div class="small muted">Bem-estar</div>${spark(j.serieBem||[],{w:180,h:40})}</div><div><div class="small muted">Carga diária</div>${spark(j.serieCarga||[],{bars:true,w:180,h:40,folga:d.folga})}</div>
      <div>${monTag(j.estadoBem)} ${monTag(j.estadoCarga)} <span class="tag ${j.confianca==="Alta"?"ok":j.confianca==="Média"?"warn":"bad"}">Confiança ${esc((j.confianca||"").toLowerCase())}</span></div></div>
    <p class="note" style="margin-top:10px"><b>${esc(j.leitura)}</b>${j.critico?` Item mais baixo: ${esc(j.critico)}.`:""}${j.folga?` ${esc(cap1(j.folga))}.`:""}</p>
  </div></section>`;
}
const monChip = pid => { const j=MON.data?monOf(pid):null; return j&&j.prontidao!=null?`<span class="mchip" style="background:${monCol(j.prontidao)}" title="Prontidão ${esc(j.prontidao)} — ${esc(j.faixa||"")}">${esc(j.prontidao)}</span>`:""; };

/* ---- ligação ---- */
function monCfgForm(){
  const c=monCfg(), {map,miss}=monMatch();
  const names=MON.data?MON.data.jogadores.map(j=>j.nome).sort((a,b)=>a.localeCompare(b)):[];
  const opts=[{v:"",l:"— não ligar —"},...players().map(p=>({v:p.id,l:p.name}))];
  const body=`<p class="small muted" style="margin:0 0 12px">Endereço da aplicação Web publicada no Apps Script do ficheiro "Estrela B - Painel" (Implementar → Aplicação Web; termina em <b>/exec</b>) e a chave definida no script (CHAVE_APP).</p>
    <div class="form"><label class="fld full">Endereço (URL)<input name="url" value="${esc(c.url||"")}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"></label>
      <label class="fld full">Chave<input name="key" value="${esc(c.key||"")}" autocomplete="off"></label></div>
    ${names.length?`<div class="asec" style="margin-top:16px"><span>Nomes da folha → atletas da app</span></div>
      <p class="small muted" style="margin:0 0 6px">Os nomes iguais ligam-se sozinhos. Corrige só os que estiverem mal ou em falta.</p>
      ${names.map((n,i)=>`<div class="monmap"><span>${esc(n)}${miss.includes(n)?` <span class="tag warn">sem ligação</span>`:""}</span>${sel("m_"+i,opts,map[n]||"",`data-n="${esc(n)}"`)}</div>`).join("")}`:""}`;
  modal({title:"Ligação ao Google Sheets",big:!!names.length,body,foot:`${c.url?`<button class="btn ghost" data-a="mDel">Desligar</button>`:"<span></span>"}<span class="right"><button class="btn" data-a="mClose">Cancelar</button><button class="btn primary" data-a="mSave">Guardar e atualizar</button></span>`,ctx:{
    save:()=>{ const url=fv("url"); if(url && !/^https:\/\//.test(url)){ toast("O endereço tem de começar por https://"); return; }
      const m={...(c.map||{})};
      $$("#dlg .monmap select").forEach(s=>{ const n=s.dataset.n, auto=monMatch().map[n]||""; if(s.value!==auto || n in m) m[n]=s.value; });
      put("meta","cfg",{...clone(cfg()),mon:{url,key:fv("key"),map:m}}); closeModal(); MON.at=null; if(url) monFetch(true); else toast("Guardado"); },
    del:()=>askConfirm("Desligar o Google Sheets? Os dados da monitorização deixam de aparecer na app.","Desligar",true).then(ok=>{ if(!ok) return;
      put("meta","cfg",{...clone(cfg()),mon:{}}); MON.data=null; MON.at=null; MON.err=""; try{ localStorage.removeItem(MON_LS); }catch(e){} closeModal(); })
  }});
}
