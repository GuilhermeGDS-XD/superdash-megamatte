'use client';

import { createClient } from '@/lib/client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { MetaConnectModal } from '@/components/MetaConnectModal';
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Calendar,
  User as UserIcon,
  Edit3,
  Loader2,
  Users,
  History,
  Layers,
  Info,
  Activity,
  CircleDollarSign,
  ChartNoAxesColumn,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCampaignName } from '@/lib/utils';
import { canViewLogs, isAdmin } from '@/lib/roles';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingDashboard from '@/app/campaign/[id]/loading';

const integerFormatter = new Intl.NumberFormat('pt-BR');
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferCampaignType(name: string): 'Conversão' | 'Alcance' | 'Engajamento' | 'Tráfego' | 'Lead/Cadastro' | 'Outros' {
  const normalizedName = normalizeText(name);

  if (normalizedName.includes('conversao') || normalizedName.includes('conversion')) {
    return 'Conversão';
  }
  if (normalizedName.includes('alcance') || normalizedName.includes('reach')) {
    return 'Alcance';
  }
  if (normalizedName.includes('engajamento') || normalizedName.includes('engagement')) {
    return 'Engajamento';
  }
  if (normalizedName.includes('trafego') || normalizedName.includes('traffic') || normalizedName.includes('click')) {
    return 'Tráfego';
  }
  if (normalizedName.includes('lead') || normalizedName.includes('cadastro') || normalizedName.includes('captacao')) {
    return 'Lead/Cadastro';
  }

  return 'Outros';
}

