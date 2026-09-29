# App do atleta — Estrela B

Site próprio (pasta `dist/atleta/`), pensado para o telemóvel. Cada atleta tem um **link pessoal**; abre-o uma vez e a app fica no telemóvel.

**O que o atleta faz / vê**
- **Hoje:** bem-estar da manhã (sono, fadiga, dores, stress — os mesmos textos do formulário), PSE depois do treino/jogo (sessão, minutos, 0–10, como se sente), o que vem a seguir e o aviso "Estás convocado".
- **Agenda:** treinos e jogos dos próximos 10 dias (folgas incluídas).
- **Jogo:** próximo jogo; a convocatória (convocado ou não, concentração, horário, lista com números) **só depois de a equipa técnica a publicar**.
- **Eu:** jogos, minutos, titular, golos, assistências, presenças, bem-estar dos últimos 14 dias e últimos jogos. Não vê notas, avaliações, clínico nem dados de outros atletas.
- Sem rede: a resposta fica guardada no telemóvel e é enviada quando houver ligação (conta para a hora em que respondeu, até 36 h).
- **Uma resposta por dia**, como no painel do Sheets: depois de responder ao bem-estar (ou ao PSE), pela app ou pelo formulário do Google, só volta a poder amanhã.

**Como funciona por trás**
- A app fala com o **script da partilha** (`dados_app.gs`, secção "APP DO ATLETA") com o código pessoal do link. Nunca recebe a chave da equipa técnica.
- As respostas são escritas nas **mesmas folhas dos formulários** de bem-estar e PSE, com os mesmos textos das opções e o nome como a monitorização o conhece. A monitorização, o painel, as respostas do dia e o relatório pré-jogo continuam iguais. Os formulários continuam a funcionar (quem responder lá aparece como respondido na app).
- Depois de cada resposta, o script deixa a hora no separador **"· App atletas"** do Painel (com um registo das últimas respostas); a monitorização vê isso de 10 em 10 minutos e recalcula.

## Pôr a funcionar (uma vez)
1. **Script da partilha** (projeto "Estrela B — Dados da app"): cola o `tools/apps-script/dados_app.gs` novo por cima → Guardar → **Implementar → Gerir implementações → lápis → Versão: Nova versão → Implementar**. (O URL mantém-se.) Na primeira resposta o Google pode pedir autorização para abrir os ficheiros dos formulários — aceita.
2. **Script da monitorização** (Painel): cola o `tools/apps-script/monitorizacao_completo.gs` novo → Guardar → menu **⚽ Monitorização → Instalar automatismos** (acrescenta a verificação de 10 em 10 minutos).
3. **Netlify:** novo site → arrasta a **pasta** `dist/atleta` — tem de levar o `index.html`, o `sw.js`, o `manifest.webmanifest` e os `icon-*.png` (são precisos para os avisos e para o ícone no ecrã principal) e o `_headers` de segurança. Ex.: `estrela-b-atleta.netlify.app`. Se o Netlify ou o Mac não deixarem carregar o `_headers` (ficheiro sem extensão), basta o `index.html`: as regras principais já vão dentro da página.
4. **App da equipa técnica:** Plantel → **App do atleta** → cola o endereço do site → Guardar → **Criar os links em falta**.
5. Envia a cada atleta **o seu** link, em privado (botão WhatsApp em cada linha). Nunca num grupo: o link é a identidade dele.
6. Jogos → Convocatória → **Publicar na app dos atletas** quando a convocatória estiver fechada. Os convocados que ligaram os avisos recebem "Estás convocado!" (entre as 8h e as 22h30; publicada à noite, o aviso sai às 8h).
7. **Avisos:** no editor do script da partilha, escolhe a função **instalarAvisos** → Executar → aceita as autorizações (agora pede também "ligar a serviços externos", para enviar os avisos). Depois **Implementar → Gerir implementações → Nova versão** outra vez.

## Publicar a pasta inteira sem arrastar (recomendado)
O Netlify às vezes só aceita o `index.html` quando se arrasta (Safari, ou arrastar para o sítio errado). Os avisos precisam também do `sw.js` e do `manifest.webmanifest`. Solução definitiva: ligar o site ao GitHub — a pasta `dist/atleta` já está no repositório e cada atualização passa a ser publicada sozinha.
1. Netlify → abre o site da app do atleta → **Site configuration → Build & deploy → Continuous deployment → Link repository** (ou "Link site to Git").
2. **GitHub** → autoriza → escolhe **alexlopespt-dev/estrela-b**.
3. **Branch to deploy:** `claude/app-dev-continuation-4le60b` · **Base directory:** vazio · **Build command:** vazio · **Publish directory:** `dist/atleta`.
4. **Deploy**. O endereço do site mantém-se.
Alternativa: no **Chrome** (não no Safari), Netlify → site → **Deploys** → arrastar a pasta `atleta` descompactada para a caixa "Drag and drop your site output folder here".
Só com o `index.html` a app funciona toda, menos os avisos (em Eu aparece "falta o ficheiro sw.js").

## Avisos no telemóvel
- **Bem-estar** às 8h30 a quem ainda não respondeu (só em dias com treino ou jogo na app; até às 13h). **PSE** 20 min depois do fim do treino/jogo (hora + duração da sessão na app) a quem ainda não registou (quem teve falta, lesão ou dispensa no treino não recebe). **Convocatória** quando é publicada, só aos convocados.
- Cada atleta liga os avisos na app (cartão "Avisos no telemóvel" no Hoje, ou em Eu). **iPhone:** só funciona com a app no ecrã principal (Safari → Partilhar → "Adicionar ao ecrã principal" → abrir pelo ícone → Ativar avisos), iOS 16.4 ou mais recente. **Android:** funciona no Chrome direto.
- Ao ligar, chega um aviso de teste. Em Eu há "Enviar um aviso de teste" e "Desligar neste telemóvel".
- O link pessoal fica no endereço da página de propósito: o iPhone usa o endereço atual ao adicionar ao ecrã principal, e a app do ecrã principal não vê o que ficou guardado no Safari.

## Quem falta responder (app da equipa técnica)
- Painel → cartão "Precisa de atenção hoje": "Bem-estar hoje 18 de 21 · Faltam 3 · Lembrar" (e o PSE depois do fim da sessão do dia). Também em Monitorização → Respostas do dia → "Lembrar".
- A lista tem um botão WhatsApp por atleta (mensagem com o link pessoal da app; vai direto para o número se estiver na ficha — Plantel → atleta → Editar → Telemóvel) e uma mensagem para o grupo só com os nomes.
- Vem das respostas lidas do Sheets: quem respondeu há pouco pode ainda não aparecer — Atualizar no painel.

Telemóvel perdido ou link partilhado: ficha do atleta → App do atleta → **Novo link** (o anterior deixa de funcionar).
