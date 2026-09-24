// ============================================================ 10. LIGAÇÃO À APP DA EQUIPA TÉCNICA
/*
 * Acrescento ao script "ESTRELA B — Monitorização diária".
 * Guarda um resumo dos cálculos (prontidão, bem-estar, carga, alertas) a cada atualização
 * e entrega-o à app quando ela o pede. A app nunca lê as respostas em bruto.
 *
 * COMO INSTALAR (uma vez):
 *  1. No Apps Script, cola este bloco no FIM do ficheiro (depois da função atualizar_).
 *  2. Dentro de atualizar_(), logo a seguir à linha   escrever_(res);   acrescenta:
 *         try { escreverApp_(res); } catch (e) { Logger.log('App: ' + e); }
 *  3. Muda a CHAVE_APP abaixo, se quiseres (qualquer texto comprido serve).
 *  4. Menu ⚽ Monitorização → Atualizar agora (para gravar o primeiro resumo).
 *  5. Implementar → Nova implementação → tipo "Aplicação Web":
 *        Executar como: Eu     ·     Quem tem acesso: Qualquer pessoa
 *     Implementar, autorizar, e copiar o URL (termina em /exec).
 *  6. Na app: Monitorização → Ligar ao Google Sheets → cola o URL e a chave.
 *
 * Se mudares este código mais tarde: Implementar → Gerir implementações → editar → Versão: nova.
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
  var k = e && e.parameter ? String(e.parameter.k || '') : '';
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
  var cb = e && e.parameter ? String(e.parameter.cb || '') : '';
  if (/^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + body + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
