"""Rascunho automático (discos, bonecos, cones, sinalizadores, bolas, balizas) + montagem com correções manuais.

Uso:
  python3 rascunho.py DIR [exi...]      gera DIR/draft/*.json
  montar(DIR, k)                        rascunho + tools/vetorizar/manual/k.json -> desenho final, encaixado
Correções manuais (manual/exiNNN.json): {"keep":[i,...] | "del":[i,...], "mod":{"i":{...}}, "add":[item,...], "fld":{...}, "nofld":1}
  ou {"custom": desenho} para um desenho feito inteiramente à mão.
  itens com "snap":1 são encaixados nos píxeis (rect, ln, d).
"""
import numpy as np, json, os, sys
from PIL import Image, ImageDraw, ImageFont
import detetar, classificar, linhas, snap

HERE = os.path.dirname(os.path.abspath(__file__))
MAN = os.path.join(HERE, "manual")


def draft(S, k):
    FLD = json.load(open(S + "fld.json"))
    a = np.asarray(Image.open(S + "ex/" + k + ".png").convert("RGB")); bg = np.asarray(Image.open(S + "bg/" + k + ".png"))
    obs, lab, dif = detetar.objects(a, bg)
    its, unk = [], []
    for o in obs:
        it = classificar.classify(o, a, lab)
        if it["t"] == "?":
            x0, y0, w, h = o["x0"], o["y0"], o["w"], o["h"]
            mm = lab[y0:y0 + h, x0:x0 + w] == o["id"]
            reg = a[y0:y0 + h, x0:x0 + w].astype(float)
            if linhas.is_goal(reg, mm) and min(w, h) >= 4 and max(w, h) >= 10:
                its.append({"t": "goal", "x": round(x0 + w / 2, 1), "y": round(y0 + h / 2, 1), "w": w, "h": h}); continue
            unk.append(it); continue
        its.append(it)
    d = {"v": 2, "w": 440, "h": 302, "fld": FLD[k], "it": its}
    json.dump({"d": d, "unk": unk}, open(S + "draft/" + k + ".json", "w"))
    return d, unk


def montar(S, k):
    p = os.path.join(MAN, k + ".json")
    if os.path.exists(p) and "custom" in json.load(open(p)):
        return json.load(open(p))["custom"]          # desenhado inteiramente à mão
    dd = json.load(open(S + "draft/" + k + ".json")); d = dd["d"]
    a = np.asarray(Image.open(S + "ex/" + k + ".png").convert("RGB"))
    p = os.path.join(MAN, k + ".json")
    E = json.load(open(p)) if os.path.exists(p) else {}
    its = []
    for i, it in enumerate(d["it"]):
        if i in E.get("del", []) or (E.get("keep") is not None and i not in E["keep"]):
            continue
        it = dict(it); m = E.get("mod", {}).get(str(i), {})
        # discos brancos/pretos do rascunho: raio e centro afinados pelo contorno (a deteção inclui o halo)
        if it["t"] == "d" and "r" not in m and it.get("c") in ("#ffffff", "#141414") and it.get("r", 0) >= 4.5:
            snap.snap_disc(a, it, rad=1.5)
            it["x"], it["y"], it["r"] = float(it["x"]), float(it["y"]), float(it["r"])
        it.update(m)
        its.append(it)
    for it in E.get("add", []):
        it = dict(it)
        if it.pop("snap", 0):
            if it["t"] == "rect": snap.snap_rect(a, it)
            elif it["t"] == "ln": snap.snap_line(a, it)
            elif it["t"] == "d": snap.snap_disc(a, it)
        its.append(it)
    fld = dict(d["fld"]); fld.update(E.get("fld", {}))
    out = {"v": 2, "w": d.get("w", 440), "h": d.get("h", 302), "fld": fld, "it": its}
    if E.get("nofld"):
        out.pop("fld")
    return out


def sheet(S, k, d, R, unk=None, tag="rev"):
    a = Image.open(S + "ex/" + k + ".png").convert("RGB")
    w, h = a.size
    orig = a.resize((2 * w, 2 * h), Image.LANCZOS)
    dr = ImageDraw.Draw(orig)
    for x in range(0, w, 10):
        dr.line([(2 * x, 0), (2 * x, 2 * h)], fill=(255, 255, 255) if x % 50 == 0 else (150, 210, 150), width=1)
    for y in range(0, h, 10):
        dr.line([(0, 2 * y), (2 * w, 2 * y)], fill=(255, 255, 255) if y % 50 == 0 else (150, 210, 150), width=1)
    for x in range(0, w, 50):
        for y in range(0, h, 50):
            dr.text((2 * x + 2, 2 * y + 1), f"{x},{y}", fill=(255, 255, 0))
    for j, u in enumerate(unk or []):
        dr.rectangle([2 * u["x0"] - 2, 2 * u["y0"] - 2, 2 * (u["x0"] + u["w"]) + 1, 2 * (u["y0"] + u["h"]) + 1], outline=(255, 0, 255), width=2)
    vec = Image.fromarray(R.render(d))
    dv = ImageDraw.Draw(vec)
    if tag == "rev":
        for i, it in enumerate(d["it"]):
            x = it.get("x", it.get("pts", [[0, 0]])[0][0]); y = it.get("y", it.get("pts", [[0, 0]])[0][1])
            dv.text((2 * x + 6, 2 * y - 14), str(i), fill=(255, 0, 255))
    out = Image.new("RGB", (2 * w, 4 * h + 30), "white")
    out.paste(orig, (0, 0)); out.paste(vec, (0, 2 * h + 30))
    ImageDraw.Draw(out).text((4, 2 * h + 8), f"{k}  itens {len(d['it'])}  por identificar {len(unk or [])}", fill="black")
    out.save(S + tag + "/" + k + ".png")


if __name__ == "__main__":
    from render import Renderer
    S = sys.argv[1]; only = sys.argv[2:] or None
    os.makedirs(S + "draft", exist_ok=True); os.makedirs(S + "rev", exist_ok=True)
    FLD = json.load(open(S + "fld.json"))
    R = Renderer(scale=2)
    for k in sorted(FLD):
        if only and k not in only:
            continue
        d, unk = draft(S, k)
        sheet(S, k, d, R, unk)
        print(k, len(d["it"]), len(unk), flush=True)
    R.close()
