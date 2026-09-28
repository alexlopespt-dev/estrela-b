-- =====================================================================================================
-- App da equipa técnica — base de dados multi-clube (Supabase / Postgres)
-- Correr UMA vez no SQL Editor do Supabase (New query → colar tudo → Run).
--
-- Ideia: a app continua a guardar "documentos" como hoje (treinos, jogos, atletas… = coleção + id + JSON),
-- mas cada documento pertence a uma EQUIPA e só é visível/alterável por quem é membro dessa equipa,
-- segundo a sua FUNÇÃO (tabela role_perms). O clínico fica fechado a quem não precisa.
-- Todas as regras estão na própria base de dados (Row Level Security): mesmo que alguém mexa na app
-- ou no browser, não consegue ler nem gravar dados de outro clube.
-- =====================================================================================================

create extension if not exists pgcrypto;
create schema if not exists app;          -- funções internas (não expostas pela API)
revoke all on schema app from public;
grant usage on schema app to authenticated;

-- ---------------------------------------------------------------- clubes, equipas, membros
create table public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 2 and 120),
  short       text,
  colors      jsonb not null default '{}'::jsonb,     -- {"primary":"#6b1426","accent":"#f2bd4b"}
  crest_path  text,                                    -- ficheiro no armazenamento "equipa"
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 80),   -- "Equipa B", "Sub-19"…
  season      text,
  comp        text,
  created_at  timestamptz not null default now()
);
create index on public.teams (club_id);

-- funções possíveis numa equipa
create table public.roles (
  role   text primary key,
  label  text not null,
  ord    int  not null
);
insert into public.roles (role, label, ord) values
  ('admin','Administrador do clube',1), ('principal','Treinador principal',2), ('adjunto','Treinador adjunto',3),
  ('analista','Analista',4), ('fisio','Fisioterapeuta / médico',5), ('fisico','Preparador físico',6),
  ('manager','Team manager',7), ('leitura','Só leitura',8);

create table public.members (
  team_id       uuid not null references public.teams(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null references public.roles(role),
  display_name  text,
  created_at    timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index on public.members (user_id);

-- o que cada função pode ver (r) e alterar (w) em cada coleção; '*' = todas as outras.
-- Uma linha específica (ex.: adjunto/clinical) ganha à linha '*'.
create table public.role_perms (
  role       text not null references public.roles(role),
  col        text not null,
  can_read   boolean not null,
  can_write  boolean not null,
  primary key (role, col)
);
insert into public.role_perms (role, col, can_read, can_write) values
  -- administrador e treinador principal: tudo
  ('admin','*',true,true), ('principal','*',true,true),
  -- adjunto: tudo menos o clínico detalhado; configuração só leitura
  ('adjunto','*',true,true), ('adjunto','clinical',false,false), ('adjunto','meta',true,false),
  -- analista: tudo menos clínico; lesões e configuração só leitura
  ('analista','*',true,true), ('analista','clinical',false,false), ('analista','injuries',true,false), ('analista','meta',true,false),
  -- fisio/médico: lê tudo, escreve lesões, clínico e monitorização
  ('fisio','*',true,false), ('fisio','injuries',true,true), ('fisio','clinical',true,true), ('fisio','wellness',true,true),
  -- preparador físico: lê tudo menos clínico; escreve testes, treinos (presenças/PSE) e monitorização
  ('fisico','*',true,false), ('fisico','clinical',false,false), ('fisico','tests',true,true), ('fisico','events',true,true), ('fisico','wellness',true,true),
  -- team manager: lê tudo menos clínico e avaliações; escreve agenda/jogos, plantel e staff
  ('manager','*',true,false), ('manager','clinical',false,false), ('manager','evals',false,false),
  ('manager','events',true,true), ('manager','players',true,true), ('manager','staff',true,true),
  -- só leitura (direção): lê, sem clínico nem avaliações
  ('leitura','*',true,false), ('leitura','clinical',false,false), ('leitura','evals',false,false);

-- convites (o administrador convida por email; a pessoa cria conta e aceita pelo link)
create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         text not null references public.roles(role),
  token        uuid not null unique default gen_random_uuid(),
  invited_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  accepted_by  uuid
);
create index on public.invites (team_id);

-- ---------------------------------------------------------------- documentos da app (uma linha por registo)
create sequence public.docs_v;
create table public.docs (
  team_id     uuid not null references public.teams(id) on delete cascade,
  col         text not null check (col ~ '^[a-z][a-z0-9_]{0,31}$'),   -- players, events, injuries, clinical…
  id          text not null check (length(id) between 1 and 80),
  data        jsonb not null default '{}'::jsonb check (pg_column_size(data) < 1000000),
  v           bigint not null default nextval('public.docs_v'),        -- versão (para receber só o que mudou)
  deleted     boolean not null default false,                          -- apagado (fica recuperável)
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid(),
  primary key (team_id, col, id)
);
create index docs_team_v on public.docs (team_id, v);

-- histórico completo: quem mudou o quê e quando (incluindo apagados)
create table public.audit (
  id        bigserial primary key,
  team_id   uuid not null,
  col       text not null,
  doc_id    text not null,
  action    text not null,          -- insert | update | delete | undelete | purge
  before    jsonb,
  after     jsonb,
  by        uuid,
  at        timestamptz not null default now()
);
create index on public.audit (team_id, at desc);
create index on public.audit (team_id, col, doc_id, at desc);

-- ---------------------------------------------------------------- funções de permissões
create or replace function app.role_in(t uuid) returns text
  language sql stable security definer set search_path = public as
$$ select role from public.members where team_id = t and user_id = auth.uid() $$;

create or replace function app.is_member(t uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.members where team_id = t and user_id = auth.uid()) $$;

create or replace function app.is_admin(t uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.members where team_id = t and user_id = auth.uid() and role = 'admin') $$;

create or replace function app.is_club_admin(c uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.members m join public.teams t on t.id = m.team_id
                  where t.club_id = c and m.user_id = auth.uid() and m.role = 'admin') $$;

create or replace function app.is_club_member(c uuid) returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.members m join public.teams t on t.id = m.team_id
                  where t.club_id = c and m.user_id = auth.uid()) $$;

