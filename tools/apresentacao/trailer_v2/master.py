import numpy as np, wave
SR=44100; DUR=76.0; N=int(SR*DUR); rng=np.random.default_rng(11)
w=wave.open("orq.wav"); x=np.frombuffer(w.readframes(w.getnframes()),np.int16).reshape(-1,2).astype(np.float64)/32768; w.close()
x=x[:N] if len(x)>=N else np.vstack([x,np.zeros((N-len(x),2))])
fx=np.zeros((N,2))
from scipy.signal import lfilter
def lp(v,fc):
    a=np.exp(-2*np.pi*fc/SR); return lfilter([1-a],[1,-a],v)
def add(sig,t0,g=1.0,pan=0.0):
    i=int(t0*SR); j=min(N,i+len(sig)); s=sig[:j-i]*g
    fx[i:j,0]+=s*(1-max(0,pan)); fx[i:j,1]+=s*(1+min(0,pan))
def boom(g=1.0,d=3.5):
    n=int(d*SR); t=np.arange(n)/SR; f=32+70*np.exp(-t*5); s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*1.2)
    nz=lp(rng.standard_normal(n),1400)*np.exp(-t*4)*.5; return (s+nz)*g
def riser(d,g=1.0):
    n=int(d*SR); t=np.arange(n)/SR; k=(t/d)**2.2; nz=rng.standard_normal(n)
    lo=lp(nz,400); hi=lp(nz,6000); tone=np.sin(2*np.pi*np.cumsum(200+1200*k)/SR)*.15
    return ((hi*k+lo*(1-k))*1.3+tone)*k*g
def whoosh(g=.5,d=.8):
    n=int(d*SR); t=np.arange(n)/SR; e=np.sin(np.pi*t/d)**2; return lp(rng.standard_normal(n),2200)*e*g
for t0,g in ((20,1.0),(41.333,.55),(61.333,1.0),(70.667,1.1)): add(boom(g),t0)
add(riser(4.0,.35),16.0); add(riser(2.6,.4),58.7)
for t0 in (25.333,30.667,36.0,46.667,52.0,56.0): add(whoosh(.35),t0-.45,pan=.25)
mix=x*1.0+fx*0.55
g=np.ones(N); i8=int(8*SR); i16=int(16*SR); i20=int(20*SR); g[:i8]=2.6; g[i8:i16]=np.linspace(2.3,1.15,i16-i8); g[i16:i20]=np.linspace(1.15,.9,i20-i16); mix*=g[:,None]
# compressor simples (envolvente RMS) + limitador suave
env=np.sqrt(lp(np.mean(mix**2,axis=1),6))
thr=0.18; ratio=3.0; gain=np.where(env>thr,(thr+(env-thr)/ratio)/np.maximum(env,1e-9),1.0)
mix=mix*gain[:,None]
mix/=np.abs(mix).max(); mix=np.tanh(1.6*mix)/np.tanh(1.6)*0.93
fade=np.ones(N); fade[-int(2.5*SR):]=np.linspace(1,0,int(2.5*SR))**1.3; fade[:int(.05*SR)]=np.linspace(0,1,int(.05*SR)); mix*=fade[:,None]
pcm=(mix*32767).astype(np.int16); o=wave.open("musica_final.wav","wb"); o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(pcm.tobytes()); o.close()
for a in range(0,76,4): s=mix[a*SR:(a+4)*SR]; print(a, round(float(np.sqrt((s**2).mean())),3))
