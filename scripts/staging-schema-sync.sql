-- =============================================================================
-- SCRIPT: Sincronizar Schema do Staging com Produção
-- Executar no SQL Editor do Supabase STAGING (yzqvwhbrqmgvknzgoauq)
-- =============================================================================
-- ATENÇÃO: Este script DROPA e RECRIA tabelas, funções, triggers e policies.
-- NÃO execute em produção!
-- =============================================================================

BEGIN;

-- =============================================
-- 0. Extensões necessárias
-- =============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- 1. Limpar tabelas existentes (ordem de dependência)
-- =============================================
DROP TABLE IF EXISTS public.creatives CASCADE;
DROP TABLE IF EXISTS public.logs CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.meta_sessions CASCADE;
DROP TABLE IF EXISTS public.meta_accounts CASCADE;
-- NÃO dropa public.users pra manter vínculo com auth.users

-- =============================================
-- 2. Tabela: users
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'MANAGER',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'))
);

-- Caso a tabela já exista, garantir colunas e constraints
ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS name text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'MANAGER',
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE IF EXISTS public.users
    DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS public.users
    ADD CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

-- =============================================
-- 3. Tabela: campaigns
-- =============================================
CREATE TABLE public.campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    platforms text[] NOT NULL,
    budget numeric(12,2) DEFAULT 0,
    start_date date DEFAULT current_date,
    end_date date,
    status text DEFAULT 'Ativa',
    google_campaign_id text,
    meta_campaign_id text,
    google_start_date date,
    meta_start_date date,
    meta_account_id text,
    meta_account_name text,
    spotter_list_id text DEFAULT NULL,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_google_campaign_id_key ON public.campaigns(google_campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS campaigns_meta_campaign_id_key ON public.campaigns(meta_campaign_id);

COMMENT ON COLUMN campaigns.spotter_list_id IS 'ID ou nome da lista no Exact Spotter vinculada a esta campanha';

-- =============================================
-- 4. Tabela: creatives
-- =============================================
CREATE TABLE public.creatives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    external_id text NOT NULL,
    name text,
    image_url text,
    conversions numeric(12,2) NOT NULL DEFAULT 0,
    spend numeric(12,2) NOT NULL DEFAULT 0,
    ctr numeric(10,4) NOT NULL DEFAULT 0,
    platform text NOT NULL,
    reach integer DEFAULT 0,
    clicks integer DEFAULT 0,
    leads integer DEFAULT 0,
    cost_per_result numeric DEFAULT 0,
    synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT creatives_platform_check CHECK (platform IN ('GOOGLE_ADS', 'META_ADS'))
);

CREATE UNIQUE INDEX IF NOT EXISTS creatives_campaign_platform_external_unique
    ON public.creatives (campaign_id, platform, external_id);

-- =============================================
-- 5. Tabela: logs
-- =============================================
CREATE TABLE public.logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name text,
    action text NOT NULL,
    details jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- 6. Tabela: meta_accounts
-- =============================================
CREATE TABLE public.meta_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,  -- nullable (sem FK para auth.users conforme migration 20260413)
    account_id text NOT NULL,
    account_name text,
    business_account_id text,
    access_token text NOT NULL,
    token_expires_at timestamp with time zone,
    refresh_token text,
    status text DEFAULT 'active',
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meta_accounts_account_id_key UNIQUE (account_id)
);

-- =============================================
-- 7. Tabela: meta_sessions
-- =============================================
CREATE TABLE public.meta_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    authorization_code text,
    state text,
    access_token text NOT NULL,
    accounts jsonb,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_meta_sessions_user_id ON public.meta_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_sessions_state ON public.meta_sessions(state);

-- =============================================
-- 8. Função: get_my_role() — SECURITY DEFINER
-- Evita recursão infinita nas RLS policies de users
-- =============================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- =============================================
-- 9. Função: handle_new_user() — trigger para auth.users
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário Novo'),
    NEW.email,
    'MANAGER'
  );
  RETURN NEW;
END;
$$;

-- Trigger no auth.users (pode já existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 10. Função + Trigger: sync_role_to_metadata
-- Sincroniza role da tabela users → auth.users.raw_user_meta_data
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_role_to_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_role_to_metadata ON public.users;
CREATE TRIGGER trigger_sync_role_to_metadata
    AFTER INSERT OR UPDATE OF role ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_role_to_metadata();

-- =============================================
-- 11. RLS — Habilitar em todas as tabelas
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 12. RLS Policies — users
-- Usa get_my_role() para evitar recursão infinita
-- =============================================
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
CREATE POLICY "Admins can manage users" ON public.users
    FOR ALL
    USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- =============================================
-- 13. RLS Policies — campaigns
-- =============================================
DROP POLICY IF EXISTS "Users can view all campaigns" ON public.campaigns;
CREATE POLICY "Users can view all campaigns" ON public.campaigns
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage campaigns" ON public.campaigns;
CREATE POLICY "Authenticated users can manage campaigns" ON public.campaigns
    FOR ALL
    USING (auth.role() = 'authenticated');

-- =============================================
-- 14. RLS Policies — logs
-- =============================================
DROP POLICY IF EXISTS "Admins can view logs" ON public.logs;
CREATE POLICY "Admins can view logs" ON public.logs
    FOR SELECT
    USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

DROP POLICY IF EXISTS "System can insert logs" ON public.logs;
CREATE POLICY "System can insert logs" ON public.logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- 15. RLS Policies — meta_accounts
-- =============================================
DROP POLICY IF EXISTS "Anyone authenticated can view meta_accounts" ON public.meta_accounts;
CREATE POLICY "Anyone authenticated can view meta_accounts" ON public.meta_accounts
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage meta_accounts" ON public.meta_accounts;
CREATE POLICY "Admins can manage meta_accounts" ON public.meta_accounts
    FOR ALL
    USING (get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- =============================================
-- 16. RLS Policies — meta_sessions
-- =============================================
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.meta_sessions;
CREATE POLICY "Users can manage own sessions" ON public.meta_sessions
    FOR ALL
    USING (user_id = auth.uid() OR get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- =============================================
-- 17. RLS Policies — creatives (sem restrição)
-- =============================================
DROP POLICY IF EXISTS "Anyone can view creatives" ON public.creatives;
CREATE POLICY "Anyone can view creatives" ON public.creatives
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated can manage creatives" ON public.creatives;
CREATE POLICY "Authenticated can manage creatives" ON public.creatives
    FOR ALL
    USING (auth.role() = 'authenticated');

-- =============================================
-- 18. Grants para roles do Supabase
-- =============================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.sync_role_to_metadata() TO postgres, service_role;

-- =============================================
-- 19. Recarregar schema cache do PostgREST
-- =============================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

COMMIT;

-- =============================================================================
-- ✅ Schema do staging agora é idêntico ao de produção!
-- Próximo passo (se precisar dados): use pg_dump/pg_restore entre os bancos.
-- =============================================================================
