# Segurança e operação — versão para clubes

O que já está no código e o que tem de ser ligado nas contas (Netlify, Supabase, GitHub, Sentry, UptimeRobot).
A versão do Estrela (`dist/index.html`) não é afetada por nada disto.

| Requisito | Onde está | Estado |
|---|---|---|
| HTTPS em tudo, domínio próprio | Netlify (certificado automático) + `_headers` (HSTS) | **código feito** · falta comprar o domínio e ligá-lo (passo 1) |
| RLS em todas as tabelas + testes que tentam ler outro clube | `supabase/migrations`, `supabase/tests/rls_test.sql` (56 verificações), `supabase/verificar_rls.sql` | **feito** · corre em cada envio para o GitHub e todos os dias contra a produção |
| Só a chave pública na app | `config/ambientes.json` (só valores públicos) + `tools/seguranca/verificar_chaves.py` | **feito** · a verificação falha se aparecer uma chave secreta |
| Cópias diárias + restauro testado todos os meses | `.github/workflows/copia-diaria.yml`, `restauro-mensal.yml`, `tools/copias/` | **feito** · faltam os Secrets no GitHub (passo 4) |
| Ambiente de testes separado, com dados fictícios | `config/ambientes.json` → `testes`, `python3 build.py clubes-testes` | **feito** · falta criar o 2.º projeto Supabase (passo 3) |
| Registo de erros (Sentry, UE) e alertas se o site cair | `src/clubes.js` (`errReport`), `.github/workflows/vigia.yml` | **feito** · falta a conta Sentry (UE) e o UptimeRobot (passos 5 e 6) |
| Cabeçalhos de segurança (CSP, HSTS) e limite de tentativas de login | `build.py` → `_headers`; `clubes.js` (5 falhas → espera) + Supabase Rate Limits | **feito** · falta rever os limites na Supabase (passo 2) |
| Atualizar dependências todos os meses | `.github/dependabot.yml` + `manutencao-mensal.yml` (issue com a lista) | **feito** · ativa-se quando isto chegar à `main` (passo 7) |

---

