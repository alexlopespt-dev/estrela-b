# Estrela B — App da equipa técnica

App de gestão desportiva da equipa B do Estrela da Amadora: treinos, jogos, plantel, testes físicos, clínico, scouting, adversários e estatísticas.

## Começar no Claude Code
1. Abre esta pasta no Claude Code.
2. O Claude lê o `CLAUDE.md` com todo o contexto do projeto.
3. Instala os testes uma vez: `pip install playwright && python3 -m playwright install chromium`
4. Pede o que queres mudar. Depois de cada alteração: `./tests/correr_testes.sh`

## Gerar a app
- `python3 build.py` cria em `dist/`:
  - `estrela-tecnico-app.html` — versão online (para publicar no artifact do Claude, através de uma conversa no claude.ai)
  - `index.html` — versão offline, com dados e fotos (para Netlify ou abrir diretamente no browser)

## Cópias de segurança
Os dados que a equipa lança na versão online ficam na base de dados do Claude, não nesta pasta.
Na app: Plantel → Exportar cópia, e guarda o ficheiro em `data/copias/`.