-- pode ler (w=false) / escrever (w=true) a coleção c na equipa t?
create or replace function app.perm(t uuid, c text, w boolean) returns boolean
  language sql stable security definer set search_path = public as
$$ select coalesce((
     select case when w then p.can_write else p.can_read end
       from public.members m
       join public.role_perms p on p.role = m.role and p.col in (c, '*')
      where m.team_id = t and m.user_id = auth.uid()
      order by (p.col = '*')           -- a linha específica ganha à '*'
      limit 1), false) $$;

grant execute on all functions in schema app to authenticated;

-- ---------------------------------------------------------------- gatilhos dos documentos
create or replace function app.docs_before() returns trigger
  language plpgsql set search_path = public as
$$ begin
  if tg_op = 'UPDATE' and (new.team_id, new.col, new.id) is distinct from (old.team_id, old.col, old.id) then
    raise exception 'Não é possível mudar a equipa, a coleção ou o id de um registo';
  end if;
  new.v := nextval('public.docs_v');
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger docs_before before insert or update on public.docs for each row execute function app.docs_before();

create or replace function app.docs_audit() returns trigger
  language plpgsql security definer set search_path = public as
$$ begin
  if tg_op = 'INSERT' then
    insert into public.audit (team_id, col, doc_id, action, after, by) values (new.team_id, new.col, new.id, 'insert', new.data, auth.uid());
  elsif tg_op = 'UPDATE' then
    insert into public.audit (team_id, col, doc_id, action, before, after, by)
    values (new.team_id, new.col, new.id,
            case when new.deleted and not old.deleted then 'delete' when old.deleted and not new.deleted then 'undelete' else 'update' end,
            old.data, new.data, auth.uid());
  else
    insert into public.audit (team_id, col, doc_id, action, before, by) values (old.team_id, old.col, old.id, 'purge', old.data, auth.uid());
  end if;
  return null;
end $$;
create trigger docs_audit after insert or update or delete on public.docs for each row execute function app.docs_audit();

-- não deixar uma equipa sem administrador
create or replace function app.members_keep_admin() returns trigger
  language plpgsql security definer set search_path = public as
