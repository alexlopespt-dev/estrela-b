# Dados de demonstração só para as capturas (não vão para o repositório)
import json, random, datetime as dt
random.seed(7)
def D(s): return dt.date.fromisoformat(s)
def iso(d): return d.isoformat()
def demo(db):
    pl=[k for k,p in db["players"].items() if not p.get("archived")]
    P=db["players"]
    full={"Abbiati":"Tiago Castro","Rocha":"Tomás Rocha","Valério":"Miguel Valério","Rafa S.":"Rafael Silva","Rafa F.":"Rafael Ferreira","Bruno M.":"Bruno Mendes","Yannick":"Yannick Santos",
          "Couceiro":"João Couceiro","Alves":"Tiago Alves","Martim":"Martim Correia","Zava":"Renato Zava","Noam":"Noam Kalifa","Rodrigo S.":"Rodrigo Sousa","Francisco":"Francisco Magalhães",
          "Luís A.":"Luís Aguiar","Miguel":"Miguel Pereira","Kenzo":"Kenzo Livramento","Pirlo":"Guilherme Pereira","Chidera":"Chidera Okafor","Manuel P.":"Manuel Pinto","Helmer":"Helmer Costa",
          "Grilo":"Diogo Grilo","Cambraia":"André Cambraia","Bruno V.":"Bruno Vunge","Zé Ramos":"José Ramos","Rui":"Rui Lopes"}
    for k,p in P.items():
        if p["name"] in full: p["full"]=full[p["name"]]
    ex=db["exercises"]; exk=list(ex.keys())
    prin=db.get("principles",{}); byMom={}
    for k,p in prin.items(): byMom.setdefault(p.get("moment"),[]).append(k)
    moms=["oo","od","tro","trd","fbp"]
    # ciclos
    db["cycles"]["cy_meso1"]={"kind":"meso","name":"Mesociclo 2 — Competição","start":"2026-09-14","end":"2026-10-11","period":"Competitivo","obj":"Consolidar a organização ofensiva e a pressão após perda","notes":""}
    themes=[("Saída curta a 3 e ligação ao corredor","oo"),("Pressão alta e reação à perda","trd"),("Bloco médio e coberturas","od"),("Ataque rápido após recuperação","tro"),("Bolas paradas ofensivas","fbp"),("Circulação e variação de corredor","oo"),("Contenção e basculação","od"),("Finalização e ataque à área","oo")]
    ints=["Média","Alta","Muito alta","Baixa"]; tts=["fp","res","pj","vel","pos","rec"]
    tid=0
    for w,mon in enumerate(["2026-09-07","2026-09-14","2026-09-21","2026-09-28"]):
        m=D(mon)
        db["cycles"][f"cy_mi{w}"]={"kind":"micro","name":f"Microciclo {w+1}","start":mon,"end":iso(m+dt.timedelta(6)),"period":"Competitivo" if w else "Preparatório","obj":themes[w*2][0],"notes":""}
        for d_i,intens,tt in [(1,"Média","fp"),(2,"Alta","pj"),(3,"Muito alta","res"),(4,"Baixa","vel")]:
            day=m+dt.timedelta(d_i); tid+=1; th,mom=themes[(w*4+d_i)%len(themes)]
            plan=[]; used=set()
            for bi,(mn) in enumerate([15,20,25,20,15]):
                x=random.choice(exk)
                while x in used: x=random.choice(exk)
                used.add(x); mm=random.choice(moms) if bi else mom
                prs=random.sample(byMom.get(mm,[]),min(2,len(byMom.get(mm,[])))) if bi in (1,2,3) else []
                plan.append({"ex":x,"name":ex[x]["name"],"min":mn,"pr":prs,"mom":[mm]})
            past=day<=D("2026-09-25")
            att={}; pev={}
            if past:
                for p in pl:
                    r=random.random(); s="P" if r>.12 else random.choice(["FJ","AT","L","FI"])
                    att[p]={"s":s,"rpe":random.choice([4,5,5,6,6,7,7,8]) if s in("P","AT") else None}
                for p in random.sample(pl,6): pev[p]={"r":random.choice([6,6.5,7,7.5,8,8.5]),"t":random.choice(["Muito intenso na pressão","Boa leitura nas coberturas","Tem de acelerar a decisão","Excelente atitude",""])}
            db["events"][f"tr_demo{tid}"]={"type":"treino","date":iso(day),"time":"19:30","dur":95,"place":"Estádio José Gomes — sintético","theme":th,"int":intens,"ttype":tt,"clima":"Ameno sem chuva","mat":"Bolas, coletes, cones, 2 balizas",
               "objG":"Melhorar a qualidade da circulação","objE":th,"plan":plan,"att":att,"satt":{},"pev":pev,"closed":past,"notes":"Boa resposta do grupo, intensidade alta nos jogos reduzidos." if past else ""}
    # jogo 2 (convocatória)
    g=db["events"].get("jg_2627_j2")
    if g:
        call=[p for p in pl if P[p]["name"] not in ("Rui","Khan","Cambraia","Zé Ramos","Helmer","Manuel P.")][:18]
        g.update({"call":call,"xi":call[:11],"place":"Estádio José Gomes","meetT":"13:15","meetP":"Estádio José Gomes","comp":"III Divisão Distrital","cobs":{call[9]:"Capitão"}})
    # lesões
    h=[k for k in pl if P[k]["name"]=="Helmer"][0]; mp=[k for k in pl if P[k]["name"]=="Manuel P."][0]
    db["injuries"]["in_d1"]={"trt":[{"id":"t1","date":"2026-09-19","by":"Fisioterapeuta","desc":"Crioterapia e mobilização","evo":"Menos dor","pain":"4"}],"pid":h,"date":"2026-09-17","ctx":"Treino","type":"Muscular","zone":"Posterior da coxa","side":"Direito","sev":"Moderada (8 a 28 dias)","diag":"Rotura grau I bicípite femoral","exp":"2026-10-05","status":"ativa","ret":"","plan":[{"t":"Fisioterapia diária","done":True},{"t":"Corrida contínua","done":False},{"t":"Treino condicionado","done":False},{"t":"Treino integrado","done":False}],"notes":""}
    db["injuries"]["in_d2"]={"trt":[],"pid":mp,"date":"2026-09-22","ctx":"Jogo","type":"Contusão","zone":"Tornozelo","side":"Esquerdo","sev":"Ligeira (até 7 dias)","diag":"Entorse ligeira","exp":"2026-09-29","status":"condicionado","ret":"","plan":[{"t":"Reforço propriocetivo","done":True}],"notes":""}
    # testes físicos (setembro)
    for tk,t in db["tests"].items():
        t["res"]={p:{"vel":round(random.uniform(4.05,4.6),2),"salto":random.randint(205,255),"t":round(random.uniform(9.2,10.4),2),"vaivem":random.choice([15.2,16.1,16.4,17.3,17.8,18.2,18.5])} for p in pl if P[p]["pos"]!="GR" or random.random()<.5}
    # avaliações
    for i,p in enumerate(pl[:8]):
        v={a:{k:random.choice([6,6.5,7,7.5,8,8.5]) for k in ks} for a,ks in {"tec":["Passe","Receção e controlo","Condução","Finalização"],"tat":["Posicionamento","Leitura de jogo","Tomada de decisão","Transições"],"fis":["Velocidade","Resistência","Força","Explosão"],"psi":["Concentração","Competitividade","Resiliência","Liderança"]}.items()}
        db["evals"][f"av_d{i}"]={"pid":p,"date":"2026-09-15","by":"Miguel Motta","v":v,"str":"Qualidade no primeiro passe","weak":"Duelos defensivos","fin":"Em crescimento"}
    # scouting
    db["scout"]["sc_d1"]={"name":"Rúben Marques","club":"Real SC Sub-19","pos":"MC","year":"2007","foot":"Direito","esc":"","st":"prio","contact":"","notes":"","reps":[{"id":"r1","date":"2026-09-13","by":"Tiago Ferreira","game":"Real SC vs Casa Pia (Sub-19)","cur":"4","pot":"5","rec":"Contratar","str":"Orientação corporal, passe vertical","weak":"Jogo aéreo","txt":"Destaque do jogo."}]}
    db["scout"]["sc_d2"]={"name":"Diogo Neves","club":"Oeiras","pos":"EXT","year":"2006","foot":"Esquerdo","esc":"","st":"obs","contact":"","notes":"","reps":[{"id":"r2","date":"2026-09-20","by":"Alexandre Lopes","game":"Oeiras vs Loures","cur":"3","pot":"4","rec":"Seguir","str":"1x1 e aceleração","weak":"Decisão no último terço","txt":""}]}
    # adversário CAC
    for k,o in db["opponents"].items():
        if o["name"]=="CAC":
            o.update({"formation":"4-4-2","style":"Bloco médio","strong":"Transições rápidas pelos corredores\nBolas paradas ofensivas","weak":"Espaço entre linhas quando pressiona\nLateral direito subido","plan":"Atrair a pressão e ligar no terceiro homem; atacar a profundidade nas costas do lateral direito.",
                      "keys":[{"n":"9","name":"Avançado centro","pos":"PL","foot":"D","notes":"Forte no jogo aéreo"},{"n":"10","name":"Médio ofensivo","pos":"MO","foot":"E","notes":"Remate de meia distância"}]})
    return db
