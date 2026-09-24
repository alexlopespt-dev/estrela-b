/* ================= desenhos vetoriais dos exercícios (formato v2) =================
   Redesenho fiel das imagens importadas: coordenadas no espaço da captura original (w x h px),
   campo descrito pelos parâmetros ajustados (orientação, escala, posição, comprimento e largura),
   e elementos (jogadores, material, linhas, textos) com o aspeto do programa de origem.
   d = {v:2, w, h, fld:{ori,s,asp,tx,ty,L,W,bands:[[a,b]...]}, it:[...]} */
const VEC_PROP = {pa_d:19.25, pa_w:46.85, ga_d:6.42, ga_w:21.15, rc:10.6, spot:12.83, corner:1.3, gw:8.6, gd:2.2};
const VEC_GRASS = ["#4e9c36","#428e2a"];
const VEC_LINE = 'stroke="#f2fbee" stroke-opacity=".9" stroke-width="1.05" fill="none"';
const vn = v => Math.round(v*100)/100;

function vecField(f,w,h,uid){
  const P=VEC_PROP, sx=f.s*(f.asp||1), sy=f.s, L=f.L, W=f.W, V=f.ori!=="h";
  // metros (x ao longo do comprimento, y na largura) -> imagem
  const T=(x,y)=> V ? [f.tx+sx*y, f.ty+sy*x] : [f.tx+sx*x, f.ty+sy*y];
  const kx = V ? sy : sx, ky = V ? sx : sy;          // px/m ao longo do comprimento / da largura
  const pt=(x,y)=>{ const [a,b]=T(x,y); return vn(a)+" "+vn(b); };
  const ln=(a,b)=>`M${pt(...a)}L${pt(...b)}`;
  // faixas da relva (escuras), perpendiculares ao comprimento
  let s=`<rect width="${w}" height="${h}" fill="${VEC_GRASS[0]}"/>`;
  (f.bands||[]).forEach(([a,b])=>{ s+= V ? `<rect x="0" y="${vn(a)}" width="${w}" height="${vn(b-a)}" fill="${VEC_GRASS[1]}"/>` : `<rect x="${vn(a)}" y="0" width="${vn(b-a)}" height="${h}" fill="${VEC_GRASS[1]}"/>`; });
  let d="";
  d+=ln([0,0],[L,0])+ln([0,W],[L,W])+ln([0,0],[0,W])+ln([L,0],[L,W])+ln([L/2,0],[L/2,W]);
  const ell=(cx,cy,r,t0,t1)=>{ const n=Math.max(8,Math.ceil(Math.abs(t1-t0)*r*Math.max(kx,ky)/3)); let p=""; for(let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n; p+=(i?"L":"M")+pt(cx+r*Math.cos(t),cy+r*Math.sin(t)); } return p; };
  d+=ell(L/2,W/2,P.rc,0,2*Math.PI);
  [0,1].forEach(side=>{ const X=v=>side?L-v:v;
    [[P.pa_d,P.pa_w],[P.ga_d,P.ga_w]].forEach(([dd,ww])=>{ const y0=W/2-ww/2, y1=W/2+ww/2; d+=ln([X(0),y0],[X(dd),y0])+ln([X(dd),y0],[X(dd),y1])+ln([X(dd),y1],[X(0),y1]); });
    const a=Math.acos((P.pa_d-P.spot)/P.rc);
    d+= side ? ell(L-P.spot,W/2,P.rc,Math.PI-a,Math.PI+a) : ell(P.spot,W/2,P.rc,-a,a);
    [0,W].forEach(yc=>{ const t0 = side ? (yc?Math.PI:Math.PI/2) : (yc?-Math.PI/2:0); d+=ell(X(0),yc,P.corner,t0,t0+Math.PI/2); });
  });
  s+=`<path d="${d}" ${VEC_LINE}/>`;
  // marcas: centro e penáltis
  [[L/2,W/2],[P.spot,W/2],[L-P.spot,W/2]].forEach(([x,y])=>{ const [a,b]=T(x,y); s+=`<circle cx="${vn(a)}" cy="${vn(b)}" r="1" fill="#f2fbee" fill-opacity=".9"/>`; });
  // balizas (fora da linha de fundo)
  [0,1].forEach(side=>{ const x0=side?L:0, x1=side?L+P.gd:-P.gd;
    const [ax,ay]=T(x0,W/2-P.gw/2), [bx,by]=T(x1,W/2+P.gw/2);
    s+=vecNet(Math.min(ax,bx),Math.min(ay,by),Math.abs(bx-ax),Math.abs(by-ay),uid); });
  return s;
}
function vecNet(x,y,w,h,uid,a){
  const g=a?` transform="rotate(${vn(a)} ${vn(x+w/2)} ${vn(y+h/2)})"`:"";
  return `<g${g}><rect x="${vn(x)}" y="${vn(y)}" width="${vn(w)}" height="${vn(h)}" fill="url(#net${uid})" stroke="#fbfbf6" stroke-width="1.3"/></g>`;
}
function vecDefs(uid){
  return `<defs><pattern id="net${uid}" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.2" height="2.2" fill="#dfe6d6"/><path d="M0 0H2.2M0 0V2.2" stroke="#9aa590" stroke-width=".55"/></pattern>
  <radialGradient id="dsh${uid}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
  ${["#ffffff","#111111","#f2bd4b"].map((c,i)=>`<marker id="ar${uid}_${i}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join("")}</defs>`;
}
const VEC_ARC = c => ({"#ffffff":0,"#fff":0,"#111111":1,"#000":1,"#111":1,"#f2bd4b":2})[String(c||"#111111").toLowerCase()] ?? 1;

