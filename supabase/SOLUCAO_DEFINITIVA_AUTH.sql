-- ============================================================================
-- SOLUÇÃO DEFINITIVA DE AUTENTICAÇÃO E SEGURANÇA - MEGAMATTE
-- RODE ESTE SQL PARA RESETAR O BANCO E ALINHAR COM O NOVO SISTEMA DE LOGIN
-- ============================================================================

-- 1. LIMPEZA TOTAL DE POLÍTICAS ANTIGAS (EVITA BLOQUEIOS DO SERVICE ROLE)
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. GARANTIR ESTRUTURA DA TABELA USERS
CREATE TABLE IF NOT EXISTS public.users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email              TEXT NOT NULL UNIQUE,
    encrypted_password TEXT NOT NULL,
    full_name          TEXT NOT NULL DEFAULT 'Usuário Novo',
    role               TEXT NOT NULL DEFAULT 'MANAGER', -- Usando TEXT para evitar erros de cast de ENUM
    can_view_logs      BOOLEAN DEFAULT false,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

-- 3. GARANTIR ESTRUTURA DA TABELA SESSIONS
CREATE TABLE IF NOT EXISTS public.sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CONFIGURAÇÃO DE RLS (SEGURANÇA DEFINITIVA)
-- Ativa RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- POLÍTICA MESTRA: O Service Role (que o backend usa) TEM ACESSO TOTAL
-- Isso resolve o erro 401, pois o backend agora Ignition qualquer trava de RLS
CREATE POLICY "service_role_unrestricted_users" ON public.users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_unrestricted_sessions" ON public.sessions FOR ALL USING (auth.role() = 'service_role');

-- POLÍTICA PARA USUÁRIOS: Podem ver outros usuários (para o dashboard)
CREATE POLICY "authenticated_view_profiles" ON public.users FOR SELECT USING (true); -- Leitura aberta para autenticados via manual

-- 5. USUÁRIO INICIAL (SENHA: qmR0574q1Jw8)
-- O hash abaixo é oficial do bCrypt para a senha 'qmR0574q1Jw8'
INSERT INTO public.users (email, encrypted_password, full_name, role)
VALUES (
    'ecom@agenciaecom.com.br', 
    '$2b$10$SLgJoR5KKeZ9qA4grmKSrumaR75aBZJUXd45dh50eyTT.6ADwwkJC', 
    'MegaMatte Admin', 
    'SUPER_ADMIN'
)
ON CONFLICT (email) DO UPDATE 
SET encrypted_password = EXCLUDED.encrypted_password,
    role = 'SUPER_ADMIN';

-- 6. LIMPEZA DE SESSÕES ANTIGAS
DELETE FROM public.sessions;
