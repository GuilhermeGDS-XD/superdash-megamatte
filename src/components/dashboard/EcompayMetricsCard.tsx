'use client';

import { useEcompayMetrics } from '@/hooks/useEcompayMetrics';
import { CheckCircle2, Clock, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';

interface Props {
  productId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  accent?: boolean;
}) {
  return (
    <div
      className="h-full bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
      style={accent ? { backgroundColor: `${color}06`, borderColor: `${color}30` } : undefined}
    >
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm border mb-8"
        style={{ color, backgroundColor: `${color}12`, borderColor: `${color}25` }}
      >
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
        <div
          className="text-3xl font-black font-space italic leading-tight"
          style={{ color: accent ? color : '#0f172a' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function EcompayMetricsCard({ productId }: Props) {
  const { metrics, isLoading, error } = useEcompayMetrics(productId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg animate-pulse h-48 ${i === 2 ? 'col-span-2' : ''}`}>
            <div className="h-14 w-14 rounded-2xl bg-slate-100 mb-8" />
            <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-28 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-[2.5rem] p-8">
        <p className="text-red-600 font-bold text-sm">Erro ao carregar dados Ecompay: {error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">

      {/* Linha 1 — col 1: Vendas Concluídas */}
      <MetricCard
        label="Vendas Concluídas"
        value={new Intl.NumberFormat('pt-BR').format(metrics.completedPurchases)}
        icon={CheckCircle2}
        color="#10b981"
      />

      {/* Linha 1 — col 2: Em Processamento */}
      <MetricCard
        label="Em Processamento"
        value={new Intl.NumberFormat('pt-BR').format(metrics.processingPurchases)}
        icon={Clock}
        color="#f59e0b"
      />

      {/* Linha 1 — col 3-4: Receita Confirmada (box larga) */}
      <div className="col-span-2">
        <MetricCard
          label="Receita Confirmada"
          value={formatCurrency(metrics.totalProcessed)}
          icon={DollarSign}
          color="#10b981"
          accent
        />
      </div>

      {/* Linha 2 — col 1-2: Receita em Análise (box média) */}
      <div className="col-span-2">
        <MetricCard
          label="Receita em Análise"
          value={formatCurrency(metrics.totalProcessing)}
          icon={RefreshCw}
          color="#f59e0b"
        />
      </div>

      {/* Linha 2 — col 3-4: Receita Total Esperada (box larga, destaque azul) */}
      <div className="col-span-2">
        <MetricCard
          label="Receita Total Esperada"
          value={formatCurrency(metrics.totalExpected)}
          icon={TrendingUp}
          color="#2563eb"
          accent
        />
      </div>

    </div>
  );
}
