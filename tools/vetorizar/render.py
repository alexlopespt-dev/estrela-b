"""Desenha drawings v2 com o próprio src/vec.js (Chromium) e devolve imagens numpy ao tamanho da captura."""
import os, io, json
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VEC = open(os.path.join(ROOT, "src", "vec.js")).read()
ESC = 'const esc = s => String(s==null?"":s).replace(/[&<>"\\\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\\\'":"&#39;"}[c]));'


class Renderer:
    def __init__(self, scale=1):
        self.pw = sync_playwright().start()
        self.b = self.pw.chromium.launch()
        self.pg = self.b.new_page(device_scale_factor=scale)
        self.pg.set_content("<html><body style='margin:0;background:#000'><div id=o></div><script>" + ESC + VEC + "</script></body></html>")
        self.scale = scale

    def svg(self, d):
        return self.pg.evaluate("d=>vecSVG(d,{r:0})", d)

    def render(self, d):
        w, h = d.get("w", 440), d.get("h", 302)
        self.pg.set_viewport_size({"width": w, "height": h})
        self.pg.evaluate("([d,w,h])=>{const o=document.getElementById('o'); o.style.width=w+'px'; o.style.height=h+'px'; o.innerHTML=vecSVG(d,{r:0});}", [d, w, h])
        png = self.pg.locator("#o").screenshot()
        im = Image.open(io.BytesIO(png)).convert("RGB")
        if self.scale != 1:
            return np.asarray(im)
        return np.asarray(im.resize((w, h)))

    def close(self):
        self.b.close(); self.pw.stop()
