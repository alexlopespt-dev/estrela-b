# Base de dados multi-clube (Supabase)

Projeto: `app-equipa-tecnica` (região Central EU / Frankfurt) — URL `https://kgplkrtiobiysubcohii.supabase.co`.
A chave pública (publishable) pode ir na app; a **secret/service_role nunca** entra no repositório.

## Como aplicar
Supabase → **SQL Editor** → New query → colar o conteúdo de `migrations/<ficheiro>.sql` → **Run**.
As migrações correm por ordem de nome e só uma vez cada.

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
(37 verificações: clubes separados, convites, funções, clínico fechado, histórico, sem admin, visitante sem sessão).
