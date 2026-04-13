-- Adiciona colunas dinâmicas de custo por resultado baseadas no tipo de campanha
-- Permite ranking inteligente: custo ÷ resultado (específico ao tipo de campanha)
-- Sem aplicar RLS pois creatives já tem UNRESTRICTED

DO $$ BEGIN
  -- Verificar se tabela existe
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creatives') THEN
    RAISE EXCEPTION 'Tabela creatives não existe';
  END IF;
  
  -- Adicionar coluna reach (para campanhas de Alcance)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creatives' AND column_name = 'reach') THEN
    ALTER TABLE public.creatives ADD COLUMN reach integer DEFAULT 0;
    RAISE NOTICE 'Coluna reach adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna reach já existe';
  END IF;

  -- Adicionar coluna clicks (para campanhas de Tráfego/Engajamento)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creatives' AND column_name = 'clicks') THEN
    ALTER TABLE public.creatives ADD COLUMN clicks integer DEFAULT 0;
    RAISE NOTICE 'Coluna clicks adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna clicks já existe';
  END IF;

  -- Adicionar coluna leads (para campanhas de Lead/Cadastro)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creatives' AND column_name = 'leads') THEN
    ALTER TABLE public.creatives ADD COLUMN leads integer DEFAULT 0;
    RAISE NOTICE 'Coluna leads adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna leads já existe';
  END IF;

  -- Adicionar coluna conversions (sempre necessário como fallback)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creatives' AND column_name = 'conversions') THEN
    ALTER TABLE public.creatives ADD COLUMN conversions integer DEFAULT 0;
    RAISE NOTICE 'Coluna conversions adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna conversions já existe';
  END IF;

  -- Adicionar coluna cost_per_result (dinâmica - calculada conforme tipo de campanha)
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creatives' AND column_name = 'cost_per_result') THEN
    ALTER TABLE public.creatives ADD COLUMN cost_per_result numeric DEFAULT 0;
    RAISE NOTICE 'Coluna cost_per_result adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna cost_per_result já existe';
  END IF;

  -- Adicionar coluna synced_at para rastreamento de período
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creatives' AND column_name = 'synced_at') THEN
    ALTER TABLE public.creatives ADD COLUMN synced_at timestamp with time zone DEFAULT now();
    RAISE NOTICE 'Coluna synced_at adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna synced_at já existe';
  END IF;

END $$;
