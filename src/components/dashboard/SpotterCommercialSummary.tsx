'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  Award,
  Percent,
  BarChart2,
  RefreshCw,
  AlertCircle,
  Calendar,
} from 'lucide-react';
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
import { useSpotterByOrigin } from '@/hooks/useSpotter';
import { AnimatedCounter } from '@/components/AnimatedCounter';

interface SpotterCommercialSummaryProps {
  originId: number | null;
  period: number | 'lifetime';
  campaignId: string;
  campaignName: string;
}

function fmt(n: number, decimals = 1) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: decimals });
}

function pct(n: number) {
  return `${fmt(n)}%`;
}

const VENDOR_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

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
      {sub && !loading && (
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

function buildSinceDate(periodDays: number | 'lifetime'): string | undefined {
  if (periodDays === 'lifetime') return undefined;
  const from = new Date(Date.now() - periodDays * 86_400_000);
  return from.toISOString().split('T')[0];
}

export function SpotterCommercialSummary({
  originId,
  period,
  campaignId,
  campaignName,
}: SpotterCommercialSummaryProps) {
  const since = buildSinceDate(period);
  const { data, loading, error, refresh } = useSpotterByOrigin(originId, since);

  // Se não tem originId, não renderiza nada
  if (!originId) {
    return null;
  }

  const periodLabel = typeof period === 'number' ? `${period} dias` : 'Lifetime';

  // Estado de carregamento
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic font-space tracking-tight mb-1">
              Resumo Comercial Spotter
            </h3>
            <p className="text-sm text-slate-500">
              Dados da origem selecionada · Período: {periodLabel}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={true}
            className="bg-white border-2 border-slate-100 text-slate-400 font-black p-4 rounded-2xl flex items-center justify-center transition-all opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={18} strokeWidth={3} />
          </button>
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Total de Leads', icon: Users, iconBg: 'bg-blue-50 text-blue-600', tone: 'from-blue-500 to-blue-700' },
            { label: 'Agendamentos', icon: UserCheck, iconBg: 'bg-sky-50 text-sky-600', tone: 'from-sky-500 to-cyan-600' },
            { label: 'Vendas Fechadas', icon: Award, iconBg: 'bg-emerald-50 text-emerald-600', tone: 'from-emerald-500 to-green-600' },
            { label: 'Taxa de Conv.', icon: Percent, iconBg: 'bg-amber-50 text-amber-600', tone: 'from-amber-500 to-orange-600' },
            { label: 'Taxa de Agend.', icon: UserCheck, iconBg: 'bg-violet-50 text-violet-600', tone: 'from-violet-500 to-purple-600' },
          ].map((card) => (
            <KpiCard key={card.label} {...card} value="" loading={true} />
          ))}
        </div>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 ring-1 ring-black/5">
          <AlertCircle size={18} strokeWidth={2.6} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Falha na conexão</p>
          <p className="text-sm font-bold text-slate-800">Erro ao carregar dados da origem</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // Sem dados
  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 ring-1 ring-black/5">
          <AlertCircle size={18} strokeWidth={2.6} />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Sem dados</p>
          <p className="text-sm font-bold text-slate-800">Nenhum lead encontrado para esta origem no período selecionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-10 sm:pt-14">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic font-space tracking-tight mb-1">
            Resumo Comercial Spotter
          </h3>
          <p className="text-sm text-slate-500">
            Dados da origem selecionada · Período: {periodLabel}
          </p>
        </div>
        <button
          onClick={refresh}
          className="bg-white border-2 border-slate-100 hover:border-blue-100 text-slate-400 hover:text-blue-600 font-black p-4 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-100"
          title="Atualizar dados"
        >
          <RefreshCw size={18} strokeWidth={3} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label="Total de Leads"
          value={data.metrics.totalLeads.toLocaleString('pt-BR')}
          numericValue={data.metrics.totalLeads}
          icon={Users}
          iconBg="bg-blue-50 text-blue-600"
          tone="from-blue-500 to-blue-700"
        />
        <KpiCard
          label="Agendamentos"
          value={data.metrics.totalMeetings.toLocaleString('pt-BR')}
          numericValue={data.metrics.totalMeetings}
          sub={`${pct(data.metrics.schedulingRate)} do total`}
          icon={UserCheck}
          iconBg="bg-sky-50 text-sky-600"
          tone="from-sky-500 to-cyan-600"
        />
        <KpiCard
          label="Vendas Fechadas"
          value={data.metrics.totalSales.toLocaleString('pt-BR')}
          numericValue={data.metrics.totalSales}
          sub={`${pct(data.metrics.conversionRate)} do total`}
          icon={Award}
          iconBg="bg-emerald-50 text-emerald-600"
          tone="from-emerald-500 to-green-600"
        />
        <KpiCard
          label="Taxa de Conv."
          value={pct(data.metrics.conversionRate)}
          sub="Leads → Venda"
          icon={Percent}
          iconBg="bg-amber-50 text-amber-600"
          tone="from-amber-500 to-orange-600"
        />
        <KpiCard
          label="Taxa de Agend."
          value={pct(data.metrics.schedulingRate)}
          sub="Leads → Reunião"
          icon={UserCheck}
          iconBg="bg-violet-50 text-violet-600"
          tone="from-violet-500 to-purple-600"
        />
      </div>

      {/* Vendedor Performance */}
      {data.byVendedor.length > 0 && (
        <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-100/70 blur-2xl pointer-events-none" />
          <SectionLabel>Desempenho por Vendedor</SectionLabel>

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
                          style={{ background: VENDOR_COLORS[i % VENDOR_COLORS.length] }}
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
                    style={{ background: VENDOR_COLORS[i % VENDOR_COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{v.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {v.leads} leads · {v.meetings} agend. · {v.sales} vendas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-700">{pct(conv)}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Taxa Conv.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
