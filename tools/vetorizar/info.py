"""Lista os itens do rascunho e os componentes por identificar de uma captura (ajuda à revisão manual)."""
import json, sys
S=sys.argv[1]
for k in sys.argv[2:]:
    dd=json.load(open(S+"draft/"+k+".json"))
    print("==",k)
    for i,it in enumerate(dd["d"]["it"]):
        print(f"  {i:2d} {it['t']:4s} "+" ".join(f"{a}={v}" for a,v in it.items() if a!="t"))
    for j,u in enumerate(dd["unk"]):
        print(f"  U{j} box=({u['x0']},{u['y0']},{u['w']}x{u['h']}) rgb={u['rgb']} n={u['n']}")
