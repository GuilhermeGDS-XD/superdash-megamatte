'use client';

import React, { useEffect, useState } from 'react';
import { 
  Trophy, 
  Target, 
  DollarSign, 
  BarChart3,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  X,
  Maximize2,
  MousePointer2,
  Users,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type CampaignType = 'Conversão' | 'Alcance' | 'Engajamento' | 'Tráfego' | 'Lead/Cadastro' | 'Outros';

interface Creative {
  ad_id: string;
  name: string;
  image_url: string;
  conversions: number;
  leads: number;
  spend: number;
  ctr: number;
  clicks: number;
  reach: number;
  impressions: number;
  platform: 'GOOGLE_ADS' | 'META_ADS';
}

interface TopCreativesProps {
  campaignId: string;
  metaCampaignId?: string;
  campaignStatus?: string;
  periodDays?: number;
  campaignType?: CampaignType;
}

export function TopCreatives({ campaignId, metaCampaignId, campaignStatus, periodDays = 7, campaignType }: TopCreativesProps) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [selectedCreativeIndex, setSelectedCreativeIndex] = useState<number>(0);

  // Métrica relevante para o tipo de campanha
  const getRelevantMetric = (creative: Creative): number => {
    if (!campaignType) return creative.conversions || 0;
    switch (campaignType) {
      case 'Lead/Cadastro':
        return creative.leads || creative.conversions || 0;
      case 'Alcance':
        return creative.reach || 0;
      case 'Engajamento':
      case 'Tráfego':
        return creative.clicks || 0;
      case 'Conversão':
      case 'Outros':
      default:
        return creative.conversions || 0;
    }
  };

  // Custo por resultado dinâmico
  const calculateCostPerResult = (creative: Creative): number => {
    const metric = getRelevantMetric(creative);
    if (metric <= 0) return 0;
    return (creative.spend || 0) / metric;
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchTopCreatives() {
      if (!metaCampaignId) {
        setCreatives([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Buscar criativos DIRETO DA API META com o MESMO período do dashboard
        const res = await fetch(
          `/api/meta-creatives?campaignId=${metaCampaignId}&period=${periodDays}`
        );

        if (!res.ok) throw new Error('Falha ao buscar criativos');

        const data: Creative[] = await res.json();

        if (cancelled) return;

        // Rankear: ordenar por eficiência (menor custo/resultado = melhor)
        const ranked = data
          .filter(c => c.spend > 0)
          .map(c => ({ ...c, _cpr: calculateCostPerResult(c) }))
          .sort((a, b) => {
            if (a._cpr > 0 && b._cpr > 0) return a._cpr - b._cpr;
            if (a._cpr > 0) return -1;
            if (b._cpr > 0) return 1;
            return b.spend - a.spend;
          })
          .slice(0, 3)
          .map(({ _cpr, ...c }) => c);

        setCreatives(ranked);
      } catch (err) {
        console.error('Erro ao buscar criativos:', err);
        if (!cancelled) setCreatives([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTopCreatives();
    return () => { cancelled = true; };
  }, [metaCampaignId, periodDays, campaignType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Fallback: sem dados no período (C - não mostrar se dados insuficientes)
  if (creatives.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-[3rem] p-8 text-center">
        <Trophy size={40} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-600 font-bold text-sm uppercase tracking-wide">
          Sem dados de criativos para este período
        </p>
        <p className="text-slate-400 text-xs mt-2">
          Os criativos serão sincronizados conforme geram resultados
        </p>
      </div>
    );
  }

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return { bg: 'bg-yellow-500', icon: '🥇', text: '🏆 CAMPEÃO' };
      case 1: return { bg: 'bg-slate-300', icon: '🥈', text: '🥈 2º LUGAR' };
      case 2: return { bg: 'bg-orange-400', icon: '🥉', text: '🥉 3º LUGAR' };
      default: return { bg: 'bg-slate-100', icon: '', text: '' };
    }
  };

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex items-center justify-between px-1 sm:px-2 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter font-space italic uppercase leading-none">
            Top 3 <span className="text-blue-600">Criativos</span>
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] mt-2">Ordenado por eficiência (custo/resultado)</p>
        </div>
        <div className="hidden md:flex gap-2">
          <div className="px-4 py-2 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
            Tempo Real
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {creatives.map((creative, index) => {
          const rank = getRankStyle(index);
          const adId = creative.ad_id.substring(0, 8).toUpperCase();
          const isOnline = campaignStatus === 'Ativa';
          const isClickable = isOnline && !!creative.image_url;

          // Métrica e label dinâmicos conforme tipo de campanha
          const resultMetric = getRelevantMetric(creative);
          const costPerResult = calculateCostPerResult(creative);
          
          const metricLabel = (() => {
            switch (campaignType) {
              case 'Lead/Cadastro': return 'Leads';
              case 'Alcance': return 'Alcance';
              case 'Engajamento': return 'Engajamentos';
              case 'Tráfego': return 'Cliques';
              case 'Conversão':
              case 'Outros':
              default: return 'Conversões';
            }
          })();

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={creative.ad_id}
              onClick={() => isClickable && (setSelectedCreative(creative), setSelectedCreativeIndex(index))}
              className={cn(
                "group relative bg-white border border-slate-100 rounded-[3rem] p-8 shadow-2xl shadow-slate-200/50 transition-all overflow-hidden",
                isClickable 
                  ? "hover:shadow-blue-500/10 sm:hover:scale-[1.02] cursor-pointer" 
                  : "opacity-90"
              )}
            >
              {/* Badge de Rank */}
              <div className={cn(
                "absolute top-0 right-0 px-6 sm:px-8 py-2.5 sm:py-3 rounded-bl-[2rem] text-[10px] font-black text-white tracking-widest z-10",
                rank.bg
              )}>
                {rank.text}
              </div>

              {/* Preview do Criativo */}
              <div className="aspect-video w-full bg-slate-100 rounded-[2rem] mb-8 overflow-hidden relative flex items-center justify-center border-2 border-slate-50 group-hover:border-blue-100 transition-colors">
                {creative.image_url ? (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110 transition-transform duration-500 group-hover:scale-125"
                      style={{ backgroundImage: `url(${creative.image_url})` }}
                    />
                    <img 
                      src={creative.image_url} 
                      alt={creative.name} 
                      className="relative z-10 w-full h-full object-contain p-2 rounded-[2rem] transition-transform duration-500 group-hover:scale-105" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/meta-svgrepo-com.svg';
                        (e.target as HTMLImageElement).className = 'relative z-10 w-16 h-16 object-contain opacity-20';
                      }}
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 opacity-20">
                    <ImageIcon size={48} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sem Preview</span>
                  </div>
                )}
                
                {/* Overlay da Plataforma */}
                <div className="absolute bottom-4 right-4 h-10 w-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
                  {creative.platform === 'GOOGLE_ADS' ? (
                    <img src="/google-ads-svgrepo-com.svg" className="h-6 w-6" alt="Google" />
                  ) : (
                    <img src="/meta-svgrepo-com.svg" className="h-6 w-6" alt="Meta" />
                  )}
                </div>
              </div>

              {/* Info do Anúncio */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 line-clamp-1 uppercase tracking-tighter">
                    {creative.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {adId}</p>
                </div>

                {/* Métricas do Card */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Target size={14} strokeWidth={3} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">{metricLabel}</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 italic font-space tracking-tighter">
                      {resultMetric}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <BarChart3 size={14} strokeWidth={3} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">
                        {costPerResult > 0 ? `Custo/${metricLabel.replace(/s$/i, '')}` : 'Investimento'}
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 italic font-space tracking-tighter">
                      {costPerResult > 0 ? formatCurrency(costPerResult) : formatCurrency(creative.spend)}
                    </p>
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className={cn(
                  "flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                  isClickable ? "text-slate-300 group-hover:text-blue-500" : "text-slate-300"
                )}>
                    <span>Gasto: {formatCurrency(creative.spend)}</span>
                    {isClickable && <Maximize2 size={14} strokeWidth={3} />}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal completo do Criativo */}
      <AnimatePresence>
        {selectedCreative && (() => {
          const cr = selectedCreative;
          const idx = selectedCreativeIndex;
          const rank = getRankStyle(idx);
          const resultMetric = getRelevantMetric(cr);
          const costPerResult = calculateCostPerResult(cr);
          const metricLabel = (() => {
            switch (campaignType) {
              case 'Lead/Cadastro': return 'Leads';
              case 'Alcance': return 'Alcance';
              case 'Engajamento': return 'Engajamentos';
              case 'Tráfego': return 'Cliques';
              default: return 'Conversões';
            }
          })();

          const stats: { icon: React.ReactNode; label: string; value: string; color: string; show: boolean }[] = [
            {
              icon: <Target size={16} strokeWidth={3} />,
              label: metricLabel,
              value: String(resultMetric),
              color: '#2563eb',
              show: true,
            },
            {
              icon: <DollarSign size={16} strokeWidth={3} />,
              label: `Custo/${metricLabel.replace(/s$/i, '')}`,
              value: costPerResult > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costPerResult) : '—',
              color: '#10b981',
              show: costPerResult > 0,
            },
            {
              icon: <TrendingUp size={16} strokeWidth={3} />,
              label: 'Investimento',
              value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cr.spend),
              color: '#f59e0b',
              show: true,
            },
            {
              icon: <Activity size={16} strokeWidth={3} />,
              label: 'CTR',
              value: cr.ctr > 0 ? `${cr.ctr.toFixed(2)}%` : '—',
              color: '#8b5cf6',
              show: cr.ctr > 0,
            },
            {
              icon: <MousePointer2 size={16} strokeWidth={3} />,
              label: 'Cliques',
              value: cr.clicks > 0 ? new Intl.NumberFormat('pt-BR').format(cr.clicks) : '—',
              color: '#f97316',
              show: cr.clicks > 0,
            },
            {
              icon: <Users size={16} strokeWidth={3} />,
              label: 'Alcance',
              value: cr.reach > 0 ? new Intl.NumberFormat('pt-BR').format(cr.reach) : '—',
              color: '#ec4899',
              show: cr.reach > 0,
            },
            {
              icon: <BarChart3 size={16} strokeWidth={3} />,
              label: 'Impressões',
              value: cr.impressions > 0 ? new Intl.NumberFormat('pt-BR').format(cr.impressions) : '—',
              color: '#0ea5e9',
              show: cr.impressions > 0,
            },
          ];

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCreative(null)}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-6 cursor-pointer"
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-4xl bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl overflow-hidden cursor-default flex flex-col lg:flex-row max-h-[92vh]"
              >
                {/* Lado esquerdo — imagem */}
                <div className="relative lg:w-[45%] shrink-0 bg-slate-950 flex items-center justify-center overflow-hidden" style={{ minHeight: 260 }}>
                  {/* Blur de fundo */}
                  {cr.image_url && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
                      style={{ backgroundImage: `url(${cr.image_url})` }}
                    />
                  )}

                  {/* Badge de rank */}
                  <div className={`absolute top-5 left-5 flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest z-10 shadow-lg ${rank.bg}`}>
                    <span className="text-base leading-none">{rank.icon}</span>
                    <span>{rank.text.replace(/^.*? /, '')}</span>
                  </div>

                  {/* Badge de plataforma */}
                  <div className="absolute top-5 right-5 h-10 w-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center shadow-lg z-10">
                    {cr.platform === 'GOOGLE_ADS'
                      ? <img src="/google-ads-svgrepo-com.svg" className="h-6 w-6" alt="Google" />
                      : <img src="/meta-svgrepo-com.svg" className="h-6 w-6" alt="Meta" />}
                  </div>

                  {cr.image_url ? (
                    <img
                      src={cr.image_url}
                      alt={cr.name}
                      className="relative z-10 w-full h-full object-contain max-h-[50vh] lg:max-h-full p-6"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/meta-svgrepo-com.svg';
                        (e.target as HTMLImageElement).className = 'relative z-10 w-16 h-16 object-contain opacity-20';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <ImageIcon size={48} className="text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Sem Preview</span>
                    </div>
                  )}
                </div>

                {/* Lado direito — dados */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 p-6 sm:p-8 pb-0">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                        ID: {cr.ad_id.substring(0, 12).toUpperCase()}
                      </p>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase italic font-space tracking-tight leading-tight line-clamp-2">
                        {cr.name}
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCreative(null)}
                      className="shrink-0 h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Métricas */}
                  <div className="p-6 sm:p-8 pt-6 grid grid-cols-2 gap-3 flex-1">
                    {stats.filter(s => s.show).map((stat, i) => (
                      <div
                        key={i}
                        className="rounded-2xl p-4 sm:p-5 flex flex-col gap-2 border"
                        style={{
                          backgroundColor: `${stat.color}08`,
                          borderColor: `${stat.color}20`,
                        }}
                      >
                        <div className="flex items-center gap-2" style={{ color: stat.color }}>
                          {stat.icon}
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none">{stat.label}</span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-slate-900 font-space italic tracking-tighter leading-none">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé */}
                  <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {cr.platform === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta Ads'} · Período: {periodDays === 0 ? 'Lifetime' : `${periodDays}d`}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Zap size={12} className="text-blue-500" strokeWidth={3} />
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Dados em tempo real</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </section>
  );
}