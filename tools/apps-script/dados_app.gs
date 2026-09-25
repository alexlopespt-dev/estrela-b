/**
 * ESTRELA B — Dados partilhados da app da equipa técnica  (script à parte da monitorização)
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
  if (String(prm.k || '') !== CHAVE_APP) body = JSON.stringify({ erro: 'chave' });
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
  var msg = 'Pronto. Dados: ' + ss.getUrl() + '\nFotos: ' + pasta.getUrl() + '\nCópia de segurança diária (3h) na pasta "Estrela B — Cópias da app".' +
            '\n\nAgora: Implementar → Nova implementação (Aplicação Web) e cola o URL na app.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Dados partilhados da app', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
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
    if (String(p.k || '') !== CHAVE_APP) out = { erro: 'chave' };
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
