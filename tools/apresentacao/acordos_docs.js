// Guião da reunião + minutas de acordos (PT-PT). Minutas para revisão por advogado.
const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, Footer, PageNumber, TabStopType } = require("docx");

const GRENA = "6B1426", GOLD = "B8860B", MUTE = "6B5A5F";
const FONT = "Calibri";
const styles = {
  default: { document: { run: { font: FONT, size: 22 } } },
  paragraphStyles: [
    { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 36, bold: true, color: GRENA }, paragraph: { spacing: { after: 120 } } },
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 26, bold: true, color: GRENA }, paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 22, bold: true, color: "221418" }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 1 } },
  ]
};
const numbering = { config: [
  { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
                             { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] },
  { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
]};
// texto com **negrito**
function runs(t, o = {}) { return String(t).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(s => s.startsWith("**") ? new TextRun({ text: s.slice(2, -2), bold: true, ...o }) : new TextRun({ text: s, ...o })); }
const P = (t, o = {}) => new Paragraph({ children: runs(t, o.run || {}), spacing: { after: o.after ?? 120, line: 276 }, alignment: o.align || AlignmentType.JUSTIFIED, ...(o.p || {}) });
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const B = (t, lvl = 0) => new Paragraph({ numbering: { reference: "b", level: lvl }, children: runs(t), spacing: { after: 60, line: 264 } });
let nInst = 0; const NL = items => { const ref = "n"; nInst++; return items.map(t => new Paragraph({ numbering: { reference: ref, level: 0, instance: nInst }, children: runs(t), spacing: { after: 60, line: 264 } })); };
const TITLE = (t, sub) => [new Paragraph({ style: "Title", children: [new TextRun(t)], alignment: AlignmentType.LEFT }),
  ...(sub ? [new Paragraph({ children: [new TextRun({ text: sub, color: MUTE, italics: true, size: 20 })], spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GRENA, space: 6 } } })] : [])];
const NOTE = t => new Paragraph({ children: [new TextRun({ text: t, italics: true, color: MUTE, size: 19 })], spacing: { before: 60, after: 160 },
  shading: { type: ShadingType.CLEAR, fill: "F6F0F1", color: "auto" }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 8 } }, indent: { left: 120 } });
// cláusula numerada: "Cláusula N.ª — Título" + parágrafos numerados n.1, n.2…
let cN = 0;
function clause(title, items) { cN++; const out = [H2(`Cláusula ${cN}.ª — ${title}`)];
  items.forEach((t, i) => { if (Array.isArray(t)) t.forEach(s => out.push(B(s, 1))); else out.push(P(items.length > 1 ? `${cN}.${i + 1}. ${t}` : t)); }); return out; }
