/* ================= ESTADO DA APP =================
   Um só ecrã para ver se está tudo a funcionar neste dispositivo: versão, partilha, monitorização, app do atleta,
   espaço no browser e os dados. Cada linha tem o estado (ok / atenção / problema), o que quer dizer e o botão para resolver.
   "Copiar relatório" junta tudo num texto para mandar a quem dá apoio. */
const EST_LIM = 5*1024*1024;   // o Safari (iPhone/iPad) dá ~5 MB ao localStorage de cada site
function estLsBytes(){ let n=0; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i)||""; n+=(k.length+(localStorage.getItem(k)||"").length)*2; } }catch(e){} return n; }
const estMB = b => (b/1048576).toFixed(b<1048576?2:1).replace(".",",")+" MB";
const estAgo = t => t ? ago(new Date(t).toISOString()) : "nunca";
function estItens(){
  const out=[], t=todayISO(), add=(sec,lvl,l,v,a)=>out.push({sec,lvl,l,v,a:a||""});
  // --- versão e dispositivo
  add("Esta app","ok","Versão",BUILD);
  add("Esta app","ok","Este dispositivo",typeof meLabel==="function"?meLabel():"—");
  add("Esta app",navigator.onLine===false?"bad":"ok","Rede",navigator.onLine===false?"Sem rede — as alterações ficam guardadas e seguem quando houver":"Com rede");
  if(MODE==="local"){ const b=estLsBytes(), p=b/EST_LIM;
    add("Esta app",p>.85?"bad":p>.65?"warn":"ok","Espaço no browser",`${estMB(b)} de ~5 MB (${Math.round(p*100)}%)${p>.65?" — exporta uma cópia e apaga fotos grandes":""}`); }
  // --- partilha (versão Netlify)
  if(MODE==="local"){
    if(!syncOn()) add("Partilha com a equipa técnica","warn","Ligação","Não está ligada: o que fazes aqui só fica neste dispositivo",`<button class="btn sm" data-a="syncCfg">Ligar</button>`);
    else { const g=SYNC.diag, n=syncN();
      add("Partilha com a equipa técnica",SYNC.err?"bad":"ok","Ligação",SYNC.err?SYNC.err:SYNC.at?`Última sincronização ${estAgo(SYNC.at)}`:"Ligada (ainda sem sincronizar nesta sessão)",`<button class="btn sm" data-a="estSync">Sincronizar agora</button>`);
      add("Partilha com a equipa técnica",n>20?"bad":n?"warn":"ok","Por enviar",n?`${plural(n,"alteração","alterações")} ainda não chegaram ao Sheets`:"Nada por enviar");
      if(g.push) add("Partilha com a equipa técnica",g.push.ms>20000?"warn":"ok","Último envio",`${(g.push.ms/1000).toFixed(1).replace(".",",")} s — ${plural(g.push.n,"registo")} ${estAgo(g.push.at)}`);
      if(g.pull) add("Partilha com a equipa técnica",g.pull.ms>20000?"warn":"ok","Última receção",`${(g.pull.ms/1000).toFixed(1).replace(".",",")} s — ${plural(g.pull.n,"registo")} ${estAgo(g.pull.at)}`);
      if(g.jsonp) add("Partilha com a equipa técnica","warn","Leitura direta bloqueada",`${g.jsonp}× — a app usa o caminho alternativo (mais lento). Bloqueador de anúncios?`);
      if(g.pushErr) add("Partilha com a equipa técnica","bad","Último erro ao enviar",`${g.pushErr.m} (${estAgo(g.pushErr.at)})`);
    }
  }
  // --- monitorização
  const mc=monCfg();
  if(!mc.url) add("Monitorização","warn","Ligação","Não está ligada ao Sheets da monitorização",`<button class="btn sm" data-a="monCfg">Ligar</button>`);
  else if(!MON.data) add("Monitorização",MON.err?"bad":"warn","Resumo",MON.err||"Ainda não foi lido neste dispositivo",`<button class="btn sm" data-a="monRefresh">Atualizar</button>`);
  else { const d=MON.data, at=d.atualizado?new Date(d.atualizado):null, h=at&&!isNaN(at)?(Date.now()-at)/36e5:null, {miss}=monMatch();
    add("Monitorização",MON.err?"bad":h!=null&&h>30?"warn":"ok","Resumo do Sheets",MON.err?MON.err:monAge(),`<button class="btn sm" data-a="monRefresh">Atualizar</button>`);
    add("Monitorização",d.diasAtraso>1?"warn":"ok","Respostas",d.diasAtraso>0?`Sem respostas novas há ${plural(d.diasAtraso,"dia")}`:`${plural((d.jogadores||[]).length,"atleta")} no resumo`);
    add("Monitorização",miss.length?"warn":"ok","Nomes",miss.length?`${plural(miss.length,"nome")} do Sheets sem atleta ligado: ${miss.slice(0,4).join(", ")}${miss.length>4?"…":""}`:"Todos os nomes ligados a um atleta",miss.length?`<button class="btn sm" data-a="monCfg">Ligar nomes</button>`:"");
  }
  // --- app do atleta (só Estrela)
  if(EDITION==="estrela"){
    const pls=players(), comLink=pls.filter(p=>p.atk).length, site=typeof atSite==="function"?atSite():"";
    add("App do atleta",site?"ok":"warn","Endereço do site",site||"Por definir (Plantel → App do atleta)",`<button class="btn sm" data-a="atLinks">Links</button>`);
    add("App do atleta",comLink<pls.length?"warn":"ok","Links pessoais",`${comLink} de ${pls.length} atletas com link`);
    const g=events().filter(e=>e.type==="jogo"&&!e.closed&&e.date>=t).sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||"")))[0];
    if(g){ const dias=dayDiff(t,g.date), call=(g.call||[]).length;
      add("App do atleta",!g.convPub&&call&&dias<=2?"warn":"ok","Convocatória do próximo jogo",`${g.venue==="F"?"@ ":"vs "}${g.opp||""} (${fmtD(g.date,{day:"numeric",month:"short"})}): ${!call?"ainda sem convocados":g.convPub?"publicada na app":"não publicada"}`); }
    if(syncOn()) add("App do atleta","ok","O que os atletas veem","Compara esta app com o que chega aos atletas",`<button class="btn sm" data-a="atDiag">Verificar</button>`);
  }
  // --- dados
  const tr=events().filter(e=>e.type==="treino"), jg=events().filter(e=>e.type==="jogo");
  const semPlano=tr.filter(e=>e.date<t&&e.date>=addDays(t,-14)&&!(e.plan||[]).length).length;
  const semPres=tr.filter(e=>e.date<t&&e.date>=addDays(t,-14)&&!Object.keys(e.att||{}).length).length;
  const porFechar=jg.filter(e=>e.date<t&&!e.closed).length;
  add("Dados","ok","Registos",`${plural(players().length,"atleta")} · ${plural(tr.length,"treino")} · ${plural(jg.length,"jogo")} · ${plural(Object.keys(D.exercises).length,"exercício")}`);
  add("Dados",semPres?"warn":"ok","Presenças (14 dias)",semPres?`${plural(semPres,"treino passado","treinos passados")} sem presenças marcadas`:"Todos os treinos com presenças");
  add("Dados",semPlano?"warn":"ok","Plano de treino (14 dias)",semPlano?`${plural(semPlano,"treino passado","treinos passados")} sem plano (não contam para os momentos do jogo)`:"Todos os treinos com plano");
  add("Dados",porFechar?"warn":"ok","Jogos",porFechar?`${plural(porFechar,"jogo passado","jogos passados")} por fechar (não contam para as estatísticas)`:"Todos os jogos passados fechados");
  return out;
}
const EST_C={ok:{c:"ok",l:"OK"},warn:{c:"warn",l:"Atenção"},bad:{c:"bad",l:"Problema"}};
function estadoForm(){
  const it=estItens(), secs=[...new Set(it.map(x=>x.sec))], nb=it.filter(x=>x.lvl==="bad").length, nw=it.filter(x=>x.lvl==="warn").length;
  const top=nb?["bad",`${plural(nb,"problema")}${nw?` e ${plural(nw,"aviso")}`:""}`]:nw?["warn",`Tudo a funcionar, com ${plural(nw,"aviso")}`]:["ok","Tudo a funcionar"];
  modal({title:"Estado da app",sub:`Versão de ${esc(BUILD)} · ${esc(new Date().toLocaleString("pt-PT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}`,big:true,
    body:`<div class="estop ${top[0]}" role="status"><i></i><b>${esc(top[1])}</b></div>
      ${secs.map(s=>`<section class="estsec"><h4>${esc(s)}</h4>${it.filter(x=>x.sec===s).map(x=>`<div class="estrow"><span class="estdot ${x.lvl}" aria-label="${EST_C[x.lvl].l}" title="${EST_C[x.lvl].l}"></span><span class="estl">${esc(x.l)}</span><span class="estv">${esc(x.v)}</span>${x.a?`<span class="esta">${x.a}</span>`:""}</div>`).join("")}</section>`).join("")}`,
    foot:`<button class="btn" data-a="estCopy">Copiar relatório</button><span class="right"><button class="btn" data-a="estAgain">Atualizar</button><button class="btn primary" data-a="mClose">Fechar</button></span>`});
}
function estTexto(){
  const it=estItens(); let s=`Estado da app — ${new Date().toLocaleString("pt-PT")}\n`, sec="";
  it.forEach(x=>{ if(x.sec!==sec){ sec=x.sec; s+=`\n[${sec}]\n`; } s+=`${x.lvl==="ok"?"✓":x.lvl==="warn"?"!":"✗"} ${x.l}: ${x.v}\n`; });
  return s;
}
Object.assign(A,{
  estado: () => estadoForm(),
  estAgain: () => estadoForm(),
  estSync: async () => { toast("A sincronizar…"); try{ await syncPush(); await syncPull(true); }catch(e){} if($("#dlg").open) estadoForm(); toast(SYNC.err||"Sincronizado"); },
  estCopy: async () => { const t=estTexto(); try{ await navigator.clipboard.writeText(t); toast("Relatório copiado — cola-o na mensagem"); }
    catch(e){ modal({title:"Relatório do estado da app",body:`<textarea class="inp" style="width:100%;min-height:280px;font:12px/1.4 monospace" readonly>${esc(t)}</textarea>`,foot:`<span></span><span class="right"><button class="btn primary" data-a="estado">Voltar</button></span>`}); } }
});
