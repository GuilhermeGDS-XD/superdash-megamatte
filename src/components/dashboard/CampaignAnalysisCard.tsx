/**
 * Componente de exibição da análise de campanha com Pros, Contras e Próximos Passos
 */

'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, Zap, Info, X } from 'lucide-react';
import { CampaignAnalysis } from '@/services/campaignAnalysisService';
import { cn } from '@/lib/utils';

interface CampaignAnalysisCardProps {
  analysis: CampaignAnalysis;
  isLoading?: boolean;
}

export function CampaignAnalysisCard({ analysis, isLoading }: CampaignAnalysisCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
          <div className="h-4 bg-slate-100 rounded-lg w-full" />
          <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
        </div>
      </div>
    );
  }

  const statusConfig = {
    excellent: { color: 'emerald', icon: CheckCircle, label: 'Excelente' },
    good: { color: 'blue', icon: TrendingUp, label: 'Bom' },
    concerning: { color: 'amber', icon: AlertCircle, label: 'Atenção' },
    critical: { color: 'red', icon: AlertCircle, label: 'Crítico' },
  };

  const config = statusConfig[analysis.status];
  const Icon = config.icon;

  const colorClasses = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };

  const iconClasses = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  };

  const scoreBarColor = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const scorePercent = (analysis.overallScore / 100) * 100;
  const colorKey = config.color as keyof typeof colorClasses;

  return (
    <div className={cn('rounded-3xl border-2 shadow-lg p-6 md:p-8 space-y-6', colorClasses[colorKey])}>
      {/* Header com Score */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Icon className={cn('w-6 h-6 md:w-8 md:h-8', iconClasses[colorKey])} />
            <span className="text-xs md:text-sm font-black uppercase tracking-widest opacity-75">
              Análise Geral
            </span>
            <button
              onClick={() => setShowInfo(true)}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/40 transition-colors text-current/60 hover:text-current"
              title="Como funciona esta análise?"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-sm md:text-base font-bold mb-4 leading-relaxed">
            {analysis.mainAnalysis}
          </p>
          {/* Progress bar do score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">Score de Performance</span>
              <span className="text-xl md:text-2xl font-black font-space italic">
                {analysis.overallScore}/100
              </span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-1000', scoreBarColor[colorKey])}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Três colunas: Pros | Contras | Próximos Passos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-4 md:pt-6 border-t border-current/10">
        {/* Pros */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="font-black uppercase text-xs md:text-sm tracking-widest">Pontos Fortes</h3>
          </div>
          <ul className="space-y-2">
            {analysis.pros.map((pro, idx) => (
              <li key={idx} className="text-xs md:text-sm leading-relaxed flex gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span className="opacity-90">{pro}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Contras */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h3 className="font-black uppercase text-xs md:text-sm tracking-widest">Pontos Fracos</h3>
          </div>
          <ul className="space-y-2">
            {analysis.contras.map((contra, idx) => (
              <li key={idx} className="text-xs md:text-sm leading-relaxed flex gap-2">
                <span className="text-orange-500 font-bold shrink-0">✗</span>
                <span className="opacity-90">{contra}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Próximos Passos */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-500" />
            <h3 className="font-black uppercase text-xs md:text-sm tracking-widest">Próximos Passos</h3>
          </div>
          <ol className="space-y-2">
            {analysis.nextSteps.map((step, idx) => (
              <li key={idx} className="text-xs md:text-sm leading-relaxed flex gap-2">
                <span className="text-blue-500 font-bold shrink-0">{idx + 1}.</span>
                <span className="opacity-90">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Modal - Como funciona a análise */}
      {showInfo && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowInfo(false)} />
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl left-1/2 -translate-x-1/2 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <Info className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-black text-slate-900">Como a Análise Funciona?</h2>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">📊 Score de Performance</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  O score (0-100) é calculado pela média ponderada de 4 métricas principais:
                </p>
                <ul className="mt-2 space-y-2 ml-4 text-sm text-slate-600">
                  <li><strong>CPA (Custo por Aquisição):</strong> Quanto você gasta por conversão (benchmark: &lt;R$50 = 100%)</li>
                  <li><strong>CTR (Taxa de Cliques):</strong> Percentual de cliques vs impressões (benchmark: &gt;1.5% = 100%)</li>
                  <li><strong>Eficiência:</strong> ROI estimado da campanha</li>
                  <li><strong>Criatividade:</strong> Quantidade de anúncios testados</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">✅ Pontos Fortes</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Aspectos que estão gerando bons resultados. Mantém essas estratégias, pois são as que estão funcionando bem.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">⚠️ Pontos Fracos</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Áreas que precisam de atenção e otimização. Essas são oportunidades para melhorar a performance geral da campanha.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">⚡ Próximos Passos</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Recomendações específicas de ações que você pode tomar para melhorar os resultados. Priorizadas por impacto potencial.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-900 leading-relaxed">
                  <strong>💡 Dica:</strong> A análise é atualizada em tempo real conforme os dados da campanha mudam. Use-a para guiar suas decisões de otimização.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
