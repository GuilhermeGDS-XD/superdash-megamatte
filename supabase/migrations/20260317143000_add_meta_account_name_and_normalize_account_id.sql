-- Adiciona meta_account_name e normaliza meta_account_id para incluir prefixo act_.

alter table public.campaigns
  add column if not exists meta_account_name text,
  add column if not exists updated_at timestamp with time zone default now();

-- Normaliza registros gravados sem o prefixo act_ no meta_account_id.
update public.campaigns
set meta_account_id = 'act_' || meta_account_id
where meta_account_id is not null
  and meta_account_id != ''
  and meta_account_id not like 'act_%';

notify pgrst, 'reload schema';
