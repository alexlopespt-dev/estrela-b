/* ================= versão para clubes: login e dados na Supabase ================= */
// Só entra no build "clubes" (build.py troca estrela.js por este ficheiro). Sem biblioteca externa: fetch direto às APIs
// da Supabase — Auth (/auth/v1), base de dados (/rest/v1, regras de acesso em supabase/migrations) e ficheiros (/storage/v1).
// O resto da app usa isto como a base de dados do artifact: db.collection(c).onSnapshot e db.doc("c/id").set|delete.
// Um clube novo começa vazio (sem jogadores inventados): só a configuração base (estatísticas de jogo, categorias).
const MIGR = [];   // sem atualizações próprias (as do Estrela estão em estrela.js)
const SB_URL = "__SBURL__", SB_KEY = "__SBKEY__";
const SB = { s:null, user:null, teams:[], team:null, role:null, gate:"loading", err:"", info:"", busy:false, started:false, people:null };
const SB_SES = LS+":sessao", SB_TEAM = LS+":equipa", SB_INV = LS+":convite";
const ROLE_L = {admin:"Administrador do clube",principal:"Treinador principal",adjunto:"Treinador adjunto",analista:"Analista",
  fisio:"Fisioterapeuta / médico",fisico:"Preparador físico",manager:"Team manager",leitura:"Só leitura"};
// configuração base de um clube novo (não são dados de jogadores)
const CLUBE_BASE = {
  statdefs:{sd01:{title:"Remates",code:"RM",neg:false,hl:true,order:1},sd02:{title:"Remates à baliza",code:"RB",neg:false,hl:true,order:2},
    sd03:{title:"Recuperações de bola",code:"REC",neg:false,hl:true,order:3},sd04:{title:"Perdas de bola",code:"PB",neg:true,hl:true,order:4},
    sd05:{title:"Duelos ganhos",code:"DG",neg:false,hl:true,order:5},sd06:{title:"Faltas cometidas",code:"FC",neg:true,hl:false,order:6},
    sd07:{title:"Defesas (GR)",code:"DEF",neg:false,hl:true,order:7}},
  exCats:["Aquecimento","Técnico","Tático","Físico","Jogo reduzido","Finalização","Guarda-redes","Bolas paradas","Lúdico","Retorno à calma"]
};
const sbName = () => { const u=SB.user||{}, md=u.user_metadata||{}, me=SB.team&&SB.team.me; return (me&&me.display_name)||md.name||u.email||"Conta"; };
const sbIsAdmin = () => SB.role==="admin";

/* ---- pedidos ---- */
const SB_ERR = [[/invalid login credentials/i,"Email ou palavra-passe errados."],
  [/email not confirmed/i,"Ainda não confirmaste o email. Abre o link que te enviámos (vê também o spam)."],
  [/already (been )?registered|user_already_exists/i,"Já existe uma conta com este email. Entra com a tua palavra-passe."],
  [/password.*(at least|characters|short|weak)|weak_password/i,"A palavra-passe tem de ter pelo menos 8 caracteres."],
  [/rate limit|too many|over_email_send_rate_limit/i,"Demasiadas tentativas. Espera um minuto e tenta de novo."],
  [/row-level security|permission denied|42501/i,"Não tens permissão para fazer isto."],
  [/link is invalid or has expired|otp_expired/i,"O link expirou ou já foi usado. Entra, ou pede outro."],
  [/jwt expired|invalid jwt|refresh token/i,"A sessão terminou. Entra outra vez."],
  [/Convite inválido/,"Convite inválido — confirma o link."],[/já foi usado/,"Este convite já foi usado."],[/expirou/,"O convite expirou — pede um novo."],
  [/para outro email/,"Este convite é para outro email: entra com a conta do email convidado."],
  [/sem administrador|último administrador|administrador/i,"A equipa tem de ficar com pelo menos um administrador."],
  [/Failed to fetch|NetworkError|Load failed|network/i,"Sem ligação à internet (ou o servidor não respondeu)."]];
