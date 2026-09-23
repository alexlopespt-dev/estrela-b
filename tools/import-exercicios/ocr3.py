import glob, os, json, re
from PIL import Image
import pytesseract
from crop import boxes
from names import NAMES
HEAD=("objetivo(s)","descrição e","descricao e","organização metodológica","organizacao")
def clean(t, wide_ok=False):
    lines=[]
    for l in t.split("\n"):
        s=l.strip()
        if any(h in s.lower() for h in HEAD): continue
        if re.fullmatch(r"[|\-—_.,:;'\"´`()\[\] ]*", s): 
            if lines and lines[-1]!="": lines.append("")
            continue
        lines.append(s)
    while lines and not lines[0]: lines.pop(0)
    while lines and not lines[-1]: lines.pop()
    return re.sub(r"\n{3,}","\n\n","\n".join(lines)).strip()
def ocr(im, box):
    c=im.crop(box); c=c.resize((c.size[0]*2,c.size[1]*2), Image.LANCZOS)
    return pytesseract.image_to_string(c, lang='por')
def meta_box(im, x0,y1,x1,bot):
    reg=(max(0,x0-60), y1, min(im.size[0],x1+60), bot)
    c=im.crop(reg); c=c.resize((c.size[0]*2,c.size[1]*2), Image.LANCZOS)
    d=pytesseract.image_to_data(c, lang='por', output_type=pytesseract.Output.DICT)
    xs=[]
    for i,t in enumerate(d["text"]):
        s=t.strip().lower()
        if s in ("tempo","número","numero","espaço","espaco") and int(d["conf"][i])>30:
            xs += [d["left"][i]/2+reg[0], (d["left"][i]+d["width"][i])/2+reg[0]]
    if len(xs)<2: return None
    return int(min(xs))-14, int(max(xs))+14
out={}
for f in sorted(glob.glob('/mnt/user-data/uploads/Captura_de_ecra__2026-09-23*.png')):
    key=os.path.basename(f)[-12:-4]
    if key.startswith("08_09"): continue
    im,bs=boxes(f); H,W=im.size[1],im.size[0]
    for i,(x0,y0,x1,y1) in enumerate(bs):
        cid=f"{key}_{i+1:02d}"
        bot=min(bs[i+1][1]-70 if i+1<len(bs) else H, y1+620, H)
        if bot-y1<60: out[cid]={"obj":"","desc":"","meta":[]}; continue
        w=x1-x0
        mb=meta_box(im,x0,y1,x1,bot)
        if not mb or not (x0+0.30*w < mb[0] < x0+0.70*w) or (mb[1]-mb[0])>0.28*w or mb[1]<=mb[0]:
            mb=(x0+int(w*0.44), x0+int(w*0.535))
        o=clean(ocr(im,(max(0,x0-60), y1, mb[0], bot)))
        d=clean(ocr(im,(mb[1], y1, min(W,x1+60), bot)))
        m=[l.strip() for l in ocr(im,(mb[0],y1,mb[1],bot)).split("\n") if l.strip() and l.strip().lower() not in ("tempo","número","numero","espaço","espaco")]
        out[cid]={"obj":o,"desc":d,"meta":m}
json.dump(out,open('ex_text.json','w'),ensure_ascii=False)
print("com texto:",sum(1 for v in out.values() if v["desc"] or v["obj"]))
for cid in ["08_15_19_02","08_16_29_03","08_22_14_02","08_17_54_01"]:
    v=out[cid]; print("\n===",NAMES[cid],"| meta:",v["meta"][:6]); print("OBJ:",v["obj"][:200]); print("DESC:",v["desc"][:330])
