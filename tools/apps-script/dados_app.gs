/**
 * ESTRELA B — Dados partilhados da app da equipa técnica  (script à parte da monitorização)
 * + app do atleta (bem-estar, PSE, agenda, convocatória) — ver a secção "APP DO ATLETA" no fim.
 * ------------------------------------------------------------------------------------------
 * Guarda os dados da app (treinos, jogos, plantel, exercícios…) num Google Sheet, para toda a
 * equipa técnica ver o mesmo; fotos novas numa pasta do Drive; e copia as lesões do Clínico da app
 * para o separador "· Lesões" do ficheiro "Estrela B — Painel" (é daí que a monitorização as lê).
 *
 * INSTALAR (uma vez):
 *  1. script.google.com → Novo projeto. Dá-lhe um nome (ex.: "Estrela B — Dados da app").
 *     Apaga o que lá estiver e cola este ficheiro todo. Guarda.
 *  2. (Recomendado) Em ID_DADOS cola o ID do ficheiro "Estrela B — Dados da app" que já existe
 *     (é a parte do endereço entre /d/ e /edit). Assim ficam os dados que já estão partilhados.
 *     Se deixares vazio, é criado um ficheiro novo e a app envia tudo outra vez ao ligar.
 *  3. Escolhe a função prepararDadosApp e carrega em Executar. Aceita as autorizações.
 *  4. Implementar → Nova implementação → tipo "Aplicação Web":
 *        Executar como: Eu     ·     Quem tem acesso: Qualquer pessoa
 *     Implementar e copiar o URL (termina em /exec).
 *  5. Na app, em cada dispositivo: Plantel → Partilha com a equipa técnica → cola este URL novo
 *     e a chave abaixo → Guardar.
 *
 * Se mudares o código mais tarde: Implementar → Gerir implementações → lápis → Versão: Nova versão.
 * Não edites o ficheiro dos dados à mão: a app é que o escreve.
 */
var CHAVE_APP  = 'BbcqfGe2wAsSXYXG8r8Cnbfa';     // a mesma chave que a app usa
var ID_DADOS   = '';                               // ID do ficheiro "Estrela B — Dados da app" (vazio = cria um novo)
var ID_PASTA   = '';                               // ID da pasta das fotos (vazio = cria uma nova)
var ID_DESTINO = '1IxRnhFtwph4iZEuYJSbmIRljq3S9l61_iHUMQQhCiQw';   // "Estrela B — Painel" (monitorização)
var TZ = 'Europe/Lisbon';
var PREFIXO = '· ';

function destino_() { return SpreadsheetApp.openById(ID_DESTINO); }

function doGet(e) {
  var prm = (e && e.parameter) || {}, body;
  if (prm.a === 'atleta') body = JSON.stringify(atResposta_(function () { return atleta_(prm.t); }));   // app do atleta (link pessoal)
  else if (prm.a === 'aviso') body = JSON.stringify(atResposta_(function () { return atAviso_(prm.t); }));   // o telemóvel recebeu um aviso
  else if (String(prm.k || '') !== CHAVE_APP) body = JSON.stringify({ erro: 'chave' });
  else if (prm.a === 'pull' || prm.a === 'lixo') {
    try { body = JSON.stringify(prm.a === 'lixo' ? dadosLixo_() : dadosPull_(Number(prm.since || 0))); }
    catch (err) { body = JSON.stringify({ erro: String(err && err.message || err) }); }
  } else body = JSON.stringify({ erro: 'pedido desconhecido' });
  // ?cb=nome: resposta em JavaScript (JSONP), para browsers que bloqueiam a leitura direta
  var cb = String(prm.cb || '');
  if (/^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + body + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================ DADOS PARTILHADOS
var DADOS_NOME = 'Estrela B — Dados da app';
var DADOS_PASTA = 'Estrela B — Fotos da app';
var DADOS_MAX = 49000;        // limite de caracteres de uma célula do Sheets (50 000)

function prepararDadosApp() {
  var ss = dadosSS_(), pasta = dadosPasta_();
  instalarCopiaDiaria_(); copiaDiaria();          // cópia de segurança todos os dias às 3h (e uma já agora)
  try { instalarAvisos(); } catch (e) { Logger.log('Avisos: ' + e.message); }   // lembretes da app do atleta (de 15 em 15 min)
  var msg = 'Pronto. Dados: ' + ss.getUrl() + '\nFotos: ' + pasta.getUrl() + '\nCópia de segurança diária (3h) na pasta "Estrela B — Cópias da app".' +
            '\n\nAgora: Implementar → Nova implementação (Aplicação Web) e cola o URL na app.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Dados partilhados da app', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
}

/** Mostra no registo de execução os IDs do ficheiro dos dados e da pasta das fotos que este projeto está a usar
 *  (para os copiar para ID_DADOS / ID_PASTA ao mudar o script para outro projeto). */
function mostrarIds() {
  var p = PropertiesService.getScriptProperties();
  Logger.log('ID_DADOS = ' + (ID_DADOS || p.getProperty('dados_id') || '(ainda não criado)'));
  Logger.log('ID_PASTA = ' + (ID_PASTA || p.getProperty('dados_pasta') || '(ainda não criada)'));
}

function dadosSS_() {
  var props = PropertiesService.getScriptProperties(), id = ID_DADOS || props.getProperty('dados_id'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(DADOS_NOME);
    props.setProperty('dados_id', ss.getId());
    var f = ss.getSheets()[0];
    f.setName('docs');
    f.getRange('A:C').setNumberFormat('@');      // texto: ids como "2026" não viram números
    f.getRange(1, 1, 1, 5).setValues([['coleção', 'id', 'dados (JSON)', 'versão', 'apagado']]).setFontWeight('bold');
    f.setFrozenRows(1);
  }
  return ss;
}
function dadosFolha_() {
  var ss = dadosSS_(), f = ss.getSheetByName('docs');
  if (!f) { f = ss.insertSheet('docs'); f.getRange('A:C').setNumberFormat('@'); f.getRange(1, 1, 1, 5).setValues([['coleção', 'id', 'dados (JSON)', 'versão', 'apagado']]); f.setFrozenRows(1); }
  return f;
}
function dadosPasta_() {
  var props = PropertiesService.getScriptProperties(), id = ID_PASTA || props.getProperty('dados_pasta'), pasta = null;
  if (id) { try { pasta = DriveApp.getFolderById(id); } catch (e) { pasta = null; } }
  if (!pasta) { pasta = DriveApp.createFolder(DADOS_PASTA); props.setProperty('dados_pasta', pasta.getId()); }
  return pasta;
}
function dadosVer_() {
  var c = CacheService.getScriptCache().get('dados_ver');
  return Number(c !== null && c !== undefined ? c : (PropertiesService.getScriptProperties().getProperty('dados_t') || 0));
}

/** Registos alterados depois de "since" (versão). A app guarda a última versão que recebeu. */
function dadosPull_(since) {
  if (since && since >= dadosVer_()) return { now: dadosVer_(), docs: [] };   // nada de novo: resposta rápida
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);                          // nunca ler a meio de uma gravação
  try {
    var now = Number(PropertiesService.getScriptProperties().getProperty('dados_t') || 0);
    var f = dadosFolha_(), n = f.getLastRow() - 1, docs = [];
    if (n > 0) {
      // lê primeiro só ids e versões (leve); o JSON só das linhas que mudaram
      var ids = f.getRange(2, 1, n, 2).getValues(), vs = f.getRange(2, 4, n, 2).getValues(), mud = [];
      for (var j = 0; j < n; j++) { var t = Number(vs[j][0]) || 0; if (t > since && ids[j][0]) mud.push(j); }
      var json = mud.length > 15 ? f.getRange(2, 3, n, 1).getValues() : null;
      mud.forEach(function (j) {
        var c = String(ids[j][0]), i = String(ids[j][1]), t = Number(vs[j][0]);
        if (vs[j][1]) { docs.push({ c: c, i: i, t: t, x: 1 }); return; }
        var txt = json ? json[j][0] : f.getRange(j + 2, 3).getValue();
        try { docs.push({ c: c, i: i, t: t, d: JSON.parse(txt) }); } catch (e) {}
      });
    }
    return { now: now, docs: docs };
  } finally { lock.releaseLock(); }
}

/** Grava alterações: ops = [{c, i, d}] (d = null apaga). Todas ficam com a mesma versão nova. */
function dadosPush_(ops) {
  if (!ops || !ops.length) return { ok: true, t: dadosVer_(), erros: [] };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var props = PropertiesService.getScriptProperties();
    var t = Math.max(Date.now(), Number(props.getProperty('dados_t') || 0) + 1);
    var f = dadosFolha_(), n = f.getLastRow() - 1;
    var idx = {};                                     // só as colunas coleção/id (o JSON não é lido ao gravar)
    if (n > 0) f.getRange(2, 1, n, 2).getValues().forEach(function (r, j) { idx[String(r[0]) + '/' + String(r[1])] = j; });
    var mudadas = {}, novas = [], idxNova = {}, erros = [];
    // conteúdo atual de um registo (já com o que este pedido mudou)
    var atual = function (k) {
      if (k in idxNova) { var r = novas[idxNova[k]]; return { json: r[2], apagado: !!r[4] }; }
      if (!(k in idx)) return null;
      var j = idx[k];
      if (j in mudadas) return { json: mudadas[j][2], apagado: !!mudadas[j][4] };
      var v = f.getRange(j + 2, 3, 1, 3).getValues()[0];
      return { json: String(v[0] || ''), apagado: !!v[2] };
    };
    ops.forEach(function (o) {
      var c = String(o && o.c || ''), i = String(o && o.i || '');
      if (!/^[a-z]{2,20}$/.test(c) || !/^[A-Za-z0-9_.:\-]{1,120}$/.test(i)) { erros.push({ c: c, i: i, m: 'id inválido' }); return; }
      var k = c + '/' + i, json, apagado = false;
      if (o.d === null || o.d === undefined) {            // apagar: guarda o último conteúdo para se poder recuperar
        var a0 = atual(k); json = a0 ? a0.json : ''; apagado = true;
      } else if (o.p && o.p.length) {                     // só o que mudou, por cima do que lá está (duas pessoas no mesmo treino)
        var a1 = atual(k);
        if (a1 && !a1.apagado && a1.json) {
          try { json = JSON.stringify(aplicarMudancas_(JSON.parse(a1.json), o.p)); } catch (e) { json = JSON.stringify(o.d); }
        } else json = JSON.stringify(o.d);
      } else json = JSON.stringify(o.d);
      if (!apagado && json.length > DADOS_MAX) { erros.push({ c: c, i: i, m: 'grande' }); return; }
      var row = [c, i, json, t, apagado ? 1 : ''];
      if (k in idx) mudadas[idx[k]] = row;
      else if (k in idxNova) novas[idxNova[k]] = row;
      else { idxNova[k] = novas.length; novas.push(row); }
    });
    Object.keys(mudadas).forEach(function (j) { f.getRange(Number(j) + 2, 1, 1, 5).setValues([mudadas[j]]); });
    if (novas.length) f.getRange(f.getLastRow() + 1, 1, novas.length, 5).setValues(novas);
    SpreadsheetApp.flush();
    props.setProperty('dados_t', String(t));
    CacheService.getScriptCache().put('dados_ver', String(t), 21600);
    var res = { ok: true, t: t, erros: erros };
  } finally { lock.releaseLock(); }
  var mexeu = ops.some(function (o) { return o && (o.c === 'injuries' || o.c === 'players' || o.c === 'meta'); });
  // a cópia das lesões e o recálculo ficam para um acionador (a app não espera por eles)
  if (mexeu) {
    try { PropertiesService.getScriptProperties().setProperty('lesoes_pend', '1'); agendarAtualizacao_(); }
    catch (e) { Logger.log('Lesões da app: ' + e); }
  }
  return res;
}

