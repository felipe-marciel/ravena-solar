-- Execute no SQL Editor do projeto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  telefone text not null check (length(trim(telefone)) > 0),
  cidade text not null check (length(trim(cidade)) > 0),
  criado_em timestamptz not null default now()
);

alter table public.pessoas add column if not exists cidade text;

create table if not exists public.simulacoes (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  valor_medio_conta numeric(12, 2) not null check (valor_medio_conta > 0),
  foto_path text,
  criada_em timestamptz not null default now()
);

create index if not exists simulacoes_pessoa_id_idx on public.simulacoes(pessoa_id);

create unique index if not exists pessoas_nome_telefone_idx
  on public.pessoas (telefone, lower(trim(nome)));

-- API usa a chave service role e chama esta função para inserir os dois registros
-- em uma única transação.
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

-- A função recebe apenas a solicitação e faz os dois INSERTs no servidor.
revoke all on function public.criar_simulacao(text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.criar_simulacao(text, text, text, numeric, text) to service_role;

-- Bucket privado para fotos/arquivos de conta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-contas', 'fotos-contas', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Sem políticas públicas: somente o servidor com service role acessa o bucket.
