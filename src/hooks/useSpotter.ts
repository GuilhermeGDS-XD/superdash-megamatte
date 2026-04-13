import { useState, useEffect, useCallback } from 'react';
import type { SpotterMetrics } from '@/services/spotterService';

export interface VendedorData {
  name: string;
  leads: number;
  meetings: number;
  sales: number;
}

export interface StageData {
  name: string;
  count: number;
}

export interface DiscardReasonData {
  reason: string;
  count: number;
}

export interface SpotterDashboardData {
  metrics: SpotterMetrics;
  byVendedor: VendedorData[];
  byStage: StageData[];
  topDiscardReasons: DiscardReasonData[];
  bySource: { name: string; count: number }[];
  totalLeadsRaw: number;
}

export function useSpotter(since?: string) {
  const [data, setData] = useState<SpotterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // leads processados até agora

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setProgress(0);

    try {
      const params = new URLSearchParams({ type: 'metrics' });
      if (since) params.set('since', since);

      const response = await fetch(`/api/spotter?${params}`);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = JSON.parse(line.slice(6));

          if (json.type === 'progress') {
            setProgress(json.fetched);
          } else if (json.type === 'done') {
            setData(json);
            setLoading(false);
          } else if (json.type === 'error') {
            throw new Error(json.message);
          }
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar dados do Spotter');
      setLoading(false);
    }
  }, [since]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, progress, refresh: fetchData };
}

export function useSpotterLeads(params?: { top?: number; filter?: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({ type: 'leads' });
      if (params?.top) query.set('top', String(params.top));
      if (params?.filter) query.set('filter', params.filter);

      const response = await fetch(`/api/spotter?${query}`);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro ${response.status}`);
      }

      const json = await response.json();
      setLeads(json.leads ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, [params?.top, params?.filter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, error, refresh: fetchLeads };
}

export function useSpotterFunnels() {
  const [funnels, setFunnels] = useState<{ id: number; value: string; active: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch('/api/spotter?type=funnels')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setFunnels(json.funnels ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Erro ao carregar funis');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { funnels, loading, error };
}

export function useSpotterOrigins() {
  const [origins, setOrigins] = useState<{ id: number; value: string; active: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch('/api/spotter?type=origins')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setOrigins(json.origins ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Erro ao carregar origens');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { origins, loading, error };
}

