-- Adicionar campos de integração com Ecompay e Spotter à tabela campaigns
-- Esses campos permitem vincular campanhas a produtos Ecompay e origens Spotter

ALTER TABLE IF EXISTS public.campaigns 
  ADD COLUMN IF NOT EXISTS ecompay_product_id TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.campaigns 
  ADD COLUMN IF NOT EXISTS spotter_list_id TEXT DEFAULT NULL;

COMMENT ON COLUMN campaigns.ecompay_product_id IS 'ID do produto Ecompay vinculado a esta campanha';
COMMENT ON COLUMN campaigns.spotter_list_id IS 'ID ou nome da lista no Exact Spotter vinculada a esta campanha';

-- Notificar o PostgREST para recarregar o schema e reconhecer as novas colunas
NOTIFY pgrst, 'reload schema';