/** Aplica a lista de mudanças da app: [[caminho, valor]] = pôr, [[caminho]] = tirar, caminho [] = registo inteiro. */
function aplicarMudancas_(obj, p) {
  p.forEach(function (e) {
    var path = e[0] || [];
    if (!path.length) { if (e.length > 1) obj = e[1]; return; }
    if (!obj || typeof obj !== 'object') obj = {};
    var o = obj;
    for (var j = 0; j < path.length - 1; j++) {
      if (!o[path[j]] || typeof o[path[j]] !== 'object' || Array.isArray(o[path[j]])) o[path[j]] = {};
      o = o[path[j]];
    }
    var k = path[path.length - 1];
    if (e.length > 1) o[k] = e[1]; else delete o[k];
  });
  return obj;
}

/** Registos apagados nos últimos 60 dias (para "Recuperar apagados" na app). */
function dadosLixo_() {
  var f = dadosFolha_(), n = f.getLastRow() - 1, out = [], lim = Date.now() - 60 * 864e5;
  if (n <= 0) return { docs: [] };
  f.getRange(2, 1, n, 5).getValues().forEach(function (r) {
    if (!r[4] || !r[2] || Number(r[3]) < lim) return;
    try { out.push({ c: String(r[0]), i: String(r[1]), t: Number(r[3]), d: JSON.parse(r[2]) }); } catch (e) {}
  });
  out.sort(function (a, b) { return b.t - a.t; });
  return { docs: out.slice(0, 200) };
}

/** Cópia de segurança diária do ficheiro dos dados (pasta "Estrela B — Cópias da app"; ficam as últimas 30). */
function copiaDiaria() {
  var ss = dadosSS_(), props = PropertiesService.getScriptProperties(), pasta = null, id = props.getProperty('copias_pasta');
  if (id) { try { pasta = DriveApp.getFolderById(id); } catch (e) { pasta = null; } }
  if (!pasta) { pasta = DriveApp.createFolder('Estrela B — Cópias da app'); props.setProperty('copias_pasta', pasta.getId()); }
  DriveApp.getFileById(ss.getId()).makeCopy('Cópia ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm') + ' — ' + DADOS_NOME, pasta);
  var fs = [], it = pasta.getFiles();
  while (it.hasNext()) fs.push(it.next());
  fs.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  fs.slice(30).forEach(function (x) { x.setTrashed(true); });
}
function instalarCopiaDiaria_() {
  var ja = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'copiaDiaria'; });
  if (!ja) ScriptApp.newTrigger('copiaDiaria').timeBased().atHour(3).everyDays(1).create();
}

/** Foto enviada pela app (base64) -> ficheiro no Drive, visível por quem tiver o link. */
function dadosImg_(p) {
  var tipo = /^image\/(jpeg|png|webp|gif)$/.test(String(p.type || '')) ? String(p.type) : 'image/jpeg';
  var bytes = Utilities.base64Decode(String(p.data || ''));
  if (!bytes.length) return { erro: 'imagem vazia' };
  var nome = 'foto_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd_HHmmss') + '_' + Math.floor(Math.random() * 1e6) + (tipo === 'image/png' ? '.png' : '.jpg');
  var file = dadosPasta_().createFile(Utilities.newBlob(bytes, tipo, nome));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { return { erro: 'O Google não deixou partilhar a foto por link (conta com restrições).' }; }
  return { ok: true, id: file.getId() };
}

