"use strict";
/* ================= constantes ================= */
const CREST = "__CREST__";
const SEED = __SEED__;
const EXIMG = __EXIMG__;
const IMGC = {};   // imagens grandes guardadas no IndexedDB (versão offline): id -> URL
const exImg = x => x && ((x.imgA && "/_blob/"+x.imgA) || (x.imgL && IMGC[x.imgL]) || x.img || (x.imgk && EXIMG[x.imgk]) || null);
const POS = ["GR","LAT","DC","MDF","MC","EXT","PL","EXT/PL"];
const GROUP = p => { p=(p||"").toUpperCase(); if(p==="GR")return "GR"; if(p==="LAT"||p==="DC")return "DEF"; if(p==="MDF"||p==="MC")return "MED"; if(!p) return "X"; return "ATA"; };
const GORDER = {GR:0,DEF:1,MED:2,ATA:3,X:4};
const GNAME = {GR:"Guarda-redes",DEF:"Defesas",MED:"Médios",ATA:"Avançados",X:"Outros"};
const GSHORT = {GR:"GR",DEF:"DEF",MED:"MED",ATA:"AV",X:"—"};
const BYPOS = (a,b)=>GORDER[GROUP(a.pos)]-GORDER[GROUP(b.pos)] || (a.n||99)-(b.n||99) || String(a.name).localeCompare(String(b.name));
const ATT = {
  P:{s:"P",l:"Presente",c:"var(--r7)"}, AT:{s:"AT",l:"Atraso",c:"var(--r65)"},
  FJ:{s:"FJ",l:"Falta justificada",c:"#8a7a80"}, FI:{s:"FI",l:"Falta injustificada",c:"var(--r5)"},
  L:{s:"L",l:"Lesionado",c:"#b0306a"}, D:{s:"D",l:"Dispensado",c:"#5a6b8a"}
};
const EVAL = {
  tec:{l:"Técnica",a:["Passe","Receção e controlo","Condução","1x1 ofensivo","Finalização","Jogo de cabeça"]},
  tat:{l:"Tática",a:["Posicionamento","Leitura de jogo","Tomada de decisão","Transições","Reação à perda"]},
  fis:{l:"Física",a:["Velocidade","Resistência","Força","Agilidade","Explosão"]},
  psi:{l:"Psicológica",a:["Concentração","Competitividade","Resiliência","Liderança","Comunicação"]}
};
const TESTS = [
  {k:"vel",l:"Velocidade",u:"s",low:true},
  {k:"salto",l:"Salto horizontal",u:"cm",low:false},
  {k:"t",l:"Teste T",u:"s",low:true},
  {k:"vaivem",l:"Vaivém",u:"patamar",low:false}
];
const INJ_TYPES = ["Muscular","Articular / ligamentar","Tendinosa","Óssea","Contusão","Doença","Outra"];
const INJ_ZONES = ["Coxa posterior","Coxa anterior","Adutores","Gémeo / perna","Joelho","Tornozelo","Pé","Anca / púbis","Lombar","Ombro","Braço / mão","Cabeça","Outra"];
const INJ_SEV = ["Ligeira (até 7 dias)","Moderada (8 a 28 dias)","Grave (mais de 28 dias)"];
const INJ_ST = {ativa:{l:"Em tratamento",c:"bad"},condicionado:{l:"Condicionado",c:"warn"},alta:{l:"Alta",c:"ok"}};
const EX_CATS = ["Aquecimento","Técnico","Tático","Físico","Jogo reduzido","Finalização","Guarda-redes","Bolas paradas","Retorno à calma"];
const SC_ST = {obs:{l:"Em observação",c:"blue"},prio:{l:"Prioritário",c:"gold"},desc:{l:"Descartado",c:""},contr:{l:"Contratado",c:"ok"}};
const SC_REC = ["Seguir","Contratar","Descartar"];
const FEET = ["Direito","Esquerdo","Ambos"];
const MOMENTS = [
  {k:"oo",l:"Organização ofensiva"},
  {k:"od",l:"Organização defensiva"},
  {k:"tro",l:"Transição ofensiva"},
  {k:"trd",l:"Transição defensiva"},
  {k:"fbp",l:"Finalização / bolas paradas"}
];
const MOM_LEGACY = {bp:"fbp",bpo:"fbp",bpd:"fbp",rep:"fbp",gr:"fbp",tad:"trd",tda:"tro"};
const MOMK = k => MOM_LEGACY[k] || k;
const PERIODS = ["Preparatório","Competitivo","Transitório"];
const TR_TYPES = [
  {k:"fp",l:"Força e potência",s:"FP",c:"#9c2b62"},
  {k:"res",l:"Resistência",s:"RES",c:"#2f6fb0"},
  {k:"vel",l:"Velocidade",s:"VEL",c:"#d9731a"},
  {k:"pj",l:"Pré-jogo",s:"PJ",c:"#0c8a58"},
  {k:"rec",l:"Recuperação",s:"REC",c:"#7a6d72"}
];
const TRT = k => TR_TYPES.find(t=>t.k===k) || null;
const INTS = [{l:"Baixa",c:"#3fb24f"},{l:"Média",c:"#e0b800"},{l:"Alta",c:"#ec8420"},{l:"Muito alta",c:"#dc3f45"}];
const INTC = l => (INTS.find(i=>i.l===l)||{}).c || null;
const CLIMAS = ["Quente sem chuva","Ameno sem chuva","Frio sem chuva","Chuva","Vento forte","Calor intenso"];
const SATT = ["P","AT","FJ","FI","D"];
const FORMATIONS = ["4-3-3","4-4-2","4-2-3-1","4-1-4-1","3-4-3","3-5-2","5-3-2","4-4-2 losango","Outro"];
const STYLES = ["Posse curta","Jogo direto","Contra-ataque","Pressão alta","Bloco médio","Bloco baixo"];
const MOM = k => (MOMENTS.find(m=>m.k===MOMK(k))||{l:"—"}).l;

