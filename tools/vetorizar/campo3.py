"""Ajuste do campo por estrutura: encontra a grande área (retângulo 46,85 x 19,25 m, aberto do lado da baliza)
entre os segmentos de linha branca, deduz escala, orientação e baliza, e afina localmente.
"""
import numpy as np
from scipy import ndimage
from scipy.optimize import minimize
from scipy.spatial import cKDTree
import campo2 as C

RATIO = C.PROP["pa_w"] / C.PROP["pa_d"]


def runs(line, gap=10, minlen=25):
    """Segmentos [a,b] onde line é verdadeiro, fundindo falhas até gap px."""
    idx = np.nonzero(line)[0]
    out = []
    if not len(idx):
        return out
    a = b = idx[0]
    for i in idx[1:]:
        if i - b <= gap:
            b = i
        else:
            if b - a >= minlen:
                out.append((a, b))
            a = b = i
    if b - a >= minlen:
        out.append((a, b))
    return out


def segments(m):
    """Segmentos horizontais (y, x0, x1) e verticais (x, y0, y1) de linhas claras (espessura até 2 px)."""
    H, V = [], []
    mh = m | np.roll(m, 1, 0)
    for y in range(m.shape[0]):
        for a, b in runs(mh[y]):
            H.append((y, a, b))
    mv = m | np.roll(m, 1, 1)
    for x in range(m.shape[1]):
        for a, b in runs(mv[:, x]):
            V.append((x, a, b))
    def merge(S):
        S = sorted(S)
        out = []
        for s in S:
            if out and abs(s[0] - out[-1][0]) <= 1 and min(s[2], out[-1][2]) - max(s[1], out[-1][1]) > 0.5 * (s[2] - s[1]):
                o = out[-1]
                out[-1] = ((o[0] + s[0]) / 2, min(o[1], s[1]), max(o[2], s[2]))
            else:
                out.append(s)
        return out
    return merge(H), merge(V)


def box_candidates(H, V, tol=0.14):
    """Grande área com a frente horizontal: (y_frente, x0, x1, profundidade com sinal: -1 baliza em cima, +1 em baixo)."""
    out = []
    for (y, x0, x1) in H:
        lw = x1 - x0
        if lw < 60:
            continue
        for sgn in (-1, 1):
            ld = lw / RATIO
            ok = 0
            for xe in (x0, x1):
                for (x, a, b) in V:
                    if abs(x - xe) <= 2:
                        seg_a, seg_b = (y - ld, y) if sgn < 0 else (y, y + ld)
                        cov = max(0, min(b, seg_b) - max(a, seg_a))
                        if cov > 0.5 * ld:
                            ok += 1
                            break
            if ok == 2:
                out.append((y, x0, x1, sgn))
    return out


def cost_fn(m, h, w):
    dt = ndimage.distance_transform_edt(~m)
    ys, xs = np.nonzero(m)
    det = np.stack([xs, ys], 1).astype(float)
    if len(det) > 1500:
        det = det[np.random.default_rng(0).choice(len(det), 1500, replace=False)]
    def cost(p, ori):
        s, asp, tx, ty, L, W = p
        q = C.to_img(C.pts_m(L, W), s, asp, tx, ty, ori)
        ins = (q[:, 0] >= 0.5) & (q[:, 0] < w - 0.5) & (q[:, 1] >= 0.5) & (q[:, 1] < h - 0.5)
        if ins.sum() < 150:
            return 10.0
        d = ndimage.map_coordinates(dt, [q[ins, 1], q[ins, 0]], order=1)
        fwd = np.minimum(d, 3).mean()
        rev = np.minimum(cKDTree(q[ins]).query(det)[0], 5).mean()
        return fwd + 0.6 * rev
    return cost


def fit(a):
    h, w = a.shape[:2]
    m = C.line_mask(a)
    cands = []
    for ori, mm in (("v", m), ("h", m.T)):
        H, V = segments(mm)
        for (y, x0, x1, sgn) in box_candidates(H, V):
            cands.append((ori, y, x0, x1, sgn))
    cost = cost_fn(m, h, w)
    best = None
    for (ori, y, x0, x1, sgn) in cands:
        # no referencial "v": x = largura, y = comprimento. Em "h" os papéis trocam (mm = m.T).
        sx = (x1 - x0) / C.PROP["pa_w"]
        s = sx
        cxm = (x0 + x1) / 2
        goal = y + sgn * C.PROP["pa_d"] * s
        for W in (68, 62, 64, 66, 70, 72, 60, 58, 55):
            txv = cxm - s * W / 2
            for L in np.arange(70, 121, 5.0):
                if sgn < 0:
                    tyv = goal
                else:
                    tyv = goal - s * L          # baliza de baixo: linha de fundo em goal
                if ori == "v":
                    p = [s, 1.0, txv, tyv, L, W]
                else:
                    p = [s, 1.0, tyv, txv, L, W]   # em "h": X = tx + s*comprimento, Y = ty + s*largura
                c = cost(p, ori)
                if best is None or c < best[0]:
                    best = (c, p, ori)
    # enquadramentos típicos do programa de origem (campo inteiro na horizontal, meio-campo na vertical)
    for ori, p in (("h", [3.735, 1.0, 23.5, 23.5, 105.0, 68.0]), ("v", [6.35, 1.0, 23.0, 23.0, 95.0, 62.0]),
                   ("v", [6.35, 1.0, 23.0, 278.0 - 6.35 * 95.0, 95.0, 62.0])):
        c = cost(p, ori)
        if best is None or c < best[0]:
            best = (c, p, ori)
    ori = best[2]
    bounds = [(2.5, 10), (0.94, 1.06), (-900, 600), (-900, 600), (60, 125), (40, 85)]
    r = minimize(cost, best[1], args=(ori,), method="Powell", bounds=bounds, options={"xtol": 1e-4, "ftol": 1e-8, "maxiter": 30000})
    p, c = (r.x, r.fun) if r.fun < best[0] else (best[1], best[0])
    return {"ori": ori, "p": [float(v) for v in p], "cost": float(c), "ncand": len(cands)}
