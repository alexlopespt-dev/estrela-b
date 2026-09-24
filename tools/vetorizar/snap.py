"""Encaixe fino de elementos escritos à mão nos píxeis da captura original."""
import numpy as np
from scipy import ndimage


def color_mask(a, col):
    a = a.astype(int)
    if col in ("#111111", "#111", "#000", "#000000", None):
        return a.sum(2) < 230
    if col in ("#ffffff", "#fff"):
        return (a.min(2) > 185) & (np.abs(a[..., 1] - a[..., 0]) < 45)
    r, g, b = int(col[1:3], 16), int(col[3:5], 16), int(col[5:7], 16)
    return np.sqrt(((a - np.array([r, g, b])) ** 2).sum(2)) < 70


def _score_seg(m, p0, p1):
    L = max(2, int(np.hypot(p1[0] - p0[0], p1[1] - p0[1])))
    t = np.linspace(0, 1, L)
    xs = p0[0] + (p1[0] - p0[0]) * t; ys = p0[1] + (p1[1] - p0[1]) * t
    return ndimage.map_coordinates(m.astype(float), [ys, xs], order=1, mode="constant").mean()


def snap_rect(a, it, rad=4):
    m = ndimage.gaussian_filter(color_mask(a, it.get("c", "#111111")).astype(float), 0.6)
    x0, y0, x1, y1 = it["x"], it["y"], it["x"] + it["w"], it["y"] + it["h"]
    def best(v, f):
        cands = np.arange(v - rad, v + rad + 0.01, 0.5)
        return max(cands, key=f)
    for _ in range(2):
        y0 = best(y0, lambda y: _score_seg(m, (x0 + 3, y), (x1 - 3, y)))
        y1 = best(y1, lambda y: _score_seg(m, (x0 + 3, y), (x1 - 3, y)))
        x0 = best(x0, lambda x: _score_seg(m, (x, y0 + 3), (x, y1 - 3)))
        x1 = best(x1, lambda x: _score_seg(m, (x, y0 + 3), (x, y1 - 3)))
    it.update({"x": round(x0, 1), "y": round(y0, 1), "w": round(x1 - x0, 1), "h": round(y1 - y0, 1)})
    return it


def snap_line(a, it, rad=3):
    m = ndimage.gaussian_filter(color_mask(a, it.get("c", "#111111")).astype(float), 0.6)
    pts = [list(p) for p in it["pts"]]
    for _ in range(2):
        for i in range(len(pts)):
            nb = [j for j in (i - 1, i + 1) if 0 <= j < len(pts)]
            def f(p):
                return sum(_score_seg(m, p, pts[j]) for j in nb)
            best, bs = pts[i], f(pts[i])
            for dx in np.arange(-rad, rad + 0.01, 0.5):
                for dy in np.arange(-rad, rad + 0.01, 0.5):
                    p = [pts[i][0] + dx, pts[i][1] + dy]
                    s = f(p)
                    if s > bs + 1e-6:
                        best, bs = p, s
            pts[i] = best
    it["pts"] = [[round(p[0], 1), round(p[1], 1)] for p in pts]
    return it


def snap_disc(a, it, rad=4):
    """Ajusta centro e raio de um disco pelo contorno (anel escuro, ou claro para discos pretos)."""
    ring_dark = it.get("o", "#1c1c1c") not in ("#f5f5f5", "#ffffff")
    v = a.astype(float).sum(2)
    edge = (v < 250) if ring_dark else (v > 520)
    m = ndimage.gaussian_filter(edge.astype(float), 0.7)
    x, y, r = it["x"], it["y"], it.get("r", 6.5)
    th = np.linspace(0, 2 * np.pi, 48, endpoint=False)
    def f(x, y, r):
        rr = r - (it.get("ow", r * 0.2)) / 2
        return ndimage.map_coordinates(m, [y + rr * np.sin(th), x + rr * np.cos(th)], order=1).mean()
    best = (f(x, y, r), x, y, r)
    for dx in np.arange(-rad, rad + 0.01, 0.5):
        for dy in np.arange(-rad, rad + 0.01, 0.5):
            for dr in np.arange(-1.5, 1.51, 0.25):
                s = f(x + dx, y + dy, r + dr)
                if s > best[0]:
                    best = (s, x + dx, y + dy, r + dr)
    it.update({"x": round(best[1], 2), "y": round(best[2], 2), "r": round(best[3], 2)})
    return it
