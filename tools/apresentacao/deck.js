const pptxgen = require("pptxgenjs");
const path = require("path");
const IMG = f => path.join(__dirname, "img", f);
const IC = (k, c = "g") => IMG(`ic/${k}_${c}.png`);
const { imageSize } = (() => { const sharp = null; return { imageSize: null }; })();
const sizeOf = f => { const b = require("fs").readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };   // PNG

const C = { grena: "6B1426", dark: "3F0913", ink: "221418", gold: "F2BD4B", soft: "F8F3F4", line: "E6DADD", mute: "7A6A6F", white: "FFFFFF", red: "D62B2F", green: "1F7A3D" };
const TF = "Arial", BF = "Calibri";
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";   // 13.333 x 7.5
pres.author = "Departamento técnico — CF Estrela da Amadora B";
pres.title = "A app da equipa técnica — apresentação Play7";

// imagem com proporção certa dentro de uma caixa (x,y,w,h), alinhada
function pic(s, file, x, y, w, h, align = "c") {
  const { w: iw, h: ih } = sizeOf(file); const r = Math.min(w / iw, h / ih); const pw = iw * r, ph = ih * r;
  const px = align === "l" ? x : align === "r" ? x + w - pw : x + (w - pw) / 2;
  s.addImage({ path: file, x: px, y: y + (h - ph) / 2, w: pw, h: ph });
  return { x: px, y: y + (h - ph) / 2, w: pw, h: ph };
}
const T = (s, text, o) => s.addText(text, { isTextBox: true, fontFace: BF, color: C.ink, margin: 0, valign: "top", ...o });
function darkBg(s, v = 1) { s.background = { path: IMG(v === 2 ? "bg_dark2.jpg" : "bg_dark.jpg") }; }
function kicker(s, text, x, y, dark) { T(s, text.toUpperCase(), { x, y, w: 8, h: 0.3, fontFace: TF, fontSize: 11, bold: true, color: dark ? C.gold : C.grena, charSpacing: 3 }); }
function title(s, text, x, y, w, dark, size = 34) { T(s, text, { x, y, w, h: 1.2, fontFace: TF, fontSize: size, bold: true, color: dark ? C.white : C.ink, valign: "top" }); }
function iconDot(s, k, x, y, d = 0.62, bgc = C.grena, ic = "g") {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bgc }, line: { color: bgc } });
  s.addImage({ path: IC(k, ic), x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52 });
}
function feat(s, k, head, body, x, y, w, dark) {   // ícone + título + texto
  iconDot(s, k, x, y, 0.56, dark ? "FFFFFF" : C.grena, dark ? "r" : "g");
  T(s, head, { x: x + 0.75, y: y - 0.02, w: w - 0.75, h: 0.3, fontSize: 15, bold: true, color: dark ? C.white : C.ink });
  T(s, body, { x: x + 0.75, y: y + 0.3, w: w - 0.75, h: 0.62, fontSize: 12, color: dark ? "E9DADE" : C.mute });
}
function pageNo(s, n, dark) { T(s, String(n).padStart(2, "0"), { x: 12.45, y: 7.0, w: 0.5, h: 0.25, fontSize: 10, bold: true, color: dark ? "C9A7AF" : "B7A3A8", align: "right" }); }
let n = 0;

/* 1 — capa */
{ const s = pres.addSlide(); darkBg(s); n++;
  pic(s, IMG("crest.png"), 0.8, 0.75, 0.75, 1.0, "l");
  kicker(s, "CF Estrela da Amadora · Equipa B", 1.75, 1.0, true);
  T(s, "Departamento técnico", { x: 1.75, y: 1.32, w: 5, h: 0.3, fontSize: 13, color: "E9DADE" });
  T(s, "A app da\nequipa técnica", { x: 0.8, y: 2.25, w: 6.2, h: 2.2, fontFace: TF, fontSize: 56, bold: true, color: C.white, lineSpacingMultiple: 0.95 });
  T(s, "Nasceu para a nossa equipa. Está pronta para o futebol.", { x: 0.8, y: 4.55, w: 5.6, h: 0.8, fontSize: 20, color: "F3E6E9" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 6.2, w: 4.6, h: 0.5, fill: { color: C.gold }, line: { color: C.gold }, rectRadius: 0.25 });
  T(s, "Apresentação à Play7 · setembro 2026", { x: 0.8, y: 6.2, w: 4.6, h: 0.5, fontSize: 13, bold: true, color: C.dark, align: "center", valign: "middle" });
  pic(s, IMG("ipad.png"), 6.3, 1.1, 6.9, 5.2);
  pic(s, IMG("iphone.png"), 10.9, 3.2, 2.2, 4.1);
  s.addNotes("Abertura. Somos a equipa técnica da Equipa B do Estrela da Amadora (III Distrital). Construímos uma aplicação para o nosso dia a dia e hoje queremos mostrar-vos porque achamos que ela pode ir muito mais longe.");
}