function sbMsg(e){ const t=String((e&&e.message)||e||""); const m=SB_ERR.find(([r])=>r.test(t)); return m?m[1]:(t||"Algo correu mal."); }
async function sbAuth(path,body){
  const r=await fetch(SB_URL+"/auth/v1/"+path,{method:"POST",headers:{apikey:SB_KEY,"Content-Type":"application/json"},body:JSON.stringify(body||{})});
  const t=await r.text(); let j={}; try{ j=t?JSON.parse(t):{}; }catch(e){}
  if(!r.ok) throw new Error(j.msg||j.message||j.error_description||j.error_code||j.error||("HTTP "+r.status));
  return j;
}
function sbSave(){ try{ if(SB.s) localStorage.setItem(SB_SES,JSON.stringify(SB.s)); else localStorage.removeItem(SB_SES); }catch(e){} }
function sbSet(j){ SB.s={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:+j.expires_at||Math.floor(Date.now()/1000)+(+j.expires_in||3600)}; if(j.user) SB.user=j.user; sbSave(); }
function sbRefresh(){
  if(!SB.s||!SB.s.refresh_token) return Promise.reject(new Error("jwt expired"));
  if(!sbRefresh.p) sbRefresh.p=sbAuth("token?grant_type=refresh_token",{refresh_token:SB.s.refresh_token}).then(sbSet).finally(()=>{ sbRefresh.p=null; });
  return sbRefresh.p;
}
async function sbReq(path,{method="GET",body,headers={},raw=false,retry=true}={}){
  if(!SB.s) throw new Error("jwt expired");
  if(SB.s.expires_at-Date.now()/1000<60){ try{ await sbRefresh(); }catch(e){ sbLost(); throw e; } }
  const blob=typeof Blob!=="undefined"&&body instanceof Blob;
  const r=await fetch(SB_URL+path,{method,headers:{apikey:SB_KEY,Authorization:"Bearer "+SB.s.access_token,...(body!==undefined&&!blob?{"Content-Type":"application/json"}:{}),...headers},
    body:body===undefined?undefined:blob?body:JSON.stringify(body)});
  if(r.status===401&&retry){ try{ await sbRefresh(); }catch(e){ sbLost(); throw e; } return sbReq(path,{method,body,headers,raw,retry:false}); }
  if(raw&&r.ok) return r.blob();
  const t=await r.text(); let j=null; try{ j=t?JSON.parse(t):null; }catch(e){ j=t; }
  if(!r.ok) throw new Error((j&&(j.message||j.msg||j.error))||("HTTP "+r.status));
  return j;
}
const sbRpc = (fn,args) => sbReq("/rest/v1/rpc/"+fn,{method:"POST",body:args||{}});
function sbLost(){ SB.s=null; sbSave(); SB.gate="login"; SB.err="A sessão terminou. Entra outra vez."; sbGate(); }

