-- Gera a consulta que conta as linhas de cada tabela da app (as mesmas contas na cópia e no restauro)
-- e uma impressão digital (md5) dos documentos, para confirmar que o conteúdo ficou igual e não só o número.
select 'select json_object_agg(t, n order by t) from (' ||
       string_agg(format('select %L as t, count(*)::text as n from public.%I', tablename, tablename), ' union all ' order by tablename) ||
       ' union all select ''auth.users'', count(*)::text from auth.users' ||
       ' union all select ''docs.md5'', coalesce(md5(string_agg(team_id||''/''||col||''/''||id||''/''||data::text||''/''||v||''/''||deleted, ''|'' order by team_id, col, id)), '''') from public.docs) x'
  from pg_tables where schemaname = 'public' and tablename not in ('roles', 'role_perms');