/* 2 — como começou */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "A nossa história", 0.8, 0.6); title(s, "Começou como uma ferramenta só nossa", 0.8, 0.9, 11.5);
  const steps = [
    ["clip", "Uma necessidade", "Organizar treinos, presenças e jogos da Equipa B sem folhas soltas nem grupos de WhatsApp."],
    ["whistle", "O dia a dia do balneário", "Cada pedido da equipa técnica passou a funcionalidade: carga, modelo de jogo, convocatória, bolas paradas…"],
    ["star", "Um produto", "Olhámos para trás e tínhamos uma plataforma mais completa do que as soluções que usávamos."],
    ["rocket", "O próximo patamar", "Levar a app a outras equipas técnicas — da formação ao sénior, do distrital ao profissional."]];
  steps.forEach(([k, h, b], i) => { const x = 0.8 + i * 3.02, y = 2.55;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.78, h: 3.1, fill: { color: i === 3 ? C.grena : C.soft }, line: { color: i === 3 ? C.grena : C.line }, rectRadius: 0.14 });
    iconDot(s, k, x + 0.3, y + 0.32, 0.72, i === 3 ? C.white : C.grena, i === 3 ? "r" : "g");
    T(s, String(i + 1).padStart(2, "0"), { x: x + 1.85, y: y + 0.36, w: 0.7, h: 0.5, fontFace: TF, fontSize: 24, bold: true, color: i === 3 ? C.gold : "D9C4C9", align: "right" });
    T(s, h, { x: x + 0.3, y: y + 1.25, w: 2.3, h: 0.7, fontSize: 16, valign: "bottom", bold: true, color: i === 3 ? C.white : C.ink });
    T(s, b, { x: x + 0.3, y: y + 2.02, w: 2.25, h: 1.0, fontSize: 12, color: i === 3 ? "F3E6E9" : C.mute }); });
  T(s, "“Cada pedido da equipa técnica transformou-se numa funcionalidade. Quando demos por isso, tínhamos um produto.”", { x: 0.8, y: 6.05, w: 11.7, h: 0.6, fontSize: 16, italic: true, color: C.grena });
  pageNo(s, n);
  s.addNotes("A ideia inicial era uma app só para treinadores, e só para a nossa equipa. À medida que a fomos usando, cada necessidade real virou funcionalidade. Hoje percebemos que isto é um produto — e melhor do que o que encontramos no mercado.");
}

/* 3 — problema */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "O problema", 0.8, 0.6); title(s, "O trabalho de uma equipa técnica vive espalhado", 0.8, 0.9, 7.2);
  const it = [["xls", "Folhas de cálculo", "Planos, presenças e cargas em ficheiros diferentes."], ["wa", "WhatsApp", "Convocatórias, horários e avisos perdidos em conversas."],
    ["ppt", "PowerPoint e papel", "Exercícios, modelo de jogo e bolas paradas desenhados à parte."], ["form", "Formulários soltos", "Bem-estar e esforço recolhidos sem ligação ao treino."],
    ["folder", "Pastas e PDFs", "Relatórios feitos à mão, sempre a partir do zero."], ["link", "Nada comunica", "Ninguém vê o todo: treino, carga, jogo e atleta separados."]];
  it.forEach(([k, h, b], i) => feat(s, k, h, b, 0.8 + (i % 2) * 3.65, 2.35 + Math.floor(i / 2) * 1.35, 3.45));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.55, y: 2.3, w: 4.0, h: 3.95, fill: { color: C.grena }, line: { color: C.grena }, rectRadius: 0.16 });
  T(s, "O resultado", { x: 8.95, y: 2.65, w: 3.3, h: 0.35, fontSize: 13, bold: true, color: C.gold, charSpacing: 2 });
  T(s, "Horas a copiar informação de um lado para o outro — e decisões tomadas sem ver o todo.", { x: 8.95, y: 3.1, w: 3.3, h: 2.2, fontFace: TF, fontSize: 21, bold: true, color: C.white });
  T(s, "É o que acontece na maioria das equipas técnicas, do distrital ao profissional.", { x: 8.95, y: 5.35, w: 3.3, h: 0.7, fontSize: 12.5, color: "F3E6E9" });
  pageNo(s, n);
  s.addNotes("Todos conhecemos isto: Excel para planos e presenças, WhatsApp para convocatórias, PowerPoint para exercícios e bolas paradas, formulários para o bem-estar. Nada comunica e ninguém vê o todo.");
}

