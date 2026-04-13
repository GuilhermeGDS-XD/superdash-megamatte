// src/hooks/useMetrics.ts
import { useState, useEffect, useRef } from 'react';
import { GoogleAdsMetrics, MetaAdsMetrics } from '@/types';

export function useMetrics(
  campaignId: string,
  period: number,
  metaCampaignId?: string,
  googleCampaignId?: string
) {
  const [googleMetrics, setGoogleMetrics] = useState<GoogleAdsMetrics[]>([]);
  const [metaMetrics, setMetaMetrics] = useState<MetaAdsMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Só faz o fetch se tiver um ID real de Meta
    if (metaCampaignId === undefined) {
      // A campanha principal ainda está sendo carregada pela página pai
      setLoading(true);
      return;
    }

    if (!campaignId || !metaCampaignId) {
      setMetaMetrics([]);
      setGoogleMetrics([]);
      setLoading(false);
      return;
    }

    // Cancela qualquer request anterior (evita race condition ao mudar período)
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const fetchData = async () => {
      try {
        console.log(`[useMetrics] Buscando dados — period=${period}, metaId=${metaCampaignId}`);

        const res = await fetch(
          `/api/meta-metrics?campaignId=${metaCampaignId}&supabaseId=${campaignId}&period=${period}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        // Verifica se não foi cancelado antes de atualizar o state
        if (!controller.signal.aborted) {
          // data pode ser array ou objeto com erro
          const metricsArray = Array.isArray(data) ? data : [];
          console.log(`[useMetrics] Recebidos ${metricsArray.length} dias de dados para period=${period}`);
          setMetaMetrics(metricsArray);
          setGoogleMetrics([]); // Google Ads sem credenciais reais = vazio
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('[useMetrics] Request cancelado (novo período selecionado)');
          return;
        }
        console.error('[useMetrics] Erro ao buscar métricas:', err);
        if (!controller.signal.aborted) {
          setMetaMetrics([]);
          setGoogleMetrics([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup: cancela o request se o componente desmontar ou deps mudarem
    return () => {
      controller.abort();
    };
  }, [campaignId, period, metaCampaignId]);

  return { googleMetrics, metaMetrics, loading };
}
