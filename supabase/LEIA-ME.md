# Base de dados multi-clube (Supabase)

Projeto: `app-equipa-tecnica` (região Central EU / Frankfurt) — URL `https://kgplkrtiobiysubcohii.supabase.co`.
A chave pública (publishable) pode ir na app; a **secret/service_role nunca** entra no repositório.

## Como aplicar
Supabase → **SQL Editor** → New query → colar o conteúdo de `migrations/<ficheiro>.sql` → **Run**.
As migrações correm por ordem de nome e só uma vez cada:
1. `20260928120000_base.sql` — tabelas, regras de acesso, convites, ficheiros.
2. `20260929120000_membros.sql` — nome e email de cada membro (lista "Conta e acessos" na app), `set_my_name`.

## Configuração da autenticação (uma vez)
- Authentication → **URL Configuration**: *Site URL* = endereço do site da versão para clubes no Netlify
  (ex.: `https://app-equipa-tecnica.netlify.app`); em *Redirect URLs* acrescentar o mesmo endereço com `/**` no fim.
  É para aí que apontam os links dos emails (confirmar conta, recuperar palavra-passe).
- Authentication → Sign In / Providers → Email: "Confirm email" ligado (recomendado).
- Os emails da Supabase gratuita têm limite baixo (poucos por hora) — chega para testes; para clientes, ligar um SMTP próprio.

## A app (versão para clubes)
`python3 build.py clubes` → `dist/clubes/index.html` (site Netlify **à parte** do Estrela). Sem biblioteca: `src/clubes.js`
fala diretamente com a Auth, a REST e o Storage da Supabase. Clube novo começa vazio (só estatísticas de jogo e categorias
de exercícios). Convites: Plantel → "Conta e acessos" → link `…#convite=<token>` enviado por WhatsApp/email.
Testes: `tests/test36.py` com a Supabase simulada (`tests/sb_falso.py`).

## Modelo
- `clubs` → `teams` → `members` (utilizador + função). Funções em `roles`; o que cada função vê/altera por coleção em `role_perms` (`*` = resto; linha específica ganha).
- `docs` (equipa, coleção, id, JSON, versão `v`, `deleted`) — os mesmos documentos da app atual, agora por equipa. Apagar = `deleted=true` (recuperável); apagar de vez só admin.
- `audit` — histórico completo (quem, quando, antes/depois), visível a admin e treinador principal.
- `invites` — convite por email + token (7 dias); `accept_invite(token)` só funciona para o email convidado.
- Funções: `create_club`, `create_team`, `accept_invite`, `patch_doc` (campo a campo, com RLS).
- Ficheiros: bucket privado `equipa`, pasta = id da equipa.
- Coleção `clinical` = diagnóstico/notas clínicas (fechada: admin, principal, fisio). `injuries` = estado da lesão (visível à equipa técnica).

## Testes
`supabase/tests/correr.sh` cria uma base local, aplica um "Supabase simulado" (`stub_supabase.sql`), as migrações e `rls_test.sql`
(43 verificações: clubes separados, convites, funções, clínico fechado, histórico, sem admin, visitante sem sessão).
