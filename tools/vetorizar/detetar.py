"""Deteção de objetos: diferença entre a captura e o campo vetorial limpo; componentes conexas com medidas de forma e cor."""
import numpy as np
from scipy import ndimage


def fieldish(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (g > r + 22) & (g > b + 22)


def button_mask(a):
    """Botão "ECRÃ INTEIRO" (canto inferior esquerdo), grande ou pequeno."""
    m = np.zeros(a.shape[:2], bool)
    h = a.shape[0]
    for (x0, x1, y0, y1) in ((4, 100, h - 30, h - 3), (2, 50, h - 12, h)):
        reg = a[y0:y1, x0:x1].astype(int)
        dk = (reg.sum(2) < 170).mean()
        if dk > 0.35:
            m[y0 - 1:y1 + 1, x0 - 1:x1 + 1] = True
    return m


def objects(a, bg, thr=48, minpx=4):
    a = a.astype(float); bg = bg.astype(float)
    dif = np.sqrt(((a - bg) ** 2).sum(2))
    bgl = (bg.sum(2) > 420)                                  # linhas do campo no desenho limpo
    near = ndimage.binary_dilation(bgl, iterations=2)
    lineish = fieldish(a) & (a.sum(2) > 300)
    ok = ~(near & (lineish | fieldish(a))) & ~(lineish & (dif < 110)) & ~button_mask(a)
    m = (ndimage.binary_opening((dif > thr) & ok, iterations=1) | (dif > thr * 1.8)) & ok
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None:
            continue
        mm = lab[sl] == i
        npx = int(mm.sum())
        if npx < minpx:
            continue
        ys, xs = np.nonzero(mm)
        ys = ys + sl[0].start; xs = xs + sl[1].start
        px = a[ys, xs]
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        out.append({
            "id": i, "x0": int(sl[1].start), "y0": int(sl[0].start), "w": int(w), "h": int(h), "n": npx,
            "cx": float(xs.mean()), "cy": float(ys.mean()),
            "fill": npx / float(w * h),
            "rgb": [int(v) for v in np.median(px, 0)],
            "dark": float((px.sum(1) < 180).mean()), "white": float((px.min(1) > 200).mean()),
        })
    return out, lab, dif