/* 4 — solução: módulos */
{ const s = pres.addSlide(); darkBg(s, 2); n++;
  kicker(s, "A solução", 0.8, 0.6, true); title(s, "Uma só plataforma. Da preparação ao pós-jogo.", 0.8, 0.9, 11.5, true);
  const m = [["cal", "Agenda", "Semana-tipo, treinos e jogos"], ["clip", "Treino", "Plano por blocos, presenças, RPE"], ["chart", "Planeamento", "Ciclos, momentos do jogo, carga"], ["brain", "Modelo de jogo", "Princípios com esquemas"],
    ["book", "Exercícios", "Biblioteca com desenho vetorial"], ["ball", "Jogos", "Convocatória, onze, eventos, notas"], ["kick", "Bolas paradas", "Quadro tático animado"], ["heart", "Monitorização", "Bem-estar, ACWR, prontidão"],
    ["steth", "Clínico", "Lesões, tratamentos, regresso"], ["run", "Testes físicos", "Velocidade, salto, T, vaivém"], ["search", "Scouting", "Alvos e fichas de adversários"], ["trophy", "Estatísticas", "Por atleta e da época"]];
  m.forEach(([k, h, b], i) => { const x = 0.8 + (i % 4) * 2.98, y = 2.3 + Math.floor(i / 4) * 1.5;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.78, h: 1.3, fill: { color: "FFFFFF", transparency: 90 }, line: { color: "FFFFFF", transparency: 75 }, rectRadius: 0.12 });
    iconDot(s, k, x + 0.22, y + 0.33, 0.62, C.gold, "r");
    T(s, h, { x: x + 1.0, y: y + 0.3, w: 1.75, h: 0.35, fontSize: 13.5, bold: true, color: C.white });
    T(s, b, { x: x + 1.0, y: y + 0.66, w: 1.7, h: 0.5, fontSize: 11, color: "EAD6DB" }); });
  pageNo(s, n, true);
  s.addNotes("Doze módulos que falam uns com os outros. O treino alimenta a carga; a carga alimenta a monitorização; o jogo alimenta as estatísticas do atleta. Tudo no mesmo sítio.");
}

/* 5 — números */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "Em números", 0.8, 0.6); title(s, "Já em uso, todos os dias, na Equipa B", 0.8, 0.9, 8);
  const st = [["12", "módulos integrados", "do planeamento ao pós-jogo"], ["132", "exercícios", "na biblioteca, todos em vetor"], ["52", "princípios de jogo", "com os esquemas da equipa técnica"],
    ["6", "tipos de bola parada", "livres, cantos, penálti, lançamento"], ["3", "ecrãs", "computador, iPad e iPhone"], ["0", "instalações", "abre no browser e funciona sem rede"]];
  st.forEach(([v, h, b], i) => { const x = 0.8 + (i % 3) * 2.95, y = 2.45 + Math.floor(i / 3) * 2.2;
    T(s, v, { x, y, w: 2.7, h: 1.0, fontFace: TF, fontSize: 60, bold: true, color: C.grena });
    T(s, h, { x, y: y + 1.05, w: 2.7, h: 0.35, fontSize: 15, bold: true });
    T(s, b, { x, y: y + 1.4, w: 2.7, h: 0.35, fontSize: 12, color: C.mute }); });
  pic(s, IMG("iphone_jogo.png"), 9.9, 1.0, 3.0, 6.0);
  pageNo(s, n);
  s.addNotes("Não é um protótipo: é a ferramenta que a nossa equipa técnica usa todas as semanas. 132 exercícios redesenhados em vetor, o nosso modelo de jogo completo, e funciona em computador, iPad e telemóvel, mesmo sem rede.");
}

