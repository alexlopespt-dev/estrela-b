-- Separador Guarda-redes: sessões de treino dos GR e registo dos GR nos jogos (coleção gk).
-- Nova função "Treinador de guarda-redes": lê tudo menos o clínico; escreve as sessões/registos de GR (gk) e os
-- exercícios (a biblioteca de exercícios de GR é a categoria "Guarda-redes" dos exercícios).
-- As outras funções seguem a linha '*' (principal/adjunto/analista escrevem; fisio, físico, manager e direção só leem).
insert into public.roles (role, label, ord) values ('gr','Treinador de guarda-redes',9)
on conflict (role) do update set label = excluded.label, ord = excluded.ord;
insert into public.role_perms (role, col, can_read, can_write) values
  ('gr','*',true,false), ('gr','clinical',false,false), ('gr','gk',true,true), ('gr','exercises',true,true)
on conflict (role, col) do update set can_read = excluded.can_read, can_write = excluded.can_write;