$$ declare t uuid := coalesce(old.team_id, new.team_id);
begin
  if (tg_op = 'DELETE' or new.role <> 'admin') and old.role = 'admin'
     and exists (select 1 from public.teams where id = t)   -- (se a equipa está a ser apagada, deixa)
     and not exists (select 1 from public.members where team_id = t and role = 'admin' and user_id <> old.user_id) then
    raise exception 'A equipa ficaria sem administrador';
  end if;
  return coalesce(new, old);
end $$;
create trigger members_keep_admin before update or delete on public.members for each row execute function app.members_keep_admin();

-- ---------------------------------------------------------------- ações (chamadas pela app)
-- criar um clube + a primeira equipa; quem cria fica administrador
create or replace function public.create_club(p_name text, p_team text, p_season text default null, p_comp text default null)
  returns uuid language plpgsql security definer set search_path = public as
$$ declare c uuid; t uuid;
begin
  if auth.uid() is null then raise exception 'É preciso ter sessão iniciada'; end if;
  insert into public.clubs (name, created_by) values (trim(p_name), auth.uid()) returning id into c;
  insert into public.teams (club_id, name, season, comp) values (c, trim(p_team), p_season, p_comp) returning id into t;
  insert into public.members (team_id, user_id, role) values (t, auth.uid(), 'admin');
  return t;
end $$;

-- nova equipa num clube (só administradores do clube); quem cria fica administrador dela
create or replace function public.create_team(p_club uuid, p_name text, p_season text default null, p_comp text default null)
  returns uuid language plpgsql security definer set search_path = public as
$$ declare t uuid;
begin
  if not app.is_club_admin(p_club) then raise exception 'Só um administrador do clube pode criar equipas'; end if;
  insert into public.teams (club_id, name, season, comp) values (p_club, trim(p_name), p_season, p_comp) returning id into t;
  insert into public.members (team_id, user_id, role) values (t, auth.uid(), 'admin');
  return t;
end $$;

-- aceitar um convite: tem de ser a pessoa com o email convidado, dentro do prazo
create or replace function public.accept_invite(p_token uuid)
  returns uuid language plpgsql security definer set search_path = public as
$$ declare i public.invites; em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'É preciso ter sessão iniciada'; end if;
  select * into i from public.invites where token = p_token for update;
  if not found then raise exception 'Convite inválido'; end if;
  if i.accepted_at is not null then raise exception 'Este convite já foi usado'; end if;
  if i.expires_at < now() then raise exception 'O convite expirou — pede um novo'; end if;
  if lower(i.email) <> em then raise exception 'Este convite é para outro email'; end if;
  insert into public.members (team_id, user_id, role) values (i.team_id, auth.uid(), i.role)
    on conflict (team_id, user_id) do update set role = excluded.role;
  update public.invites set accepted_at = now(), accepted_by = auth.uid() where id = i.id;
  return i.team_id;
end $$;

-- alteração campo a campo (duas pessoas em campos diferentes do mesmo treino não se apagam).
-- changes = [{"p":["att","p1"],"v":{...}}, {"p":["notes"],"d":true}, …]  (d = apagar o campo)
-- Corre com as permissões de quem chama (RLS aplica-se).
create or replace function public.patch_doc(p_team uuid, p_col text, p_id text, p_changes jsonb)
  returns bigint language plpgsql security invoker set search_path = public as
$$ declare d jsonb; ch jsonb; pth text[]; nv bigint;
begin
  select data into d from public.docs where team_id = p_team and col = p_col and id = p_id for update;
  if not found then raise exception 'Registo inexistente'; end if;
  for ch in select * from jsonb_array_elements(p_changes) loop
    pth := array(select jsonb_array_elements_text(ch -> 'p'));
    if coalesce((ch ->> 'd')::boolean, false) then d := d #- pth;
    else
      if array_length(pth, 1) > 1 and d #> pth[1:array_length(pth,1)-1] is null then
        d := jsonb_set(d, pth[1:array_length(pth,1)-1], '{}'::jsonb, true);
      end if;
      d := jsonb_set(d, pth, ch -> 'v', true);
    end if;
  end loop;
  update public.docs set data = d where team_id = p_team and col = p_col and id = p_id returning v into nv;
  return nv;
end $$;