/* 6 — treino */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "Treino", 0.8, 0.6); title(s, "Planear e registar cada sessão em minutos", 0.8, 0.9, 4.6, false, 30);
  feat(s, "clip", "Plano por blocos", "Exercícios da biblioteca, minutos, princípios e momento do jogo em cada bloco.", 0.8, 2.75, 4.5);
  feat(s, "users", "Presenças e RPE", "Presente, atraso, falta, lesionado — e a perceção de esforço de cada atleta.", 0.8, 3.85, 4.5);
  feat(s, "cal", "Semana-tipo automática", "Treinos de terça a sexta criados de uma vez, já com o microciclo.", 0.8, 4.95, 4.5);
  feat(s, "pdf", "Plano e relatório em PDF", "No formato da equipa técnica, um exercício em grande por página.", 0.8, 6.05, 4.5);
  pic(s, IMG("treino.png"), 5.4, 0.55, 7.7, 6.5);
  pageNo(s, n);
  s.addNotes("O treinador monta o treino a partir da biblioteca, marca presenças e RPE no fim, e sai o PDF do plano e o relatório. Em minutos.");
}

/* 7 — periodização e carga */
{ const s = pres.addSlide(); s.background = { color: C.soft }; n++;
  kicker(s, "Planeamento", 0.8, 0.6); title(s, "Ver o que andamos a treinar — e quanto", 0.8, 0.9, 11.5);
  const a = pic(s, IMG("momentos.png"), 0.55, 2.0, 6.2, 3.3); const b = pic(s, IMG("carga.png"), 6.6, 2.0, 6.2, 3.3);
  T(s, "Momentos do jogo trabalhados", { x: 0.9, y: 5.55, w: 5.6, h: 0.35, fontSize: 15, bold: true });
  T(s, "Organização ofensiva e defensiva, transições e bolas paradas: a percentagem de tempo de cada uma, por microciclo, período e época.", { x: 0.9, y: 5.92, w: 5.6, h: 0.7, fontSize: 12, color: C.mute });
  T(s, "Carga planeada vs. real", { x: 6.95, y: 5.55, w: 5.6, h: 0.35, fontSize: 15, bold: true });
  T(s, "Intensidade × minutos contra RPE × duração, com alerta quando a semana foge do habitual. Relatório semanal em PDF.", { x: 6.95, y: 5.92, w: 5.6, h: 0.7, fontSize: 12, color: C.mute });
  pageNo(s, n);
  s.addNotes("Aqui está uma das coisas que não vemos noutras ferramentas: o gráfico dos momentos do jogo — quanto tempo dedicámos a cada momento em cada microciclo — e a carga planeada contra a carga real, com alertas.");
}

/* 8 — modelo de jogo e exercícios */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "Metodologia", 0.8, 0.6); title(s, "O modelo de jogo ligado ao treino", 0.8, 0.9, 9.5);
  pic(s, IMG("modelo.png"), 0.45, 1.8, 7.3, 5.3, "l");
  pic(s, IMG("exercicio.png"), 7.75, 0.5, 2.6, 6.7);
  feat(s, "brain", "Princípios", "Os 5 momentos do jogo, com os esquemas da equipa técnica.", 10.45, 1.6, 2.55);
  feat(s, "book", "Biblioteca", "Desenho vetorial nítido, objetivos, variantes.", 10.45, 3.25, 2.55);
  feat(s, "link", "Tudo ligado", "Cada exercício soma tempo ao princípio que trabalha.", 10.45, 4.9, 2.55);
  pageNo(s, n);
  s.addNotes("O nosso modelo de jogo está dentro da app, com os esquemas do PowerPoint da equipa técnica. Cada exercício liga-se aos princípios que trabalha — e isso alimenta o gráfico do planeamento.");
}

