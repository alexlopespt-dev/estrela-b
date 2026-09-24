// Simulador mínimo do Apps Script (SpreadsheetApp, DriveApp, PropertiesService, CacheService, LockService,
// ContentService, Utilities) que corre o ficheiro .gs verdadeiro num servidor HTTP local.
// Uso: node tests/gas_servidor.js PORTA [ficheiro.gs]
//   GET  /exec?...  -> doGet({parameter})        POST /exec -> doPost({postData:{contents}})
//   GET  /__estado  -> folha "docs" e ficheiros do Drive (para os testes)
const http = require("http"), fs = require("fs"), vm = require("vm"), path = require("path");
const PORT = +process.argv[2] || 8765;
const GS = process.argv[3] || path.join(__dirname, "..", "tools", "apps-script", "dados_app.gs");

let nextId = 1; const uid = p => p + (nextId++);
const chain = o => new Proxy(o,{ get:(t,k)=> k in t ? t[k] : (typeof k==="string" ? function(){ return chain(t); } : undefined) });
function a1(ref){ const m=/^([A-Z]+)(\d+)$/.exec(ref); if(!m) return null; let c=0; for(const ch of m[1]) c=c*26+ch.charCodeAt(0)-64; return [+m[2],c]; }
function Sheet(name){ this.name=name; this.cells=[]; this.fmt={}; return chain(this); }
Sheet.prototype = {
  setName(n){ this.name=n; return this; }, getName(){ return this.name; },
  setFrozenRows(){ return this; }, deleteRow(r){ this.cells.splice(r-1,1); return this; },
  getLastRow(){ let n=this.cells.length; while(n>0 && !(this.cells[n-1]||[]).some(v=>v!==""&&v!=null)) n--; return n; },
  getRange(a,b,c,d){
    if(typeof a==="string"){ const rc=a1(a); if(!rc) return chain({}); return this.getRange(rc[0],rc[1]); }
    const r=a, col=b, nr=c||1, nc=d||1, sh=this;
    const rg = {
      getValues(){ const out=[]; for(let i=0;i<nr;i++){ const row=[]; for(let j=0;j<nc;j++){ const v=(sh.cells[r-1+i]||[])[col-1+j]; row.push(v===undefined?"":v); } out.push(row); } return out; },
      setValues(vals){ if(vals.length!==nr||vals.some(x=>x.length!==nc)) throw new Error("The number of rows/columns in the data does not match the range");
        vals.forEach((row,i)=>{ const k=r-1+i; sh.cells[k]=sh.cells[k]||[]; row.forEach((v,j)=>{ if(typeof v==="string"&&v.length>50000) throw new Error("Your input contains more than the maximum of 50000 characters in a single cell."); sh.cells[k][col-1+j]=v; }); }); return this; },
      getValue(){ return this.getValues()[0][0]; },
      setValue(v){ return this.setValues([[v]]); }
    };
    return chain(rg);
  }
};
function SS(name,id){ this.id=id||uid("ss"); this.name=name; this.sheets=[new Sheet("Folha1")]; }
SS.prototype = { getId(){ return this.id; }, getUrl(){ return "https://docs.google.com/spreadsheets/d/"+this.id; }, getSheets(){ return this.sheets; },
  getSheetByName(n){ return this.sheets.find(s=>s.name===n)||null; }, insertSheet(n){ const s=new Sheet(n); this.sheets.push(s); return s; }, toast(){} };
