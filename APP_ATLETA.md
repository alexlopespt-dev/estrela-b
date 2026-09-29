# App do atleta — Estrela B

Site próprio (pasta `dist/atleta/`), pensado para o telemóvel. Cada atleta tem um **link pessoal**; abre-o uma vez e a app fica no telemóvel.

**O que o atleta faz / vê**
- **Hoje:** bem-estar da manhã (sono, fadiga, dores, stress — os mesmos textos do formulário), PSE depois do treino/jogo (sessão, minutos, 0–10, como se sente), o que vem a seguir e o aviso "Estás convocado".
- **Agenda:** treinos e jogos dos próximos 10 dias (folgas incluídas).
- **Jogo:** próximo jogo; a convocatória (convocado ou não, concentração, horário, lista com números) **só depois de a equipa técnica a publicar**.
- **Eu:** jogos, minutos, titular, golos, assistências, presenças, bem-estar dos últimos 14 dias e últimos jogos. Não vê notas, avaliações, clínico nem dados de outros atletas.
- Sem rede: a resposta fica guardada no telemóvel e é enviada quando houver ligação (conta para a hora em que respondeu, até 36 h). Pode corrigir a resposta do dia (substitui a linha, não duplica).

**Como funciona por trás**
- A app fala com o **script da partilha** (`dados_app.gs`, secção "APP DO ATLETA") com o código pessoal do link. Nunca recebe a chave da equipa técnica.
- As respostas são escritas nas **mesmas folhas dos formulários** de bem-estar e PSE, com os mesmos textos das opções e o nome como a monitorização o conhece. A monitorização, o painel, as respostas do dia e o relatório pré-jogo continuam iguais. Os formulários continuam a funcionar (quem responder lá aparece como respondido na app).
- Depois de cada resposta, o script deixa a hora no separador **"· App atletas"** do Painel (com um registo das últimas respostas); a monitorização vê isso de 10 em 10 minutos e recalcula.

## Pôr a funcionar (uma vez)
1. **Script da partilha** (projeto "Estrela B — Dados da app"): cola o `tools/apps-script/dados_app.gs` novo por cima → Guardar → **Implementar → Gerir implementações → lápis → Versão: Nova versão → Implementar**. (O URL mantém-se.) Na primeira resposta o Google pode pedir autorização para abrir os ficheiros dos formulários — aceita.
2. **Script da monitorização** (Painel): cola o `tools/apps-script/monitorizacao_completo.gs` novo → Guardar → menu **⚽ Monitorização → Instalar automatismos** (acrescenta a verificação de 10 em 10 minutos).
3. **Netlify:** novo site → arrasta a **pasta** `dist/atleta` (leva o `_headers` de segurança). Ex.: `estrela-b-atleta.netlify.app`.
4. **App da equipa técnica:** Plantel → **App do atleta** → cola o endereço do site → Guardar → **Criar os links em falta**.
5. Envia a cada atleta **o seu** link, em privado (botão WhatsApp em cada linha). Nunca num grupo: o link é a identidade dele.
6. Jogos → Convocatória → **Publicar na app dos atletas** quando a convocatória estiver fechada.

Telemóvel perdido ou link partilhado: ficha do atleta → App do atleta → **Novo link** (o anterior deixa de funcionar).
