-- ============================================================================
-- RESET TOTAL DO SISTEMA DE AUTENTICAÇÃO - MEGAMATTE
-- Execute este script inteiro no SQL Editor do Supabase
-- ============================================================================

-- 1. Remove políticas RLS antigas para evitar bloqueios
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 2. Garante a estrutura correta da tabela public.users
-- Renomeia encrypted_password para password caso ainda exista com o nome antigo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'encrypted_password'
  ) THEN
    ALTER TABLE public.users RENAME COLUMN encrypted_password TO password;
  END IF;
END $$;

-- Garante que a coluna password existe
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';

-- 3. Garante estrutura da tabela public.sessions (limpa de token_hash desnecessário)
DROP TABLE IF EXISTS public.sessions CASCADE;
CREATE TABLE public.sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilita RLS com política aberta para service_role
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_users" ON public.users FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all_sessions" ON public.sessions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 5. Upsert do usuário admin inicial
-- Senha em texto plano: qmR0574q1Jw8
INSERT INTO public.users (email, password, full_name, role)
VALUES ('ecom@agenciaecom.com.br', 'qmR0574q1Jw8', 'MegaMatte Admin', 'SUPER_ADMIN')
ON CONFLICT (email) DO UPDATE
SET password   = 'qmR0574q1Jw8',
    full_name  = 'MegaMatte Admin',
    role       = 'SUPER_ADMIN';

-- 6. Confirma o resultado
SELECT id, email, full_name, role, password FROM public.users WHERE email = 'ecom@agenciaecom.com.br';
