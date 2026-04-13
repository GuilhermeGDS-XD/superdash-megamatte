-- Validacao rapida pos-migracao (executar em producao apos aplicar migracoes)

-- 1) Tabelas criticas
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('users', 'campaigns', 'logs', 'creatives')
order by table_name;

-- 2) Colunas importantes
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'campaigns' and column_name in ('meta_account_id', 'google_campaign_id', 'meta_campaign_id'))
    or (table_name = 'creatives' and column_name in ('external_id', 'campaign_id', 'platform'))
    or (table_name = 'users' and column_name in ('id', 'email', 'role'))
  )
order by table_name, column_name;

-- 3) Indice de unicidade de creatives
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname = 'creatives_campaign_platform_external_unique';

-- 4) Duplicidade em creatives (deve ser zero)
select campaign_id, platform, external_id, count(*) as total
from public.creatives
group by campaign_id, platform, external_id
having count(*) > 1;

-- 5) Roles atuais no banco
select role, count(*) as total
from public.users
group by role
order by role;

-- 6) Politicas RLS por tabela critica
select schemaname, tablename, policyname, cmd, permissive, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('users', 'campaigns', 'logs', 'creatives')
order by tablename, policyname;

-- 7) Integridade basica de campanhas
select
  count(*) as total_campaigns,
  count(*) filter (where name is null or trim(name) = '') as campaigns_sem_nome,
  count(*) filter (where platforms is null) as campaigns_sem_platforms
from public.campaigns;
