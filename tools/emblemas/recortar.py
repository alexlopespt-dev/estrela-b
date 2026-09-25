# Recorta emblemas enviados pela equipa (fundo de cor lisa com cantos arredondados) -> PNG transparente
# Uso: python3 tools/emblemas/recortar.py imagem.png "Nome" [imagem2.png "Nome2" ...]  (atualiza data/emblemas_adversarios.json)
import sys, json, base64, io, os
from PIL import Image, ImageDraw
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
J=os.path.join(ROOT,"data","emblemas_adversarios.json")
def recortar(path, tam=96, thr=38):
    im=Image.open(path).convert("RGBA"); w,h=im.size
    # tira tudo o que é da cor do fundo e está ligado às margens (flood fill a partir de toda a margem)
    bg=im.getpixel((12,h//2)); mark=(255,0,255,0)
    seeds=[(x,y) for x in range(0,w,6) for y in (3,h-4)]+[(x,y) for y in range(0,h,6) for x in (3,w-4)]
    for s in seeds:
        p=im.getpixel(s)
        if p[3]==0: continue
        if sum(abs(a-b) for a,b in zip(p[:3],bg[:3]))<thr*3 or p[:3]==(255,255,255): ImageDraw.floodfill(im,s,mark,thresh=thr)
    px=im.load()
    for y in range(h):
        for x in range(w):
            if px[x,y]==mark: px[x,y]=(0,0,0,0)
    im=im.crop(im.getbbox()); im.thumbnail((tam,tam),Image.LANCZOS)
    b=io.BytesIO(); im.save(b,"PNG",optimize=True); return "data:image/png;base64,"+base64.b64encode(b.getvalue()).decode(), im
if __name__=="__main__":
    d=json.load(open(J)); a=sys.argv[1:]
    for p,n in zip(a[::2],a[1::2]):
        if n not in d: sys.exit("nome desconhecido: "+n)
        d[n],_=recortar(p); print(n, len(d[n])//1024, "KB")
    json.dump(d,open(J,"w"),ensure_ascii=False)