/* jogador visto de cima (camisola, calções, cabeça), orientado pelo ângulo a (graus, 0 = virado para cima) */
function vecFig(it){   // jogador visto de cima: ombros/braços (c), tronco (t2), calções (c2), cabeça; s=1 ≈ 15 px de largura
  const s=it.s||1, c=it.c||"#d32f2f", dk=/^#[0-3][0-9a-f][0-3][0-9a-f][0-3]/i.test(c);
  const c2=it.c2??(dk?"#f3ead0":""), t2=it.t2??(dk?"#5a2a14":"#7a2418");
  return `<g transform="translate(${vn(it.x)} ${vn(it.y)}) rotate(${vn(it.a||0)}) scale(${s})">
    <ellipse cx="0" cy=".7" rx="7.6" ry="3.4" fill="#000" fill-opacity=".2"/>
    ${c2?`<ellipse cx="0" cy="2.4" rx="3" ry="1.7" fill="${c2}"/>`:""}
    <ellipse cx="-4.3" cy="0" rx="3.1" ry="2.8" fill="${c}" stroke="#1a1a1a" stroke-width=".45"/>
    <ellipse cx="4.3" cy="0" rx="3.1" ry="2.8" fill="${c}" stroke="#1a1a1a" stroke-width=".45"/>
    <path d="M-4 -1.8H4V1.9H-4Z" fill="${c}"/>${t2?`<ellipse cx="0" cy=".3" rx="3.6" ry="2.3" fill="${t2}"/>`:""}
    <circle cx="0" cy="0" r="2.1" fill="${it.hair||"#3a2410"}" stroke="#1a1a1a" stroke-width=".35"/></g>`;
}
function vecItem(it,uid){
  const x=vn(it.x), y=vn(it.y);
  switch(it.t){
    case "d": { const r=it.r||6.5, o=it.o||"#1c1c1c", ow=it.ow??(r*0.2);
      return `<g><circle cx="${x}" cy="${y}" r="${vn(r)}" fill="${it.c||"#fff"}" stroke="${o}" stroke-width="${vn(ow)}"/>${it.sh===0?"":`<circle cx="${x}" cy="${y}" r="${vn(r-ow/2)}" fill="url(#dsh${uid})"/>`}${it.txt?`<text x="${x}" y="${vn(it.y+(it.fs||r*0.9)*0.36)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${vn(it.fs||r*0.9)}" fill="${it.tc||"#111"}">${esc(it.txt)}</text>`:""}</g>`; }
    case "ball": { const r=it.r||2.2;
      return `<g><circle cx="${x}" cy="${y}" r="${vn(r)}" fill="#fff" stroke="#222" stroke-width="${vn(r*0.28)}"/><circle cx="${x}" cy="${y}" r="${vn(r*0.38)}" fill="#333"/></g>`; }
    case "balls": { const r=it.r||2.2, n=it.n||5, out=[]; for(let i=0;i<n;i++){ const a=i*2.4, rr=r*1.25*Math.sqrt(i); out.push(vecItem({t:"ball",x:it.x+rr*Math.cos(a),y:it.y+rr*Math.sin(a),r},uid)); } return `<g>${out.join("")}</g>`; }
    case "cone": { const s=it.s||1, c=it.c||"#f08a24";
      return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="2.6" rx="3.6" ry="1.1" fill="#000" fill-opacity=".25"/><path d="M0 -4.4L3 2.4H-3Z" fill="${c}" stroke="#5a2d00" stroke-width=".45"/><path d="M-3.6 2.2h7.2v1h-7.2z" fill="${c}" stroke="#5a2d00" stroke-width=".35"/><path d="M-1.1 -1.4h2.2" stroke="#fff" stroke-width=".7"/></g>`; }
    case "mk": { const r=it.r||2.6, c=it.c||"#f2b42a";
      return `<g><circle cx="${x}" cy="${y}" r="${vn(r)}" fill="${c}" stroke="#4a3200" stroke-width="${vn(r*0.22)}"/><circle cx="${x}" cy="${y}" r="${vn(r*0.4)}" fill="${VEC_GRASS[0]}" stroke="#4a3200" stroke-width="${vn(r*0.12)}"/></g>`; }
    case "sq": { const s=it.s||5;
      return `<rect x="${vn(it.x-s)}" y="${vn(it.y-s)}" width="${vn(2*s)}" height="${vn(2*s)}" fill="${it.c||"#ffe44d"}" stroke="#1c1c1c" stroke-width="${vn(s*0.22)}"${it.a?` transform="rotate(${it.a} ${x} ${y})"`:""}/>`; }
    case "tri": { const s=it.s||5.5;
      return `<path d="M${x} ${vn(it.y-s)}L${vn(it.x+s*0.95)} ${vn(it.y+s*0.72)}H${vn(it.x-s*0.95)}Z" fill="${it.c||"#9be36b"}" stroke="#1c1c1c" stroke-width="${vn(s*0.2)}" stroke-linejoin="round"/>`; }
    case "x": { const s=it.s||4.5, c=it.c||"#d9262c";
      return `<g stroke-linecap="round"><path d="M${vn(it.x-s)} ${vn(it.y-s)}L${vn(it.x+s)} ${vn(it.y+s)}M${vn(it.x+s)} ${vn(it.y-s)}L${vn(it.x-s)} ${vn(it.y+s)}" stroke="#1c1c1c" stroke-width="${vn(s*0.85)}"/><path d="M${vn(it.x-s)} ${vn(it.y-s)}L${vn(it.x+s)} ${vn(it.y+s)}M${vn(it.x+s)} ${vn(it.y-s)}L${vn(it.x-s)} ${vn(it.y+s)}" stroke="${c}" stroke-width="${vn(s*0.42)}"/></g>`; }
    case "fig": return vecFig(it);
    case "bib": { const r=it.r||5.7;   // coletes: disco preto com o colete (cinzento) ao centro
      return `<g><circle cx="${x}" cy="${y}" r="${vn(r)}" fill="#0e0e0e" stroke="#000" stroke-width="${vn(r*0.12)}"/><rect x="${vn(it.x-r*0.3)}" y="${vn(it.y-r*0.45)}" width="${vn(r*0.6)}" height="${vn(r*0.9)}" rx="${vn(r*0.12)}" fill="#4a4a4a"/><path d="M${vn(it.x-r*0.2)} ${vn(it.y-r*0.28)}H${vn(it.x+r*0.2)}M${x} ${vn(it.y-r*0.28)}V${vn(it.y+r*0.32)}" stroke="#c8c8c8" stroke-width="${vn(r*0.09)}"/></g>`; }
    case "goal": return vecNet(it.x-it.w/2,it.y-it.h/2,it.w,it.h,uid,it.a);
    case "pole": { const h=it.h||12, c=it.c||"#e8742a";
      return `<g><ellipse cx="${x}" cy="${y}" rx="2.4" ry="1.2" fill="#000" fill-opacity=".3"/><rect x="${vn(it.x-1.1)}" y="${vn(it.y-h)}" width="2.2" height="${h}" rx="1" fill="${c}" stroke="#3a1a00" stroke-width=".4"/></g>`; }
    case "flag": { const c=it.c||"#e53935";
      return `<g><path d="M${x} ${vn(it.y+3)}V${vn(it.y-6)}" stroke="#444" stroke-width=".9"/><path d="M${x} ${vn(it.y-6)}l${it.l?-6:6} 2.3l${it.l?6:-6} 2.3z" fill="${c}" stroke="#5a0000" stroke-width=".35"/></g>`; }
    case "ladder": { const w=it.w||6, h=it.h||40, n=it.n||Math.round(h/4.4); let r="";
      for(let i=0;i<=n;i++){ const yy=vn(-h/2+h*i/n); r+=`<path d="M${-w/2} ${yy}H${w/2}" stroke="#f2c21b" stroke-width=".9"/>`; }
      return `<g transform="translate(${x} ${y}) rotate(${it.a||0})">${r}<path d="M${-w/2} ${-h/2}V${h/2}M${w/2} ${-h/2}V${h/2}" stroke="#1c1c1c" stroke-width="1.1"/></g>`; }
    case "hurdle": { const w=it.w||12, d=it.d??2.6;   // barreira vista de cima: barra às riscas preto/amarelo e pés claros
      return `<g transform="translate(${x} ${y}) rotate(${it.a||0})"><path d="M${-w/2} ${d}V0H${w/2}V${d}" fill="none" stroke="#d8f0b0" stroke-width=".9"/><path d="M${-w/2+.8} 0H${w/2-.8}" stroke="#141414" stroke-width="1.5"/><path d="M${-w/2+.8} 0H${w/2-.8}" stroke="#f5e27a" stroke-width="1.5" stroke-dasharray="1.1 1.1"/></g>`; }
    case "pen": { const l=it.l||8, h=it.h||5.5, c=it.c||"#d9362b";   // bandeirola (triângulo) presa ao ponto x,y
      return `<path d="M${x} ${vn(it.y-h/2)}L${vn(it.x+l)} ${y}L${x} ${vn(it.y+h/2)}Z" fill="${c}" stroke="rgba(0,0,0,.45)" stroke-width=".4" stroke-linejoin="round"${it.a?` transform="rotate(${it.a} ${x} ${y})"`:""}/>`; }
    case "dome": { const w=it.w||24, h=it.h||10, c=it.c||"#f2c02a";   // prato de sinalização (visto de lado)
      return `<g transform="translate(${x} ${y})"><path d="M${-w/2} 0C${-w/2} ${-h*1.1} ${w/2} ${-h*1.1} ${w/2} 0Z" fill="${c}"/><path d="M${-w/2-1} 0H${w/2+1}" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M${-w/5} ${-h*0.55}C${-w/10} ${-h*0.75} ${w/10} ${-h*0.75} ${w/5} ${-h*0.55}" stroke="#000" stroke-opacity=".25" stroke-width="1.2" fill="none"/></g>`; }
    case "stick": { const h=it.h||34, c=it.c||"#f2c02a";   // estaca fina vertical com base
      return `<g><path d="M${x} ${y}V${vn(it.y-h)}" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="${x}" cy="${y}" rx="4.2" ry="1.6" fill="${c}"/></g>`; }
    case "stake": { const h=it.h||7, c=it.c||"#c9602a";   // estaca espetada, inclinada (visto de cima em perspetiva)
      return `<g transform="translate(${x} ${y}) rotate(${it.a||0})"><ellipse cx="0" cy="0" rx="2.6" ry="1.4" fill="#101010"/><path d="M-1.5 0L-.9 ${-h}H.9L1.5 0Z" fill="${c}" stroke="#5a2a10" stroke-width=".35"/><path d="M-.3 ${-h+1}V-1" stroke="#fff" stroke-opacity=".35" stroke-width=".5"/></g>`; }
    case "rect": { const g=it.a?` transform="rotate(${it.a} ${vn(it.x+it.w/2)} ${vn(it.y+it.h/2)})"`:"";
      return `<rect x="${x}" y="${y}" width="${vn(it.w)}" height="${vn(it.h)}" fill="${it.fill||"none"}"${it.fo!=null?` fill-opacity="${it.fo}"`:""} stroke="${it.c||"#111"}" stroke-width="${it.lw||1.1}"${it.dash?` stroke-dasharray="${it.dash}"`:""}${it.none?' stroke-opacity="0"':""}${g}/>`; }
    case "ln": { const p=it.pts||[]; if(p.length<2) return "";
      let d;
      if(it.wave){ // condução: linha ondulada
        d=""; for(let k=0;k<p.length-1;k++){ const [x0,y0]=p[k],[x1,y1]=p[k+1], len=Math.hypot(x1-x0,y1-y0), n=Math.max(2,Math.round(len/(it.wl||4))), ux=(x1-x0)/len, uy=(y1-y0)/len;
          for(let i=0;i<=n;i++){ const t=i/n, o=(i%2?1:-1)*(it.amp||1.6)*(i&&i<n?1:0); d+=(k||i?"L":"M")+vn(x0+ux*len*t-uy*o)+" "+vn(y0+uy*len*t+ux*o); } } }
      else if(it.curve && p.length>=3){ // curva suave (Catmull-Rom)
        d=`M${vn(p[0][0])} ${vn(p[0][1])}`; for(let i=0;i<p.length-1;i++){ const p0=p[i-1]||p[i], p1=p[i], p2=p[i+1], p3=p[i+2]||p2;
          d+=`C${vn(p1[0]+(p2[0]-p0[0])/6)} ${vn(p1[1]+(p2[1]-p0[1])/6)} ${vn(p2[0]-(p3[0]-p1[0])/6)} ${vn(p2[1]-(p3[1]-p1[1])/6)} ${vn(p2[0])} ${vn(p2[1])}`; } }
      else d="M"+p.map(q=>vn(q[0])+" "+vn(q[1])).join("L");
      const c=it.c||"#111111"; let mdef="", mk=`url(#ar${uid}_${VEC_ARC(c)})`;
      if(it.arr && VEC_ARC(c)===1 && !/^#(111111|111|000|000000)$/i.test(c)){ const mid=`ar${uid}_c${(++VEC_MK).toString(36)}`; mk=`url(#${mid})`;
        mdef=`<defs><marker id="${mid}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker></defs>`; }
      return `${mdef}<path d="${d}" fill="none" stroke="${c}" stroke-width="${it.lw||1}"${it.dash?` stroke-dasharray="${it.dash}"`:""} stroke-linecap="round" stroke-linejoin="round"${it.arr?` marker-end="${mk}"`:""}${it.arr===2?` marker-start="${mk}"`:""}/>`; }
    case "txt": return `<text x="${x}" y="${y}" text-anchor="${it.anc||"middle"}" font-family="Arial, Helvetica, sans-serif" font-weight="${it.b===0?400:700}" font-size="${it.s||7}" fill="${it.c||"#111"}"${it.stroke?` stroke="${it.stroke}" stroke-width="${it.sw||1.6}" paint-order="stroke"`:""}>${esc(it.txt||"")}</text>`;
    default: return "";
  }
}
let VEC_UID=0, VEC_MK=0;
function vecSVG(d,opts={}){
  const uid=(++VEC_UID).toString(36), w=d.w||440, h=d.h||302;
  const order={bib:7,rect:0,ln:1,goal:2,ladder:2,hurdle:2,stake:4,pen:4,dome:4,stick:4,mk:3,cone:3,pole:4,flag:4,ball:5,balls:5,sq:6,tri:6,x:6,fig:7,d:8,txt:9};
  const its=(d.it||[]).map((it,i)=>({it,i})).sort((a,b)=>((order[a.it.t]??5)-(order[b.it.t]??5))||((a.it.z||0)-(b.it.z||0))||(a.i-b.i));
  return `<svg viewBox="0 0 ${w} ${h}"${opts.img?` width="${w}" height="${h}"`:""} style="width:100%;height:auto;display:block;border-radius:${opts.r??10}px" role="img" aria-label="Desenho do exercício" xmlns="http://www.w3.org/2000/svg">${vecDefs(uid)}${d.fld?vecField(d.fld,w,h,uid):`<rect width="${w}" height="${h}" fill="${d.bgc||VEC_GRASS[0]}"/>`}${its.map(({it})=>vecItem(it,uid)).join("")}</svg>`;
}

/* desenho a mostrar para um exercício da biblioteca: vetorial (predefinido) ou a imagem original (escolha guardada neste dispositivo) */
let EXV_MODE="v"; try{ if(localStorage.getItem(LS+":exv")==="o") EXV_MODE="o"; }catch(e){}
const EXV_URL={};
function setExvMode(m){ EXV_MODE=m==="o"?"o":"v"; try{ localStorage.setItem(LS+":exv",EXV_MODE); }catch(e){} }
// desenho vetorial em uso para o exercício (null se tiver foto própria, se não houver desenho ou se estiver a ver as originais)
const exVecOf = x => (x && x.imgk && !(x.imgA||x.imgL||x.imgG||x.img) && EXV_MODE!=="o" && EXVEC[x.imgk]) || null;
// SVG como imagem (data URL, em cache): leve nas grelhas com muitos exercícios
function exVecSrc(k){ if(EXV_MODE==="o"||!EXVEC[k]) return null;
  return EXV_URL[k] || (EXV_URL[k]="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(vecSVG(EXVEC[k],{r:0,img:1}))); }
