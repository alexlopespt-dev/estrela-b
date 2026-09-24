"""Monta o desenho final (rascunho + manual/k.json) e gera a folha de comparação DIR/fin/k.png."""
import json, os, sys
import numpy as np
from PIL import Image
import rascunho
from render import Renderer
S=sys.argv[1]; os.makedirs(S+"fin",exist_ok=True); os.makedirs(S+"final",exist_ok=True)
R=Renderer(scale=2)
for k in sys.argv[2:]:
    d=rascunho.montar(S,k); json.dump(d,open(S+"final/"+k+".json","w"))
    rascunho.sheet(S,k,d,R,None,tag="fin")
    # diferença média a 1x (sem o botão), só como indicador
    print(k, len(d["it"]), "itens")
R.close()
