(function(){
  const store={}; const listeners={};
  const deepFreeze=o=>{ if(o&&typeof o==="object"){ Object.freeze(o); Object.values(o).forEach(deepFreeze);} return o; };
  const notify=c=>setTimeout(()=>{ (listeners[c]||[]).forEach(fn=>{ const docs=Object.entries(store[c]||{}).map(([id,d])=>({id,exists:true,data:()=>d,metadata:{}})); fn({docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{}}); }); },30);
  window.__store=store; window.__writes=0;
  const db={
    collection:c=>({ onSnapshot:(next,err)=>{ (listeners[c]=listeners[c]||[]).push(next); notify(c); return ()=>{}; } }),
    doc:path=>{ const [c,id]=path.split("/"); return {
      set:async o=>{ await new Promise(r=>setTimeout(r,40)); window.__writes++; store[c]=store[c]||{}; store[c][id]=deepFreeze(JSON.parse(JSON.stringify(o))); notify(c); },
      delete:async()=>{ await new Promise(r=>setTimeout(r,40)); if(store[c]) delete store[c][id]; notify(c); } }; }
  };
  window.claude={use:n=>Promise.resolve(n==="db"?db:null)};
  window.__seed=s=>{ Object.entries(s).forEach(([c,docs])=>{ store[c]={}; Object.entries(docs).forEach(([id,d])=>store[c][id]=deepFreeze(d)); }); };
})();