function signatures(names) {
  const w = 4513; const cell = (txt) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    children: [new Paragraph({ spacing: { before: 700 }, children: [new TextRun("______________________________")] }), ...txt.map(x => new Paragraph({ children: [new TextRun({ text: x, size: 20 })] }))] });
  const rows = []; for (let i = 0; i < names.length; i += 2) rows.push(new TableRow({ children: [cell(names[i]), names[i + 1] ? cell(names[i + 1]) : cell([""])] }));
  return [P("Feito em ______________, a ____ de ______________ de 20____, em dois exemplares de igual valor, ficando um na posse de cada Parte.", { after: 200 }),
    new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: [w, w], rows })];
}
const footer = label => ({ default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${label} — página `, size: 16, color: MUTE }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTE }), new TextRun({ text: " de ", size: 16, color: MUTE }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTE })] })] }) });
const page = { size: { width: 11906, height: 16838 }, margin: { top: 1300, right: 1300, bottom: 1300, left: 1300 } };
async function save(name, label, children) {
  const doc = new Document({ styles, numbering, creator: "App da Equipa Técnica", title: label, sections: [{ properties: { page }, footers: footer(label), children }] });
  fs.writeFileSync(name, await Packer.toBuffer(doc)); console.log("ok", name);
}
const TITULAR = "**[NOME COMPLETO DO TITULAR]**, portador do cartão de cidadão n.º [●], NIF [●], residente em [MORADA]";
const EMPRESA = "**[DENOMINAÇÃO DA TUA EMPRESA, Unipessoal, Lda.]**, NIPC [●], com sede em [MORADA], neste ato representada por [NOME], na qualidade de gerente (ou, enquanto a sociedade não existir, " + TITULAR + ")";
const PLAY7 = "**[DENOMINAÇÃO SOCIAL DA EMPRESA TITULAR DA PLAY7 / PLAY7SCOUT]**, NIPC [●], com sede em [MORADA], neste ato representada por [NOME], na qualidade de [CARGO]";
const MINUTA = "Minuta para revisão por advogado antes de assinar. Os campos entre [ ] têm de ser preenchidos. Não é aconselhamento jurídico.";

(async () => {
/* ======================= 1. Guião da reunião ======================= */
await save("1_Guiao_Reuniao_Play7.docx", "Guião — reunião Play7", [
  ...TITLE("Guião da reunião com a Play7", "App da equipa técnica × Play7Scout — preparação"),
  H1("Objetivo da reunião"),
  P("Sair com um **próximo passo concreto**: acordo de confidencialidade (NDA) assinado e uma integração-piloto entre o Play7Scout e a nossa app. **Não vender a app, não misturar empresas, não fechar valores na sala.**"),
  H1("A mensagem numa frase"),
  NOTE("“O Play7Scout vê o jogo. A nossa app organiza tudo o que a equipa técnica faz com isso — do treino ao pós-jogo. Juntos, os dados do vídeo chegam ao treinador sem copiar nada à mão.”"),
  H1("Sequência (45–60 min)"),
  ...NL(["**Ouvir primeiro (10 min).** O que gostaram na ideia? Que clientes têm (níveis, países)? Onde querem estar daqui a 1 ano?",
    "**Trailer (1 min) + app ao vivo no iPad (10 min).** Treino → planeamento → dia de jogo → bolas paradas → monitorização. A demonstração é o argumento mais forte.",
    "**A proposta (5 min).** Integração: os eventos, estatísticas e clipes do Play7Scout entram automaticamente na ficha de jogo e na ficha do atleta da nossa app. Cada empresa com a sua plataforma, os seus clientes e o seu código.",
    "**Perguntas técnicas (10 min)** — ver lista abaixo.",
    "**Fecho (5 min).** “Propomos assinar primeiro um NDA e depois um acordo de integração com um piloto de 2–3 meses. Enviamos as minutas até [data].”"]),
  H1("Perguntas a fazer"),
  B("Têm **API** ou exportação (CSV/JSON) por jogo? Que dados: eventos, estatísticas por jogador, tracking, links dos clipes?"),
  B("**De quem são os dados** de um jogo analisado: do clube cliente ou da Play7? (O clube tem de autorizar o envio para a nossa app — RGPD.)"),
  B("A integração tem **custo** (para nós ou para o clube)? Há limites de utilização?"),
  B("Têm clientes no **futebol distrital e de formação**? É o nosso mercado natural."),
  B("Que **exclusividades** esperam, se alguma? (Preferimos parceria não exclusiva.)"),
  H1("Ser honesto (e enquadrar bem)"),
  B("A app tem **2 semanas** e já é usada todos os dias numa equipa real — a velocidade é um ponto forte."),
  B("O que falta para escalar: contas com cargos e permissões, base de dados própria, app do atleta. Temos plano para cada um."),
  H1("Não fazer"),
  B("Não entregar ficheiros, links ou código antes do NDA — **mostrar só no nosso dispositivo**. (O ficheiro da app tem dados reais de atletas.)"),
  B("Não dizer valores primeiro; não prometer datas nem funcionalidades; não assinar nada na reunião."),
  B("Não falar da app como “do Estrela B”: é **a app da equipa técnica**; o Estrela B é onde está a ser usada."),
  H1("Documentos a levar"),
  B("Apresentação (PowerPoint), trailer, iPad com a app; minutas: NDA (2) e acordo de integração (3), para enviar depois da reunião."),
]);

/* ======================= 2. Acordo com o Tiago Isidoro (90/10) ======================= */
cN = 0;
await save("2_Acordo_Tiago_Isidoro_90_10.docx", "Acordo de titularidade e repartição (90 % / 10 %)", [
  ...TITLE("Acordo de titularidade e repartição de benefícios", "App da equipa técnica — 90 % / 10 % — minuta"),
  NOTE(MINUTA + " A Cláusula 7.ª (aquisição gradual) é opcional e recomendada: protege-te se o Tiago deixar de colaborar cedo. Se não a quiseres, apaga-a."),
  H1("Partes"),
  P("**Primeiro Contraente (Titular):** " + TITULAR + "."),
  P("**Segundo Contraente (Colaborador):** **Tiago Isidoro**, portador do cartão de cidadão n.º [●], NIF [●], residente em [MORADA]."),
  P("Considerando que o Titular concebeu e desenvolveu uma aplicação informática de apoio a equipas técnicas de futebol, atualmente designada “App da equipa técnica” (a **“Aplicação”**), e que o Colaborador contribuiu com ideias e sugestões para o seu desenvolvimento, as Partes acordam o seguinte:"),
  ...clause("Objeto", ["O presente acordo define a titularidade da Aplicação e a repartição, entre as Partes, dos benefícios económicos que dela resultem, na proporção de **90 % (noventa por cento) para o Titular e 10 % (dez por cento) para o Colaborador**."]),
  ...clause("Titularidade e gestão", [
    "A titularidade dos direitos de autor e de propriedade industrial sobre a Aplicação — código, design, interfaces, documentação, bases de dados, nome e marcas — pertence ao Titular, que a pode transmitir para uma sociedade constituída nos termos da Cláusula 4.ª.",
    "As decisões sobre a Aplicação (desenvolvimento, parcerias, contratos, preços, licenças e negociações com terceiros) são tomadas exclusivamente pelo Titular, que representa a Aplicação perante terceiros.",
    "Na medida em que, pela sua contribuição, o Colaborador tenha adquirido algum direito sobre a Aplicação, cede-o ao Titular, sendo a contrapartida a participação prevista neste acordo."]),
  ...clause("Repartição de benefícios (antes de existir sociedade)", [
    "Enquanto a Aplicação não for detida por uma sociedade, o Colaborador tem direito a 10 % dos benefícios líquidos recebidos pelo Titular com a Aplicação, nomeadamente: preço de venda ou cessão, receitas de licenças e subscrições, e contrapartidas de parcerias.",
    "Entende-se por benefício líquido o valor recebido deduzido dos custos diretamente associados (desenvolvimento pago a terceiros, alojamento, registos, impostos e despesas legais).",
    "O Titular informa o Colaborador, por escrito e pelo menos uma vez por ano, dos valores recebidos e pagos, e liquida a parte do Colaborador no prazo de 30 dias após cada recebimento."]),
  ...clause("Sociedade futura", [
    "Se o Titular constituir uma sociedade para explorar a Aplicação, o Colaborador terá direito a uma participação de 10 % no capital social, e o Titular a 90 %.",
    "As Partes celebrarão então um acordo parassocial que reflita este acordo, incluindo: gestão pelo Titular; direito de preferência na venda de participações; direito do Colaborador a vender nas mesmas condições se o Titular vender a sua participação (tag-along); e obrigação de o Colaborador vender se o Titular aceitar a venda de 100 % da sociedade (drag-along).",
    "Futuros aumentos de capital ou entradas de investidores diluem as participações na proporção, tendo ambas as Partes direito de acompanhar."]),
  ...clause("Contribuições futuras", ["O Colaborador compromete-se a colaborar de boa-fé com ideias, testes e feedback. O que venha a contribuir para a Aplicação fica abrangido pela Cláusula 2.ª, sem direito a contrapartida adicional para além da prevista neste acordo, salvo acordo escrito."]),
  ...clause("Confidencialidade e não concorrência", [
    "O Colaborador mantém confidencial toda a informação não pública sobre a Aplicação (funcionalidades, código, dados, parceiros, negociações e planos de negócio), durante a vigência deste acordo e nos 5 (cinco) anos seguintes.",
    "Enquanto tiver direitos ao abrigo deste acordo e nos 12 (doze) meses seguintes, o Colaborador não desenvolverá, nem ajudará terceiros a desenvolver, produto concorrente da Aplicação."]),
  ...clause("[Opcional] Aquisição gradual", [
    "A participação de 10 % do Colaborador adquire-se gradualmente: 2,5 % ao fim de 12 (doze) meses a contar da assinatura e, depois disso, 0,625 % por cada trimestre completo de colaboração, até perfazer 10 % ao fim de 4 (quatro) anos.",
    "Se o Colaborador deixar de colaborar, mantém apenas a parte já adquirida. Em caso de venda da Aplicação ou da sociedade, a participação total considera-se imediatamente adquirida."]),
  ...clause("Duração e cessação", ["O presente acordo vigora enquanto a Aplicação gerar benefícios ou enquanto o Colaborador detiver participação. Mantêm-se após a cessação as Cláusulas 2.ª e 6.ª, bem como os direitos já adquiridos."]),
  ...clause("Lei e foro", ["O presente acordo rege-se pela lei portuguesa. Para qualquer litígio, as Partes elegem o foro da comarca de [Lisboa], com renúncia a qualquer outro."]),
  ...signatures([["O Titular (90 %)", "[NOME COMPLETO]"], ["O Colaborador (10 %)", "Tiago Isidoro"]]),
]);

/* ======================= 3. NDA mútuo ======================= */
cN = 0;
await save("3_Acordo_Confidencialidade_NDA_Play7.docx", "Acordo de confidencialidade (NDA)", [
  ...TITLE("Acordo de confidencialidade mútuo (NDA)", "A assinar antes de partilhar detalhes, dados ou acessos — minuta"),
  NOTE(MINUTA),
  H1("Partes"),
  P("**Parte A:** " + EMPRESA + "."),
  P("**Parte B:** " + PLAY7 + "."),
  P("As Partes pretendem avaliar uma possível parceria tecnológica entre a aplicação de apoio a equipas técnicas de futebol da Parte A (a **“App”**) e a plataforma Play7Scout da Parte B (o **“Propósito”**), para o que irão trocar informação confidencial, e acordam o seguinte:"),
  ...clause("Informação confidencial", [
    "É confidencial toda a informação, em qualquer forma (oral, escrita, digital, demonstrações), revelada por uma Parte à outra no âmbito do Propósito, incluindo: funcionalidades, desenho e arquitetura da App e da plataforma, código, interfaces, fluxos de trabalho, roteiros de produto, dados, clientes, preços, planos de negócio e o conteúdo das negociações.",
    "Não é confidencial a informação que: (a) já era pública ou se torne pública sem culpa da Parte recetora; (b) a Parte recetora já conhecia licitamente, como possa demonstrar; (c) seja desenvolvida de forma independente, sem uso da informação recebida, como possa demonstrar por escrito; (d) seja recebida licitamente de terceiro sem dever de confidencialidade."]),
  ...clause("Obrigações", [
    "A Parte recetora obriga-se a: (a) usar a informação apenas para o Propósito; (b) não a divulgar a terceiros, exceto a colaboradores e consultores que dela precisem e estejam vinculados a sigilo equivalente; (c) protegê-la com, pelo menos, o cuidado que dá à sua própria informação confidencial.",
    "A Parte recetora não pode: copiar, descompilar, desmontar, fazer engenharia inversa, extrair ou reproduzir a App, a plataforma ou partes delas, nem utilizar a informação recebida para desenvolver produtos, funcionalidades ou serviços concorrentes ou substancialmente semelhantes."]),
  ...clause("Propriedade", ["Toda a informação confidencial permanece propriedade da Parte que a revela. Este acordo não concede qualquer licença, direito de propriedade intelectual ou direito de exploração sobre a App, a plataforma, as marcas ou quaisquer outros ativos da outra Parte."]),
  ...clause("Dados pessoais", ["Não serão partilhados dados pessoais de atletas ou terceiros ao abrigo deste acordo. Qualquer partilha futura dependerá de acordo específico, conforme o Regulamento Geral sobre a Proteção de Dados (RGPD)."]),
  ...clause("Devolução", ["A pedido da Parte reveladora, ou no fim das negociações, a Parte recetora devolve ou destrói a informação confidencial e as suas cópias, confirmando-o por escrito."]),
  ...clause("Não aliciamento", ["Durante a vigência deste acordo e nos 12 (doze) meses seguintes, nenhuma das Partes contactará diretamente clientes ou utilizadores da outra que tenha conhecido através do Propósito para lhes oferecer produto concorrente com o da outra Parte."]),
  ...clause("Duração", ["Este acordo vigora por 2 (dois) anos a contar da assinatura. As obrigações de confidencialidade e de não utilização mantêm-se durante 5 (cinco) anos após o seu termo."]),
  ...clause("Incumprimento", ["O incumprimento dá à Parte lesada o direito a indemnização pelos danos sofridos, sem prejuízo de requerer providências cautelares para impedir o uso ou a divulgação indevidos. [Opcional: fixar cláusula penal de € ●.]"]),
  ...clause("Lei e foro", ["O presente acordo rege-se pela lei portuguesa. Para qualquer litígio, as Partes elegem o foro da comarca de [Lisboa]."]),
  ...signatures([["Pela Parte A", "[NOME / CARGO]"], ["Pela Parte B", "[NOME / CARGO]"]]),
]);

/* ======================= 4. Acordo de integração ======================= */
cN = 0;
await save("4_Acordo_Integracao_Play7.docx", "Acordo de parceria tecnológica e integração", [
  ...TITLE("Acordo de parceria tecnológica e integração", "App da equipa técnica × Play7Scout — minuta"),
  NOTE(MINUTA + " Assinar depois do NDA. O Anexo I descreve os dados a trocar e deve ser preenchido com a Play7."),
  H1("Partes"),
  P("**Parte A (Titular da App):** " + EMPRESA + "."),
  P("**Parte B (Play7):** " + PLAY7 + "."),
  P("Considerando que: (i) a Parte A é titular exclusiva de uma aplicação de apoio a equipas técnicas de futebol (a **“App”**); (ii) a Parte B é titular da plataforma Play7Scout, de análise de vídeo e dados de jogo (a **“Plataforma”**); (iii) ambas pretendem que os dados produzidos pela Plataforma possam ser recebidos automaticamente pela App, mantendo-se empresas, produtos e clientes separados — celebram o presente acordo:"),
  ...clause("Objeto", ["O presente acordo regula a integração técnica entre a Plataforma e a App, através da qual os dados de jogo descritos no Anexo I são disponibilizados pela Parte B e importados pela App, para clientes comuns que o autorizem (a **“Integração”**)."]),
  ...clause("Independência das partes", [
    "Cada Parte mantém a sua empresa, o seu produto, os seus clientes, a sua marca e a sua política comercial. Este acordo não cria sociedade, associação, consórcio, representação, agência ou relação laboral entre as Partes.",
    "Nenhuma Parte pode assumir obrigações em nome da outra."]),
  ...clause("Propriedade intelectual", [
    "A App — incluindo código, design, interfaces, funcionalidades, documentação, bases de dados, nome e marcas — é e continua a ser **propriedade exclusiva (100 %) da Parte A**. A Plataforma é e continua a ser propriedade exclusiva da Parte B.",
    "Nada neste acordo transfere, cede ou licencia direitos sobre a App à Parte B, nem sobre a Plataforma à Parte A, para além das licenças limitadas estritamente necessárias à Integração previstas na Cláusula 4.ª.",
    "Melhorias, adaptações ou desenvolvimentos feitos por cada Parte no seu próprio produto, incluindo os necessários à Integração, pertencem exclusivamente a essa Parte. Desenvolvimentos conjuntos só existirão se acordados por escrito, com definição prévia da titularidade.",
    "A Integração faz-se exclusivamente por troca de dados através de interface (API) ou ficheiros de exportação. **Nenhuma Parte terá acesso ao código-fonte, ao código-objeto, às bases de dados internas ou à infraestrutura da outra.**"]),
  ...clause("Licenças limitadas", [
    "A Parte B concede à Parte A uma licença não exclusiva, intransmissível, revogável nos termos deste acordo e gratuita [ou: nas condições do Anexo II], para aceder à API da Plataforma e importar para a App os dados do Anexo I relativos a clientes comuns que o tenham autorizado.",
    "Cada Parte autoriza a outra a referir o seu nome e marca apenas para comunicar a existência da Integração, nos termos previamente aprovados por escrito."]),
  ...clause("Proibições", [
    "Nenhuma Parte pode, direta ou indiretamente: (a) copiar, descompilar, desmontar ou fazer engenharia inversa do produto da outra; (b) utilizar informação, dados de utilização, capturas, demonstrações ou documentação da outra Parte para desenvolver produtos ou funcionalidades concorrentes ou substancialmente semelhantes; (c) contornar a Integração para aceder a dados ou funções não previstos no Anexo I; (d) registar marcas, nomes de domínio ou perfis que se confundam com os da outra Parte."]),
  ...clause("Dados e proteção de dados pessoais", [
    "Os dados de cada jogo pertencem ao clube cliente que os gera ou contrata. A transferência para a App só ocorre com autorização expressa desse clube, que pode ser revogada a todo o tempo.",
    "Cada Parte é responsável pelo cumprimento do RGPD no seu produto. Se, na execução da Integração, alguma Parte tratar dados pessoais por conta da outra ou do clube, as Partes celebrarão previamente o acordo de subcontratação previsto no artigo 28.º do RGPD.",
    "Os dados recebidos através da Integração só podem ser usados para prestar o serviço ao respetivo clube, e nunca para fins próprios de análise, venda ou treino de modelos sem autorização escrita do clube e da Parte que os forneceu."]),
  ...clause("Confidencialidade", ["Aplica-se o Acordo de Confidencialidade celebrado entre as Partes em [data], que se considera parte integrante deste acordo, mantendo-se as obrigações de confidencialidade durante 5 (cinco) anos após a cessação."]),
  ...clause("Custos e condições comerciais", [
    "Cada Parte suporta os custos do seu próprio desenvolvimento para a Integração.",
    "[Opções a negociar — Anexo II: integração gratuita e recíproca / taxa por clube / partilha de receitas / piloto gratuito de 3 meses com clientes a indicar.]"]),
  ...clause("Piloto", ["As Partes realizarão um piloto de [3] meses com [2–3] clubes a indicar, após o qual avaliarão em conjunto os resultados e a continuação da parceria."]),
  ...clause("Não exclusividade", ["O presente acordo não é exclusivo: cada Parte pode integrar-se com outros produtos, desde que respeite as obrigações de confidencialidade e as proibições da Cláusula 5.ª."]),
  ...clause("Não aliciamento", ["Durante a vigência e nos 12 (doze) meses seguintes, nenhuma Parte oferecerá diretamente aos clientes da outra, conhecidos através da Integração, um produto concorrente com o da outra Parte, nem contratará colaboradores da outra sem o seu acordo."]),
  ...clause("Responsabilidade", ["Cada Parte responde pelos danos que cause à outra por incumprimento culposo deste acordo. Nenhuma Parte responde por lucros cessantes, exceto em caso de dolo ou de violação das Cláusulas 3.ª, 5.ª, 6.ª ou 7.ª."]),
  ...clause("Duração e cessação", [
    "O presente acordo vigora por 12 (doze) meses a contar da assinatura, renovando-se automaticamente por iguais períodos, salvo denúncia por escrito com 60 (sessenta) dias de antecedência.",
    "Qualquer Parte pode resolver o acordo, com efeitos imediatos, em caso de incumprimento grave não sanado em 15 (quinze) dias após notificação.",
    "Com a cessação, a Integração é desligada, cada Parte deixa de usar a marca da outra e devolve ou destrói a informação confidencial recebida. Os dados já importados pela App para um clube permanecem desse clube, nos termos da Cláusula 6.ª."]),
  ...clause("Comunicações", ["As comunicações são feitas por escrito para os endereços de correio eletrónico: Parte A — [●]; Parte B — [●]."]),
  ...clause("Lei e foro", ["O presente acordo rege-se pela lei portuguesa. Para qualquer litígio, as Partes elegem o foro da comarca de [Lisboa], com renúncia a qualquer outro."]),
  ...signatures([["Pela Parte A", "[NOME / CARGO]"], ["Pela Parte B", "[NOME / CARGO]"]]),
  H1("Anexo I — Dados da Integração (a preencher com a Play7)"),
  (() => { const W = [3000, 6026]; const rowsData = [["Dado", "Descrição / uso na App"],
      ["Identificação do jogo", "Data, equipas, competição — liga ao jogo existente na App"],
      ["Eventos", "Golos, assistências, remates, recuperações, perdas, contra-ataques (minuto, jogador) → eventos e estatísticas da ficha de jogo"],
      ["Estatísticas por jogador", "Totais por jogador → estatísticas de jogo e ficha do atleta"],
      ["Tracking / físico (se existir)", "Distância, sprints, velocidade → monitorização"],
      ["Clipes de vídeo", "Ligações (URL) para os clipes → abertos a partir da ficha de jogo; o vídeo fica na Plataforma"],
      ["Formato e frequência", "API REST/JSON ou exportação CSV; após cada jogo processado"],
      ["Autenticação", "Chave por clube, revogável pelo clube"]];
    const cell = (t, i, head) => new TableCell({ width: { size: W[i], type: WidthType.DXA }, shading: head ? { type: ShadingType.CLEAR, fill: GRENA, color: "auto" } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: head || i === 0, color: head ? "FFFFFF" : "221418", size: 20 })] })] });
    return new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: W, rows: rowsData.map((r, k) => new TableRow({ children: r.map((t, i) => cell(t, i, k === 0)) })) }); })(),
  H1("Anexo II — Condições comerciais (a negociar)"),
  P("[A preencher após a reunião.]"),
]);
})();
