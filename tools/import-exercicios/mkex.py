import json, re, os, base64, unicodedata
from names import NAMES
txt=json.load(open('ex_text.json'))
idx=json.load(open('/home/claude/ex_crops/index.json'))
def norm(s):
    s=unicodedata.normalize("NFD",s.lower()); s="".join(c for c in s if unicodedata.category(c)!="Mn")
    return re.sub(r"[^a-z0-9]+"," ",s).strip()
def cat(n):
    s=norm(n)
    rules=[("Retorno à calma",["alongament"]),
     ("Aquecimento",["dinamic","ativacao inicial","aquecimento","circuito coordenacao","estafeta"]),
     ("Bolas paradas",["bolas paradas","bola parada","cantos"]),
     ("Guarda-redes",["guarda redes","defesa de baliza","remata e defende"]),
     ("Físico",["velocidade","forca","resistencia","estacoes","escada","perseguic","caca bolas","tekball"]),
     ("Finalização",["finaliza","remates","mil remates","zonas de finaliza"]),
     ("Lúdico",["ludico","jogo do galo","crocodilo","jogo do fosso","jogo do mata","pataleca","ginga","jogo dos reis","cabeceia e defende","meinho brasileiro","cao de caca","assalto ao castelo","conquistar a base"]),
     ("Técnico",["rabias","meinho","meinhos","circuito de passe","circuito circular","circuito tecnica","passe competitivo","3 h","3 homem","bola aos apoios","competitivo de passe"]),
     ("Jogo reduzido",["jogo reduzido","competitivo","jogo formal","torneio","jogo das 4","gr 2v2","jogo gr","futebol holandes","bobby robson","jogo "]),
    ]
    for c,keys in rules:
        if any(k in s for k in keys): return c
    return "Tático"
def parse_meta(m):
    dur=None; players=""; space=[]
    for l in m:
        s=l.strip()
        if not s: continue
        ls=norm(s)
        if any(k in ls for k in ["campo","sul","topo","meio","area","baliza"]) or re.search(r"1\s*[\\/]\s*2",s):
            space.append(s); continue
        if dur is None and re.search(r"\d\s*[´'’ºx]",s):
            mm=re.findall(r"\d+",s)
            if mm:
                if re.match(r"^\s*\d+\s*x\s*\d+\s*[´'’]",s):
                    a,b=int(mm[0]),int(mm[1]); dur=a*b
                else: dur=int(mm[0])
            continue
        if not players and re.search(r"\d",s): players=s; continue
    return dur, players, " / ".join(space)[:60]
recs={}; order=[]
for key in sorted(idx):
    for fn in idx[key]:
        cid=fn[:-4]; nm=NAMES[cid]; t=txt.get(cid,{})
        obj=(t.get("obj") or "").strip(); desc=(t.get("desc") or "").strip()
        dur,players,space=parse_meta(t.get("meta") or [])
        k=norm(nm)
        img="data:image/jpeg;base64,"+base64.b64encode(open(f"/home/claude/ex_crops/{fn}","rb").read()).decode()
        r={"name":nm,"cat":cat(nm),"obj":obj,"desc":desc,"dur":dur,"players":players,"space":space,"mat":"","cp":"","pr":[],"img":img}
        if k in recs:
            old=recs[k]
            score=lambda x:(len(x["obj"])+len(x["desc"]))
            if score(r)>score(old): r["img"]=r["img"] if score(r)>0 else old["img"]; recs[k]=r
        else:
            recs[k]=r; order.append(k)
out=[recs[k] for k in order]
json.dump(out,open('ex_import.json','w'),ensure_ascii=False)
from collections import Counter
print("únicos:",len(out),"| com descrição:",sum(1 for r in out if r["desc"] or r["obj"]))
print(Counter(r["cat"] for r in out))
mb=sum(len(json.dumps(r,ensure_ascii=False)) for r in out)/1048576
print("tamanho total MB:",round(mb,2),"| maior doc KB:",max(len(json.dumps(r,ensure_ascii=False)) for r in out)//1024)
