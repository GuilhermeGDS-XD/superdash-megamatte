// src/services/metaAdsService.ts
import axios from 'axios';
import { MetaAdsMetrics } from '@/types';

export class MetaAdsService {
  private static baseUrl = 'https://graph.facebook.com/v17.0';
  
  static async getCampaignMetrics(
    campaignId: string, 
    periodDays: number, 
    accessToken: string
  ): Promise<MetaAdsMetrics[]> {
    try {
      // Prioriza token passado por parâmetro (do banco OAuth) sobre env var
      const apiToken = accessToken || process.env.META_ADS_ACCESS_TOKEN;

      if (!apiToken) {
        console.warn('Meta Ads: Token ausente, retornando vazio');
        return [];
      }

      // Parâmetros para a Graph API
      // Filtrando por campaign_id e buscando os campos solicitados
      const fields = [
        'date_start',
        'spend',
        'reach',
        'impressions',
        'frequency',
        'cpm',
        'clicks',
        'cpc',
        'ctr',
        'actions'
      ].join(',');

      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - periodDays);

      const timeRange = JSON.stringify({
        since: startDate.toISOString().split('T')[0],
        until: today.toISOString().split('T')[0]
      });

      const url = `${this.baseUrl}/${campaignId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${apiToken}`;
      
      console.log('Fetching real Meta data for campaign:', campaignId);
      const response = await axios.get(url);
      const data = response.data.data;

      if (!data || data.length === 0) {
        console.warn('Meta Ads: Sem dados reais retornados para esta campanha no período. Retornando vazio.');
        return [];
      }

      return data.map((item: any) => {
        // Extrair leads das actions (geralmente tipo 'lead' ou 'on_facebook_lead')
        const actions = item.actions || [];
        const leadAction = actions.find((a: any) => 
          a.action_type === 'lead' || 
          a.action_type === 'on_facebook_lead' || 
          a.action_type === 'off_facebook_lead'
        );
        const leadCount = leadAction ? parseInt(leadAction.value) : 0;
        const spend = parseFloat(item.spend || 0);

        return {
          date: item.date_start,
          reach: parseInt(item.reach || 0),
          impressions: parseInt(item.impressions || 0),
          frequency: parseFloat(item.frequency || 0),
          cpm: parseFloat(item.cpm || 0),
          clicks: parseInt(item.clicks || 0),
          cpc: parseFloat(item.cpc || 0),
          ctr: parseFloat(item.ctr || 0),
          cost: spend,
          spend: spend,
          lead: leadCount,
          cost_per_lead: leadCount > 0 ? spend / leadCount : 0,
          link_clicks: parseInt(item.clicks || 0),
          conversions: leadCount, // Mapeando leads como conversões principais no dash
          conv_rate: leadCount > 0 && parseInt(item.clicks) > 0 ? (leadCount / parseInt(item.clicks)) * 100 : 0,
          roas: 0, // Meta não retorna ROAS sem pixel configurado de compra
          cpa: leadCount > 0 ? spend / leadCount : 0
        };
      });

    } catch (error: any) {
      console.error('Erro na Meta Ads API:', error.response?.data || error.message);
      // Retorna vazio em vez de dados mockados para evitar inconsistência com dados reais
      return [];
    }
  }

  private static generateMockMetrics(days: number): MetaAdsMetrics[] {
    const metrics: MetaAdsMetrics[] = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const reach = Math.floor(Math.random() * 8000) + 2000;
      const impressions = Math.floor(reach * (1.1 + Math.random() * 0.5));
      const clicks = Math.floor(Math.random() * (impressions * 0.03)) + 5;
      const ctr = (clicks / impressions) * 100;
      const budgetConsumed = Math.floor(Math.random() * 50) + 10;
      const conversions = Math.floor(Math.random() * (clicks * 0.08));
      const lead = Math.floor(conversions * 0.7);
      const spend = budgetConsumed;
      
      metrics.push({
        date: date.toISOString().split('T')[0],
        reach,
        impressions,
        frequency: impressions / (reach || 1),
        clicks,
        ctr,
        cpc: spend / (clicks || 1),
        cpm: (spend / (impressions || 1)) * 1000,
        cost: spend,
        spend,
        conversions,
        lead,
        cost_per_lead: spend / (lead || 1),
        link_clicks: clicks,
        conv_rate: (conversions / (clicks || 1)) * 100 || 0,
        roas: (conversions * 45) / (spend || 1) || 0,
        cpa: spend / (conversions || 1) || 0
      });
    }
    return metrics;
  }
}