/* 9 — dia de jogo */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "Dia de jogo", 0.8, 0.6); title(s, "Da convocatória ao relatório", 0.8, 0.9, 7.5);
  pic(s, IMG("jogo.png"), 0.45, 1.85, 7.0, 4.6, "l");
  T(s, "Convocatória, onze inicial, golos, cartões e substituições: os minutos de cada jogador são calculados sozinhos. Notas no modo pós-jogo e ficha em PDF.", { x: 0.8, y: 6.5, w: 6.5, h: 0.7, fontSize: 12.5, color: C.mute });
  pic(s, IMG("doc_conv.png"), 7.55, 1.2, 2.85, 5.6); pic(s, IMG("doc_hor.png"), 10.25, 1.2, 2.85, 5.6);
  T(s, "Convocatória e horário de jogo prontos para o WhatsApp", { x: 7.6, y: 6.8, w: 4.7, h: 0.35, fontSize: 12.5, bold: true, color: C.grena, align: "center" });
  pageNo(s, n);
  s.addNotes("No dia de jogo tudo sai da app: convocatória com números e nomes, o cartaz com o horário de jogo, a ficha com minutos automáticos e as notas de cada atleta.");
}

/* 10 — bolas paradas */
{ const s = pres.addSlide(); darkBg(s); n++;
  kicker(s, "Bolas paradas", 0.8, 0.6, true); title(s, "Um quadro tático feito à medida", 0.8, 0.9, 4.2, true);
  pic(s, IMG("quadro.png"), 5.1, 0.45, 8.0, 6.7);
  feat(s, "kick", "6 modelos prontos", "Livres ofensivos e defensivos, cantos curto e longo, penálti e lançamento.", 0.8, 2.5, 4.2, true);
  feat(s, "play", "Passos e animação", "Mostra o movimento de cada jogador, passo a passo.", 0.8, 3.7, 4.2, true);
  feat(s, "users", "Com o plantel", "Toca num atleta e ele vai para o campo com o nome.", 0.8, 4.9, 4.2, true);
  feat(s, "pdf", "Imagem e PDF", "Escolhe as bolas paradas e sai o dossier completo.", 0.8, 6.1, 4.2, true);
  pageNo(s, n, true);
  s.addNotes("O quadro das bolas paradas foi feito igual ao modelo que já usávamos: arrastar jogadores, setas curvas, zonas, passos animados e exportação em imagem ou PDF.");
}

/* 11 — performance e saúde */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "Performance e saúde", 0.8, 0.6); title(s, "Decidir com dados de cada atleta", 0.8, 0.9, 7.5);
  pic(s, IMG("monitorizacao.png"), 0.45, 1.75, 7.4, 5.1, "l");
  pic(s, IMG("clinico.png"), 7.9, 1.6, 5.1, 2.6); pic(s, IMG("testes.png"), 7.9, 4.15, 5.1, 2.6);
  T(s, "Bem-estar (Hooper), carga aguda:crónica, prontidão 0-100 · lesões com plano de recuperação · testes físicos em 3 momentos da época", { x: 0.8, y: 6.9, w: 11.3, h: 0.3, fontSize: 11.5, color: C.mute });
  pageNo(s, n);
  s.addNotes("A monitorização lê o questionário dos atletas e calcula a prontidão, o ACWR e a monotonia. O clínico acompanha cada lesão até ao regresso e os testes físicos mostram a evolução em setembro, janeiro e maio.");
}

/* 12 — plantel, scouting, adversários, estatísticas */
{ const s = pres.addSlide(); s.background = { color: C.soft }; n++;
  kicker(s, "Gestão", 0.8, 0.6); title(s, "O plantel, o mercado e o adversário", 0.8, 0.9, 11);
  const g = [["atleta.png", "Ficha do atleta", "Minutos, notas, testes, avaliações, historial clínico"], ["estatisticas.png", "Estatísticas", "Por atleta e grelha da época"],
    ["adversarios.png", "Adversários", "Fichas com emblema, plano de jogo e observações"], ["scouting.png", "Scouting", "Alvos, relatórios, potencial e recomendação"]];
  g.forEach(([f, h, b], i) => { const x = 0.55 + (i % 2) * 6.2, y = 1.75 + Math.floor(i / 2) * 2.75;
    pic(s, IMG(f), x, y, 3.7, 2.55, "l");
    T(s, h, { x: x + 3.85, y: y + 0.75, w: 2.2, h: 0.35, fontSize: 16, bold: true });
    T(s, b, { x: x + 3.85, y: y + 1.12, w: 2.2, h: 0.9, fontSize: 12, color: C.mute }); });
  pageNo(s, n);
  s.addNotes("Tudo o que sabemos de cada atleta num só ecrã. E o mesmo para quem observamos no scouting e para o próximo adversário.");
}

