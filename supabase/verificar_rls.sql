-- Auditoria das regras de acesso (só leitura; pode correr na produção: SQL Editor, ou a cópia diária no GitHub).
-- Falha com erro se encontrar algum problema; se estiver tudo bem, mostra "RLS OK".
do $$
declare r record; problemas text := '';
begin
  -- 1) todas as tabelas do esquema public com RLS ligado
  for r in select tablename from pg_tables where schemaname = 'public' and not rowsecurity loop
    problemas := problemas || format(E'\n- tabela public.%I sem RLS', r.tablename);
  end loop;
  -- 2) nenhuma regra (policy) aberta a visitantes sem sessão (anon/public)
  for r in select tablename, policyname from pg_policies
           where schemaname in ('public','storage') and (roles && array['anon','public']::name[]) loop
    problemas := problemas || format(E'\n- regra %I em %I aberta a visitantes sem sessão', r.policyname, r.tablename);
  end loop;
  -- 3) visitantes sem sessão (anon) sem permissões nas tabelas da app
  for r in select table_name, privilege_type from information_schema.role_table_grants
           where table_schema = 'public' and grantee = 'anon' loop
    problemas := problemas || format(E'\n- anon tem %s em public.%I', r.privilege_type, r.table_name);
  end loop;
  -- 4) ficheiros: RLS ligado em storage.objects e o bucket "equipa" privado
  if exists (select 1 from pg_tables where schemaname='storage' and tablename='objects' and not rowsecurity) then
    problemas := problemas || E'\n- storage.objects sem RLS';
  end if;
  if exists (select 1 from storage.buckets where id = 'equipa' and public) then
    problemas := problemas || E'\n- o bucket "equipa" está público';
  end if;
  if problemas <> '' then raise exception 'Problemas nas regras de acesso:%', problemas; end if;
  raise notice 'RLS OK';
end $$;
