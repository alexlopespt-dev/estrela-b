# Apresentação Play7 e trailer

Scripts usados para gerar `App_Equipa_Tecnica_Play7.pptx` e `Trailer_App_Equipa_Tecnica.mp4`
(os ficheiros finais não estão no git: são grandes).

1. `shots.py` — abre `dist/app_local.html`, junta dados de demonstração (`demo.py`: treinos, presenças,
   lesões, avaliações, testes e scouting **fictícios**) e tira as capturas em alta resolução.
2. `prep.py` — recorta as capturas e põe molduras (browser, iPad, iPhone). `icons.js` — ícones (react-icons + sharp).
3. `deck.js` — gera o PowerPoint com pptxgenjs (16:9, 17 diapositivos, notas do orador).
4. `trailer.html` + `render.py` — animação controlada por `seek(t)`, gravada frame a frame (30 fps, 1920x1080) com Playwright
   e codificada em H.264 (ffmpeg do `imageio-ffmpeg`); `audio.py` sintetiza a música (120 bpm, cortes na batida).
Os caminhos apontam para a pasta de trabalho da sessão onde foram gerados — ajustar antes de voltar a correr.
