/**
 * Hook para integrar análise de campanha com dados já disponíveis no dashboard
 */

import { useState, useEffect, useMemo } from 'react';
import { CampaignAnalysisService, CampaignAnalysis, CampaignMetrics } from '@/services/campaignAnalysisService';

interface UseCampaignAnalysisInput {
  conversions: number;
  spend: number;
  clicks: number;
  impressions: number;
  ctr?: number;
  creativeCount?: number;
}

export function useCampaignAnalysis(input: UseCampaignAnalysisInput) {
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null);

  // Memoized computation (roda apenas quando dados mudam)
  const computedAnalysis = useMemo(() => {
    const metrics: CampaignMetrics = {
      conversions: input.conversions,
      spend: input.spend,
      clicks: input.clicks,
      impressions: input.impressions,
      ctr: input.ctr,
      creativeCount: input.creativeCount,
    };

    return CampaignAnalysisService.analyze(metrics);
  }, [input.conversions, input.spend, input.clicks, input.impressions, input.ctr, input.creativeCount]);

  // Effect para atualizar estado (sem loading, tudo é síncrono)
  useEffect(() => {
    setAnalysis(computedAnalysis);
  }, [computedAnalysis]);

  return { analysis, isLoading: false };
}