function doPost(e) {
  var out;
  try {
    var p = JSON.parse(e && e.postData ? e.postData.contents : '{}');
    if (p.a === 'atleta_bem' || p.a === 'atleta_pse') out = atResposta_(function () { return atResponder_(p); });   // app do atleta
    else if (p.a === 'atleta_push' || p.a === 'atleta_push_teste') out = atResposta_(function () { return atPush_(p); });   // avisos no telemóvel
    else if (String(p.k || '') !== CHAVE_APP) out = { erro: 'chave' };
    else if (p.a === 'push') out = dadosPush_(p.ops || []);
    else if (p.a === 'img') out = dadosImg_(p);
    else out = { erro: 'pedido desconhecido' };
  } catch (err) { out = { erro: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================ LESÕES DA APP -> SEPARADOR "· Lesões" DO PAINEL
/*
 * Cada lesão registada no Clínico da app aparece numa linha do separador "· Lesões" (é daí que a
 * monitorização lê quem está lesionado/condicionado). As linhas da app têm na coluna F o id "app:…"
 * e são atualizadas ou apagadas pela app; as linhas escritas à mão (coluna F vazia) nunca são tocadas.
 * Estados: Em tratamento -> Lesionado · Condicionado -> Condicionado · Alta -> linha fica com a data de fim.
 * O nome é o da folha de monitorização (as mesmas ligações que a app usa: à mão, igual, ou abreviatura).
 * A cópia é feita por um acionador cerca de 30-60 s depois de a app gravar (a app não fica à espera).
 * A monitorização lê o separador na próxima atualização (formulário, 6h da manhã ou "Atualizar agora").
 */
function copiarLesoesDaApp() {
  var r = espelharLesoes_();
  var msg = r.total + ' lesão(ões) da app no separador ' + PREFIXO + 'Lesões (' + r.mudadas + ' alterada(s)).';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Lesões da app', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
}

function dadosTodos_(cols) {
  var f = dadosFolha_(), n = f.getLastRow() - 1, out = {};
  cols.forEach(function (c) { out[c] = {}; });
  if (n <= 0) return out;
  f.getRange(2, 1, n, 5).getValues().forEach(function (r) {
    var c = String(r[0]);
    if (!(c in out) || r[4] || !r[2]) return;
    try { out[c][String(r[1])] = JSON.parse(r[2]); } catch (e) {}
  });
  return out;
}

function chaveApp_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/** nome na folha -> id do atleta na app (a mesma regra da app: à mão, depois igual, depois abreviatura). */
function ligacoesNomes_(nomes, players, manual) {
  var map = {}, usados = {}, ids = Object.keys(players);
  nomes.forEach(function (n) {
    if (manual[n] !== undefined) { if (manual[n] && players[manual[n]]) { map[n] = manual[n]; usados[manual[n]] = 1; } else map[n] = null; }
  });
  nomes.forEach(function (n) {
    if (n in map) return;
    var p = ids.filter(function (id) { return !usados[id] && chaveApp_(players[id].name) === chaveApp_(n); })[0];
    if (p) { map[n] = p; usados[p] = 1; }
  });
  var tok = function (s) { return chaveApp_(s).split(' ').filter(function (x) { return x; }); };
  var cabe = function (app, folha) {
    var a = tok(app), f = tok(folha);
    return a.length && a.every(function (t) { return f.some(function (x) { return x === t || (t.length === 1 && x.indexOf(t) === 0); }); });
  };
  nomes.forEach(function (n) {
    if (n in map) return;
    var c = ids.filter(function (id) { return !usados[id] && cabe(players[id].name, n); });
    if (c.length === 1) { map[n] = c[0]; usados[c[0]] = 1; }
  });
  return map;
}

/** Nomes da monitorização: coluna A do separador "· Plantel" do Painel (criado pela monitorização). */
function nomesMonitorizacao_() {
  var f = destino_().getSheetByName(PREFIXO + 'Plantel');
  if (!f || f.getLastRow() < 5) return [];
  return f.getRange(5, 1, f.getLastRow() - 4, 1).getValues()
    .map(function (l) { return String(l[0] || '').trim(); }).filter(function (n) { return n; });
}
/** Separador "· Lesões" (se ainda não existir, cria-o com o mesmo cabeçalho que a monitorização usa). */
function folhaLesoes_(ss) {
  var nome = PREFIXO + 'Lesões', f = ss.getSheetByName(nome);
  if (f) return f;
  f = ss.insertSheet(nome);
  f.getRange('A1').setValue('Registo de disponibilidade e lesões').setFontSize(14).setFontWeight('bold');
  f.getRange(4, 1, 1, 5).setValues([['Jogador', 'Estado', 'Início', 'Fim (vazio = a decorrer)', 'Notas']]).setFontWeight('bold');
  f.getRange(5, 3, 500, 2).setNumberFormat('yyyy-mm-dd');
  f.setFrozenRows(4);
  return f;
}

function dataApp_(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : '';
}

/** Copia as lesões da app para o separador "· Lesões". Devolve {total, mudadas}. */
function espelharLesoes_() {
  var reg = dadosTodos_(['injuries', 'players', 'meta']);
  var inj = reg.injuries, pl = reg.players, cfg = reg.meta.cfg || {};
  var manual = (cfg.mon && cfg.mon.map) || {};
  var map = ligacoesNomes_(nomesMonitorizacao_(), pl, manual), nomeDe = {};
  Object.keys(map).forEach(function (n) { if (map[n]) nomeDe[map[n]] = n; });
  var f = folhaLesoes_(destino_());
  if (!String(f.getRange(4, 6).getValue() || '')) {
    f.getRange(4, 6).setValue('Da app (não mexer)').setFontColor('#999999').setFontSize(8);
  }
  var ult = f.getLastRow(), linhas = ult >= 5 ? f.getRange(5, 1, ult - 4, 6).getValues() : [], pos = {};
  linhas.forEach(function (l, j) { var t = String(l[5] || ''); if (t.indexOf('app:') === 0) pos[t.slice(4)] = j; });
  var novas = [], total = 0, mudadas = 0;
  Object.keys(inj).forEach(function (id) {
    var x = inj[id];
    if (!x || !x.pid) return;
    total++;
    var p = pl[x.pid] || {};
    var estado = x.status === 'condicionado' ? 'Condicionado' : 'Lesionado';
    var fim = x.status === 'alta' ? dataApp_(x.ret || x.date) : '';
    var zona = [x.type, x.zone, x.side && x.side !== '—' ? x.side : ''].filter(function (v) { return v; }).join(' · ');
    var notas = [x.diag, zona, x.status !== 'alta' && x.exp ? 'regresso previsto ' + x.exp : '']
      .filter(function (v) { return v; }).join(' — ');
    var linha = [nomeDe[x.pid] || p.name || x.pid, estado, dataApp_(x.date), fim, notas, 'app:' + id];
    if (id in pos) {
      var velha = linhas[pos[id]], igual = true;
      for (var k = 0; k < 6; k++) {
        var a = velha[k] instanceof Date ? velha[k].getTime() : String(velha[k]);
        var b = linha[k] instanceof Date ? linha[k].getTime() : String(linha[k]);
        if (a !== b) { igual = false; break; }
      }
      if (!igual) { f.getRange(5 + pos[id], 1, 1, 6).setValues([linha]); mudadas++; }
    } else novas.push(linha);
  });
  // lesões apagadas na app: sai a linha (de baixo para cima, para não baralhar as posições)
  Object.keys(pos).filter(function (id) { return !inj[id]; }).map(function (id) { return pos[id]; })
    .sort(function (a, b) { return b - a; }).forEach(function (j) { f.deleteRow(5 + j); mudadas++; });
  if (novas.length) f.getRange(f.getLastRow() + 1, 1, novas.length, 6).setValues(novas);
  return { total: total, mudadas: mudadas + novas.length };
}

/** Um só agendamento de cada vez (a cache evita perguntar ao Google pelos acionadores em cada gravação). */
function agendarAtualizacao_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('lesoes_agendado')) return;
  var ja = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'atualizarDaApp'; });
  if (!ja) ScriptApp.newTrigger('atualizarDaApp').timeBased().after(30 * 1000).create();
  cache.put('lesoes_agendado', '1', 90);
}
function atualizarDaApp() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'atualizarDaApp') ScriptApp.deleteTrigger(t); });
  CacheService.getScriptCache().remove('lesoes_agendado');
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('lesoes_pend')) return;
  props.deleteProperty('lesoes_pend');
  espelharLesoes_();
}

