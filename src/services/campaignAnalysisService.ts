/**
 * Serviço de análise inteligente de campanhas baseado em regras de negócio.
 * Gera insights sobre performance com pros, contras e próximos passos.
 */

export interface CampaignAnalysis {
  overallScore: number; // 0-100
  status: 'excellent' | 'good' | 'concerning' | 'critical';
  mainAnalysis: string;
  pros: string[];
  contras: string[];
  nextSteps: string[];
}

export interface CampaignMetrics {
  conversions: number;
  spend: number;
  clicks: number;
  impressions: number;
  ctr?: number; // percentual (ex: 1.5 = 1.5%)
  creativeCount?: number;
}

export class CampaignAnalysisService {
  /**
   * Análise completa de uma campanha
   */
  static analyze(metrics: CampaignMetrics): CampaignAnalysis {
    const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
    const ctrPercent = metrics.ctr || 0;
    const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;

    const scores = {
      cpaScore: this.analyzeCPA(cpa),
      ctrScore: this.analyzeCTR(ctrPercent),
      efficiencyScore: this.analyzeEfficiency(metrics.conversions, metrics.spend),
      creativityScore: this.analyzeCreativity(metrics.creativeCount || 0),
    };

    const overallScore = Math.round(
      (scores.cpaScore + scores.ctrScore + scores.efficiencyScore + scores.creativityScore) / 4
    );

    const status = this.getStatus(overallScore);
    const { analysis, pros, contras } = this.generateInsights(metrics, scores, cpa, ctrPercent);
    const nextSteps = this.suggestNextSteps(metrics, scores, cpa, ctrPercent);

    return {
      overallScore,
      status,
      mainAnalysis: analysis,
      pros,
      contras,
      nextSteps,
    };
  }

  private static analyzeCPA(cpa: number): number {
    // Benchmark: CPA abaixo de R$50 é excelente
    // R$50-100: bom
    // R$100-150: aceitável
    // Acima de R$150: crítico
    if (cpa === 0) return 40; // Sem conversões
    if (cpa <= 50) return 100;
    if (cpa <= 100) return 80;
    if (cpa <= 150) return 50;
    return 20;
  }

  private static analyzeCTR(ctr: number): number {
    // Benchmark: CTR acima de 1.5% é excelente (Meta padrão)
    // 1-1.5%: bom
    // 0.5-1%: médio
    // Abaixo de 0.5%: fraco
    if (ctr >= 1.5) return 100;
    if (ctr >= 1.0) return 80;
    if (ctr >= 0.5) return 50;
    return 30;
  }

  private static analyzeEfficiency(conversions: number, spend: number): number {
    if (spend === 0) return 40;
    if (conversions === 0) return 20;

    // Considerar ticket médio de ~R$1000, assim um bom ROI ≥ 100%
    // ROI = (Conversões * 1000 - Spend) / Spend
    const estimatedRevenue = conversions * 1000;
    const roi = ((estimatedRevenue - spend) / spend) * 100;

    if (roi >= 300) return 100;
    if (roi >= 100) return 85;
    if (roi >= 0) return 60;
    if (roi >= -50) return 40;
    return 20;
  }

  private static analyzeCreativity(creativeCount: number): number {
    // Score baseado na quantidade de criativos testados
    if (creativeCount === 0) return 30;
    if (creativeCount >= 5) return 100;
    if (creativeCount >= 3) return 80;
    if (creativeCount === 2) return 60;
    return 40;
  }

  private static getStatus(
    score: number
  ): 'excellent' | 'good' | 'concerning' | 'critical' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'concerning';
    return 'critical';
  }

  private static generateInsights(
    metrics: CampaignMetrics,
    scores: Record<string, number>,
    cpa: number,
    ctr: number
  ): { analysis: string; pros: string[]; contras: string[] } {
    const pros: string[] = [];
    const contras: string[] = [];

    // Análise de CPA
    if (scores.cpaScore >= 80) {
      pros.push(`CPA excelente (R$${cpa.toFixed(2)})`);
    } else if (cpa > 150) {
      contras.push(`CPA muito elevado (R$${cpa.toFixed(2)}) - revisar segmentação`);
    } else if (cpa > 100) {
      contras.push(`CPA acima do esperado (R$${cpa.toFixed(2)})`);
    }

    // Análise de CTR
    if (scores.ctrScore >= 80) {
      pros.push(`CTR excelente (${ctr.toFixed(2)}%)`);
    } else if (scores.ctrScore < 40) {
      contras.push(`CTR baixo (${ctr.toFixed(2)}%) - criativos precisam melhorar`);
    }

    // Análise de Eficiência/ROI
    if (metrics.conversions > 0 && scores.efficiencyScore >= 80) {
      pros.push('Retorno sobre investimento muito positivo');
    } else if (metrics.conversions === 0) {
      contras.push('Nenhuma conversão no período - necessário investigar');
    } else if (scores.efficiencyScore < 40) {
      contras.push('ROI negativo ou marginal - campanha não está lucrativa');
    }

    // Análise de Criatividade
    if (scores.creativityScore >= 80) {
      pros.push(`${metrics.creativeCount} criativos em teste - diversidade boa`);
    } else if ((metrics.creativeCount || 0) < 2) {
      contras.push('Poucas variações criativas - testar mais opções');
    }

    // Insights gerais
    let analysis = 'Campanha ';
    if (scores.cpaScore >= 80 && scores.ctrScore >= 80) {
      analysis += 'com performance sólida em conversão e engajamento.';
    } else if (scores.efficiencyScore < 40) {
      analysis += 'com desafios críticos de rentabilidade - recomenda-se revisão urgente.';
    } else if (scores.ctrScore < 40) {
      analysis += 'com baixo engajamento - otimização criativa é prioritária.';
    } else if ((metrics.creativeCount || 0) < 2) {
      analysis += 'operando com poucos criativos - aumente testes.';
    } else {
      analysis += 'em operação normal com oportunidades de otimização.';
    }

    return { analysis, pros, contras };
  }

  private static suggestNextSteps(
    metrics: CampaignMetrics,
    scores: Record<string, number>,
    cpa: number,
    ctr: number
  ): string[] {
    const steps: string[] = [];

    // Priority 1: Problemas críticos
    if (metrics.conversions === 0) {
      steps.push('⚠️ CRÍTICO: Zero conversões - pausar e revisar configuração de campanha');
    } else if (cpa > 150 && scores.efficiencyScore < 30) {
      steps.push('⚠️ CPA crítico (R$' + cpa.toFixed(0) + ') - pausar otimizações até diagnosticar');
    }

    // Priority 2: Melhorias de curto prazo
    if (scores.ctrScore < 40) {
      steps.push('🎨 Testar 2-3 criativos novos - CTR está abaixo do ideal');
    }
    if ((metrics.creativeCount || 0) < 2) {
      steps.push('🎯 Lançar A/B test com variações de copywriting e visual');
    }

    // Priority 3: Otimizações de médio prazo
    if (scores.cpaScore >= 60 && scores.ctrScore >= 60) {
      steps.push('📈 Aumentar orçamento nos criativos com melhor performance');
    }
    if (metrics.conversions > 50 && scores.efficiencyScore >= 60) {
      steps.push('🔄 Criar lookalike audience baseada em converters');
    }

    // Validação final
    if (steps.length === 0) {
      steps.push('✅ Campanha otimizada - manter monitoramento regular');
      steps.push('📊 Revisar performance nos próximos 3-7 dias');
    }

    return steps;
  }
}
