-- Estrutura do banco do Site Selection (projeto Supabase "site-selection").
-- Já aplicada no projeto; guardada aqui como referência e para recriar o banco se preciso.

create table public.edificios (
  id bigint primary key,
  nome text, endereco text, numero text, cep text, distrito text, cidade text, uf text,
  classe text, perfil text, lat double precision, lng double precision,
  regiao_colliers text, classe_colliers text,
  regiao text generated always as (coalesce(nullif(trim(regiao_colliers),''), distrito)) stored,
  area_locavel_total numeric, area_boma numeric, area_privativa numeric,
  area_disponivel numeric, area_vaga numeric, area_ofertada numeric, taxa_vacancia numeric,
  auditorio text, area_andar_tipo numeric, conjuntos_andar_tipo int, conjuntos int, conjuntos_disponiveis int,
  vagas_andar_tipo int, vagas_total int, gerador text, heliponto text, ar_condicionado text, piso text, forro text,
  pe_direito numeric, green_building text,
  preco_min numeric, preco_max numeric, preco_medio numeric, venda_min numeric, venda_max numeric,
  condominio numeric, iptu numeric, total numeric,
  data_atualizacao timestamptz, status text, categoria_uso text,
  importado_em timestamptz not null default now()
);
create index on public.edificios (uf, cidade, regiao);
create index on public.edificios (area_vaga);

create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  edificio_id bigint not null references public.edificios(id) on delete cascade,
  tipo text default 'fachada', ordem int default 0, url text not null,
  created_at timestamptz not null default now()
);
create index on public.fotos (edificio_id);

create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  nome text not null, cargo text, creci text, telefone text, email text, whatsapp text,
  foto_url text, ativo boolean not null default true, created_at timestamptz not null default now()
);

create table public.site_selections (
  id uuid primary key default gen_random_uuid(),
  cliente text, nome_capa_cliente text, data_dia int, data_mes int, data_ano int,
  broker_principal_id uuid references public.brokers(id) on delete set null,
  brokers_extra jsonb not null default '[]',
  status text not null default 'rascunho',
  regioes jsonb not null default '[]', estados text[] not null default '{}',
  demanda_m2 numeric, area_min_m2 numeric, area_max_m2 numeric, filtro_preco_max numeric,
  filtros jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.site_selection_itens (
  id uuid primary key default gen_random_uuid(),
  site_selection_id uuid not null references public.site_selections(id) on delete cascade,
  edificio_id bigint not null references public.edificios(id) on delete cascade,
  area_m2 numeric, incluido boolean not null default true, ordem int,
  temp_overrides jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.site_selection_itens (site_selection_id);

create table public.lamina_overrides (
  id uuid primary key default gen_random_uuid(),
  edificio_id bigint not null references public.edificios(id) on delete cascade,
  campo text not null, valor text,
  updated_at timestamptz not null default now(),
  unique (edificio_id, campo)
);

-- site aberto, sem login: acesso livre via chave pública
do $$ declare t text; begin
  foreach t in array array['edificios','fotos','brokers','site_selections','site_selection_itens','lamina_overrides'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy acesso_aberto on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

create or replace function public.disponibilidade_por_regiao()
returns table (uf text, cidade text, regiao text, qtd bigint, min_vaga numeric, max_vaga numeric)
language sql stable security invoker set search_path = public as $$
  select e.uf, e.cidade, e.regiao, count(*), min(e.area_vaga), max(e.area_vaga)
  from public.edificios e
  where coalesce(e.area_vaga,0) > 0 and e.regiao is not null
  group by 1,2,3 order by 1,2,3;
$$;

insert into storage.buckets (id, name, public) values ('fotos','fotos', true) on conflict do nothing;
create policy fotos_leitura on storage.objects for select to anon, authenticated using (bucket_id = 'fotos');
create policy fotos_envio on storage.objects for insert to anon, authenticated with check (bucket_id = 'fotos');
create policy fotos_remocao on storage.objects for delete to anon, authenticated using (bucket_id = 'fotos');
