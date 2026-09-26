import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist"); CAP=os.path.join(ROOT,"tests","capturas")
from playwright.sync_api import sync_playwright
# Ecrã de arranque (emblema, ≤ 2 s, não bloqueia toques) e painel no computador (3 colunas, separadores todos visíveis, sem scroll lateral)
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for w,h in [(1440,900),(1280,800),(1180,820),(820,1180),(390,844)]:
        pg=b.new_page(viewport={"width":w,"height":h}); pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
        pg.goto("file://"+DIST+"/app_local.html",wait_until="domcontentloaded")
        sp=pg.evaluate("(()=>{const s=document.getElementById('splash');if(!s)return null;const i=s.querySelector('img');return [getComputedStyle(s).pointerEvents,i&&i.src.startsWith('data:image')]})()")
        if w==1440: print("arranque:", sp)
        if not sp or sp[0]!="none" or not sp[1]: errs.append(f"arranque {w}")
        pg.wait_for_timeout(2100)
        gone=pg.evaluate("!document.getElementById('splash')")
        if not gone: errs.append(f"arranque não saiu {w}")
        pg.click('nav [data-t="painel"]'); pg.wait_for_timeout(300)
        cols=pg.evaluate("getComputedStyle(document.querySelector('.dash')).gridTemplateColumns.split(' ').length")
        ov=pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1")
        nav=pg.evaluate("(()=>{const n=document.querySelector('nav.tabs');return n.scrollWidth<=n.clientWidth+1})()")
        print(w, "colunas:", cols, "| sem scroll lateral:", ov, "| separadores todos visíveis:", nav)
        exp={1440:3,1280:3,1180:2,820:2,390:1}[w]
        if cols!=exp or not ov: errs.append(f"painel {w}")
        if w>=1280 and not nav: errs.append(f"separadores {w}")
        if w==1440: pg.screenshot(path=os.path.join(CAP,"t30_painel.png"),full_page=True)
        pg.close()
    b.close()
print("ERRORS",errs)
