/**
 * ESTRELA B — Monitorização diária de bem-estar e carga de treino
 * ---------------------------------------------------------------
 * Lê as respostas dos dois formulários e reconstrói os separadores de análise.
 * Corre sozinho sempre que um jogador submete uma resposta.
 *
 * Os painéis são escritos no ficheiro indicado em ID_DESTINO — de preferência um
 * Google Sheet novo, para os ficheiros dos formulários ficarem só com as respostas.
 *
 * Separadores criados (prefixo "· "):
 *   · Painel      · Alertas     · Jogadores
 *   · BemEstar28  · Carga28     · Semanal      · Serie   · Config
 *
 * Ligação à app da equipa técnica: ver secção 10 no fim do ficheiro.
 */

// ============================================================ 1. ORIGENS
var ID_BEMESTAR = '1w5BTGC_4J8565aigffuRKRFSeAOsqKK4WDgNnaAo8II';
var ID_PSE      = '1lnH3j_dXdFSOw-6Ak9CdtRpWWjm1MIvJBEToQowX_3Q';

// ONDE OS PAINÉIS SÃO ESCRITOS.
// Ficheiro "Estrela B — Painel", criado só para isto. Os ficheiros dos formulários
// ficam apenas com as respostas em bruto.
var ID_DESTINO  = '1IxRnhFtwph4iZEuYJSbmIRljq3S9l61_iHUMQQhCiQw';

// Equivalências de nomes: "como veio do formulário" -> "nome oficial"
// Estes são apenas os valores iniciais. Depois da 1.ª execução passam a ser lidos
// do separador "· Nomes", que podes editar sem tocar no código.
var ALIASES = {
  'Rafael Ferreira': 'Rafael F.',
  'Rafael Mateus'  : 'Rafinha',
  'Rafinha'        : 'Rafinha',
  'Rafael S'       : 'Rafael S.',
  'Rafa S'         : 'Rafael S.',
  'Rafa S.'        : 'Rafael S.',
  'Rafa'           : 'Rafael S.'
};

// Grafias em bruto encontradas nesta execução (para o inventário do separador "· Nomes").
var BRUTOS = {};
var RESOLVIDO = {};

// ============================================================ 2. LIMIARES
// Se existir o separador "· Config", os valores de lá substituem estes.
var LIM = {
  zAlerta:        -1.0,   // z-score de bem-estar: sinal amarelo
  zRisco:         -1.5,   // z-score de bem-estar: sinal vermelho
  bemEstarRisco:   2.50,  // pontuação absoluta (1-5) de risco
  acwrSup:         1.25,  // Malone 2017: 1,00-1,25 é a zona protetora em futebol profissional
  acwrRisco:       1.50,  // ≥1,50 associado a maior risco
  acwrBaixo:       0.85,  // ≤0,85 foi o grupo de referência com mais lesões
  monotoniaAlerta: 2.00,  // Foster: semana demasiado uniforme
  adesaoMin:       0.60,  // % mínima de dias com resposta em 7 dias
  diasMinACWR:     21,    // histórico mínimo para o ACWR fazer sentido
  respMinZ:        5,     // respostas mínimas para haver baseline individual
  diaJogo:         7,     // 1 = 2ª feira ... 7 = domingo
  cargaSemanaAlta: 1500,  // Malone 2017, em época: >1500 UA/semana associa-se a mais lesões
  cargaSemanaPre:  2100,  // Malone 2017, pré-época: o patamar de risco é mais alto
  fimPreEpoca:     null,  // data do 1.º jogo do campeonato (ex.: 2026-09-21)
  folgaMaxRegistos: 3,    // até este nº de registos de PSE, o dia conta como folga
  folgaMaxPct:     0.15,  // ...desde que representem menos desta fração do plantel
  corrigirPosJogo: 'SIM'  // corrigir a queda de bem-estar esperada após o jogo
};

/** Referências usadas (ver separador "· Config" para as fontes). */
var FONTES = [
  'ACWR 1,00-1,25 protetor / ≥1,50 risco — Malone et al. 2017, J Sci Med Sport (futebol profissional).',
  'Carga semanal >1500 UA associada a maior incidência de lesão — Malone et al. 2017.',
  'Z-score ±1,5 DP contra janela móvel de 28 dias — prática corrente de monitorização subjetiva.',
  'Monotonia e strain — Foster 1998; intervalo típico no futebol 0,5-2,0 (Rico-González et al. 2024).',
  'Bem-estar cai 35-40% após jogo e recupera em 2-4 dias — mas a magnitude usada é a medida neste plantel.',
  'Guarda-redes: carga externa ~17% da dos jogadores de campo — âncoras próprias, não comparáveis.',
  'Revisões recentes questionam o ACWR como preditor de lesão (Impellizzeri, Andrade). Usar como',
  'sinalizador de saltos de carga e ponto de partida para conversa, nunca como veredicto.'
];

var JANELA = 28;          // dias das grelhas
var TZ = 'Europe/Lisbon';
var PREFIXO = '· ';       // prefixo dos separadores criados por este script

/** O ficheiro onde os painéis são escritos. */
function destino_() {
  if (ID_DESTINO && ID_DESTINO.indexOf('COLA_AQUI') === -1) {
    return SpreadsheetApp.openById(ID_DESTINO);
  }
  var a = SpreadsheetApp.getActiveSpreadsheet();
  if (a) return a;
  throw new Error('Define o ID_DESTINO no topo do script — sem isso não sei onde escrever os painéis.');
}

// ============================================================ 3. MENU
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚽ Monitorização')
    .addItem('Atualizar agora', 'atualizar')
    .addSeparator()
    .addItem('Instalar automatismos', 'instalarTriggers')
    .addItem('Remover automatismos', 'removerTriggers')
    .addSeparator()
    .addItem('Reconstruir fichas de jogador', 'recriarFichas')
    .addSeparator()
    .addItem('Diagnóstico — de onde estou a ler?', 'diagnostico')
    .addItem('Limpar painéis dos ficheiros de origem', 'limparOrigens')
    .addToUi();
}

/** Corre sempre que alguém submete um formulário, e uma vez por dia de manhã. */
function instalarTriggers() {
  removerTriggers();
  ScriptApp.newTrigger('atualizar').forSpreadsheet(ID_BEMESTAR).onFormSubmit().create();
  ScriptApp.newTrigger('atualizar').forSpreadsheet(ID_PSE).onFormSubmit().create();
  ScriptApp.newTrigger('atualizar').timeBased().atHour(6).everyDays(1).create();
  try {
    destino_().toast('Automatismos instalados. O painel passa a atualizar-se sozinho.', 'Pronto', 8);
  } catch (e) { Logger.log('Automatismos instalados.'); }
}

/**
 * Apaga os separadores criados por este script nos ficheiros dos formulários.
 * Útil depois de mudares o destino para um ficheiro novo. Nunca toca no destino
 * atual nem em separadores que não tenham o prefixo.
 */
function limparOrigens() {
  var destinoId = destino_().getId();
  var apagados = [];
  [ID_BEMESTAR, ID_PSE].forEach(function (id) {
    if (id === destinoId) return;
    var ss;
    try { ss = SpreadsheetApp.openById(id); } catch (e) { return; }
    ss.getSheets().forEach(function (f) {
      if (f.getName().indexOf(PREFIXO) === 0) {
        apagados.push(ss.getName() + ' → ' + f.getName());
        ss.deleteSheet(f);
      }
    });
  });
  var msg = apagados.length
    ? 'Removidos ' + apagados.length + ' separador(es):\n' + apagados.join('\n')
    : 'Não havia painéis antigos nos ficheiros dos formulários.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); }
}

function removerTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'atualizar') ScriptApp.deleteTrigger(t);
  });
}

// ============================================================ 4. UTILITÁRIOS
/** Chave de comparação: sem acentos, sem pontuação, sem maiúsculas.
 *  É isto que faz "Manuel P", "Manuel P." e "manuel P." contarem como a mesma pessoa. */
function chaveNome_(s) {
  s = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Quantas palavras começam por maiúscula — serve para escolher a grafia melhor escrita. */
function qualidade_(s) {
  var p = String(s).trim().split(/\s+/), n = 0;
  for (var i = 0; i < p.length; i++) if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(p[i])) n++;
  return n;
}

/**
 * Percorre todas as grafias encontradas e devolve uma função que traduz
 * qualquer uma delas no nome oficial. Duas fases:
 *   1. grafias com a mesma chave juntam-se, ficando a melhor escrita como oficial;
 *   2. as equivalências do separador "· Nomes" mandam sobre tudo o resto.
 */
function construirRegisto_(nomesBrutos) {
  var contagem = {};
  nomesBrutos.forEach(function (n) {
    n = String(n || '').trim();
    if (n) contagem[n] = (contagem[n] || 0) + 1;
  });
  Object.keys(ALIASES).forEach(function (k) {
    if (!contagem[ALIASES[k]]) contagem[ALIASES[k]] = 0;
  });

  var melhor = {};
  Object.keys(contagem).forEach(function (n) {
    var k = chaveNome_(n);
    if (!k) return;
    var a = melhor[k];
    if (!a) { melhor[k] = n; return; }
    var qa = qualidade_(a), qn = qualidade_(n);
    if (qn > qa) { melhor[k] = n; return; }
    if (qn === qa) {
      if (n.length > a.length) { melhor[k] = n; return; }
      if (n.length === a.length && contagem[n] > contagem[a]) melhor[k] = n;
    }
  });

  var aliasPorChave = {};
  Object.keys(ALIASES).forEach(function (de) {
    aliasPorChave[chaveNome_(de)] = ALIASES[de];
  });

  BRUTOS = contagem;
  RESOLVIDO = {};
  return function (bruto) {
    bruto = String(bruto || '').trim();
    if (!bruto) return '';
    if (RESOLVIDO[bruto]) return RESOLVIDO[bruto];
    var alvo = aliasPorChave[chaveNome_(bruto)] || bruto;
    var fim = melhor[chaveNome_(alvo)] || alvo;
    RESOLVIDO[bruto] = fim;
    return fim;
  };
}

