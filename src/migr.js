/* ================= atualizações de dados (correm uma vez, em qualquer dispositivo) ================= */
// Cada atualização só acrescenta ou preenche campos vazios; ids fixos para não duplicar se duas pessoas abrirem ao mesmo tempo.
const CAL_2627 = [
  // [jornada, data, hora, C/F, adversário] — AF Lisboa 3.ª Divisão, Série 4 (zerozero.pt). J11 e J24: folga.
  [1,"2026-09-20","15:00","F","Tenente Valdez"],[2,"2026-09-27","15:00","C","CAC"],[3,"2026-10-04","15:00","F","Atlético CP B"],
  [4,"2026-10-11","15:00","C","Talaíde"],[5,"2026-10-18","15:00","C","Fundação Salesianos"],[6,"2026-10-25","15:00","F","Quinta dos Lombos"],
  [7,"2026-11-01","15:00","C","Estoril Praia B"],[8,"2026-11-08","18:00","F","GDS Cascais B"],[9,"2026-11-15","15:00","C","CF Unidos"],
  [10,"2026-11-29","15:00","F","Malveira da Serra"],[12,"2026-12-20","15:00","F","Porto Salvo"],[13,"2027-01-10","15:30","C","Assoc. Torre"],
  [14,"2027-01-17","15:30","C","Tenente Valdez"],[15,"2027-01-24","15:30","F","CAC"],[16,"2027-01-31","15:30","C","Atlético CP B"],
  [17,"2027-02-14","15:30","F","Talaíde"],[18,"2027-02-21","15:30","F","Fundação Salesianos"],[19,"2027-02-28","15:30","C","Quinta dos Lombos"],
  [20,"2027-03-07","15:30","F","Estoril Praia B"],[21,"2027-03-14","15:30","C","GDS Cascais B"],[22,"2027-03-21","15:30","F","CF Unidos"],
  [23,"2027-04-04","16:00","C","Malveira da Serra"],[25,"2027-04-18","16:00","C","Porto Salvo"],[26,"2027-04-25","16:00","F","Assoc. Torre"]
];
const slug = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const MIGR = [
  {id:"cal2627", run(){
    const comp=meta().comp||"III Distrital", same=(a,b)=>String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase();
    let nG=0, nO=0;
    [...new Set(CAL_2627.map(r=>r[4]))].forEach(name=>{
      const ex=opponents().find(o=>same(o.name,name));
      if(!ex){ put("opponents","op_"+slug(name),{name,comp,crk:OPPIMG[name]?name:"",keys:[],reports:[]}); nO++; }
      else if(!ex.crk && !ex.imgA && !ex.imgL && OPPIMG[name]){ put("opponents",ex.id,{...clone(D.opponents[ex.id]),crk:name}); }
    });
    CAL_2627.forEach(([j,date,time,venue,opp])=>{
      const phase="Jornada "+j, g=games().find(x=>x.date===date);
      if(!g){ put("events","jg_2627_j"+j,{type:"jogo",date,time,opp,venue,comp,phase,dur:90,call:[],xi:[],ev:[],rt:{},ga:null,closed:false}); nG++; return; }
      const o=clone(D.events[g.id]); let ch=false;
      const fill=(k,v)=>{ if(o[k]==null||o[k]===""){ o[k]=v; ch=true; } };
      if(!o.opp || same(o.opp,opp)){ fill("opp",opp); if(o.venue!==venue){ o.venue=venue; ch=true; } fill("time",time); fill("phase",phase); fill("comp",comp); }
      // J1 (zerozero): Tenente Valdez 0-6 Estrela B, fora
      if(j===1 && same(o.opp,opp) && parseNum(o.ga)==null && gameCalc(o).gf===6){ o.ga=0; ch=true; }
      if(ch) put("events",g.id,o);
    });
    return nG||nO ? `Calendário da época: ${plural(nG,"jogo novo","jogos novos")}, ${plural(nO,"adversário novo","adversários novos")}.` : "";
  }}
  ,{id:"plantel_mon1", run(){
    // Na folha de monitorização o Rocha aparece como "Hugo R."; o Khan passa a fazer parte do plantel.
    const same=(a,b)=>nameKey(a)===nameKey(b); let msg=[];
    const rocha=allPlayers().find(p=>same(p.name,"Rocha"));
    const c=clone(cfg()), mon=c.mon||{}, map={...(mon.map||{})};
    if(rocha && !("Hugo R." in map)){ map["Hugo R."]=rocha.id; put("meta","cfg",{...c,mon:{...mon,map}}); }
    if(!allPlayers().some(p=>same(p.name,"Khan"))){ put("players","p_khan",{n:null,name:"Khan",pos:"",foot:"",photo:null}); msg.push("Khan adicionado ao plantel"); }
    return msg.join(". ");
  }}
  ,{id:"exlib129", run(){
    // Browsers com dados de antes da importação só tinham os 9 exercícios de exemplo: junta os que faltam dos dados iniciais
    // (os 129 da biblioteca com desenho). Só acrescenta ids que não existem; nunca altera nem repõe exercícios apagados depois disto.
    if(!SEED || !SEED.exercises) return "";
    let n=0;
    Object.entries(SEED.exercises).forEach(([id,x])=>{ if(!D.exercises[id]){ put("exercises",id,clone(x)); n++; } });
    return n ? `${n} exercícios da biblioteca acrescentados` : "";
  }}
];
function runMigrations(){
  if(MODE!=="local" && MODE!=="db") return;
  const done=clone(D.meta.mig||{}); let msg=[];
  MIGR.forEach(m=>{ if(done[m.id]) return; try{ const r=m.run(); if(r) msg.push(r); done[m.id]=todayISO(); }catch(e){ console.error(e); } });
  if(Object.keys(done).length!==Object.keys(D.meta.mig||{}).length){ put("meta","mig",done); if(msg.length) toast(msg.join(" ")); }
}

/* ================= emblemas dos adversários ================= */
const oppByName = name => { const n=String(name||"").trim().toLowerCase(); return n ? opponents().find(o=>String(o.name).trim().toLowerCase()===n) || null : null; };
const oppCrestSrc = o => o && ((o.imgA && "/_blob/"+o.imgA) || (o.imgL && IMGC[o.imgL]) || o.crest || (o.crk && OPPIMG[o.crk]) || null);
function oppCrest(nameOrOpp, size=34){
  const o = typeof nameOrOpp==="object" ? nameOrOpp : oppByName(nameOrOpp);
  const name = o ? o.name : nameOrOpp, src = oppCrestSrc(o);
  return src ? `<img class="ocrest" src="${esc(src)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="shield" style="width:${size}px;height:${Math.round(size*1.15)}px;font-size:${Math.round(size*.38)}px">${esc(name?initials(name):"?")}</span>`;
}
