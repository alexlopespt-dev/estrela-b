/* ================= modo pós-jogo ================= */
const RATES = [4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10];
let Q = null;
function openQuick(gid){
  const g=D.events[gid]; if(!g||g.type!=="jogo") return;
  const c=gameCalc(g), sel={}, draft={};
  players().forEach(p=>{
    const x=c.res[p.id], st=(g.xi||[]).includes(p.id);
    if(st) sel[p.id]="T"; else if(x&&x.min>0) sel[p.id]="S";
    draft[p.id]={r:parseNum((g.rt||{})[p.id]), min:x&&x.min?x.min:(st?90:""), g:x?x.g:0, a:x?x.a:0, y:x?x.y:0, rc:x?x.r:0};
  });
  Q={gid,step:"sel",sel,draft,idx:0};
  drawQuick();
}
const qList = () => players().filter(p=>Q.sel[p.id]).sort((a,b)=>(Q.sel[a.id]==="T"?0:1)-(Q.sel[b.id]==="T"?0:1)||BYPOS(a,b));
function qDraft(pid){ const d=Q.draft[pid]||(Q.draft[pid]={r:null,min:"",g:0,a:0,y:0,rc:0}); return d; }
function qRead(){
  if(!Q||Q.step!=="p") return; const p=qList()[Q.idx]; if(!p) return; const d=qDraft(p.id);
  const r=$("#qRate"); if(r){ const v=parseNum(r.value); d.r = v==null?null:Math.max(0,Math.min(10,Math.round(v*10)/10)); }
  const m=$("#qMin"); if(m){ const v=parseNum(m.value); d.min = v==null?"":Math.max(0,Math.round(v)); }
}
function quickEvents(d){
  let h="";
  const rep=(n,ic)=>{ if(!n) return; h+=ic+(n>1?`<span class="xn">×${n}</span>`:""); };
  rep(d.g,I_BALL); rep(d.a,I_AST);
  if(d.y) h+=`<span class="card-y"></span>`+(d.y>1?`<span class="card-y"></span>`:"");
  if(d.rc) h+=`<span class="card-r"></span>`;
  return h;
}
function drawQuick(){
  const g=D.events[Q.gid]||{}, dl=$("#dlg");
  const opp=g.opp?`${g.venue==="F"?"@ ":"vs "}${esc(g.opp)}`:"jogo";
  const X=`<button class="x" data-a="qExit" aria-label="Sair">✕</button>`;
  const head=(t,s)=>`<div class="dlg-h"><img class="crest-sm" src="${CREST}" alt="" style="width:34px;flex:none"><div style="flex:1;min-width:0"><h3>${t}</h3><p>${s}</p></div>${X}</div>`;
  let body="";
  if(Q.step==="sel"){
    const tiles=k=>players().filter(p=>GROUP(p.pos)===k).map(p=>{ const s=Q.sel[p.id]||"", av=avail(p.id);
      return `<button class="tile ${s==="T"?"xi":s==="S"?"on":"off"}" data-a="qSel" data-p="${esc(p.id)}">${av!=="ok"?`<span class="flag ${av==="cond"?"cond":""}"></span>`:""}${avatar(p)}<b>${esc(p.name)}</b><span class="st">${s==="T"?"Titular":s==="S"?"Suplente":"Não jogou"}</span></button>`; }).join("");
    const nT=Object.values(Q.sel).filter(x=>x==="T").length, nS=Object.values(Q.sel).filter(x=>x==="S").length;
    body=head(`Pós-jogo — ${opp}`,"Passo 1 de 3 — quem jogou? Toca uma vez para titular, outra para suplente, outra para limpar.")+
      `<div class="dlg-b">${["GR","DEF","MED","ATA","X"].map(k=>{ const t=tiles(k); return t?`<div class="gsec">${GNAME[k]}</div><div class="tiles">${t}</div>`:""; }).join("")}</div>
      <div class="dlg-f"><button class="btn ghost" data-a="qExit">Sair</button><span class="right"><span class="small muted" style="align-self:center"><b>${nT}</b> titulares — <b>${nS}</b> suplentes</span><button class="btn primary" data-a="qStart" ${nT+nS?"":"disabled"}>Dar notas</button></span></div>`;
  } else if(Q.step==="p"){
    const list=qList(), p=list[Q.idx], d=qDraft(p.id), st=Q.sel[p.id]==="T";
    const mins=st?[90,85,80,75,70,65,60,45]:[45,30,25,20,15,10,5];
    const step=(k,l,max)=>`<div class="stepper"><span>${l}</span><span class="ctl"><button data-a="qDec" data-k="${k}">−</button><output>${d[k]||0}</output><button data-a="qInc" data-k="${k}" data-max="${max}">+</button></span></div>`;
    body=`<div class="dlg-h">${avatar(p)}<div style="flex:1;min-width:0"><h3>${esc(p.name)}</h3><p>${esc(p.pos||"")} — ${Q.idx+1} de ${list.length}</p><div class="qprog"><i style="width:${(Q.idx+1)/list.length*100}%"></i></div></div>${X}</div>
      <div class="dlg-b">
        <div class="qlbl"><span>Nota</span><span class="fine"><button class="btn sm ghost" data-a="qFine" data-n="-0.1">−0.1</button><input id="qRate" inputmode="decimal" value="${d.r!=null?fmt1(d.r):""}" placeholder="–"><button class="btn sm ghost" data-a="qFine" data-n="0.1">+0.1</button></span></div>
        <div class="rates">${RATES.map(v=>`<button data-a="qRate" data-n="${v}" class="${d.r===v?"on "+rc(v):""}">${Number.isInteger(v)?v:v.toFixed(1)}</button>`).join("")}</div>
        <div class="seg" style="width:100%;margin-top:14px"><button data-a="qSt" data-k="T" class="${st?"on":""}" style="flex:1">Titular</button><button data-a="qSt" data-k="S" class="${st?"":"on"}" style="flex:1">Suplente</button></div>
        <div class="qlbl" style="margin-top:14px"><span>Minutos</span></div>
        <div class="mins">${mins.map(m=>`<button data-a="qMin" data-n="${m}" class="${+d.min===m?"on":""}">${m}'</button>`).join("")}<span class="small muted" style="align-self:center;margin-left:4px">ou</span><input id="qMin" inputmode="numeric" value="${esc(d.min??"")}" placeholder="min" aria-label="Outros minutos"></div>
        <div class="qstats">${step("g","Golos",9)}${step("a","Assistências",9)}${step("y","Amarelos",2)}${step("rc","Vermelho",1)}</div>
      </div>
      <div class="dlg-f"><button class="btn ghost" data-a="qPrev">${Q.idx?"Anterior":"Voltar à lista"}</button><span class="right"><button class="btn primary" data-a="qNext">${Q.idx<list.length-1?"Seguinte":"Rever jogo"}</button></span></div>`;
  } else {
    const list=qList(), miss=list.filter(p=>qDraft(p.id).r==null).length;
    const rows=list.map((p,i)=>{ const d=qDraft(p.id);
      return `<button class="li" data-a="qGo" data-i="${i}">${avatar(p)}<span class="main"><b>${esc(p.name)}</b><small><span class="pos">${esc(p.pos||"")}</span>${d.min?esc(d.min)+"'":""}${Q.sel[p.id]==="T"?"":" — suplente"}</small></span><span class="evq">${quickEvents(d)}</span>${badge(d.r)}</button>`; }).join("");
    body=head(`Rever — ${opp}`,"Passo 3 de 3 — toca num jogador para corrigir.")+
      `<div class="dlg-b" style="padding:0">${miss?`<p class="note" style="padding:12px 18px 0;color:var(--r6);font-weight:600">${miss} jogador${miss>1?"es":""} sem nota.</p>`:""}<div class="list">${rows}</div></div>
      <div class="dlg-f"><button class="btn ghost" data-a="qBack">Anterior</button><span class="right"><button class="btn gold" data-a="qSave">Guardar jogo</button></span></div>`;
  }
  dl.className="big"; dl.innerHTML=body;
  M={q:true,dirty:M&&M.q?M.dirty:false,save:quickSave};
  if(!dl.open) dl.showModal();
  const b=dl.querySelector(".dlg-b"); if(b) b.scrollTop=0;
}
function syncCount(ev,pid,t,n){
  const cur=ev.filter(e=>e.t===t&&e.pid===pid);
  if(cur.length===n) return ev;
  if(cur.length<n){ for(let i=cur.length;i<n;i++) ev.push({id:uid("e"),t,min:null,pid}); return ev; }
  const rm=cur.slice().sort((a,b)=>(parseNum(a.min)==null?0:1)-(parseNum(b.min)==null?0:1)).slice(0,cur.length-n).map(e=>e.id);
  return ev.filter(e=>!rm.includes(e.id) && !(e.t==="assist"&&rm.includes(e.of)));
}
function quickSave(){
  qRead();
  const g=clone(D.events[Q.gid]); if(!g){ closeModal(); Q=null; return; }
  const list=qList(), ids=list.map(p=>p.id);
  const call=new Set(g.call||[]); ids.forEach(id=>call.add(id));
  g.call=[...call]; g.xi=ids.filter(id=>Q.sel[id]==="T");
  g.rt=g.rt||{}; g.minOv=g.minOv||{}; let ev=(g.ev||[]).slice();
  players().forEach(p=>{
    const pid=p.id, on=!!Q.sel[pid], d=qDraft(pid);
    if(!on){ delete g.minOv[pid]; return; }
    if(d.r!=null) g.rt[pid]=d.r; else delete g.rt[pid];
    if(d.min!==""&&d.min!=null) g.minOv[pid]=+d.min; else delete g.minOv[pid];
    ev=syncCount(ev,pid,"golo",+d.g||0); ev=syncCount(ev,pid,"assist",+d.a||0);
    ev=syncCount(ev,pid,"amarelo",+d.y||0); ev=syncCount(ev,pid,"vermelho",+d.rc||0);
  });
  g.ev=ev; put("events",Q.gid,g); closeModal(); Q=null; toast("Jogo guardado");
}
function quickExit(){
  if(!M||!M.dirty){ closeModal(); Q=null; return; }
  askConfirm("Sair sem guardar? As notas que lançaste agora perdem-se.","Sair sem guardar",true).then(ok=>{ if(ok){ closeModal(); Q=null; } });
}

/* ================= grelha da época ================= */
function vGrid(){
  const t=todayISO(), gs=games().filter(g=>g.date<=t||(g.call||[]).length);
  if(!gs.length) return `<div class="empty"><b>Ainda não há jogos</b>A grelha mostra a nota de cada atleta em cada jornada.</div>`;
  const calcs={}; gs.forEach(g=>calcs[g.id]=gameCalc(g));
  const best={}; gs.forEach(g=>{ const rs=Object.entries(g.rt||{}).map(([pid,r])=>[pid,parseNum(r)]).filter(([,r])=>r!=null);
    const mx=rs.length?Math.max(...rs.map(x=>x[1])):null; best[g.id]=rs.filter(x=>x[1]===mx).map(x=>x[0]); });
  const st=stats();
  const rows=players().map(p=>({p,s:st.pl[p.id]})).sort((a,b)=>(b.s.avg??-1)-(a.s.avg??-1)||b.s.min-a.s.min);
  const label=g=>{ const m=String(g.phase||"").match(/(\d+)/); return m?"J"+m[1]:fmtD(g.date,{day:"2-digit",month:"2-digit"}); };
  return `<section class="card"><div class="tscroll"><table class="tb"><thead><tr><th class="l stk">Atleta</th>
    ${gs.map(g=>`<th><button class="lnk" data-a="page" data-p="jogo" data-id="${esc(g.id)}" title="${esc((g.opp||"")+" — "+fmtD(g.date))}">${esc(label(g))}</button></th>`).join("")}
    <th>J</th><th>Min</th><th>G</th><th>A</th><th class="stkr">Média</th></tr></thead><tbody>
    ${rows.map(({p,s},i)=>`<tr><td class="l stk"><button class="lnk pin" data-a="page" data-p="atleta" data-id="${esc(p.id)}"><span class="rank">${i+1}</span>${avatar(p)}<b>${esc(p.name)}</b></button></td>
      ${gs.map(g=>{ const r=parseNum((g.rt||{})[p.id]); const x=calcs[g.id].res[p.id];
        return `<td>${r!=null?`<button class="lnk" data-a="page" data-p="jogo" data-id="${esc(g.id)}"><span class="rt ${rc(r)} ${best[g.id].includes(p.id)?"best":""}" style="min-width:34px;height:22px;font-size:13px">${fmt1(r)}</span></button>`:`<span class="muted">${x&&(x.st||x.min>0)?"·":""}</span>`}</td>`; }).join("")}
      <td class="num">${s.j}</td><td class="num">${s.min}</td><td class="num">${s.g||"–"}</td><td class="num">${s.a||"–"}</td><td class="stkr">${badge(s.avg)}</td></tr>`).join("")}
    </tbody></table></div></section>
    <p class="note">Ordenado pela média da época. A estrela marca a melhor nota de cada jogo. Toca numa nota para abrir a ficha de jogo.</p>`;
}

/* ================= importar da app de ratings ================= */
async function importRatings(d){
  const map={}, byName={};
  allPlayers().forEach(p=>byName[String(p.name).trim().toLowerCase()]=p.id);
  let novos=0;
  (d.players||[]).forEach(rp=>{
    const key=String(rp.name||"").trim().toLowerCase();
    if(D.players[rp.id]) map[rp.id]=rp.id;
    else if(byName[key]) map[rp.id]=byName[key];
    else { const nid=uid("p_"); const o={n:parseNum(rp.n),name:rp.name||"Sem nome",pos:rp.pos||"MC",photo:null};
      const ph=(d.photos||{})[rp.id]; if(ph) o.photoData=ph;
      put("players",nid,o); map[rp.id]=nid; novos++; }
  });
  const rounds=Object.entries(d.rounds||{}).filter(([,r])=>r && Object.keys(r.p||{}).length)
    .sort((a,b)=>(+a[0].replace(/\D/g,"")||0)-(+b[0].replace(/\D/g,"")||0));
  let criados=0, atualizados=0;
  rounds.forEach(([key,r])=>{
    const n=+key.replace(/\D/g,"")||0, phase=n?`Jornada ${n}`:"";
    let gid=games().find(g=>validISO(r.date)&&g.date===r.date)?.id
         || games().find(g=>phase&&String(g.phase)===phase&&(!r.comp||g.comp===r.comp))?.id;
    const base=gid?clone(D.events[gid]):{type:"jogo",dur:90,call:[],xi:[],ev:[],rt:{},minOv:{},ga:null,closed:false,notes:""};
    if(gid) atualizados++; else { gid=uid("jg_"); criados++; }
    base.date=validISO(r.date)?r.date:(base.date||todayISO());
    base.opp=r.opp||base.opp||""; base.comp=r.comp||base.comp||""; base.phase=base.phase||phase; base.venue=r.venue==="F"?"F":"C";
    if(r.ga!=null&&r.ga!=="") base.ga=+r.ga;
    base.call=base.call||[]; base.rt=base.rt||{}; base.minOv=base.minOv||{}; let ev=(base.ev||[]).slice();
    const call=new Set(base.call), xi=new Set(base.xi||[]);
    Object.entries(r.p||{}).forEach(([rpid,e])=>{
      const pid=map[rpid]; if(!pid) return;
      call.add(pid); if(e.st) xi.add(pid); else xi.delete(pid);
      if(e.r!=null) base.rt[pid]=e.r;
      if(e.min!=null&&e.min!=="") base.minOv[pid]=+e.min;
      ev=syncCount(ev,pid,"golo",+e.g||0); ev=syncCount(ev,pid,"assist",+e.a||0);
      ev=syncCount(ev,pid,"amarelo",+e.y||0); ev=syncCount(ev,pid,"vermelho",+e.rc||0);
    });
    base.call=[...call]; base.xi=[...xi]; base.ev=ev;
    put("events",gid,base);
  });
  if((d.team||d.season) && !meta().team) put("meta","team",{team:d.team||"",season:d.season||"",comp:""});
  toast(`Importado: ${criados} jogos novos, ${atualizados} atualizados${novos?`, ${novos} atletas novos`:""}.`);
}
