# Separar a partilha da monitorização — passo a passo

**Porquê:** o projeto de Apps Script do "Estrela B - Painel" tem dois scripts juntos ("Painel MP.gs" e "dados da app.gs"). Os dois têm uma função `doGet` (a que responde à app) e ganha a do "dados da app.gs". Por isso a **partilha funciona** mas a **monitorização deixou de chegar à app desde 25/09**. Cada um tem de ficar no seu projeto, com o seu endereço.

Não perdes nada: o Painel continua a fazer as contas, e a partilha mantém os dados se seguires o passo 1.

Faz tudo no **computador**. Demora uns 10 minutos.

---

## Passo 1 — Descobrir os IDs da partilha (no projeto do Painel)

1. Abre o Google Sheets **"Estrela B - Painel"** → **Extensões → Apps Script** (o projeto com "Painel MP.gs" e "dados da app.gs").
2. Clica em **Código.gs** (o que só tem `myFunction`). Apaga tudo e cola isto:

   ```javascript
   function mostrarIds() {
     var p = PropertiesService.getScriptProperties();
     Logger.log('ID_DADOS = ' + p.getProperty('dados_id'));
     Logger.log('ID_PASTA = ' + p.getProperty('dados_pasta'));
   }
   ```
3. Guarda (ícone da disquete ou Cmd+S).
4. Na lista de funções ao lado de **Depuração** escolhe **mostrarIds** → **Executar**.
5. Em baixo aparece o **Registo de execução** com duas linhas:
   `ID_DADOS = 1AbC...` e `ID_PASTA = 1XyZ...`
   **Copia os dois códigos para um bloco de notas**, porque vais precisar deles no passo 2.

> Se aparecer `null` num deles, os IDs estão escritos no topo do "dados da app.gs" (linhas `var ID_DADOS = '...'` e `var ID_PASTA = '...'`): copia de lá.

---

## Passo 2 — Criar o projeto da partilha (novo)

1. Abre **script.google.com** noutra aba → **Novo projeto**.
2. Clica em "Projeto sem nome" (em cima) e muda o nome para **Estrela B — Dados da app**.
3. No **Código.gs** apaga o `myFunction` e **cola o ficheiro `dados_app.gs` inteiro** (o que te mandei).
4. No topo do código, preenche as duas linhas com os códigos do passo 1 (entre as plicas):
   ```javascript
   var ID_DADOS   = 'cola aqui o ID_DADOS';
   var ID_PASTA   = 'cola aqui o ID_PASTA';
   ```
   ⚠️ **Não deixes vazias**, senão é criado um ficheiro novo vazio e a partilha recomeça do zero.
5. Guarda (Cmd+S).
6. Na lista de funções escolhe **prepararDadosApp** → **Executar**.
   - Vai pedir autorização: **Rever permissões** → escolhe a tua conta → "Avançado" → "Aceder a Estrela B — Dados da app (não seguro)" → **Permitir**.
   - (Opcional) Escolhe **mostrarIds** → Executar e confirma que mostra os mesmos IDs do passo 1.
7. **Implementar → Nova implementação** → na roda dentada ⚙ escolhe **App da Web**:
   - Descrição: `partilha`
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
   - **Implementar**
8. **Copia o URL da App da Web** (acaba em `/exec`) e guarda-o no bloco de notas: é o **URL novo da partilha**.

---

## Passo 3 — Limpar o projeto do Painel

Volta à aba do projeto do Painel.

1. Em **"dados da app.gs"** → ⋮ (três pontos ao lado do nome) → **Eliminar**.
2. Em **"Código.gs"** (o do `mostrarIds`) → ⋮ → **Eliminar**. Fica só o **"Painel MP.gs"**.
3. Ícone do relógio ⏰ (**Acionadores**), à esquerda:
   - Apaga **só** os que dizem **`copiaDiaria`** e **`atualizarDaApp`** (⋮ → Eliminar acionador).
   - **Não mexas nos outros**: são os da monitorização (formulário, de 6 em 6 horas…).
4. **Implementar → Gerir implementações** → escolhe a implementação que lá está → lápis ✏️ → em **Versão** escolhe **Nova versão** → **Implementar**.
   O URL da monitorização **não muda**.

---

## Passo 4 — Na app

**Em cada dispositivo que usa a partilha** (Mac, iPad, telemóveis da equipa técnica):

1. **Plantel → Partilhar com a equipa técnica** → cola o **URL novo da partilha** (passo 2.8). A chave é a mesma de sempre (está no topo do script, em `CHAVE_APP`) → **Guardar**.
   - A app junta o que tem com o que está no Sheets (não se perde nada).

Só uma vez (a ligação da monitorização é comum a todos):

2. **Monitorização → Ligação ao Sheets** → confirma que lá está o URL da **monitorização** (o do projeto do Painel, não o novo) → **Guardar e atualizar**.

---

## Como sabes que ficou bem

- **Monitorização:** aparece "Monitorização atualizada — N jogadores" e em cima "Sheets atualizado" com a **data de hoje**. O erro "pedido desconhecido" desaparece.
- **Partilha:** o indicador da partilha não mostra erro. Muda uma coisa pequena num dispositivo (ex.: uma nota de um treino) e vê se aparece noutro em menos de 1 minuto.
- **Lesões → Painel:** regista ou altera uma lesão no Clínico; em ~1 minuto aparece no separador "· Lesões" do Painel.

## Se alguma coisa correr mal

- **"Autorização necessária" / erro ao executar:** volta a executar `prepararDadosApp` e aceita as permissões.
- **A partilha ficou vazia:** o `ID_DADOS` ficou mal copiado. Corrige a linha no topo, guarda, e em Implementar → Gerir implementações → ✏️ → Nova versão.
- **A monitorização continua com "pedido desconhecido":** ainda há um `doGet` a mais no projeto do Painel (confirma que só lá está o "Painel MP.gs") e que fizeste "Nova versão" no passo 3.4.
- Manda captura ao Claude em qualquer passo.
