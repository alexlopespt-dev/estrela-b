"""Faixas da relva: bandas escuras perpendiculares ao comprimento do campo, medidas diretamente na captura."""
import numpy as np
from scipy import ndimage


def bands(a, ori):
    g = a[..., 1].astype(float)
    # perfil ao longo do comprimento (linhas da imagem em "v", colunas em "h"), mediana robusta a objetos
    prof = np.median(g, axis=1) if ori != "h" else np.median(g, axis=0)
    prof = ndimage.median_filter(prof, size=5)
    lo, hi = np.percentile(prof, 15), np.percentile(prof, 85)
    if hi - lo < 5:
        return []
    thr = (lo + hi) / 2
    dark = prof < thr
    out, n, i = [], len(dark), 0
    while i < n:
        if dark[i]:
            j = i
            while j < n and dark[j]:
                j += 1
            # fronteira sub-píxel: interpolar onde o perfil cruza o limiar
            def edge(k0, k1):
                p0, p1 = prof[k0], prof[k1]
                return k0 + (thr - p0) / (p1 - p0) if p1 != p0 else (k0 + k1) / 2
            a0 = edge(i - 1, i) + 0.5 if i > 0 else 0.0
            b0 = edge(j - 1, j) + 0.5 if j < n else float(n)
            if b0 - a0 >= 6:
                out.append([round(a0, 2), round(b0, 2)])
            i = j
        else:
            i += 1
    return out