const SSS = {};
const props = {}, cache = {}, files = [], triggers = [];
const ctx = {
  console, JSON, Math, Date, String, Number, Object, Array, RegExp, isNaN, parseInt, parseFloat, Error,
  Logger: { log(){ } },
  SpreadsheetApp: { create(n){ const s=new SS(n); SSS[s.id]=s; return s; },
    openById(id){ if(!SSS[id]){ if(/^ss\d+$/.test(id)) throw new Error("não existe"); SSS[id]=new SS("destino",id); } return SSS[id]; },   // ficheiros "verdadeiros" (ID_DESTINO) existem sempre
    getActiveSpreadsheet(){ return null; }, newDataValidation(){ return chain({ build(){ return {}; } }); },
    flush(){}, getUi(){ throw new Error("sem UI"); } },
  DriveApp: { Access:{ANYONE_WITH_LINK:"A"}, Permission:{VIEW:"V"},
    createFolder(n){ const f={id:uid("fold"), name:n, getId(){ return this.id; }, getUrl(){ return "https://drive.google.com/drive/folders/"+this.id; },
      createFile(blob){ const fi={id:uid("file"), blob, shared:false, getId(){ return this.id; }, setSharing(){ this.shared=true; }}; files.push(fi); return fi; } }; ctx.__folders[f.id]=f; return f; },
    getFolderById(id){ if(!ctx.__folders[id]) throw new Error("não existe"); return ctx.__folders[id]; } },
  __folders: {},
  PropertiesService: { getScriptProperties(){ return {
    getProperty(k){ return k in props ? props[k] : null; }, setProperty(k,v){ props[k]=String(v); return this; },
    setProperties(o){ Object.entries(o).forEach(([k,v])=>props[k]=String(v)); return this; }, deleteProperty(k){ delete props[k]; return this; } }; } },
  CacheService: { getScriptCache(){ return { get(k){ return k in cache ? cache[k] : null; }, put(k,v){ cache[k]=String(v); }, remove(k){ delete cache[k]; } }; } },
  LockService: { getScriptLock(){ return { waitLock(){}, releaseLock(){} }; } },
  ContentService: { MimeType:{JSON:"application/json",JAVASCRIPT:"application/javascript"},
    createTextOutput(s){ return { s, m:"text/plain", setMimeType(m){ this.m=m; return this; } }; } },
  Utilities: { base64Decode(s){ return Array.from(Buffer.from(s,"base64")); }, newBlob(bytes,type,name){ return {bytes,type,name}; },
    formatDate(d){ return new Date(d).toISOString().replace(/[-:T]/g,"").slice(0,15); } },
  ScriptApp: { getProjectTriggers(){ return triggers.slice(); }, deleteTrigger(t){ const i=triggers.indexOf(t); if(i>=0) triggers.splice(i,1); },
    newTrigger(fn){ const t={fn, getHandlerFunction(){ return fn; }}; return chain({ create(){ triggers.push(t); return t; } }); } }, MailApp: {}, Session: { getScriptTimeZone(){ return "Europe/Lisbon"; } }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(GS,"utf8"), ctx, {filename: path.basename(GS)});

http.createServer((req,res)=>{
  const u = new URL(req.url, "http://x");
  const send = (out,code=200) => { res.writeHead(code, {"Content-Type": out.m, "Access-Control-Allow-Origin":"*"}); res.end(out.s); };
  if(u.pathname==="/__estado"){
    const id=props.dados_id, ss=id&&SSS[id], sh=ss&&ss.getSheetByName("docs");
    const dest=SSS[ctx.ID_DESTINO], les=dest&&dest.getSheetByName("· Lesões");
    return send({m:"application/json", s: JSON.stringify({docs: sh? sh.cells.slice(1).filter(Boolean) : [], files: files.map(f=>({id:f.id,type:f.blob.type,n:f.blob.bytes.length,shared:f.shared})), props,
      lesoes: les ? les.cells.slice(4).filter(r=>r&&r.some(v=>v!==""&&v!=null)) : null, triggers: triggers.map(t=>t.fn)})});
  }
  if(u.pathname==="/__triggers"){   // corre os acionadores agendados (como o Google faria passado o tempo)
    const out=[]; triggers.slice().forEach(t=>{ try{ ctx[t.fn](); out.push(t.fn+": ok"); }catch(e){ out.push(t.fn+": "+e.message); } });
    return send({m:"application/json",s:JSON.stringify(out)});
  }
  if(u.pathname==="/__props"){   // define propriedades do script (ex.: resumo da monitorização app_n/app_0)
    let body=""; req.on("data",c=>body+=c); req.on("end",()=>{ Object.assign(props,JSON.parse(body||"{}")); send({m:"application/json",s:"{}"}); });
    return;
  }
  if(u.pathname==="/__prep"){   // prepara o resumo da monitorização e linhas escritas à mão no separador Lesões
    let body=""; req.on("data",c=>body+=c); req.on("end",()=>{ const p=JSON.parse(body||"{}");
      if(p.nomes){ const f=ctx.destino_(); const pl=f.insertSheet("· Plantel"); pl.getRange(4,1,1,2).setValues([["Jogador","Posição"]]);
        p.nomes.forEach((n,i)=>pl.getRange(5+i,1,1,2).setValues([[n,"Campo"]])); }
      if(p.manual){ const f=ctx.destino_(); const sh=ctx.folhaLesoes_(f);
        p.manual.forEach(r=>sh.getRange(sh.getLastRow()+1,1,1,5).setValues([r])); }
      send({m:"application/json",s:"{}"}); });
    return;
  }
  if(req.method==="POST"){
    let body=""; req.on("data",c=>body+=c); req.on("end",()=>{ try{ send(ctx.doPost({postData:{contents:body}})); }catch(e){ send({m:"text/plain",s:"ERRO "+e.message},500); } });
    return;
  }
  const parameter={}; u.searchParams.forEach((v,k)=>parameter[k]=v);
  try{ send(ctx.doGet({parameter})); }catch(e){ send({m:"text/plain",s:"ERRO "+e.message},500); }
}).listen(PORT, ()=>console.log("pronto "+PORT));
