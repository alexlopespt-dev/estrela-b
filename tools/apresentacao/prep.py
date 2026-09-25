from PIL import Image, ImageDraw, ImageFilter
import os
S=os.path.dirname(os.path.abspath(__file__)); SH=S+"/../shots/"; O=S+"/img/"
CAP="/home/user/estrela-b/tests/capturas/"
def rr_mask(w,h,r):
    m=Image.new("L",(w,h),0); ImageDraw.Draw(m).rounded_rectangle((0,0,w-1,h-1),r,fill=255); return m
def shadowed(im,r=28,pad=60,blur=28,op=110):
    w,h=im.size; out=Image.new("RGBA",(w+pad*2,h+pad*2),(0,0,0,0))
    sh=Image.new("RGBA",out.size,(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((pad,pad+14,pad+w,pad+h+14),r,fill=(20,4,8,op)); sh=sh.filter(ImageFilter.GaussianBlur(blur))
    out.alpha_composite(sh); im=im.convert("RGBA"); im.putalpha(rr_mask(w,h,r)); out.alpha_composite(im,(pad,pad)); return out
def browser(im,scale=1.0):   # janela de browser
    im=im.convert("RGB"); w,h=im.size; bar=int(64*scale)
    f=Image.new("RGB",(w,h+bar),(34,24,28)); d=ImageDraw.Draw(f)
    for i,c in enumerate([(255,95,87),(254,188,46),(40,200,64)]): d.ellipse((28+i*40,bar//2-10,48+i*40,bar//2+10),fill=c)
    d.rounded_rectangle((w*0.3,bar*0.22,w*0.7,bar*0.78),14,fill=(58,44,50))
    f.paste(im,(0,bar)); return shadowed(f,r=26)
def device(im,bezel=36,r=90,col=(18,14,16)):
    im=im.convert("RGB"); w,h=im.size; f=Image.new("RGBA",(w+bezel*2,h+bezel*2),(0,0,0,0))
    ImageDraw.Draw(f).rounded_rectangle((0,0,w+bezel*2-1,h+bezel*2-1),r,fill=col+(255,))
    i2=im.convert("RGBA"); i2.putalpha(rr_mask(w,h,max(10,r-bezel))); f.alpha_composite(i2,(bezel,bezel))
    return shadowed(f,r=r,pad=70,blur=34,op=120)
def crop(name,box=None):
    im=Image.open(SH+name+".png")
    return im.crop(box) if box else im
def save(im,name,maxw=2200):
    if im.width>maxw: im=im.resize((maxw,int(im.height*maxw/im.width)),Image.LANCZOS)
    im.save(O+name+".png",optimize=True); print(name,im.size)
save(browser(crop("01_painel")),"painel")
save(browser(crop("04_treino")),"treino")
save(browser(crop("05b_momentos",(0,0,2880,1300))),"momentos")
save(browser(crop("05c_carga",(0,0,2880,1300))),"carga")
save(browser(crop("06_modelo")),"modelo")
save(browser(crop("07_exercicios")),"exercicios")
save(shadowed(crop("08_exercicio",(870,40,1950,1800)),r=24),"exercicio")
save(browser(crop("09_jogo")),"jogo")
save(browser(crop("10b_docs")),"docs")
save(browser(crop("12_quadro")),"quadro")
save(browser(crop("17_monitorizacao")),"monitorizacao")
save(browser(crop("16_clinico")),"clinico")
save(browser(crop("15_testes")),"testes")
save(browser(crop("14_atleta")),"atleta")
save(browser(crop("18_scouting",(0,0,2880,1000))),"scouting")
save(browser(crop("19_adversarios")),"adversarios")
save(browser(crop("20_estatisticas")),"estatisticas")
save(device(crop("21_ipad_escuro"),bezel=44,r=70),"ipad")
save(device(crop("23_iphone"),bezel=34,r=120),"iphone",maxw=900)
save(device(crop("24_iphone_jogo"),bezel=34,r=120),"iphone_jogo",maxw=900)
c=Image.open(CAP+"t29_conv.png"); save(shadowed(c.resize((c.width//2,c.height//2)),r=16),"doc_conv",maxw=1000)
h=Image.open(CAP+"t29_hor.jpg"); save(shadowed(h.resize((h.width//2,h.height//2)),r=16),"doc_hor",maxw=1000)
