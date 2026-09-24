"""Folha de comparação: original | vetorial (1x, sem grelha), 4 exercícios por folha. Monta os finais antes."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
import rascunho
from render import Renderer
S=sys.argv[1]; ks=sys.argv[2:]; os.makedirs(S+"final",exist_ok=True)
R=Renderer(scale=2)
out=Image.new("RGB",(890,4*322),"white"); dr=ImageDraw.Draw(out)
for i,k in enumerate(ks[:4]):
    d=rascunho.montar(S,k); json.dump(d,open(S+"final/"+k+".json","w"))
    w,h=d.get("w",440),d.get("h",302)
    o=Image.open(S+"ex/"+k+".png").convert("RGB")
    v=Image.fromarray(R.render(d)).resize((w,h),Image.LANCZOS)
    y=i*322+16; out.paste(o,(0,y)); out.paste(v,(450,y)); dr.text((4,i*322+2),f"{k}  ({len(d['it'])} itens)",fill="black")
R.close(); out.save(S+"cmp.png"); print("ok",ks)
