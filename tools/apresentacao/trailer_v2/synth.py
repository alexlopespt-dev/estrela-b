# Tema "estilo Apple": piano + pads + plucks + sinos FM + baixo + batida discreta, 90 bpm, fá maior (vi–IV–I–V). 114 batidas = 76 s.
import numpy as np, wave
from scipy.signal import lfilter, fftconvolve, butter, sosfilt
SR=44100; BPM=90; BT=60/BPM; DUR=76.0; N=int(SR*DUR); rng=np.random.default_rng(5)
def zeros(): return np.zeros((N,2))
bus={k:zeros() for k in ("piano","pad","pluck","bell","bass","kick","clap","hat","fx")}
def put(b,sig,beat,g=1.0,pan=0.0):
    i=int(beat*BT*SR) if beat is not None else 0; j=min(N,i+len(sig))
    if i>=N or j<=i: return
    s=sig[:j-i]; s=s if s.ndim==2 else np.stack([s*(1-max(0,pan)),s*(1+min(0,pan))],1)
    bus[b][i:j]+=s*g
def hz(m): return 440*2**((m-69)/12)
def lp(x,fc,order=2): return sosfilt(butter(order,fc/(SR/2),'low',output='sos'),x,axis=0)
def hp(x,fc,order=2): return sosfilt(butter(order,fc/(SR/2),'high',output='sos'),x,axis=0)
def adsr(n,a,d,s,r):
    e=np.full(n,s); na,nd,nr=int(a*SR),int(d*SR),int(r*SR)
    e[:na]=np.linspace(0,1,na) if na else 1; e[na:na+nd]=np.linspace(1,s,len(e[na:na+nd]));
    if nr: e[-nr:]*=np.linspace(1,0,nr)
    return e
def saw(f,n,harm=24,det=0.0):
    t=np.arange(n)/SR; s=np.zeros(n); ph=rng.uniform(0,2*np.pi)
    for h in range(1,harm+1):
        if f*h>SR/2.3: break
        s+=np.sin(2*np.pi*f*(1+det)*h*t+ph*h)/h
    return s
