'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  TrendingUp,
  XCircle,
  RefreshCw,
  Award,
  ChevronDown,
  BarChart2,
  AlertCircle,
  UserCheck,
  Target,
  Percent,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useSpotter } from '@/hooks/useSpotter';
import { useSpotterMultiPeriod } from '@/hooks/useSpotterMultiPeriod';
import { AnimatedCounter } from '@/components/AnimatedCounter';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function fmt(n: number, decimals = 1) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: decimals });
}

function pct(n: number) {
  return `${fmt(n)}%`;
}

const FUNNEL_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
const STAGE_COLORS: Record<string, string> = {
  'Venda Ganha':          '#10b981',
  'Em Atendimento':       '#3b82f6',
  'Tentativa de Contato': '#0ea5e9',
  'Negociação':           '#f59e0b',
  'Sem Contato':          '#94a3b8',
  'Descartado':           '#ef4444',
  'Lead':                 '#6366f1',
};

// Gradientes por card KPI
const KPI_TONES = [
  'from-blue-500 to-blue-700',
  'from-sky-500 to-cyan-600',
  'from-emerald-500 to-green-600',
  'from-rose-500 to-red-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600',
];

// ──────────────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  numericValue,
  sub,
  icon: Icon,
  iconBg,
  tone,
  loading = false,
}: {
  label: string;
  value: string | number;
  numericValue?: number;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  tone: string;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100"
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', tone)} />
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl transition-transform duration-500 group-hover:scale-125 pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center ring-1 ring-black/5 shrink-0', iconBg)}>
          <Icon size={18} strokeWidth={2.6} />
        </div>
      </div>
      <p className="relative z-10 text-3xl font-black text-slate-900 mt-3 tracking-tight leading-none font-space">
        {loading ? (
          <span className="inline-flex gap-1 items-end">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="inline-block w-2 h-2 rounded-full bg-slate-300"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </span>
        ) : numericValue !== undefined ? (
          <AnimatedCounter value={numericValue} duration={1200} formatter={(v) => Math.floor(v).toLocaleString('pt-BR')} />
        ) : (
          value
        )}
      </p>
      {sub && (
        <p className="relative z-10 text-xs font-semibold text-slate-500 mt-3">{sub}</p>
      )}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-5">
      {children}
    </p>
  );
}

function buildSinceDate(period: string): string | undefined {
  if (period === 'all') return undefined;
  const days = parseInt(period);
  const from = new Date(Date.now() - days * 86_400_000);
  return from.toISOString().split('T')[0];
}

const PERIOD_OPTIONS = [
  { label: 'Últimos 7 dias', value: '7d', since: buildSinceDate('7d') },
  { label: 'Últimos 14 dias', value: '14d', since: buildSinceDate('14d') },
  { label: 'Últimos 30 dias', value: '30d', since: buildSinceDate('30d') },
  { label: 'Todos os dados', value: 'all', since: undefined },
];

