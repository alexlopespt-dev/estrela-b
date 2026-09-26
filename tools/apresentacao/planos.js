const pptxgen = require("pptxgenjs");
const path = require("path");
const IC = (k, c = "g") => path.join(__dirname, "img", "ic", `${k}_${c}.png`);
const C = { grena: "6B1426", dark: "3F0913", ink: "221418", gold: "F2BD4B", soft: "F8F3F4", line: "E6DADD", mute: "7A6A6F", white: "FFFFFF" };
const TF = "Arial", BF = "Calibri";
const pres = new pptxgen(); pres.layout = "LAYOUT_WIDE";
const T = (s, text, o) => s.addText(text, { isTextBox: true, fontFace: BF, color: C.ink, margin: 0, valign: "top", ...o });
function iconDot(s, k, x, y, d, bgc, ic) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bgc }, line: { color: bgc } });
  s.addImage({ path: IC(k, ic), x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 });
}
const s = pres.addSlide(); s.background = { color: C.white };
T(s, "PLANOS", { x: 0.8, y: 0.6, w: 8, h: 0.3, fontFace: TF, fontSize: 11, bold: true, color: C.grena, charSpacing: 3 });
T(s, "Três planos, a crescer com a equipa técnica", { x: 0.8, y: 0.9, w: 11.5, h: 0.7, fontFace: TF, fontSize: 34, bold: true });
T(s, "Cada plano inclui tudo o do anterior. A equipa começa onde precisa e sobe quando quiser.", { x: 0.8, y: 1.62, w: 11.5, h: 0.4, fontSize: 15, color: C.mute });

const plans = [
  { k: "clip", name: "Plus", tag: "O dia a dia da equipa", inc: null,
    items: ["Painel", "Agenda", "Treinos", "Planeamento", "Modelo de jogo", "Presenças", "Gestão de plantel", "Scouting"] },
  { k: "chart", name: "Premium", tag: "Saúde, dados e adversário", inc: "Tudo do plano Plus",
    items: ["Clínico", "Estatísticas", "Adversários", "Testes físicos"] },
  { k: "bolt", name: "Pro", tag: "Performance inteligente", inc: "Tudo do plano Premium",
    items: ["Monitorização", "Gestão de cargas"], ai: true },
];
const W = 3.78, G = 0.3, Y = 2.35, H = 4.45;
plans.forEach((p, i) => {
  const x = 0.8 + i * (W + G), pro = !!p.ai, y = pro ? Y - 0.15 : Y, h = pro ? H + 0.15 : H;
  const fg = pro ? C.white : C.ink, sub = pro ? "E9DADE" : C.mute;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: W, h, fill: { color: pro ? C.grena : C.soft }, line: { color: pro ? C.grena : C.line, width: 1 }, rectRadius: 0.14,
    shadow: pro ? { type: "outer", color: "000000", opacity: 0.25, blur: 12, offset: 4, angle: 90 } : undefined });
  if (pro) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + (W - 1.7) / 2, y: y - 0.17, w: 1.7, h: 0.34, fill: { color: C.gold }, line: { color: C.gold }, rectRadius: 0.17 });
    T(s, "MAIS COMPLETO", { x: x + (W - 1.7) / 2, y: y - 0.17, w: 1.7, h: 0.34, fontSize: 9.5, bold: true, color: C.dark, align: "center", valign: "middle", charSpacing: 1 });
  }
  iconDot(s, p.k, x + 0.3, y + 0.32, 0.66, pro ? C.white : C.grena, pro ? "r" : "g");
  T(s, p.name, { x: x + 1.15, y: y + 0.26, w: 1.9, h: 0.5, fontFace: TF, fontSize: 26, bold: true, color: fg, valign: "middle" });
  T(s, p.tag, { x: x + 1.15, y: y + 0.76, w: W - 1.4, h: 0.3, fontSize: 12.5, italic: true, color: pro ? C.gold : C.grena });
  let ly = y + 1.4;
  if (p.inc) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: ly - 0.04, w: W - 0.6, h: 0.42, fill: { color: pro ? "8A2238" : "EFE3E6" }, line: { color: pro ? "8A2238" : "EFE3E6" }, rectRadius: 0.08 });
    s.addImage({ path: IC("layers", pro ? "g" : "r"), x: x + 0.42, y: ly + 0.05, w: 0.24, h: 0.24 });
    T(s, p.inc, { x: x + 0.78, y: ly - 0.04, w: W - 1.1, h: 0.42, fontSize: 13, bold: true, color: fg, valign: "middle" });
    ly += 0.55;
    T(s, "e ainda:", { x: x + 0.3, y: ly, w: W - 0.6, h: 0.28, fontSize: 11.5, color: sub }); ly += 0.32;
  }
  const two = false, step = p.items.length > 5 ? 0.34 : 0.38, cw = (W - 0.6) / 2, rows = two ? Math.ceil(p.items.length / 2) : p.items.length;
  p.items.forEach((t, j) => { const cx = x + 0.3 + (two && j >= rows ? cw : 0), cy = ly + (two ? j % rows : j) * step;
    s.addImage({ path: IC("check", pro ? "g" : "r"), x: cx + 0.02, y: cy + 0.04, w: 0.2, h: 0.2 });
    T(s, t, { x: cx + 0.33, y: cy, w: (two ? cw : W - 0.6) - 0.35, h: 0.28, fontSize: 14, bold: !!p.inc, color: fg, valign: "middle" });
  });
  ly += rows * step;
  if (pro) {
    ly += 0.12;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.3, y: ly, w: W - 0.6, h: 0.78, fill: { color: C.dark }, line: { color: C.gold, width: 1 }, rectRadius: 0.1 });
    s.addImage({ path: IC("brain", "g"), x: x + 0.45, y: ly + 0.2, w: 0.38, h: 0.38 });
    T(s, [{ text: "Com ajuda de IA", options: { bold: true, color: C.gold, fontSize: 13.5, breakLine: true } },
          { text: "leitura automática da prontidão e da carga", options: { color: "E9DADE", fontSize: 11 } }],
      { x: x + 0.98, y: ly + 0.1, w: W - 1.4, h: 0.6, valign: "middle" });
  }
});
T(s, "17", { x: 12.45, y: 7.0, w: 0.5, h: 0.25, fontSize: 10, bold: true, color: "B7A3A8", align: "right" });
s.addNotes("Três planos, cada um inclui o anterior. Plus: o dia a dia da equipa técnica — painel, agenda, treinos, planeamento, modelo de jogo, presenças, gestão de plantel e scouting. Premium: junta clínico, estatísticas, adversários e testes físicos. Pro: junta a monitorização e a gestão de cargas com ajuda de IA.");
pres.writeFile({ fileName: path.join(__dirname, "planos.pptx") }).then(f => console.log("ok", f));