// ============================================================ APP DO ATLETA
/*
 * A app do atleta (outro site, dist/atleta) fala só com estas funções, com o link pessoal de cada atleta
 * (token "atk" guardado no atleta na app da equipa técnica — Plantel → atleta → App do atleta).
 * Nunca recebe a CHAVE_APP nem dados de outros atletas: só a agenda, a convocatória publicada, os seus números
 * e as suas respostas. As respostas vão para as MESMAS folhas dos formulários de bem-estar e PSE, com os mesmos
 * textos das opções e o nome como a monitorização o conhece — por isso a monitorização continua igual.
 * A monitorização recalcula sozinha: o acionador "verificarRespostasApp" (instalado com "Instalar automatismos"
 * no Painel) vê a marca de hora deixada no separador "· App atletas" do Painel.
 */
var ID_BEMESTAR = '1w5BTGC_4J8565aigffuRKRFSeAOsqKK4WDgNnaAo8II';   // respostas do formulário de bem-estar
var ID_PSE      = '1lnH3j_dXdFSOw-6Ak9CdtRpWWjm1MIvJBEToQowX_3Q';   // respostas do formulário de PSE
var AT_BEM = {   // textos por omissão (se a folha ainda não tiver respostas com esse número)
  sono:   ['1 - Muito Mau', '2 - Mau', '3 - Normal', '4 - Bom', '5 - Excelente'],
  fadiga: ['1 - Exausto', '2 - Cansado', '3 - Normal', '4 - Bem', '5 - Muito Fresco'],
  dor:    ['1 - Muita Dor', '2 - Dor moderada', '3 - Alguma Dor', '4 - Pouca Dor', '5 - Sem Dor'],
  stress: ['1 - Muito Stressado', '2 - Stressado', '3 - Normal', '4 - Tranquilo', '5 - Muito Tranquilo']
};
var AT_TIPOS = ['Treino', 'Jogo', 'Recuperação', 'Tratamento'];

function atKey_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function atHora_(d) { return Utilities.formatDate(d, TZ, 'HH:mm'); }
function atData_(v) {   // carimbo das folhas: data, número de série do Sheets ou texto
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number' && v > 20000 && v < 80000) { var d = Math.floor(v), m = Math.round((v - d) * 1440); return new Date(1899, 11, 30 + d, Math.floor(m / 60), m % 60); }
  var t = String(v || '').trim(), x;
  if ((x = t.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2}))?/))) return new Date(+x[1], +x[2] - 1, +x[3], +(x[4] || 0), +(x[5] || 0));
  if ((x = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ ,]+(\d{1,2}):(\d{2}))?/))) return new Date(+x[3], +x[2] - 1, +x[1], +(x[4] || 0), +(x[5] || 0));
  return null;
}
function atNum_(v) { var m = String(v === null || v === undefined ? '' : v).trim().match(/^(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; }
// procura a coluna pela 1.ª palavra-chave, depois pela 2.ª…, sem repetir colunas já usadas
// ("Nome do Jogador" contém "dor": por isso o nome é procurado primeiro e a dor já não o apanha)
function atAcha_(cab, chaves, usados) {
  usados = usados || [];
  for (var j = 0; j < chaves.length; j++) {
    for (var i = 0; i < cab.length; i++) {
      if (usados.indexOf(i) !== -1) continue;
      if (String(cab[i] || '').toLowerCase().indexOf(chaves[j]) !== -1) { usados.push(i); return i; }
    }
  }
  return -1;
}

/** Separador das respostas (o que tem o carimbo e a coluna obrigatória; se houver vários, o com mais linhas). */
function atFolha_(id, chave) {
  var ss = SpreadsheetApp.openById(id), melhor = null, n = -1;
  ss.getSheets().forEach(function (f) {
    if (f.getLastRow() < 1) return;
    var cab = f.getRange(1, 1, 1, Math.max(1, f.getLastColumn())).getValues()[0];
    if (atAcha_(cab, ['carimbo', 'timestamp']) === -1 || atAcha_(cab, chave) === -1) return;
    if (f.getLastRow() > n) { melhor = f; n = f.getLastRow(); }
  });
  if (!melhor) throw new Error('Não encontrei a folha de respostas (' + chave[0] + ').');
  var cab = melhor.getRange(1, 1, 1, melhor.getLastColumn()).getValues()[0], u = [], c = {};
  c.t = atAcha_(cab, ['carimbo', 'timestamp'], u); c.n = atAcha_(cab, ['nome do jogador', 'nome'], u);
  c.sono = atAcha_(cab, ['qualidade do sono', 'sono'], u); c.fadiga = atAcha_(cab, ['fadiga'], u);
  c.dor = atAcha_(cab, ['dor muscular', 'dores muscul', 'dor'], u); c.stress = atAcha_(cab, ['stress', 'stresse'], u);
  c.tipo = atAcha_(cab, ['tipo de sess', 'tipo'], u); c.dur = atAcha_(cab, ['duração', 'duracao'], u);
  c.rpe = atAcha_(cab, ['intenso', 'intens', 'rpe'], u); c.sen = atAcha_(cab, ['sentes', 'sensa'], u);
  if (c.n < 0) throw new Error('A folha de respostas não tem a coluna do nome.');
  return { f: melhor, cab: cab, c: c };
}
/** Últimas linhas (até 800), com o número da linha. A última linha escrita conta pela coluna do carimbo. */
function atLinhas_(F) {
  var ult = F.f.getLastRow();
  if (ult < 2) return [];
  var ini = Math.max(2, ult - 799), vals = F.f.getRange(ini, 1, ult - ini + 1, F.cab.length).getValues(), out = [];
  vals.forEach(function (r, i) { var d = atData_(r[F.c.t]); if (d) out.push({ row: ini + i, d: d, v: r }); });
  return out;
}
function atUltimaLinha_(F) {
  var ult = F.f.getLastRow();
  if (ult < 2) return 1;
  var col = F.f.getRange(1, F.c.t + 1, ult, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) if (String(col[i][0] === null ? '' : col[i][0]) !== '') return i + 1;
  return 1;
}
/** Textos das opções como estão na folha (um por número), para a app mostrar exatamente o mesmo que o formulário. */
function atOpcoes_(linhas, idx, pre) {
  var por = {};
  linhas.forEach(function (l) {
    var t = String(l.v[idx] === null ? '' : l.v[idx]).trim(), n = atNum_(t);
    if (!t || n === null) return;
    por[n] = por[n] || {}; por[n][t] = (por[n][t] || 0) + 1;
  });
  var out = (pre || []).slice();
  Object.keys(por).forEach(function (n) {
    var melhor = Object.keys(por[n]).sort(function (a, b) { return por[n][b] - por[n][a]; })[0];
    var k = out.findIndex(function (x) { return atNum_(x) === Number(n); });
    if (k >= 0) out[k] = melhor; else out.push(melhor);
  });
  return out.sort(function (a, b) { return atNum_(a) - atNum_(b); });
}
function atDistintos_(linhas, idx, pre) {
  var cont = {};
  linhas.forEach(function (l) { var t = String(l.v[idx] === null ? '' : l.v[idx]).trim(); if (t) cont[t] = (cont[t] || 0) + 1; });
  var out = (pre || []).filter(function (x) { return !Object.keys(cont).some(function (k) { return chaveApp_(k) === chaveApp_(x); }); });
  return Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; }).slice(0, 8).concat(out);
}

/** O atleta do link: {pid, p, reg, nome (como a monitorização o conhece)} ou erro. */
function atAtleta_(tok) {
  tok = String(tok || '');
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(tok)) throw new Error('link');
  var reg = dadosTodos_(['players', 'events', 'meta', 'staff']), pid = null;
  Object.keys(reg.players).forEach(function (id) { var p = reg.players[id]; if (p && p.atk === tok && !p.archived) pid = id; });
  if (!pid) throw new Error('link');
  var p = reg.players[pid], cfg = reg.meta.cfg || {}, nome = p.name;
  try {
    var map = ligacoesNomes_(nomesMonitorizacao_(), reg.players, (cfg.mon && cfg.mon.map) || {});
    Object.keys(map).forEach(function (n) { if (map[n] === pid) nome = n; });
  } catch (e) {}
  return { pid: pid, p: p, reg: reg, nome: nome };
}
// o mesmo atleta? (sem acentos nem maiúsculas; a pontuação separa palavras: "Luís.A." = "Luís A.")
function atChave_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function atMesmo_(a, b) { return !!atChave_(a) && atChave_(a) === atChave_(b); }

