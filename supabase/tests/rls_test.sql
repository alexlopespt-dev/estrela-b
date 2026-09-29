-- Testes das regras de acesso (correr localmente, depois do stub e da migração).
-- Cada bloco "age como" um utilizador (role authenticated + id na sessão) e verifica o que pode e não pode fazer.
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@clube-a.pt', '{"name":"Ana Admin"}');     -- admin do clube A
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000b', 'b@clube-b.pt'),     -- admin do clube B
  ('00000000-0000-0000-0000-00000000000c', 'c@clube-a.pt'),     -- adjunto do clube A (convidado)
  ('00000000-0000-0000-0000-00000000000d', 'd@clube-a.pt'),     -- fisio do clube A (convidado)
  ('00000000-0000-0000-0000-00000000000e', 'e@outro.pt');       -- intruso

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated;

create or replace function pg_temp.as_user(u text, email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u, false);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'email', email, 'role', 'authenticated')::text, false);
end $$;
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not ok then raise exception 'FALHOU: %', what; end if; raise notice 'ok — %', what; end $$;
-- tenta executar SQL e devolve true se deu erro (esperado)
create or replace function pg_temp.fails(q text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return true; end $$;

set role authenticated;

-- ===== A cria o clube A, B cria o clube B
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','a@clube-a.pt');
insert into ctx values ('teamA', public.create_club('Clube A','Equipa B','2026/27','III Distrital')::text);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b','b@clube-b.pt');
insert into ctx values ('teamB', public.create_club('Clube B','Sénior')::text);

-- ===== A grava documentos (incluindo clínico)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','a@clube-a.pt');
insert into public.docs (team_id, col, id, data) select v::uuid, 'events',   'tr1', '{"type":"treino","notes":"A secreto","att":{"p1":{"s":"P"}}}' from ctx where k='teamA';
insert into public.docs (team_id, col, id, data) select v::uuid, 'clinical', 'cl1', '{"diag":"rotura"}' from ctx where k='teamA';
insert into public.docs (team_id, col, id, data) select v::uuid, 'injuries', 'in1', '{"status":"ativa"}' from ctx where k='teamA';
insert into public.docs (team_id, col, id, data) select v::uuid, 'meta',     'team', '{"team":"Clube A"}' from ctx where k='teamA';
select pg_temp.check((select count(*) from public.docs) = 4, 'A vê os seus 4 documentos');

-- ===== B não vê nada de A e não consegue escrever em A
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b','b@clube-b.pt');
select pg_temp.check((select count(*) from public.docs) = 0, 'B não vê documentos de A');
select pg_temp.check((select count(*) from public.teams) = 1, 'B só vê a sua equipa');
select pg_temp.check((select count(*) from public.clubs) = 1, 'B só vê o seu clube');
select pg_temp.check(pg_temp.fails(format($q$insert into public.docs (team_id,col,id,data) values (%L,'events','x','{}')$q$, (select v from ctx where k='teamA'))), 'B não consegue gravar na equipa de A');
select pg_temp.check((select count(*) from public.members) = 1, 'B só vê os membros da sua equipa');
update public.docs set data='{"hack":1}' where id='tr1';
select pg_temp.check(pg_temp.fails(format($q$select public.patch_doc(%L,'events','tr1','[{"p":["notes"],"v":"x"}]')$q$, (select v from ctx where k='teamA'))), 'B não consegue alterar campo a campo em A');
select pg_temp.check(pg_temp.fails(format($q$insert into public.invites (team_id,email,role) values (%L,'b@clube-b.pt','admin')$q$, (select v from ctx where k='teamA'))), 'B não consegue criar convites para A');
select pg_temp.check(pg_temp.fails(format($q$select public.create_team((select club_id from public.teams where id=%L),'Intrusos')$q$, (select v from ctx where k='teamA'))), 'B não cria equipas no clube A');

-- ===== A convida C (adjunto) e D (fisio)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','a@clube-a.pt');
select pg_temp.check((select data->>'notes' from public.docs where id='tr1') = 'A secreto', 'o update de B não mudou nada');
insert into public.invites (team_id, email, role) select v::uuid, 'c@clube-a.pt', 'adjunto' from ctx where k='teamA';
insert into public.invites (team_id, email, role) select v::uuid, 'd@clube-a.pt', 'fisio' from ctx where k='teamA';
insert into public.invites (team_id, email, role, expires_at) select v::uuid, 'e@outro.pt', 'admin', now() - interval '1 day' from ctx where k='teamA';
insert into ctx select 'invC', token::text from public.invites where email='c@clube-a.pt';
insert into ctx select 'invD', token::text from public.invites where email='d@clube-a.pt';
insert into ctx select 'invE', token::text from public.invites where email='e@outro.pt';

-- intruso E: não aceita o convite de C (email diferente) nem o seu (expirado)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e','e@outro.pt');
select pg_temp.check(pg_temp.fails(format('select public.accept_invite(%L)', (select v from ctx where k='invC'))), 'intruso não usa convite de outra pessoa');
select pg_temp.check(pg_temp.fails(format('select public.accept_invite(%L)', (select v from ctx where k='invE'))), 'convite expirado recusado');
select pg_temp.check((select count(*) from public.invites) = 0, 'intruso não vê convites');
select pg_temp.check((select count(*) from public.docs) = 0, 'intruso não vê documentos');

-- C aceita e fica adjunto
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c','c@clube-a.pt');
select pg_temp.check(public.accept_invite((select v::uuid from ctx where k='invC')) = (select v::uuid from ctx where k='teamA'), 'C aceita o convite');
select pg_temp.check(pg_temp.fails(format('select public.accept_invite(%L)', (select v from ctx where k='invC'))), 'convite não pode ser usado duas vezes');
select pg_temp.check((select count(*) from public.docs where col='events') = 1, 'adjunto vê treinos');
select pg_temp.check((select count(*) from public.docs where col='injuries') = 1, 'adjunto vê lesões (estado)');
select pg_temp.check((select count(*) from public.docs where col='clinical') = 0, 'adjunto NÃO vê o clínico');
select pg_temp.check(public.patch_doc((select v::uuid from ctx where k='teamA'),'events','tr1','[{"p":["att","p2"],"v":{"s":"P","rpe":6}}]') > 0, 'adjunto marca presença (campo a campo)');
select pg_temp.check(pg_temp.fails(format($q$update public.docs set data='{"team":"X"}' where team_id=%L and col='meta'$q$, (select v from ctx where k='teamA'))) or
                     (select data->>'team' from public.docs where col='meta') = 'Clube A', 'adjunto não altera a configuração');
select pg_temp.check(pg_temp.fails(format($q$insert into public.docs (team_id,col,id,data) values (%L,'clinical','x','{}')$q$, (select v from ctx where k='teamA'))), 'adjunto não grava no clínico');
delete from public.docs where id='tr1';
select pg_temp.check((select count(*) from public.docs where id='tr1') = 1, 'adjunto não apaga de vez');
update public.members set role='admin' where user_id=auth.uid();
select pg_temp.check((select role from public.members where user_id=auth.uid()) = 'adjunto', 'adjunto não se promove a admin');
select pg_temp.check((select count(*) from public.audit) = 0, 'adjunto não vê o histórico');
select pg_temp.check((select count(*) from public.members) = 2, 'adjunto vê os colegas da equipa');

-- D (fisio) vê e grava o clínico, não grava treinos
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d','d@clube-a.pt');
select public.accept_invite((select v::uuid from ctx where k='invD'));
select pg_temp.check((select count(*) from public.docs where col='clinical') = 1, 'fisio vê o clínico');
insert into public.docs (team_id, col, id, data) select v::uuid, 'clinical', 'cl2', '{"diag":"entorse"}' from ctx where k='teamA';
select pg_temp.check(pg_temp.fails(format($q$select public.patch_doc(%L,'events','tr1','[{"p":["notes"],"v":"x"}]')$q$, (select v from ctx where k='teamA'))) or
                     (select data->>'notes' from public.docs where id='tr1') = 'A secreto', 'fisio não altera treinos');

-- A (admin): vê o histórico, o campo a campo manteve o resto do treino, apagado recuperável, não fica sem admin
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a','a@clube-a.pt');
select pg_temp.check((select data #>> '{att,p1,s}' from public.docs where id='tr1') = 'P' and (select data #>> '{att,p2,rpe}' from public.docs where id='tr1') = '6', 'campo a campo não apagou a presença de p1');
select pg_temp.check((select count(*) from public.audit where doc_id='tr1') >= 2, 'histórico guarda as alterações do treino');
select pg_temp.check((select by from public.audit where doc_id='tr1' and action='update' order by id desc limit 1) = '00000000-0000-0000-0000-00000000000c', 'histórico sabe que foi o adjunto');
update public.docs set deleted=true where id='tr1';
select pg_temp.check((select action from public.audit where doc_id='tr1' order by id desc limit 1) = 'delete', 'apagado fica no histórico');
select pg_temp.check((select v from public.docs where id='tr1') > (select max(v) from public.docs where id<>'tr1'), 'versão sobe a cada alteração');
select pg_temp.check(pg_temp.fails($q$delete from public.members where user_id='00000000-0000-0000-0000-00000000000a'$q$), 'equipa não fica sem administrador');
select pg_temp.check(pg_temp.fails($q$update public.docs set id='outro' where id='tr1'$q$), 'id do registo não muda');

-- ===== nomes e emails dos membros (2.º ficheiro)
select pg_temp.check((select display_name from public.members where user_id='00000000-0000-0000-0000-00000000000a') = 'Ana Admin', 'nome da conta guardado ao criar o clube');
select pg_temp.check((select email from public.members where user_id='00000000-0000-0000-0000-00000000000c') = 'c@clube-a.pt', 'email guardado ao aceitar o convite');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c','c@clube-a.pt');
select public.set_my_name('Carlos Adjunto');
select pg_temp.check((select display_name from public.members where user_id=auth.uid()) = 'Carlos Adjunto', 'cada um muda o próprio nome');
select pg_temp.check((select count(*) from public.members where display_name='Carlos Adjunto') = 1, 'só mudou o nome dele');
select pg_temp.check(pg_temp.fails($q$select public.set_my_name('')$q$), 'nome vazio recusado');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b','b@clube-b.pt');
select pg_temp.check((select count(*) from public.members where email like '%clube-a%') = 0, 'B não vê os emails do clube A');

-- ===== visitante sem sessão (anon) não vê nada
reset role; set role anon;
select pg_temp.check(pg_temp.fails('select count(*) from public.docs'), 'visitante sem sessão não lê documentos');
select pg_temp.check(pg_temp.fails($q$select public.create_club('X','Y')$q$), 'visitante sem sessão não cria clubes');
reset role;
\echo TODOS OS TESTES PASSARAM
