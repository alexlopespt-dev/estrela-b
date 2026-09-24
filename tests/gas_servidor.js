// Simulador mínimo do Apps Script (SpreadsheetApp, DriveApp, PropertiesService, CacheService, LockService,
// ContentService, Utilities) que corre o ficheiro .gs verdadeiro num servidor HTTP local.
// Uso: node tests/gas_servidor.js PORTA [ficheiro.gs]
//   GET  /exec?...  -> doGet({parameter})        POST /exec -> doPost({postData:{contents}})
//   GET  /__estado  -> folha "docs" e ficheiros do Drive (para os testes)
const http = require("http"), fs = require("fs"), vm = require("vm"), path = require("path");
const PORT = +process.argv[2] || 8765;
const GS = process.argv[3] || path.join(__dirname, "..", "tools", "apps-script", "monitorizacao_completo.gs");

let nextId = 1; const uid = p => p + (nextId++);
function Sheet(name){ this.name=name; this.cells=[]; this.fmt={}; }
Sheet.prototype = {
  setName(n){ this.name=n; return this; }, getName(){ return this.name; },
  setFrozenRows(){ return this; },
  getLastRow(){ let n=this.cells.length; while(n>0 && !(this.cells[n-1]||[]).some(v=>v!==""&&v!=null)) n--; return n; },
  getRange(a,b,c,d){
    if(typeof a==="string"){ const self=this; return { setNumberFormat(){ return this; }, setFontWeight(){ return this; } }; }
    const r=a, col=b, nr=c||1, nc=d||1, sh=this;
    return {
      getValues(){ const out=[]; for(let i=0;i<nr;i++){ const row=[]; for(let j=0;j<nc;j++){ const v=(sh.cells[r-1+i]||[])[col-1+j]; row.push(v===undefined?"":v); } out.push(row); } return out; },
      setValues(vals){ if(vals.length!==nr||vals.some(x=>x.length!==nc)) throw new Error("The number of rows/columns in the data does not match the range");
        vals.forEach((row,i)=>{ const k=r-1+i; sh.cells[k]=sh.cells[k]||[]; row.forEach((v,j)=>{ if(typeof v==="string"&&v.length>50000) throw new Error("Your input contains more than the maximum of 50000 characters in a single cell."); sh.cells[k][col-1+j]=v; }); }); return this; },
      setFontWeight(){ return this; }, setNumberFormat(){ return this; }
    };
  }
};
function SS(name){ this.id=uid("ss"); this.name=name; this.sheets=[new Sheet("Folha1")]; }
SS.prototype = { getId(){ return this.id; }, getUrl(){ return "https://docs.google.com/spreadsheets/d/"+this.id; }, getSheets(){ return this.sheets; },
  getSheetByName(n){ return this.sheets.find(s=>s.name===n)||null; }, insertSheet(n){ const s=new Sheet(n); this.sheets.push(s); return s; }, toast(){} };
const SSS = {};
const props = {}, cache = {}, files = [];
const ctx = {
  console, JSON, Math, Date, String, Number, Object, Array, RegExp, isNaN, parseInt, parseFloat, Error,
  Logger: { log(){ } },
  SpreadsheetApp: { create(n){ const s=new SS(n); SSS[s.id]=s; return s; }, openById(id){ if(!SSS[id]) throw new Error("não existe"); return SSS[id]; },
    flush(){}, getUi(){ throw new Error("sem UI"); } },
  DriveApp: { Access:{ANYONE_WITH_LINK:"A"}, Permission:{VIEW:"V"},
    createFolder(n){ const f={id:uid("fold"), name:n, getId(){ return this.id; }, getUrl(){ return "https://drive.google.com/drive/folders/"+this.id; },
      createFile(blob){ const fi={id:uid("file"), blob, shared:false, getId(){ return this.id; }, setSharing(){ this.shared=true; }}; files.push(fi); return fi; } }; ctx.__folders[f.id]=f; return f; },
    getFolderById(id){ if(!ctx.__folders[id]) throw new Error("não existe"); return ctx.__folders[id]; } },
  __folders: {},
  PropertiesService: { getScriptProperties(){ return {
    getProperty(k){ return k in props ? props[k] : null; }, setProperty(k,v){ props[k]=String(v); return this; },
    setProperties(o){ Object.entries(o).forEach(([k,v])=>props[k]=String(v)); return this; }, deleteProperty(k){ delete props[k]; return this; } }; } },
  CacheService: { getScriptCache(){ return { get(k){ return k in cache ? cache[k] : null; }, put(k,v){ cache[k]=String(v); } }; } },
  LockService: { getScriptLock(){ return { waitLock(){}, releaseLock(){} }; } },
  ContentService: { MimeType:{JSON:"application/json",JAVASCRIPT:"application/javascript"},
    createTextOutput(s){ return { s, m:"text/plain", setMimeType(m){ this.m=m; return this; } }; } },
  Utilities: { base64Decode(s){ return Array.from(Buffer.from(s,"base64")); }, newBlob(bytes,type,name){ return {bytes,type,name}; },
    formatDate(d){ return new Date(d).toISOString().replace(/[-:T]/g,"").slice(0,15); } },
  ScriptApp: {}, MailApp: {}, Session: { getScriptTimeZone(){ return "Europe/Lisbon"; } }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(GS,"utf8"), ctx, {filename: path.basename(GS)});

http.createServer((req,res)=>{
  const u = new URL(req.url, "http://x");
  const send = (out,code=200) => { res.writeHead(code, {"Content-Type": out.m, "Access-Control-Allow-Origin":"*"}); res.end(out.s); };
  if(u.pathname==="/__estado"){
    const id=props.dados_id, ss=id&&SSS[id], sh=ss&&ss.getSheetByName("docs");
    return send({m:"application/json", s: JSON.stringify({docs: sh? sh.cells.slice(1).filter(Boolean) : [], files: files.map(f=>({id:f.id,type:f.blob.type,n:f.blob.bytes.length,shared:f.shared})), props})});
  }
  if(req.method==="POST"){
    let body=""; req.on("data",c=>body+=c); req.on("end",()=>{ try{ send(ctx.doPost({postData:{contents:body}})); }catch(e){ send({m:"text/plain",s:"ERRO "+e.message},500); } });
    return;
  }
  const parameter={}; u.searchParams.forEach((v,k)=>parameter[k]=v);
  try{ send(ctx.doGet({parameter})); }catch(e){ send({m:"text/plain",s:"ERRO "+e.message},500); }
}).listen(PORT, ()=>console.log("pronto "+PORT));
