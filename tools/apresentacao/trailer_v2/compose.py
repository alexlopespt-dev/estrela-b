# Música "epic trailer + cinematic sport" — 90 bpm, ré menor → ré maior no fim. 114 batidas = 76 s.
import mido
BPM=90; TPB=480
mid=mido.MidiFile(ticks_per_beat=TPB)
tracks={}
def tr(name,ch,prog,vol=100,pan=64,rev=90):
    t=mido.MidiTrack(); mid.tracks.append(t)
    t.append(mido.MetaMessage('track_name',name=name))
    if name=="conductor": t.append(mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)))
    if ch!=9: t.append(mido.Message('program_change',channel=ch,program=prog))
    for cc,v in ((7,vol),(10,pan),(91,rev),(93,20)): t.append(mido.Message('control_change',channel=ch,control=cc,value=v))
    tracks[name]={"t":t,"ch":ch,"ev":[]}
def N(name,beat,dur,note,vel):   # nota em batidas
    e=tracks[name]["ev"]; e.append((int(beat*TPB),'on',note,vel)); e.append((int((beat+dur)*TPB)-1,'off',note,0))
def CC(name,beat,cc,val): tracks[name]["ev"].append((int(beat*TPB),'cc',cc,val))
tr("conductor",15,0,0)
tr("piano",0,0,105,58,100); tr("strings",1,48,105,70); tr("slow",2,49,100,50,110); tr("celli",3,42,110,54); tr("bass",4,43,110,64)
tr("horns",5,60,112,60,95); tr("brass",6,61,95,70); tr("choir",7,52,105,64,115); tr("timp",8,47,118,64,70); tr("taiko",10,116,125,64,60)
tr("drums",9,0,110,64,60); tr("violins",11,40,100,80,100); tr("trb",12,57,100,50)
Dm=(38,[50,57,62,65]); Bb=(34,[46,53,58,62]); F=(41,[53,57,60,65]); C=(36,[48,55,60,64]); A=(33,[45,52,57,61]); D=(38,[50,57,62,66]); G=(31,[43,50,55,59])
prog=[Dm,Bb,F,C]
def bar_chord(b): return prog[b%4]
TOT=114
# dinâmica (expressão cc11) por secção
def expr(name,pts):
    for (bt,v) in pts: CC(name,bt,11,v)
# ---------- A: intro 0–12 piano + cordas lentas
for b in range(3):
    root,ch=bar_chord(b); s=b*4
    for k in range(8): N("piano",s+k*.5,.9,[ch[0]+12,ch[1]+12,ch[2]+12,ch[3]+12,ch[2]+12,ch[1]+12,ch[2]+12,ch[3]+12][k],52+(8 if k%4==0 else 0))
    for n_ in ch[:3]: N("slow",s,4,n_,60)
    N("bass",s,4,root+12,45)
expr("slow",[(0,40),(8,70),(12,85)])
# ---------- B: 12–24 ostinato celli, taiko suave, trompas
for b in range(3,6):
    root,ch=bar_chord(b); s=b*4
    for k in range(8): N("celli",s+k*.5,.42,[root+12,root+24,root+19,root+24][k%4],70+(15 if k%2==0 else 0))
    for n_ in ch[:3]: N("slow",s,4,n_,68)
    N("bass",s,4,root+12,60); N("taiko",s,1,48,70); N("taiko",s+2,1,45,60)
    N("piano",s,2,ch[3]+12,55); N("piano",s+2,2,ch[2]+12,48)
for k,(bt,n_) in enumerate([(14,62),(18,65),(22,64)]): N("horns",bt,2,n_,62+k*8)
# ---------- C: subida 24–30 (tímpanos em rolo, coro em crescendo, pausa antes da pancada)
for i in range(int((29.5-24)/.125)):
    N("timp",24+i*.125,.12,38,int(40+80*i/44))
for n_ in [62,65,69]: N("choir",24,5.5,n_,95)
for n_ in [50,57,62]: N("strings",24,5.5,n_,95)
expr("choir",[(24,30),(26,60),(28,100),(29.4,120)]); expr("strings",[(24,40),(29.4,120)])
N("drums",25.5,4,57,40)
# ---------- D: principal 30–88 (58 batidas) + F clímax 92–106
MEL=[(0,1.5,74),(1.5,.5,76),(2,2,77),(4,1,77),(5,1,76),(6,2,74),(8,1.5,72),(9.5,.5,74),(10,1,72),(11,1,69),(12,3,67),
     (16,1.5,74),(17.5,.5,76),(18,2,77),(20,1,79),(21,1,77),(22,2,76),(24,1.5,77),(25.5,.5,76),(26,1,74),(27,1,72),(28,4,69)]