// Extrai a data de início real da campanha
// Prioridade: meta_start_date > google_start_date > data no nome > created_at
function getCampaignStartDate(campaign: any): Date {
  if (campaign.meta_start_date) {
    const d = new Date(campaign.meta_start_date);
    if (!isNaN(d.getTime())) return d;
  }
  if (campaign.google_start_date) {
    const d = new Date(campaign.google_start_date);
    if (!isNaN(d.getTime())) return d;
  }

  // Tentar extrair data do nome da campanha (padrão dd/mm/yyyy)
  const dateMatch = (campaign.name || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Fallback: usar created_at apenas se for válido
  if (campaign.created_at) {
    const d = new Date(campaign.created_at);
    if (!isNaN(d.getTime())) return d;
  }

  // Se nada funcionar, retornar data de hoje como fallback
  return new Date();
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

// Animação de 3 pontos pulsantes para indicar loading
function PulseDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const { connected: metaConnected, anyAdminConnected, loading: metaLoading } = useMetaConnection();
  const [dashboardMetrics, setDashboardMetrics] = useState<any>({
    leads: 0,
    conversions: 0,
    spend: 0,
    clicks: 0,
    ctr: 0,
    cpm: 0,
    reach: 0,
    impressions: 0,
    campaigns: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(false);
  const ITEMS_PER_PAGE = 9;
  const [isTypeCardExpanded, setIsTypeCardExpanded] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    // Escuta evento de volta do navegador para remover o loading caso o user desista
    const handlePopState = () => setNavigatingTo(null);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from('users').select('id, full_name').order('full_name');
      if (data) {
        // Mapeia full_name para name para manter compatibilidade com o componente
        const formattedUsers = data.map((u: any) => ({
          ...u,
          name: u.full_name
        }));
        setUsers(formattedUsers);
      }
    }
    fetchUsers();
  }, [supabase]);

  // Busca as métricas agregadas do dashboard (leads, conversions, spend, etc.)
  // Faz chamadas paralelas para /api/meta-metrics de cada campanha ativa com meta_campaign_id
  const metricsLoadedRef = React.useRef(false);
  
  useEffect(() => {
    if (campaigns.length === 0 || metricsLoadedRef.current) return;
    metricsLoadedRef.current = true;

    const fetchDashboardMetrics = async () => {
      try {
        setMetricsLoading(true);
        
        // Filtra campanhas ativas com meta_campaign_id
        const metaCampaigns = campaigns.filter(
          (c: any) => (c.status || '').toUpperCase() === 'ATIVA' && c.meta_campaign_id
        );

        if (metaCampaigns.length === 0) {
          console.log('[HomePage] Nenhuma campanha ativa com meta_campaign_id');
          return;
        }

        console.log(`[HomePage] Buscando métricas de ${metaCampaigns.length} campanhas ativas...`);

        // Busca em paralelo (batches de 10 para velocidade)
        const BATCH_SIZE = 10;
        const aggregated = { leads: 0, conversions: 0, spend: 0, clicks: 0, reach: 0, impressions: 0 };

        for (let i = 0; i < metaCampaigns.length; i += BATCH_SIZE) {
          const batch = metaCampaigns.slice(i, i + BATCH_SIZE);
          const promises = batch.map(async (campaign: any) => {
            try {
              const res = await fetch(
                `/api/meta-metrics?campaignId=${campaign.meta_campaign_id}&supabaseId=${campaign.id}&period=7`
              );
              if (!res.ok) return [];
              return await res.json();
            } catch {
              return [];
            }
          });

          const results = await Promise.all(promises);
          results.forEach((metricsArray: any) => {
            if (!Array.isArray(metricsArray)) return;
            metricsArray.forEach((metric: any) => {
              aggregated.leads += metric.lead || 0;
              aggregated.conversions += metric.conversions || 0;
              aggregated.spend += metric.spend || metric.cost || 0;
              aggregated.clicks += metric.clicks || 0;
              aggregated.reach += metric.reach || 0;
              aggregated.impressions += metric.impressions || 0;
            });
          });

          // Atualiza progressivamente a cada batch para feedback imediato
          const ctrPartial = aggregated.impressions > 0
            ? (aggregated.clicks / aggregated.impressions) * 100
            : 0;
          setDashboardMetrics({
            ...aggregated,
            ctr: ctrPartial,
            cpm: aggregated.impressions > 0 ? (aggregated.spend / aggregated.impressions) * 1000 : 0,
            campaigns: metaCampaigns.length,
          });
        }

        const ctr = aggregated.impressions > 0
          ? (aggregated.clicks / aggregated.impressions) * 100
          : 0;

        console.log(`[HomePage] Métricas agregadas — Leads: ${aggregated.leads}, Spend: ${aggregated.spend.toFixed(2)}, Conversões: ${aggregated.conversions}`);

        setDashboardMetrics({
          ...aggregated,
          ctr,
          cpm: aggregated.impressions > 0 ? (aggregated.spend / aggregated.impressions) * 1000 : 0,
          campaigns: metaCampaigns.length,
        });

        // Re-busca criativos do banco após o sync ter rodado em background
        // O /api/meta-metrics dispara AdSyncService.syncMetaTopCreatives fire-and-forget,
        // então ao final de todos os batches a maioria dos syncs já completou.
        const allIds = campaigns.map((c: any) => c.id);
        if (allIds.length > 0) {
          await new Promise(r => setTimeout(r, 2000));
          // Busca direta (fetchCreatives ainda não foi declarado neste ponto do código)
          const creativesRes: any[] = [];
          for (let ci = 0; ci < allIds.length; ci += 200) {
            const chunk = allIds.slice(ci, ci + 200);
            const { data } = await supabase
              .from('creatives')
              .select('campaign_id, conversions, spend, ctr, platform')
              .in('campaign_id', chunk);
            if (data) creativesRes.push(...data);
          }
          setCreatives(creativesRes);
        }
      } catch (error) {
        console.error('[HomePage] Erro ao buscar métricas:', error);
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchDashboardMetrics();
  }, [campaigns, supabase]);

  const sortCampaigns = (campaignList: any[]) => {
    const statuses: Record<string, number> = { 'ATIVA': 0, 'PAUSADA': 1, 'FINALIZADA': 2 };
    return [...campaignList].sort((a: any, b: any) => {
      const statusA = (a.status || '').toUpperCase();
      const statusB = (b.status || '').toUpperCase();

      // Priority 1: Status (ATIVA > PAUSADA > FINALIZADA)
      if (statuses[statusA] !== statuses[statusB]) {
        return (statuses[statusA] ?? 3) - (statuses[statusB] ?? 3);
      }

      // Priority 2: Maiores valores estatísticos (Maior -> Menor)
      const scoreA = (Number(a.conversions) || 0) * 100 + (Number(a.leads) || 0) * 50 + (Number(a.spend) || 0);
      const scoreB = (Number(b.conversions) || 0) * 100 + (Number(b.leads) || 0) * 50 + (Number(b.spend) || 0);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // Priority 3: Data de Início da Campanha (Mais novas primeiro)
      const dateA = getCampaignStartDate(a).getTime();
      const dateB = getCampaignStartDate(b).getTime();
      return dateB - dateA;
    });
  };

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  const fetchCreatives = useCallback(async (campaignIds: string[]) => {
    if (!campaignIds.length) {
      setCreatives([]);
      return;
    }

    const ID_CHUNK_SIZE = 200;
    const ROW_BATCH_SIZE = 1000;
    const allCreatives: any[] = [];

    for (let i = 0; i < campaignIds.length; i += ID_CHUNK_SIZE) {
      const campaignIdsChunk = campaignIds.slice(i, i + ID_CHUNK_SIZE);
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('creatives')
          .select('campaign_id, conversions, spend, ctr, platform')
          .in('campaign_id', campaignIdsChunk)
          .range(from, from + ROW_BATCH_SIZE - 1);

        if (error) {
          console.error('Erro ao buscar criativos para estatísticas:', error);
          setCreatives([]);
          return;
        }

        const chunkRows = data || [];
        allCreatives.push(...chunkRows);

        if (chunkRows.length < ROW_BATCH_SIZE) {
          hasMore = false;
        } else {
          from += ROW_BATCH_SIZE;
        }
      }
    }

    setCreatives(allCreatives);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      let baseQuery = supabase
        .from('campaigns')
        .select('*');

      if (debouncedSearch && debouncedSearch.length >= 3) {
        baseQuery = baseQuery.ilike('name', `%${debouncedSearch}%`);
      }

      if (platformFilter) {
        baseQuery = baseQuery.contains('platforms', [platformFilter]);
      }

      if (userFilter) {
        baseQuery = baseQuery.eq('created_by', userFilter);
      }

      if (statusFilter) {
        baseQuery = baseQuery.eq('status', statusFilter);
      }

      const BATCH_SIZE = 1000;
      let from = 0;
      let hasMore = true;
      const allCampaigns: any[] = [];

      while (hasMore) {
        const { data, error } = await baseQuery
          .order('created_at', { ascending: false })
          .range(from, from + BATCH_SIZE - 1);

        if (error) {
          console.error('Erro ao buscar campanhas:', error);
          break;
        }

        const chunk = data || [];
        allCampaigns.push(...chunk);

        if (chunk.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          from += BATCH_SIZE;
        }
      }

      if (allCampaigns.length > 0) {
        const sorted = sortCampaigns(allCampaigns);
        setCampaigns(sorted);
        setCurrentPage(1);
        await fetchCreatives(sorted.map((campaign: any) => campaign.id));
      } else {
        setCampaigns([]);
        setCreatives([]);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, debouncedSearch, platformFilter, userFilter, statusFilter, fetchCreatives]);

  // Initial Fetch & Update Effect
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Lógica do Dot de Status Refatorada
  const getStatusDot = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ATIVA') {
      return (
        <div className="absolute top-8 left-8 flex items-center gap-2 z-20 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm ring-1 ring-slate-100" title="Online">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
        </div>
      );
    }
    if (s === 'PAUSADA') {
      return (
        <div className="absolute top-8 left-8 flex items-center gap-2 z-20 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm ring-1 ring-slate-100" title="Offline">
          <span className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
          </span>
        </div>
      );
    }
    // FINALIZADA ou Outros
    return (
      <div className="absolute top-8 left-8 flex items-center gap-2 z-20 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm ring-1 ring-slate-100" title={status || 'Desconhecido'}>
        <span className="relative flex h-2.5 w-2.5">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
      </div>
    );
  };

  const campaignTotals = {
    leads: dashboardMetrics.leads || 0,
    conversions: dashboardMetrics.conversions || 0,
    spend: dashboardMetrics.spend || 0,
    budget: 0,
  };

  const creativesTotals = creatives.reduce(
    (acc, creative) => {
      acc.conversions += Number(creative.conversions) || 0;
      acc.spend += Number(creative.spend) || 0;
      acc.ctr += Number(creative.ctr) || 0;
      return acc;
    },
    { conversions: 0, spend: 0, ctr: 0 }
  );

  // Usa dados reais do dashboard em vez dos dados nulos da tabela
  const leadTotal = campaignTotals.leads > 0 ? campaignTotals.leads : creativesTotals.conversions;
  const conversionTotal = campaignTotals.conversions > 0 ? campaignTotals.conversions : creativesTotals.conversions;
  const spendTotal = campaignTotals.spend > 0 ? campaignTotals.spend : creativesTotals.spend;
  const activeCampaigns = campaigns.filter((campaign: any) => (campaign.status || '').toUpperCase() === 'ATIVA').length;
  const averageInvestment = activeCampaigns > 0 ? spendTotal / activeCampaigns : 0;
  const averageCtr = dashboardMetrics.ctr || (creatives.length > 0 ? creativesTotals.ctr / creatives.length : 0);
  const averageCpa = conversionTotal > 0 ? spendTotal / conversionTotal : 0;
  const pausedCampaigns = campaigns.filter((campaign: any) => (campaign.status || '').toUpperCase() === 'PAUSADA').length;
  const finalizedCampaigns = campaigns.filter((campaign: any) => (campaign.status || '').toUpperCase() === 'FINALIZADA').length;
  const campaignsWithCreatives = new Set(creatives.map((creative: any) => creative.campaign_id)).size;
  const totalPages = Math.ceil(campaigns.length / ITEMS_PER_PAGE);
  const paginatedCampaigns = campaigns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const statCards = [
    {
      title: 'Campanhas',
      value: integerFormatter.format(campaigns.length),
      subtitle: 'Total no resultado filtrado',
      icon: Layers,
      tone: 'from-slate-700 to-slate-900',
      iconBg: 'bg-slate-100 text-slate-700'
    },
    {
      title: 'Status Ativo',
      value: integerFormatter.format(activeCampaigns),
      subtitle: `Pausadas ${pausedCampaigns} • Finalizadas ${finalizedCampaigns}`,
      icon: Activity,
      tone: 'from-emerald-500 to-green-600',
      iconBg: 'bg-emerald-50 text-emerald-600'
    },
    {
      title: 'Criativos',
      value: integerFormatter.format(creatives.length),
      subtitle: `Em ${campaignsWithCreatives} campanhas`,
      icon: Users,
      tone: 'from-cyan-500 to-sky-600',
      iconBg: 'bg-cyan-50 text-cyan-600',
      loading: metricsLoading
    },
    {
      title: 'Conversões',
      value: integerFormatter.format(conversionTotal),
      subtitle: 'Total consolidado real',
      icon: Target,
      tone: 'from-violet-500 to-purple-600',
      iconBg: 'bg-violet-50 text-violet-600',
      loading: metricsLoading
    },
    {
      title: 'Leads',
      value: integerFormatter.format(leadTotal),
      subtitle: campaignTotals.leads > 0 ? 'Somatório das campanhas ativas' : 'Fallback por conversões dos criativos',
      icon: Users,
      tone: 'from-fuchsia-500 to-pink-600',
      iconBg: 'bg-fuchsia-50 text-fuchsia-600',
      loading: metricsLoading
    },
    {
      title: 'Investimento Médio',
      value: currencyFormatter.format(averageInvestment),
      subtitle: 'Média por campanha ativa',
      icon: CircleDollarSign,
      tone: 'from-blue-500 to-blue-700',
      iconBg: 'bg-blue-50 text-blue-600',
      loading: metricsLoading
    },
    {
      title: 'CPA Médio',
      value: currencyFormatter.format(averageCpa),
      subtitle: 'Investimento / conversões',
      icon: ChartNoAxesColumn,
      tone: 'from-rose-500 to-red-600',
      iconBg: 'bg-rose-50 text-rose-600',
      loading: metricsLoading
    },
    {
      title: 'CTR Médio',
      value: `${averageCtr.toFixed(2)}%`,
      subtitle: 'Média das campanhas ativas',
      icon: Activity,
      tone: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-50 text-amber-600',
      loading: metricsLoading
    }
  ];

  const campaignTypeCounts = campaigns.reduce(
    (acc, campaign) => {
      const type = inferCampaignType(campaign?.name || '');
      acc[type] += 1;
      return acc;
    },
    {
      'Conversão': 0,
      'Alcance': 0,
      'Engajamento': 0,
      'Tráfego': 0,
      'Lead/Cadastro': 0,
      'Outros': 0,
    } as Record<'Conversão' | 'Alcance' | 'Engajamento' | 'Tráfego' | 'Lead/Cadastro' | 'Outros', number>
  );

  const totalCampaignTypeCount = (Object.values(campaignTypeCounts) as number[]).filter((value) => value > 0).length;

  if (navigatingTo) {
    return <LoadingDashboard />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 min-h-screen">
      {/* Banner: Meta não conectado */}
      {!metaLoading && !anyAdminConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-4 sm:p-6 shadow-lg shadow-orange-100/50"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl mt-1">⚠️</div>
              <div>
                <h3 className="font-black text-orange-900 uppercase tracking-wide text-sm">Meta Ads não conectado</h3>
                <p className="text-orange-700 text-sm mt-1">Autorize o acesso para sincronizar campanhas e métricas Meta automaticamente</p>
              </div>
            </div>
            <button
              onClick={() => setShowMetaModal(true)}
              className="whitespace-nowrap px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-600/20"
            >
              Conectar agora
            </button>
          </div>
        </motion.div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter font-space italic uppercase leading-none sm:leading-tight">
            Campanhas <span className="text-blue-600">Anclivepa-SP</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base font-medium tracking-wide">Gestão centralizada de Google & Meta Ads</p>
        </div>
        {user && (
          <div className="flex flex-wrap gap-4">
            {anyAdminConnected && (
              <button
                onClick={() => setShowMetaModal(true)}
                className="bg-white border-2 border-slate-100 hover:border-blue-100 text-slate-400 hover:text-blue-600 font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-100 uppercase tracking-widest text-[10px]"
                title="Trocar conta Meta"
              >
                <img src="/meta-svgrepo-com.svg" className="w-4 h-4" alt="Meta" />
                Conta Meta
              </button>
            )}
            <Link
              href="/admin/create-campaign"
              className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/20 uppercase tracking-widest text-xs"
            >
              <Plus size={18} strokeWidth={3} />
              Nova Campanha
            </Link>
          </div>
        )}
      </header>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 flex items-center justify-center gap-3">
          <Loader2 className="text-blue-600 animate-spin" size={24} />
          <span className="text-sm font-bold text-slate-500 uppercase tracking-[0.18em]">Carregando métricas</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className="group relative overflow-hidden bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100"
              >
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', card.tone)}></div>
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl transition-transform duration-500 group-hover:scale-125"></div>

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{card.title}</p>
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center ring-1 ring-black/5', card.iconBg)}>
                    <Icon size={18} strokeWidth={2.6} />
                  </div>
                </div>

                <p className="relative z-10 text-3xl sm:text-[2.05rem] font-black text-slate-900 mt-3 tracking-tight leading-none">
                  {(card as any).loading ? <PulseDots /> : card.value}
                </p>
                <p className="relative z-10 text-xs font-semibold text-slate-500 mt-3">
                  {(card as any).loading ? 'Carregando dados reais...' : card.subtitle}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && (
        <motion.button
          type="button"
          onClick={() => setIsTypeCardExpanded((expanded) => !expanded)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full text-left relative overflow-hidden bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-700"></div>
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl"></div>

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tipos de Campanha</p>
              <p className="text-3xl sm:text-[2.05rem] font-black text-slate-900 mt-3 tracking-tight leading-none">
                {integerFormatter.format(totalCampaignTypeCount)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-3">
                Tipos distintos no resultado filtrado
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center ring-1 ring-black/5 bg-blue-50 text-blue-600">
              {isTypeCardExpanded ? <ChevronUp size={18} strokeWidth={2.6} /> : <ChevronDown size={18} strokeWidth={2.6} />}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isTypeCardExpanded && (
              <motion.div
                key="campaign-type-details"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {Object.entries(campaignTypeCounts as Record<string, number>).map(([type, value]) => (
                  <div key={type} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{type}</p>
                    <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{integerFormatter.format(value as number)}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white p-2 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row gap-2 items-stretch lg:items-center ring-1 ring-slate-100">
        <div className="relative flex-1 w-full">
          {loading ? (
            <Loader2 className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={20} />
          ) : (
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          )}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar pelo nome da campanha..."
            className="w-full bg-slate-50 border-none rounded-2xl py-4 sm:py-5 pl-12 sm:pl-14 pr-4 sm:pr-6 focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium text-sm sm:text-base"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-nowrap gap-2 w-full lg:w-auto pr-0 lg:pr-2">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full xl:w-auto bg-slate-50 border-none rounded-2xl py-4 sm:py-5 px-4 sm:px-6 focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 cursor-pointer appearance-none xl:min-w-[200px]"
          >
            <option value="">Todos Usuários</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {/* Filtro de plataformas temporariamente oculto */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full xl:w-auto bg-slate-50 border-none rounded-2xl py-4 sm:py-5 px-4 sm:px-6 focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 cursor-pointer appearance-none xl:min-w-[180px] hidden"
          >
            <option value="">Plataformas</option>
            <option value="GOOGLE_ADS">Google Ads</option>
            <option value="META_ADS">Meta Ads</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full xl:w-auto bg-slate-50 border-none rounded-2xl py-4 sm:py-5 px-4 sm:px-6 focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 cursor-pointer appearance-none xl:min-w-[160px]"
          >
            <option value="">Todos Status</option>
            <option value="Ativa">🟢 Online</option>
            <option value="Pausada">⚫ Offline</option>
            <option value="Finalizada">🔴 Finalizada</option>
          </select>
          <button
            onClick={() => fetchCampaigns()}
            className="bg-slate-900 text-white p-4 sm:p-5 px-6 sm:px-8 rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-3 font-black uppercase tracking-widest text-[10px] whitespace-nowrap active:scale-95 w-full xl:w-auto justify-center sm:col-span-2 xl:col-span-1"
          >
            <Filter size={16} />
            Filtrar
          </button>
        </div>
      </div>

      {/* Grid de Campanhas com Animacão */}
      <div className="min-h-[400px]">
        {loading && campaigns.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="text-blue-500 animate-spin" size={48} />
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pb-12 sm:pb-20"
          >
            <AnimatePresence mode="popLayout">
              {paginatedCampaigns.map((campaign: any) => (
                <motion.div
                  layout
                  key={campaign.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="group relative bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 lg:p-10 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] transition-all duration-700 sm:hover:-translate-y-4 flex flex-col justify-between overflow-hidden ring-1 ring-slate-100"
                >
                  {/* Dot de Status Refatorado */}
                  {getStatusDot(campaign.status)}

                  <div className={cn(
                    "absolute -top-10 -right-10 w-40 h-40 blur-[100px] opacity-10 transition-all duration-700 group-hover:opacity-30 pointer-events-none",
                    campaign.platforms.includes('GOOGLE_ADS') && campaign.platforms.includes('META_ADS')
                      ? "bg-gradient-to-br from-yellow-400 to-blue-500"
                      : campaign.platforms.includes('GOOGLE_ADS')
                        ? "bg-yellow-400"
                        : "bg-blue-500"
                  )}></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                      <div className="flex gap-2 items-center flex-wrap pr-2">
                        {campaign.platforms.includes('GOOGLE_ADS') && (
                          <div className="h-10 w-10 rounded-xl bg-yellow-50 border border-yellow-100 flex items-center justify-center shadow-sm">
                            <GoogleIcon className="h-5 w-5" />
                          </div>
                        )}
                        {campaign.platforms.includes('META_ADS') && (
                          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                            <MetaIcon className="h-5 w-5" />
                          </div>
                        )}
                        {(() => {
                          const campaignType = inferCampaignType(campaign?.name || '');
                          const campaignTypeStyles: Record<string, string> = {
                            'Conversão': 'bg-violet-50 text-violet-700 border-violet-200',
                            'Alcance': 'bg-cyan-50 text-cyan-700 border-cyan-200',
                            'Engajamento': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            'Tráfego': 'bg-amber-50 text-amber-700 border-amber-200',
                            'Lead/Cadastro': 'bg-pink-50 text-pink-700 border-pink-200',
                            'Outros': 'bg-slate-100 text-slate-600 border-slate-200',
                          };

                          return (
                            <span className={cn(
                              'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                              campaignTypeStyles[campaignType] || campaignTypeStyles['Outros']
                            )}>
                              {campaignType}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex gap-2">
                        {(campaign.meta_account_name || campaign.meta_account_id) && (
                          <div
                            className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 border border-transparent hover:border-blue-100/80 hover:bg-blue-50/50 text-slate-300 hover:text-blue-500 z-20 cursor-help"
                            title={`Conta: ${campaign.meta_account_name || campaign.meta_account_id}`}
                          >
                            <Info size={20} />
                          </div>
                        )}
                        {user && (isAdmin(user.role) || user.id === campaign.created_by) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/campaign/${campaign.id}/edit`);
                            }}
                            className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100/50 text-slate-300 hover:text-blue-500 z-20"
                            title="Editar Campanha"
                          >
                            <Edit3 size={20} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-6 sm:mb-8 group-hover:text-blue-600 transition-colors line-clamp-2 font-space leading-tight italic uppercase tracking-tighter">
                      {formatCampaignName(campaign.name)}
                    </h3>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-slate-50 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-slate-400 group-hover:text-slate-600 transition-colors">
                        <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-slate-200 transition-colors">
                          <Calendar size={14} className="group-hover:text-slate-900" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest leading-none">
                          {format(getCampaignStartDate(campaign), "dd MMM yy", { locale: ptBR })}
                        </span>

                        <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                          <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white overflow-hidden shadow-sm group-hover:border-blue-100 transition-colors">
                            <UserIcon size={12} strokeWidth={3} className="text-slate-500" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] leading-none">
                            {users.find((u: any) => u.id === campaign.created_by)?.full_name || 'SISTEMA'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/campaign/${campaign.id}`}
                      onClick={() => setNavigatingTo(campaign.id)}
                      className="w-full flex items-center justify-between text-slate-900 font-black py-5 px-8 rounded-[2rem] bg-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all overflow-hidden relative shadow-inner group-hover:shadow-blue-500/50 group-hover:shadow-2xl"
                    >
                      <span className="relative z-10 uppercase tracking-[0.2em] text-[10px]">Analisar Performance</span>
                      <ArrowUpRight className="relative z-10 transition-all duration-500 group-hover:rotate-45 group-hover:scale-125" size={20} />
                      <div className="absolute inset-0 bg-blue-700 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {campaigns.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100 rounded-[5rem]"
          >
            <Layers className="mb-6 opacity-20" size={80} />
            <p className="text-2xl font-black italic uppercase tracking-tighter text-slate-400">Nenhuma campanha encontrada</p>
            <p className="text-sm font-medium text-slate-300 mt-2">Tente ajustar seus filtros ou cadastre uma nova campanha</p>
          </motion.div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8 pb-12">
          <button
            onClick={() => {
              setCurrentPage((page) => Math.max(1, page - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all flex items-center gap-2"
          >
            Anterior
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500">
              Página <span className="text-blue-600">{currentPage}</span> de {totalPages}
            </span>
          </div>
          <button
            onClick={() => {
              setCurrentPage((page) => Math.min(totalPages, page + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === totalPages}
            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all flex items-center gap-2"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Modal de conexão Meta */}
      <MetaConnectModal
        open={showMetaModal}
        onClose={() => setShowMetaModal(false)}
      />
    </div>
  );
}
