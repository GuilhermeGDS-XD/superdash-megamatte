'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  TrendingUp,
  Target,
  MousePointer2,
  DollarSign,
  BarChart3,
  Layers,
  BarChart,
  Activity,
  ArrowUpRight,
  TrendingDown,
  Clock,
  Edit3,
  AlertCircle,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
  Line,
  Cell
} from 'recharts';
import { formatCurrency, formatNumber, cn, formatCampaignName } from '@/lib/utils';
import { isAdmin } from '@/lib/roles';
import { useMetrics } from '@/hooks/useMetrics';
import { useCampaignAnalysis } from '@/hooks/useCampaignAnalysis';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { createClient } from '@/lib/client';
import { useUser } from '@/hooks/useUser';
import { AdPlatform, MetaAdsMetrics } from '@/types';
import { TopCreatives } from '@/components/dashboard/TopCreatives';
import { CampaignAnalysisCard } from '@/components/dashboard/CampaignAnalysisCard';
import { EcompayMetricsCard } from '@/components/dashboard/EcompayMetricsCard';
import { useEcompayMetrics } from '@/hooks/useEcompayMetrics';
import { SpotterCommercialSummary } from '@/components/dashboard/SpotterCommercialSummary';
import LoadingDashboard from './loading';

type MetricKey = 'cost' | 'conversions' | 'clicks' | 'ctr' | 'cpc' | 'reach' | 'frequency' | 'cpm' | 'spend' | 'lead' | 'cost_per_lead';
type CampaignType = 'Conversão' | 'Alcance' | 'Engajamento' | 'Tráfego' | 'Lead/Cadastro' | 'Outros';

function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferCampaignType(name: string): CampaignType {
  const normalizedName = normalizeText(name);

  if (normalizedName.includes('conversao') || normalizedName.includes('conversion')) return 'Conversão';
  if (normalizedName.includes('alcance') || normalizedName.includes('reach')) return 'Alcance';
  if (normalizedName.includes('engajamento') || normalizedName.includes('engagement')) return 'Engajamento';
  if (normalizedName.includes('trafego') || normalizedName.includes('traffic') || normalizedName.includes('click')) return 'Tráfego';
  if (normalizedName.includes('lead') || normalizedName.includes('cadastro') || normalizedName.includes('captacao')) return 'Lead/Cadastro';

  return 'Outros';
}

function getRelevantMetricKeys(type: CampaignType, platformFilter: AdPlatform | 'ALL', hasMeta: boolean): MetricKey[] {
  const metaOnly: MetricKey[] = ['reach', 'frequency', 'cpm', 'spend', 'lead', 'cost_per_lead'];

  const byType: Record<CampaignType, MetricKey[]> = {
    'Conversão': ['cost', 'conversions', 'cpc', 'ctr', 'clicks'],
    'Lead/Cadastro': hasMeta ? ['cost', 'lead', 'cost_per_lead', 'ctr', 'cpm'] : ['cost', 'conversions', 'cpc', 'ctr', 'clicks'],
    'Alcance': hasMeta ? ['reach', 'frequency', 'cpm', 'cost', 'ctr'] : ['cost', 'clicks', 'ctr', 'cpc', 'conversions'],
    'Engajamento': ['cost', 'clicks', 'ctr', 'cpc', 'conversions'],
    'Tráfego': ['cost', 'clicks', 'cpc', 'ctr', 'conversions'],
    'Outros': hasMeta ? ['cost', 'conversions', 'clicks', 'ctr', 'cpc'] : ['cost', 'conversions', 'clicks', 'ctr', 'cpc'],
  };

  const base = byType[type];

  if (platformFilter === 'GOOGLE_ADS') {
    return base.filter((metric) => !metaOnly.includes(metric));
  }

  if (!hasMeta) {
    return base.filter((metric) => !metaOnly.includes(metric));
  }

  return base;
}

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 -13 256 256" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
    <path d="M5.888,166.405103 L90.88,20.9 C101.676138,27.2558621 156.115862,57.3844138 164.908138,63.1135172 L79.9161379,208.627448 C70.6206897,220.906621 -5.888,185.040138 5.888,166.396276 L5.888,166.405103 Z" fill="#FBBC04" />
    <path d="M250.084224,166.401789 L165.092224,20.9055131 C153.210293,1.13172 127.619121,-6.05393517 106.600638,5.62496138 C85.582155,17.3038579 79.182155,42.4624786 91.0640861,63.1190303 L176.056086,208.632961 C187.938017,228.397927 213.52919,235.583582 234.547672,223.904686 C254.648086,212.225789 261.966155,186.175582 250.084224,166.419444 L250.084224,166.401789 Z" fill="#4285F4" />
    <ellipse cx="42.6637241" cy="187.924414" rx="42.6637241" ry="41.6044138" fill="#34A853" />
  </svg>
);

const MetaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M8.06925,5.00237 C6.47461,4.89183 5.20472,5.81816 4.31715,6.9809 C3.42438,8.15046 2.79487,9.7015 2.44783,11.2489 C2.10089,12.7959 2.01419,14.4379 2.29341,15.813 C2.56477,17.1493 3.25726,18.5227 4.71368,18.9581 C6.10192,19.3731 7.34848,18.783 8.30022,17.9824 C9.25406,17.18 10.0806,16.0364 10.7459,14.9309 C11.2678,14.0637 11.7139,13.1803 12.0636,12.4265 C12.4134,13.1803 12.8595,14.0637 13.3814,14.9309 C14.0467,16.0364 14.8732,17.18 15.8271,17.9824 C16.7788,18.783 18.0254,19.3731 19.4136,18.9581 C20.87,18.5227 21.5625,17.1493 21.8339,15.813 C22.1131,14.4379 22.0264,12.7959 21.6795,11.2489 C21.3324,9.7015 20.7029,8.15046 19.8101,6.9809 C18.9226,5.81816 17.6527,4.89183 16.058,5.00237 C14.3243,5.12255 13.0879,6.47059 12.3715,7.49 C12.2613,7.64685 12.1586,7.80273 12.0636,7.95456 C11.9687,7.80273 11.866,7.64685 11.7558,7.49 C11.0394,6.47059 9.803,5.12255 8.06925,5.00237 Z M10.9193,10.0265 C10.6371,10.7417 9.95004,12.3747 9.03232,13.8996 C8.41066,14.9325 7.71866,15.8581 7.01275,16.4519 C6.30475,17.0474 5.7503,17.1805 5.28652,17.0419 C4.89094,16.9236 4.46993,16.4812 4.25341,15.415 C4.04476,14.3875 4.0958,13.0402 4.39936,11.6866 C4.70282,10.3335 5.23656,9.07262 5.90692,8.19443 C6.58247,7.30944 7.27559,6.95216 7.93095,6.99758 C8.69718,7.0507 9.46077,7.70266 10.1194,8.63992 C10.487,9.16295 10.7616,9.6916 10.9193,10.0265 Z M13.208,10.0265 C13.4902,10.7417 14.1773,12.3747 15.095,13.8996 C15.7166,14.9325 16.4086,15.8581 17.1145,16.4519 C17.8226,17.0474 18.377,17.1805 18.8408,17.0419 C19.2364,16.9236 19.6574,16.4812 19.8739,15.415 C20.0825,14.3875 20.0315,13.0402 19.7279,11.6866 C19.4245,10.3335 18.8907,9.07262 18.2204,8.19443 C17.5448,7.30944 16.8517,6.95216 16.1963,6.99758 C15.4301,7.0507 14.6665,7.70266 14.0079,8.63992 C13.6403,9.16295 13.3657,9.6916 13.208,10.0265 Z" fill="#0668E1" />
  </svg>
);

// Função pura de agregação de métricas — definida fora do componente para evitar stale closure
function calcStats(metrics: any[]) {
  const cost = metrics.reduce((a, c) => a + c.cost, 0);
  const conversions = metrics.reduce((a, c) => a + c.conversions, 0);
  const clicks = metrics.reduce((a, c) => a + c.clicks, 0);
  const impressions = metrics.reduce((a, c) => a + (c.impressions || 0), 0);
  const reach = metrics.reduce((a, c) => a + (c.reach || 0), 0);
  const lead = metrics.reduce((a, c) => a + (c.lead || 0), 0);
  const spend = metrics.reduce((a, c) => a + (c.spend || 0), 0);
  return {
    cost, conversions, clicks, impressions, reach, lead, spend,
    frequency: impressions > 0 ? impressions / (reach || 1) : 0,
    cpm: impressions > 0 ? (cost / impressions) * 1000 : 0,
    cost_per_lead: lead > 0 ? cost / lead : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? cost / clicks : 0,
    cpa: conversions > 0 ? cost / conversions : cost,
    convRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
  };
}

