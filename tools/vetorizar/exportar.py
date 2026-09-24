"""Monta os desenhos finais de todos os exercícios e grava data/exercicios_vetor.json ({imgk: desenho v2}).

Uso: python3 exportar.py DIR     (DIR com ex/, bg/, fld.json e draft/ gerados pelo pipeline)
"""
import json, os, sys
import rascunho

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def limpo(v):
    if isinstance(v, float):
        r = round(v, 2)
        return int(r) if r == int(r) else r
    if isinstance(v, list):
        return [limpo(x) for x in v]
    if isinstance(v, dict):
        return {k: limpo(x) for k, x in v.items() if k != "snap"}
    return v


if __name__ == "__main__":
    S = sys.argv[1]
    ks = sorted(f[:-5] for f in os.listdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "manual")) if f.endswith(".json"))
    out = {k: limpo(rascunho.montar(S, k)) for k in ks}
    p = os.path.join(ROOT, "data", "exercicios_vetor.json")
    json.dump(out, open(p, "w"), separators=(",", ":"), ensure_ascii=False)
    print(len(out), "desenhos,", os.path.getsize(p) // 1024, "KB ->", p)
