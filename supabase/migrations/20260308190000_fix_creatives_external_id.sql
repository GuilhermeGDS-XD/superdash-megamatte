-- Garante compatibilidade da tabela creatives com o processo de sincronizacao dos ads.

create table if not exists public.creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  external_id text,
  name text,
  image_url text,
  conversions numeric(12,2) not null default 0,
  spend numeric(12,2) not null default 0,
  ctr numeric(10,4) not null default 0,
  platform text not null,
  created_at timestamp with time zone not null default now()
);

alter table if exists public.creatives
  add column if not exists campaign_id uuid,
  add column if not exists external_id text,
  add column if not exists name text,
  add column if not exists image_url text,
  add column if not exists conversions numeric(12,2) default 0,
  add column if not exists spend numeric(12,2) default 0,
  add column if not exists ctr numeric(10,4) default 0,
  add column if not exists platform text,
  add column if not exists created_at timestamp with time zone default now();

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'creatives'
      and constraint_name = 'creatives_campaign_id_fkey'
  ) then
    alter table public.creatives
      add constraint creatives_campaign_id_fkey
      foreign key (campaign_id) references public.campaigns(id) on delete cascade;
  end if;
end
$$;

alter table if exists public.creatives
  alter column campaign_id set not null,
  alter column platform set not null,
  alter column conversions set default 0,
  alter column spend set default 0,
  alter column ctr set default 0,
  alter column created_at set default now();

alter table if exists public.creatives
  drop constraint if exists creatives_platform_check;

alter table if exists public.creatives
  add constraint creatives_platform_check
  check (platform in ('GOOGLE_ADS', 'META_ADS'));

alter table if exists public.creatives
  add column if not exists external_id text;

-- Quando external_id estiver ausente, usamos um fallback com o proprio id para evitar nulls em registros antigos.
update public.creatives
set external_id = coalesce(external_id, id::text)
where external_id is null;

-- Define valor obrigatorio para evitar conflitos silenciosos no upsert.
alter table if exists public.creatives
  alter column external_id set not null;

-- Dedupe de eventuais registros existentes antes de criar constraint unica.
with ranked as (
  select
    id,
    row_number() over (
      partition by campaign_id, platform, external_id
      order by created_at desc nulls last, id desc
    ) as rn
  from public.creatives
)
delete from public.creatives c
using ranked r
where c.id = r.id
  and r.rn > 1;

-- Unicidade por campanha + plataforma + external_id.
create unique index if not exists creatives_campaign_platform_external_unique
  on public.creatives (campaign_id, platform, external_id);