/** Minutos, golos… de um atleta num jogo (a mesma conta que a app da equipa técnica, gameCalc). */
function atJogo_(g, pid) {
  var dur = Number(g.dur) > 0 ? Number(g.dur) : 90, call = g.call || [], xi = g.xi || [];
  if (call.indexOf(pid) === -1 && !(g.ev || []).some(function (e) { return e.pid === pid || e.in === pid || e.out === pid; })) return null;
  var st = xi.indexOf(pid) !== -1, x = { st: st, in: st ? 0 : null, out: null, g: 0, a: 0, y: 0, r: 0 };
  var clamp = function (m) { var n = atNum_(m); return n === null ? null : Math.max(0, Math.min(dur, n)); };
  (g.ev || []).slice().sort(function (a, b) { var p = atNum_(a.min), q = atNum_(b.min); return (p === null ? 999 : p) - (q === null ? 999 : q); })
    .forEach(function (e) {
      var m = clamp(e.min);
      if (e.t === 'sub') { if (e.out === pid && x.out === null && m !== null) x.out = m; if (e.in === pid && x.in === null && m !== null) x.in = m; }
      else if (e.pid === pid) {
        if (e.t === 'golo') x.g++; else if (e.t === 'assist') x.a++;
        else if (e.t === 'amarelo') { x.y++; if (x.y >= 2 && x.out === null && m !== null) x.out = m; }
        else if (e.t === 'vermelho') { x.r++; if (x.out === null && m !== null) x.out = m; }
      }
    });
  x.min = x.in === null ? 0 : Math.max(0, (x.out === null ? dur : x.out) - x.in);
  var ov = atNum_((g.minOv || {})[pid]); if (ov !== null) x.min = Math.max(0, Math.min(dur, ov));
  return x;
}

/** Tudo o que a app do atleta mostra. */
function atleta_(tok) {
  var A = atAtleta_(tok), pid = A.pid, ev = A.reg.events, hoje = atKey_(new Date());
  var ate = atKey_(new Date(Date.now() + 15 * 864e5)), tm = A.reg.meta.team || {};
  var agenda = [], numeros = { jogos: 0, titular: 0, min: 0, golos: 0, assist: 0, amarelos: 0, vermelhos: 0, pres: 0, faltas: 0, treinos: 0 }, jogos = [];
  var pres = [], resultados = [], epoca = { j: 0, V: 0, E: 0, D: 0, gf: 0, ga: 0 }, tops = {};   // presenças, resultados da equipa, rankings
  Object.keys(ev).forEach(function (id) {
    var e = ev[id]; if (!e || !e.date) return;
    if (e.date >= hoje && e.date <= ate) {
      agenda.push(e.type === 'jogo'
        ? { id: id, tipo: 'jogo', date: e.date, time: e.time || '', opp: e.opp || '', venue: e.venue || 'C', comp: e.comp || '', place: e.place || '', dur: Number(e.dur) || 90 }
        : { id: id, tipo: 'treino', date: e.date, time: e.time || '', dur: Number(e.dur) || 0, place: e.place || '', theme: e.theme || '' });
    }
    if (e.date > hoje) return;
    if (e.type === 'jogo') {
      // resultado da equipa (jogo com golos sofridos preenchidos); golos marcados = eventos "golo", como na app
      var gaN = atNum_(e.ga), gf = (e.ev || []).filter(function (q) { return q.t === 'golo'; }).length;
      if (gaN !== null) {
        var r = gf > gaN ? 'V' : gf < gaN ? 'D' : 'E'; epoca.j++; epoca[r]++; epoca.gf += gf; epoca.ga += gaN;
        var eu = atJogo_(e, pid);
        resultados.push({ date: e.date, opp: e.opp || '', venue: e.venue || 'C', comp: e.comp || '', gf: gf, ga: gaN, r: r,
          eu: eu && (eu.min > 0 || eu.st) ? { min: eu.min, st: eu.st, g: eu.g, a: eu.a } : null });
      }
      Object.keys(A.reg.players).forEach(function (q) { var y = atJogo_(e, q); if (!y) return; var t = tops[q] || (tops[q] = { min: 0, g: 0, a: 0 }); t.min += y.min; t.g += y.g; t.a += y.a; });
      var x = atJogo_(e, pid); if (!x) return;
      if (x.min > 0 || x.st) numeros.jogos++; if (x.st) numeros.titular++;
      numeros.min += x.min; numeros.golos += x.g; numeros.assist += x.a; numeros.amarelos += x.y; numeros.vermelhos += x.r;
      if (x.min > 0 || x.st) jogos.push({ date: e.date, opp: e.opp || '', venue: e.venue || 'C', min: x.min, st: x.st, g: x.g, a: x.a });
    } else {
      var s = ((e.att || {})[pid] || {}).s;
      if (e.att && Object.keys(e.att).length) pres.push({ date: e.date, s: s || '', theme: e.theme || '' });
      if (s === 'P' || s === 'AT') { numeros.pres++; numeros.treinos++; } else if (s === 'FJ' || s === 'FI') { numeros.faltas++; numeros.treinos++; }
    }
  });
  agenda.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
  // próximos jogos do calendário (sem limite de dias: a agenda só tem 15)
  var proximos = Object.keys(ev).filter(function (id) { var e = ev[id]; return e && e.type === 'jogo' && e.date >= hoje && !e.closed; })
    .map(function (id) { var e = ev[id]; return { id: id, date: e.date, time: e.time || '', opp: e.opp || '', venue: e.venue || 'C', comp: e.comp || '', place: e.place || '', phase: e.phase || '' }; })
    .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).slice(0, 6);
  jogos.sort(function (a, b) { return b.date.localeCompare(a.date); });
  resultados.sort(function (a, b) { return b.date.localeCompare(a.date); });
  pres.sort(function (a, b) { return b.date.localeCompare(a.date); });
  // lugar do atleta no plantel (só entre quem tem mais de 0)
  var rank = {};
  ['min', 'g', 'a'].forEach(function (k) {
    var mine = (tops[pid] || {})[k] || 0; if (!mine) return;
    rank[k] = 1 + Object.keys(tops).filter(function (q) { return q !== pid && !(A.reg.players[q] || {}).archived && tops[q][k] > mine; }).length;
  });
  // convocatória: só a do próximo jogo e só se a equipa técnica a tiver publicado
  var conv = null, prox = agenda.filter(function (a) { return a.tipo === 'jogo'; })[0];
  if (prox && ev[prox.id].convPub) {
    var g = ev[prox.id], pl = A.reg.players, call = g.call || [];
    conv = { id: prox.id, date: g.date, time: g.time || '', opp: g.opp || '', venue: g.venue || 'C', place: g.place || '', comp: g.comp || '',
      meetT: g.meetT || '', meetP: g.meetP || '', cnote: g.cnote || '', convocado: call.indexOf(pid) !== -1,
      sched: (g.sched || []).map(function (s) { return { l: s.l, t: s.t }; }),
      lista: call.map(function (id) { var q = pl[id] || {}; return { n: (g.cnum || {})[id] || q.n || '', name: q.name || '', eu: id === pid }; })
        .sort(function (a, b) { return (Number(a.n) || 99) - (Number(b.n) || 99); }) };
  }
  // respostas de hoje e histórico (da folha, venham da app ou do formulário)
  var B = atFolha_(ID_BEMESTAR, ['sono']), P = atFolha_(ID_PSE, ['intens', 'sessão', 'sessao']);
  var lb = atLinhas_(B), lp = atLinhas_(P), desde = atKey_(new Date(Date.now() - 13 * 864e5));
  var hojeBem = null, hist = {}, hojePse = [];
  lb.forEach(function (l) {
    if (!atMesmo_(l.v[B.c.n], A.nome) && !atMesmo_(l.v[B.c.n], A.p.name)) return;
    var k = atKey_(l.d); if (k < desde) return;
    var i = [B.c.sono, B.c.fadiga, B.c.dor, B.c.stress].map(function (c) { return atNum_(l.v[c]); });
    if (i.some(function (v) { return v === null; })) return;
    hist[k] = i.reduce(function (s, v) { return s + v; }, 0);
    if (k === hoje) hojeBem = { h: atHora_(l.d), i: i };
  });
  lp.forEach(function (l) {
    if (atKey_(l.d) !== hoje || (!atMesmo_(l.v[P.c.n], A.nome) && !atMesmo_(l.v[P.c.n], A.p.name))) return;
    hojePse.push({ h: atHora_(l.d), tipo: String(l.v[P.c.tipo] || ''), rpe: atNum_(l.v[P.c.rpe]), dur: atMin_(l.v[P.c.dur]) });
  });
  return {
    ok: true, hoje: hoje,
    me: { id: pid, name: A.p.name, full: A.p.full || '', n: A.p.n || '', pos: A.p.pos || '',
          foto: /^data:image\//.test(String(A.p.photoData || '')) && String(A.p.photoData).length < 60000 ? A.p.photoData : '' },
    resultados: resultados.slice(0, 8), proximos: proximos, epoca: epoca, rank: rank, presencas: pres.slice(0, 20),
    push: (function () { try { return { key: avChaves_().pub }; } catch (e) { return null; } })(),
    equipa: { nome: tm.full || tm.team || '', curto: tm.team || '' },
    agenda: agenda, conv: conv, numeros: numeros, jogos: jogos.slice(0, 10),
    respostas: { bem: hojeBem, pse: hojePse, hist: Object.keys(hist).sort().map(function (k) { return { d: k, t: hist[k] }; }) },
    opcoes: {
      bem: { sono: atOpcoes_(lb, B.c.sono, AT_BEM.sono), fadiga: atOpcoes_(lb, B.c.fadiga, AT_BEM.fadiga),
             dor: atOpcoes_(lb, B.c.dor, AT_BEM.dor), stress: atOpcoes_(lb, B.c.stress, AT_BEM.stress) },
      pse: { tipos: P.c.tipo >= 0 ? atDistintos_(lp, P.c.tipo, AT_TIPOS) : [], rpe: atOpcoes_(lp, P.c.rpe, []),
             sens: P.c.sen >= 0 ? atDistintos_(lp, P.c.sen, []) : [] }
    }
  };
}
function atMin_(v) {   // duração na folha: hora (01:30), fração de dia ou minutos
  if (v instanceof Date) return v.getHours() * 60 + v.getMinutes();
  if (typeof v === 'number') return v < 1 ? Math.round(v * 1440) : v;
  var m = String(v || '').match(/^(\d{1,2})[:h](\d{2})/); if (m) return Number(m[1]) * 60 + Number(m[2]);
  return atNum_(v);
}