export default function CampaignDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const [period, setPeriod] = useState<number | 'lifetime'>(7);
  const [platformFilter, setPlatformFilter] = useState<AdPlatform | 'ALL'>('ALL');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['cost']);
  const [battleMetric, setBattleMetric] = useState<MetricKey>('conversions');
  const [mobileMetricModal, setMobileMetricModal] = useState<MetricKey | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    async function fetchCampaign() {
      const { data } = await supabase
        .from('campaigns')
        .select('*, meta_campaign_id, google_campaign_id, start_date, created_at')
        .eq('id', id)
        .single();
      console.log('Dados da Campanha carregados:', {
        id: data?.id,
        name: data?.name,
        meta_id: data?.meta_campaign_id,
        google_id: data?.google_campaign_id
      });
      if (data) setCampaign(data);
    }
    if (id) fetchCampaign();
  }, [id, supabase]);

  // Calcular número de dias para lifetime
  const actualPeriod = useMemo<number>(() => {
    if (period === 'lifetime' && campaign) {
      // Prioridade: meta_start_date > google_start_date > data no nome > created_at
      let startDateStr = campaign.meta_start_date || campaign.google_start_date;
      if (!startDateStr) {
        const dateMatch = (campaign.name || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          startDateStr = `${year}-${month}-${day}`;
        }
      }
      const rawDate = startDateStr || campaign.created_at;
      if (rawDate) {
        const start = new Date(rawDate);
        const now = new Date();
        const daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(daysElapsed, 1);
      }
    }
    return typeof period === 'number' ? period : 7;
  }, [period, campaign]);

  const { googleMetrics, metaMetrics, loading } = useMetrics(
    id as string,
    actualPeriod,
    campaign?.meta_campaign_id,  // ID real Meta — undefined enquanto carrega
    campaign?.google_campaign_id // ID real Google (sem credenciais = vazio)
  );

  // Calcular número de criativos únicos (se disponível nos dados)
  const creativeCount = useMemo(() => {
    const creativeIds = new Set<string>();
    
    googleMetrics.forEach((metric: any) => {
      if (metric.ad_id) creativeIds.add(metric.ad_id);
    });
    
    metaMetrics.forEach((metric: any) => {
      if (metric.ad_id) creativeIds.add(metric.ad_id);
    });
    
    return creativeIds.size;
  }, [googleMetrics, metaMetrics]);

  const hasGoogle = useMemo(() =>
    campaign?.platforms?.includes('GOOGLE_ADS'),
    [campaign]);

  const hasMeta = useMemo(() =>
    campaign?.platforms?.includes('META_ADS'),
    [campaign]);

  const isBattleEnabled = hasGoogle && hasMeta;
  const campaignType = useMemo<CampaignType>(() => inferCampaignType(campaign?.name || ''), [campaign?.name]);
  const relevantMetricKeys = useMemo(
    () => getRelevantMetricKeys(campaignType, platformFilter, hasMeta),
    [campaignType, platformFilter, hasMeta]
  );
  const campaignTypeStyles: Record<CampaignType, string> = {
    'Conversão': 'bg-violet-50 text-violet-700 border-violet-200',
    'Alcance': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'Engajamento': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Tráfego': 'bg-amber-50 text-amber-700 border-amber-200',
    'Lead/Cadastro': 'bg-pink-50 text-pink-700 border-pink-200',
    'Outros': 'bg-slate-100 text-slate-600 border-slate-200',
  };

  // Calcula quantos dias a campanha está ativa
  const campaignAgeDays = useMemo(() => {
    const startStr = campaign?.start_date || campaign?.created_at;
    if (!startStr) return 0;
    const start = new Date(startStr);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [campaign]);

  useEffect(() => {
    if (campaign) {
      if (hasGoogle && !hasMeta) {
        setPlatformFilter('GOOGLE_ADS');
      } else if (hasMeta && !hasGoogle) {
        setPlatformFilter('META_ADS');
      } else {
        setPlatformFilter('ALL');
      }
    }
  }, [campaign, hasGoogle, hasMeta]);

  // platformStats — usa os dados brutos da API (a API já filtra por time_range)
  const platformStats = useMemo(() => ({
    google: calcStats(googleMetrics),
    meta: calcStats(metaMetrics),
  }), [googleMetrics, metaMetrics]);

  // filteredMetrics — seleciona plataforma conforme filtro de plataforma ativo
  const filteredMetrics = useMemo(() => {
    if (platformFilter === 'GOOGLE_ADS') return { google: googleMetrics, meta: [] as any[] };
    if (platformFilter === 'META_ADS') return { google: [] as any[], meta: metaMetrics };
    return { google: googleMetrics, meta: metaMetrics };
  }, [googleMetrics, metaMetrics, platformFilter]);

  // totals — soma das plataformas filtradas pelo filtro de plataforma ativo
  const totals = useMemo(() => {
    const combined = [...filteredMetrics.google, ...filteredMetrics.meta];
    const stats = calcStats(combined);
    return {
      cost: stats.cost,
      conversions: stats.conversions,
      clicks: stats.clicks,
      impressions: stats.impressions,
      roas: stats.cost > 0 ? (stats.conversions * 150) / stats.cost : 0,
      ctr: stats.ctr,
      cpc: stats.cpc,
    };
  }, [filteredMetrics]);

  // Integração de análise inteligente (após totals ser definido)
  const { analysis } = useCampaignAnalysis({
    conversions: totals.conversions || 0,
    spend: totals.cost || 0,
    clicks: totals.clicks || 0,
    impressions: totals.impressions || 0,
    ctr: totals.ctr,
    creativeCount: creativeCount,
  });

  // Métricas Ecompay hoistadas para o FunnelSummary
  const { metrics: ecompayMetrics, isLoading: ecompayLoading } = useEcompayMetrics(
    campaign?.ecompay_product_id || undefined
  );

  // chartData — agrupa dados diários por data (mesma fonte que os cards)
  const chartData = useMemo(() => {
    const days: Record<string, any> = {};
    const addDay = (date: string) => {
      if (!days[date]) {
        days[date] = {
          date,
          googleCost: 0, googleConversions: 0, googleClicks: 0, googleImpressions: 0,
          metaCost: 0, metaConversions: 0, metaClicks: 0, metaImpressions: 0,
          reach: 0, spend: 0, lead: 0,
        };
      }
    };

    filteredMetrics.google.forEach(item => {
      addDay(item.date);
      days[item.date].googleCost += item.cost;
      days[item.date].googleConversions += item.conversions;
      days[item.date].googleClicks += item.clicks;
      days[item.date].googleImpressions += (item.impressions || 0);
    });

    filteredMetrics.meta.forEach(item => {
      addDay(item.date);
      days[item.date].metaCost += item.cost;
      days[item.date].metaConversions += item.conversions;
      days[item.date].metaClicks += item.clicks;
      days[item.date].metaImpressions += (item.impressions || 0);
      days[item.date].reach += (item.reach || 0);
      days[item.date].spend += (item.spend || 0);
      days[item.date].lead += (item.lead || 0);
    });

    return Object.values(days).map((d: any) => ({
      ...d,
      cost: d.googleCost + d.metaCost,
      conversions: d.googleConversions + d.metaConversions,
      clicks: d.googleClicks + d.metaClicks,
      ctr: (d.googleClicks + d.metaClicks) / ((d.googleImpressions + d.metaImpressions) || 1) * 100,
      cpc: (d.googleCost + d.metaCost) / ((d.googleClicks + d.metaClicks) || 1),
      frequency: d.metaImpressions / (d.reach || 1),
      cpm: (d.metaCost / (d.metaImpressions || 1)) * 1000,
      cost_per_lead: d.metaCost / (d.lead || 1),
      reach: d.reach, lead: d.lead, spend: d.spend,
      googleCtr: (d.googleClicks / (d.googleImpressions || 1)) * 100,
      metaCtr: (d.metaClicks / (d.metaImpressions || 1)) * 100,
      googleCpc: d.googleCost / (d.googleClicks || 1),
      metaCpc: d.metaCost / (d.metaClicks || 1),
      googleCpa: d.googleCost / (d.googleConversions || 1),
      metaCpa: d.metaCost / (d.metaConversions || 1),
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredMetrics]);

  const metricLabels: Record<MetricKey, string> = {
    cost: 'Investimento',
    conversions: 'Conversões',
    clicks: 'Cliques',
    ctr: 'CTR',
    cpc: 'CPC',
    reach: 'Alcance',
    frequency: 'Frequência',
    cpm: 'CPM',
    spend: 'Investimento (Meta)',
    lead: 'Leads',
    cost_per_lead: 'CPL'
  };

  const metricColors: Record<MetricKey, string> = {
    cost: '#2563eb',          // Azul
    conversions: '#10b981',  // Esmeralda
    clicks: '#f59e0b',       // Âmbar
    ctr: '#8b5cf6',          // Violeta
    cpc: '#6366f1',          // Indigo
    reach: '#ec4899',        // Rosa
    frequency: '#f43f5e',    // Rosa choque
    cpm: '#f97316',          // Laranja
    spend: '#2563eb',        // Azul (mesmo que cost)
    lead: '#0ea5e9',         // Sky (Azul claro)
    cost_per_lead: '#f43f5e' // Rose
  };

  useEffect(() => {
    setSelectedMetrics((previous) => {
      const filtered = previous.filter((metric) => relevantMetricKeys.includes(metric));
      if (filtered.length > 0) {
        return filtered;
      }
      return [relevantMetricKeys[0] || 'cost'];
    });
  }, [relevantMetricKeys]);

  const battleAllowedKeys = useMemo(
    () => relevantMetricKeys.filter((key) => ['cost', 'conversions', 'clicks', 'ctr', 'cpc'].includes(key)),
    [relevantMetricKeys]
  );

  useEffect(() => {
    if (!battleAllowedKeys.includes(battleMetric)) {
      setBattleMetric((battleAllowedKeys[0] as MetricKey) || 'cost');
    }
  }, [battleAllowedKeys, battleMetric]);

  const metricCardMeta: Record<MetricKey, { icon: any }> = {
    cost: { icon: DollarSign },
    conversions: { icon: Target },
    clicks: { icon: MousePointer2 },
    ctr: { icon: Activity },
    cpc: { icon: Activity },
    reach: { icon: Target },
    frequency: { icon: Activity },
    cpm: { icon: Activity },
    spend: { icon: DollarSign },
    lead: { icon: MousePointer2 },
    cost_per_lead: { icon: TrendingUp },
  };

  const toggleSelectedMetric = (metric: MetricKey) => {
    setSelectedMetrics((current) => {
      if (current.includes(metric)) {
        return current.length > 1 ? current.filter((item) => item !== metric) : current;
      }
      return [...current, metric];
    });
  };

  const primarySelectedMetric = selectedMetrics[0] || 'cost';

  const getMetricTotalValue = (metric: MetricKey): number => {
    switch (metric) {
      case 'cost': return totals.cost;
      case 'conversions': return totals.conversions;
      case 'clicks': return totals.clicks;
      case 'ctr': return totals.ctr;
      case 'cpc': return totals.cpc;
      case 'reach': return platformStats.meta.reach;
      case 'frequency': return platformStats.meta.frequency;
      case 'cpm': return platformStats.meta.cpm;
      case 'spend': return platformStats.meta.spend;
      case 'lead': return platformStats.meta.lead;
      case 'cost_per_lead': return platformStats.meta.cost_per_lead;
      default: return 0;
    }
  };

  const formatMetricValue = (metric: MetricKey, value: number): string => {
    if (['cost', 'cpc', 'cpm', 'spend', 'cost_per_lead'].includes(metric)) {
      return formatCurrency(value);
    }
    if (metric === 'ctr') return `${value.toFixed(2)}%`;
    if (metric === 'frequency') return `${value.toFixed(2)}x`;
    return formatNumber(value);
  };

  const mobileStatCards = relevantMetricKeys.map((key) => ({
    key,
    label: metricLabels[key],
    icon: metricCardMeta[key].icon,
  }));

  if (!campaign || loading) {
    return <LoadingDashboard />;
  }

  return (
    <div className="pb-12 sm:pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button onClick={() => router.push('/')} className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group text-slate-400 hover:text-slate-600 shrink-0">
            <ChevronLeft />
          </button>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-space italic uppercase leading-tight">
                {formatCampaignName(campaign?.name)}
              </h1>
              {user && (isAdmin(user.role) || user.id === campaign?.created_by) && (
                <button
                  onClick={() => router.push(`/campaign/${id}/edit`)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-500"
                  title="Editar Campanha"
                >
                  <Edit3 size={20} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="relative flex h-2 w-2">
                {campaign?.status === 'Ativa' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  campaign?.status === 'Ativa' ? "bg-green-500" : campaign?.status === 'Finalizada' ? "bg-red-400" : "bg-slate-300"
                )}></span>
              </span>
              <span className={cn(
                "text-xs font-bold tracking-widest uppercase",
                campaign?.status === 'Ativa' ? "text-green-500" : campaign?.status === 'Finalizada' ? "text-red-400" : "text-slate-400"
              )}>
                {campaign?.status === 'Ativa'
                  ? 'Performance Live'
                  : campaign?.status === 'Pausada'
                    ? 'Campanha Pausada'
                    : campaign?.status ?? 'Carregando...'}
              </span>
              <span className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                campaignTypeStyles[campaignType]
              )}>
                {campaignType}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 relative z-10">
          {/* Filtro de plataformas temporariamente oculto */}

          <div className="bg-white border-2 border-slate-100 p-1.5 rounded-[1.25rem] sm:rounded-[1.5rem] grid grid-cols-2 gap-1 shadow-sm w-full sm:w-auto">
            {[{ label: '7 Dias', value: 7 }, { label: 'Lifetime', value: 'lifetime' as const }].map((option) => (
              <button
                key={String(option.value)}
                onClick={() => setPeriod(option.value)}
                className={cn(
                  "px-3 sm:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  period === option.value ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESUMO — Funil da Jornada */}
      <FunnelSummary
        impressions={totals.impressions}
        clicks={totals.clicks}
        ctr={totals.ctr}
        totalSold={ecompayMetrics?.totalProcessed ?? 0}
        hasEcompay={!!campaign?.ecompay_product_id}
        ecompayLoading={ecompayLoading}
        score={analysis?.overallScore ?? 0}
        loading={loading}
      />

      {/* ETAPA 1 — ATRAÇÃO */}
      <div className="pt-10 sm:pt-14 space-y-6 sm:space-y-8">
        <StageLabel number="01" title="Atração" description="Criativos que capturam a atenção da audiência" color="#f59e0b" />
        <TopCreatives
          campaignId={id as string}
          metaCampaignId={campaign?.meta_campaign_id}
          campaignStatus={campaign?.status}
          campaignType={campaignType}
          periodDays={actualPeriod}
        />
      </div>

      {/* ETAPA 2 — ALCANCE & ENGAJAMENTO */}
      <div className="pt-10 sm:pt-14 space-y-6 sm:space-y-8">
        <StageLabel number="02" title="Alcance & Engajamento" description="Como a audiência interage com os anúncios" color="#2563eb" />

        {/* Stats Mobile: apenas ícones + títulos */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {mobileStatCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => setMobileMetricModal(card.key)}
              className="bg-white border border-slate-100 rounded-2xl p-4 text-left shadow-sm active:scale-[0.98] transition-transform"
            >
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center mb-3"
                style={{
                  color: metricColors[card.key],
                  backgroundColor: `${metricColors[card.key]}12`,
                }}
              >
                <Icon size={20} strokeWidth={2.6} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Métrica</p>
              <h4 className="text-sm font-black uppercase tracking-tight text-slate-800">{card.label}</h4>
            </button>
          );
        })}
      </div>

      {/* Main Stats with Selection */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {relevantMetricKeys.map((key) => (
          <SummaryCard
            key={key}
            label={metricLabels[key]}
            value={<AnimatedCounter value={getMetricTotalValue(key)} formatter={(value) => formatMetricValue(key, value)} />}
            icon={React.createElement(metricCardMeta[key].icon)}
            customColor={metricColors[key]}
            active={selectedMetrics.includes(key)}
            onClick={() => toggleSelectedMetric(key)}
          />
        ))}
      </div>

      {/* Modal de métrica mobile */}
      {mobileMetricModal && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setMobileMetricModal(null)} />
          <div className="absolute inset-x-3 top-8 bottom-8 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo total</p>
                <h4 className="text-xl font-black text-slate-900 italic">
                  {formatMetricValue(mobileMetricModal, getMetricTotalValue(mobileMetricModal))}
                </h4>
              </div>
              <button
                onClick={() => setMobileMetricModal(null)}
                className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pt-3 pb-1">
              <h3 className="text-base font-black uppercase tracking-tight" style={{ color: metricColors[mobileMetricModal] }}>
                {metricLabels[mobileMetricModal]}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Evolução no período selecionado</p>
            </div>

            <div className="flex-1 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="mobileMetricGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metricColors[mobileMetricModal]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={metricColors[mobileMetricModal]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => v.split('-').slice(1).reverse().join('/')} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} width={56} />
                  <Tooltip
                    content={(props) => (
                      <CustomTooltip
                        {...props}
                        metricKey={mobileMetricModal}
                        metricLabel={metricLabels[mobileMetricModal]}
                        metricColor={metricColors[mobileMetricModal]}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey={mobileMetricModal}
                    stroke={metricColors[mobileMetricModal]}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#mobileMetricGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Main Chart (desktop/tablet) */}
      <div className="hidden md:block bg-white p-5 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-10">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase italic font-space tracking-tight">
              Análise Temporal: <span style={{ color: metricColors[primarySelectedMetric] }}>{selectedMetrics.length > 1 ? `${selectedMetrics.length} métricas combinadas` : metricLabels[primarySelectedMetric]}</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecione múltiplos cards para combinar as métricas no mesmo gráfico</p>
          </div>

          <div className="flex items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-[2rem] opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700">
            {platformFilter === 'GOOGLE_ADS' && <GoogleIcon className="h-12 w-12" />}
            {platformFilter === 'META_ADS' && <MetaIcon className="h-12 w-12" />}
            {platformFilter === 'ALL' && <Layers className="text-slate-400" size={48} />}
          </div>
        </div>

        <div className="h-[320px] sm:h-[380px] lg:h-[450px] w-full">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-3xl animate-pulse">
              <Activity className="text-slate-200 animate-spin" size={48} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  {selectedMetrics.map((metric) => (
                    <linearGradient key={`gradient-${metric}`} id={`colorMetric-${metric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metricColors[metric]} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={metricColors[metric]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => v.split('-').slice(1).reverse().join('/')} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(v) => {
                    if (selectedMetrics.length === 1) {
                      const single = selectedMetrics[0];
                      if (['cost', 'cpc', 'cpm', 'spend', 'cost_per_lead'].includes(single)) return `R$${v.toFixed(0)}`;
                      if (single === 'ctr') return `${v.toFixed(1)}%`;
                    }
                    return formatNumber(v);
                  }}
                  width={60}
                />
                <Tooltip
                  content={(props) => (
                    <CustomMultiTooltip
                      {...props}
                      metricOrder={selectedMetrics}
                      metricLabels={metricLabels}
                      metricColors={metricColors}
                    />
                  )}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5 5' }}
                />
                {selectedMetrics.map((metric) => (
                  <Area
                    key={`metric-area-${metric}`}
                    type="monotone"
                    dataKey={metric}
                    stroke={metricColors[metric]}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill={`url(#colorMetric-${metric})`}
                    animationDuration={900}
                    dot={{ r: 2.5, strokeWidth: 1.5, fill: '#ffffff', stroke: metricColors[metric] }}
                    activeDot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: metricColors[metric] }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      </div> {/* fecha etapa 2 */}

      {/* ETAPA 3 — CONVERSÃO */}
      {campaign?.ecompay_product_id && (
        <div className="pt-10 sm:pt-14 space-y-6 sm:space-y-8">
          <StageLabel number="03" title="Conversão" description="Resultado das vendas geradas pela campanha" color="#10b981" />
          <EcompayMetricsCard productId={campaign.ecompay_product_id} />
        </div>
      )}

      {/* ETAPA 4 — DIAGNÓSTICO */}
      <div className="pt-10 sm:pt-14 space-y-6 sm:space-y-8">
        <StageLabel number="04" title="Diagnóstico" description="Análise estratégica e comparativo de canais" color="#7c3aed" />

        {analysis && (
          <CampaignAnalysisCard analysis={analysis} isLoading={loading} />
        )}

        {/* Batalha de Canais temporariamente oculta */}
        <div className="hidden bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800 relative">
        {!isBattleEnabled && !loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md transition-all duration-500 rounded-[3rem]">
            <div className="text-center space-y-4 p-10 max-w-md animate-in zoom-in-95 duration-700">
              <div className="h-20 w-20 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                <AlertCircle className="text-blue-400" size={40} />
              </div>
              <h2 className="text-4xl font-black text-white uppercase italic font-space tracking-tighter">Batalha Indisponível</h2>
              <p className="text-slate-400 font-bold text-sm leading-relaxed px-4">
                Detectamos apenas uma plataforma conectada. {user && <span className="text-blue-400 italic">Cadastre outra plataforma</span>} para habilitar a comparação direta de performance.
              </p>
              {user && (isAdmin(user.role) || user.id === campaign?.created_by) && (
                <button
                  onClick={() => router.push(`/campaign/${id}/edit`)}
                  className="bg-white text-slate-900 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all shadow-2xl active:scale-95 mt-4"
                >
                  Configurar Campanha
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-5 sm:p-8 lg:p-10 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 sm:gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-white uppercase italic font-space tracking-tight">Batalha de Canais</h3>
              <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center gap-1">
                <Clock size={10} /> {period} Dias
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Comparativo direto de performance</p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="bg-slate-800/50 p-1 rounded-2xl flex gap-1 border border-slate-700/50">
              {[7, 15, 30].map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={cn("px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", period === p ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}>{p}d</button>
              ))}
            </div>
            <div className="flex gap-4 border-l border-slate-800 pl-6">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" /><span className="text-[9px] font-black text-slate-400 uppercase">Google</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" /><span className="text-[9px] font-black text-slate-400 uppercase">Meta</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Custo por Aquisição (CPA)</p>
                <div className="flex gap-6">
                  <div>
                    <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Google</span>
                    <span className="text-xl font-black text-white font-space italic">{formatCurrency(platformStats.google.cpa)}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Meta</span>
                    <span className="text-xl font-black text-white font-space italic">{formatCurrency(platformStats.meta.cpa)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGoogleCpa" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} /><stop offset="95%" stopColor="#fbbf24" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorMetaCpa" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="googleCpa" stroke="#fbbf24" strokeWidth={3} fill="url(#colorGoogleCpa)" dot={false} stackId="1" />
                  <Area type="monotone" dataKey="metaCpa" stroke="#3b82f6" strokeWidth={3} fill="url(#colorMetaCpa)" dot={false} stackId="1" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Batalha: <span className="text-blue-400">{metricLabels[battleMetric]}</span></p>
                <div className="flex gap-6">
                  <div>
                    <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Google</span>
                    <span className="text-xl font-black text-white font-space italic">
                      {battleMetric === 'cost' ? formatCurrency(platformStats.google.cost) :
                        battleMetric === 'conversions' ? formatNumber(platformStats.google.conversions) :
                          battleMetric === 'clicks' ? formatNumber(platformStats.google.clicks) :
                            battleMetric === 'ctr' ? `${platformStats.google.ctr.toFixed(2)}%` :
                              formatCurrency(platformStats.google.cpc)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Meta</span>
                    <span className="text-xl font-black text-white font-space italic">
                      {battleMetric === 'cost' ? formatCurrency(platformStats.meta.cost) :
                        battleMetric === 'conversions' ? formatNumber(platformStats.meta.conversions) :
                          battleMetric === 'clicks' ? formatNumber(platformStats.meta.clicks) :
                            battleMetric === 'ctr' ? `${platformStats.meta.ctr.toFixed(2)}%` :
                              formatCurrency(platformStats.meta.cpc)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <XAxis dataKey="date" hide />
                  <Tooltip cursor={{ stroke: '#334155' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey={battleMetric === 'cost' ? 'googleCost' : battleMetric === 'conversions' ? 'googleConversions' : battleMetric === 'clicks' ? 'googleClicks' : battleMetric === 'ctr' ? 'googleCtr' : 'googleCpc'} stroke="#fbbf24" strokeWidth={3} dot={false} animationDuration={1000} />
                  <Line type="monotone" dataKey={battleMetric === 'cost' ? 'metaCost' : battleMetric === 'conversions' ? 'metaConversions' : battleMetric === 'clicks' ? 'metaClicks' : battleMetric === 'ctr' ? 'metaCtr' : 'metaCpc'} stroke="#3b82f6" strokeWidth={3} dot={false} animationDuration={1000} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-5 sm:p-8 lg:p-10 gap-4 sm:gap-6 lg:gap-10 border-t border-slate-800">
          {battleAllowedKeys.map((metric) => (
            <MiniMetric
              key={metric}
              name={metricLabels[metric]}
              google={
                metric === 'cost' ? platformStats.google.cost :
                metric === 'conversions' ? platformStats.google.conversions :
                metric === 'clicks' ? platformStats.google.clicks :
                metric === 'ctr' ? platformStats.google.ctr :
                platformStats.google.cpc
              }
              meta={
                metric === 'cost' ? platformStats.meta.cost :
                metric === 'conversions' ? platformStats.meta.conversions :
                metric === 'clicks' ? platformStats.meta.clicks :
                metric === 'ctr' ? platformStats.meta.ctr :
                platformStats.meta.cpc
              }
              isCurrency={metric === 'cost' || metric === 'cpc'}
              isNumber={metric === 'conversions' || metric === 'clicks'}
              active={battleMetric === metric}
              onClick={() => setBattleMetric(metric)}
            />
          ))}
        </div>
      </div>

      </div> {/* fecha etapa 4 */}

      {/* ETAPA 5 — RESUMO COMERCIAL (Spotter) */}
      {campaign?.spotter_list_id && (
        <SpotterCommercialSummary
          originId={campaign.spotter_list_id}
          period={actualPeriod}
          campaignId={id as string}
          campaignName={campaign?.name || ''}
        />
      )}

    </div>
  );
}

function CustomMultiTooltip({ active, payload, label, metricOrder, metricLabels, metricColors }: any) {
  if (!active || !payload || !payload.length) return null;

  const [year, month, day] = (label || '').split('-');
  const formattedDate = year ? `${day}/${month}/${year}` : label;

  const formatValue = (metric: MetricKey, value: number) => {
    if (['cost', 'cpc', 'cpm', 'spend', 'cost_per_lead'].includes(metric)) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    if (metric === 'ctr') return `${value.toFixed(2)}%`;
    if (metric === 'frequency') return `${value.toFixed(2)}x`;
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 min-w-[220px]">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{formattedDate}</p>
      <div className="space-y-2.5">
        {metricOrder.map((metric: MetricKey) => {
          const item = payload.find((entry: any) => entry?.dataKey === metric);
          if (!item) return null;

          return (
            <div key={metric} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: metricColors[metric] }} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{metricLabels[metric]}</span>
              </div>
              <span className="text-sm font-black text-slate-900 font-space italic">{formatValue(metric, Number(item.value) || 0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, metricKey, metricLabel, metricColor }: any) {
  if (!active || !payload || !payload.length) return null;
  const [year, month, day] = (label || '').split('-');
  const formattedDate = year ? `${day}/${month}/${year}` : label;
  const value = payload[0]?.value ?? 0;

  const formatValue = (v: number) => {
    if (['cost', 'cpc', 'cpm', 'spend', 'cost_per_lead'].includes(metricKey)) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    }
    if (metricKey === 'ctr') return `${v.toFixed(2)}%`;
    if (metricKey === 'frequency') return `${v.toFixed(2)}x`;
    return new Intl.NumberFormat('pt-BR').format(Math.round(v));
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 min-w-[180px]">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{formattedDate}</p>
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: metricColor }} />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{metricLabel}</span>
      </div>
      <p className="text-2xl font-black text-slate-900 font-space italic">{formatValue(value)}</p>
    </div>
  );
}

function MiniMetric({ name, google, meta, isCurrency, isFloat, isNumber, active, onClick }: any) {
  const max = Math.max(google, meta, 0.0001);
  return (
    <div onClick={onClick} className={cn("space-y-4 cursor-pointer p-4 rounded-2xl transition-all duration-300 hover:bg-slate-800/50", active && "bg-slate-800 ring-1 ring-slate-700 shadow-xl")}>
      <p className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", active ? "text-blue-400" : "text-slate-500")}>{name}</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between group">
          <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden mr-3"><div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min((google / max) * 100, 100)}%` }} /></div>
          <span className="text-[10px] font-black text-white font-space italic">{isCurrency ? formatCurrency(google) : isFloat ? `${google.toFixed(1)}x` : isNumber ? formatNumber(google) : `${google.toFixed(2)}%`}</span>
        </div>
        <div className="flex items-center justify-between group">
          <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden mr-3"><div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((meta / max) * 100, 100)}%` }} /></div>
          <span className="text-[10px] font-black text-white font-space italic">{isCurrency ? formatCurrency(meta) : isFloat ? `${meta.toFixed(1)}x` : isNumber ? formatNumber(meta) : `${meta.toFixed(2)}%`}</span>
        </div>
      </div>
    </div>
  );
}

function FunnelSummary({
  impressions, clicks, ctr, totalSold, hasEcompay, ecompayLoading, score, loading,
}: {
  impressions: number;
  clicks: number;
  ctr: number;
  totalSold: number;
  hasEcompay: boolean;
  ecompayLoading: boolean;
  score: number;
  loading: boolean;
}) {
  const fmtNum = (n: number) => new Intl.NumberFormat('pt-BR').format(Math.round(n));
  const fmtCurr = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const stages = [
    {
      number: '01',
      title: 'Atração',
      label: 'Impressões',
      metric: loading ? null : fmtNum(impressions),
      sub: null,
      color: '#f59e0b',
      widthClass: 'w-full',
    },
    {
      number: '02',
      title: 'Alcance & Engajamento',
      label: 'Cliques',
      metric: loading ? null : fmtNum(clicks),
      sub: loading ? null : `CTR ${ctr.toFixed(2)}%`,
      color: '#2563eb',
      widthClass: 'sm:w-[90%] w-full mx-auto',
    },
    {
      number: '03',
      title: 'Conversão',
      label: 'Total Vendido',
      metric: !hasEcompay ? '—' : ecompayLoading ? null : fmtCurr(totalSold),
      sub: !hasEcompay ? 'Ecompay não configurado' : null,
      color: '#10b981',
      widthClass: 'sm:w-[76%] w-full mx-auto',
    },
    {
      number: '04',
      title: 'Diagnóstico',
      label: 'Score de Performance',
      metric: loading ? null : String(score),
      sub: loading ? null : '/100',
      color: '#7c3aed',
      widthClass: 'sm:w-[60%] w-full mx-auto',
    },
  ];

  const scoreColor =
    score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 25 ? '#f97316' : '#ef4444';

  return (
    <div className="pt-10 sm:pt-14">
      {/* Label do nível "Resumo" — mesmo visual do StageLabel */}
      <div className="flex items-center gap-3 sm:gap-5 mb-8 sm:mb-10">
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm font-space italic border-2"
          style={{ color: '#94a3b8', backgroundColor: '#94a3b815', borderColor: '#94a3b840' }}
        >
          ✦
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-0.5">
            Visão Geral
          </p>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic font-space tracking-tight leading-none">
            Resumo
          </h2>
        </div>
        <p className="hidden lg:block text-sm font-bold text-slate-400 ml-1 whitespace-nowrap">
          Funil completo da jornada do lead
        </p>
        <div className="hidden sm:flex flex-1 items-center ml-2">
          <div
            className="flex-1 h-px rounded-full"
            style={{ background: 'linear-gradient(to right, #94a3b840, #94a3b808)' }}
          />
        </div>
      </div>

      {/* Funil */}
      <div className="flex flex-col items-center">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.number}>
            <div className={`${stage.widthClass} transition-all duration-500`}>
              <div
                className="rounded-[1.75rem] px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between gap-4 border-2"
                style={{ backgroundColor: `${stage.color}08`, borderColor: `${stage.color}30` }}
              >
                {/* Esquerda: badge + info */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0 font-black text-xs font-space italic border-2"
                    style={{ color: stage.color, backgroundColor: `${stage.color}15`, borderColor: `${stage.color}45` }}
                  >
                    {stage.number}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] leading-none mb-0.5 truncate"
                      style={{ color: `${stage.color}BB` }}
                    >
                      Etapa {parseInt(stage.number, 10)} · {stage.title}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      {stage.label}
                    </p>
                  </div>
                </div>

                {/* Direita: valor */}
                <div className="text-right shrink-0">
                  {stage.metric === null ? (
                    <div className="h-8 w-24 bg-slate-100 rounded-xl animate-pulse" />
                  ) : (
                    <span
                      className="text-2xl sm:text-3xl font-black font-space italic leading-none"
                      style={{ color: stage.number === '04' ? scoreColor : stage.color }}
                    >
                      {stage.metric}
                    </span>
                  )}
                  {stage.sub && stage.metric !== null && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      {stage.sub}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {i < stages.length - 1 && (
              <div
                className="flex items-center justify-center h-7 shrink-0"
                style={{ color: stages[i + 1].color, opacity: 0.35 }}
              >
                <ChevronDown size={22} strokeWidth={3} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function StageLabel({ number, title, description, color }: { number: string; title: string; description: string; color: string }) {
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <div
        className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm font-space italic border-2"
        style={{ color, backgroundColor: `${color}15`, borderColor: `${color}40` }}
      >
        {number}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-0.5">
          Etapa {parseInt(number, 10)}
        </p>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic font-space tracking-tight leading-none">
          {title}
        </h2>
      </div>
      <p className="hidden lg:block text-sm font-bold text-slate-400 ml-1 whitespace-nowrap">{description}</p>
      <div className="hidden sm:flex flex-1 items-center ml-2">
        <div className="flex-1 h-px rounded-full" style={{ background: `linear-gradient(to right, ${color}40, ${color}08)` }} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, customColor, active, onClick }: any) {
  const baseColor = customColor || '#2563eb';
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg cursor-pointer transition-all duration-500 hover:-translate-y-2",
        active && "ring-2 ring-offset-4 shadow-xl"
      )}
      style={active ? {
        borderColor: `${baseColor}40`,
        backgroundColor: `${baseColor}05`,
        boxShadow: `0 20px 25px -5px ${baseColor}20, 0 10px 10px -5px ${baseColor}10`
      } : {}}
    >
      <div className="flex justify-between items-start mb-8">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm border"
          style={{ color: baseColor, backgroundColor: `${baseColor}10`, borderColor: `${baseColor}20` }}
        >
          {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
      <div className="text-3xl font-black text-slate-900 font-space italic h-9">{value}</div>
    </div>
  );
}