/* ================= utilitários ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const isoOf = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const todayISO = () => isoOf(new Date());
const validISO = s => typeof s==="string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const toD = iso => { const [y,m,d]=iso.split("-").map(Number); return new Date(y,m-1,d); };
const addDays = (iso,n) => { const d=toD(iso); d.setDate(d.getDate()+n); return isoOf(d); };
const mondayOf = iso => { const d=toD(iso); d.setDate(d.getDate()-((d.getDay()+6)%7)); return isoOf(d); };
const dayDiff = (a,b) => Math.round((toD(b)-toD(a))/864e5);
const fmtD = (iso,o) => validISO(iso) ? toD(iso).toLocaleDateString("pt-PT",o||{day:"numeric",month:"short"}) : "Sem data";
const cap1 = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
const fmtLong = iso => cap1(fmtD(iso,{weekday:"long",day:"numeric",month:"long"}));
const uid = p => p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fmt1 = x => (Math.round(x*10)/10).toFixed(1);
const clone = o => JSON.parse(JSON.stringify(o===undefined?null:o));
const parseNum = v => { if(v==null) return null; const s=String(v).trim().replace(",","."); if(s==="") return null; const n=parseFloat(s); return isFinite(n)?n:null; };
const rc = r => r>=9?"r9":r>=8?"r8":r>=7?"r7":r>=6.5?"r65":r>=6?"r6":"r5";
const badge = r => r==null||!isFinite(r) ? `<span class="rt none">–</span>` : `<span class="rt ${rc(r)}">${fmt1(r)}</span>`;
const initials = n => (n||"?").trim().split(/\s+/).map(w=>w[0]||"").join("").replace(/[^A-Za-zÀ-ÿ]/g,"").slice(0,2).toUpperCase() || "?";
const byDT = (a,b) => ((a.date||"")+(a.time||"")).localeCompare((b.date||"")+(b.time||""));
const avg = arr => arr.length ? arr.reduce((s,x)=>s+x,0)/arr.length : null;
const plural = (n,s,p) => `${n} ${n===1?s:(p||s+"s")}`;
const pct = (a,b) => b ? Math.round(a/b*100) : null;
const ageOf = birth => { if(!validISO(birth)) return null; const t=new Date(), b=toD(birth); let a=t.getFullYear()-b.getFullYear(); if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate())) a--; return a; };
const sel = (name,opts,val,attrs="",empty) => `<select name="${name}" ${attrs}>${empty!=null?`<option value="">${esc(empty)}</option>`:""}${opts.map(o=>{ const v=typeof o==="object"?o.v:o, l=typeof o==="object"?o.l:o; return `<option value="${esc(v)}" ${String(v)===String(val??"")?"selected":""}>${esc(l)}</option>`; }).join("")}</select>`;
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove("show"),2600); }

/* ================= dados ================= */
const COLS = ["meta","players","events","evals","tests","injuries","scout","exercises","cycles","statdefs","principles","staff","opponents"];
const D = {}; COLS.forEach(c=>D[c]={});
let db=null, assets=null, MODE="loading", VER=0;
const LS = "estrela-tecnico-v1";
function lsLoad(){
  let d=null; try{ d=JSON.parse(localStorage.getItem(LS)||"null"); }catch(e){ d=null; }
  const fromSeed = !d && SEED;
  if(fromSeed) d=clone(SEED);
  if(d) COLS.forEach(c=>{ D[c]=d[c]&&typeof d[c]==="object"?d[c]:{}; });
  if(fromSeed) lsSave();
  VER++;
}
function lsSave(){ try{ const o={}; COLS.forEach(c=>o[c]=D[c]); localStorage.setItem(LS,JSON.stringify(o)); }catch(e){ toast("Sem espaço no browser para guardar. Exporta uma cópia e apaga fotos grandes."); } }

