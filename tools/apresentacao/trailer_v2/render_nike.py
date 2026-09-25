# Trailer ajustado à faixa enviada (60,7 s): o tempo do compositor é "dobrado" por troços para os cortes caírem na batida.
import subprocess, os, imageio_ffmpeg, numpy as np
from playwright.sync_api import sync_playwright
FF=imageio_ffmpeg.get_ffmpeg_exe(); FPS=60; DUR=60.7
B=0.677; D0=16.69   # batida (meia velocidade) e entrada do ritmo
cut=lambda n: D0+n*B
# [tempo novo, tempo antigo do compositor]
MAP=[(0,0),(6,8),(13,16),(D0,20),(cut(6),25.333),(cut(14),30.667),(cut(20),36),(cut(26),41.333),(cut(34),46.667),(cut(42),52),(cut(48),56),(cut(52),58.667),
     (cut(56),61.333),(56.2,65.333),(58.2,70.667),(DUR,76)]
tn=[m[0] for m in MAP]; to=[m[1] for m in MAP]
p=subprocess.Popen([FF,"-y","-loglevel","error","-f","image2pipe","-framerate",str(FPS),"-c:v","mjpeg","-i","-","-i","nike.wav",
   "-c:v","libx264","-preset","slow","-crf","17","-pix_fmt","yuv420p","-c:a","aac","-b:a","256k","-shortest","-movflags","+faststart","Trailer_nike.mp4"],stdin=subprocess.PIPE)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1920,"height":1080})
    pg.goto("file://"+os.path.abspath("comp.html")); pg.wait_for_timeout(3000)
    for i in range(int(FPS*DUR)):
        t=float(np.interp(i/FPS,tn,to)); pg.evaluate(f"seek({t})"); p.stdin.write(pg.screenshot(type="jpeg",quality=95))
    b.close()
p.stdin.close(); p.wait()
subprocess.run([FF,"-y","-loglevel","error","-i","Trailer_nike.mp4","-c:v","libx264","-preset","slow","-b:v","3200k","-pass","1","-an","-f","mp4","/dev/null"])
subprocess.run([FF,"-y","-loglevel","error","-i","Trailer_nike.mp4","-c:v","libx264","-preset","slow","-b:v","3200k","-pass","2","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-movflags","+faststart","Trailer_nike_web.mp4"])
print("ok", os.path.getsize("Trailer_nike_web.mp4")//1024//1024, "MB")
