-- ============================================================================
-- SCHEMA COMPLETO - Super Dashboard (Supabase / PostgreSQL)
-- Gerado em: 2026-04-15
-- Projeto:   ggxuvuwpfifliffwnbsn.supabase.co
-- ============================================================================
-- INSTRUÇÕES DE USO:
-- Execute este arquivo em ordem em um projeto Supabase limpo ou em qualquer
-- instância PostgreSQL com o schema "auth" do Supabase presente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSÕES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto"   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net"     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA graphql;


-- ----------------------------------------------------------------------------
-- 2. TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------

-- Plataformas de anúncio suportadas
DO $$ BEGIN
    CREATE TYPE public.ad_platform AS ENUM ('GOOGLE_ADS', 'META_ADS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Roles de usuário do sistema
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- ----------------------------------------------------------------------------
-- 3. FUNÇÕES AUXILIARES
-- ----------------------------------------------------------------------------

-- Função usada para criar o perfil do usuário automaticamente ao se registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Função usada pelas RLS Policies para buscar o role do usuário atual
-- sem causar recursão infinita (SECURITY DEFINER ignora RLS da tabela users)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;


-- ----------------------------------------------------------------------------
-- 4. TABELAS
-- ----------------------------------------------------------------------------

-- 4.1 USERS
-- Espelho de auth.users com dados de perfil e role de acesso
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID         NOT NULL,
    name        TEXT         NOT NULL,
    email       TEXT         NOT NULL,
    role        TEXT         NOT NULL DEFAULT 'MANAGER',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc', now()),

    CONSTRAINT users_pkey         PRIMARY KEY (id),
    CONSTRAINT users_email_key    UNIQUE (email),
    CONSTRAINT users_id_fkey      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT users_role_check   CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'))
);

-- 4.2 CAMPAIGNS
-- Campanhas de marketing vinculadas a plataformas (Meta Ads, Google Ads)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    name                TEXT         NOT NULL,
    platforms           TEXT[]       NOT NULL,
    budget              NUMERIC(12,2) DEFAULT 0,
    start_date          DATE         DEFAULT CURRENT_DATE,
    end_date            DATE,
    status              TEXT         DEFAULT 'Ativa',
    google_campaign_id  TEXT,
    meta_campaign_id    TEXT,
    google_start_date   DATE,
    meta_start_date     DATE,
    meta_account_id     TEXT,           -- ID da conta Meta (formato act_XXXX)
    meta_account_name   TEXT,           -- Nome da conta Meta para exibição
    spotter_list_id     TEXT,           -- ID/nome da lista no Exact Spotter
    ecompay_product_id  TEXT,           -- ID do produto Ecompay vinculado
    created_by          UUID,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc', now()),
    updated_at          TIMESTAMPTZ  DEFAULT now(),

    CONSTRAINT campaigns_pkey PRIMARY KEY (id),
    CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

COMMENT ON COLUMN public.campaigns.meta_account_id     IS 'ID da conta Meta Ads no formato act_XXXX';
COMMENT ON COLUMN public.campaigns.spotter_list_id     IS 'ID ou nome da lista no Exact Spotter vinculada a esta campanha';
COMMENT ON COLUMN public.campaigns.ecompay_product_id  IS 'ID do produto Ecompay vinculado a esta campanha';