revoke all on function public.create_club(text,text,text,text), public.create_team(uuid,text,text,text),
                       public.accept_invite(uuid), public.patch_doc(uuid,text,text,jsonb) from public, anon;
grant execute on function public.create_club(text,text,text,text), public.create_team(uuid,text,text,text),
                          public.accept_invite(uuid), public.patch_doc(uuid,text,text,jsonb) to authenticated;

-- ---------------------------------------------------------------- regras de acesso (RLS)
alter table public.clubs      enable row level security;
alter table public.teams      enable row level security;
alter table public.roles      enable row level security;
alter table public.members    enable row level security;
alter table public.role_perms enable row level security;
alter table public.invites    enable row level security;
alter table public.docs       enable row level security;
alter table public.audit      enable row level security;

-- nada para visitantes sem sessão
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

create policy clubs_sel on public.clubs for select to authenticated using (app.is_club_member(id));
create policy clubs_upd on public.clubs for update to authenticated using (app.is_club_admin(id)) with check (app.is_club_admin(id));

create policy teams_sel on public.teams for select to authenticated using (app.is_member(id) or app.is_club_admin(club_id));
create policy teams_upd on public.teams for update to authenticated using (app.is_admin(id)) with check (app.is_admin(id));
create policy teams_del on public.teams for delete to authenticated using (app.is_club_admin(club_id));

create policy roles_sel on public.roles for select to authenticated using (true);
create policy perms_sel on public.role_perms for select to authenticated using (true);

create policy members_sel on public.members for select to authenticated using (app.is_member(team_id));
create policy members_upd on public.members for update to authenticated using (app.is_admin(team_id)) with check (app.is_admin(team_id));
create policy members_del on public.members for delete to authenticated using (app.is_admin(team_id) or user_id = auth.uid());
-- (entrar numa equipa só por create_club/create_team/accept_invite — não há política de insert)

create policy invites_sel on public.invites for select to authenticated using (app.is_admin(team_id));
create policy invites_ins on public.invites for insert to authenticated with check (app.is_admin(team_id));
create policy invites_del on public.invites for delete to authenticated using (app.is_admin(team_id));

create policy docs_sel on public.docs for select to authenticated using (app.perm(team_id, col, false));
create policy docs_ins on public.docs for insert to authenticated with check (app.perm(team_id, col, true));
create policy docs_upd on public.docs for update to authenticated using (app.perm(team_id, col, true)) with check (app.perm(team_id, col, true));
create policy docs_del on public.docs for delete to authenticated using (app.is_admin(team_id));   -- apagar de vez: só admin (a app marca deleted=true)

create policy audit_sel on public.audit for select to authenticated using (app.role_in(team_id) in ('admin','principal'));

-- permissões de tabela (o projeto não expõe tabelas novas automaticamente)
grant select, update on public.clubs to authenticated;
grant select, update, delete on public.teams to authenticated;
grant select on public.roles, public.role_perms to authenticated;
grant select, update, delete on public.members to authenticated;
grant select, insert, delete on public.invites to authenticated;
grant select, insert, update, delete on public.docs to authenticated;
grant select on public.audit to authenticated;
grant usage on sequence public.docs_v to authenticated;

-- ---------------------------------------------------------------- tempo real (o que um grava aparece nos outros)
alter publication supabase_realtime add table public.docs;

-- ---------------------------------------------------------------- ficheiros (emblemas, fotos): pasta = id da equipa
insert into storage.buckets (id, name, public) values ('equipa', 'equipa', false) on conflict (id) do nothing;
create or replace function app.path_team(name text) returns uuid
  language sql immutable as
$$ select case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' then (storage.foldername(name))[1]::uuid end $$;
grant execute on function app.path_team(text) to authenticated;

create policy files_sel on storage.objects for select to authenticated
  using (bucket_id = 'equipa' and app.perm(app.path_team(name), 'files', false));
create policy files_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'equipa' and app.perm(app.path_team(name), 'files', true));
create policy files_upd on storage.objects for update to authenticated
  using (bucket_id = 'equipa' and app.perm(app.path_team(name), 'files', true));
create policy files_del on storage.objects for delete to authenticated
  using (bucket_id = 'equipa' and app.is_admin(app.path_team(name)));
