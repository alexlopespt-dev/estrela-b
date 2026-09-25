# Piano do tema "estilo Apple": vi–IV–I–V em fá maior (Rém–Sib–Fá–Dó), 90 bpm. Só o piano (o resto é sintetizado em synth.py)
import mido
BPM=90; TPB=480; mid=mido.MidiFile(ticks_per_beat=TPB); t=mido.MidiTrack(); mid.tracks.append(t)
t.append(mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM))); t.append(mido.Message('program_change',channel=0,program=0))
for cc,v in ((7,110),(91,0),(93,0),(64,0)): t.append(mido.Message('control_change',channel=0,control=cc,value=v))
ev=[]
def N(b,d,n,v): ev.append((int(b*TPB),1,n,v)); ev.append((int((b+d)*TPB)-2,0,n,0))
def ped(b,on): ev.append((int(b*TPB),2,64,127 if on else 0))
CH=[[62,65,69,74],[58,62,65,70],[60,65,69,72],[60,64,67,72]]   # Rém, Sib, Fá(inv), Dó
RT=[50,46,41,48]
# motivo de piano (intro 0–24 e pausa 88–92, fim 106–114): arpejo suave em colcheias
def arp(b0,bars,vel=58,chords=CH,roots=RT):
    for k in range(bars):
        c=chords[k%4]; r=roots[k%4]; s=b0+k*4; ped(s,False); ped(s+.05,True)
        N(s,4,r-12,vel-6)
        pat=[c[0],c[2],c[3],c[2],c[1],c[2],c[3],c[2]]
        for i,n in enumerate(pat): N(s+i*.5,.9,n+12,vel+(8 if i in (0,4) else 0)-(i%2)*6)
arp(0,6)            # 0–24
arp(24,1,62); N(28,1.5,84,60); N(29.5,.5,81,55)     # 24–30 subida
# groove 30–88: acordes em síncopa (estilo pop limpo)
def stabs(b0,bars,vel=64,chords=CH,roots=RT):
    for k in range(bars):
        c=chords[k%4]; s=b0+k*4; ped(s,False)
        for (bt,d) in [(0,.45),(1.5,.45),(2.5,.45),(3.5,.4)]:
            for n in c[1:]: N(s+bt,d,n+12,vel-(0 if bt==0 else 8))
        N(s,1,roots[k%4]-12,vel-10)
stabs(30,14)
arp(88,1,60)        # pausa 88–92
CH2=[[58,62,65,70],[60,64,67,72],[62,65,69,74],[60,65,69,72]]; RT2=[46,48,50,41]   # Sib Dó Rém Fá (subida)
stabs(92,3,72,CH2,RT2); N(104,2,77,70); N(104,2,81,70)
# final 106–114: acorde de fá com a nona, notas soltas
ped(106,False); ped(106.05,True)
for n in [41,53,60,65,69,72,79]: N(106,8,n,64)
for i,n in enumerate([84,81,79,77]): N(108+i*.75,3,n,50-i*4)
ev.sort(key=lambda x:(x[0],x[1])); last=0
for (tk,k,a,b) in ev:
    dt=tk-last; last=tk
    if k==2: t.append(mido.Message('control_change',channel=0,control=a,value=b,time=dt))
    elif k==1: t.append(mido.Message('note_on',channel=0,note=a,velocity=b,time=dt))
    else: t.append(mido.Message('note_off',channel=0,note=a,velocity=0,time=dt))
mid.save("piano.mid"); print("ok")
