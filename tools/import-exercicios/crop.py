import numpy as np, glob, os, sys, json
from PIL import Image
from scipy import ndimage
def green(a):
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    return ((g>60)&(g<210)&(g>r+20)&(g>b+20))
def boxes(path, minarea=60000):
    im=Image.open(path).convert("RGB"); a=np.asarray(im).astype(int)
    m=green(a)
    m=ndimage.binary_closing(m, structure=np.ones((9,9)))
    lab,n=ndimage.label(m)
    out=[]
    for sl in ndimage.find_objects(lab):
        y,x=sl; h=y.stop-y.start; w=x.stop-x.start
        if w*h<minarea or w<150 or h<100: continue
        fill=m[sl].mean()
        if fill<0.55: continue
        out.append((x.start,y.start,x.stop,y.stop))
    out.sort(key=lambda b:(round(b[1]/80), b[0]))
    return im,out
if __name__=="__main__":
    for f in sorted(sys.argv[1:]):
        im,bs=boxes(f)
        print(os.path.basename(f)[-12:-4], len(bs), [(b[2]-b[0],b[3]-b[1]) for b in bs][:6])
