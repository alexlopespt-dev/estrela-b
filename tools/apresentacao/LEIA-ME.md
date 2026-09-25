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

## Trailer v2 (`trailer_v2/`, 76 s, 60 fps)
- `compose.py` escreve a música em MIDI (90 bpm, ré menor → ré maior; orquestra, coro, taikos) e o FluidSynth
  (`apt-get install fluidsynth fluid-soundfont-gm`) toca-a com o FluidR3_GM; `master.py` junta graves, subidas e whooshes, comprime e limita.
- `record.py` grava a app a ser usada de verdade (Playwright com relógio controlado, 60 fps, "dedo" desenhado na página) → `clips/<nome>/*.jpg`.
  Fontes só para o vídeo: Barlow → Inter, Barlow Condensed → Roboto Condensed (`apt-get install fonts-inter fonts-roboto-unhinted fonts-bebas-neue`).
- `comp.html` + `render.py` — compositor (iPad/iPhone em 3D, fundo bokeh, transições com desfoque, texto em Bebas Neue) gravado frame a frame e codificado com a música.
- v3 (música "estilo Apple"): `piano.py` (MIDI do piano, FluidSynth sem reverb) + `synth.py` (pads, plucks, sinos FM, baixo, bateria discreta,
  reverb de convolução, sidechain, automação por secção, verificação do equilíbrio de frequências) → `musica_apple.wav`. Fecho só com "A app da equipa técnica".