/* 13 — dispositivos */
{ const s = pres.addSlide(); darkBg(s, 2); n++;
  kicker(s, "Em qualquer lado", 0.8, 0.6, true); title(s, "No balneário, no banco, no autocarro", 0.8, 0.9, 6, true);
  pic(s, IMG("ipad.png"), 6.0, 0.9, 5.4, 5.9); pic(s, IMG("iphone.png"), 10.7, 2.2, 2.4, 4.9);
  feat(s, "wifi", "Funciona sem rede", "Guarda no dispositivo e envia quando a ligação volta.", 0.8, 2.55, 4.9, true);
  feat(s, "sync", "Equipa técnica em sintonia", "O que um adjunto grava aparece aos outros em segundos.", 0.8, 3.7, 4.9, true);
  feat(s, "moon", "Pensada para iPad e iPhone", "Tema noite, ecrãs tácteis, sem instalar nada.", 0.8, 4.85, 4.9, true);
  feat(s, "shield", "Dados seguros", "Cópia diária automática e apagados recuperáveis.", 0.8, 6.0, 4.9, true);
  pageNo(s, n, true);
  s.addNotes("Abre no browser, em qualquer dispositivo, e funciona sem rede. A equipa técnica partilha os dados entre si: o que um grava, os outros veem em segundos. E há cópias diárias automáticas.");
}

/* 14 — porque é diferente */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "Porque é diferente", 0.8, 0.6); title(s, "Feita por quem está no campo", 0.8, 0.9, 11);
  const p = [["whistle", "Nasceu no balneário", "Cada funcionalidade responde a uma necessidade real de uma equipa técnica em competição."],
    ["link", "Tudo ligado", "O treino alimenta a carga, a carga a monitorização, o jogo as estatísticas. Um dado, muitas leituras."],
    ["pdf", "Pronta a partilhar", "Planos, convocatórias, horários, relatórios e bolas paradas saem prontos, com a imagem do clube."],
    ["bolt", "Leve e rápida", "Sem instalação, sem servidores próprios, funciona offline — do distrital ao profissional."]];
  p.forEach(([k, h, b], i) => { const x = 0.8 + i * 3.02, y = 2.35;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.78, h: 4.1, fill: { color: C.soft }, line: { color: C.line }, rectRadius: 0.14 });
    iconDot(s, k, x + 0.3, y + 0.35, 0.8);
    T(s, h, { x: x + 0.3, y: y + 1.45, w: 2.2, h: 0.75, fontFace: TF, fontSize: 18, bold: true });
    T(s, b, { x: x + 0.3, y: y + 2.25, w: 2.2, h: 1.7, fontSize: 12.5, color: C.mute }); });
  pageNo(s, n);
  s.addNotes("Quatro razões: nasceu no balneário, está tudo ligado, os documentos saem prontos a partilhar e é leve — não precisa de instalação nem de servidores.");
}

