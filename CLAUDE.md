# Estrela B — App da equipa técnica

Contexto para o Claude Code. Lê isto antes de mexer no projeto.

## Quem usa e como falar
- Utilizador: analista da equipa B do Estrela da Amadora (III Distrital, época 2026/27). Português de Portugal, tom informal.
- Exigência principal: **sem erros**. Testar tudo antes de entregar, incluindo os fluxos antigos.
- Semana-tipo: treinos de 3.ª a 6.ª, folga à 2.ª e ao sábado, jogo ao domingo.
- Testes físicos em 3 momentos por época (setembro, janeiro, maio): velocidade, salto horizontal, teste T, vaivém.
- Staff (já na app): Miguel Motta (treinador principal), João Maltez e Tiago Isidoro (adjuntos), Alexandre Lopes (analista principal), Tiago Ferreira (analista adjunto), Bruno Anjos (treinador de GR), Mateus Alves (auxiliar), Diogo Gomes (team manager). Fotos ainda por receber.

## O que é
Uma página HTML única (sem framework, JS "vanilla" dentro de um IIFE) com 10 separadores:
Painel, Agenda, Treinos (sessões, planeamento, modelo de jogo, exercícios, presenças), Jogos (convocatória, onze, eventos, ficha, estatísticas de jogo, modo pós-jogo), Plantel (atletas, staff, configurações, cópias), Testes físicos, Clínico, Scouting, Adversários, Estatísticas (por atleta e grelha da época).

## Estrutura
```
src/        código-fonte (concatenado por build.py na ordem abaixo)
  shell.html   esqueleto HTML (/*CSS*/, /*JS*/ são substituídos)
  style.css    todo o CSS (tokens de cor em :root, tema escuro, ecrãs baixos)
  core.js      constantes, utilitários, camada de dados (D, put, del), cálculos (gameCalc, stats, modelTime)
  views1.js    render principal, painel, agenda, treinos, planeamento, modelo, presenças, distribuição por momentos, staff, adversários
  views2.js    jogos, ficha de jogo, plantel, ficha do atleta, radar
  views3.js    testes físicos, clínico, scouting, estatísticas
  cfg.js       categorias de exercícios e atributos de avaliação configuráveis
  draw.js      editor de desenho de exercícios (SVG 1050x680)
  quick.js     modo pós-jogo, grelha da época, importação da antiga app de ratings
  print.js     documentos para imprimir/PDF (plano, relatório de treino, atleta, jogo, adversário)
  actions.js   modais, formulários e todas as ações (objeto A) e alterações de campos (objeto Cg)
  boot.js      arranque: base de dados online (window.claude.use) ou localStorage
data/
  seed_local.json         dados iniciais completos (versão offline)
  seed_db.json            os mesmos dados, usados para semear a base de dados online
  exercicios_imagens.json imagens dos 129 exercícios importados (chave imgk -> dataURL), embutidas na página
  emblema.b64             emblema do clube (dataURL)
  copias/                 guarda aqui as cópias exportadas da app (Plantel -> Exportar cópia)
tests/      testes Playwright (correr_testes.sh corre todos)
tools/import-exercicios/  scripts usados para importar exercícios de capturas (recorte, OCR, descrições)
dist/       resultado do build (não editar à mão)
```

## Comandos
```
python3 build.py              # gera dist/estrela-tecnico-app.html, dist/index.html e as versões de teste
python3 build.py online       # só a versão para o artifact do Claude (sem dados, usa base de dados online)
python3 build.py offline      # só dist/index.html (com dados e fotos, guarda no browser) — para Netlify
./tests/correr_testes.sh      # build de teste + todos os testes
```
Requisitos dos testes: `pip install playwright && python3 -m playwright install chromium`.
O aviso "403" nos testes vem das Google Fonts bloqueadas sem rede — é esperado.
No Claude Code na web (cloud) o Chromium já vem instalado: usar `pip install "playwright==1.56.0"` (versão que corresponde ao Chromium pré-instalado) e **não** correr `playwright install`. Os testes têm de correr em Python 3.11.

