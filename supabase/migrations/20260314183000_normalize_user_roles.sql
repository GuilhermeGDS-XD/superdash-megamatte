-- Normaliza roles legadas para o padrao canonico: SUPER_ADMIN, ADMIN, MANAGER.

alter table if exists public.users
  add column if not exists role text;

update public.users
set role = case
  when upper(replace(coalesce(role, ''), ' ', '_')) in ('SUPER_ADMIN', 'SUPERADMIN') then 'SUPER_ADMIN'
  when upper(replace(coalesce(role, ''), ' ', '_')) = 'ADMIN' then 'ADMIN'
  when upper(replace(coalesce(role, ''), ' ', '_')) in ('GESTOR', 'MANAGER') then 'MANAGER'
  else 'MANAGER'
end;

alter table if exists public.users
  alter column role set default 'MANAGER';

alter table if exists public.users
  alter column role set not null;

alter table if exists public.users
  drop constraint if exists users_role_check;

alter table if exists public.users
  add constraint users_role_check
  check (role in ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));
