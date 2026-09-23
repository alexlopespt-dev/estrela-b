"""Gera tests/monitorizacao_exemplo.json — resumo no formato do doGet do Apps Script (tools/apps-script/ligacao_app.gs).
Os valores de bem-estar e carga vêm de uma captura do separador "· Jogadores" (23/09/2026); a prontidão e as séries são inventadas."""
import json, os, random
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows="""Abbiati|0.71|3.23|3.09|3.66|18|-0.66|Fadiga (2.7)|recupera bem na folga (+0.47 em 3 folgas)|2520|1103|2.29|1.39|3492|Normal|PICO DE CARGA
Bruno M.|0.86|3.75|3.46|3.82|22|-0.14|Fadiga (3.5)|recupera pouco na folga (+0.21 em 4 folgas)|2430|2175|1.12|1.14|2767|Normal|Normal
Bruno Vunge|1|4.42|4.21|3.68|15|1.22|Fadiga (4.0)|folga não altera nada (+0.00 em 2 folgas)|1440|450|3.2|1.03|1486|Normal|PICO DE CARGA
Cambraia|0.57|3.58|3.56|3.56|4||Stress (3.0)|sai da folga pior do que entrou (-0.50 em 1 folga)|240|60|4|0.38|91|Tratamento|indisponível
Chidera|0||||12|||folga não altera nada (+0.00 em 1 folga)|540|1253|0.43|0.38|204|sem resposta|Carga baixa
Couceiro|1|3.67|3.61|3.55|24|0.47|Stress (3.0)|sai da folga pior do que entrou (-0.16 em 4 folgas)|1650|1845|0.89|1.43|2361|Normal|Normal
Francisco|1|3.5|3.57|3.3|24|0.48|Sono (2.7)|folga não altera nada (-0.08 em 4 folgas)|630|713|0.88|0.65|412|Normal|Normal
Grilo|1|3.08|2.93|3.23|25|-0.33|Sono (2.7)|recupera pouco na folga (+0.29 em 4 folgas)|720|1530|0.47|0.38|272|Normal|Carga baixa
Helmer|0.86|3.5|3.46|3.19|21|0.77|Sono (3.0)|folga não altera nada (-0.06 em 4 folgas)|1320|1260|1.05|1|1319|Normal|Normal
Hugo R.|1|4.17|4.21|3.95|24|0.46|Sono (3.7)|folga não altera nada (-0.08 em 4 folgas)|1260|1553|0.81|1.04|1316|Normal|Carga baixa
Jota|0||||11|||sem folga com resposta antes e depois|0|840|0|||Fora|indisponível
Kenzo|1|3.09|3.22|3.06|21|0.09|Stress (2.0)|sai da folga pior do que entrou (-0.11 em 4 folgas)|1440|1335|1.08|0.89|1284|Normal|Normal
Khan|0.86|3.75|3.79|3.66|20|0.22|Dor musc. (2.7)|sai da folga pior do que entrou (-0.14 em 4 folgas)|1230|1245|0.99|1.15|1409|Normal|Normal
Luís A.|1|4.25|4.07|3.8|24|0.85|Sono (4.0)|folga não altera nada (+0.09 em 4 folgas)|1770|1410|1.26|1.11|1971|Normal|A subir
Manuel P.|0.86|2.83|2.79|2.95|22|-0.21|Dor musc. (2.3)|sai da folga pior do que entrou (-0.17 em 4 folgas)|0|923|0|||Lesionado|indisponível
Martim|1|3.17|3.18|3.19|14|-0.06|Fadiga (2.0)|recupera pouco na folga (+0.34 em 2 folgas)|1620|1215|1.33|1.05|1707|Normal|A subir
Miguel|1|2.75|2.86|3.03|25|-0.83|Fadiga (2.0)|recupera pouco na folga (+0.15 em 4 folgas)|2610|2970|0.88|1.37|3576|Atenção|Normal
Miguel Valério|1|3.59|4.04|4.2|18|-1.33|Fadiga (2.7)|recupera pouco na folga (+0.21 em 4 folgas)|1800|1043|1.73|1.3|2345|Atenção|PICO DE CARGA
Noam|1|3.25|3.37|3.14|24|0.22|Fadiga (3.0)|sai da folga pior do que entrou (-0.29 em 4 folgas)|2130|1770|1.2|1.17|2492|Normal|Normal
Pirlo|1|4.09|4.14|3.91|23|0.52|Sono (3.3)|folga não altera nada (+0.09 em 4 folgas)|2340|1718|1.36|1.35|3159|Normal|A subir
Rafa F.|1|3.17|3.36|3.42|25|-0.77|Fadiga (2.7)|folga não altera nada (+0.09 em 4 folgas)|2430|2588|0.94|1.3|3158|Normal|Normal
Rafa S.|0.86|3.75|3.88|3.8|22|-0.14|Sono (3.3)|sai da folga pior do que entrou (-0.22 em 4 folgas)|1980|1770|1.12|1.3|2582|Normal|Normal
Rodrigo S.|1|3.92|3.84|3.8|24|0.28|Sono (3.3)|recupera pouco na folga (+0.27 em 4 folgas)|2340|2340|1|1.29|3028|Normal|Normal
Rui|0.43|4.75|4.42|4.2|17|1.21|Stress (4.0)|recupera pouco na folga (+0.25 em 1 folga)|360|975|0.37|0.38|136|Normal|Carga baixa"""
f=lambda x: None if x=="" else float(x)
random.seed(3); js=[]
for r in rows.split("\n"):
    nome,ad,b3,b7,base,nr,z,crit,folga,c7,cr,acwr,mono,strain,eb,ec=r.split("|")
    est={"Tratamento":"Tratamento","Lesionado":"Lesionado","Fora":"Fora"}.get(eb,"Disponível")
    ind=est!="Disponível"; b3v=f(b3)
    pr=None if ind or b3v is None else int(max(15,min(95,(b3v-1.5)/3*80+(20 if eb=="Normal" else 0))))
    js.append({"nome":nome,"posicao":"GR" if nome in("Abbiati","Noam","Rui") else "Campo","estado":est,"estadoNota":"",
      "prontidao":pr,"prontidaoPorque":est.lower() if ind else ("sem resposta recente" if b3v is None else "dor muscular 55, bem-estar 60"),
      "faixa":"sem dados" if pr is None else "Excelente" if pr>=80 else "Bom" if pr>=65 else "Aceitável" if pr>=50 else "Baixo" if pr>=35 else "Crítico",
      "condicao":None if ind else 70,"condicaoPorque":"histórico insuf." if ind else "consistência 60, tendência 72",
      "confianca":"Alta" if f(ad)==1 else "Média" if (f(ad) or 0)>0.5 else "Baixa","confiancaPorque":"base sólida",
      "bem3":b3v,"bem7":f(b7),"base":f(base),"z":f(z),"nResp":int(nr),"adesao":f(ad),"critico":crit,"dor3":3.2,
      "carga7":f(c7),"cronica":f(cr),"acwr":f(acwr),"monotonia":f(mono),"strain":f(strain),"recup7":None,"trat7":None,
      "cargaAlta":(f(c7) or 0)>1500,"cargaTopo":(f(c7) or 0)>=2340,"estadoBem":eb,"estadoCarga":ec,
      "prio":(2.5 if ec=="PICO DE CARGA" else 1 if ec=="A subir" else 0)+(1.5 if eb=="Atenção" else 0),
      "leitura":"Carga a subir depressa demais face ao habitual. Aliviar volume em MD-4/MD-3." if ec=="PICO DE CARGA" else ("Ligeira degradação. Item a vigiar: "+crit.split(" (")[0]+".") if eb=="Atenção" else "Sem sinais de alerta.",
      "folga":folga,
      "serieBem":[None if i%7==5 else round(random.uniform(2.6,4.4),2) for i in range(14)] if b3v else [None]*14,
      "serieCarga":[0 if i%7 in (0,5) else round(random.uniform(150,650)) for i in range(14)]})
d={"v":1,"atualizado":"2026-09-23T08:15:00","hoje":"2026-09-23","diasAtraso":0,"md":{"etiqueta":"MD-4","falta":4,"desdeJogo":3,"folga":False},
   "limiarCarga":1500,"preEpoca":False,"acwrFiavel":True,"diasHist":36,"p80Carga":2340,
   "dias":[f"2026-09-{x:02d}" for x in range(10,24)],"folga":[i%7 in (0,5) for i in range(14)],"jogadores":js}
json.dump(d,open(os.path.join(ROOT,"tests","monitorizacao_exemplo.json"),"w"),ensure_ascii=False)
print(len(js),"jogadores")
