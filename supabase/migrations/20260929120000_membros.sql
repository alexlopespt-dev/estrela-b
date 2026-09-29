-- 2.º passo da base de dados da versão para clubes: nome e email de cada membro (para a lista "Acessos" na app)
-- e o nome da pessoa ao criar o clube / aceitar um convite. Correr no SQL Editor da Supabase depois do primeiro ficheiro.

alter table public.members add column if not exists email text;

-- ao entrar numa equipa (criar clube ou aceitar convite), guarda o nome e o email da conta
create or replace function app.members_fill() returns trigger
  language plpgsql security definer set search_path = public, auth as
$$ begin
  if new.email is null then select u.email into new.email from auth.users u where u.id = new.user_id; end if;
  if new.display_name is null then
    select nullif(trim(u.raw_user_meta_data ->> 'name'), '') into new.display_name from auth.users u where u.id = new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists members_fill on public.members;
create trigger members_fill before insert on public.members for each row execute function app.members_fill();

-- membros que já existiam
update public.members m set email = u.email,
       display_name = coalesce(m.display_name, nullif(trim(u.raw_user_meta_data ->> 'name'), ''))
  from auth.users u where u.id = m.user_id and (m.email is null or m.display_name is null);

-- cada pessoa pode mudar o próprio nome (em todas as equipas onde está)
create or replace function public.set_my_name(p_name text)
  returns void language plpgsql security definer set search_path = public as
$$ begin
  if auth.uid() is null then raise exception 'É preciso ter sessão iniciada'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'Nome inválido'; end if;
  update public.members set display_name = trim(p_name) where user_id = auth.uid();
end $$;
revoke all on function public.set_my_name(text) from public, anon;
grant execute on function public.set_my_name(text) to authenticated;
