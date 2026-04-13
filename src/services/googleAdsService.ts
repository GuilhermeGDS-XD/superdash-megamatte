// src/services/googleAdsService.ts
import axios from 'axios';
import { GoogleAdsMetrics } from '@/types';

export class GoogleAdsService {
  private static baseUrl = 'https://googleads.googleapis.com/v15';
  
  static async getCampaignMetrics(
    campaignId: string, 
    periodDays: number, 
    accessToken: string
  ): Promise<GoogleAdsMetrics[]> {
    // Sem credenciais reais do Google Ads, retorna vazio para não contaminar os dados
    if (!accessToken || accessToken === 'mock-token') {
      return [];
    }
    // TODO: implementar com Google Ads Query Language (GAQL) quando houver credenciais reais
    return [];
  }

  private static generateMockMetrics(days: number): GoogleAdsMetrics[] {
    const metrics: GoogleAdsMetrics[] = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const impressions = Math.floor(Math.random() * 5000) + 1000;
      const clicks = Math.floor(Math.random() * (impressions * 0.05)) + 10;
      const ctr = (clicks / impressions) * 100;
      const cost = clicks * (Math.random() * 2 + 0.5);
      const conversions = Math.floor(Math.random() * (clicks * 0.1));
      
      metrics.push({
        date: date.toISOString().split('T')[0],
        impressions,
        clicks,
        ctr,
        cpc: cost / clicks,
        cost,
        conversions,
        conv_rate: (conversions / clicks) * 100 || 0,
        roas: conversions * 50 / cost || 0,
        cpa: cost / conversions || 0,
        quality_score: Math.floor(Math.random() * 3) + 7 // 7-10 range
      });
    }
    return metrics;
  }
}
