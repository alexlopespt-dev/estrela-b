/* ================= configuração: categorias e avaliação ================= */
const cfg = () => D.meta.cfg || {};
function exCats(){ const c=cfg().exCats; return Array.isArray(c)&&c.length ? c : EX_CATS; }
function exCatsAll(){ const base=exCats(), extra=[]; exercises().forEach(x=>{ if(x.cat && !base.includes(x.cat) && !extra.includes(x.cat)) extra.push(x.cat); }); return base.concat(extra); }
function evalCfg(){
  const c=cfg().eval, out={};
  Object.keys(EVAL).forEach(k=>{ const a=c&&c[k]; out[k]={l:(a&&a.l)||EVAL[k].l, a:(a&&Array.isArray(a.a)&&a.a.length)?a.a:EVAL[k].a}; });
  return out;
}
const cfgRow = (v,old) => `<div class="cfgrow"><input class="inp" value="${esc(v)}" data-old="${esc(old??"")}" maxlength="40"><button class="btn sm" data-a="cfgMove" data-n="-1" aria-label="Subir">↑</button><button class="btn sm" data-a="cfgMove" data-n="1" aria-label="Descer">↓</button><button class="btn sm ghost" data-a="cfgDel" aria-label="Remover">✕</button></div>`;
const cfgList = (id,vals) => `<div class="cfglist" id="${id}">${vals.map(v=>cfgRow(v,v)).join("")}</div><button class="btn sm" style="margin-top:6px" data-a="cfgAdd" data-l="${id}">+ Adicionar</button>`;
function readList(id){ return $$(`#${id} .cfgrow input`).map(i=>({v:i.value.trim(),old:i.dataset.old})).filter(x=>x.v); }
function checkList(rows,what){
  const seen=new Set(); for(const r of rows){ const k=r.v.toLowerCase(); if(seen.has(k)){ toast(`"${r.v}" aparece repetido em ${what}.`); return false; } seen.add(k); }
  if(!rows.length){ toast(`Tem de haver pelo menos um item em ${what}.`); return false; }
  return true;
}
function catCfgForm(){
  const body=`<p class="small muted" style="margin:0 0 10px">Muda o nome, a ordem ou acrescenta categorias. Ao mudar o nome, os exercícios dessa categoria passam para o nome novo. Ao remover, os exercícios mantêm a categoria antiga até os editares.</p>${cfgList("cfgCats",exCats())}`;
  modal({title:"Categorias de exercícios",body,foot:footSave("Guardar"),ctx:{save:()=>{
    const rows=readList("cfgCats"); if(!checkList(rows,"categorias")) return;
    const ren={}; rows.forEach(r=>{ if(r.old && r.old!==r.v) ren[r.old]=r.v; });
    let nx=0; exercises().forEach(x=>{ if(ren[x.cat]){ const o=clone(D.exercises[x.id]); o.cat=ren[x.cat]; put("exercises",x.id,o); nx++; } });
    if(ren[S.exCat]) S.exCat=ren[S.exCat];
    put("meta","cfg",{...clone(cfg()),exCats:rows.map(r=>r.v)});
    closeModal(); toast(nx?`Categorias guardadas — ${nx} ${nx>1?"exercícios atualizados":"exercício atualizado"}`:"Categorias guardadas");
  }}});
}
function evalCfgForm(){
  const ec=evalCfg();
  const body=`<p class="small muted" style="margin:0 0 10px">As 4 áreas formam o radar da ficha do atleta. Podes mudar o nome de cada área e os atributos avaliados. Ao mudar o nome de um atributo, as avaliações já feitas passam para o nome novo; ao remover, os valores antigos continuam a contar para a média da área.</p>
    ${Object.entries(ec).map(([k,a])=>`<div class="asec" style="margin-top:14px"><input class="inp" id="cfgL_${k}" value="${esc(a.l)}" maxlength="24" style="max-width:220px;font-weight:700" aria-label="Nome da área"></div>${cfgList("cfgA_"+k,a.a)}`).join("")}`;
  modal({title:"Atributos de avaliação",big:true,body,foot:footSave("Guardar"),ctx:{save:()=>{
    const out={}, ren={};
    for(const k of Object.keys(ec)){
      const l=$("#cfgL_"+k).value.trim(); if(!l){ toast("Todas as áreas precisam de nome."); return; }
      const rows=readList("cfgA_"+k); if(!checkList(rows,l)) return;
      out[k]={l,a:rows.map(r=>r.v)}; ren[k]={}; rows.forEach(r=>{ if(r.old && r.old!==r.v) ren[k][r.old]=r.v; });
    }
    let n=0;
    Object.entries(D.evals).forEach(([id,ev])=>{ let ch=false; const o=clone(ev); o.v=o.v||{};
      Object.keys(ren).forEach(k=>Object.entries(ren[k]).forEach(([a,b])=>{ if(o.v[k] && a in o.v[k]){ if(!(b in o.v[k])) o.v[k][b]=o.v[k][a]; delete o.v[k][a]; ch=true; } }));
      if(ch){ put("evals",id,o); n++; } });
    put("meta","cfg",{...clone(cfg()),eval:out});
    closeModal(); toast(n?`Guardado — ${n} avaliações atualizadas`:"Atributos guardados");
  }}});
}
