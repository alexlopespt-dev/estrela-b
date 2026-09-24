"""Ajuste do campo: encontra a orientação, a escala e a posição do campo (105x68 m) em cada imagem.

A imagem de origem é uma captura de um programa de desenho de exercícios; cada captura tem o seu zoom
e enquadramento. Ajusta-se um campo regulamentar às linhas brancas detetadas, minimizando a distância
média dos pontos do modelo à linha mais próxima (transformada de distância, robusta a oclusões).
"""
import numpy as np
from scipy import ndimage
from scipy.optimize import differential_evolution, minimize

L, W = 105.0, 68.0
PROP = {"pa_d": 19.25, "pa_w": 46.85, "ga_d": 6.42, "ga_w": 21.15, "rc": 10.6, "spot": 12.83}


def polylines(P=None):
    """Linhas do campo em metros (x ao longo do comprimento, y na largura). P permite afinar proporções."""
    P = P or {}
    # proporções do programa de origem (medidas em capturas de campo inteiro: 393x254 px = 105x68 m)
    pa_d, pa_w = P.get("pa_d", PROP["pa_d"]), P.get("pa_w", PROP["pa_w"])
    ga_d, ga_w = P.get("ga_d", PROP["ga_d"]), P.get("ga_w", PROP["ga_w"])
    rc, spot = P.get("rc", PROP["rc"]), P.get("spot", PROP["spot"])
    segs = []
    def seg(a, b):
        segs.append(np.array([a, b], float))
    def arc(cx, cy, r, t0, t1, n=60):
        t = np.linspace(t0, t1, n)
        segs.append(np.stack([cx + r * np.cos(t), cy + r * np.sin(t)], 1))
    seg((0, 0), (L, 0)); seg((0, W), (L, W)); seg((0, 0), (0, W)); seg((L, 0), (L, W))
    seg((L / 2, 0), (L / 2, W))
    arc(L / 2, W / 2, rc, 0, 2 * np.pi, 120)
    for side in (0, 1):
        f = (lambda x: x) if side == 0 else (lambda x: L - x)
        y0, y1 = W / 2 - pa_w / 2, W / 2 + pa_w / 2
        seg((f(0), y0), (f(pa_d), y0)); seg((f(0), y1), (f(pa_d), y1)); seg((f(pa_d), y0), (f(pa_d), y1))
        y0, y1 = W / 2 - ga_w / 2, W / 2 + ga_w / 2
        seg((f(0), y0), (f(ga_d), y0)); seg((f(0), y1), (f(ga_d), y1)); seg((f(ga_d), y0), (f(ga_d), y1))
        dx = pa_d - spot
        a = np.arccos(dx / rc)
        if side == 0:
            arc(spot, W / 2, rc, -a, a, 40)
        else:
            arc(L - spot, W / 2, rc, np.pi - a, np.pi + a, 40)
    return segs


def sample(segs, step=0.35):
    pts = []
    for s in segs:
        for a, b in zip(s[:-1], s[1:]):
            n = max(2, int(np.hypot(*(b - a)) / step))
            t = np.linspace(0, 1, n)[:, None]
            pts.append(a + (b - a) * t)
    return np.concatenate(pts)


def to_img(pts, p, ori):
    s, asp, tx, ty = p
    sx, sy = s * asp, s
    if ori == "h":
        return np.stack([tx + sx * pts[:, 0], ty + sy * pts[:, 1]], 1)
    return np.stack([tx + sx * pts[:, 1], ty + sy * pts[:, 0]], 1)


def line_mask(a):
    """Linhas claras finas: brilho acima da relva à volta (top-hat) e esverdeado-claro."""
    a = a.astype(float)
    v = a.sum(2)
    th = v - ndimage.grey_opening(v, size=(5, 5))
    return (th > 90) & (a[..., 1] > 150)


def fit(a, oris=("h", "v"), seed=1, maxiter=250):
    """p = [s, asp, tx, ty, L, W]: escala (px/m), aspeto, translação e dimensões do campo."""
    from scipy.spatial import cKDTree
    h, w = a.shape[:2]
    m = line_mask(a)
    dt = ndimage.distance_transform_edt(~m)
    ys, xs = np.nonzero(m)
    rng = np.random.default_rng(seed)
    pick = rng.choice(len(xs), size=min(700, len(xs)), replace=False)
    det = np.stack([xs[pick], ys[pick]], 1).astype(float)
    def model(p):
        return sample(polylines({"L": p[4], "W": p[5]}))
    def cost(p, ori):
        q = to_img(model(p), p[:4], ori)
        ins = (q[:, 0] >= 1) & (q[:, 0] < w - 1) & (q[:, 1] >= 1) & (q[:, 1] < h - 1)
        if ins.sum() < 150:
            return 10.0
        d = ndimage.map_coordinates(dt, [q[ins, 1], q[ins, 0]], order=1)
        fwd = np.minimum(d, 4).mean()
        rev = np.minimum(cKDTree(q[ins]).query(det)[0], 6).mean()
        return fwd + 0.5 * rev
    best = None
    bounds = [(2.8, 9), (0.95, 1.06), (-700, 450), (-700, 450), (80, 115), (50, 76)]
    for ori in oris:
        r = differential_evolution(cost, bounds, args=(ori,), seed=seed, popsize=25, maxiter=maxiter, tol=1e-8, polish=True)
        if best is None or r.fun < best[0]:
            best = (r.fun, r.x, ori)
    return {"ori": best[2], "p": [float(x) for x in best[1]], "cost": float(best[0])}


def overlay_pts(r, step=0.2):
    p = r["p"]
    return to_img(sample(polylines({"L": p[4], "W": p[5]}), step), p[:4], r["ori"])