/** Extrai o número inicial de textos como "3 - Normal" ou "10 - Máximo esforço". */
function num_(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  var m = String(v).trim().match(/^(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

/** "01:30" -> 90 minutos. Aceita também valores de hora do Sheets. */
function minutos_(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (v instanceof Date) return v.getHours() * 60 + v.getMinutes();
  if (typeof v === 'number') return Math.round(v * 1440);
  var m = String(v).trim().match(/^(\d{1,2})[:h](\d{2})/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function dia_(d) {
  if (!(d instanceof Date)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function chave_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function somaDias_(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }

function media_(a) {
  var v = a.filter(function (x) { return typeof x === 'number' && !isNaN(x); });
  if (!v.length) return null;
  return v.reduce(function (s, x) { return s + x; }, 0) / v.length;
}
function desvio_(a) {
  var v = a.filter(function (x) { return typeof x === 'number' && !isNaN(x); });
  if (v.length < 2) return null;
  var m = media_(v);
  var q = v.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0);
  return Math.sqrt(q / (v.length - 1));
}

/**
 * Encontra a coluna cujo cabeçalho contém uma das palavras-chave, ignorando as
 * colunas já atribuídas. Isto é essencial: "Nome do Jogador" acaba em "dor" e
 * "Como dormiste" também a contém — sem esta exclusão, a coluna da dor muscular
 * seria lida a partir da coluna dos nomes e todas as respostas eram descartadas.
 */
function achaUnico_(cab, chaves, usados) {
  for (var j = 0; j < chaves.length; j++) {
    for (var i = 0; i < cab.length; i++) {
      if (usados.indexOf(i) !== -1) continue;
      if (String(cab[i]).toLowerCase().indexOf(chaves[j].toLowerCase()) !== -1) {
        usados.push(i);
        return i;
      }
    }
  }
  return -1;
}

/** Encontra a coluna cujo cabeçalho contém uma das palavras-chave. */
function acha_(cab, chaves) {
  for (var i = 0; i < cab.length; i++) {
    var h = String(cab[i]).toLowerCase();
    for (var j = 0; j < chaves.length; j++) {
      if (h.indexOf(chaves[j].toLowerCase()) !== -1) return i;
    }
  }
  return -1;
}

/**
 * Descobre o separador com as respostas em bruto. Entre vários candidatos escolhe
 * o que tem a data mais recente — se o formulário foi reapontado para uma folha
 * nova, é essa que passa a valer, sem ter de se mexer em nada.
 */
function candidatos_(ss, chaveObrigatoria) {
  var out = [];
  ss.getSheets().forEach(function (f) {
    if (f.getLastRow() < 1 || f.getLastColumn() < 2) return;
    var cab = f.getRange(1, 1, 1, f.getLastColumn()).getValues()[0];
    var iT = acha_(cab, ['carimbo', 'timestamp']);
    if (iT === -1 || acha_(cab, chaveObrigatoria) === -1) return;
    var ultima = null, n = 0;
    if (f.getLastRow() > 1) {
      f.getRange(2, iT + 1, f.getLastRow() - 1, 1).getValues().forEach(function (l) {
        var d = dia_(l[0]);
        if (d) { n++; if (!ultima || d > ultima) ultima = d; }
      });
    }
    out.push({ folha: f, nome: f.getName(), ultima: ultima, n: n });
  });
  out.sort(function (a, b) {
    if (a.ultima && b.ultima && a.ultima.getTime() !== b.ultima.getTime()) return b.ultima - a.ultima;
    if (!!a.ultima !== !!b.ultima) return a.ultima ? -1 : 1;
    return b.n - a.n;
  });
  return out;
}

function folhaRespostas_(ss, chaveObrigatoria) {
  var c = candidatos_(ss, chaveObrigatoria);
  return c.length ? c[0].folha : null;
}

/** Relatório de onde o script está a ler. Menu ⚽ Monitorização → Diagnóstico. */
function diagnostico() {
  var fmt = function (d) { return d ? Utilities.formatDate(d, TZ, 'dd/MM/yyyy') : 'sem datas'; };
  var txt = '';
  [['BEM-ESTAR', ID_BEMESTAR, ['sono']], ['CARGA / PSE', ID_PSE, ['intens', 'sessão', 'sessao']]]
    .forEach(function (o) {
      txt += o[0] + '\n';
      var ss;
      try { ss = SpreadsheetApp.openById(o[1]); }
      catch (e) { txt += '  ✗ não consegui abrir o ficheiro\n\n'; return; }
      txt += '  ficheiro: ' + ss.getName() + '\n';
      var c = candidatos_(ss, o[2]);
      if (!c.length) {
        txt += '  ✗ nenhum separador com os cabeçalhos esperados\n';
        txt += '  separadores existentes: ' + ss.getSheets().map(function (f) { return f.getName(); }).join(', ') + '\n';
      } else {
        c.forEach(function (x, i) {
          txt += (i === 0 ? '  ► A LER: ' : '    (ignorado) ') + '"' + x.nome + '" — '
               + x.n + ' respostas, última em ' + fmt(x.ultima) + '\n';
        });
        var cab = c[0].folha.getRange(1, 1, 1, c[0].folha.getLastColumn()).getValues()[0];
        var u = [], campos;
        if (o[0] === 'BEM-ESTAR') {
          campos = [['data', ['carimbo', 'timestamp']], ['jogador', ['nome do jogador', 'nome']],
                    ['sono', ['qualidade do sono', 'sono']], ['fadiga', ['fadiga']],
                    ['dor', ['dor muscular', 'dores muscul', 'dor']], ['stress', ['stress', 'stresse']]];
        } else {
          campos = [['data', ['carimbo', 'timestamp']], ['jogador', ['nome do jogador', 'nome']],
                    ['tipo', ['tipo de sess', 'tipo']], ['duração', ['duração', 'duracao']],
                    ['RPE', ['intenso', 'intens', 'rpe']], ['sensação', ['sentes', 'sensa']]];
        }
        campos.forEach(function (cp) {
          var idx = achaUnico_(cab, cp[1], u);
          txt += '      ' + cp[0] + ' → ' + (idx === -1 ? '✗ NÃO ENCONTRADA'
                 : 'coluna ' + String.fromCharCode(65 + idx) + ' ("' + cab[idx] + '")') + '\n';
        });
        var bemN = 0;
        try { bemN = (o[0] === 'BEM-ESTAR' ? lerBemEstar_() : lerPSE_()).length; } catch (e) { }
        txt += '      → ' + bemN + ' respostas aproveitadas\n';
      }
      txt += '\n';
    });
  txt += 'Painéis escritos em: ' + destino_().getName();
  try { SpreadsheetApp.getUi().alert('Diagnóstico', txt, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { Logger.log(txt); }
  return txt;
}

// ============================================================ 5. LEITURA
function lerBemEstar_() {
  var ss = SpreadsheetApp.openById(ID_BEMESTAR);
  var f = folhaRespostas_(ss, ['sono']);
  if (!f) throw new Error('Não encontrei o separador com as respostas de bem-estar (falta a coluna do sono).');
  var dados = f.getDataRange().getValues();
  var cab = dados[0];
  var u = [];
  var iT = achaUnico_(cab, ['carimbo', 'timestamp'], u),
      iN = achaUnico_(cab, ['nome do jogador', 'nome'], u),
      iS = achaUnico_(cab, ['qualidade do sono', 'sono'], u),
      iF = achaUnico_(cab, ['fadiga'], u),
      iD = achaUnico_(cab, ['dor muscular', 'dores muscul', 'dor'], u),
      iE = achaUnico_(cab, ['stress', 'stresse'], u);
  var faltam = [];
  if (iT === -1) faltam.push('carimbo de data/hora');
  if (iN === -1) faltam.push('nome do jogador');
  if (iS === -1) faltam.push('sono');
  if (iF === -1) faltam.push('fadiga');
  if (iD === -1) faltam.push('dor muscular');
  if (iE === -1) faltam.push('stress');
  if (faltam.length) {
    throw new Error('No separador "' + f.getName() + '" não encontrei estas colunas: '
      + faltam.join(', ') + '. Cabeçalhos existentes: ' + cab.join(' | '));
  }
  var out = [];
  for (var r = 1; r < dados.length; r++) {
    var d = dia_(dados[r][iT]);
    var nome = String(dados[r][iN] || '').trim();
    if (!d || !nome) continue;
    var s = num_(dados[r][iS]), fa = num_(dados[r][iF]),
        dr = num_(dados[r][iD]), st = num_(dados[r][iE]);
    var itens = [s, fa, dr, st].filter(function (x) { return x !== null; });
    if (itens.length < 4) continue;
    out.push({
      data: d, chave: chave_(d), nomeBruto: nome, jogador: nome,
      sono: s, fadiga: fa, dor: dr, stress: st,
      hooper: s + fa + dr + st, bemEstar: (s + fa + dr + st) / 4
    });
  }
  return out;
}

function lerPSE_() {
  var ss = SpreadsheetApp.openById(ID_PSE);
  var f = folhaRespostas_(ss, ['intens', 'sessão', 'sessao']);
  if (!f) throw new Error('Não encontrei o separador com as respostas de PSE.');
  var dados = f.getDataRange().getValues();
  var cab = dados[0];
  var u = [];
  var iT = achaUnico_(cab, ['carimbo', 'timestamp'], u),
      iN = achaUnico_(cab, ['nome do jogador', 'nome'], u),
      iTipo = achaUnico_(cab, ['tipo de sess', 'tipo'], u),
      iDur = achaUnico_(cab, ['duração', 'duracao'], u),
      iR = achaUnico_(cab, ['intenso', 'intens', 'rpe'], u),
      iSen = achaUnico_(cab, ['sentes', 'sensa'], u);
  if (iT === -1 || iN === -1 || iR === -1) {
    throw new Error('No separador "' + f.getName() + '" faltam colunas essenciais do PSE. '
      + 'Cabeçalhos existentes: ' + cab.join(' | '));
  }
  var out = [];
  for (var r = 1; r < dados.length; r++) {
    var d = dia_(dados[r][iT]);
    var nome = String(dados[r][iN] || '').trim();
    if (!d || !nome) continue;
    var dur = minutos_(dados[r][iDur]);
    var rpe = num_(dados[r][iR]);
    out.push({
      data: d, chave: chave_(d), nomeBruto: nome, jogador: nome,
      tipo: iTipo >= 0 ? String(dados[r][iTipo] || '').trim() : '',
      duracao: dur, rpe: rpe,
      sRPE: (dur !== null && rpe !== null) ? dur * rpe : null,
      sensacao: iSen >= 0 ? String(dados[r][iSen] || '').trim() : ''
    });
  }
  return out;
}

// ============================================================ 6. CONFIG
function lerConfig_(ss) {
  var f = ss.getSheetByName(PREFIXO + 'Config');
  if (!f) { escreverConfig_(ss); return; }

  // Migração: separadores criados por versões anteriores têm menos linhas.
  // Sem isto, as linhas novas nunca apareciam e os valores por omissão
  // perdiam-se em silêncio (as folgas de época ficavam vazias, por exemplo).
  if (f.getLastRow() < 19 || !String(f.getRange('A19').getValue() || '').trim()) {
    var antigos = f.getRange('A4:B' + Math.max(4, f.getLastRow())).getValues();
    escreverConfig_(ss);
    f = ss.getSheetByName(PREFIXO + 'Config');
    // repõe os valores que já tinhas, emparelhando pelo nome do limiar
    var novos = f.getRange('A4:A19').getValues();
    antigos.forEach(function (a) {
      var rot = String(a[0] || '').trim();
      if (!rot || a[1] === '' || a[1] === null) return;
      for (var i = 0; i < novos.length; i++) {
        if (String(novos[i][0] || '').trim() === rot) {
          f.getRange(4 + i, 2).setValue(a[1]);
          break;
        }
      }
    });
  }

  var v = f.getRange('B4:B19').getValues();
  var num = ['zAlerta', 'zRisco', 'bemEstarRisco', 'acwrSup', 'acwrRisco',
             'acwrBaixo', 'monotoniaAlerta', 'adesaoMin', 'diasMinACWR', 'diaJogo',
             'cargaSemanaAlta'];
  num.forEach(function (k, i) {
    if (typeof v[i][0] === 'number') LIM[k] = v[i][0];
  });

  if (typeof v[11][0] === 'number') LIM.cargaSemanaPre = v[11][0];
  var d = v[12][0];
  if (d instanceof Date) LIM.fimPreEpoca = dia_(d);
  if (typeof v[13][0] === 'number') LIM.folgaMaxRegistos = v[13][0];
  if (typeof v[14][0] === 'number') LIM.folgaMaxPct = v[14][0];
  var c = String(v[15][0] || '').trim();
  if (c) LIM.corrigirPosJogo = c;
}

function escreverConfig_(ss) {
  var f = ss.getSheetByName(PREFIXO + 'Config') || ss.insertSheet(PREFIXO + 'Config');
  f.clear();
  f.getRange('A1').setValue('Limiares de alerta').setFontSize(14).setFontWeight('bold').setFontColor('#1F3864');
  f.getRange('A2').setValue('Altera os números azuis e o painel inteiro reage na próxima atualização.')
    .setFontStyle('italic').setFontColor('#666666');
  var linhas = [
    ['Z-score de bem-estar — alerta', LIM.zAlerta, 'Queda de 1 desvio-padrão face ao próprio historial.'],
    ['Z-score de bem-estar — risco', LIM.zRisco, 'Queda de 1,5 desvios-padrão. Limiar usado na literatura.'],
    ['Bem-estar absoluto — risco', LIM.bemEstarRisco, 'Média (1-5) abaixo da qual há sinal vermelho.'],
    ['ACWR — limite superior', LIM.acwrSup, 'Carga aguda a subir depressa demais.'],
    ['ACWR — risco alto', LIM.acwrRisco, 'Zona associada a maior risco de lesão.'],
    ['ACWR — carga insuficiente', LIM.acwrBaixo, 'Abaixo disto o jogador está destreinado.'],
    ['Monotonia — alerta', LIM.monotoniaAlerta, 'Foster: carga uniforme de mais ao longo da semana.'],
    ['Adesão mínima ao questionário', LIM.adesaoMin, 'Fração de dias com resposta em 7 dias.'],
    ['Dias mínimos de histórico p/ ACWR', LIM.diasMinACWR, 'Sem isto o ACWR dispara e sinaliza o plantel todo.'],
    ['Dia do jogo (1=2ª ... 7=domingo)', LIM.diaJogo, 'Muda para a semana em que o jogo não for ao domingo.'],
    ['Carga semanal elevada — época (UA)', LIM.cargaSemanaAlta, 'Malone 2017: acima disto sobe a incidência de lesão em época.'],
    ['Carga semanal elevada — pré-época (UA)', LIM.cargaSemanaPre, 'Na pré-época a carga é legitimamente mais alta; o patamar de risco também.'],
    ['Fim da pré-época (1.º jogo)', LIM.fimPreEpoca || '', 'Antes desta data vale o patamar de pré-época. Só serve para isto.'],
    ['Folga: máx. registos de PSE', LIM.folgaMaxRegistos, 'As folgas são detetadas só pelo PSE, sem calendário fixo. Até este número de registos, o dia é folga.'],
    ['Folga: máx. % do plantel', LIM.folgaMaxPct, 'E ao mesmo tempo têm de ser menos desta fração do plantel.'],
    ['Corrigir bem-estar pós-jogo?', LIM.corrigirPosJogo, 'SIM/NÃO. A magnitude é medida nos dados deste plantel, não importada. Só se aplica a quem reportou "Jogo" e precisa de 8+ observações para arrancar.']
  ];
  f.getRange(4, 1, linhas.length, 3).setValues(linhas);
  f.getRange(4, 2, linhas.length, 1).setFontColor('#0000FF').setBackground('#FFF2CC')
   .setFontWeight('bold').setHorizontalAlignment('center');
  f.getRange(4, 3, linhas.length, 1).setFontSize(9).setFontColor('#666666');
  f.setColumnWidth(1, 260); f.setColumnWidth(2, 90); f.setColumnWidth(3, 420);
  f.getRange(4 + linhas.length + 1, 1).setValue('De onde vêm estes números')
   .setFontWeight('bold').setFontColor('#1F3864').setFontSize(11);
  f.getRange(4 + linhas.length + 2, 1, FONTES.length, 1)
   .setValues(FONTES.map(function (x) { return [x]; }))
   .setFontSize(9).setFontColor('#666666');
}

/** Lê as equivalências do separador "· Nomes". Cria-o na 1.ª execução. */
function lerAliases_(ss) {
  var f = ss.getSheetByName(PREFIXO + 'Nomes');
  if (!f) {
    f = ss.insertSheet(PREFIXO + 'Nomes');
    f.getRange('A1').setValue('Equivalências de nomes')
     .setFontSize(14).setFontWeight('bold').setFontColor('#1F3864');
    f.getRange('A2').setValue('Coluna A: como o jogador escreveu no formulário. Coluna B: o nome oficial que deve contar. '
      + 'Acrescenta linhas à vontade — é lido a cada atualização. As colunas D e E são preenchidas pelo script.')
     .setFontStyle('italic').setFontColor('#666666');
    f.getRange(3, 1, 1, 2).setValues([['Como veio do formulário', 'Passa a contar como']])
     .setBackground('#1F3864').setFontColor('#FFFFFF').setFontWeight('bold');
    var ini = Object.keys(ALIASES).map(function (k) { return [k, ALIASES[k]]; });
    f.getRange(4, 1, ini.length, 2).setValues(ini);
    f.setColumnWidth(1, 220); f.setColumnWidth(2, 180);
    f.setColumnWidth(4, 220); f.setColumnWidth(5, 110);
    f.setFrozenRows(3);
    return;
  }
  var ult = f.getLastRow();
  if (ult < 4) return;
  var v = f.getRange(4, 1, ult - 3, 2).getValues();
  var novo = {};
  v.forEach(function (l) {
    var de = String(l[0] || '').trim(), para = String(l[1] || '').trim();
    if (de && para) novo[de] = para;
  });
  if (Object.keys(novo).length) ALIASES = novo;
}

/** Escreve o inventário de grafias encontradas (colunas D/E), sem tocar no que editaste. */
function escreverInventario_(ss) {
  var f = ss.getSheetByName(PREFIXO + 'Nomes');
  if (!f) return;
  if (f.getMaxRows() > 3) f.getRange(4, 4, f.getMaxRows() - 3, 2).clearContent().clearFormat();
  f.getRange(3, 4, 1, 3).setValues([['Grafias encontradas', 'Nº respostas', 'Conta como']])
   .setBackground('#1F3864').setFontColor('#FFFFFF').setFontWeight('bold');
  var chaves = Object.keys(BRUTOS).sort();
  if (!chaves.length) return;
  var linhas = chaves.map(function (k) { return [k, BRUTOS[k], RESOLVIDO[k] || k]; });
  f.getRange(4, 4, linhas.length, 3).setValues(linhas);
  // amarelo = a grafia foi absorvida noutro nome (útil para confirmares que está certo)
  f.getRange(4, 4, linhas.length, 1).setBackgrounds(
    linhas.map(function (l) { return [l[0] === l[2] ? '#FFFFFF' : '#FFF2CC']; }));
  f.setColumnWidth(6, 160);
}


// ============================================================ 6b. SCORES 0-100
/** Converte um valor para 0-100 entre dois pontos de âncora absolutos. */
function esc_(v, mau, bom) {
  if (v === null || v === undefined || isNaN(v)) return null;
  var t = (v - mau) / (bom - mau);
  return Math.max(0, Math.min(100, t * 100));
}

/** Média ponderada que ignora componentes sem dados e reparte o peso pelos restantes. */
function pond_(partes) {
  var soma = 0, peso = 0, contrib = [];
  partes.forEach(function (p) {
    if (p.v === null) return;
    soma += p.v * p.w; peso += p.w;
    contrib.push({ nome: p.nome, v: p.v, w: p.w });
  });
  var total = partes.reduce(function (t, p) { return t + p.w; }, 0);
  if (!peso) return { score: null, contrib: [], cobertura: 0 };
  contrib.forEach(function (c) { c.pesoReal = c.w / peso; });
  return { score: soma / peso, contrib: contrib, cobertura: peso / total };
}

/**
 * PRONTIDÃO — como está o jogador para o próximo jogo. Move-se em dias.
 * Âncoras absolutas para o número ser comparável ao longo da época.
 */
function prontidao_(j, res) {
  if (INDISPONIVEL.indexOf(j.estado) !== -1) {
    return { score: null, contrib: [], motivo: j.estado.toLowerCase() };
  }
  if (j.m3 === null) return { score: null, contrib: [], motivo: 'sem resposta recente' };

  // Malone 2017: a zona protetora é 1,00-1,25. O ponto óptimo fica no meio.
  var frescura = null;
  if (j.acwr !== null) {
    var ideal = (LIM.acwrSup + 1.0) / 2;
    frescura = Math.max(0, 100 - Math.abs(j.acwr - ideal) * 150);
  } else if (j.aguda === 0 && res.diasHist >= 7) {
    frescura = null;   // sem carga registada não se inventa frescura
  }

  var p = pond_([
    { nome: 'bem-estar',  v: esc_(j.m3, 1.5, 4.5),                  w: 40 },
    { nome: 'desvio ao normal', v: j.z === null ? null : esc_(j.z, -2.0, 1.0), w: 20 },
    { nome: 'dor muscular', v: esc_(j.dor3, 1.5, 4.75),             w: 15 },
    { nome: 'frescura',   v: frescura,                              w: 15 },
    { nome: 'monotonia',  v: j.monotonia === null ? null : esc_(j.monotonia, 2.5, 1.0), w: 10 }
  ]);
  return p;
}

/**
 * CONDIÇÃO — o que o jogador construiu. Move-se em semanas.
 * Só faz sentido com 28 dias de histórico; antes disso a carga crónica é ficção.
 */
function condicao_(j, res) {
  if (res.diasHist < JANELA) return { score: null, contrib: [], motivo: 'histórico insuf.' };
  if (INDISPONIVEL.indexOf(j.estado) !== -1) {
    return { score: null, contrib: [], motivo: j.estado.toLowerCase() + ' — carga não comparável' };
  }
  // Guarda-redes acumulam muito menos carga; usar a escala de campo colocá-los-ia
  // sempre no fundo da tabela sem que isso signifique pior condição.
  var aMin = j.posicao === 'GR' ? 250 : 400;
  var aMax = j.posicao === 'GR' ? 1400 : 2200;
  var semanas = [];
  for (var w = 0; w < 4; w++) {
    semanas.push(j.serieCarga.slice(w * 7, w * 7 + 7).reduce(function (a, b) { return a + b; }, 0));
  }
  var diasComSessao = j.serieCarga.filter(function (x) { return x > 0; }).length;
  var tendencia = semanas[2] > 0 ? semanas[3] / semanas[2] : null;
  var p = pond_([
    { nome: 'carga acumulada', v: esc_(j.cronica, aMin, aMax),      w: 40 },
    { nome: 'consistência',    v: esc_(diasComSessao, 4, 16),       w: 30 },
    { nome: 'tendência',       v: tendencia === null ? null
                                  : Math.max(0, 100 - Math.abs(tendencia - 1.05) * 130), w: 30 }
  ]);
  return p;
}

/**
 * Confiança NO NÚMERO, não no jogador. Não mede adesão, assiduidade nem
 * estabilidade das respostas: mede se aquele score concreto assenta em base
 * sólida. Três critérios, todos sobre o que entrou de facto no cálculo.
 *
 * Deliberadamente NÃO penaliza quem varia muito nas respostas. Um jogador que
 * reporta 4,5 depois de uma folga e 2,5 depois de um MD-4 pesado está a
 * responder bem — a oscilação é resposta ao treino, não ruído. Penalizá-la
 * premiaria quem preenche sempre o mesmo número sem pensar.
 */
function confianca_(j, res, cobertura) {
  var pts = 0, porque = [];

  // 1. dias preenchidos na janela de 3 dias que gera o score
  var d3 = j.serieBem.slice(-3).filter(function (x) { return x !== null; }).length;
  if (d3 >= 3) pts += 2; else if (d3 === 2) pts += 1;
  if (d3 <= 1) porque.push(d3 === 0 ? 'nenhum dos 3 dias tem resposta'
                                    : 'só 1 dos 3 dias da janela tem resposta');

  // 2. peso dos componentes efetivamente disponível
  var cob = (cobertura === null || cobertura === undefined) ? 0 : cobertura;
  if (cob >= 0.80) pts += 2; else if (cob >= 0.55) pts += 1;
  if (cob < 0.80) porque.push('faltam componentes ao score (' + Math.round(cob * 100) + '% do peso disponível)');

  // 3. recência da última resposta
  var ult = -1;
  for (var i = JANELA - 1; i >= 0; i--) { if (j.serieBem[i] !== null) { ult = JANELA - 1 - i; break; } }
  if (ult === 0) pts += 2; else if (ult === 1) pts += 1;
  if (ult > 1) porque.push('última resposta há ' + ult + ' dias');

  return {
    // Alta exige os 6 pontos: janela de 3 dias completa, componentes quase todos
    // presentes e resposta de hoje. Com 5 em 6 já há algo a assinalar.
    nivel: pts >= 6 ? 'Alta' : pts >= 4 ? 'Média' : 'Baixa',
    pontos: pts,
    porque: porque.length ? porque.join('; ') : 'base sólida'
  };
}

/** Os dois fatores que mais puxaram o score para baixo. */
function porque_(p) {
  if (!p.contrib.length) return 'sem dados suficientes';
  var ord = p.contrib.slice().sort(function (a, b) { return a.v - b.v; });
  return ord.slice(0, 2).map(function (c) {
    return c.nome + ' ' + Math.round(c.v);
  }).join(', ');
}

function faixa_(s) {
  if (s === null) return 'sem dados';
  return s >= 80 ? 'Excelente' : s >= 65 ? 'Bom' : s >= 50 ? 'Aceitável' : s >= 35 ? 'Baixo' : 'Crítico';
}

function corScore_(s) {
  if (s === null) return COR.cinza;
  var t = Math.max(0, Math.min(1, s / 100));
  if (t < 0.5) { var u = t / 0.5; return hex_(248 + 7 * u, 105 + 130 * u, 107 + 25 * u); }
  var u2 = (t - 0.5) / 0.5;
  return hex_(255 - 156 * u2, 235 - 45 * u2, 132 - 9 * u2);
}

/** Dias até ao próximo jogo e etiqueta do microciclo (MD-4, MD-1, MD...). */
/**
 * Etiqueta do microciclo. Conta também os dias desde o último jogo, porque o
 * bem-estar cai 35-40% após o jogo e só recupera ao fim de 2 a 4 dias — uma
 * queda em MD+1 é esperada e não deve disparar alarme.
 */
function microciclo_(d, diaJogo) {
  var dow = d.getDay() === 0 ? 7 : d.getDay();       // 1=2ª ... 7=domingo
  var falta = (diaJogo - dow + 7) % 7;
  var desde = (dow - diaJogo + 7) % 7;
  return {
    falta: falta,
    desdeJogo: desde,
    etiqueta: falta === 0 ? 'MD' : (desde >= 1 && desde <= 2 ? 'MD+' + desde : 'MD-' + falta),
    folga: false   // preenchido a seguir pela deteção via PSE, a única fonte
  };
}


// ============================================================ 6c. LESÕES E POSIÇÕES
var ESTADOS = ['Disponível', 'Condicionado', 'Tratamento', 'Lesionado', 'Seleção', 'Fora'];
var INDISPONIVEL = ['Lesionado', 'Tratamento', 'Fora'];

/** Cria o registo de lesões na 1.ª vez e devolve o estado de cada jogador na data em uso. */
function lerLesoes_(ss, hoje) {
  var nome = PREFIXO + 'Lesões';
  var f = ss.getSheetByName(nome);
  if (!f) {
    f = ss.insertSheet(nome);
    f.getRange('A1').setValue('Registo de disponibilidade e lesões')
     .setFontSize(14).setFontWeight('bold').setFontColor(COR.navy);
    f.getRange('A2').setValue(
      'Uma linha por episódio. Deixa a data de fim vazia enquanto estiver a decorrer. '
      + 'Sem isto, o script não distingue quem descansou de quem está no departamento médico — '
      + 'e a carga zero de um lesionado seria lida como "carga baixa".')
     .setFontStyle('italic').setFontColor('#666666').setFontSize(9).setWrap(true);
    f.setRowHeight(2, 30);
    f.getRange(4, 1, 1, 5).setValues([['Jogador', 'Estado', 'Início', 'Fim (vazio = a decorrer)', 'Notas']])
     .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold').setFontSize(9);
    f.setColumnWidth(1, 140); f.setColumnWidth(2, 120); f.setColumnWidth(3, 100);
    f.setColumnWidth(4, 150); f.setColumnWidth(5, 320);
    f.getRange(5, 3, 500, 2).setNumberFormat('yyyy-mm-dd');
    var dv = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build();
    f.getRange(5, 2, 500, 1).setDataValidation(dv);
    f.setFrozenRows(4);
    return {};
  }
  var estado = {};
  var ult = f.getLastRow();
  if (ult < 5) return estado;
  f.getRange(5, 1, ult - 4, 5).getValues().forEach(function (l) {
    var jog = String(l[0] || '').trim();
    var est = String(l[1] || '').trim();
    if (!jog || !est) return;
    var ini = dia_(l[2]), fim = dia_(l[3]);
    if (ini && hoje < ini) return;
    if (fim && hoje > fim) return;
    estado[jog] = { estado: est, desde: ini, nota: String(l[4] || '').trim() };
  });
  return estado;
}

/** Cria o plantel na 1.ª vez, acrescenta jogadores novos e devolve as posições. */
function lerPosicoes_(ss, nomes) {
  var GR_INICIAIS = ['Abbiati', 'Noam', 'Rui'];
  var nome = PREFIXO + 'Plantel';
  var f = ss.getSheetByName(nome);
  if (!f) {
    f = ss.insertSheet(nome);
    f.getRange('A1').setValue('Plantel e posições')
     .setFontSize(14).setFontWeight('bold').setFontColor(COR.navy);
    f.getRange('A2').setValue(
      'Guarda-redes têm cargas muito abaixo das dos jogadores de campo (a carga externa ronda os 17%), '
      + 'por isso são avaliados contra âncoras próprias. Jogadores novos são acrescentados sozinhos como "Campo".')
     .setFontStyle('italic').setFontColor('#666666').setFontSize(9).setWrap(true);
    f.setRowHeight(2, 30);
    f.getRange(4, 1, 1, 2).setValues([['Jogador', 'Posição']])
     .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold').setFontSize(9);
    f.setColumnWidth(1, 160); f.setColumnWidth(2, 110);
    var dv = SpreadsheetApp.newDataValidation().requireValueInList(['GR', 'Campo'], true).build();
    f.getRange(5, 2, 300, 1).setDataValidation(dv);
    f.setFrozenRows(4);
  }
  var pos = {}, existentes = [];
  var ult = f.getLastRow();
  if (ult >= 5) {
    f.getRange(5, 1, ult - 4, 2).getValues().forEach(function (l) {
      var j = String(l[0] || '').trim();
      if (!j) return;
      existentes.push(j);
      pos[j] = String(l[1] || '').trim().toUpperCase() === 'GR' ? 'GR' : 'Campo';
    });
  }
  var novos = nomes.filter(function (n) { return existentes.indexOf(n) === -1; });
  if (novos.length) {
    var linha = Math.max(5, ult + 1);
    f.getRange(linha, 1, novos.length, 2).setValues(novos.map(function (n) {
      var p = GR_INICIAIS.indexOf(n) !== -1 ? 'GR' : 'Campo';
      pos[n] = p;
      return [n, p];
    }));
  }
  return pos;
}

/**
 * Mede o efeito pós-jogo NOS DADOS DESTE PLANTEL, comparando o bem-estar em MD+1
 * e MD+2 com a média do próprio jogador em dias sem efeito de jogo.
 * A literatura aponta quedas de 35-40%, mas isso é uma descrição de outros
 * planteis e de outras escalas — usar os valores observados aqui é mais honesto
 * do que importar fatores. Se ainda não houver observações suficientes, não se
 * corrige nada (é preferível não corrigir a corrigir mal).
 */
function efeitoPosJogo_(jogadores, chaves) {
  var d1 = [], d2 = [];
  Object.keys(jogadores).forEach(function (n) {
    var j = jogadores[n];
    var base = [], p1 = [], p2 = [];
    chaves.forEach(function (k, i) {
      if (!j.bem[k]) return;
      var v = media_(j.bem[k]);
      var ant1 = i >= 1 && j.jogos[chaves[i - 1]];
      var ant2 = i >= 2 && j.jogos[chaves[i - 2]];
      if (ant1) p1.push(v); else if (ant2) p2.push(v); else base.push(v);
    });
    if (base.length < 2) return;
    var m = media_(base);
    p1.forEach(function (v) { d1.push(v - m); });
    p2.forEach(function (v) { d2.push(v - m); });
  });
  var MIN_OBS = 8;
  return {
    md1: d1.length >= MIN_OBS ? -media_(d1) : 0,
    md2: d2.length >= MIN_OBS ? -media_(d2) : 0,
    n1: d1.length, n2: d2.length
  };
}

/**
 * Classifica o tipo de sessão em três baldes com significados diferentes:
 *   treino  — Treino e Jogo: é a carga de futebol, a única comparável entre
 *             jogadores e a única que alimenta o ACWR e a monotonia.
 *   recup   — Recuperação: passará a ser reportada por todos, todos os dias.
 *             Fica à parte porque uma carga quase constante todos os dias sobe
 *             a média sem mexer no desvio-padrão, inflacionando a monotonia de
 *             toda a gente, e empurra o ACWR artificialmente para 1.
 *   trat    — Tratamento: trabalho de lesionados. Nunca é comparável.
 */
function balde_(tipo) {
  var t = String(tipo || '').toLowerCase();
  if (t.indexOf('trat') !== -1) return 'trat';
  if (t.indexOf('recup') !== -1) return 'recup';
  return 'treino';                      // Treino, Jogo e qualquer outro
}

// ============================================================ 7. MOTOR
function calcular_(bem, pse, lesoes, posicoes) {
  var agora = dia_(new Date());

  // Âncora das janelas móveis. Se ainda não houver respostas hoje, recuamos até
  // ao último dia com dados: caso contrário, um fim de semana sem respostas
  // punha o plantel inteiro como "sem resposta" e esvaziava o painel.
  var ultimoDia = null;
  bem.forEach(function (x) { if (!ultimoDia || x.data > ultimoDia) ultimoDia = x.data; });
  var hoje = (ultimoDia && ultimoDia < agora) ? ultimoDia : agora;
  var diasAtraso = Math.round((agora - hoje) / 86400000);

  var dias = [];
  for (var i = JANELA - 1; i >= 0; i--) dias.push(somaDias_(hoje, -i));
  var chaves = dias.map(chave_);

  var jogadores = {};
  function reg(n) {
    if (!jogadores[n]) jogadores[n] = { nome: n, bem: {}, carga: {}, recup: {}, trat: {},
                                        itens: {}, jogos: {} };
    return jogadores[n];
  }
  bem.forEach(function (x) {
    var j = reg(x.jogador);
    (j.bem[x.chave] = j.bem[x.chave] || []).push(x.bemEstar);
    (j.itens[x.chave] = j.itens[x.chave] || []).push(x);
  });
  pse.forEach(function (x) {
    var j = reg(x.jogador);
    if (x.sRPE !== null) {
      var b = balde_(x.tipo);
      var alvo = b === 'treino' ? j.carga : b === 'recup' ? j.recup : j.trat;
      alvo[x.chave] = (alvo[x.chave] || 0) + x.sRPE;
    }
    if (String(x.tipo || '').toLowerCase().indexOf('jogo') !== -1) j.jogos[x.chave] = true;
  });

  var primeira = null;
  bem.forEach(function (x) { if (!primeira || x.data < primeira) primeira = x.data; });

  // A semana anterior só serve de termo de comparação se estiver inteiramente
  // coberta por registos. Senão, uma semana cheia dividida por dois dias soltos
  // devolve +300% e parece um pico de carga que nunca existiu.
  var primeiraCarga = null;
  pse.forEach(function (x) {
    if (x.sRPE !== null && (!primeiraCarga || x.data < primeiraCarga)) primeiraCarga = x.data;
  });
  // Um dia sem sessões reportadas no PSE é folga. O PSE é preenchido depois do
  // treino, por isso a sua ausência significa mesmo que não houve sessão — ao
  // contrário do bem-estar, que é preenchido de manhã e cuja ausência só diz que
  // ninguém respondeu. Dois critérios em simultâneo para tolerar quem se engana.
  var corrigirPJ = String(LIM.corrigirPosJogo || 'SIM').trim().toUpperCase().charAt(0) === 'S';
  var efeitoPJ = efeitoPosJogo_(jogadores, chaves);
  var nPlantel = Object.keys(jogadores).length || 1;
  var regPorDia = {}, jogoNoDia = {};
  pse.forEach(function (x) {
    if (x.sRPE === null) return;
    // Só sessões de treino e jogo contam para decidir se houve treino. A partir
    // do momento em que todos reportarem recuperação diária, contar tudo faria
    // com que nenhum dia voltasse a ser identificado como folga.
    if (balde_(x.tipo) !== 'treino') return;
    regPorDia[x.chave] = (regPorDia[x.chave] || 0) + 1;
    if (String(x.tipo || '').toLowerCase().indexOf('jogo') !== -1) jogoNoDia[x.chave] = true;
  });
  var folgaPSE = {}, adesaoMa = {};
  chaves.forEach(function (k) {
    var n = regPorDia[k] || 0;
    var poucos = (n <= LIM.folgaMaxRegistos) && (n / nPlantel < LIM.folgaMaxPct);
    // Ninguém reporta "Jogo" num dia em que não houve jogo. Se há registos de
    // jogo, o dia não foi folga — foi um dia com má adesão ao PSE, que é um
    // problema diferente e não deve ficar escondido.
    folgaPSE[k] = poucos && !jogoNoDia[k];
    adesaoMa[k] = poucos && !!jogoNoDia[k];
  });

  var inicioSemanaAnterior = somaDias_(hoje, -13);
  var deltaFiavel = !!primeiraCarga && inicioSemanaAnterior >= primeiraCarga;
  var diasHist = primeira ? Math.round((hoje - primeira) / 86400000) + 1 : 0;
  var acwrFiavel = diasHist >= LIM.diasMinACWR;

  var lista = Object.keys(jogadores).sort().map(function (n) {
    var j = jogadores[n];
    var serieBemRaw = chaves.map(function (k) { return j.bem[k] ? media_(j.bem[k]) : null; });

    // Correção pós-jogo, aditiva e calibrada nos dados do próprio plantel.
    // Cada dia é corrigido pela distância ao ÚLTIMO JOGO DESTE JOGADOR — não pelo
    // dia da semana —, por isso quem não reportou "Jogo" não leva correção, o que
    // resolve o caso do suplente não utilizado.
    // Não se usa divisão: uma escala de Likert 1-5 não tem zero verdadeiro, e a
    // correção multiplicativa saturava vários jogadores no tecto da escala.
    var fator = chaves.map(function (k, i) {
      if (!corrigirPJ) return 0;
      for (var back = 1; back <= 2; back++) {
        var idx = i - back;
        if (idx >= 0 && j.jogos[chaves[idx]]) return back === 1 ? efeitoPJ.md1 : efeitoPJ.md2;
      }
      return 0;
    });
    var serieBem = serieBemRaw.map(function (v, i) {
      return v === null ? null : Math.max(1, Math.min(5, v + fator[i]));
    });
    var serieCarga = chaves.map(function (k) { return j.carga[k] || 0; });
    var serieRecup = chaves.map(function (k) { return j.recup[k] || 0; });
    var serieTrat = chaves.map(function (k) { return j.trat[k] || 0; });
    var porItem = function (campo) {
      return chaves.map(function (k) {
        return j.itens[k] ? media_(j.itens[k].map(function (x) { return x[campo]; })) : null;
      });
    };
    var serieSono = porItem('sono'), serieFadiga = porItem('fadiga'),
        serieDor = porItem('dor'), serieStress = porItem('stress');

    var ult3 = serieBem.slice(-3), ult7 = serieBem.slice(-7);
    var m3 = media_(ult3), m7 = media_(ult7);
    var base = media_(serieBem), dp = desvio_(serieBem);
    var nResp = serieBem.filter(function (x) { return x !== null; }).length;
    var z = (nResp >= LIM.respMinZ && dp && dp > 0 && m3 !== null) ? (m3 - base) / dp : null;

    var adesao = ult7.filter(function (x) { return x !== null; }).length / 7;
    var aguda = serieCarga.slice(-7).reduce(function (s, x) { return s + x; }, 0);
    var cronica = serieCarga.reduce(function (s, x) { return s + x; }, 0) / 4;
    var acwr = (acwrFiavel && cronica > 0) ? aguda / cronica : null;
    var d7 = serieCarga.slice(-7), sd7 = desvio_(d7);
    var monotonia = (sd7 && sd7 > 0) ? media_(d7) / sd7 : null;
    var strain = monotonia !== null ? aguda * monotonia : null;
    var antes7 = serieCarga.slice(-14, -7).reduce(function (s, x) { return s + x; }, 0);
    var delta = (deltaFiavel && antes7 > 0) ? aguda / antes7 - 1 : null;

    // item mais crítico nos últimos 3 dias
    var soma = { Sono: [], Fadiga: [], 'Dor musc.': [], Stress: [] };
    chaves.slice(-3).forEach(function (k) {
      (j.itens[k] || []).forEach(function (x) {
        soma.Sono.push(x.sono); soma.Fadiga.push(x.fadiga);
        soma['Dor musc.'].push(x.dor); soma.Stress.push(x.stress);
      });
    });
    var dor3 = media_(soma['Dor musc.']);
    var critico = null, criticoV = null;
    Object.keys(soma).forEach(function (k) {
      var m = media_(soma[k]);
      if (m !== null && (criticoV === null || m < criticoV)) { criticoV = m; critico = k; }
    });

    var estadoBem = m3 === null ? 'sem resposta'
      : ((z !== null && z <= LIM.zRisco) || m3 < LIM.bemEstarRisco) ? 'RISCO'
      : ((z !== null && z <= LIM.zAlerta) || m3 < LIM.bemEstarRisco + 0.4) ? 'Atenção'
      : 'Normal';

    var estadoCarga = aguda === 0 ? 'sem carga'
      : acwr === null ? 'histórico insuf.'
      : acwr >= LIM.acwrRisco ? 'PICO DE CARGA'
      : acwr >= LIM.acwrSup ? 'A subir'
      : acwr < LIM.acwrBaixo ? 'Carga baixa'
      : 'Normal';

    var prio = (estadoBem === 'RISCO' ? 3 : estadoBem === 'Atenção' ? 1.5 : 0)
             + (estadoCarga === 'PICO DE CARGA' ? 2.5 : estadoCarga === 'A subir' ? 1 : 0)
             + (monotonia !== null && monotonia > LIM.monotoniaAlerta ? 1 : 0)
             + (adesao < LIM.adesaoMin ? 0.5 : 0);

    var leitura = m3 === null ? 'Sem resposta nos últimos 3 dias — confirmar adesão ao questionário.'
      : estadoBem === 'RISCO' ? 'Bem-estar em queda relevante. Item crítico: ' + critico + '. Falar com o jogador e ponderar sessão individualizada.'
      : estadoCarga === 'PICO DE CARGA' ? 'Carga a subir depressa demais face ao habitual. Aliviar volume em MD-4/MD-3.'
      : estadoBem === 'Atenção' ? 'Ligeira degradação. Item a vigiar: ' + critico + '.'
      : (monotonia !== null && monotonia > LIM.monotoniaAlerta) ? 'Semana monótona: variar mais a carga entre dias do microciclo.'
      : estadoCarga === 'Carga baixa' ? 'Carga abaixo do habitual — confirmar se esteve limitado ou a recuperar.'
      : 'Sem sinais de alerta.';

    return {
      nome: n, serieBem: serieBem, serieBemRaw: serieBemRaw, fatorPJ: fator,
      serieCarga: serieCarga, serieRecup: serieRecup, serieTrat: serieTrat,
      recup7: serieRecup.slice(-7).reduce(function (a, b) { return a + b; }, 0),
      trat7: serieTrat.slice(-7).reduce(function (a, b) { return a + b; }, 0),
      serieSono: serieSono, serieFadiga: serieFadiga, serieDor: serieDor, serieStress: serieStress,
      adesao: adesao, m3: m3, m7: m7, base: base, dp: dp, nResp: nResp, z: z,
      critico: critico ? critico + ' (' + criticoV.toFixed(1) + ')' : '',
      aguda: aguda, cronica: cronica, acwr: acwr, monotonia: monotonia,
      strain: strain, delta: delta,
      dor3: dor3,
      estadoBem: estadoBem, estadoCarga: estadoCarga, prio: prio, leitura: leitura
    };
  });

  var res = { hoje: hoje, agora: agora, diasAtraso: diasAtraso, dias: dias, chaves: chaves,
              jogadores: lista, diasHist: diasHist, acwrFiavel: acwrFiavel,
              deltaFiavel: deltaFiavel, primeiraCarga: primeiraCarga, bem: bem, pse: pse };

  // Primeiro dia com dados: antes disto não há nada para mostrar, e as colunas
  // vazias só ocupam espaço. Os cálculos continuam a usar a janela inteira.
  var iniVis = JANELA;
  lista.forEach(function (j) {
    for (var i = 0; i < JANELA; i++) {
      if (j.serieBemRaw[i] !== null || j.serieCarga[i] > 0) { if (i < iniVis) iniVis = i; break; }
    }
  });
  if (iniVis >= JANELA) iniVis = 0;
  res.iniVis = iniVis;
  res.nVis = JANELA - iniVis;
  res.diasVis = dias.slice(iniVis);

  res.regPorDia = chaves.map(function (k) { return regPorDia[k] || 0; });
  res.folgaDia = chaves.map(function (k) { return !!folgaPSE[k]; });
  res.adesaoMa = chaves.map(function (k) { return !!adesaoMa[k]; });
  res.corrigirPJ = corrigirPJ;
  res.efeitoPJ = efeitoPJ;
  res.md = microciclo_(hoje, LIM.diaJogo);
  // a deteção pelo PSE manda sobre a lista de dias da semana
  if (folgaPSE[chave_(hoje)]) res.md.folga = true;

  // Dois patamares de carga: na pré-época a carga é legitimamente mais alta, mas
  // o risco não desaparece — muda o nível a partir do qual é anormal (Malone 2017).
  res.preEpoca = !!(LIM.fimPreEpoca && hoje < LIM.fimPreEpoca);
  var limiarCarga = res.preEpoca ? LIM.cargaSemanaPre : LIM.cargaSemanaAlta;
  res.limiarCarga = limiarCarga;

  // Sinal relativo ao plantel: complementa o limiar absoluto. Carga alta em
  // absoluto E acima dos colegas merece mais atenção do que qualquer uma isolada.
  var indisp = function (n) {
    var L = lesoes && lesoes[n];
    return !!(L && INDISPONIVEL.indexOf(L.estado) !== -1);
  };
  var cargasCampo = lista
    .filter(function (j) {
      // Quem está indisponível não entra na base do percentil: a carga dele não
      // é de treino normal e distorceria o limiar do resto do plantel.
      return (posicoes && posicoes[j.nome] || 'Campo') !== 'GR' && !indisp(j.nome);
    })
    .map(function (j) { return j.aguda; })
    .filter(function (x) { return x > 0; })
    .sort(function (a, b) { return a - b; });
  var p80 = cargasCampo.length >= 5
    ? cargasCampo[Math.min(cargasCampo.length - 1, Math.floor(cargasCampo.length * 0.8))] : null;
  res.p80Carga = p80;

  lesoes = lesoes || {}; posicoes = posicoes || {};
  lista.forEach(function (j) {
    var L = lesoes[j.nome];
    j.estado = L ? L.estado : 'Disponível';
    j.estadoNota = L ? L.nota : '';
    j.posicao = posicoes[j.nome] || 'Campo';
    // Dois patamares: a carga de pré-época é legitimamente mais alta, mas o risco
    // não desaparece — muda o nível a partir do qual é anormal (Malone 2017).
    j.limiarCarga = limiarCarga;
    j.cargaAlta = (j.posicao !== 'GR') && j.aguda > limiarCarga;
    var pr = prontidao_(j, res), cd = condicao_(j, res);
    j.prontidao = pr.score === null ? null : Math.round(pr.score);
    j.prontidaoPorque = pr.motivo || porque_(pr);
    j.condicao = cd.score === null ? null : Math.round(cd.score);
    j.condicaoPorque = cd.motivo || porque_(cd);
    j.cargaTopo = (p80 !== null) && (j.posicao !== 'GR') && (j.aguda >= p80);

    // RESPOSTA À FOLGA — quanto o bem-estar sobe do dia de folga para o dia
    // seguinte. O questionário é de manhã, por isso a resposta no dia de folga
    // reflete o estado à entrada do descanso e a do dia seguinte reflete o
    // estado à saída. Usa os valores corrigidos do efeito do jogo: sem isso,
    // uma folga a seguir a jogo daria um salto que era só o jogo a passar.
    var deltas = [];
    for (var i = 0; i < JANELA - 1; i++) {
      if (!res.folgaDia[i]) continue;
      var a = j.serieBem[i], b = j.serieBem[i + 1];
      if (a !== null && b !== null) deltas.push(b - a);
    }
    j.folgaN = deltas.length;
    j.folgaDelta = deltas.length ? media_(deltas) : null;
    j.folgaLeitura = deltas.length === 0
      ? 'sem folga com resposta antes e depois'
      : (j.folgaDelta >= 0.4 ? 'recupera bem na folga'
         : j.folgaDelta >= 0.1 ? 'recupera pouco na folga'
         : j.folgaDelta > -0.1 ? 'folga não altera nada'
         : 'sai da folga pior do que entrou')
        + ' (' + (j.folgaDelta >= 0 ? '+' : '') + j.folgaDelta.toFixed(2)
        + ' em ' + deltas.length + ' folga' + (deltas.length > 1 ? 's' : '') + ')';
    var cf = confianca_(j, res, pr.cobertura);
    j.confianca = cf.nivel;
    j.confiancaPorque = cf.porque;
    if (INDISPONIVEL.indexOf(j.estado) !== -1) {
      j.estadoBem = j.estado;
      j.estadoCarga = 'indisponível';
      j.leitura = j.estado + (j.estadoNota ? ' — ' + j.estadoNota : '') +
                  '. Carga e prontidão não aplicáveis enquanto durar.';
      j.prio = 0;
    } else if (j.estado === 'Condicionado') {
      j.leitura = 'Treino condicionado' + (j.estadoNota ? ' — ' + j.estadoNota : '') + '.'
                + (j.leitura === 'Sem sinais de alerta.' ? ' Bem-estar sem sinais de alerta.' : ' ' + j.leitura);
    } else if (j.cargaAlta || j.cargaTopo) {
      // O aviso de carga SUBSTITUI o "sem sinais de alerta" quando este era a
      // única coisa a dizer — juntá-los produzia frases contraditórias, do género
      // "merece atenção. Sem sinais de alerta."
      var resto = (j.leitura === 'Sem sinais de alerta.') ? '' : ' ' + j.leitura;
      if (j.cargaAlta && j.cargaTopo) {
        j.leitura = 'Carga acima de ' + limiarCarga + ' UA'
                  + (res.preEpoca ? ' (patamar de pré-época)' : '')
                  + ' e no topo do plantel esta semana — é a combinação que mais merece atenção.'
                  + (resto ? resto : ' Bem-estar sem sinais de alerta.');
        j.prio += 1.5;
      } else if (j.cargaAlta) {
        j.leitura = 'Carga semanal acima de ' + limiarCarga + ' UA, zona associada a mais lesões'
                  + (res.preEpoca ? ' (patamar de pré-época)' : '') + '.'
                  + (resto ? resto : ' Bem-estar sem sinais de alerta.');
        j.prio += 1;
      } else {
        j.leitura = 'No topo da carga do plantel esta semana, ainda que abaixo do patamar de risco.'
                  + (resto ? resto : ' Bem-estar sem sinais de alerta.');
        j.prio += 0.5;
      }
    }
  });
  return res;
}

// ============================================================ 8. ESCRITA
var COR = { navy: '#1F3864', branco: '#FFFFFF', vermelho: '#F8CBAD',
            amarelo: '#FFE699', verde: '#C6E0B4', cinza: '#EDEDED' };

function folha_(ss, nome) {
  var f = ss.getSheetByName(nome) || ss.insertSheet(nome);
  f.clear();
  f.getCharts().forEach(function (c) { f.removeChart(c); });
  return f;
}

function cabecalho_(f, linha, titulos) {
  f.getRange(linha, 1, 1, titulos.length).setValues([titulos])
    .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
    .setFontSize(9).setWrap(true).setHorizontalAlignment('center');
  f.setFrozenRows(linha);
}

function corEstado_(v) {
  if (v === 'RISCO' || v === 'PICO DE CARGA') return COR.vermelho;
  if (v === 'Atenção' || v === 'A subir') return COR.amarelo;
  if (v === 'Normal') return COR.verde;
  return COR.cinza;
}

/** Verde-amarelo-vermelho entre 2,0 e 4,5. Em hexadecimal — o Apps Script
 *  não aceita a notação rgb() e rebenta com "Invalid color string". */
function hex_(r, g, b) {
  var h = function (v) {
    v = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return v.length === 1 ? '0' + v : v;
  };
  return '#' + h(r) + h(g) + h(b);
}

function corBem_(v) {
  if (v === null || v === '' || isNaN(v)) return COR.branco;
  var t = Math.max(0, Math.min(1, (v - 2) / 2.5));
  if (t < 0.5) {                       // vermelho -> amarelo
    var u = t / 0.5;
    return hex_(248 + (255 - 248) * u, 105 + (235 - 105) * u, 107 + (132 - 107) * u);
  }
  var u2 = (t - 0.5) / 0.5;            // amarelo -> verde
  return hex_(255 - (99 - 255) * -u2, 235 - (235 - 190) * u2, 132 + (123 - 132) * u2);
}


// ============================================================ 8b. FICHAS INDIVIDUAIS
var FICHA = { kpi: 4, tab: 8, dados: 9, sem: 40, rating: 47 };

function nomeFicha_(n) {
  return (PREFIXO + n).substring(0, 95);
}

/**
 * Uma ficha por jogador. É construída de raiz apenas na primeira vez; nas
 * atualizações seguintes só os valores são reescritos, para os gráficos não
 * terem de ser recriados a cada resposta submetida (seria lento de mais para
 * caber no limite de execução do Apps Script).
 */
function escreverFichas_(ss, res, recriar) {
  // O Apps Script corta a execução ao fim de alguns minutos. Construir 26 fichas
  // de raiz cria dezenas de gráficos e pode não caber numa só passagem, por isso
  // paramos antes do limite e deixamos o resto para a atualização seguinte —
  // como as fichas já feitas não são refeitas, a construção retoma onde parou.
  var LIMITE_MS = 4.5 * 60 * 1000;
  var t0 = new Date().getTime();
  var feitas = 0, criadas = 0, faltam = 0;

  res.jogadores.forEach(function (j) {
    var nome = nomeFicha_(j.nome);
    var f = ss.getSheetByName(nome);
    if (f && recriar) { ss.deleteSheet(f); f = null; }
    var nova = !f;

    if (nova && (new Date().getTime() - t0) > LIMITE_MS) { faltam++; return; }

    if (nova) { f = ss.insertSheet(nome); montarFicha_(f, j, res); criadas++; }
    preencherFicha_(f, j, res);
    feitas++;
  });

  res.fichas = { feitas: feitas, criadas: criadas, faltam: faltam };
  if (faltam) {
    var msg = 'Faltaram ' + faltam + ' ficha(s) por construir para não exceder o limite de tempo. '
            + 'Corre a atualização outra vez — continua de onde parou.';
    Logger.log(msg);
    try { destino_().toast(msg, 'Fichas', 10); } catch (e) {}
  }
}

function montarFicha_(f, j, res) {
  f.setColumnWidth(1, 78);  f.setColumnWidth(2, 46);
  for (var c = 3; c <= 8; c++) f.setColumnWidth(c, 72);
  f.setColumnWidth(9, 22);

  f.getRange('A1:H1').merge().setFontSize(16).setFontWeight('bold').setFontColor(COR.navy);
  f.getRange('A2:H2').merge().setFontStyle('italic').setFontColor('#666666').setFontSize(9);

  // faixa de indicadores
  var rot = ['Bem-estar 3d', 'Z-score', 'Adesão 7d', 'Item crítico',
             'Carga 7d', 'ACWR', 'Monotonia', 'Estado'];
  f.getRange(FICHA.kpi, 1, 1, 8).setValues([rot])
   .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
   .setFontSize(8).setHorizontalAlignment('center').setWrap(true);
  f.getRange(FICHA.kpi + 1, 1, 1, 8)
   .setBackground('#FFF7E6').setFontSize(12).setFontWeight('bold')
   .setFontColor(COR.navy).setHorizontalAlignment('center');
  f.setRowHeight(FICHA.kpi + 1, 28);

  // tabela dos 28 dias
  f.getRange(FICHA.tab - 1, 1).setValue('Últimos 28 dias')
   .setFontSize(11).setFontWeight('bold').setFontColor(COR.navy);
  f.getRange(FICHA.tab, 1, 1, 8)
   .setValues([['Data', 'Dia', 'Bem-estar', 'Sono', 'Fadiga', 'Dor', 'Stress', 'Carga']])
   .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
   .setFontSize(9).setHorizontalAlignment('center');
  f.setFrozenRows(FICHA.tab);

  var fim = FICHA.dados + JANELA - 1;
  f.getRange(FICHA.dados, 1, JANELA, 1).setNumberFormat('dd/MM');
  f.getRange(FICHA.dados, 3, JANELA, 5).setNumberFormat('0.0');
  f.getRange(FICHA.dados, 8, JANELA, 1).setNumberFormat('#,##0');
  f.getRange(FICHA.dados, 1, JANELA, 8).setHorizontalAlignment('center').setFontSize(9);

  // escala de cor nas colunas dos itens (1 a 5)
  f.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .setGradientMaxpointWithValue('#63BE7B', SpreadsheetApp.InterpolationType.NUMBER, '4.5')
      .setGradientMidpointWithValue('#FFEB84', SpreadsheetApp.InterpolationType.NUMBER, '3.25')
      .setGradientMinpointWithValue('#F8696B', SpreadsheetApp.InterpolationType.NUMBER, '2')
      .setRanges([f.getRange(FICHA.dados, 3, JANELA, 5)]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .setGradientMaxpointWithValue('#C00000', SpreadsheetApp.InterpolationType.NUMBER, '900')
      .setGradientMidpointWithValue('#FFD966', SpreadsheetApp.InterpolationType.NUMBER, '400')
      .setGradientMinpointWithValue('#FFFFFF', SpreadsheetApp.InterpolationType.NUMBER, '0')
      .setRanges([f.getRange(FICHA.dados, 8, JANELA, 1)]).build()
  ]);

  // resumo por semana
  f.getRange(FICHA.sem - 1, 1).setValue('Por semana')
   .setFontSize(11).setFontWeight('bold').setFontColor(COR.navy);
  f.getRange(FICHA.sem, 1, 1, 5)
   .setValues([['Semana', 'Bem-estar', 'Carga total', 'Monotonia', 'Nº respostas']])
   .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
   .setFontSize(9).setHorizontalAlignment('center');
  f.getRange(FICHA.sem + 1, 1, 4, 5).setHorizontalAlignment('center').setFontSize(9);
  f.getRange(FICHA.sem + 1, 1, 4, 1).setNumberFormat('dd/MM');
  f.getRange(FICHA.sem + 1, 2, 4, 1).setNumberFormat('0.00');
  f.getRange(FICHA.sem + 1, 3, 4, 1).setNumberFormat('#,##0');
  f.getRange(FICHA.sem + 1, 4, 4, 1).setNumberFormat('0.00');

  // bloco de rating de preparação
  f.getRange(FICHA.rating - 1, 1).setValue('Rating de preparação')
   .setFontSize(11).setFontWeight('bold').setFontColor(COR.navy);
  f.getRange(FICHA.rating, 1, 1, 4)
   .setValues([['Indicador', 'Score', 'Faixa', 'O que o está a determinar']])
   .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
   .setFontSize(9).setHorizontalAlignment('center');
  f.getRange(FICHA.rating + 1, 1, 4, 1)
   .setValues([['Prontidão p/ o jogo'], ['Condição física'], ['Confiança no score'], ['Microciclo']])
   .setFontWeight('bold').setFontSize(9);
  f.getRange(FICHA.rating + 1, 2, 4, 1)
   .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
  f.getRange(FICHA.rating + 1, 3, 4, 1).setHorizontalAlignment('center').setFontSize(9);
  f.getRange(FICHA.rating + 1, 4, 4, 1).setFontSize(9).setWrap(true);
  f.setColumnWidth(4, 260);

  // gráficos (criados só uma vez; leem intervalos fixos e acompanham os valores)
  var fim2 = FICHA.dados + JANELA - 1;
  f.insertChart(f.newChart().asLineChart()
    .addRange(f.getRange(FICHA.tab, 1, JANELA + 1, 1))
    .addRange(f.getRange(FICHA.tab, 3, JANELA + 1, 5))
    .setNumHeaders(1)
    .setOption('title', 'Bem-estar e itens — 28 dias')
    .setOption('vAxis.viewWindow', { min: 1, max: 5 })
    .setOption('interpolateNulls', false)
    .setOption('series', { 0: { lineWidth: 4 } })
    .setOption('width', 560).setOption('height', 300)
    .setPosition(FICHA.tab, 10, 0, 0).build());

  f.insertChart(f.newChart().asColumnChart()
    .addRange(f.getRange(FICHA.tab, 1, JANELA + 1, 1))
    .addRange(f.getRange(FICHA.tab, 8, JANELA + 1, 1))
    .setNumHeaders(1)
    .setOption('title', 'Carga diária (sRPE)')
    .setOption('width', 560).setOption('height', 300)
    .setPosition(FICHA.tab + 16, 10, 0, 0).build());

  f.insertChart(f.newChart().asColumnChart()
    .addRange(f.getRange(FICHA.sem, 1, 5, 1))
    .addRange(f.getRange(FICHA.sem, 3, 5, 1))
    .setNumHeaders(1)
    .setOption('title', 'Carga por semana')
    .setOption('width', 560).setOption('height', 260)
    .setPosition(FICHA.rating, 10, 0, 0).build());
}

function preencherFicha_(f, j, res) {
  var v = function (x, d) { return (x === null || x === undefined || isNaN(x)) ? (d === undefined ? '' : d) : x; };

  f.getRange('A1').setValue(j.nome);
  f.getRange('A2').setValue(
    'Janelas ancoradas em ' + Utilities.formatDate(res.hoje, TZ, 'dd/MM/yyyy') +
    (res.diasAtraso > 0 ? '  ·  sem respostas há ' + res.diasAtraso + ' dia(s)' : '') +
    '  ·  ' + j.leitura);

  f.getRange(FICHA.kpi + 1, 1, 1, 8).setValues([[
    v(j.m3, '—'),
    j.z === null ? 'histórico insuf.' : (j.z >= 0 ? '+' : '') + j.z.toFixed(2),
    Math.round(j.adesao * 100) + '%',
    j.critico || '—',
    j.aguda,
    j.acwr === null ? 'histórico insuf.' : j.acwr.toFixed(2),
    j.monotonia === null ? '—' : j.monotonia.toFixed(2),
    j.estadoBem
  ]]);
  f.getRange(FICHA.kpi + 1, 1).setNumberFormat('0.00');
  f.getRange(FICHA.kpi + 1, 5).setNumberFormat('#,##0');
  f.getRange(FICHA.kpi + 1, 8).setBackground(corEstado_(j.estadoBem));
  f.getRange(FICHA.kpi + 1, 2).setFontSize(j.z === null ? 9 : 12);
  f.getRange(FICHA.kpi + 1, 4).setFontSize(9);
  f.getRange(FICHA.kpi + 1, 6).setFontSize(j.acwr === null ? 9 : 12);

  var linhas = res.dias.map(function (d, i) {
    return [d, Utilities.formatDate(d, TZ, 'EEE'),
            v(j.serieBemRaw[i]), v(j.serieSono[i]), v(j.serieFadiga[i]),
            v(j.serieDor[i]), v(j.serieStress[i]), j.serieCarga[i]];
  });
  f.getRange(FICHA.dados, 1, JANELA, 8).setValues(linhas);

  var falta = res.md.falta;
  f.getRange(FICHA.rating + 1, 2, 4, 1).setValues([
    [j.prontidao === null ? '—' : j.prontidao],
    [j.condicao === null ? '—' : j.condicao],
    [j.confianca],
    [res.md.etiqueta]
  ]);
  f.getRange(FICHA.rating + 1, 3, 4, 1).setValues([
    [faixa_(j.prontidao)],
    [j.condicao === null ? 'histórico insuf.' : faixa_(j.condicao)],
    [j.confianca === 'Alta' ? 'o número assenta em base sólida'
      : j.confianca === 'Média' ? 'ler com alguma reserva' : 'base frágil — usar como pergunta, não como conclusão'],
    [falta === 0 ? 'jogo é hoje' : falta === 1 ? 'jogo amanhã' : 'jogo daqui a ' + falta + ' dias']
  ]);
  f.getRange(FICHA.rating + 1, 4, 4, 1).setValues([
    [j.prontidaoPorque],
    [j.condicaoPorque],
    [j.confiancaPorque],
    ['Em MD-4/MD-3 espera-se prontidão mais baixa; em MD-1 deve estar a recuperar.']
  ]);
  f.getRange(FICHA.rating + 1, 2).setBackground(corScore_(j.prontidao));
  f.getRange(FICHA.rating + 2, 2).setBackground(corScore_(j.condicao));
  f.getRange(FICHA.rating + 3, 2).setBackground(
    j.confianca === 'Alta' ? COR.verde : j.confianca === 'Média' ? COR.amarelo : COR.vermelho);
  f.getRange(FICHA.rating + 3, 2).setFontSize(10);
  f.getRange(FICHA.rating + 4, 2).setFontSize(10).setBackground(COR.cinza);

  var sem = [];
  for (var w = 0; w < 4; w++) {
    var a = w * 7, b = a + 7;
    var bloco = j.serieCarga.slice(a, b), sd = desvio_(bloco);
    sem.push([res.dias[a],
              v(media_(j.serieBemRaw.slice(a, b))),
              bloco.reduce(function (x, y) { return x + y; }, 0),
              (sd && sd > 0) ? media_(bloco) / sd : '',
              j.serieBemRaw.slice(a, b).filter(function (x) { return x !== null; }).length]);
  }
  f.getRange(FICHA.sem + 1, 1, 4, 5).setValues(sem);
}

/** Menu: reconstrói as fichas de raiz (usar se mudares o formato). */
function recriarFichas() {
  var ss = destino_();
  lerConfig_(ss); lerAliases_(ss);
  var bem = lerBemEstar_(), pse = lerPSE_();
  var resolve = construirRegisto_(
    bem.map(function (x) { return x.nomeBruto; })
       .concat(pse.map(function (x) { return x.nomeBruto; })));
  bem.forEach(function (x) { x.jogador = resolve(x.nomeBruto); });
  pse.forEach(function (x) { x.jogador = resolve(x.nomeBruto); });
  var nomes2 = [];
  bem.concat(pse).forEach(function (x) {
    if (x.jogador && nomes2.indexOf(x.jogador) === -1) nomes2.push(x.jogador);
  });
  nomes2.sort();
  var h2 = dia_(new Date()), ub = null;
  bem.forEach(function (x) { if (!ub || x.data > ub) ub = x.data; });
  escreverFichas_(ss, calcular_(bem, pse, lerLesoes_(ss, (ub && ub < h2) ? ub : h2),
                                lerPosicoes_(ss, nomes2)), true);
  try { SpreadsheetApp.getUi().alert('Fichas reconstruídas.'); } catch (e) {}
}


// ============================================================ 8c. FOLHA DE PRONTIDÃO
function escreverProntidao_(ss, res) {
  var f = folha_(ss, PREFIXO + 'Prontidão');
  // Sem merge: unir A1:M1 impediria fixar a coluna dos nomes (o Google não deixa
  // fixar colunas que cortem uma célula unida ao meio).
  f.getRange('A1').setValue('PRONTIDÃO PARA O JOGO')
   .setFontSize(18).setFontWeight('bold').setFontColor(COR.navy);

  var falta = res.md.falta;
  var quando = falta === 0 ? 'É HOJE' : falta === 1 ? 'AMANHÃ' : 'daqui a ' + falta + ' dias';
  f.getRange('A2').setValue(
    'Hoje é ' + res.md.etiqueta + ' — próximo jogo ' + quando + '.  ' +
    (res.md.folga ? 'Hoje é dia de folga.  ' : '') +
    'Patamar de carga em uso: ' + res.limiarCarga + ' UA/semana'
      + (res.preEpoca ? ' (pré-época — a carga é legitimamente mais alta nesta fase)'
         : (LIM.fimPreEpoca ? ' (época)'
            : ' (época, por omissão — a data de fim da pré-época está por preencher na linha 16 do «'
              + PREFIXO + 'Config»; sem ela o patamar de pré-época nunca é usado)')) + '.  ' +
    (res.p80Carga ? 'Topo do plantel a partir de ' + Math.round(res.p80Carga)
      + ' UA (jogadores de campo disponíveis).  ' : '') +
    'A «Carga treino 7d» conta apenas Treino e Jogo. Recuperação e Tratamento têm colunas próprias: '
    + 'são carga real, mas não comparáveis — a recuperação por ser quase diária e constante, '
    + 'o tratamento por ser trabalho de lesionados.  ' +
    (res.corrigirPJ
      ? (res.efeitoPJ.md1 || res.efeitoPJ.md2
          ? 'Correção pós-jogo: +' + res.efeitoPJ.md1.toFixed(2) + ' em MD+1 e +'
            + res.efeitoPJ.md2.toFixed(2) + ' em MD+2, medidos neste plantel ('
            + res.efeitoPJ.n1 + ' e ' + res.efeitoPJ.n2 + ' observações), não importados da literatura. '
            + 'Só se aplica a quem reportou «Jogo». A dor muscular não é corrigida, porque a dor pós-jogo é sinal real.  '
          : 'Correção pós-jogo ligada mas ainda sem observações suficientes para a calibrar — nada está a ser corrigido.  ')
      : 'Correção pós-jogo desligada: os valores estão em bruto.  ') +
    (res.md.desdeJogo >= 1 && res.md.desdeJogo <= 2
      ? 'Estás a ' + res.md.desdeJogo + ' dia(s) do último jogo: o bem-estar cai 35-40% após o jogo e só recupera ao fim de 2 a 4 dias, por isso há tolerância acrescida.  ' : '') +
    'A mesma prontidão lê-se de forma diferente conforme o dia do microciclo: um 65 em MD-4 é normal, em MD-1 é sinal de alerta.  ' +
    'Dia do jogo configurável em «' + PREFIXO + 'Config».')
   .setFontStyle('italic').setFontColor('#666666').setFontSize(9);

  // ---- indicadores de equipa ----
  var comScore = res.jogadores.filter(function (j) { return j.prontidao !== null; });
  var med = comScore.length ? Math.round(media_(comScore.map(function (j) { return j.prontidao; }))) : null;
  var kpis = [
    ['MICROCICLO', res.md.etiqueta],
    ['PRONTIDÃO MÉDIA', med === null ? '—' : med],
    ['ACIMA DE 65', comScore.filter(function (j) { return j.prontidao >= 65; }).length + ' / ' + comScore.length],
    ['ABAIXO DE 50', comScore.filter(function (j) { return j.prontidao < 50; }).length],
    ['SEM RESPOSTA', res.jogadores.length - comScore.length]
  ];
  kpis.forEach(function (k, i) {
    // Começam na coluna B: se um cartão unisse A4:B4, deixaria de ser possível
    // fixar a coluna dos nomes (o Google não fixa colunas que cortem uma união).
    var c = 2 + i * 2;
    f.getRange(4, c, 1, 2).merge().setValue(k[0])
     .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
     .setFontSize(9).setHorizontalAlignment('center');
    f.getRange(5, c, 1, 2).merge().setValue(k[1])
     .setBackground('#FFF7E6').setFontSize(16).setFontWeight('bold')
     .setFontColor(COR.navy).setHorizontalAlignment('center');
  });
  f.setRowHeight(5, 30);

  // ---- tabela ----
  cabecalho_(f, 7, ['Jogador', 'Pos.', 'Estado', 'Prontidão', 'Faixa', 'Condição', 'Confiança',
                    'Bem-estar 3d', 'Dor 3d', 'ACWR', 'Carga treino 7d', 'Recup. 7d', 'Trat. 7d',
                    'O que puxa a prontidão', 'Leitura']);
  var ord = res.jogadores.slice().sort(function (a, b) {
    if (a.prontidao === null && b.prontidao === null) return a.nome < b.nome ? -1 : 1;
    if (a.prontidao === null) return 1;
    if (b.prontidao === null) return -1;
    return a.prontidao - b.prontidao;                 // pior primeiro
  });
  var linhas = ord.map(function (j) {
    return [j.nome, j.posicao, j.estado,
            j.prontidao === null ? (j.prontidaoPorque || 'sem dados') : j.prontidao,
            faixa_(j.prontidao),
            j.condicao === null ? (j.condicaoPorque || '—') : j.condicao,
            j.confianca,
            j.m3 === null ? '' : j.m3,
            j.dor3 === null ? '' : j.dor3,
            j.acwr === null ? '' : j.acwr,
            j.aguda, j.recup7 || '', j.trat7 || '',
            j.prontidaoPorque, j.leitura];
  });
  if (!linhas.length) return;
  f.getRange(8, 1, linhas.length, 15).setValues(linhas);
  f.getRange(8, 4, linhas.length, 1).setFontWeight('bold').setFontSize(12)
   .setBackgrounds(ord.map(function (j) { return [corScore_(j.prontidao)]; }));
  f.getRange(8, 6, linhas.length, 1)
   .setBackgrounds(ord.map(function (j) { return [corScore_(j.condicao)]; }));
  f.getRange(8, 7, linhas.length, 1).setBackgrounds(ord.map(function (j) {
    return [j.confianca === 'Alta' ? COR.verde : j.confianca === 'Média' ? COR.amarelo : COR.vermelho];
  })).setNotes(ord.map(function (j) { return [j.confiancaPorque || '']; }));
  f.getRange(8, 3, linhas.length, 1).setBackgrounds(ord.map(function (j) {
    return [INDISPONIVEL.indexOf(j.estado) !== -1 ? COR.vermelho
            : j.estado === 'Condicionado' ? COR.amarelo
            : j.estado === 'Seleção' ? COR.cinza : COR.branco];
  }));
  f.getRange(8, 11, linhas.length, 1).setBackgrounds(ord.map(function (j) {
    return [(j.cargaAlta && j.cargaTopo) ? COR.vermelho
            : j.cargaAlta ? COR.amarelo
            : j.cargaTopo ? '#FFF2CC' : COR.branco];
  })).setNumberFormat('#,##0');
  f.getRange(8, 11, linhas.length, 1).setNotes(ord.map(function (j) {
    return [j.cargaAlta && j.cargaTopo ? 'Acima do patamar de risco E no topo do plantel'
            : j.cargaAlta ? 'Acima do patamar de risco (' + res.limiarCarga + ' UA)'
            : j.cargaTopo ? 'No topo da carga do plantel esta semana' : ''];
  }));
  f.getRange(8, 8, linhas.length, 3).setNumberFormat('0.00');
  f.getRange(8, 12, linhas.length, 2).setNumberFormat('#,##0');
  f.getRange(8, 12, linhas.length, 1)
   .setBackgrounds(ord.map(function (j) { return [j.recup7 ? '#DDEBF7' : COR.branco]; }))
   .setNotes(ord.map(function (j) {
     return [j.recup7 ? 'Sessões de recuperação. Fora da carga de treino, do ACWR e da '
             + 'monotonia: sendo quase diária e constante, distorceria os três.' : ''];
   }));
  f.getRange(8, 13, linhas.length, 1)
   .setBackgrounds(ord.map(function (j) { return [j.trat7 ? '#FCE4D6' : COR.branco]; }))
   .setNotes(ord.map(function (j) {
     return [j.trat7 ? 'Sessões de tratamento (lesionados). Nunca é comparável com carga de treino.' : ''];
   }));
  f.getRange(8, 2, linhas.length, 12).setHorizontalAlignment('center');
  f.getRange(8, 14, linhas.length, 2).setFontSize(9).setWrap(true);
  f.setColumnWidth(1, 120); f.setColumnWidth(2, 46); f.setColumnWidth(3, 100);
  f.setColumnWidth(12, 78); f.setColumnWidth(13, 72);
  f.setColumnWidth(14, 200); f.setColumnWidth(15, 340);
  f.setFrozenColumns(1);

  var fim = 7 + linhas.length;
  f.insertChart(f.newChart().asBarChart()
    .addRange(f.getRange(7, 1, linhas.length + 1, 1))
    .addRange(f.getRange(7, 4, linhas.length + 1, 1))
    .setNumHeaders(1).setOption('title', 'Prontidão para o jogo (0-100)')
    .setOption('hAxis.viewWindow', { min: 0, max: 100 })
    .setOption('width', 600).setOption('height', Math.max(320, linhas.length * 22))
    .setPosition(fim + 2, 1, 0, 0).build());

  f.getRange(fim + 2, 14).setValue('Como ler')
   .setFontWeight('bold').setFontColor(COR.navy).setFontSize(11);
  f.getRange(fim + 3, 14, 6, 2).setValues([
    ['80-100 Excelente', 'Sem restrições.'],
    ['65-79 Bom', 'Normal para meio de microciclo.'],
    ['50-64 Aceitável', 'Vigiar; se faltar 1 dia para o jogo, perguntar.'],
    ['35-49 Baixo', 'Falar com o jogador antes de decidir carga.'],
    ['0-34 Crítico', 'Avaliar individualmente.'],
    ['Confiança baixa', 'Base frágil: janela de 3 dias incompleta, componentes em falta ou resposta antiga. Passa o rato pela célula para ver a razão.']
  ]);
  f.getRange(fim + 3, 14, 6, 1).setFontWeight('bold');
  f.getRange(fim + 3, 14, 5, 1).setBackgrounds([[corScore_(90)], [corScore_(72)],
                                                [corScore_(57)], [corScore_(42)], [corScore_(20)]]);
  f.getRange(fim + 3, 15, 6, 1).setFontSize(9);
}

function escrever_(res) {
  var ss = destino_();
  escreverJogadores_(ss, res);
  escreverGrelhas_(ss, res);
  escreverSemanal_(ss, res);
  escreverSerie_(ss, res);
  escreverAlertas_(ss, res);
  escreverPainel_(ss, res);
  escreverProntidao_(ss, res);
  escreverFichas_(ss, res, false);
}

function escreverJogadores_(ss, res) {
  var f = folha_(ss, '· Jogadores');
  f.getRange('A1').setValue('Análise por jogador').setFontSize(14).setFontWeight('bold').setFontColor(COR.navy);
  f.getRange('A2').setValue('O Z-score compara os últimos 3 dias com o próprio historial de 28 dias. Enche-se de sentido à medida que o histórico cresce.'
    + (res.deltaFiavel ? '' : '  ⚠ Δ% de carga ainda em branco: a semana anterior não está toda coberta por registos.'))
   .setFontStyle('italic').setFontColor(res.deltaFiavel ? '#666666' : '#9C0006');
  cabecalho_(f, 4, ['Jogador', 'Adesão 7d', 'Bem-estar 3d', 'Bem-estar 7d', 'Baseline 28d',
                    'Nº resp. 28d', 'Z-score', 'Item mais crítico', 'Resposta à folga',
                    'Carga treino 7d', 'Carga crónica/sem', 'ACWR', 'Monotonia', 'Strain',
                    'Estado bem-estar', 'Estado carga', 'Prioridade', 'Leitura sugerida']);
  var linhas = res.jogadores.map(function (j) {
    return [j.nome, j.adesao, j.m3, j.m7, j.base, j.nResp, j.z, j.critico, j.folgaLeitura,
            j.aguda, j.cronica, j.acwr, j.monotonia, j.strain,
            j.estadoBem, j.estadoCarga, j.prio, j.leitura];
  });
  if (!linhas.length) return;
  f.getRange(5, 1, linhas.length, 18).setValues(linhas);
  f.getRange(5, 2, linhas.length, 1).setNumberFormat('0%');
  f.getRange(5, 3, linhas.length, 3).setNumberFormat('0.00');
  f.getRange(5, 7, linhas.length, 1).setNumberFormat('+0.00;-0.00;0.00');
  f.getRange(5, 9, linhas.length, 1).setFontSize(9);
  f.getRange(5, 10, linhas.length, 2).setNumberFormat('#,##0');
  f.getRange(5, 12, linhas.length, 2).setNumberFormat('0.00');
  f.getRange(5, 14, linhas.length, 1).setNumberFormat('#,##0');
  f.getRange(5, 17, linhas.length, 1).setNumberFormat('0.0');
  f.getRange(5, 9, linhas.length, 1).setBackgrounds(res.jogadores.map(function (j) {
    return [j.folgaDelta === null ? COR.cinza
            : j.folgaDelta >= 0.4 ? COR.verde
            : j.folgaDelta >= 0.1 ? '#EBF1DE'
            : j.folgaDelta > -0.1 ? COR.amarelo : COR.vermelho];
  }));
  f.getRange(5, 15, linhas.length, 1).setBackgrounds(linhas.map(function (l) { return [corEstado_(l[14])]; }));
  f.getRange(5, 16, linhas.length, 1).setBackgrounds(linhas.map(function (l) { return [corEstado_(l[15])]; }));
  f.getRange(5, 18, linhas.length, 1).setFontSize(9).setWrap(true);
  f.setColumnWidth(1, 120); f.setColumnWidth(8, 130);
  f.setColumnWidth(9, 210); f.setColumnWidth(18, 420);
  f.setFrozenColumns(1);
}

function escreverGrelhas_(ss, res) {
  var N = res.nVis, I = res.iniVis;
  var datas = res.diasVis.map(function (d) { return Utilities.formatDate(d, TZ, 'dd/MM'); });

  var f = folha_(ss, '· BemEstar28');
  f.getRange('A1').setValue('Bem-estar — jogador × dia (' + N + ' dias)').setFontSize(14).setFontWeight('bold').setFontColor(COR.navy);
  f.getRange('A2').setValue('Média diária do índice (1-5), valores em bruto tal como reportados. '
   + 'Verde = melhor. Célula vazia = não respondeu.'
   + (res.corrigirPJ ? ' Os cálculos usam estes valores corrigidos do efeito do jogo; aqui vês o original.' : ''))
   .setFontStyle('italic').setFontColor('#666666');
  cabecalho_(f, 4, ['Jogador'].concat(datas));
  var vals = res.jogadores.map(function (j) {
    return [j.nome].concat(j.serieBemRaw.slice(I).map(function (v) { return v === null ? '' : v; }));
  });
  if (vals.length) {
    f.getRange(5, 1, vals.length, N + 1).setValues(vals).setNumberFormat('0.0');
    f.getRange(5, 2, vals.length, N).setBackgrounds(
      res.jogadores.map(function (j) { return j.serieBemRaw.slice(I).map(corBem_); }));
    f.getRange(5, 1, vals.length, 1).setNumberFormat('@').setFontWeight('bold');
  }
  f.setColumnWidth(1, 120); f.setFrozenColumns(1);

  var g = folha_(ss, '· Carga28');
  g.getRange('A1').setValue('Carga (sRPE) — jogador × dia (' + N + ' dias)').setFontSize(14).setFontWeight('bold').setFontColor(COR.navy);
  g.getRange('A2').setValue('Carga diária = duração × RPE. Os dias a cinzento na linha «Registos / dia» foram lidos como folga '
   + '(até ' + LIM.folgaMaxRegistos + ' registos e menos de ' + Math.round(LIM.folgaMaxPct * 100) + '% do plantel). '
   + 'Um zero em dia não-folga significa que o jogador não reportou sessão. '
   + 'A vermelho: dias com registos de «Jogo» mas quase ninguém preencheu — não são folga, são falta de adesão.')
   .setFontStyle('italic').setFontColor('#666666');
  cabecalho_(g, 4, ['Jogador'].concat(datas));
  // linha de contexto: quantos reportaram e se o dia foi lido como folga
  g.getRange(3, 1).setValue('Registos / dia').setFontSize(8).setFontWeight('bold');
  g.getRange(3, 2, 1, N).setValues([res.regPorDia.slice(I)])
   .setFontSize(8).setHorizontalAlignment('center')
   .setBackgrounds([res.folgaDia.slice(I).map(function (f, i) {
     return res.adesaoMa[I + i] ? COR.vermelho : f ? COR.cinza : COR.branco;
   })]);
  g.getRange(3, 2, 1, N).setNotes([res.folgaDia.slice(I).map(function (f, i) {
    if (res.adesaoMa[I + i]) return 'HOUVE JOGO mas só ' + res.regPorDia[I + i]
      + ' registo(s) de PSE. Não é folga — é falta de adesão.';
    return f ? 'Lido como FOLGA (' + res.regPorDia[I + i] + ' registos)'
             : res.regPorDia[I + i] + ' registos de PSE';
  })]);

  var v2 = res.jogadores.map(function (j) { return [j.nome].concat(j.serieCarga.slice(I)); });
  if (v2.length) {
    g.getRange(5, 1, v2.length, N + 1).setValues(v2);
    g.getRange(5, 2, v2.length, N).setNumberFormat('#,##0');
    var regra = SpreadsheetApp.newConditionalFormatRule()
      .setGradientMaxpointWithValue('#C00000', SpreadsheetApp.InterpolationType.NUMBER, '900')
      .setGradientMidpointWithValue('#FFD966', SpreadsheetApp.InterpolationType.NUMBER, '400')
      .setGradientMinpointWithValue('#FFFFFF', SpreadsheetApp.InterpolationType.NUMBER, '0')
      .setRanges([g.getRange(5, 2, v2.length, N)]).build();
    g.setConditionalFormatRules([regra]);
    g.getRange(5, 1, v2.length, 1).setFontWeight('bold');
  }
  g.setColumnWidth(1, 120); g.setFrozenColumns(1);
}

function escreverSemanal_(ss, res) {
  var f = folha_(ss, '· Semanal');
  f.getRange('A1').setValue('Resumo semanal (microciclo)').setFontSize(14).setFontWeight('bold').setFontColor(COR.navy);
  f.getRange('A2').setValue('Monotonia e strain (Foster): carga alta E uniforme é a combinação associada a maior risco.')
   .setFontStyle('italic').setFontColor('#666666');
  cabecalho_(f, 4, ['Semana (2ª feira)', 'Nº respostas', 'Bem-estar médio', 'Carga total equipa',
                    'Carga média/jogador', 'Monotonia', 'Strain', 'Δ% vs semana anterior']);

  var hoje = res.hoje;
  var dow = (hoje.getDay() + 6) % 7;            // 0 = segunda
  var estaSemana = somaDias_(hoje, -dow);
  var nJog = res.jogadores.length || 1;

  var porDiaBem = {}, porDiaCarga = {};
  res.bem.forEach(function (x) { (porDiaBem[x.chave] = porDiaBem[x.chave] || []).push(x.bemEstar); });
  res.pse.forEach(function (x) {
    if (x.sRPE !== null) porDiaCarga[x.chave] = (porDiaCarga[x.chave] || 0) + x.sRPE;
  });

  var linhas = [], antes = null;
  for (var s = 11; s >= 0; s--) {
    var ini = somaDias_(estaSemana, -7 * s);
    var nResp = 0, somaBem = [], diarias = [], houve = false;
    for (var d = 0; d < 7; d++) {
      var k = chave_(somaDias_(ini, d));
      var b = porDiaBem[k] || [];
      if (b.length) { houve = true; nResp += b.length; somaBem = somaBem.concat(b); }
      var c = porDiaCarga[k] || 0;
      if (c > 0) houve = true;
      diarias.push(c);
    }
    if (!houve) { linhas.push([ini, '', '', '', '', '', '', '']); continue; }
    var total = diarias.reduce(function (a, b) { return a + b; }, 0);
    var sd = desvio_(diarias);
    var mono = (sd && sd > 0) ? media_(diarias) / sd : null;
    linhas.push([ini, nResp, media_(somaBem), total, total / nJog, mono,
                 mono !== null ? total * mono : null,
                 (antes !== null && antes > 0) ? total / antes - 1 : null]);
    antes = total;
  }
  f.getRange(5, 1, linhas.length, 8).setValues(linhas);
  f.getRange(5, 1, linhas.length, 1).setNumberFormat('dd/MM/yyyy');
  f.getRange(5, 3, linhas.length, 1).setNumberFormat('0.00');
  f.getRange(5, 4, linhas.length, 2).setNumberFormat('#,##0');
  f.getRange(5, 6, linhas.length, 1).setNumberFormat('0.00');
  f.getRange(5, 7, linhas.length, 1).setNumberFormat('#,##0');
  f.getRange(5, 8, linhas.length, 1).setNumberFormat('+0%;-0%;0%');
  f.setColumnWidth(1, 130);
}

function escreverSerie_(ss, res) {
  var f = folha_(ss, '· Serie');
  cabecalho_(f, 1, ['Data', 'Nº respostas', 'Bem-estar', 'Sono', 'Fadiga', 'Dor', 'Stress', 'Carga equipa',
                    'Registos PSE', 'Folga?']);
  var porDia = {};
  res.bem.forEach(function (x) { (porDia[x.chave] = porDia[x.chave] || []).push(x); });
  var cargaDia = {};
  res.pse.forEach(function (x) {
    if (x.sRPE !== null) cargaDia[x.chave] = (cargaDia[x.chave] || 0) + x.sRPE;
  });

  var linhas = res.diasVis.map(function (d) {
    var k = chave_(d), reg = porDia[k] || [];
    var m = function (campo) {
      var v = media_(reg.map(function (x) { return x[campo]; }));
      return v === null ? '' : v;
    };
    return [d, reg.length, m('bemEstar'), m('sono'), m('fadiga'), m('dor'), m('stress'), cargaDia[k] || 0];
  });
  f.getRange(2, 1, linhas.length, 8).setValues(linhas);
  f.getRange(2, 9, linhas.length, 2).setValues(res.diasVis.map(function (d, i) {
    var k = res.iniVis + i;
    return [res.regPorDia[k], res.adesaoMa[k] ? 'JOGO / adesão fraca' : res.folgaDia[k] ? 'FOLGA' : ''];
  }));
  f.getRange(2, 1, linhas.length, 1).setNumberFormat('dd/MM');
  f.getRange(2, 3, linhas.length, 5).setNumberFormat('0.00');
  f.getRange(2, 8, linhas.length, 1).setNumberFormat('#,##0');
  f.hideSheet();
}

function escreverAlertas_(ss, res) {
  var f = folha_(ss, '· Alertas');
  f.getRange('A1').setValue('Alertas do dia').setFontSize(14).setFontWeight('bold').setFontColor(COR.navy);
  f.getRange('A2').setValue('Ordenado por prioridade. Atualiza-se a cada resposta submetida.')
   .setFontStyle('italic').setFontColor('#666666');
  cabecalho_(f, 4, ['#', 'Jogador', 'Prioridade', 'Bem-estar 3d', 'Z-score', 'Item crítico',
                    'Estado bem-estar', 'Estado carga', 'Leitura sugerida']);
  var top = res.jogadores.slice().sort(function (a, b) { return b.prio - a.prio; }).slice(0, 12);
  var linhas = top.map(function (j, i) {
    return [i + 1, j.nome, j.prio, j.m3, j.z, j.critico, j.estadoBem, j.estadoCarga, j.leitura];
  });
  if (!linhas.length) return;
  f.getRange(5, 1, linhas.length, 9).setValues(linhas);
  f.getRange(5, 3, linhas.length, 1).setNumberFormat('0.0');
  f.getRange(5, 4, linhas.length, 1).setNumberFormat('0.00');
  f.getRange(5, 5, linhas.length, 1).setNumberFormat('+0.00;-0.00;0.00');
  f.getRange(5, 7, linhas.length, 1).setBackgrounds(linhas.map(function (l) { return [corEstado_(l[6])]; }));
  f.getRange(5, 8, linhas.length, 1).setBackgrounds(linhas.map(function (l) { return [corEstado_(l[7])]; }));
  f.getRange(5, 9, linhas.length, 1).setFontSize(9).setWrap(true);
  f.setColumnWidth(2, 130); f.setColumnWidth(6, 130); f.setColumnWidth(9, 460);
}

function escreverPainel_(ss, res) {
  var f = folha_(ss, '· Painel');
  f.getRange('A1').setValue('ESTRELA B · MONITORIZAÇÃO DIÁRIA DO PLANTEL')
   .setFontSize(18).setFontWeight('bold').setFontColor(COR.navy);

  var hojeK = chave_(res.hoje);
  var respHoje = 0, bemHoje = [];
  res.jogadores.forEach(function (j) {
    var v = j.serieBem[JANELA - 1];
    if (v !== null) { respHoje++; bemHoje.push(v); }
  });
  var ultimoIdx = -1;
  for (var i = JANELA - 1; i >= 0; i--) {
    if (res.jogadores.some(function (j) { return j.serieBem[i] !== null; })) { ultimoIdx = i; break; }
  }
  var bemUlt = ultimoIdx >= 0 ? media_(res.jogadores.map(function (j) { return j.serieBem[ultimoIdx]; })) : null;
  var carga7 = res.jogadores.reduce(function (s, j) { return s + j.aguda; }, 0);
  var nRisco = res.jogadores.filter(function (j) { return j.estadoBem === 'RISCO'; }).length;
  var nAten  = res.jogadores.filter(function (j) { return j.estadoBem === 'Atenção'; }).length;
  var nSem   = res.jogadores.filter(function (j) { return j.estadoBem === 'sem resposta'; }).length;

  var kpis = [
    ['ÚLTIMA RECOLHA', Utilities.formatDate(res.hoje, TZ, 'dd/MM/yyyy')],
    ['RESPOSTAS NESSE DIA', respHoje + ' / ' + res.jogadores.length],
    ['BEM-ESTAR DA EQUIPA', bemUlt === null ? '—' : bemUlt.toFixed(2)],
    ['CARGA 7 DIAS (sRPE)', carga7],
    ['EM RISCO', nRisco],
    ['EM ATENÇÃO', nAten],
    ['SEM RESPOSTA', nSem],
    ['ACWR FIÁVEL?', res.acwrFiavel ? 'SIM' : 'AINDA NÃO — faltam ' + (LIM.diasMinACWR - res.diasHist) + ' dias']
  ];
  kpis.forEach(function (k, i) {
    var col = 1 + (i % 4) * 2, lin = 3 + Math.floor(i / 4) * 3;
    f.getRange(lin, col, 1, 2).merge().setValue(k[0])
      .setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
      .setFontSize(9).setHorizontalAlignment('center');
    f.getRange(lin + 1, col, 1, 2).merge().setValue(k[1])
      .setBackground('#FFF7E6').setFontSize(15).setFontWeight('bold')
      .setFontColor(COR.navy).setHorizontalAlignment('center');
  });
  var aviso = res.diasAtraso > 0
    ? '⚠ Sem respostas há ' + res.diasAtraso + ' dia(s). Hoje é ' +
      Utilities.formatDate(res.agora, TZ, 'dd/MM') + ', mas as janelas estão ancoradas na última recolha (' +
      Utilities.formatDate(res.hoje, TZ, 'dd/MM') + ') para os indicadores continuarem a fazer sentido. ' +
      'Ver «· Alertas» para a lista priorizada.'
    : 'Ver «· Alertas» para a lista priorizada de jogadores.';
  f.getRange('A9').setValue(aviso).setFontStyle('italic')
   .setFontColor(res.diasAtraso > 0 ? '#9C0006' : '#666666');

  var serie = ss.getSheetByName('· Serie');
  var n = res.nVis;
  f.insertChart(f.newChart().asLineChart()
    .addRange(serie.getRange(1, 1, n + 1, 1))
    .addRange(serie.getRange(1, 3, n + 1, 5))
    .setNumHeaders(1).setOption('title', 'Bem-estar da equipa — últimos 28 dias')
    .setOption('series', { 0: { lineWidth: 4 } })
    .setOption('vAxis.viewWindow', { min: 1, max: 5 })
    .setOption('interpolateNulls', false)
    .setOption('width', 720).setOption('height', 320)
    .setPosition(11, 1, 0, 0).build());

  f.insertChart(f.newChart().asColumnChart()
    .addRange(serie.getRange(1, 1, n + 1, 1))
    .addRange(serie.getRange(1, 8, n + 1, 1))
    .setNumHeaders(1).setOption('title', 'Carga de treino diária da equipa (sRPE)')
    .setOption('width', 720).setOption('height', 320)
    .setPosition(29, 1, 0, 0).build());

  f.insertChart(f.newChart().asBarChart()
    .addRange(ss.getSheetByName('· Jogadores').getRange(4, 1, res.jogadores.length + 1, 1))
    .addRange(ss.getSheetByName('· Jogadores').getRange(4, 3, res.jogadores.length + 1, 1))
    .setNumHeaders(1).setOption('title', 'Bem-estar por jogador (últimos 3 dias)')
    .setOption('width', 720).setOption('height', 620)
    .setPosition(47, 1, 0, 0).build());

  f.insertChart(f.newChart().asBarChart()
    .addRange(ss.getSheetByName('· Jogadores').getRange(4, 1, res.jogadores.length + 1, 1))
    .addRange(ss.getSheetByName('· Jogadores').getRange(4, 9, res.jogadores.length + 1, 1))
    .setNumHeaders(1).setOption('title', 'Carga acumulada por jogador (7 dias)')
    .setOption('width', 720).setOption('height', 620)
    .setPosition(47, 8, 0, 0).build());

  ss.setActiveSheet(f);
}

// ============================================================ 9. PONTO DE ENTRADA
function atualizar() {
  try {
    atualizar_();
  } catch (e) {
    var msg = 'Falhou a atualização:\n\n' + (e && e.message ? e.message : e) +
              (e && e.stack ? '\n\n' + String(e.stack).split('\n').slice(0, 4).join('\n') : '');
    Logger.log(msg);
    try { SpreadsheetApp.getUi().alert('Monitorização', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e2) {}
    throw e;
  }
}

function atualizar_() {
  var ss = destino_();
  lerConfig_(ss);
  lerAliases_(ss);
  var bem = lerBemEstar_(), pse = lerPSE_();
  var resolve = construirRegisto_(
    bem.map(function (x) { return x.nomeBruto; })
       .concat(pse.map(function (x) { return x.nomeBruto; })));
  bem.forEach(function (x) { x.jogador = resolve(x.nomeBruto); });
  pse.forEach(function (x) { x.jogador = resolve(x.nomeBruto); });
  var nomes = [];
  bem.concat(pse).forEach(function (x) {
    if (x.jogador && nomes.indexOf(x.jogador) === -1) nomes.push(x.jogador);
  });
  nomes.sort();
  var hoje0 = dia_(new Date());
  var ultimoBem = null;
  bem.forEach(function (x) { if (!ultimoBem || x.data > ultimoBem) ultimoBem = x.data; });
  var ancora = (ultimoBem && ultimoBem < hoje0) ? ultimoBem : hoje0;
  var res = calcular_(bem, pse, lerLesoes_(ss, ancora), lerPosicoes_(ss, nomes));
  escrever_(res);
  try { escreverApp_(res); } catch (e) { Logger.log('App: ' + e); }   // resumo para a app (secção 10)
  escreverInventario_(ss);
  var extra = (res.fichas && res.fichas.faltam)
    ? ' · faltam ' + res.fichas.faltam + ' fichas (corre outra vez)' : '';
  ss.toast('Painel atualizado às ' + Utilities.formatDate(new Date(), TZ, 'HH:mm') +
           ' · ' + res.jogadores.length + ' jogadores' + extra, 'Monitorização', 6);
}

// ============================================================ 10. LIGAÇÃO À APP DA EQUIPA TÉCNICA
/*
 * Guarda um resumo dos cálculos (prontidão, bem-estar, carga, alertas) a cada atualização
 * e entrega-o à app quando ela o pede. A app nunca lê as respostas em bruto.
 *
 * Depois de colares este ficheiro (uma vez):
 *  1. Menu ⚽ Monitorização → Atualizar agora (grava o primeiro resumo).
 *  2. Implementar → Nova implementação → tipo "Aplicação Web":
 *        Executar como: Eu     ·     Quem tem acesso: Qualquer pessoa
 *     Implementar, autorizar, e copiar o URL (termina em /exec).
 *  3. Na app: Monitorização → Ligar ao Google Sheets → cola o URL e a chave abaixo.
 *
 * Se mudares o código mais tarde: Implementar → Gerir implementações → editar → Versão: nova.
 * (O URL mantém-se.)
 *
 * Segurança: sem a chave, o endereço devolve só {"erro":"chave"}. Não partilhes o URL com a chave.
 */
var CHAVE_APP = 'BbcqfGe2wAsSXYXG8r8Cnbfa';
var DIAS_APP = 14;          // dias de histórico enviados para os mini-gráficos

function r2_(x) { return (x === null || x === undefined || typeof x !== 'number' || isNaN(x)) ? null : Math.round(x * 100) / 100; }

function escreverApp_(res) {
  var N = DIAS_APP;
  var ult = function (a) { return a.slice(-N).map(r2_); };
  var out = {
    v: 1,
    atualizado: Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"),
    hoje: chave_(res.hoje),
    diasAtraso: res.diasAtraso,
    md: { etiqueta: res.md.etiqueta, falta: res.md.falta, desdeJogo: res.md.desdeJogo, folga: !!res.md.folga },
    limiarCarga: res.limiarCarga, preEpoca: !!res.preEpoca, acwrFiavel: !!res.acwrFiavel,
    diasHist: res.diasHist, p80Carga: r2_(res.p80Carga),
    dias: res.chaves.slice(-N), folga: res.folgaDia.slice(-N),
    jogadores: res.jogadores.map(function (j) {
      return {
        nome: j.nome, posicao: j.posicao, estado: j.estado, estadoNota: j.estadoNota || '',
        prontidao: j.prontidao, prontidaoPorque: j.prontidaoPorque || '', faixa: faixa_(j.prontidao),
        condicao: j.condicao, condicaoPorque: j.condicaoPorque || '',
        confianca: j.confianca, confiancaPorque: j.confiancaPorque || '',
        bem3: r2_(j.m3), bem7: r2_(j.m7), base: r2_(j.base), z: r2_(j.z), nResp: j.nResp,
        adesao: r2_(j.adesao), critico: j.critico || '', dor3: r2_(j.dor3),
        carga7: r2_(j.aguda), cronica: r2_(j.cronica), acwr: r2_(j.acwr), monotonia: r2_(j.monotonia),
        strain: r2_(j.strain), recup7: r2_(j.recup7), trat7: r2_(j.trat7),
        cargaAlta: !!j.cargaAlta, cargaTopo: !!j.cargaTopo,
        estadoBem: j.estadoBem, estadoCarga: j.estadoCarga, prio: r2_(j.prio),
        leitura: j.leitura || '', folga: j.folgaLeitura || '',
        serieBem: ult(j.serieBemRaw), serieCarga: ult(j.serieCarga)
      };
    })
  };
  // As propriedades do script aceitam ~9 KB por valor: o resumo é partido em pedaços.
  var txt = JSON.stringify(out), props = PropertiesService.getScriptProperties();
  var n = Math.ceil(txt.length / 8000), dados = { app_n: String(n) };
  for (var i = 0; i < n; i++) dados['app_' + i] = txt.substring(i * 8000, (i + 1) * 8000);
  var velhas = parseInt(props.getProperty('app_n') || '0', 10);
  props.setProperties(dados, false);
  for (var k = n; k < velhas; k++) props.deleteProperty('app_' + k);
}

function doGet(e) {
  var prm = (e && e.parameter) || {};
  var k = String(prm.k || '');
  var body;
  if (k !== CHAVE_APP) {
    body = JSON.stringify({ erro: 'chave' });
  } else {
    var props = PropertiesService.getScriptProperties();
    var n = parseInt(props.getProperty('app_n') || '0', 10), partes = [];
    for (var i = 0; i < n; i++) partes.push(props.getProperty('app_' + i) || '');
    body = n ? partes.join('') : JSON.stringify({ erro: 'sem dados — corre "Atualizar agora" no menu ⚽ Monitorização' });
  }
  // ?cb=nome: resposta em JavaScript (JSONP), para browsers que bloqueiam a leitura direta
  var cb = String(prm.cb || '');
  if (/^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + body + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
