/* ================= quem alterou (dispositivo + pessoa) ================= */
// O browser não tem acesso ao nome do computador ("MacBook Pro de Alexandre"): cada dispositivo identifica-se uma vez
// (pessoa + nome do dispositivo, guardado só neste browser) e cada put() feito aqui grava _by (esse nome) e _at (hora).
// O que chega de outros dispositivos (partilha/base de dados) já vem com o carimbo de quem o fez.
// Alterações automáticas (atualizações de dados, limpeza de repetidos) não mudam o carimbo (NOSTAMP).
const ME_LS = LS+":eu";
function meGet(){ try{ return JSON.parse(localStorage.getItem(ME_LS)||"null")||{}; }catch(e){ return {}; } }
function devGuess(){
  const ua=navigator.userAgent||"", tp=navigator.maxTouchPoints||0;
  if(/iPad/.test(ua)||(/Macintosh/.test(ua)&&tp>1)) return "iPad";
  if(/iPhone/.test(ua)) return "iPhone";
  if(/Android/.test(ua)) return /Mobile/.test(ua)?"Telemóvel Android":"Tablet Android";
  if(/Macintosh|Mac OS/.test(ua)) return "Mac";
  if(/Windows/.test(ua)) return "PC Windows";
  return "Computador";
}
const firstName = n => String(n||"").trim().split(/\s+/)[0]||"";
// "MacBook Pro de Alexandre"; sem pessoa: só o dispositivo; nunca identificado: "Mac (sem nome)"
function meLabel(){ const m=meGet(), d=(m.disp||"").trim(), n=firstName(m.nome);
  return d&&n ? `${d} de ${n}` : d || (n ? `${devGuess()} de ${n}` : `${devGuess()} (sem nome)`); }
function stamp(obj){ obj._by=meLabel(); obj._at=new Date().toISOString(); }

function ago(iso){
  const t=new Date(iso); if(isNaN(t)) return "";
  const s=(Date.now()-t)/1000, hm=t.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"}), day=isoOf(t);
  if(s<60) return "agora mesmo";
  if(s<3600) return `há ${Math.round(s/60)} min`;
  if(day===todayISO()) return `hoje, ${hm}`;
  if(day===addDays(todayISO(),-1)) return `ontem, ${hm}`;
  return `${t.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}, ${hm}`;
}
const edLine = doc => doc&&doc._by ? `<p class="small muted edby">Última alteração: <b>${esc(doc._by)}</b>${doc._at?` · ${esc(ago(doc._at))}`:""}</p>` : "";

/* ---- identificar este dispositivo ---- */
function meForm(){
  const m=meGet(), names=staff().map(s=>s.name);
  modal({title:"Quem está a usar este dispositivo?",sub:"Fica guardado só neste browser. As alterações feitas aqui passam a mostrar este nome.",
    body:`<div class="form">
      <label class="fld">A tua pessoa<input name="nome" list="meNames" value="${esc(m.nome||"")}" placeholder="ex.: Alexandre Lopes" autocomplete="off"><datalist id="meNames">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist></label>
      <label class="fld">Nome do dispositivo<input name="disp" value="${esc(m.disp||"")}" placeholder="ex.: MacBook Pro, iPad da equipa (${esc(devGuess())})"></label>
    </div><p class="small muted" style="margin:10px 0 0">Vai aparecer como: <b id="mePrev">${esc(meLabel())}</b></p>`,
    foot:`<span></span><span class="right"><button class="btn" data-a="mClose">Cancelar</button><button class="btn primary" data-a="mSave">Guardar</button></span>`,
    ctx:{save:()=>{
      const f=$("#dlg"), nome=f.querySelector("[name=nome]").value.trim(), disp=f.querySelector("[name=disp]").value.trim();
      if(!nome&&!disp) return toast("Escreve pelo menos o teu nome ou o nome do dispositivo.");
      try{ localStorage.setItem(ME_LS,JSON.stringify({nome,disp})); }catch(e){}
      closeModal(); VER++; render(); toast(`As alterações deste dispositivo vão aparecer como “${meLabel()}”.`);
    }}});
  const upd=()=>{ const f=$("#dlg"); if(!f) return; const n=firstName(f.querySelector("[name=nome]").value), d=f.querySelector("[name=disp]").value.trim(); const p=$("#mePrev"); if(p) p.textContent=d&&n?`${d} de ${n}`:d||(n?`${devGuess()} de ${n}`:`${devGuess()} (sem nome)`); };
  $("#dlg").querySelectorAll("input").forEach(i=>i.addEventListener("input",upd));
}
const meBanner = () => meGet().nome||meGet().disp ? "" : `<button class="alert warn" data-a="meCfg"><i></i><span class="main"><b>Identifica este dispositivo</b><small>Para se saber quem fez cada alteração (ex.: “MacBook Pro de Alexandre”).</small></span></button>`;

