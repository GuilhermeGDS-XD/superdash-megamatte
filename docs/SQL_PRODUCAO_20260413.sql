-- ============================================================================
-- MIGRAÇÃO: Adicionar campos de integração Ecompay e Spotter
-- Projeto: ggxuvuwpfifliffwnbsn (PRODUÇÃO)
-- Data: 2026-04-13
-- ============================================================================
-- Este SQL adiciona os campos necessários para vincular campanhas a:
-- - Ecompay: para mostrar métricas de vendas
-- - Exact Spotter: para mostrar resumo comercial
-- ============================================================================

-- 1️⃣ Adicionar coluna ecompay_product_id (se não existir)
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS ecompay_product_id TEXT DEFAULT NULL;

-- 2️⃣ Adicionar coluna spotter_list_id (se não existir)
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS spotter_list_id TEXT DEFAULT NULL;

-- 3️⃣ Adicionar comentários descritivos
COMMENT ON COLUMN campaigns.ecompay_product_id IS 'ID do produto Ecompay vinculado a esta campanha - para exibir métricas de vendas (Etapa 3)';
COMMENT ON COLUMN campaigns.spotter_list_id IS 'ID da origem/lista do Exact Spotter vinculada a esta campanha - para exibir resumo comercial (Etapa 5)';

-- 4️⃣ Recarregar schema do PostgREST para reconhecer as novas colunas
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ✅ CONCLUSÃO
-- Os campos foram adicionados com sucesso. Agora você pode:
-- - Selecionar um produto Ecompay no formulário de criação/edição de campanhas
-- - Selecionar uma origem Exact Spotter no formulário de criação/edição de campanhas
-- - Ver a Etapa 3 (Conversão com Ecompay) no dashboard da campanha
-- - Ver a Etapa 5 (Resumo Comercial Spotter) no dashboard da campanha
-- ============================================================================