const pending={}, inflight={};
async function flush(key){
  if(inflight[key]) return;
  inflight[key]=true;
  while(pending[key]!==undefined){
    const job=pending[key]; delete pending[key];
    try{ if(job.del) await db.doc(job.col+"/"+job.id).delete(); else await db.doc(job.col+"/"+job.id).set(job.obj); }
    catch(e){ toast(job.del?"Não foi possível apagar. Tenta de novo.":"Não foi possível guardar. Verifica a ligação e tenta de novo."); }
  }
  inflight[key]=false;
}
function put(col,id,obj){
  obj=clone(obj); D[col][id]=obj; VER++; schedule();
  if(db){ const key=col+"/"+id; pending[key]={col,id,obj}; flush(key); } else lsSave();
}
function del(col,id){
  delete D[col][id]; VER++; schedule();
  if(db){ const key=col+"/"+id; pending[key]={col,id,del:true}; flush(key); } else lsSave();
}
const busy = key => inflight[key] || pending[key]!==undefined;

/* ================= imagens grandes (fotos de exercícios) ================= */
// Online: vão para "assets" (nunca para dentro dos documentos). Offline: IndexedDB, porque o localStorage só leva ~5 MB.
function idb(){ return new Promise((res,rej)=>{ if(!window.indexedDB) return rej(new Error("idb")); const r=indexedDB.open(LS+"-img",1); r.onupgradeneeded=()=>r.result.createObjectStore("img"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function idbDo(mode,fn){ const d=await idb(); return new Promise((res,rej)=>{ const t=d.transaction("img",mode); const out=fn(t.objectStore("img")); t.oncomplete=()=>res(out); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); }); }
async function idbLoadAll(){
  try{ const d=await idb(); await new Promise(res=>{ const rq=d.transaction("img","readonly").objectStore("img").openCursor();
    rq.onsuccess=()=>{ const c=rq.result; if(!c) return res(); if(!IMGC[c.key]) IMGC[c.key]=URL.createObjectURL(c.value); c.continue(); }; rq.onerror=()=>res(); }); }catch(e){}
}
async function saveImg(blob){
  if(assets){ try{ const r=await assets.upload(blob,{type:blob.type||"image/jpeg"}); return {imgA:r.id}; }catch(e){} }
  if(!db){ try{ const id=uid("im_"); await idbDo("readwrite",st=>st.put(blob,id)); IMGC[id]=URL.createObjectURL(blob); return {imgL:id}; }catch(e){} }
  return null;
}
function dropImg(x){ if(x&&x.imgL){ const id=x.imgL; idbDo("readwrite",st=>st.delete(id)).catch(()=>{}); } }
async function srcToData(src){
  if(!src || src.startsWith("data:")) return src;
  try{ const r=await fetch(src); if(!r.ok) return src; const b=await r.blob(); return await new Promise(res=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(b); }); }catch(e){ return src; }
}

/* ================= render agendado ================= */
let rq=false, deferred=false;
function editing(){ const a=document.activeElement; return !!(a && $("#main") && $("#main").contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !["range","checkbox","radio","button","file"].includes(a.type)); }
function schedule(){ if(rq) return; rq=true; requestAnimationFrame(()=>{ rq=false; if(editing()){ deferred=true; return; } render(); }); }
document.addEventListener("focusout", ()=>setTimeout(()=>{ if(deferred && !editing()){ deferred=false; render(); } },0));

/* ================= acessores ================= */
const meta = () => D.meta.team || {};
const allPlayers = () => Object.entries(D.players).map(([id,p])=>({id,...p}));
const players = () => allPlayers().filter(p=>!p.archived).sort(BYPOS);
const P = id => D.players[id] ? {id,...D.players[id]} : null;
const pname = id => { const p=P(id); return p?p.name:"(jogador removido)"; };
const events = () => Object.entries(D.events).map(([id,e])=>({id,...e})).filter(e=>validISO(e.date));
const games = () => events().filter(e=>e.type==="jogo").sort(byDT);
const trainings = () => events().filter(e=>e.type==="treino").sort(byDT);
const cycles = kind => Object.entries(D.cycles).map(([id,c])=>({id,...c})).filter(c=>c.kind===kind&&validISO(c.start)&&validISO(c.end)).sort((a,b)=>a.start.localeCompare(b.start));
const cycleAt = (kind,iso) => cycles(kind).find(c=>c.start<=iso&&iso<=c.end) || null;
const exercises = () => Object.entries(D.exercises).map(([id,e])=>({id,...e})).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
const injuries = () => Object.entries(D.injuries).map(([id,i])=>({id,...i})).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
const activeInjury = pid => injuries().find(i=>i.pid===pid && i.status!=="alta") || null;
const avail = pid => { const i=activeInjury(pid); return !i ? "ok" : i.status==="condicionado" ? "cond" : "les"; };
const AV = {ok:{l:"Disponível",c:"ok"},cond:{l:"Condicionado",c:"warn"},les:{l:"Lesionado",c:"bad"}};
const statDefs = () => Object.entries(D.statdefs).map(([id,s])=>({id,...s})).sort((a,b)=>(a.order??99)-(b.order??99)||String(a.title).localeCompare(String(b.title)));
const principles = () => Object.entries(D.principles).map(([id,p])=>({id,...p})).sort((a,b)=>(a.order??99)-(b.order??99)||String(a.name).localeCompare(String(b.name)));
const staff = () => Object.entries(D.staff).map(([id,s])=>({id,...s})).sort((a,b)=>(a.order??99)-(b.order??99)||String(a.name).localeCompare(String(b.name)));
const opponents = () => Object.entries(D.opponents).map(([id,o])=>({id,...o})).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
const testMoments = () => Object.entries(D.tests).map(([id,t])=>({id,...t})).sort((a,b)=>String(a.date).localeCompare(String(b.date)));

function photoSrc(p){ if(!p) return null; if(p.photo) return "/_blob/"+p.photo; if(p.photoData) return p.photoData; return null; }
function avatar(p,attrs=""){
  if(!p) return `<span class="ph g-X">?</span>`;
  const src=photoSrc(p), tag=attrs?"button":"span";
  return `<${tag} class="ph g-${GROUP(p.pos)}" ${attrs}>${src?`<img src="${esc(src)}" alt="" loading="lazy">`:esc(initials(p.name))}</${tag}>`;
}

/* ================= jogo: cálculo de minutos e eventos ================= */
function lineup(g){ const call=g.call||[], xi=new Set(g.xi||[]); const o={}; call.forEach(pid=>o[pid]=xi.has(pid)?"T":"S"); return o; }
function gameCalc(g){
  const dur = +g.dur>0 ? +g.dur : 90;
  const clampM = m => { const n=parseNum(m); return n==null?null:Math.max(0,Math.min(dur,n)); };
  const res={};
  const mk = st => ({st,in:st?0:null,out:null,g:0,a:0,y:0,r:0,min:0});
  Object.entries(lineup(g)).forEach(([pid,s])=>res[pid]=mk(s==="T"));
  const ensure = pid => res[pid] || (res[pid]=mk(false));
  const evs=(g.ev||[]).slice().sort((a,b)=>(parseNum(a.min)??999)-(parseNum(b.min)??999));
  let gf=0;
  evs.forEach(e=>{
    const m=clampM(e.min);
    if(e.t==="sub"){
      if(e.out){ const o=ensure(e.out); if(o.out==null && m!=null) o.out=m; }
      if(e.in){ const i=ensure(e.in); if(i.in==null && m!=null) i.in=m; }
    } else if(e.t==="golo"){ gf++; if(e.pid) ensure(e.pid).g++; }
    else if(e.t==="assist"){ if(e.pid) ensure(e.pid).a++; }
    else if(e.t==="amarelo"){ if(e.pid){ const x=ensure(e.pid); x.y++; if(x.y>=2 && x.out==null && m!=null) x.out=m; } }
    else if(e.t==="vermelho"){ if(e.pid){ const x=ensure(e.pid); x.r++; if(x.out==null && m!=null) x.out=m; } }
  });
  Object.values(res).forEach(x=>{ x.min = x.in==null ? 0 : Math.max(0,(x.out==null?dur:x.out)-x.in); });
  Object.entries(g.minOv||{}).forEach(([pid,m])=>{ const n=parseNum(m); if(n==null||!res[pid]) return; res[pid].min=Math.max(0,Math.min(dur,n)); res[pid].ovr=true; });
  const ga = parseNum(g.ga);
  let result=null;
  if(ga!=null){ result = gf>ga?"V":gf<ga?"D":"E"; }
  return {res,gf,ga,result,dur};
}
const scoreTxt = (g,c) => { c=c||gameCalc(g); const home=g.venue!=="F"; const a=c.gf, b=c.ga==null?"?":c.ga; return home?`${a} - ${b}`:`${b} - ${a}`; };

/* ================= estatísticas (memo) ================= */
let MEMO={v:-1};
function stats(comp){
  if(!comp && MEMO.v===VER) return MEMO;
  const t=todayISO(), pl={};
  const init = id => pl[id] || (pl[id]={conv:0,j:0,tit:0,min:0,g:0,a:0,y:0,r:0,cs:{},rs:[],tr:{P:0,AT:0,FJ:0,FI:0,L:0,D:0},load7:0,games:[]});
  allPlayers().forEach(p=>init(p.id));
  const team={j:0,V:0,E:0,D:0,gf:0,ga:0,form:[],rs:[],cs:{}};
  games().forEach(g=>{
    if(g.date>t) return;
    if(comp && (g.comp||"")!==comp) return;
    const c=gameCalc(g);
    Object.entries(c.res).forEach(([pid,x])=>{
      const s=init(pid); s.conv++; if(x.min>0||x.st) s.j++; if(x.st) s.tit++; s.min+=x.min; s.g+=x.g; s.a+=x.a; s.y+=x.y; s.r+=x.r;
      const r=parseNum((g.rt||{})[pid]); if(r!=null){ s.rs.push(r); team.rs.push(r); }
      Object.entries((g.st||{})[pid]||{}).forEach(([k,n])=>{ n=+n||0; if(!n) return; s.cs[k]=(s.cs[k]||0)+n; team.cs[k]=(team.cs[k]||0)+n; });
      s.games.push({id:g.id,date:g.date,opp:g.opp,comp:g.comp,min:x.min,st:x.st,g:x.g,a:x.a,y:x.y,r:x.r,rt:r});
    });
    if(g.closed && c.result){ team.j++; team[c.result]++; team.gf+=c.gf; team.ga+=c.ga; team.form.push({id:g.id,res:c.result,opp:g.opp,date:g.date,txt:scoreTxt(g,c)}); }
  });
  const from7=addDays(t,-6);
  trainings().forEach(tr=>{
    if(tr.date>t) return;
    Object.entries(tr.att||{}).forEach(([pid,a])=>{
      if(!a) return; const s=init(pid);
      if(a.s && s.tr[a.s]!=null) s.tr[a.s]++;
      const rpe=parseNum(a.rpe);
      if(rpe!=null && tr.date>=from7 && (a.s==="P"||a.s==="AT")) s.load7 += rpe*(+tr.dur||0);
    });
  });
  Object.values(pl).forEach(s=>{
    s.avg=avg(s.rs);
    const pres=s.tr.P+s.tr.AT, base=pres+s.tr.FJ+s.tr.FI;
    s.att=pct(pres,base); s.trTotal=base+s.tr.L+s.tr.D;
  });
  const out={v:VER,pl,team};
  if(!comp) MEMO=out;
  return out;
}
function attendanceSince(fromISO){
  const t=todayISO(); let pres=0, base=0, sessions=0;
  trainings().forEach(tr=>{ if(tr.date>t||tr.date<fromISO) return; let any=false;
    Object.values(tr.att||{}).forEach(a=>{ if(!a||!a.s) return; any=true; if(a.s==="P"||a.s==="AT"){pres++;base++;} else if(a.s==="FJ"||a.s==="FI") base++; });
    if(any) sessions++; });
  return {pct:pct(pres,base),sessions};
}

/* ================= modelo de jogo: tempo por princípio ================= */
function blockPrinciples(x){
  const ex=x.ex?D.exercises[x.ex]:null;
  const ids = x.pr ? [x.pr] : ((ex&&ex.pr)||[]);
  const out=new Set();
  ids.forEach(id=>{ const p=D.principles[id]; if(!p) return; out.add(id); if(p.parent&&D.principles[p.parent]) out.add(p.parent); });
  return [...out];
}
function modelTime(from,to){
  const t=todayISO(), byP={}, byM={}; let total=0, linked=0, sessions=0;
  trainings().forEach(tr=>{
    if(tr.date>t) return; if(from&&tr.date<from) return; if(to&&tr.date>to) return;
    let any=false;
    (tr.plan||[]).forEach(x=>{ const m=+x.min||0; if(!m) return; any=true; total+=m;
      const ps=blockPrinciples(x); if(ps.length) linked+=m;
      const moms=new Set();
      ps.forEach(id=>{ byP[id]=(byP[id]||0)+m; moms.add(MOMK(D.principles[id].moment)); });
      const share = moms.size ? m/moms.size : 0;
      moms.forEach(k=>byM[k]=(byM[k]||0)+share); });
    if(any) sessions++;
  });
  return {byP,byM,total,linked,sessions};
}