/* ---- últimas alterações (todas as coleções, pelo carimbo) ---- */
const WHO_COL = {events:null,players:"Atleta",injuries:"Lesão",exercises:"Exercício",cycles:"Ciclo",principles:"Princípio",staff:"Equipa técnica",opponents:"Adversário",setpieces:"Bola parada",tactics:"Esquema tático",tests:"Testes físicos",evals:"Avaliação",scout:"Scouting",statdefs:"Estatística"};
function whoItems(){
  const out=[];
  Object.keys(WHO_COL).forEach(c=>Object.entries(D[c]||{}).forEach(([id,x])=>{ if(!x||!x._at) return;
    let what, pg=null;
    if(c==="events"){ what=x.type==="jogo"?`Jogo ${x.venue==="F"?"@ ":"vs "}${x.opp||""}`:`Treino${x.theme?" — "+x.theme:""}`; what+=x.date?` (${fmtD(x.date,{day:"2-digit",month:"2-digit"})})`:""; pg=x.type==="jogo"?"jogo":"treino"; }
    else { const nm=x.name||x.label||(c==="injuries"||c==="evals"?pname(x.pid):"")||(x.date?fmtD(x.date):""); what=`${WHO_COL[c]}${nm?": "+nm:""}`;
      pg={players:"atleta",opponents:"adversario",scout:"alvo"}[c]||null; if(c==="injuries"||c==="evals"){ if(D.players[x.pid]){ pg="atleta"; id=x.pid; } } }
    out.push({at:x._at,by:x._by||"",what,pg,id});
  }));
  return out.sort((a,b)=>a.at<b.at?1:-1);
}
function vWho(){
  const all=whoItems(), f=S.whoBy||"", by=[...new Set(all.map(x=>x.by))].filter(Boolean), list=(f?all.filter(x=>x.by===f):all).slice(0,40);
  return `<section class="card" style="margin-top:14px"><div class="card-h"><h3>Últimas alterações</h3><button class="btn sm" data-a="meCfg">Este dispositivo</button></div>
    <p class="small muted" style="margin:8px 14px 0">As alterações feitas aqui aparecem como <b>${esc(meLabel())}</b>.</p>
    ${by.length>1?`<div class="chips" style="padding:10px 14px 0"><button class="chip ${!f?"on":""}" data-a="whoBy" data-k="">Todos</button>${by.map(b=>`<button class="chip ${f===b?"on":""}" data-a="whoBy" data-k="${esc(b)}">${esc(b)}</button>`).join("")}</div>`:""}
    <div class="list">${list.length?list.map(x=>{ const inner=`<span class="main"><b>${esc(x.what)}</b><small>${esc(x.by||"—")} · ${esc(ago(x.at))}</small></span>`;
      return x.pg&&x.id?`<button class="li" data-a="page" data-p="${x.pg}" data-id="${esc(x.id)}">${inner}</button>`:`<div class="li">${inner}</div>`; }).join("")
      :`<div class="empty"><b>Ainda sem alterações registadas</b>A partir de agora, cada alteração fica com o nome do dispositivo que a fez.</div>`}</div></section>`;
}
Object.assign(A,{
  meCfg: () => meForm(),
  whoBy: el => { S.whoBy=el.dataset.k; render(); }
});