/* 15 — próximos patamares */
{ const s = pres.addSlide(); darkBg(s); n++;
  kicker(s, "Visão", 0.8, 0.6, true); title(s, "Os próximos patamares", 0.8, 0.9, 10, true);
  const r = [["Hoje", "Equipa B do Estrela", "A equipa técnica usa a app em todos os treinos e jogos."],
    ["Próximo", "Todo o clube", "Várias equipas e escalões, contas com cargos e permissões."],
    ["Depois", "App do atleta", "Confirmação da convocatória, questionário de bem-estar, planos individuais."],
    ["Mercado", "Outras equipas técnicas", "Formação e sénior, distrital e nacional — em Portugal e fora."]];
  s.addShape(pres.shapes.LINE, { x: 1.2, y: 3.02, w: 10.9, h: 0, line: { color: C.gold, width: 2, dashType: "dash" } });
  r.forEach(([k, h, b], i) => { const x = 0.8 + i * 3.02;
    s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: 2.74, w: 0.56, h: 0.56, fill: { color: i === 0 ? C.gold : C.dark }, line: { color: C.gold, width: 2 } });
    T(s, k.toUpperCase(), { x, y: 3.55, w: 2.7, h: 0.3, fontSize: 12, bold: true, color: C.gold, charSpacing: 2 });
    T(s, h, { x, y: 3.9, w: 2.7, h: 0.8, fontFace: TF, fontSize: 21, bold: true, color: C.white });
    T(s, b, { x, y: 4.75, w: 2.6, h: 1.2, fontSize: 13, color: "EAD6DB" }); });
  T(s, "Também em estudo: análise de vídeo ligada aos eventos do jogo e integração com GPS.", { x: 0.8, y: 6.35, w: 11, h: 0.4, fontSize: 13, italic: true, color: "EAD6DB" });
  pageNo(s, n, true);
  s.addNotes("Começámos pela Equipa B. O passo seguinte é o clube todo, com contas e permissões. Depois uma app para o atleta. E a seguir, outras equipas técnicas.");
}

/* 16 — proposta Play7 */
{ const s = pres.addSlide(); s.background = { color: C.white }; n++;
  kicker(s, "Proposta", 0.8, 0.6); title(s, "O que queremos construir com a Play7", 0.8, 0.9, 11);
  const c = [["flask", "Piloto", ["Testar a app com equipas parceiras", "Recolher feedback de treinadores", "Medir o tempo poupado"]],
    ["layers", "Construir juntos", ["Contas, cargos e permissões", "App do atleta", "Base de dados própria e segura"]],
    ["globe", "Levar ao mercado", ["Modelo de subscrição por equipa", "Distribuição e parcerias", "Marca e lançamento"]]];
  c.forEach(([k, h, items], i) => { const x = 0.8 + i * 4.0, y = 2.3;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.7, h: 3.9, fill: { color: i === 1 ? C.grena : C.soft }, line: { color: i === 1 ? C.grena : C.line }, rectRadius: 0.14 });
    iconDot(s, k, x + 0.35, y + 0.35, 0.78, i === 1 ? C.gold : C.grena, i === 1 ? "r" : "g");
    T(s, h, { x: x + 0.35, y: y + 1.35, w: 3.0, h: 0.45, fontFace: TF, fontSize: 20, bold: true, color: i === 1 ? C.white : C.ink });
    T(s, items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < items.length - 1 } })), { x: x + 0.35, y: y + 1.95, w: 3.05, h: 1.7, fontSize: 13.5, color: i === 1 ? "F3E6E9" : C.ink, paraSpaceAfter: 6 }); });
  T(s, "Proposta para discutir na reunião — os termos definimos em conjunto.", { x: 0.8, y: 6.5, w: 11, h: 0.35, fontSize: 12.5, italic: true, color: C.mute });
  pageNo(s, n);
  s.addNotes("A nossa proposta tem três partes: um piloto com equipas parceiras, desenvolvimento conjunto do que falta para escalar (contas, app do atleta, base de dados própria) e levar ao mercado. Os termos definimos juntos.");
}

/* 17 — fecho */
{ const s = pres.addSlide(); darkBg(s, 2); n++;
  pic(s, IMG("crest.png"), 5.92, 0.9, 1.5, 2.0);
  T(s, "Vamos pôr isto em campo?", { x: 1.0, y: 3.25, w: 11.33, h: 1.0, fontFace: TF, fontSize: 44, bold: true, color: C.white, align: "center" });
  T(s, "Obrigado.", { x: 1.0, y: 4.3, w: 11.33, h: 0.6, fontSize: 22, color: C.gold, align: "center", bold: true });
  T(s, "Departamento técnico · CF Estrela da Amadora B", { x: 1.0, y: 5.6, w: 11.33, h: 0.4, fontSize: 14, color: "EAD6DB", align: "center" });
  s.addNotes("Fecho. Mostrar o trailer (1 minuto) antes ou depois deste diapositivo e abrir a app ao vivo no iPad, se houver tempo.");
}

pres.writeFile({ fileName: path.join(__dirname, "App_Equipa_Tecnica_Play7.pptx") }).then(f => console.log("ok", f));
