import numpy as np, json, glob, os, sys
from PIL import Image, ImageDraw
import campo2 as C, campo3
S=sys.argv[1]
res={}
for f in sorted(glob.glob(S+"exi*.png")):
    k=os.path.basename(f)[:-4]; a=np.asarray(Image.open(f).convert("RGB"))
    if a.shape!=(302,440,3): continue
    r=campo3.fit(a); res[k]=r; print(k,r["ori"],[round(x,2) for x in r["p"]],round(r["cost"],3),flush=True)
json.dump(res,open(S+"campos.json","w"),indent=0)
ks=sorted(res)
for s0 in range(0,len(ks),12):
    sh=Image.new("RGB",(880,302*6),"white")
    for i,k in enumerate(ks[s0:s0+12]):
        a=np.asarray(Image.open(S+k+".png").convert("RGB")); im=Image.fromarray(a); d=ImageDraw.Draw(im)
        d.point([tuple(x) for x in C.img_pts(res[k])],fill=(255,0,255)); d.text((4,4),k,fill="yellow")
        sh.paste(im,((i%2)*440,(i//2)*302))
    sh.save(S+f"fitsheet{s0//12:02d}.png")