def full(s,e,level=1.0,melody=None,mel_oct=0,choir=False,prg=prog,hi=False):
    b0=0
    for s2 in range(int(s),int(e),4):
        root,ch=prg[b0%len(prg)]; b0+=1; L=min(4,e-s2)
        # ostinato 16 avos (cordas) e colcheias (celli)
        for k in range(int(L*4)): N("strings",s2+k*.25,.22,[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+12][k%4],int((68+(18 if k%4==0 else 0))*level))
        for k in range(int(L*2)): N("celli",s2+k*.5,.45,[root+12,root+24][k%2],int(90*level))
        N("bass",s2,L,root+12,int(100*level)); N("bass",s2,L,root,int(85*level))
        for n_ in ch[1:]: N("brass",s2,L,n_,int(72*level))
        N("trb",s2,L,root+12,int(80*level))
        if choir:
            for n_ in ch[1:]: N("choir",s2,L,n_+12,int(100*level))
        # percussão épica
        N("timp",s2,1,root if root>=36 else root+12,int(115*level))
        for bt,nn,v in [(0,48,127),(1.5,45,100),(2,48,118),(3,45,105),(3.5,45,95)]:
            if bt<L: N("taiko",s2+bt,1,nn,int(v*level))
        for bt in (1,3):
            if bt<L: N("drums",s2+bt,.5,38,int(70*level))
        if hi:
            for k in range(int(L*2)): N("drums",s2+k*.5,.2,42,int(45*level))
    if melody is not None:
        for (bt,d,n_) in MEL:
            if s+bt<e:
                N("horns",s+bt,d,n_-12+mel_oct,int(105*level))
                if mel_oct>=12: N("violins",s+bt,d,n_+mel_oct-12,int(100*level)); N("choir",s+bt,d,n_+mel_oct-12,int(90*level))
full(30,62,0.88,melody=True,mel_oct=0)
full(62,88,0.95,melody=True,mel_oct=12,hi=True)
# rufo de tarola 84–88
for i in range(32): N("drums",84+i*.125,.1,38,int(40+80*i/32))
# ---------- E: pausa 88–92
for n_ in [58,62,65]: N("slow",88,4,n_,70)
N("piano",88,4,74,70); N("piano",90,2,72,60)
for i in range(16): N("timp",90+i*.125,.12,38,int(50+70*i/16))
# ---------- F: clímax 92–106 (Bb C Dm D maior)
full(92,106,1.0,melody=True,mel_oct=12,choir=True,prg=[Bb,C,Dm,D],hi=True)
# ---------- G: final 106–114 acorde de ré maior + piano
for n_ in [50,57,62,66,69]: N("choir",106,8,n_,100); N("strings",106,8,n_,95)
for n_ in [38,50]: N("bass",106,8,n_,100)
for n_ in [62,66,69]: N("horns",106,6,n_,100)
N("timp",106,2,38,127); N("taiko",106,2,48,127); N("drums",106,4,49,120)
N("piano",110,4,74,60); N("piano",110,4,78,55); N("piano",110,4,81,50)
expr("choir",[(106,120),(110,90),(113,40)]); expr("strings",[(106,120),(110,90),(113,40)]); expr("horns",[(106,120),(110,70)])
# pratos nas pancadas
for bt in (30,62,92,106): N("drums",bt,3,49,120); N("drums",bt,3,57,100)
# ---------- escrever
for name,d in tracks.items():
    t=d["t"]; ch=d["ch"]; ev=sorted(d["ev"],key=lambda x:(x[0],0 if x[1]=='off' else 1)); last=0
    for (tick,kind,a,b) in ev:
        dt=max(0,tick-last); last=max(last,tick)
        if kind=='on': t.append(mido.Message('note_on',channel=ch,note=a,velocity=max(1,min(127,b)),time=dt))
        elif kind=='off': t.append(mido.Message('note_off',channel=ch,note=a,velocity=0,time=dt))
        else: t.append(mido.Message('control_change',channel=ch,control=a,value=max(0,min(127,b)),time=dt))
mid.save("musica.mid"); print("midi ok")
