import { useState, useEffect, useCallback } from 'react';
import { useSpotter, SpotterDashboardData } from './useSpotter';

export interface PeriodData {
  label: string;
  value: string;
  since?: string;
  data: SpotterDashboardData | null;
  loading: boolean;
  error: string | null;
}

interface PeriodConfig {
  label: string;
  value: string;
  since?: string;
}

export function useSpotterMultiPeriod(periods: PeriodConfig[]) {
  const [periodDataMap, setPeriodDataMap] = useState<Record<string, PeriodData>>(() => {
    const initial: Record<string, PeriodData> = {};
    periods.forEach((p) => {
      initial[p.value] = {
        ...p,
        data: null,
        loading: false,
        error: null,
      };
    });
    return initial;
  });

  const [loadingControllers, setLoadingControllers] = useState<Record<string, AbortController>>({});

  // Fetch para cada período
  const fetchPeriod = useCallback(
    async (value: string) => {
      const config = periods.find((p) => p.value === value);
      if (!config) return;

      // Comece com estado de carregamento
      setPeriodDataMap((prev) => ({
        ...prev,
        [value]: { ...prev[value], loading: true, error: null },
      }));

      // Cancele requisições anteriores se existirem
      const existingController = loadingControllers[value];
      if (existingController) {
        existingController.abort();
      }

      const controller = new AbortController();
      setLoadingControllers((prev) => ({
        ...prev,
        [value]: controller,
      }));

      try {
        const params = new URLSearchParams({ type: 'metrics' });
        if (config.since) params.set('since', config.since);

        const response = await fetch(`/api/spotter?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          setPeriodDataMap((prev) => ({
            ...prev,
            [value]: {
              ...prev[value],
              loading: false,
              error: err.error ?? `Erro ${response.status}`,
            },
          }));
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;

          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = JSON.parse(line.slice(6));

            if (json.type === 'done') {
              setPeriodDataMap((prev) => ({
                ...prev,
                [value]: {
                  ...prev[value],
                  data: json,
                  loading: false,
                },
              }));
              break;
            }
          }
        }
      } catch (err: any) {
        // Ignora erro se foi cancelado
        if (err.name === 'AbortError') return;

        setPeriodDataMap((prev) => ({
          ...prev,
          [value]: {
            ...prev[value],
            loading: false,
            error: err.message ?? 'Erro ao carregar dados',
          },
        }));
      }
    },
    [periods, loadingControllers]
  );

  // Carrega 7 dias imediatamente, depois os outros em background
  useEffect(() => {
    // Prioridade: 7 dias
    const sevenDaysConfig = periods.find((p) => p.value === '7d');
    if (sevenDaysConfig) {
      fetchPeriod('7d');
    }

    // Após 1s de delay, carrega os outros em paralelo
    const backgroundTimeout = setTimeout(() => {
      periods.forEach((p) => {
        if (p.value !== '7d') {
          fetchPeriod(p.value);
        }
      });
    }, 1000);

    return () => {
      clearTimeout(backgroundTimeout);
      // Limpa controllers ao desmontar
      Object.values(loadingControllers).forEach((ctrl) => ctrl.abort());
    };
  }, []);

  const refresh = useCallback(() => {
    // Cancela todas as requisições
    Object.values(loadingControllers).forEach((ctrl) => ctrl.abort());
    setLoadingControllers({});

    // Reinicia 7 dias primeiro
    const sevenDaysConfig = periods.find((p) => p.value === '7d');
    if (sevenDaysConfig) {
      fetchPeriod('7d');
    }

    // Depois os outros
    const backgroundTimeout = setTimeout(() => {
      periods.forEach((p) => {
        if (p.value !== '7d') {
          fetchPeriod(p.value);
        }
      });
    }, 1000);

    return () => clearTimeout(backgroundTimeout);
  }, [periods, fetchPeriod, loadingControllers]);

  return {
    periodDataMap,
    isAllLoaded: Object.values(periodDataMap).every((p) => !p.loading),
    refresh,
  };
}
