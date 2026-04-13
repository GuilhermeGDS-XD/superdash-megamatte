# 🎯 Planejamento: Funcionalidade "Top 3 Criativos"

Este documento descreve o plano estratégico para implementar a seção de Criativos de Alta Performance na Dashboard individual das campanhas.

## 📝 Visão Geral
Exibir os 3 criativos (anúncios) que geraram mais conversões para uma campanha específica, permitindo uma análise rápida de qual conteúdo visual ou textual está performando melhor.

---

## 🏗️ 1. Infraestrutura de Banco de Dados (Supabase)

Nova tabela no esquema `public` para persistir dados de desempenho de criativos, sincronizados via API.

```sql
CREATE TABLE public.creatives (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name text NOT NULL,                    -- Nome ou ID do criativo na plataforma
    image_url text,                        -- URL da imagem ou thumbnail do vídeo
    conversions integer DEFAULT 0,         -- Métricas de conversão
    spend numeric DEFAULT 0,               -- Gasto acumulado do criativo
    ctr numeric DEFAULT 0,                 -- Click-Through Rate
    platform text NOT NULL,                -- 'GOOGLE_ADS' ou 'META_ADS'
    created_at timestamp with time zone DEFAULT now()
);

-- Manter padrão de produção (UNRESTRICTED)
ALTER TABLE public.creatives DISABLE ROW LEVEL SECURITY;
```

---

## 🛠️ 2. Camada de Dados (Services & API)

### Meta Ads Service
- Adicionar busca por `ads` vinculados aos `campaign_id`.
- Mapear campos: `name`, `creative { image_url }`, `insights { conversions, spend, ctr }`.

### Google Ads Service
- Adicionar busca por `ad_group_ad`.
- Mapear campos: `ad_group_ad.ad.name`, `metrics.conversions`, `metrics.cost_micros`, `metrics.ctr`.

---

## 🎨 3. Interface Visual (UI/UX)

Nova seção em `src/app/campaign/[id]/page.tsx`:

- **Título**: "🔥 Criativos de Alta Performance" (Estilo Italic/Black como o restante do layout).
- **Cards (Top 3)**:
    - **Asset**: Imagem ou ícone representativo (Google/Meta).
    - **Badge de Ranking**: Indicadores visuais de 🥇, 🥈 e 🥉.
    - **Métricas**: Conversões Totais, CPA e ROI por criativo.
    - **Badges de Plataforma**: Identificação clara de onde vem o criativo.

---

## 💻 4. Lógica de Negócio (Front-end)

- Criar um novo hook `useCreatives(campaignId)` ou estender o `useMetrics`.
- Ordenação decrescente: `creatives.sort((a, b) => b.conversions - a.conversions)`.
- Fallback visual para criativos sem imagem (ex: Google Search Ads).

---

## 📅 5. Etapas de Execução

1.  **DB Setup**: Executar o SQL no Supabase.
2.  **Mocks**: Criar dados de exemplo para validar a UI sem depender das APIs.
3.  **UI Development**: Criar os componentes de Cards de Criativos.
4.  **API Integration**: Sincronizar dados reais das plataformas para a nova tabela.

---

**Status Atual**: 📅 Planejado
**Próximo Passo**: Executar SQL de criação da tabela `creatives`.