## 1. Domínio próprio e HTTPS (Netlify)
1. Compra o domínio (ex.: `appequipatecnica.pt` em ptisp/amen/dominios.pt, ~10–20 €/ano).
2. Netlify → site dos clubes → **Domain management → Add a domain** → segue as instruções (DNS no Netlify é o mais simples).
   O certificado HTTPS é emitido sozinho (Let's Encrypt) e o Netlify redireciona sempre `http://` para `https://`.
3. **Publicar sempre a pasta inteira** `dist/clubes/` (arrastar a pasta, não só o `index.html`): o ficheiro `_headers`
   que lá está liga a CSP, o HSTS e os outros cabeçalhos. Confirma em https://securityheaders.com (deve dar **A**).
4. Atualiza o endereço novo em:
   - Supabase → Authentication → URL Configuration (Site URL + Redirect URLs com `/**`);
   - `config/ambientes.json` → `producao.site` (usado pela vigia);
   - UptimeRobot (passo 6).
5. Só depois de tudo a funcionar em HTTPS durante umas semanas: https://hstspreload.org (opcional).

## 2. Supabase (produção)
- **Authentication → Rate Limits**: deixa os limites por omissão ou baixa "Sign-ins/sign-ups" (ex.: 30 por 5 min por IP).
  A app também trava ao fim de 5 falhas no mesmo dispositivo (1 min, depois 2, 4… até 15).
- **Authentication → Attack Protection**: liga a proteção de palavras-passe comprometidas se o plano deixar; CAPTCHA
  (Turnstile) é opcional — diz-me se quiseres e eu ligo na app.
- **Authentication → Sign In / Providers → Email**: "Confirm email" ligado; palavra-passe mínima 8.
- **Advisors → Security Advisor**: tem de estar sem erros (a auditoria `verificar_rls.sql` verifica o mesmo todos os dias).
- **A tua conta Supabase e a do Netlify/GitHub com autenticação de dois fatores (2FA).**
- Cópias da própria Supabase: no plano gratuito não há; no **Pro (25 $/mês)** há cópias diárias automáticas (7 dias).
  As nossas cópias do GitHub (passo 4) funcionam nos dois planos.

## 3. Ambiente de testes (2.º projeto Supabase)
1. Supabase → **New project** → nome `app-equipa-tecnica-testes`, região **Central EU (Frankfurt)**.
2. SQL Editor → corre os dois ficheiros de `supabase/migrations/` (pela ordem), como na produção.
3. Project Settings → API Keys → copia o **URL** e a chave **publishable** (pública) e manda-mas
   (ou põe-nas em `config/ambientes.json` → `testes`). **Nunca a secret/service_role.**
4. Eu gero `dist/clubes-testes/` → publicas num **terceiro site Netlify** (ex.: `testes-app-equipa-tecnica.netlify.app`).
   Esse site mostra sempre a faixa **AMBIENTE DE TESTES**, o título começa por `[TESTES]` e o administrador tem o
   botão **"Criar dados fictícios"** (Plantel → Conta e acessos): 22 atletas inventados, equipa técnica, treinos e um jogo.
5. Regra: experiências e demonstrações de funcionalidades novas → testes; clubes a sério → produção.
   Os testes automáticos nunca tocam em nenhum dos dois (usam uma Supabase simulada).

## 4. Cópias de segurança (GitHub Actions)
GitHub → repositório → **Settings → Secrets and variables → Actions → New repository secret**:
- `SUPABASE_DB_URL` — Supabase → **Connect** → *Session pooler* (IPv4) → a ligação `postgresql://postgres.<ref>:[PALAVRA-PASSE]@aws-…pooler.supabase.com:5432/postgres`
  com a palavra-passe da base de dados. **Cola-a só no GitHub, não ma envies.**
- `BACKUP_PASSPHRASE` — uma frase longa inventada por ti (ex.: 6 palavras). **Guarda-a num gestor de palavras-passe**:
  sem ela as cópias não se abrem.
- Opcional, para copiar também as fotos: `SUPABASE_URL` (o URL do projeto) e `SUPABASE_SERVICE_KEY` (a secret/service_role).

O que acontece depois:
- **Todos os dias às 02:30 (UTC)**: auditoria das regras de acesso na produção + cópia (dados, estrutura, contas,
  lista de fotos e, se houver chave, as fotos) → cifrada com AES-256 → guardada 35 dias em Actions → *Cópia diária*.
- **Dia 1 de cada mês**: *Restauro mensal* vai buscar a cópia mais recente, decifra-a, repõe-na numa base de dados
  vazia só de teste e confirma as contagens de cada tabela, a impressão digital dos documentos e as regras de acesso.
  Se falhar, o GitHub envia-te um email.
- Para restaurar a sério (desastre): descarregar o artefacto, `gpg -d copia-AAAA-MM-DD.tar.gz.gpg | tar xz`, e aplicar
  `copia/public.sql` num projeto novo depois das migrações (eu faço contigo, com calma).

## 5. Registo de erros — Sentry (UE)
1. https://sentry.io → criar conta → ao criar a organização escolhe **Data Storage Location: European Union** (não dá para mudar depois).
2. Create Project → **Browser JavaScript** → copia o **DSN** (`https://…@o….ingest.de.sentry.io/…` — é público).
3. Manda-me o DSN (ou põe-o em `config/ambientes.json` → `producao.sentry_dsn`; e outro projeto/DSN para `testes`).
4. Sentry → Alerts → "Send a notification for new issues" para o teu email.
- O que é enviado: tipo e mensagem do erro, linhas do código, navegador, id da conta e da equipa, função, separador.
  **Não** vai email, nomes de atletas nem dados de saúde. Máximo 20 erros por sessão, sem repetidos.

## 6. Alertas se o site cair — UptimeRobot (grátis, de 5 em 5 min)
1. https://uptimerobot.com → Add New Monitor → **HTTP(s)** → URL do site dos clubes → alertas por email (e app no telemóvel).
2. Ativa também **SSL expiry** (avisa antes de o certificado caducar).
3. A Supabase é vigiada pelo GitHub (`vigia.yml`, de hora a hora), que também confirma que o site continua a mandar
   os cabeçalhos HSTS e CSP. O Sentry avisa de erros na app.

## 7. Pôr isto a funcionar no GitHub
Os fluxos agendados (cópia, restauro, vigia, manutenção) e o Dependabot **só arrancam a partir da `main`**.
Depois de rever, faz o *merge* do ramo `claude/app-dev-continuation-4le60b` para a `main` (ou pede-me para abrir o PR).
Em Settings → Code security, liga **Dependabot alerts** e **Secret scanning** (se o plano deixar).

## 8. Rotina mensal (vem numa issue automática no dia 2)
Dependabot revisto · restauro mensal verde · cópias diárias verdes · Supabase Advisors sem avisos · Sentry revisto ·
UptimeRobot sem quedas · acessos de cada clube revistos · 2FA nas contas.

## Notas
- A app não usa bibliotecas externas (nem supabase-js nem SDK do Sentry): menos dependências para atualizar e
  menos risco de código de terceiros. As "dependências" são as ações do GitHub e o Playwright dos testes (Dependabot).
- A CSP permite scripts dentro da página (`'unsafe-inline'`) porque a app é um único ficheiro e os documentos para
  imprimir abrem com um script próprio; em compensação liga só aos endereços necessários (Supabase, Sentry, Google
  Sheets da monitorização, Google Fonts) e proíbe ser metida noutro site (`frame-ancestors 'none'`).
- Valores públicos (podem estar no código): URL da Supabase, chave *publishable*, DSN do Sentry, endereço do site.
  Secretos (só nos Secrets do GitHub ou em lado nenhum): secret/service_role, palavra-passe da base de dados,
  `BACKUP_PASSPHRASE`, tokens.
