"""Classificação dos objetos detetados em elementos do desenho vetorial (rascunho, revisto depois à mão)."""
import numpy as np
from scipy import ndimage

PALETTE = {
    "branco": (245, 245, 245), "preto": (25, 25, 25), "vermelho": (226, 56, 50), "azul": (22, 50, 140),
    "azul_claro": (80, 160, 225), "amarelo": (250, 225, 60), "laranja": (240, 140, 50), "verde": (120, 220, 90),
    "verde_esc": (40, 100, 40), "rosa": (230, 130, 150), "cinza": (140, 140, 140), "roxo": (120, 60, 130),
    "castanho": (140, 70, 30),
}
HEX = {"branco": "#ffffff", "preto": "#141414", "vermelho": "#ef4136", "azul": "#10227a", "azul_claro": "#5aaee8",
       "amarelo": "#ffee3a", "laranja": "#f39a3c", "verde": "#8fe36e", "verde_esc": "#2f7a2f", "rosa": "#f19bb0",
       "cinza": "#9a9a9a", "roxo": "#7a3f8a", "castanho": "#a0522d"}


def nearest(rgb):
    rgb = np.array(rgb, float)
    return min(PALETTE, key=lambda k: ((np.array(PALETTE[k]) - rgb) ** 2).sum())


def hexof(rgb):
    return "#%02x%02x%02x" % tuple(int(max(0, min(255, v))) for v in rgb)


def classify(o, a, lab):
    """Devolve um item v2 ou {'t':'?'} com o retângulo, para revisão."""
    x0, y0, w, h, n = o["x0"], o["y0"], o["w"], o["h"], o["n"]
    sl = (slice(y0, y0 + h), slice(x0, x0 + w))
    mm = lab[sl] == o["id"]
    reg = a[sl].astype(float)
    px = reg[mm]
    cx, cy = o["cx"], o["cy"]
    asp = w / max(1, h)
    # disco (jogador): aproximadamente circular e cheio
    if 7 <= w <= 34 and 7 <= h <= 34 and 0.72 <= asp <= 1.38 and o["fill"] > 0.6:
        r = (w + h) / 4.0
        yy, xx = np.mgrid[0:h, 0:w]
        ccx, ccy = cx - x0, cy - y0
        d = np.hypot(xx - ccx, yy - ccy)
        inner = mm & (d < r * 0.55)
        ring = mm & (d > r * 0.72)
        if inner.sum() >= 3:
            fill = np.median(reg[inner], 0)
            ringc = np.median(reg[ring], 0) if ring.sum() else np.array([30, 30, 30])
            name = nearest(fill)
            # cor medida, com leve correção de contraste (a compressão JPEG acinzenta as cores)
            f = fill.copy()
            if name == "branco": col = "#ffffff"
            elif name == "preto": col = "#141414"
            else:
                m = f.mean(); f = np.clip(m + (f - m) * 1.12, 0, 255); col = hexof(f)
            it = {"t": "d", "x": round(cx, 2), "y": round(cy, 2), "r": round(r, 2), "c": col}
            if ringc.sum() > 500 and name == "preto":
                it["o"] = "#f5f5f5"
            elif ringc.sum() > 280 and name not in ("branco",):
                it["o"] = "#2a2a2a"
            if r < 5.2:
                it["ow"] = round(max(0.6, r * 0.18), 2)
            return it
    # bola: pequena, branca com centro escuro
    if w <= 6 and h <= 6 and o["white"] > 0.2:
        return {"t": "ball", "x": round(cx, 2), "y": round(cy, 2), "r": round((w + h) / 4 + 0.2, 2)}
    rgb = np.median(px, 0)
    name = nearest(rgb)
    # sinalizador (anel) e cone
    if w <= 9 and h <= 10 and n <= 70:
        if name in ("amarelo", "laranja", "castanho") or (rgb[0] > 130 and rgb[1] > 120 and rgb[2] < 110):
            # anel: o centro é mais escuro/verde
            c = a[int(round(cy)), int(round(cx))].astype(int)
            if abs(w - h) <= 1 and (c.sum() < rgb.sum() - 40):
                return {"t": "mk", "x": round(cx, 2), "y": round(cy, 2), "r": round((w + h) / 4, 2), "c": "#f2b42a" if rgb[1] > 120 else "#e0782a"}
            return {"t": "cone", "x": round(cx, 2), "y": round(cy + 0.4, 2), "s": round(h / 7.2, 2), "c": hexof(np.percentile(px, 80, 0))}
        if name in ("vermelho", "castanho", "laranja"):
            return {"t": "d", "x": round(cx, 2), "y": round(cy, 2), "r": round((w + h) / 4, 2), "c": HEX[name], "o": "#5a1a10", "ow": 0.6}
    # jogador visto de cima: blob alongado com partes escuras
    if 6 <= max(w, h) <= 18 and min(w, h) >= 3 and o["dark"] > 0.15:
        ys, xs = np.nonzero(mm)
        cov = np.cov(np.stack([xs, ys]))
        ev, evec = np.linalg.eigh(cov)
        vx, vy = evec[:, 1]                         # eixo maior = ombros
        ang = np.degrees(np.arctan2(vy, vx))       # ângulo dos ombros
        # camisola: cor das pontas (ombros), longe do centro ao longo do eixo maior
        proj = (xs - xs.mean()) * vx + (ys - ys.mean()) * vy
        lobes = np.abs(proj) > max(2.0, np.abs(proj).max() * 0.45)
        cols = mm.copy(); cols[:] = False; cols[ys[lobes], xs[lobes]] = True
        lp = reg[cols]
        shirt = np.median(lp, 0) if len(lp) > 2 else np.median(px, 0)
        sname = nearest(shirt)
        # parte da frente clara (creme) a meio: segunda cor
        mid = reg[ys[np.abs(proj) < 1.6], xs[np.abs(proj) < 1.6]]
        c2 = ""
        if len(mid) and (mid.min(1) > 170).mean() > 0.2 and sname != "branco":
            c2 = "#f3ead0"
        it = {"t": "fig", "x": round(cx, 2), "y": round(cy, 2), "a": round(ang % 180, 1), "c": HEX[sname], "s": round(max(w, h) / 15.0, 2)}
        if c2: it["c2"] = c2
        return it
    return {"t": "?", "x0": x0, "y0": y0, "w": w, "h": h, "rgb": [int(v) for v in rgb], "n": n}
