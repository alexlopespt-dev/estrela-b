"""Ajuste rápido do campo às linhas brancas de cada captura.

Cada ponto das linhas do campo é escrito como  x = ax + bx*L ,  y = ay + by*W  (metros), para que o
comprimento L e a largura W do campo possam variar sem voltar a gerar o modelo. As áreas, o círculo e a
marca de penálti têm medidas fixas (as do programa de origem); o campo em si varia de captura para captura.
"""
import numpy as np
from scipy import ndimage
from scipy.optimize import differential_evolution, minimize
from scipy.spatial import cKDTree

PROP = {"pa_d": 19.25, "pa_w": 46.85, "ga_d": 6.42, "ga_w": 21.15, "rc": 10.6, "spot": 12.83, "corner": 1.3}
ST = 0.35


def _lin(n):
    return np.linspace(0, 1, max(2, n))


def build(P=PROP):
    """Devolve A (N,4): colunas ax, bx, ay, by  e um id de elemento por ponto."""
    rows, ids = [], []
    def add(ax, bx, ay, by, name):
        n = max(len(np.atleast_1d(v)) for v in (ax, bx, ay, by))
        rows.append(np.stack([np.broadcast_to(ax, (n,)), np.broadcast_to(bx, (n,)), np.broadcast_to(ay, (n,)), np.broadcast_to(by, (n,))], 1))
        ids.extend([name] * n)
    t = _lin(300)
    add(0, t, 0, 0, "linha"); add(0, t, 0, 1, "linha")               # linhas laterais: x=tL, y=0|W
    t = _lin(200)
    add(0, 0, 0, t, "fundo"); add(0, 1, 0, t, "fundo")               # linhas de fundo: x=0|L, y=tW
    add(0, .5, 0, t, "meio")                                          # linha do meio
    th = np.linspace(0, 2 * np.pi, 190)
    add(P["rc"] * np.cos(th), .5, P["rc"] * np.sin(th), .5, "circulo")
    for side in (0, 1):
        sg, bx = (1, 0) if side == 0 else (-1, 1)
        for d, wd, nm in ((P["pa_d"], P["pa_w"], "grande"), (P["ga_d"], P["ga_w"], "pequena")):
            u = _lin(int(d / ST))
            add(sg * d * u, bx, -wd / 2, .5, nm); add(sg * d * u, bx, wd / 2, .5, nm)
            v = _lin(int(wd / ST))
            add(sg * d, bx, -wd / 2 + wd * v, .5, nm)
        a = np.arccos((P["pa_d"] - P["spot"]) / P["rc"])
        th = np.linspace(-a, a, 50)
        add(sg * (P["spot"] + P["rc"] * np.cos(th)), bx, P["rc"] * np.sin(th), .5, "arco")
    return np.concatenate(rows).astype(float), np.array(ids)


A, IDS = build()


def pts_m(L, W, A=A):
    return np.stack([A[:, 0] + A[:, 1] * L, A[:, 2] + A[:, 3] * W], 1)


def to_img(pm, s, asp, tx, ty, ori):
    sx, sy = s * asp, s
    if ori == "h":
        return np.stack([tx + sx * pm[:, 0], ty + sy * pm[:, 1]], 1)
    return np.stack([tx + sx * pm[:, 1], ty + sy * pm[:, 0]], 1)


def line_mask(a):
    a = a.astype(float)
    v = a.sum(2)
    th = v - ndimage.grey_opening(v, size=(5, 5))
    return (th > 90) & (a[..., 1] > 150)


def img_pts(r, A=A):
    s, asp, tx, ty, L, W = r["p"]
    return to_img(pts_m(L, W, A), s, asp, tx, ty, r["ori"])


def fit(a, oris=("h", "v"), seed=1, mask=None):
    h, w = a.shape[:2]
    m = line_mask(a) if mask is None else mask
    dt = ndimage.distance_transform_edt(~m)
    ys, xs = np.nonzero(m)
    rng = np.random.default_rng(seed)
    pick = rng.choice(len(xs), size=min(900, len(xs)), replace=False)
    det = np.stack([xs[pick], ys[pick]], 1).astype(float)
    def cost(p, ori):
        s, asp, tx, ty, L, W = p
        q = to_img(pts_m(L, W), s, asp, tx, ty, ori)
        ins = (q[:, 0] >= 0.5) & (q[:, 0] < w - 0.5) & (q[:, 1] >= 0.5) & (q[:, 1] < h - 0.5)
        if ins.sum() < 200:
            return 10.0
        d = ndimage.map_coordinates(dt, [q[ins, 1], q[ins, 0]], order=1)
        fwd = np.minimum(d, 3).mean()
        rev = np.minimum(cKDTree(q[ins]).query(det)[0], 5).mean()
        return fwd + 0.6 * rev
    best = None
    bounds = [(2.8, 9), (0.96, 1.05), (-800, 450), (-800, 450), (70, 120), (45, 80)]
    for ori in oris:
        r = differential_evolution(cost, bounds, args=(ori,), seed=seed, popsize=30, maxiter=400, tol=1e-9, polish=False, updating="deferred", workers=1)
        x = r.x
        r2 = minimize(cost, x, args=(ori,), method="Powell", bounds=bounds, options={"xtol": 1e-4, "ftol": 1e-7, "maxiter": 20000})
        f, x = (r2.fun, r2.x) if r2.fun < r.fun else (r.fun, x)
        if best is None or f < best[0]:
            best = (f, x, ori)
    return {"ori": best[2], "p": [float(v) for v in best[1]], "cost": float(best[0])}
