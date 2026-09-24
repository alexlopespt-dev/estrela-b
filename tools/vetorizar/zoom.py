"""zoom.py DIR saida.png k:x0,y0,x1,y1[:esc] ...  -> recortes ampliados com grelha de 10 px e coordenadas."""
import sys
from PIL import Image, ImageDraw
S=sys.argv[1]; out=sys.argv[2]; tiles=[]
for spec in sys.argv[3:]:
    p=spec.split(":"); k=p[0]; x0,y0,x1,y1=map(int,p[1].split(",")); e=float(p[2]) if len(p)>2 else 3
    im=Image.open(S+"ex/"+k+".png").convert("RGB").crop((x0,y0,x1,y1)); W,H=int((x1-x0)*e),int((y1-y0)*e)
    im=im.resize((W,H),Image.LANCZOS); d=ImageDraw.Draw(im)
    for x in range((x0//10+1)*10,x1,10): d.line([((x-x0)*e,0),((x-x0)*e,H)],fill=(255,255,255) if x%50==0 else (110,170,110))
    for y in range((y0//10+1)*10,y1,10): d.line([(0,(y-y0)*e),(W,(y-y0)*e)],fill=(255,255,255) if y%50==0 else (110,170,110))
    for x in range((x0//50+1)*50 if x0%50 else x0,x1,50):
        for y in range((y0//50+1)*50 if y0%50 else y0,y1,50): d.text(((x-x0)*e+2,(y-y0)*e+1),f"{x},{y}",fill=(255,255,0))
    d.text((3,H-12),k,fill=(255,0,255)); tiles.append(im)
Wt=sum(t.width for t in tiles)+8*len(tiles); Ht=max(t.height for t in tiles)
o=Image.new("RGB",(Wt,Ht),"white"); x=0
for t in tiles: o.paste(t,(x,0)); x+=t.width+8
o.save(S+out); print(o.size)
