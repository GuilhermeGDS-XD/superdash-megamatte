-- ============================================================================
-- GUIA DE MIGRAÇÃO COMPLETA - Super Dashboard
-- Este documento contém o Schema unificado e as Políticas de Segurança (RLS).
-- ============================================================================

-- PARTE 1: ESTRUTURA DO BANCO (SCHEMA, TABELAS E TIPOS)
-- ============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS CUSTOMIZADOS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER');
    END IF;
END $$;

-- 3. TABELA USERS (Com suporte a senha encriptada)
CREATE TABLE IF NOT EXISTS public.users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email              TEXT NOT NULL UNIQUE,
    encrypted_password TEXT NOT NULL,
    full_name          TEXT NOT NULL DEFAULT 'Usuário Novo',
    role               public.user_role NOT NULL DEFAULT 'MANAGER',
    can_view_logs      BOOLEAN DEFAULT false,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA SESSIONS (Controle de Login Customizado)
CREATE TABLE IF NOT EXISTS public.sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT NOT NULL,
    platforms          TEXT[] NOT NULL, 
    google_campaign_id TEXT,
    meta_campaign_id   TEXT,
    google_start_date  DATE,
    meta_start_date    DATE,
    meta_account_id    TEXT,
    meta_account_name  TEXT,
    ecompay_product_id TEXT,
    spotter_list_id    TEXT,
    status             TEXT,
    created_by         UUID,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA CREATIVES
CREATE TABLE IF NOT EXISTS public.creatives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    external_id     TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    name            TEXT,
    image_url       TEXT,
    conversions     INTEGER DEFAULT 0,
    leads           INTEGER DEFAULT 0,
    spend           NUMERIC DEFAULT 0,
    clicks          INTEGER DEFAULT 0,
    ctr             NUMERIC DEFAULT 0,
    reach           INTEGER DEFAULT 0,
    cost_per_result NUMERIC DEFAULT 0,
    platform        TEXT,
    synced_at       TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS creatives_campaign_platform_external_unique ON public.creatives (campaign_id, platform, external_id);

-- 7. TABELA LOGS
CREATE TABLE IF NOT EXISTS public.logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID,
    action     TEXT NOT NULL,
    metadata   JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABELAS DE OAUTH META (NECESSÁRIAS PARA AD SYNC)
CREATE TABLE IF NOT EXISTS public.meta_accounts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NULL, 
    account_id       TEXT NOT NULL UNIQUE,
    account_name     TEXT,
    access_token     TEXT, 
    token_expires_at TIMESTAMPTZ,
    status           TEXT DEFAULT 'active',
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meta_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT NOT NULL,
    accounts    JSONB DEFAULT '[]'::jsonb,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);


-- PARTE 2: SEGURANÇA E POLÍTICAS (RLS)
-- ============================================================================

-- 1. ATIVAR RLS EM TODAS AS TABELAS
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions      ENABLE ROW LEVEL SECURITY;

-- 2. LIMPAR POLÍTICAS EXISTENTES
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    DROP POLICY IF EXISTS "Authenticated users can manage campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "Authenticated users can view creatives" ON public.creatives;
    DROP POLICY IF EXISTS "Manage creatives" ON public.creatives;
    DROP POLICY IF EXISTS "Manage sessions" ON public.sessions;
    DROP POLICY IF EXISTS "Manage meta sessions" ON public.meta_sessions;
    DROP POLICY IF EXISTS "System can insert logs" ON public.logs;
    DROP POLICY IF EXISTS "Admins can view logs" ON public.logs;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. CRIAR NOVAS POLÍTICAS
CREATE POLICY "Authenticated users can view users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Authenticated users can manage campaigns" ON public.campaigns FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view creatives" ON public.creatives FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Manage creatives" ON public.creatives FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "Manage sessions" ON public.sessions FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));
CREATE POLICY "Manage meta sessions" ON public.meta_sessions FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "System can insert logs" ON public.logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can view logs" ON public.logs FOR SELECT USING (auth.role() = 'authenticated');

-- 4. PERMISSÕES DE ACESSO (GRANTS)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
