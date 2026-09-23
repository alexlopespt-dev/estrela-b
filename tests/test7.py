import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST=os.path.join(ROOT,"dist")
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":844},has_touch=True,is_mobile=True); pg=ctx.new_page()
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("file://"+DIST+"/app_local.html"); pg.wait_for_timeout(400)
    pg.tap('nav [data-t="treinos"]'); pg.tap('[data-a="tsub"][data-k="ex"]'); pg.tap('.ex >> nth=0'); pg.tap('#dlg [data-a="drawEx"]'); pg.wait_for_timeout(150)
    bx=pg.locator("#pitch").bounding_box()
    for fx in [.2,.5,.8]: pg.touchscreen.tap(bx["x"]+bx["width"]*fx, bx["y"]+bx["height"]*.5)
    # touch drag arrow via CDP-less: dispatch pointer events
    pg.tap('#dlg [data-a="dwTool"][data-k="run"]')
    pg.evaluate("""()=>{const s=document.querySelector('#pitch');const r=s.getBoundingClientRect();
      const ev=(t,x,y)=>s.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+r.width*x,clientY:r.top+r.height*y,pointerId:7,pointerType:'touch'}));
      ev('pointerdown',.2,.7);ev('pointermove',.4,.6);ev('pointermove',.6,.4);ev('pointerup',.6,.4);}""")
    print("items:", pg.eval_on_selector_all("#pitchItems [data-i]","e=>e.length"))
    pg.screenshot(path=os.path.join(ROOT,"tests","capturas","m_draw.png"))
    pg.tap('#dlg [data-a="mSave"]'); pg.wait_for_timeout(200); print("saved view svg:", pg.eval_on_selector_all("#dlg svg","e=>e.length"))
    b.close()
print("ERR",errs)
