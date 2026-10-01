-- Clínico → Reabilitação: biblioteca de exercícios (rehabex) e plano/sessões por lesão (rehab).
-- Fisioterapeuta e preparador físico prescrevem e registam sessões; o analista só lê (como as lesões);
-- team manager e direção não veem (dados clínicos). Os outros seguem a linha '*' da função.
insert into public.role_perms (role, col, can_read, can_write) values
  ('fisio','rehab',true,true),     ('fisio','rehabex',true,true),
  ('fisico','rehab',true,true),    ('fisico','rehabex',true,true),
  ('analista','rehab',true,false), ('analista','rehabex',true,false),
  ('manager','rehab',false,false),
  ('leitura','rehab',false,false)
on conflict (role, col) do update set can_read = excluded.can_read, can_write = excluded.can_write;
