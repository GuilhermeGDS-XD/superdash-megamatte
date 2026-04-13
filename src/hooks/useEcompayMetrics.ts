import { useState, useEffect } from 'react';

export interface EcompayMetrics {
  completedPurchases: number;
  processingPurchases: number;
  totalProcessed: number;
  totalProcessing: number;
  totalExpected: number;
}

export function useEcompayMetrics(productId?: string) {
  const [metrics, setMetrics] = useState<EcompayMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    const controller = new AbortController();
    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const url = `/api/ecompay/metrics${productId ? `?productId=${productId}` : ''}`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) throw new Error('Erro ao carregar métricas');

        const data = await response.json();
        setMetrics(data);
        setError(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    return () => controller.abort();
  }, [productId]);

  return { metrics, isLoading, error };
}
