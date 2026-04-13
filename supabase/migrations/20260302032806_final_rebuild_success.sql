-- Migracao base nao destrutiva para producao.
-- Objetivo: criar/ajustar estrutura minima sem remover dados existentes.

create extension if not exists pgcrypto;

create table if not exists public.users (
    id uuid primary key references auth.users(id),
    name text not null,
    email text not null unique,
    role text not null default 'Gestor',
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.campaigns (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    platforms text[] not null,
    budget numeric(12,2) default 0,
    start_date date default current_date,
    end_date date,
    status text default 'Ativa',
    google_campaign_id text,
    meta_campaign_id text,
    google_start_date date,
    meta_start_date date,
    created_by uuid references auth.users(id),
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id),
    user_name text,
    action text not null,
    details jsonb,
    metadata jsonb,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table if exists public.users
    add column if not exists name text,
    add column if not exists email text,
    add column if not exists role text,
    add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

alter table if exists public.campaigns
    add column if not exists budget numeric(12,2) default 0,
    add column if not exists start_date date default current_date,
    add column if not exists end_date date,
    add column if not exists status text default 'Ativa',
    add column if not exists google_campaign_id text,
    add column if not exists meta_campaign_id text,
    add column if not exists google_start_date date,
    add column if not exists meta_start_date date,
    add column if not exists created_by uuid,
    add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

alter table if exists public.logs
    add column if not exists user_name text,
    add column if not exists details jsonb,
    add column if not exists metadata jsonb,
    add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

create unique index if not exists users_email_unique_idx on public.users(email);

do $$
begin
    if not exists (
        select 1
        from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'campaigns'
          and constraint_name = 'campaigns_created_by_fkey'
    ) then
        alter table public.campaigns
            add constraint campaigns_created_by_fkey
            foreign key (created_by) references auth.users(id);
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'logs'
          and constraint_name = 'logs_user_id_fkey'
    ) then
        alter table public.logs
            add constraint logs_user_id_fkey
            foreign key (user_id) references auth.users(id);
    end if;
end
$$;