## Duas versões, o mesmo código
- **Online** (artifact em https://claude.ai/artifact/HKyQ4gaFrLYMhEhYe2r5ig): usa `window.claude.use("db")`, `"assets"` e `"downloads"`. Dados partilhados por quem tem acesso na organização. **O Claude Code não consegue publicar este artifact nem escrever na base de dados dele**: para atualizar, leva o ficheiro `dist/estrela-tecnico-app.html` para uma conversa no claude.ai e pede para publicar no mesmo link.
- **Offline** (`dist/index.html`): sem `window.claude`, carrega `SEED` e guarda em `localStorage` (chave `estrela-tecnico-v1`). Cada dispositivo tem os seus dados.
- Os dados reais da versão online **não estão nesta pasta**. Para ter uma cópia: na app, Plantel → Exportar cópia, e guarda o JSON em `data/copias/`.

## Modelo de dados (coleções em COLS, um documento por registo)
meta (team, cfg), players, events (treinos e jogos), evals, tests, injuries, scout, exercises, cycles, statdefs, principles, staff, opponents.
- Treino: `{type:"treino", date, time, dur, place, theme, int, plan:[{ex,name,min,pr}], att:{pid:{s,rpe}}, satt:{staffId:{s}}, pev:{pid:{r,t}}, closed, notes}`
- Jogo: `{type:"jogo", date, time, opp, venue C/F, comp, phase, dur, call:[], xi:[], ev:[{id,t,min,pid|in/out,of}], rt:{pid:nota}, minOv:{pid:min}, st:{pid:{statId:n}}, ga, closed, notes}`
  - Minutos calculados por `gameCalc` a partir de substituições/expulsões; `minOv` é o valor manual do modo pós-jogo.
- Exercício: `{name, cat, obj, desc, cp, dur, players, space, mat, pr:[principleId], imgk?, img?, drw?, auto?}`
  - `imgk` aponta para `EXIMG` (imagem embutida), `img` é foto carregada pelo utilizador, `drw` é desenho do editor, `auto:true` = descrição proposta ainda por confirmar.
- Ciclo: `{kind:"meso"|"micro", name, start, end, period (Preparatório|Competitivo|Transitório), obj, notes}`
- Princípio: `{name, moment (oo|od|tro|trd|fbp), parent, desc}` — 5 momentos, percentagens somam 100% (tempo de um bloco dividido pelos momentos que trabalha).

## Regras e armadilhas (aprendidas à custa de erros)
1. **Nunca guardar imagens dentro dos documentos da base de dados online.** Com imagens nos documentos, a app só recebia parte dos exercícios. Imagens fixas vão para `data/exercicios_imagens.json` (embutidas no build); fotos novas vão para `assets` (online) ou dataURL pequena (offline).
2. Os documentos vindos da base de dados estão congelados: usar sempre `clone(D.col[id])` antes de alterar e gravar com `put(col, id, obj)`.
3. `D.cycles[id]` (e os outros documentos) **não têm o campo id** — as listas criadas por `cycles()`, `players()`, etc. é que o acrescentam. Usar o id da variável, não `doc.id`.
4. `confirm()` e `alert()` estão bloqueados dentro do Claude: usar `askConfirm()`. `window.open` pode ser bloqueado: o PDF descarrega por omissão.
5. Render: `schedule()` adia o redesenho enquanto há um campo em edição; campos gravam no evento `change` (não `input`), exceto pesquisas, que filtram o DOM diretamente.
6. Ações: botões com `data-a="nome"` → `A.nome(el)`; campos com `data-c="nome"` → `Cg.nome(el)`. O campo genérico `data-c="f" data-col data-id data-f` grava qualquer campo.
7. Ao editar ficheiros com scripts, **nunca** fazer `replace` com texto de origem vazio (já corrompeu um ficheiro para 150 MB). Verificar sempre que o texto a substituir existe exatamente uma vez.
8. Depois de qualquer alteração: `./tests/correr_testes.sh`. Se um comportamento mudar de propósito, atualizar o teste correspondente.
9. Ecrãs baixos (portátil com a app numa área pequena): as janelas têm regras compactas em `@media (max-height:620px)`; testar formulários novos também a 420 px de altura (test12).

## Em aberto
- 83 exercícios com descrição proposta por mim (filtro "Descrição por confirmar"); a equipa vai revendo.
- Fotos do staff (Plantel → Equipa técnica → Adicionar foto).
- J1 vs Tenente Valdez: falta o resultado do adversário para fechar o jogo; os pares de substituições foram deduzidos dos minutos.
- Ideias ainda não feitas: estatísticas só com jogos/treinos fechados; lista de locais de jogo; contas com cargos e permissões (precisa de base de dados própria); confirmação da convocatória pelos jogadores.