# ---------- harmonia
CH={"Dm":[62,65,69],"Bb":[58,62,65],"F":[60,65,69],"C":[60,64,67]}; RT={"Dm":38,"Bb":34,"F":41,"C":36}
PROG=["Dm","Bb","F","C"]; PROG2=["Bb","C","Dm","F"]
def chord_at(b):   # acorde por batida
    if 92<=b<106: return PROG2[int((b-92)//4)%4]
    if b>=106: return "F"
    return PROG[int(b//4)%4]
# ---------- pad (serras desafinadas, filtro suave, ataque lento)
def pad(ch,b,d,g):
    n=int(d*BT*SR)+int(1.5*SR); L=np.zeros(n); R=np.zeros(n)
    for m in ch:
        for det,pan in ((-.006,-.7),(0,0),(.006,.7)):
            s=saw(hz(m),n,14,det); L+=s*(1-max(0,pan)); R+=s*(1+min(0,pan))
    env=adsr(n,.6,.4,.85,1.4); x=np.stack([L,R],1)*env[:,None]; x=lp(x,3200); put("pad",x,b,g)
# ---------- pluck (harmónicos com decaimento próprio: os agudos morrem primeiro)
def pluck(m,b,g,dec=.35,bright=1.0):
    n=int(.9*SR); t=np.arange(n)/SR; f=hz(m); s=np.zeros(n)
    for h in range(1,16):
        if f*h>SR/2.3: break
        s+=np.sin(2*np.pi*f*h*t)/h*np.exp(-t*(1/dec)*(1+.55*(h-1)/bright))
    s*=np.minimum(1,t/.003); put("pluck",s,b,g,pan=rng.uniform(-.35,.35))
# ---------- sino FM (vidro)
def bell(m,b,g,d=2.2):
    n=int(d*SR); t=np.arange(n)/SR; f=hz(m); idx=2.2*np.exp(-t*3.5)
    s=np.sin(2*np.pi*f*t+idx*np.sin(2*np.pi*f*3.5*t))*np.exp(-t*1.8)*np.minimum(1,t/.004)
    s+=.25*np.sin(2*np.pi*f*2*t)*np.exp(-t*4); put("bell",s,b,g,pan=rng.uniform(-.25,.25))
# ---------- baixo (sub + um pouco de harmónico)
def bass(m,b,d,g):
    n=int(d*BT*SR); t=np.arange(n)/SR; f=hz(m)
    s=np.sin(2*np.pi*f*t)+.25*np.sin(2*np.pi*2*f*t)+.08*saw(f,n,6)
    s=np.tanh(1.5*s)*adsr(n,.008,.12,.8,.06); put("bass",s,b,g)
# ---------- bateria
def kick(b,g=1.0):
    n=int(.5*SR); t=np.arange(n)/SR; f=48+95*np.exp(-t*35); s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*6.5)
    s+=hp(rng.standard_normal(n),3000)*np.exp(-t*120)*.15; put("kick",np.tanh(1.3*s),b,g)
def clap(b,g=1.0):
    n=int(.35*SR); t=np.arange(n)/SR; x=sosfilt(butter(2,[900/(SR/2),5200/(SR/2)],'band',output='sos'),rng.standard_normal(n))
    e=np.exp(-t*16)*.8
    for d in (0,.009,.018,.028): e+=np.where(t>=d,np.exp(-(t-d)*90),0)*.5
    put("clap",x*e,b,g)
def snap(b,g=1.0):
    n=int(.12*SR); t=np.arange(n)/SR; x=hp(rng.standard_normal(n),2500)*np.exp(-t*55)+np.sin(2*np.pi*1850*t)*np.exp(-t*80)*.4; put("clap",x,b,g,pan=.15)
def hat(b,g=1.0,op=False):
    n=int((.25 if op else .07)*SR); t=np.arange(n)/SR; x=hp(rng.standard_normal(n),7500,4)*np.exp(-t*(12 if op else 70)); put("hat",x,b,g,pan=.3)
def shaker(b,g=1.0):
    n=int(.1*SR); t=np.arange(n)/SR; x=hp(rng.standard_normal(n),5000)*np.sin(np.pi*np.minimum(1,t/.1))**2; put("hat",x,b,g,pan=-.3)
# ---------- efeitos
def riser(b,beats,g=1.0):
    n=int(beats*BT*SR); t=np.arange(n)/SR; k=(t/t[-1])**2; nz=rng.standard_normal(n)
    x=lp(nz,300)*(1-k)+hp(nz,1500)*k; tone=np.sin(2*np.pi*np.cumsum(300+1500*k)/SR)*.05; put("fx",(x*.6+tone)*k,b,g)
def swell(b,beats,g=1.0):   # "sopro" reverso antes de um tempo forte
    n=int(beats*BT*SR); t=np.arange(n)/SR; k=(t/t[-1])**3; put("fx",lp(rng.standard_normal(n),2500)*k,b,g)
def sub_drop(b,g=1.0):
    n=int(2*SR); t=np.arange(n)/SR; s=np.sin(2*np.pi*np.cumsum(60*np.exp(-t*1.2)+28)/SR)*np.exp(-t*1.4); put("fx",s,b,g)
# =========================== arranjo
# intro 0–12: pad suave; 12–24: + plucks e estalidos; 24–30: subida; 30–88 groove; 88–92 pausa; 92–106 final; 106–114 fim
for bar in range(0,6):
    c=PROG[bar%4]; pad(CH[c],bar*4,4,.10 if bar<3 else .12)
for b in np.arange(12,24,.5):
    c=chord_at(b); nts=CH[c]+[CH[c][0]+12]; pluck(nts[int(b*2)%4]+12,b,.16,dec=.25)
for b in np.arange(12,24,1): snap(b+1 if (b%2==0) else b,.35) if False else None
for b in range(13,24,2): snap(b,.4)
for b in range(12,24,4): kick(b,.45)
pad(CH["Dm"],24,6,.13); riser(24,6,.55); swell(28,2,.4)
for i,m in enumerate([72,74,77,81]): bell(m,26+i*.75,.18)
# groove 30–88
for bar in range(30,88,4):
    c=chord_at(bar); pad(CH[c],bar,4,.085)
    for k in range(4): kick(bar+k,.9)
    for k in (1,3): clap(bar+k,.55)
    for k in range(16):
        bb=bar+k*.25+(.03 if k%2 else 0)
        if bar>=38 or k%2==0: hat(bb,.22 if k%4==2 else .13)
    hat(bar+3.5,.18,op=True)
    # baixo: tónica em colcheias com ritmo
    r=RT[c]
    for (bt,d) in [(0,.75),(1,.45),(1.5,.45),(2,.75),(3,.45),(3.5,.45)]: bass(r+12 if bt==3.5 else r,bar+bt,d,.5)
    # plucks em semicolcheias (arpejo)
    nts=CH[c]+[CH[c][1]+12]
    for k in range(16):
        if k%3!=2: pluck(nts[k%4]+12,bar+k*.25,.10 if k%4 else .14,dec=.18)
# melodia de sinos a partir da batida 62 (41,3 s)
MEL=[(0,1.5,81),(1.5,.5,79),(2,1,77),(3,1,76),(4,1.5,77),(5.5,.5,76),(6,2,74),(8,1.5,72),(9.5,.5,74),(10,1,77),(11,1,79),(12,4,81)]
for rep in (62,78):
    for (bt,d,m) in MEL:
        if rep+bt<88: bell(m,rep+bt,.16,d=max(1.2,d*BT*2))
swell(86,2,.45)
for b in (30,62,92): sub_drop(b,.5)
# pausa 88–92
pad(CH["Bb"],88,4,.12); bell(84,88,.15); bell(81,89.5,.12)
riser(89,3,.45)
# final 92–106
for bar in range(92,106,4):
    c=chord_at(bar); pad([m+12 for m in CH[c]]+CH[c],bar,4,.07)
    for k in range(4): kick(bar+k,1.0)
    for k in (1,3): clap(bar+k,.6)
    for k in range(16): hat(bar+k*.25+(.03 if k%2 else 0),.22 if k%4==2 else .14)
    for k in range(8): shaker(bar+k*.5+.25,.12)
    r=RT[c]
    for (bt,d) in [(0,.75),(1,.45),(1.5,.45),(2,.75),(3,.45),(3.5,.45)]: bass(r,bar+bt,d,.55)
    nts=CH[c]+[CH[c][1]+12]
    for k in range(16): pluck(nts[k%4]+24 if k%8>5 else nts[k%4]+12,bar+k*.25,.12,dec=.2)
for (bt,d,m) in MEL[:11]: bell(m+12 if m<80 else m,92+bt,.15,d=2)
swell(104,2,.4)
# fim 106–114
pad([53,60,65,69,72],106,8,.12); bass(29+12,106,6,.45); kick(106,.8); sub_drop(106,.5)
for i,m in enumerate([84,81,77,72]): bell(m,107+i*.75,.13,d=3)
# =========================== mistura
pn=np.frombuffer(open("piano.wav","rb").read()[44:],np.int16).reshape(-1,2).astype(np.float64)/32768
pn=pn[:N] if len(pn)>=N else np.vstack([pn,np.zeros((N-len(pn),2))]); bus["piano"]=pn*1.0
# reverb de convolução (sala clara, 2,4 s)
n=int(2.4*SR); t=np.arange(n)/SR; ir=rng.standard_normal((n,2))*np.exp(-t*2.9)[:,None]; ir=lp(ir,6500); ir[:int(.012*SR)]=0; ir/=np.abs(ir).sum(0)/12
def verb(x,amt): return x+amt*np.stack([fftconvolve(x[:,c],ir[:,c])[:N] for c in (0,1)],1)
# sidechain: o kick "empurra" pad, baixo e plucks
kenv=np.abs(bus["kick"]).max(1); kenv=lfilter([1-np.exp(-1/(SR*.08))],[1,-np.exp(-1/(SR*.08))],kenv>0.05)
duck=1-.55*np.clip(kenv,0,1)
for k in ("pad","bass","pluck"): bus[k]*=duck[:,None]
G={"piano":.6,"pad":1.0,"pluck":1.15,"bell":.9,"bass":.42,"kick":.5,"clap":.75,"hat":1.1,"fx":.55}
V={"piano":.35,"pad":.5,"pluck":.35,"bell":.6,"bass":0,"kick":.05,"clap":.3,"hat":.1,"fx":.3}
mix=np.zeros((N,2))
for k,x in bus.items(): mix+=verb(hp(x,30),V[k])*G[k] if V[k] else hp(x,25)*G[k]
mix=hp(mix,28)
mix=mix+0.45*hp(mix,3500,2)+0.25*hp(mix,9000,2)   # brilho / ar
# automação por secção (intro calma, pausa antes do final)
pts=[(0,.42),(8,.42),(8.01,.55),(16,.6),(19.9,.8),(20,1.0),(58.3,1.0),(58.67,.55),(61.2,.6),(61.33,1.08),(70.5,1.08),(70.67,.85),(76,.85)]
tt=np.arange(N)/SR; auto=np.interp(tt,[p[0] for p in pts],[p[1] for p in pts]); mix*=auto[:,None]
# compressão suave + limitador
env=np.sqrt(lfilter([1-np.exp(-1/(SR*.05))],[1,-np.exp(-1/(SR*.05))],(mix**2).mean(1)))
thr=np.percentile(env,85); gain=np.where(env>thr,(thr+(env-thr)/2.2)/np.maximum(env,1e-9),1.0); mix*=gain[:,None]
mix/=np.abs(mix).max(); mix=np.tanh(1.4*mix)/np.tanh(1.4)*.92
fade=np.ones(N); fade[-int(3*SR):]=np.linspace(1,0,int(3*SR))**1.5; fade[:int(.02*SR)]=np.linspace(0,1,int(.02*SR)); mix*=fade[:,None]
o=wave.open("musica_apple.wav","wb"); o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((mix*32767).astype(np.int16).tobytes()); o.close()
for a in range(0,76,4): s=mix[a*SR:(a+4)*SR]; print(a, round(float(np.sqrt((s**2).mean())),3), end=" | ")

from scipy.signal import welch
for a,b in ((2,8),(30,40),(62,70)):
    f,P=welch(mix[a*SR:b*SR,0],SR,nperseg=8192); tot=P.sum()
    print("\n",a,b,{k:round(float(P[(f>=lo)&(f<hi)].sum()/tot),3) for k,(lo,hi) in {"sub<80":(0,80),"80-300":(80,300),"300-2k":(300,2000),"2k-8k":(2000,8000),">8k":(8000,22050)}.items()})
