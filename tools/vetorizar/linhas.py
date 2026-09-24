"""Linhas, retângulos, setas e mini-balizas a partir dos componentes que o classificador não reconheceu."""
import numpy as np
from scipy import ndimage
from skimage.morphology import skeletonize
from skimage.transform import probabilistic_hough_line


def _merge(segs, ang_tol=4.0, dist_tol=2.0, gap=14):
    """Funde segmentos colineares; devolve [(p0,p1,cobertura)]."""
    segs = [(np.array(a, float), np.array(b, float)) for a, b in segs]
    used = [False] * len(segs)
    out = []
    for i, (a, b) in enumerate(segs):
        if used[i]:
            continue
        used[i] = True
        d = (b - a) / (np.linalg.norm(b - a) + 1e-9)
        n = np.array([-d[1], d[0]])
        pts = [a, b]
        cov = np.linalg.norm(b - a)
        changed = True
        while changed:
            changed = False
            for j, (c, e) in enumerate(segs):
                if used[j]:
                    continue
                dj = (e - c) / (np.linalg.norm(e - c) + 1e-9)
                if abs(abs(np.dot(d, dj)) - 1) > 1 - np.cos(np.radians(ang_tol)):
                    continue
                if abs(np.dot(c - a, n)) > dist_tol or abs(np.dot(e - a, n)) > dist_tol:
                    continue
                t = [np.dot(p - a, d) for p in pts]
                tc, te = np.dot(c - a, d), np.dot(e - a, d)
                if min(tc, te) > max(t) + gap or max(tc, te) < min(t) - gap:
                    continue
                used[j] = True; pts += [c, e]; cov += np.linalg.norm(e - c); changed = True
        t = np.array([np.dot(p - a, d) for p in pts])
        p0, p1 = a + d * t.min(), a + d * t.max()
        L = np.linalg.norm(p1 - p0)
        out.append((p0, p1, min(1.0, cov / max(L, 1e-6))))
    return out


def color_of(px):
    m = np.median(px, 0)
    if m.sum() < 260:
        return "#111111"
    if m.min() > 190:
        return "#ffffff"
    return "#%02x%02x%02x" % tuple(int(v) for v in m)


def lines_from(mask, a, x0, y0):
    """mask: componente (recorte) -> itens ln/rect."""
    sk = skeletonize(mask)
    segs = probabilistic_hough_line(sk, threshold=6, line_length=8, line_gap=2, rng=1)
    segs = [((p[0] + x0, p[1] + y0), (q[0] + x0, q[1] + y0)) for p, q in segs]
    merged = _merge(segs)
    ys, xs = np.nonzero(mask)
    col = color_of(a[ys + y0, xs + x0].astype(float))
    lw = max(0.8, min(3.0, mask.sum() / max(1, sk.sum())))
    items = []
    for p0, p1, cov in merged:
        L = np.linalg.norm(p1 - p0)
        if L < 7:
            continue
        it = {"t": "ln", "pts": [[round(p0[0], 1), round(p0[1], 1)], [round(p1[0], 1), round(p1[1], 1)]], "c": col, "lw": round(lw, 2)}
        if cov < 0.78:
            it["dash"] = "3 2.2"
        items.append(it)
    return items, col, lw


def rect_from(items):
    """Se 4 linhas eixo-alinhadas formam um retângulo, junta-as num rect."""
    hs = [i for i in items if abs(i["pts"][0][1] - i["pts"][1][1]) < 1.5]
    vs = [i for i in items if abs(i["pts"][0][0] - i["pts"][1][0]) < 1.5]
    if len(hs) < 2 or len(vs) < 2:
        return None, items
    xs = sorted([i["pts"][0][0] for i in vs]); ys = sorted([i["pts"][0][1] for i in hs])
    x0, x1, y0, y1 = xs[0], xs[-1], ys[0], ys[-1]
    edge = lambda i: (i in hs and (abs(i["pts"][0][1] - y0) < 2 or abs(i["pts"][0][1] - y1) < 2)) or (i in vs and (abs(i["pts"][0][0] - x0) < 2 or abs(i["pts"][0][0] - x1) < 2))
    border = [i for i in items if edge(i)]
    if len(border) < 4 or (x1 - x0) < 12 or (y1 - y0) < 12:
        return None, items
    dash = sum(1 for i in border if i.get("dash")) >= 2
    r = {"t": "rect", "x": round(x0, 1), "y": round(y0, 1), "w": round(x1 - x0, 1), "h": round(y1 - y0, 1), "c": border[0]["c"], "lw": border[0]["lw"]}
    if dash:
        r["dash"] = "3 2.2"
    rest = [i for i in items if i not in border]
    return r, rest


def is_goal(reg, mm):
    """Mini-baliza: retângulo claro acinzentado com rede (textura)."""
    px = reg[mm]
    if len(px) < 20:
        return False
    light = (px.min(1) > 150).mean()
    grey = (np.abs(px[:, 0] - px[:, 2]) < 40).mean()
    return light > 0.35 and grey > 0.6 and mm.mean() > 0.55