/** Grava uma resposta. Se o atleta já respondeu hoje (pela app ou pelo formulário), corrige essa linha. */
function atResponder_(p) {
  // hora em que o atleta respondeu (respostas guardadas no telemóvel sem rede chegam mais tarde: contam para esse dia, até 36 h)
  var A = atAtleta_(p.t), agora = new Date(), q = p.quando ? new Date(p.quando) : null;
  if (q && !isNaN(q.getTime()) && q <= agora && agora - q < 36 * 3600 * 1000) agora = q;
  var hoje = atKey_(agora);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var bem = p.a === 'atleta_bem', F = bem ? atFolha_(ID_BEMESTAR, ['sono']) : atFolha_(ID_PSE, ['intens', 'sessão', 'sessao']);
    var linhas = atLinhas_(F), vals = {}, resumo;
    if (bem) {
      var op = { sono: atOpcoes_(linhas, F.c.sono, AT_BEM.sono), fadiga: atOpcoes_(linhas, F.c.fadiga, AT_BEM.fadiga),
                 dor: atOpcoes_(linhas, F.c.dor, AT_BEM.dor), stress: atOpcoes_(linhas, F.c.stress, AT_BEM.stress) };
      var i = (p.i || []).map(Number);
      if (i.length !== 4 || i.some(function (v) { return !(v >= 1 && v <= 5); })) throw new Error('Respostas incompletas.');
      ['sono', 'fadiga', 'dor', 'stress'].forEach(function (k, j) {
        vals[F.c[k]] = op[k].filter(function (x) { return atNum_(x) === i[j]; })[0] || String(i[j]);
      });
      resumo = 'bem-estar ' + i.join('/') + ' (' + i.reduce(function (s, v) { return s + v; }, 0) + '/20)';
    } else {
      var rpe = Number(p.rpe), dur = Math.round(Number(p.dur)), tipo = String(p.tipo || 'Treino').slice(0, 40);
      if (!(rpe >= 0 && rpe <= 10) || !(dur > 0 && dur <= 300)) throw new Error('Respostas incompletas.');
      var rop = atOpcoes_(linhas, F.c.rpe, []);
      vals[F.c.rpe] = rop.filter(function (x) { return atNum_(x) === rpe; })[0] || rpe;
      if (F.c.tipo >= 0) vals[F.c.tipo] = tipo;
      if (F.c.dur >= 0) {   // no mesmo formato das respostas anteriores
        var ex = linhas.length ? linhas[linhas.length - 1].v[F.c.dur] : '';
        vals[F.c.dur] = ex instanceof Date || /^\d{1,2}:\d{2}/.test(String(ex))
          ? ('0' + Math.floor(dur / 60)).slice(-2) + ':' + ('0' + dur % 60).slice(-2) + ':00'
          : (typeof ex === 'number' && ex > 0 && ex < 1) ? dur / 1440 : dur;
      }
      if (F.c.sen >= 0 && p.sen) vals[F.c.sen] = String(p.sen).slice(0, 80);
      resumo = tipo + ' · PSE ' + rpe + ' · ' + dur + ' min';
    }
    vals[F.c.n] = A.nome; vals[F.c.t] = agora;
    // já respondeu hoje (pela app ou pelo formulário)? Então só amanhã — como no painel do Sheets, uma resposta por dia
    var ja = linhas.filter(function (l) {
      return atKey_(l.d) === hoje && (atMesmo_(l.v[F.c.n], A.nome) || atMesmo_(l.v[F.c.n], A.p.name));
    }).pop();
    if (ja) return { erro: 'ja', msg: (bem ? 'Já respondeste ao bem-estar hoje' : 'Já registaste o PSE hoje') + ' (às ' + atHora_(ja.d) + '). Voltas a responder amanhã.' };
    var row = atUltimaLinha_(F) + 1;
    Object.keys(vals).forEach(function (c) { F.f.getRange(row, Number(c) + 1).setValue(vals[c]); });
    atMarca_(A.nome, resumo);
    return { ok: true, h: atHora_(agora) };
  } finally { lock.releaseLock(); }
}
/** Separador "· App atletas" no Painel: A2 = hora da última resposta (a monitorização vê e recalcula) + registo. */
function atMarca_(nome, txt) {
  try {
    var ss = destino_(), f = ss.getSheetByName(PREFIXO + 'App atletas');
    if (!f) {
      f = ss.insertSheet(PREFIXO + 'App atletas');
      f.getRange(1, 1, 1, 2).setValues([['Última resposta pela app do atleta (a monitorização recalcula quando isto muda)', '']]);
      f.getRange(4, 1, 1, 3).setValues([['Quando', 'Atleta', 'Resposta']]);
    }
    f.getRange(2, 1).setValue(new Date());
    f.insertRowAfter(4);
    f.getRange(5, 1, 1, 3).setValues([[new Date(), nome, txt]]);
    if (f.getLastRow() > 504) f.deleteRow(f.getLastRow());
  } catch (e) {}
}
function atResposta_(fn) {
  try { return fn(); }
  catch (err) {
    var m = String(err && err.message || err);
    return m === 'link' ? { erro: 'link', msg: 'Este link já não é válido. Pede um novo à equipa técnica.' } : { erro: m };
  }
}

