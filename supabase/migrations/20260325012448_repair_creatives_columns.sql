-- Reparo: garante que as colunas extras da tabela creatives realmente existam.
-- A migração 20260324120000 foi marcada como aplicada, mas as colunas não foram criadas.

ALTER TABLE IF EXISTS public.creatives ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0;
ALTER TABLE IF EXISTS public.creatives ADD COLUMN IF NOT EXISTS leads integer DEFAULT 0;
ALTER TABLE IF EXISTS public.creatives ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0;
ALTER TABLE IF EXISTS public.creatives ADD COLUMN IF NOT EXISTS cost_per_result numeric DEFAULT 0;
ALTER TABLE IF EXISTS public.creatives ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone DEFAULT now();

-- Recarregar schema cache do PostgREST para reconhecer as colunas novas
NOTIFY pgrst, 'reload schema';