// ──────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────
export default function ComercialPage() {
  const [period, setPeriod] = useState('7d'); // Inicia com 7 dias
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Hook carrega todos os períodos em paralelo (7d em primeiro, depois os outros)
  const { periodDataMap, isAllLoaded, refresh } = useSpotterMultiPeriod(PERIOD_OPTIONS);

  // Dados do período selecionado
  const currentPeriodData = periodDataMap[period];
  const currentPeriodLabel =
    PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? 'Período';

  const vendedorColors = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  ];

  // Estado de carregamento inicial (7 dias)
  const isInitialLoading = periodDataMap['7d']?.loading;
  const data = currentPeriodData?.data;
  const loading = currentPeriodData?.loading;
  const error = currentPeriodData?.error;

  if (isInitialLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 min-h-screen pb-20">
        {/* Cabeçalho esqueleto */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter font-space italic uppercase leading-none sm:leading-tight">
              Tela <span className="text-blue-600">Comercial</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium tracking-wide">
              Leads e funil de vendas via{' '}
              <span className="font-semibold text-blue-600">Exact Spotter</span>
            </p>
          </div>
        </header>

        {/* Barra de progresso */}
        <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-100 overflow-hidden rounded-t-3xl">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-blue-500 to-indigo-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-10 w-10 shrink-0">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Carregando dados iniciais</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                Conectando ao Exact Spotter para últimos 7 dias...
              </p>
            </div>
          </div>
        </div>

        {/* KPI cards esqueleto */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Total de Leads', icon: Users, iconBg: 'bg-blue-50 text-blue-600', tone: 'from-blue-500 to-blue-700' },
            { label: 'Agendamentos', icon: Calendar, iconBg: 'bg-sky-50 text-sky-600', tone: 'from-sky-500 to-cyan-600' },
            { label: 'Vendas Fechadas', icon: Award, iconBg: 'bg-emerald-50 text-emerald-600', tone: 'from-emerald-500 to-green-600' },
            { label: 'Descartados', icon: XCircle, iconBg: 'bg-rose-50 text-rose-600', tone: 'from-rose-500 to-red-600' },
            { label: 'Taxa de Conv.', icon: Percent, iconBg: 'bg-amber-50 text-amber-600', tone: 'from-amber-500 to-orange-600' },
            { label: 'Taxa de Agend.', icon: UserCheck, iconBg: 'bg-violet-50 text-violet-600', tone: 'from-violet-500 to-purple-600' },
          ].map((card) => (
            <KpiCard key={card.label} {...card} value="" loading={true} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 min-h-screen pb-20">

      {/* ── Cabeçalho ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter font-space italic uppercase leading-none sm:leading-tight">
            Tela <span className="text-blue-600">Comercial</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base font-medium tracking-wide">
            Leads e funil de vendas via{' '}
            <span className="font-semibold text-blue-600">Exact Spotter</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro de período */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown((v) => !v)}
              className="bg-white border-2 border-slate-100 hover:border-blue-100 text-slate-500 hover:text-blue-600 font-black py-4 px-6 rounded-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-100 uppercase tracking-widest text-[10px]"
            >
              <Calendar size={16} strokeWidth={3} />
              {currentPeriodLabel}
              <ChevronDown
                size={14}
                strokeWidth={3}
                className={cn('transition-transform duration-200', showPeriodDropdown && 'rotate-180')}
              />
            </button>
            <AnimatePresence>
              {showPeriodDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 z-20 overflow-hidden ring-1 ring-slate-100"
                >
                  {PERIOD_OPTIONS.map((opt) => {
                    const optionData = periodDataMap[opt.value];
                    const isLoading = optionData?.loading;
                    const hasData = optionData?.data !== null;
                    const isDisabled = isLoading;

                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          if (!isDisabled) {
                            setPeriod(opt.value);
                            setShowPeriodDropdown(false);
                          }
                        }}
                        disabled={isDisabled}
                        className={cn(
                          'w-full text-left px-5 py-3 text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2',
                          period === opt.value
                            ? 'bg-blue-50 text-blue-700'
                            : isDisabled
                            ? 'text-slate-300 cursor-not-allowed opacity-50'
                            : 'text-slate-500 hover:bg-slate-50'
                        )}
                      >
                        <span className="flex-1">{opt.label}</span>
                        {isLoading && (
                          <Loader2 size={14} strokeWidth={3} className="animate-spin shrink-0 text-amber-500" />
                        )}
                        {hasData && !isLoading && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Dados carregados" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="bg-white border-2 border-slate-100 hover:border-blue-100 text-slate-400 hover:text-blue-600 font-black p-4 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-100 disabled:opacity-40"
            title="Atualizar dados"
          >
            <RefreshCw size={18} strokeWidth={3} />
          </button>
        </div>
      </header>

      {/* ── Estado de erro ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 flex items-start gap-4"
        >
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 ring-1 ring-black/5">
            <AlertCircle size={18} strokeWidth={2.6} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Falha na conexão</p>
            <p className="text-sm font-bold text-slate-800">Não foi possível conectar ao Exact Spotter</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{error}</p>
          </div>
        </motion.div>
      )}

      {/* ── Conteúdo ── */}
      {!error && data && (
        <div className="space-y-6">

          {/* ─── KPIs ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                label: 'Total de Leads',
                value: data.metrics.totalLeads.toLocaleString('pt-BR'),
                numericValue: data.metrics.totalLeads,
                icon: Users,
                iconBg: 'bg-blue-50 text-blue-600',
                tone: 'from-blue-500 to-blue-700',
              },
              {
                label: 'Agendamentos',
                value: data.metrics.totalMeetings.toLocaleString('pt-BR'),
                numericValue: data.metrics.totalMeetings,
                sub: `${pct(data.metrics.schedulingRate)} do total`,
                icon: Calendar,
                iconBg: 'bg-sky-50 text-sky-600',
                tone: 'from-sky-500 to-cyan-600',
              },
              {
                label: 'Vendas Fechadas',
                value: data.metrics.totalSales.toLocaleString('pt-BR'),
                numericValue: data.metrics.totalSales,
                sub: `${pct(data.metrics.conversionRate)} do total`,
                icon: Award,
                iconBg: 'bg-emerald-50 text-emerald-600',
                tone: 'from-emerald-500 to-green-600',
              },
              {
                label: 'Descartados',
                value: data.metrics.totalDiscards.toLocaleString('pt-BR'),
                numericValue: data.metrics.totalDiscards,
                sub: `${pct(data.metrics.discardRate)} do total`,
                icon: XCircle,
                iconBg: 'bg-rose-50 text-rose-600',
                tone: 'from-rose-500 to-red-600',
              },
              {
                label: 'Taxa de Conv.',
                value: pct(data.metrics.conversionRate),
                sub: 'Leads → Venda',
                icon: Percent,
                iconBg: 'bg-amber-50 text-amber-600',
                tone: 'from-amber-500 to-orange-600',
              },
              {
                label: 'Taxa de Agend.',
                value: pct(data.metrics.schedulingRate),
                sub: 'Leads → Reunião',
                icon: UserCheck,
                iconBg: 'bg-violet-50 text-violet-600',
                tone: 'from-violet-500 to-purple-600',
              },
            ].map((card, i) => (
              <KpiCard key={card.label} {...card} />
            ))}
          </div>

          {/* ─── Gráficos lado a lado ─── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Funil por Estágio */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl pointer-events-none" />
              <SectionLabel>Distribuição por Etapa do Funil</SectionLabel>
              {data.byStage.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sem dados de estágio</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.byStage} layout="vertical" barSize={14} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                        formatter={(v: any) => [v.toLocaleString('pt-BR'), 'Leads']}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {data.byStage.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={STAGE_COLORS[entry.name] ?? FUNNEL_COLORS[i % FUNNEL_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Legenda abaixo */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-100">
                    {data.byStage.map((entry, i) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: STAGE_COLORS[entry.name] ?? FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                        />
                        <span className="text-xs font-semibold text-slate-600">{entry.name}</span>
                        <span className="text-xs text-slate-400 tabular-nums">({entry.count})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top Origens / Motivos de Descarte */}
            <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl pointer-events-none" />
              <SectionLabel>
                {data.topDiscardReasons.length > 0 ? 'Principais Motivos de Descarte' : 'Top Origens de Leads'}
              </SectionLabel>
              {(data.bySource ?? []).length === 0 && data.topDiscardReasons.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhum dado disponível</p>
              ) : (
                <div className="space-y-4">
                  {(data.topDiscardReasons.length > 0
                    ? data.topDiscardReasons.map((d) => ({ name: d.reason, count: d.count }))
                    : (data.bySource ?? [])
                  ).map((item, i) => {
                    const list = data.topDiscardReasons.length > 0
                      ? data.topDiscardReasons
                      : (data.bySource ?? []);
                    const maxCount = list[0]?.count ?? 1;
                    const pctWidth = (item.count / maxCount) * 100;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white shrink-0"
                          style={{ background: vendedorColors[i % vendedorColors.length] }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm font-bold text-slate-700 truncate">{item.name}</span>
                            <span className="text-xs font-black text-slate-500 ml-2 shrink-0 tabular-nums">{item.count}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pctWidth}%` }}
                              transition={{ delay: i * 0.05, duration: 0.4 }}
                              className={cn(
                                'h-full rounded-full',
                                data.topDiscardReasons.length > 0
                                  ? 'bg-gradient-to-r from-rose-400 to-red-500'
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── Ranking de Vendedores ─── */}
          <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl pointer-events-none" />
            <SectionLabel>Desempenho por Vendedor (Pré-vendedor)</SectionLabel>

            {data.byVendedor.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum dado de vendedor</p>
            ) : (
              <>
                {/* Tabela desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['#', 'Vendedor', 'Leads', 'Agend.', 'Vendas', 'Tx. Conv.', 'Tx. Agend.'].map((h) => (
                          <th
                            key={h}
                            className="text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 pb-4 pr-4"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.byVendedor.map((v, i) => {
                        const conv = v.leads > 0 ? (v.sales / v.leads) * 100 : 0;
                        const agend = v.leads > 0 ? (v.meetings / v.leads) * 100 : 0;
                        return (
                          <motion.tr
                            key={v.name}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-3.5 pr-4">
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black text-white"
                                style={{ background: vendedorColors[i % vendedorColors.length] }}
                              >
                                {i + 1}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4 font-bold text-slate-800 max-w-[200px] truncate">{v.name}</td>
                            <td className="py-3.5 pr-4 text-slate-700 font-black tabular-nums">{v.leads.toLocaleString('pt-BR')}</td>
                            <td className="py-3.5 pr-4 text-sky-600 font-black tabular-nums">{v.meetings.toLocaleString('pt-BR')}</td>
                            <td className="py-3.5 pr-4 text-emerald-600 font-black tabular-nums">{v.sales.toLocaleString('pt-BR')}</td>
                            <td className="py-3.5 pr-4">
                              <span
                                className={cn(
                                  'inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                                  conv >= 20
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                    : conv >= 10
                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                    : 'bg-slate-100 text-slate-500'
                                )}
                              >
                                {pct(conv)}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4 text-slate-400 text-xs font-bold tabular-nums">{pct(agend)}</td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Cards mobile */}
                <div className="md:hidden space-y-3">
                  {data.byVendedor.map((v, i) => {
                    const conv = v.leads > 0 ? (v.sales / v.leads) * 100 : 0;
                    return (
                      <div
                        key={v.name}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-4"
                      >
                        <span
                          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-xs font-black text-white"
                          style={{ background: vendedorColors[i % vendedorColors.length] }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{v.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {v.leads} leads · {v.meetings} agend. · {v.sales} vendas
                          </p>
                        </div>
                        <span
                          className={cn(
                            'text-xs font-black px-2.5 py-1 rounded-full',
                            conv >= 20
                              ? 'bg-emerald-50 text-emerald-700'
                              : conv >= 10
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {pct(conv)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ─── Nota de integração ─── */}
          <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 flex items-start gap-4">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-black/5">
              <Target size={18} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Integração</p>
              <p className="text-sm font-bold text-slate-800">Campanhas Meta / Ecompay</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Para vincular leads do Spotter a uma campanha, edite a campanha desejada e selecione a{' '}
                <strong className="text-slate-700">lista do Spotter</strong> correspondente. O sistema filtrará automaticamente
                os leads originados por aquela campanha.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Vazio ── */}
      {!error && !loading && !data && (
        <div className="flex flex-col items-center gap-4 py-24 text-slate-400">
          <BarChart2 size={40} strokeWidth={1.5} />
          <p className="text-sm font-bold uppercase tracking-[0.18em]">Nenhum dado disponível</p>
        </div>
      )}
    </div>
  );
}
