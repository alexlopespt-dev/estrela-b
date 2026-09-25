import numpy as np, wave
SR=44100; DUR=60; N=SR*DUR; t=np.arange(N)/SR; B=0.5   # 120 bpm
L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(3)
def add(sig,start,gain=1.0,pan=0.0):
    i=int(start*SR); j=min(N,i+len(sig));
    if i>=N: return
    s=sig[:j-i]*gain; L[i:j]+=s*(1-max(0,pan)); R[i:j]+=s*(1+min(0,pan))
def lp(x,fc):
    a=np.exp(-2*np.pi*fc/SR); y=np.zeros_like(x); acc=0.0
    for k in range(len(x)): acc=(1-a)*x[k]+a*acc; y[k]=acc
    return y
def env(n,a,d):
    e=np.ones(n); na=int(a*SR); e[:na]=np.linspace(0,1,na) if na else 1; e*=np.exp(-np.arange(n)/SR/d); return e
def kick(g=1):
    n=int(.45*SR); tt=np.arange(n)/SR; f=45+110*np.exp(-tt*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-tt*7)*g
NOISE=rng.standard_normal(SR*2)
def hat(): n=int(.06*SR); x=NOISE[:n]-lp(NOISE[:n],7000); return x*np.exp(-np.arange(n)/SR*60)*.5
def clap():
    n=int(.25*SR); x=NOISE[:n]; x=lp(x,3000)-lp(x,900); e=np.exp(-np.arange(n)/SR*14)
    for d in (0,.012,.024): e[int(d*SR):]+=0.4*np.exp(-np.arange(n-int(d*SR))/SR*60)
    return x*e*2.2
def boom(g=1):
    n=int(2.5*SR); tt=np.arange(n)/SR; f=38+60*np.exp(-tt*6); s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*1.6)
    nz=lp(rng.standard_normal(n),1800)*np.exp(-tt*5)*.6; return (s+nz)*g
def riser(d,g=1):
    n=int(d*SR); tt=np.arange(n)/SR; x=rng.standard_normal(n); lo=lp(x,300); hi=lp(x,4000)
    k=(tt/d)**2; return ((hi*k+lo*(1-k))*k*1.6)*g
def whoosh(g=.5):
    n=int(.6*SR); tt=np.arange(n)/SR; x=lp(rng.standard_normal(n),2500); e=np.sin(np.pi*tt/.6)**2; return x*e*g
def note(f,d,g=1,det=0.004,a=.02,dec=None,bright=1.0):
    n=int(d*SR); tt=np.arange(n)/SR; s=np.zeros(n)
    for dd in (-det,0,det):
        for h in range(1,7): s+=np.sin(2*np.pi*f*(1+dd)*h*tt)/(h**(1.6-0.5*bright))
    e=np.minimum(1,tt/a)*np.minimum(1,(d-tt)/.3); 
    if dec: e*=np.exp(-tt/dec)
    return s*e*g/6
A2,F2,C3,G2=110.0,87.31,130.81,98.0
chords={'Am':[220.0,261.63,329.63],'F':[174.61,220.0,261.63],'C':[196.0,261.63,329.63],'G':[196.0,246.94,293.66]}
roots={'Am':A2,'F':F2,'C':C3/2,'G':G2}
prog=['Am','F','C','G']
# pads (intro, pergunta, história, fecho) e baixo (groove)
def pad(ch,start,d,g):
    for f in chords[ch]: add(lp(note(f,d,g,a=1.2),2200),start,1.0,pan=rng.uniform(-.4,.4))
pad('Am',0,4.2,.22); pad('F',4,4.6,.16); pad('C',8.5,3.6,.2)
for bar in range(15):   # 12..42 s, 2 s por acorde
    st=12+bar*2; ch=prog[bar%4]; pad(ch,st,2.1,.13)
    for k in range(8):
        add(lp(note(roots[ch]*(2 if k%4==3 else 1),.24,.9,a=.005,dec=.12,bright=.6),900),st+k*.25,.9)
for bar in range(3): st=42+bar*2; ch=prog[bar%4]; pad(ch,st,2.1,.18)
pad('F',48,2.6,.2); pad('G',50.5,2.6,.2); pad('Am',53,7,.26)
# ritmo
for i in range(8): add(kick(.35),4+i*B+.0)          # batida do coração na parte do problema
for bt in np.arange(12,42,B): add(kick(.95),bt)
for bt in np.arange(13,42,1.0): add(clap(),bt,.55)
for bt in np.arange(16.25,42,.5): add(hat(),bt,.5,pan=.3)
for bt in np.arange(42,48,B): add(kick(.8),bt)
for i,bt in enumerate(np.arange(46,48,.125)): add(clap(),bt,.12+.25*i/16)
for bt in np.arange(48,53,1.0): add(kick(.4),bt)
# efeitos
add(riser(3.4,.35),8.6); add(riser(3.4,.5),8.6+0.0*0)
add(riser(2.0,.5),46)
for h in (12,48,53): add(boom(1.1),h)
add(boom(.6),4); add(boom(.5),0.05)
for h in (16,19.5,23,26.5,30.5,34,37.5,42): add(whoosh(.45),h-.3,pan=.2)
# eco simples e mistura
def echo(x,d=.375,fb=.3):
    y=x.copy(); k=int(d*SR); 
    for n in range(1,4): y[k*n:]+=x[:-k*n]*(fb**n)
    return y
L=echo(L); R=echo(R,.4)
fade=np.ones(N); fade[:int(.3*SR)]=np.linspace(0,1,int(.3*SR)); fade[-int(3*SR):]=np.linspace(1,0,int(3*SR))**1.5
L*=fade; R*=fade
m=max(np.abs(L).max(),np.abs(R).max()); L=np.tanh(1.2*L/m)/np.tanh(1.2)*.89; R=np.tanh(1.2*R/m)/np.tanh(1.2)*.89
st=np.stack([L,R],1); pcm=(st*32767).astype(np.int16)
w=wave.open("music.wav","wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close(); print("audio ok")