// ============================================================ AVISOS NO TELEMÓVEL (APP DO ATLETA)
/*
 * Notificações "push" da app do atleta, enviadas por este script (sem servidor extra):
 *  - bem-estar: às 8h30, a quem ainda não respondeu, nos dias com treino ou jogo;
 *  - PSE: 20 min depois do fim do treino/jogo do dia (hora + duração), a quem ainda não registou;
 *  - convocatória: quando a equipa técnica a publica, a cada convocado (entre as 8h e as 22h30).
 * O acionador "avisosAtletas" corre de 15 em 15 minutos (instalado por instalarAvisos — corre-a uma vez no editor).
 * O aviso vai vazio (sem texto): o telemóvel pergunta a este script (?a=aviso&t=código) o que mostrar, por isso não é
 * preciso cifrar o conteúdo. A assinatura VAPID (ES256, curva P-256) é feita aqui em JavaScript; as chaves são
 * criadas na primeira vez e ficam nas propriedades do script (av_vapid). No iPhone os avisos só funcionam com a app
 * adicionada ao ecrã principal (iOS 16.4 ou mais recente).
 */
var AV_BEM_HORA = 8 * 60 + 30;  // 08:30
var AV_BEM_ATE = 13 * 60;       // depois das 13h já não lembra
var AV_PSE_DEPOIS = 20;         // minutos depois do fim da sessão
var AV_CONV = [8 * 60, 22 * 60 + 30];
var AV_HOSTS = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)\//;

/** Corre uma vez no editor: instala o acionador dos avisos (e pede a autorização para enviar pedidos externos). */
function instalarAvisos() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'avisosAtletas') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('avisosAtletas').timeBased().everyMinutes(15).create();
  avChaves_();
  Logger.log('Avisos ligados: o script verifica de 15 em 15 minutos quem precisa de lembrete.');
  try { SpreadsheetApp.getUi().alert('Avisos da app do atleta', 'Ligados: de 15 em 15 minutos o script vê quem precisa de lembrete (bem-estar às 9h, PSE depois do treino, convocatória publicada).', SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
}

// ---- bytes, base64 e SHA-256 (o Apps Script usa bytes com sinal, -128..127)
function avU_(b) { return b.map(function (x) { return x & 255; }); }
function avS_(b) { return b.map(function (x) { x = x & 255; return x > 127 ? x - 256 : x; }); }
function avB64_(b) { return Utilities.base64EncodeWebSafe(avS_(b)).replace(/=+$/, ''); }
function avUtf8_(s) { return avU_(Utilities.newBlob(String(s)).getBytes()); }
function avSha_(b) { return avU_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, avS_(b))); }
function avHmac_(v, k) { return avU_(Utilities.computeHmacSha256Signature(avS_(v), avS_(k))); }
function avHex_(b) { return b.map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }

// ---- curva P-256 (BigInt; sem literais "123n" para o ficheiro abrir mesmo num editor antigo)
var AV_EC = null;
function avEc_() {
  if (AV_EC) return AV_EC;
  AV_EC = { p: BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'),
            n: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'),
            G: [BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'), BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5')],
            Z: BigInt(0), U: BigInt(1), D: BigInt(2), T: BigInt(3) };
  return AV_EC;
}
function avMod_(a, m) { var r = a % m; return r < avEc_().Z ? r + m : r; }
function avInv_(a, m) {
  var E = avEc_(), t = E.Z, nt = E.U, r = m, nr = avMod_(a, m);
  while (nr !== E.Z) { var q = r / nr, x = t - q * nt; t = nt; nt = x; x = r - q * nr; r = nr; nr = x; }
  return avMod_(t, m);
}
function avAdd_(P, Q) {
  if (!P) return Q; if (!Q) return P;
  var E = avEc_(), p = E.p, l;
  if (P[0] === Q[0]) {
    if (avMod_(P[1] + Q[1], p) === E.Z) return null;
    l = avMod_(E.T * P[0] * P[0] - E.T, p) * avInv_(E.D * P[1], p) % p;
  } else l = avMod_(Q[1] - P[1], p) * avInv_(Q[0] - P[0], p) % p;
  var x = avMod_(l * l - P[0] - Q[0], p);
  return [x, avMod_(l * (P[0] - x) - P[1], p)];
}
function avMul_(k, P) { var E = avEc_(), R = null, A = P; while (k > E.Z) { if ((k & E.U) === E.U) R = avAdd_(R, A); A = avAdd_(A, A); k = k >> E.U; } return R; }
function avBig_(b) { return BigInt('0x' + (avHex_(b) || '0')); }
function avBytes_(n, len) { var h = n.toString(16); while (h.length < len * 2) h = '0' + h; var o = []; for (var i = 0; i < len; i++) o.push(parseInt(h.substr(i * 2, 2), 16)); return o; }

/** Chaves VAPID deste script (criadas na primeira vez). pub = ponto não comprimido (65 bytes) em base64url. */
function avChaves_() {
  var pr = PropertiesService.getScriptProperties(), v = pr.getProperty('av_vapid');
  if (v) return JSON.parse(v);
  var E = avEc_(), seed = avSha_(avUtf8_(Utilities.getUuid() + Utilities.getUuid() + Date.now() + Math.random()));
  var d = avMod_(avBig_(seed), E.n - E.U) + E.U, Q = avMul_(d, E.G);
  var k = { d: avHex_(avBytes_(d, 32)), pub: avB64_([4].concat(avBytes_(Q[0], 32), avBytes_(Q[1], 32))) };
  pr.setProperty('av_vapid', JSON.stringify(k));
  return k;
}
/** Assinatura ES256 (r||s, 64 bytes) de uma mensagem; k determinístico (HMAC da chave e do resumo). */
function avAssina_(msg, dHex) {
  var E = avEc_(), h = avSha_(msg), e = avBig_(h), dB = [], i;
  for (i = 0; i < 64; i += 2) dB.push(parseInt(dHex.substr(i, 2), 16));
  var d = avBig_(dB);
  for (var c = 0; c < 50; c++) {
    var k = avMod_(avBig_(avHmac_(h.concat([c]), dB)), E.n); if (k === E.Z) continue;
    var r = avMod_(avMul_(k, E.G)[0], E.n); if (r === E.Z) continue;
    var s = avMod_(avInv_(k, E.n) * (e + r * d), E.n); if (s === E.Z) continue;
    return avBytes_(r, 32).concat(avBytes_(s, 32));
  }
  throw new Error('assinatura');
}
function avJwt_(aud) {
  var cache = CacheService.getScriptCache(), ck = 'av_jwt_' + aud, j = cache.get(ck);
  if (j) return j;
  var K = avChaves_(), site = '';
  try { site = String(((dadosTodos_(['meta']).meta || {}).cfg || {}).atletaUrl || ''); } catch (e) {}
  var sub = /^https:\/\/[^\s]+$/.test(site) ? site.replace(/\/+$/, '') : 'https://estrela-b-atleta.netlify.app';
  var enc = function (o) { return avB64_(avUtf8_(JSON.stringify(o))); };
  var ini = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: sub });
  j = ini + '.' + avB64_(avAssina_(avUtf8_(ini), K.d));
  cache.put(ck, j, 6 * 3600);
  return j;
}
/** Envia um aviso vazio para uma subscrição. Devolve o código HTTP (404/410 = já não existe). */
function avEnvia_(endpoint) {
  var aud = String(endpoint).match(/^https:\/\/[^\/]+/)[0];
  var r = UrlFetchApp.fetch(endpoint, { method: 'post', payload: '', muteHttpExceptions: true,
    headers: { TTL: '43200', Urgency: 'high', Authorization: 'vapid t=' + avJwt_(aud) + ', k=' + avChaves_().pub } });
  return r.getResponseCode();
}