-- 4.3 CREATIVES
-- Top criativos (anúncios) sincronizados a partir das plataformas de mídia
CREATE TABLE IF NOT EXISTS public.creatives (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    campaign_id      UUID         NOT NULL,
    external_id      TEXT,                    -- ID do anúncio na plataforma (ex: Meta ad_id)
    platform         TEXT         NOT NULL,   -- 'META_ADS' | 'GOOGLE_ADS'
    name             TEXT         NOT NULL,
    image_url        TEXT,
    spend            NUMERIC      DEFAULT 0,
    conversions      INTEGER      DEFAULT 0,
    leads            INTEGER      DEFAULT 0,
    clicks           INTEGER      DEFAULT 0,
    reach            INTEGER      DEFAULT 0,
    ctr              NUMERIC      DEFAULT 0,
    cost_per_result  NUMERIC      DEFAULT 0,
    synced_at        TIMESTAMPTZ  DEFAULT now(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc', now()),

    CONSTRAINT creatives_pkey PRIMARY KEY (id),
    CONSTRAINT creatives_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE
);

-- Índice único para upsert via (campaign_id, platform, external_id)
CREATE UNIQUE INDEX IF NOT EXISTS creatives_campaign_platform_external_unique
    ON public.creatives (campaign_id, platform, external_id);

-- 4.4 META_ACCOUNTS
-- Contas Meta Ads conectadas via OAuth. Token criptografado antes de salvar.
CREATE TABLE IF NOT EXISTS public.meta_accounts (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID,                    -- nullable após migração 20260413120000
    account_id       TEXT         NOT NULL,   -- ID da conta no formato act_XXXX
    account_name     TEXT,
    access_token     TEXT,                    -- token criptografado (AES-256)
    token_expires_at TIMESTAMPTZ,
    status           TEXT         DEFAULT 'active',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc', now()),
    updated_at       TIMESTAMPTZ  DEFAULT now(),

    CONSTRAINT meta_accounts_pkey           PRIMARY KEY (id),
    CONSTRAINT meta_accounts_account_id_key UNIQUE (account_id)
    -- NOTA: user_id_fkey e UNIQUE(user_id, account_id) foram removidas na
    -- migração 20260413120000 para suportar múltiplas contas sem autenticação
    -- obrigatória no fluxo OAuth.
);

-- 4.5 LOGS
-- Registro de ações dos usuários no sistema
CREATE TABLE IF NOT EXISTS public.logs (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID,
    user_name  TEXT,
    action     TEXT         NOT NULL,
    details    JSONB,
    metadata   JSONB        DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT timezone('utc', now()),

    CONSTRAINT logs_pkey         PRIMARY KEY (id),
    CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ----------------------------------------------------------------------------
-- 5. TRIGGER: criar perfil automaticamente ao registrar novo usuário
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs          ENABLE ROW LEVEL SECURITY;


-- ---- 6.1 USERS ----

-- Qualquer usuário autenticado pode visualizar todos os perfis
CREATE POLICY "Users can view all users"
    ON public.users
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas admins podem criar, editar ou remover usuários
-- NOTA: usa get_my_role() para evitar recursão infinita
CREATE POLICY "Admins can manage users"
    ON public.users
    FOR ALL
    USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Usuário pode atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (id = auth.uid());


-- ---- 6.2 CAMPAIGNS ----

-- Qualquer autenticado pode visualizar campanhas
CREATE POLICY "Users can view all campaigns"
    ON public.campaigns
    FOR SELECT
    USING (true);

-- Qualquer autenticado pode gerenciar campanhas (criar, editar, deletar)
-- Restrinja aqui se quiser controle por role
CREATE POLICY "Authenticated users can manage campaigns"
    ON public.campaigns
    FOR ALL
    USING (auth.role() = 'authenticated');


-- ---- 6.3 CREATIVES ----

-- Acesso irrestrito para leitura (dados públicos de campanhas)
CREATE POLICY "Anyone authenticated can view creatives"
    ON public.creatives
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas service_role pode sincronizar criativos (via API server-side)
CREATE POLICY "Service role can manage creatives"
    ON public.creatives
    FOR ALL
    USING (auth.role() = 'service_role');


-- ---- 6.4 META_ACCOUNTS ----

-- Usuário vê apenas suas próprias contas Meta conectadas
CREATE POLICY "Users can view own meta accounts"
    ON public.meta_accounts
    FOR SELECT
    USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- Apenas o próprio usuário (ou service_role) pode gerenciar contas Meta
CREATE POLICY "Users can manage own meta accounts"
    ON public.meta_accounts
    FOR ALL
    USING (user_id = auth.uid() OR auth.role() = 'service_role');


-- ---- 6.5 LOGS ----

-- Apenas admins podem visualizar logs
CREATE POLICY "Admins can view logs"
    ON public.logs
    FOR SELECT
    USING (public.get_my_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Qualquer autenticado pode inserir logs de suas ações
CREATE POLICY "System can insert logs"
    ON public.logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');


-- ----------------------------------------------------------------------------
-- 7. PERMISSÕES DE ACESSO (GRANTS)
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT                         ON public.users         TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users         TO authenticated;
GRANT ALL                            ON public.users         TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns     TO authenticated;
GRANT ALL                            ON public.campaigns     TO service_role;

GRANT SELECT                         ON public.creatives     TO authenticated;
GRANT ALL                            ON public.creatives     TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_accounts TO authenticated;
GRANT ALL                            ON public.meta_accounts TO service_role;

GRANT SELECT, INSERT                 ON public.logs          TO authenticated;
GRANT ALL                            ON public.logs          TO service_role;

GRANT ALL ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_my_role()     TO anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 8. PUBLICAÇÕES REALTIME (opcional — ativar no Dashboard do Supabase)
-- ----------------------------------------------------------------------------
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.creatives;


-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
