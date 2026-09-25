import subprocess, os, imageio_ffmpeg
from playwright.sync_api import sync_playwright
FF=imageio_ffmpeg.get_ffmpeg_exe(); FPS=60; DUR=76
p=subprocess.Popen([FF,"-y","-loglevel","error","-f","image2pipe","-framerate",str(FPS),"-c:v","mjpeg","-i","-","-i","musica_apple.wav",
   "-c:v","libx264","-preset","slow","-crf","17","-pix_fmt","yuv420p","-profile:v","high","-c:a","aac","-b:a","256k","-shortest","-movflags","+faststart","Trailer_v3.mp4"],stdin=subprocess.PIPE)
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={"width":1920,"height":1080})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+os.path.abspath("comp.html")); pg.wait_for_timeout(3000)
    for i in range(FPS*DUR):
        pg.evaluate(f"seek({i/FPS})"); p.stdin.write(pg.screenshot(type="jpeg",quality=95))
        if i%600==0: print(i,flush=True)
    print("erros:",errs); b.close()
p.stdin.close(); p.wait(); print("ok")
