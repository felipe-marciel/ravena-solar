-- Execute no SQL Editor para atualizar uma instalação que já criou o esquema antigo.
alter table public.pessoas add column if not exists cidade text;
update public.pessoas set cidade = 'Não informada' where cidade is null;
alter table public.pessoas alter column cidade set not null;

-- Consolida duplicatas antigas por nome/telefone e transfere suas simulações.
with duplicadas as (
  select id,
         first_value(id) over (partition by telefone, lower(trim(nome)) order by criado_em, id) as pessoa_principal,
         row_number() over (partition by telefone, lower(trim(nome)) order by criado_em, id) as posicao
  from public.pessoas
), movidas as (
  update public.simulacoes s
  set pessoa_id = d.pessoa_principal
  from duplicadas d
  where s.pessoa_id = d.id and d.posicao > 1
)
delete from public.pessoas p
using duplicadas d
where p.id = d.id and d.posicao > 1;

create unique index if not exists pessoas_nome_telefone_idx
  on public.pessoas (telefone, lower(trim(nome)));

drop function if exists public.criar_simulacao(text, text, numeric, text);

create or replace function public.criar_simulacao(
  p_nome text,
  p_telefone text,
  p_cidade text,
  p_valor_medio_conta numeric,
  p_foto_path text default null
) returns table (pessoa_id uuid, simulacao_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pessoa_id uuid;
  v_simulacao_id uuid;
begin
  insert into public.pessoas (nome, telefone, cidade)
  values (trim(p_nome), trim(p_telefone), trim(p_cidade))
  on conflict (telefone, (lower(trim(nome))))
  do update set cidade = excluded.cidade
  returning id into v_pessoa_id;

  insert into public.simulacoes (pessoa_id, valor_medio_conta, foto_path)
  values (v_pessoa_id, p_valor_medio_conta, p_foto_path)
  returning id into v_simulacao_id;

  return query select v_pessoa_id, v_simulacao_id;
end;
$$;

revoke all on function public.criar_simulacao(text, text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.criar_simulacao(text, text, text, numeric, text)
  to service_role;