// ---- estado por atleta (propriedade av_<id>): subscrições, avisos já dados e mensagens por mostrar
function avLe_(pid) { var v = PropertiesService.getScriptProperties().getProperty('av_' + pid); return v ? JSON.parse(v) : { subs: [], sent: {}, pend: [] }; }
function avGrava_(pid, st) { PropertiesService.getScriptProperties().setProperty('av_' + pid, JSON.stringify(st)); }
/** Junta mensagens e envia um aviso a cada telemóvel do atleta; tira as subscrições que já não existem. */
function avAvisa_(pid, st, msgs) {
  var agora = new Date().toISOString();
  msgs.forEach(function (m) { m.em = agora; st.pend = (st.pend || []).filter(function (x) { return x.id !== m.id; }).concat([m]).slice(-5); st.ult = m; });
  var ok = 0;
  st.subs = (st.subs || []).filter(function (s) {
    var c; try { c = avEnvia_(s.e); } catch (e) { return true; }
    if (c === 404 || c === 410) return false;
    if (c >= 200 && c < 300) ok++;
    return true;
  });
  avGrava_(pid, st);
  return ok;
}

/** Pedidos da app: ligar/desligar avisos neste telemóvel e aviso de teste. */
function atPush_(p) {
  var A = atAtleta_(p.t), sub = p.sub || {}, e = String(sub.endpoint || '');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var st = avLe_(A.pid);
    if (p.a === 'atleta_push_teste') {
      var cache = CacheService.getScriptCache(); if (cache.get('av_teste_' + A.pid)) return { erro: 'Espera um minuto antes de outro teste.' };
      cache.put('av_teste_' + A.pid, '1', 60);
      if (!st.subs.length) return { erro: 'Avisos ainda não ligados neste telemóvel.' };
      var n = avAvisa_(A.pid, st, [{ id: 'teste', t: 'Avisos ligados ✓', b: 'Vais receber aqui os lembretes do bem-estar, do PSE e a convocatória.', tab: 'hoje' }]);
      return { ok: true, enviados: n };
    }
    if (!AV_HOSTS.test(e)) return { erro: 'Endereço de avisos desconhecido.' };
    st.subs = (st.subs || []).filter(function (s) { return s.e !== e; });
    if (p.on !== false) st.subs = st.subs.concat([{ e: e, em: new Date().toISOString() }]).slice(-3);
    avGrava_(A.pid, st);
    return { ok: true, n: st.subs.length };
  } finally { lock.releaseLock(); }
}
/** O telemóvel recebeu um aviso: que mensagens mostrar? (as por mostrar; senão a última, se for recente) */
function atAviso_(tok) {
  var A = atAtleta_(tok), lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var st = avLe_(A.pid), out = st.pend || [];
    if (!out.length && st.ult && Date.now() - new Date(st.ult.em).getTime() < 15 * 60000) out = [st.ult];
    st.pend = []; avGrava_(A.pid, st);
    return { ok: true, pend: out };
  } finally { lock.releaseLock(); }
}

/** Acionador de 15 em 15 minutos: quem precisa de lembrete agora? */
function avisosAtletas() {
  var pr = PropertiesService.getScriptProperties(), all = pr.getProperties(), ids = Object.keys(all).filter(function (k) { return /^av_/.test(k) && k !== 'av_vapid'; });
  if (!ids.length) return 0;
  var agora = new Date(), hoje = atKey_(agora), hm = atHora_(agora).split(':'), min = Number(hm[0]) * 60 + Number(hm[1]);
  var reg = dadosTodos_(['players', 'events', 'meta']), ev = reg.events, pl = reg.players, cfg = reg.meta.cfg || {};
  // nome de cada atleta na monitorização (o mesmo que o atleta escreve / que a app grava)
  var nomeDe = {};
  try { var map = ligacoesNomes_(nomesMonitorizacao_(), pl, (cfg.mon && cfg.mon.map) || {}); Object.keys(map).forEach(function (n) { if (map[n]) nomeDe[map[n]] = n; }); } catch (e) {}
  var resp = function (id, chave) {   // chaves dos nomes que já responderam hoje (null se não deu para ler a folha)
    try { var F = atFolha_(id, chave), s = {}; atLinhas_(F).forEach(function (l) { if (atKey_(l.d) === hoje) s[atChave_(l.v[F.c.n])] = 1; }); return s; } catch (e) { return null; }
  };
  var sess = Object.keys(ev).map(function (id) { var e = ev[id]; return e && e.date === hoje && (e.type === 'treino' || e.type === 'jogo') ? { id: id, e: e } : null; }).filter(Boolean);
  var bem = null, pse = null, enviados = 0;
  var respondeu = function (s, pid) { if (!s) return true; var p = pl[pid] || {}; return !!(s[atChave_(nomeDe[pid] || '')] || s[atChave_(p.name)]); };
  // próximo jogo com convocatória publicada (até 7 dias)
  var ate = atKey_(new Date(agora.getTime() + 7 * 864e5)), jogo = null;
  Object.keys(ev).forEach(function (id) { var e = ev[id]; if (e && e.type === 'jogo' && e.convPub && e.date >= hoje && e.date <= ate && (!jogo || e.date < jogo.e.date)) jogo = { id: id, e: e }; });
  ids.forEach(function (k) {
    var pid = k.slice(3), p = pl[pid]; if (!p || p.archived) return;
    var lock = LockService.getScriptLock(); try { lock.waitLock(20000); } catch (e) { return; }   // lido de novo: pode ter ligado/desligado entretanto
    try {
    var st = avLe_(pid), antes = JSON.stringify(st); st.sent = st.sent || {};
    if (!(st.subs || []).length) return;
    var msgs = [], nome = String(p.name || '').split(/\s+/)[0];
    if (sess.length && min >= AV_BEM_HORA && min < AV_BEM_ATE && st.sent.bem !== hoje) {
      if (bem === null) bem = resp(ID_BEMESTAR, ['sono']) || false;
      if (!respondeu(bem || null, pid)) msgs.push({ id: 'bem-' + hoje, t: 'Bom dia, ' + nome + '!', b: 'Responde ao bem-estar de hoje — são 4 perguntas.', tab: 'hoje' });
      st.sent.bem = hoje;
    }
    sess.forEach(function (s) {
      var t = String(s.e.time || '').split(':'); if (t.length < 2) return;
      var fim = Number(t[0]) * 60 + Number(t[1]) + (Number(s.e.dur) || 90);
      if (min < fim + AV_PSE_DEPOIS || min > fim + 240 || st.sent.pse === s.id) return;
      if (s.e.type === 'treino' && s.e.att && s.e.att[pid] && /^(FJ|FI|L|D)$/.test(s.e.att[pid].s || '')) { st.sent.pse = s.id; return; }   // não treinou
      if (pse === null) pse = resp(ID_PSE, ['intens', 'sessão', 'sessao']) || false;
      if (!respondeu(pse || null, pid)) msgs.push({ id: 'pse-' + s.id, t: s.e.type === 'jogo' ? 'Como correu o jogo?' : 'Como correu o treino?', b: 'Regista o esforço (PSE) de hoje, de 0 a 10.', tab: 'hoje' });
      st.sent.pse = s.id;
    });
    if (jogo && (jogo.e.call || []).indexOf(pid) !== -1 && st.sent.conv !== jogo.id && min >= AV_CONV[0] && min <= AV_CONV[1]) {
      var g = jogo.e, dia = Utilities.formatDate(new Date(g.date + 'T12:00:00'), TZ, 'dd/MM');
      msgs.push({ id: 'conv-' + jogo.id, t: 'Estás convocado!', b: (g.venue === 'F' ? '@ ' : 'vs ') + (g.opp || '') + ' · ' + dia + (g.time ? ' às ' + g.time : '') + (g.meetT ? ' · concentração ' + g.meetT : ''), tab: 'jogo' });
      st.sent.conv = jogo.id;
    }
    if (msgs.length) { avAvisa_(pid, st, msgs); enviados += msgs.length; }
    else if (JSON.stringify(st) !== antes) avGrava_(pid, st);
    } finally { lock.releaseLock(); }
  });
  return enviados;
}