/* ---- arranque: sessão, convite, equipa ---- */
let SB_GO; const sbReadyP=new Promise(r=>SB_GO=r);
function sbUse(n){ if(n==="db") return sbReadyP.then(()=>sbDb); if(n==="assets") return sbReadyP.then(()=>sbAssets); return Promise.resolve(null); }
async function sbBoot(){
  sbGate();
  const h=new URLSearchParams(location.hash.replace(/^#/,""));
  const inv=(String(h.get("convite")||"").match(/[0-9a-f-]{36}/i)||[])[0];
  if(inv){ try{ localStorage.setItem(SB_INV,inv); }catch(e){} SB.info="Tens um convite para entrar numa equipa. Entra (ou cria conta) com o email para onde foi enviado."; }
  let type=null;
  if(h.get("access_token")){ sbSet({access_token:h.get("access_token"),refresh_token:h.get("refresh_token"),expires_in:h.get("expires_in"),expires_at:h.get("expires_at")}); type=h.get("type"); }
  if(h.get("error_description")||h.get("error_code")) SB.err=sbMsg(h.get("error_code")+" "+h.get("error_description"));
  if(location.hash) try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
  if(!SB.s){ try{ SB.s=JSON.parse(localStorage.getItem(SB_SES)||"null"); }catch(e){} }
  if(!SB.s){ SB.gate="login"; return sbGate(); }
  try{ SB.user=await sbReq("/auth/v1/user"); }
  catch(e){ SB.s=null; sbSave(); SB.gate="login"; return sbGate(); }
  if(type==="recovery"){ SB.gate="newpass"; return sbGate(); }
  if(type==="signup") SB.info="Email confirmado. Bem-vindo!";
  await sbAfterLogin();
}
// link aberto com a app já aberta no mesmo separador (convite colado na barra, link do email): recomeça para o ler
window.addEventListener("hashchange",()=>{ if(/access_token|convite=|error_description/.test(location.hash)) location.reload(); });
async function sbAfterLogin(){
  SB.gate="loading"; sbGate();
  let inv=null; try{ inv=localStorage.getItem(SB_INV); }catch(e){}
  if(inv){
    try{ const t=await sbRpc("accept_invite",{p_token:inv}); try{ localStorage.setItem(SB_TEAM,t); }catch(e){} SB.info="Entraste na equipa."; }
    catch(e){ SB.err="Convite: "+sbMsg(e); }
    try{ localStorage.removeItem(SB_INV); }catch(e){}
  }
  try{ await sbTeams(); }catch(e){ SB.err=sbMsg(e); SB.gate="login"; return sbGate(); }
  if(!SB.teams.length){ SB.gate="club"; return sbGate(); }
  let pref=null; try{ pref=localStorage.getItem(SB_TEAM); }catch(e){}
  const t=SB.teams.find(x=>x.id===pref) || (SB.teams.length===1?SB.teams[0]:null);
  if(!t){ SB.gate="pick"; return sbGate(); }
  sbEnter(t);
}
async function sbTeams(){
  const r=await sbReq(`/rest/v1/members?select=*,teams(id,name,season,comp,club_id,clubs(name))&user_id=eq.${SB.user.id}`);
  SB.teams=(r||[]).filter(m=>m.teams).map(m=>({id:m.team_id,role:m.role,me:m,name:m.teams.name,season:m.teams.season,comp:m.teams.comp,club:(m.teams.clubs||{}).name||""}))
    .sort((a,b)=>(a.club+a.name).localeCompare(b.club+b.name,"pt"));
}
function sbEnter(t){
  if(SB.started){ try{ localStorage.setItem(SB_TEAM,t.id); }catch(e){} location.reload(); return; }   // mudar de equipa: recomeça limpo
  SB.team=t; SB.role=t.role; SB.started=true;
  try{ localStorage.setItem(SB_TEAM,t.id); }catch(e){}
  SB.gate=null; sbGate();
  if(SB.info){ toast(SB.info); SB.info=""; }
  SB_GO(); sbLoad();
}

/* ---- dados: documentos da equipa (tabela docs), receção de 15 em 15 s pela versão (v) ---- */
const SBD = {map:{}, lis:{}, maxV:0, ready:false, timer:null};
COLS.forEach(c=>SBD.map[c]={});
function sbEmit(c){ const docs=Object.entries(SBD.map[c]).map(([id,d])=>({id,data:()=>d})); (SBD.lis[c]||[]).forEach(l=>l.next({docs,size:docs.length})); }
async function sbPage(q){
  const out=[];
  for(let off=0;;off+=1000){
    const r=await sbReq(`/rest/v1/docs?select=col,id,data,v,deleted&team_id=eq.${SB.team.id}${q}&order=v.asc&limit=1000&offset=${off}`);
    out.push(...(r||[])); if(!r||r.length<1000) break;
  }
  return out;
}
function sbApply(r){ if(r.v>SBD.maxV) SBD.maxV=r.v; if(!COLS.includes(r.col)) return false; if(r.deleted) delete SBD.map[r.col][r.id]; else SBD.map[r.col][r.id]=r.data; return true; }
async function sbLoad(){
  try{ (await sbPage("&deleted=is.false")).forEach(sbApply); SBD.ready=true; COLS.forEach(sbEmit); }
  catch(e){ toast("Não foi possível carregar os dados: "+sbMsg(e)); COLS.forEach(c=>(SBD.lis[c]||[]).forEach(l=>l.err&&l.err(e))); setTimeout(sbLoad,15000); return; }
  clearInterval(SBD.timer); SBD.timer=setInterval(sbPoll,15000);
}
async function sbPoll(){
  if(!SBD.ready||sbPoll.on||document.hidden||!SB.s) return;
  sbPoll.on=true;
  try{ const ch=new Set(); (await sbPage(`&v=gt.${SBD.maxV}`)).forEach(r=>{ if(sbApply(r)) ch.add(r.col); }); ch.forEach(sbEmit); }
  catch(e){} finally{ sbPoll.on=false; }
}
document.addEventListener("visibilitychange",()=>{ if(!document.hidden) sbPoll(); });
window.addEventListener("online",()=>sbPoll());
const sbWhere = (c,id) => `team_id=eq.${SB.team.id}&col=eq.${encodeURIComponent(c)}&id=eq.${encodeURIComponent(id)}`;
function sbFail(e){
  const m=sbMsg(e);
  if(/permissão/.test(m)){ toast(`Não tens permissão para alterar isto (${ROLE_L[SB.role]||SB.role}).`); const x=new Error(m); x.shown=true; return x; }
  return e;
}
const sbDb = {
  collection:c=>({ onSnapshot:(next,err)=>{ (SBD.lis[c]=SBD.lis[c]||[]).push({next,err}); if(SBD.ready) setTimeout(()=>sbEmit(c),0); return ()=>{}; } }),
  doc:path=>{ const i=path.indexOf("/"), c=path.slice(0,i), id=path.slice(i+1); return {
    set:async o=>{
      try{ await sbReq("/rest/v1/docs?on_conflict=team_id,col,id",{method:"POST",body:{team_id:SB.team.id,col:c,id,data:o,deleted:false},headers:{Prefer:"resolution=merge-duplicates,return=minimal"}}); }
      catch(e){ throw sbFail(e); }
      SBD.map[c][id]=clone(o); },
    delete:async()=>{
      let r; try{ r=await sbReq("/rest/v1/docs?"+sbWhere(c,id),{method:"PATCH",body:{deleted:true},headers:{Prefer:"return=representation"}}); }
      catch(e){ throw sbFail(e); }
      if(Array.isArray(r)&&!r.length&&SBD.map[c][id]) throw sbFail(new Error("row-level security"));   // sem permissão, nada mudou
      delete SBD.map[c][id]; } }; },
  failed:c=>setTimeout(()=>sbEmit(c),0)   // o servidor recusou: volta a mostrar o que está guardado
};

/* ---- fotos (armazenamento "equipa", pasta = id da equipa) ---- */
const SIMG={}, SIMG_P={};
function sImgLoad(path){
  if(SIMG[path]) return Promise.resolve(SIMG[path]);
  if(!SIMG_P[path]) SIMG_P[path]=sbReq("/storage/v1/object/authenticated/equipa/"+path,{raw:true})
    .then(b=>{ SIMG[path]=URL.createObjectURL(b); VER++; schedule(); return SIMG[path]; }).catch(()=>{ delete SIMG_P[path]; return null; });
  return SIMG_P[path];
}
function sImg(path){ if(SIMG[path]) return SIMG[path]; sImgLoad(path); return null; }
const sbAssets = { upload:async(blob,o)=>{
  const type=(o&&o.type)||blob.type||"image/jpeg", path=`${SB.team.id}/${uid("f")}.${/png/.test(type)?"png":"jpg"}`;
  try{ await sbReq("/storage/v1/object/equipa/"+path,{method:"POST",body:blob,headers:{"Content-Type":type,"x-upsert":"false"}}); }catch(e){ throw sbFail(e); }
  SIMG[path]=URL.createObjectURL(blob); return {id:"sb:"+path}; } };

/* ---- ecrã de entrada ---- */
function sbGate(){
  let el=document.getElementById("sbGate");
  if(!SB.gate){ if(el) el.remove(); document.documentElement.classList.remove("sb-locked"); return; }
  if(!el){ el=document.createElement("div"); el.id="sbGate"; el.className="sbgate"; document.body.appendChild(el); }
  document.documentElement.classList.add("sb-locked");
  const f=(n,l,t="text",a="")=>`<label class="fld"><span>${l}</span><input name="${n}" type="${t}" ${a}></label>`;
  const msg=`${SB.err?`<p class="sb-err" role="alert">${esc(SB.err)}</p>`:""}${SB.info?`<p class="sb-info">${esc(SB.info)}</p>`:""}`;
  const out=`<button class="lnk" data-a="sbOut">Sair</button>`;
  const email=esc((SB.user&&SB.user.email)||SB.email||"");
  const views={
    loading:`<div class="sb-load"><span class="sb-spin"></span>A entrar…</div>`,
    login:`<h2>Entrar</h2>${msg}<form data-sbf="login">${f("email","Email","email",`autocomplete="username" required value="${email}"`)}${f("pass","Palavra-passe","password",'autocomplete="current-password" required')}
      <button class="btn primary big" type="submit">Entrar</button></form>
      <p class="sb-alt"><button class="lnk" data-a="sbGo" data-g="signup">Criar conta</button> · <button class="lnk" data-a="sbGo" data-g="recover">Esqueci-me da palavra-passe</button></p>`,
    signup:`<h2>Criar conta</h2>${msg}<form data-sbf="signup">${f("name","O teu nome","text",'autocomplete="name" required maxlength="80"')}${f("email","Email","email",`autocomplete="username" required value="${email}"`)}
      ${f("pass","Palavra-passe (mínimo 8 caracteres)","password",'autocomplete="new-password" required minlength="8"')}
      <button class="btn primary big" type="submit">Criar conta</button></form><p class="sb-alt"><button class="lnk" data-a="sbGo" data-g="login">Já tenho conta</button></p>`,
    sent:`<h2>Confirma o teu email</h2><p>Enviámos um email para <b>${email}</b>. Abre o link para confirmar a conta (vê também o spam) — a app abre já com a sessão iniciada.</p>
      <p class="sb-alt"><button class="lnk" data-a="sbGo" data-g="login">Voltar a entrar</button></p>`,
    recover:`<h2>Recuperar a palavra-passe</h2>${msg}<form data-sbf="recover">${f("email","Email","email",`required value="${email}"`)}<button class="btn primary big" type="submit">Enviar link</button></form>
      <p class="sb-alt"><button class="lnk" data-a="sbGo" data-g="login">Voltar</button></p>`,
    recsent:`<h2>Vê o teu email</h2><p>Se existir uma conta com <b>${email}</b>, recebes um link para escolher uma palavra-passe nova.</p><p class="sb-alt"><button class="lnk" data-a="sbGo" data-g="login">Voltar a entrar</button></p>`,
    newpass:`<h2>Palavra-passe nova</h2>${msg}<form data-sbf="newpass">${f("pass","Palavra-passe nova (mínimo 8 caracteres)","password",'autocomplete="new-password" required minlength="8"')}<button class="btn primary big" type="submit">Guardar</button></form>`,
    club:`<h2>Olá${SB.user&&SB.user.user_metadata&&SB.user.user_metadata.name?", "+esc(firstName(SB.user.user_metadata.name)):""}</h2>${msg}
      <p>Ainda não estás em nenhuma equipa.</p>
      <div class="sb-box"><h3>Recebeste um convite?</h3><p class="small muted">Abre o link que te enviaram, ou cola-o aqui.</p>
        <form data-sbf="invite" class="sb-row"><label class="fld"><input name="inv" placeholder="Link ou código do convite" aria-label="Link ou código do convite" required></label><button class="btn" type="submit">Entrar na equipa</button></form></div>
      <div class="sb-box"><h3>Criar o teu clube</h3><p class="small muted">Começa vazio: depois acrescentas os atletas, a equipa técnica e o calendário.</p>
        <form data-sbf="club">${f("club","Nome do clube","text",'required maxlength="120" placeholder="ex.: GD Exemplo"')}${f("team","Equipa","text",'required maxlength="80" placeholder="ex.: Sub-19, Equipa B, Seniores"')}
        <div class="sb-2">${f("season","Época","text",`value="${esc(sbSeason())}"`)}${f("comp","Competição","text",'placeholder="ex.: I Divisão Distrital"')}</div>
        <button class="btn primary big" type="submit">Criar clube</button></form></div>
      <p class="sb-alt">${esc((SB.user&&SB.user.email)||"")} · ${out}</p>`,
    pick:`<h2>Escolhe a equipa</h2>${msg}<div class="list">${SB.teams.map(t=>`<button class="li" data-a="sbPick" data-id="${esc(t.id)}"><span class="main"><b>${esc(t.club)} — ${esc(t.name)}</b><small>${esc([t.season,ROLE_L[t.role]||t.role].filter(Boolean).join(" · "))}</small></span><span class="muted">›</span></button>`).join("")}</div>
      <p class="sb-alt">${esc((SB.user&&SB.user.email)||"")} · ${out}</p>`
  };
  el.innerHTML=`<div class="sb-card"><div class="sb-head"><img src="${CREST}" alt=""><div><b>App da equipa técnica</b><span>Treinos, jogos, plantel e monitorização</span></div></div>${views[SB.gate]||""}</div>`;
  el.querySelectorAll("button,input").forEach(x=>{ if(SB.busy) x.disabled=true; });
  const first=el.querySelector("input:not([value]),input[value=''],input"); if(first&&!SB.busy&&SB.gate!=="loading") try{ first.focus(); }catch(e){}
}
function sbSeason(){ const d=new Date(), y=d.getFullYear(); return d.getMonth()>=6?`${y}/${String(y+1).slice(2)}`:`${y-1}/${String(y).slice(2)}`; }
async function sbDo(fn){
  if(SB.busy) return; SB.busy=true; SB.err=""; sbGate();
  try{ await fn(); }catch(e){ SB.err=sbMsg(e); }
  finally{ SB.busy=false; if(SB.gate) sbGate(); }
}
const SBF = {
  login:v=>sbDo(async()=>{ SB.email=v.email; const j=await sbAuth("token?grant_type=password",{email:v.email,password:v.pass}); sbSet(j); SB.info=""; await sbAfterLogin(); }),
  signup:v=>sbDo(async()=>{
    if((v.pass||"").length<8) throw new Error("password at least 8 characters");
    SB.email=v.email;
    const j=await sbAuth("signup?redirect_to="+encodeURIComponent(location.origin+location.pathname),{email:v.email,password:v.pass,data:{name:v.name}});
    if(j.access_token){ sbSet(j); await sbAfterLogin(); } else { SB.gate="sent"; }
  }),
  recover:v=>sbDo(async()=>{ SB.email=v.email; await sbAuth("recover?redirect_to="+encodeURIComponent(location.origin+location.pathname),{email:v.email}); SB.gate="recsent"; }),
  newpass:v=>sbDo(async()=>{
    if((v.pass||"").length<8) throw new Error("password at least 8 characters");
    await sbReq("/auth/v1/user",{method:"PUT",body:{password:v.pass}}); SB.info="Palavra-passe guardada."; await sbAfterLogin(); }),
  invite:v=>sbDo(async()=>{
    const t=(String(v.inv||"").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)||[])[0];
    if(!t) throw new Error("Convite inválido");
    try{ localStorage.setItem(SB_INV,t); }catch(e){} await sbAfterLogin(); }),
  club:v=>sbDo(async()=>{
    const id=await sbRpc("create_club",{p_name:v.club,p_team:v.team,p_season:v.season||null,p_comp:v.comp||null});
    const full=`${v.club.trim()} — ${v.team.trim()}`, rows=[
      {col:"meta",id:"team",data:{team:v.team.trim(),full,club:v.club.trim(),season:v.season||"",comp:v.comp||""}},
      {col:"meta",id:"cfg",data:{exCats:CLUBE_BASE.exCats}},
      ...Object.entries(CLUBE_BASE.statdefs).map(([k,d])=>({col:"statdefs",id:k,data:d}))];
    await sbReq("/rest/v1/docs",{method:"POST",body:rows.map(r=>({team_id:id,...r})),headers:{Prefer:"return=minimal"}});
    try{ localStorage.setItem(SB_TEAM,id); }catch(e){}
    SB.info=`Clube criado. Começa por acrescentar os atletas em Plantel.`; await sbAfterLogin(); })
};
document.addEventListener("submit",e=>{
  const f=e.target.closest&&e.target.closest("form[data-sbf]"); if(!f) return;
  e.preventDefault(); const v={}; new FormData(f).forEach((x,k)=>v[k]=String(x).trim()); if(v.pass!==undefined) v.pass=f.querySelector("[name=pass]").value;
  SBF[f.dataset.sbf](v);
});

/* ---- Plantel → conta e acessos ---- */
async function sbPeople(){
  if(!SB.team) return;
  try{
    const [m,i]=await Promise.all([sbReq(`/rest/v1/members?select=*&team_id=eq.${SB.team.id}&order=created_at.asc`),
      sbIsAdmin()?sbReq(`/rest/v1/invites?select=id,email,role,token,expires_at,accepted_at&team_id=eq.${SB.team.id}&accepted_at=is.null&order=created_at.desc`):Promise.resolve([])]);
    SB.people={m:m||[],i:(i||[]).filter(x=>new Date(x.expires_at)>new Date())};
  }catch(e){ SB.people={m:[],i:[],err:sbMsg(e)}; }
  VER++; schedule();
}
const sbInvLink = tok => `${location.origin}${location.pathname}#convite=${tok}`;
function sbAccount(){
  if(EDITION!=="clubes"||!SB.team) return "";
  if(!SB.people) { SB.people={m:[],i:[],loading:true}; sbPeople(); }
  const P0=SB.people, adm=sbIsAdmin(), me=SB.user&&SB.user.id;
  const roleOpts=Object.entries(ROLE_L).map(([k,l])=>({v:k,l}));
  return `<section class="card" style="margin-top:14px"><div class="card-h"><h3>Conta e acessos</h3><span class="sub">${esc(SB.team.club)} — ${esc(SB.team.name)}</span></div><div class="card-b">
    <p style="margin:0 0 10px"><b>${esc(sbName())}</b> <span class="muted">${esc((SB.user&&SB.user.email)||"")}</span> · <span class="tag">${esc(ROLE_L[SB.role]||SB.role)}</span></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-a="sbMyName">Mudar o meu nome</button>${SB.teams.length>1?`<button class="btn sm" data-a="sbSwitch">Trocar de equipa</button>`:""}<button class="btn sm ghost" data-a="sbOut">Sair</button></div>
    <div class="asec" style="margin-top:16px"><span>Pessoas com acesso</span></div>
    ${P0.loading?`<p class="small muted">A carregar…</p>`:P0.err?`<p class="small" style="color:var(--r5)">${esc(P0.err)}</p>`:""}
    <div class="list sb-people">${P0.m.map(x=>`<div class="li"><span class="main"><b>${esc(x.display_name||x.email||"Sem nome")}${x.user_id===me?" (tu)":""}</b><small>${esc(x.email||"")}</small></span>
      ${adm&&x.user_id!==me?`${sel("r_"+x.user_id,roleOpts,x.role,`data-c="sbRole" data-u="${esc(x.user_id)}" aria-label="Função de ${esc(x.display_name||x.email||"")}"`)}<button class="btn sm ghost" data-a="sbRemove" data-u="${esc(x.user_id)}">Retirar</button>`:`<span class="tag">${esc(ROLE_L[x.role]||x.role)}</span>`}</div>`).join("")}</div>
    ${adm?`${P0.i.length?`<div class="asec" style="margin-top:14px"><span>Convites por aceitar</span></div><div class="list">${P0.i.map(x=>`<div class="li"><span class="main"><b>${esc(x.email)}</b><small>${esc(ROLE_L[x.role]||x.role)} · válido até ${esc(fmtD(String(x.expires_at).slice(0,10),{day:"numeric",month:"short"}))}</small></span><button class="btn sm" data-a="sbInvShow" data-t="${esc(x.token)}" data-e="${esc(x.email)}">Link</button><button class="btn sm ghost" data-a="sbInvDel" data-id="${esc(x.id)}">Apagar</button></div>`).join("")}</div>`:""}
      <form class="sb-inv" data-sbinv="1"><label class="fld sb-e"><input name="email" type="email" required placeholder="Email da pessoa" aria-label="Email da pessoa a convidar"></label><label class="fld sb-r">${sel("role",roleOpts.filter(r=>r.v!=="admin").concat(roleOpts.filter(r=>r.v==="admin")),"adjunto",'aria-label="Função"')}</label><button class="btn primary" type="submit">Convidar</button></form>
      <p class="note">O convite é um link (válido 7 dias) que envias à pessoa por WhatsApp ou email. Ela cria conta com esse email e entra logo na equipa, com a função escolhida. A função decide o que pode ver e alterar (ex.: o clínico só o vê quem tem acesso a ele).</p>`:""}
  </div></section>`;
}
function sbInvModal(tok,email){
  const link=sbInvLink(tok), txt=`Olá! Convido-te para a app da equipa técnica (${SB.team.club} — ${SB.team.name}). Abre este link e cria conta com o email ${email}: ${link}`;
  modal({title:"Convite criado",sub:`Para ${esc(email)} · válido 7 dias`,body:`<label class="fld full">Link do convite<input readonly value="${esc(link)}" id="sbInvL"></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn primary" data-a="sbCopy">Copiar link</button><a class="btn" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">WhatsApp</a><a class="btn" href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Convite — app da equipa técnica")}&body=${encodeURIComponent(txt)}">Email</a></div>`,
    foot:`<span></span><span class="right"><button class="btn" data-a="mClose">Fechar</button></span>`});
}
document.addEventListener("submit",async e=>{
  const f=e.target.closest&&e.target.closest("form[data-sbinv]"); if(!f) return;
  e.preventDefault(); const email=f.querySelector("[name=email]").value.trim().toLowerCase(), role=f.querySelector("[name=role]").value;
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Email inválido.");
  try{ const r=await sbReq("/rest/v1/invites",{method:"POST",body:{team_id:SB.team.id,email,role},headers:{Prefer:"return=representation"}});
    const x=Array.isArray(r)?r[0]:r; f.reset(); await sbPeople(); sbInvModal(x.token,email); }
  catch(err){ toast(sbMsg(err)); }
});
Object.assign(A,{
  sbGo: el => { SB.gate=el.dataset.g; SB.err=""; sbGate(); },
  sbPick: el => { const t=SB.teams.find(x=>x.id===el.dataset.id); if(t) sbEnter(t); },
  sbOut: () => askConfirm("Terminar a sessão neste dispositivo?","Sair").then(async ok=>{ if(!ok) return;
    try{ await sbReq("/auth/v1/logout",{method:"POST",body:{}}); }catch(e){}
    SB.s=null; sbSave(); try{ localStorage.removeItem(SB_TEAM); }catch(e){} location.reload(); }),
  sbSwitch: () => { try{ localStorage.removeItem(SB_TEAM); }catch(e){} location.reload(); },
  sbMyName: () => modal({title:"O teu nome",sub:"Aparece nas alterações que fazes e na lista de acessos.",body:`<label class="fld full">Nome<input name="nm" value="${esc(sbName())}" maxlength="80"></label>`,foot:footSave(),ctx:{save:async()=>{
    const nm=fv("nm"); if(!nm) return toast("Escreve o teu nome.");
    try{ await sbRpc("set_my_name",{p_name:nm}); SB.team.me={...SB.team.me,display_name:nm}; closeModal(); await sbPeople(); toast("Nome guardado"); }catch(e){ toast(sbMsg(e)); } }}}),
  sbRemove: el => { const u=el.dataset.u, x=(SB.people.m||[]).find(m=>m.user_id===u); askConfirm(`Retirar o acesso de ${(x&&(x.display_name||x.email))||"esta pessoa"} a esta equipa?`,"Retirar",true).then(async ok=>{ if(!ok) return;
    try{ await sbReq(`/rest/v1/members?team_id=eq.${SB.team.id}&user_id=eq.${u}`,{method:"DELETE"}); await sbPeople(); toast("Acesso retirado"); }catch(e){ toast(sbMsg(e)); } }); },
  sbInvShow: el => sbInvModal(el.dataset.t,el.dataset.e),
  sbInvDel: el => askConfirm("Apagar este convite? O link deixa de funcionar.","Apagar",true).then(async ok=>{ if(!ok) return;
    try{ await sbReq(`/rest/v1/invites?id=eq.${el.dataset.id}`,{method:"DELETE"}); await sbPeople(); }catch(e){ toast(sbMsg(e)); } }),
  sbCopy: async () => { const i=$("#sbInvL"); try{ await navigator.clipboard.writeText(i.value); toast("Link copiado"); }catch(e){ i.select(); try{ document.execCommand("copy"); toast("Link copiado"); }catch(er){ toast("Seleciona e copia o link."); } } }
});
Object.assign(Cg,{
  sbRole: async el => { try{ await sbReq(`/rest/v1/members?team_id=eq.${SB.team.id}&user_id=eq.${el.dataset.u}`,{method:"PATCH",body:{role:el.value}}); toast("Função alterada"); }catch(e){ toast(sbMsg(e)); } sbPeople(); }
});
sbBoot();
