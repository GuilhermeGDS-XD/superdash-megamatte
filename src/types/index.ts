export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export type AdPlatform = 'GOOGLE_ADS' | 'META_ADS';

export interface Campaign {
  id: string;
  name: string;
  platforms: AdPlatform[];
  google_campaign_id?: string;
  meta_campaign_id?: string;
  google_start_date?: string;
  meta_start_date?: string;
  created_at: string;
}

export interface MetricData {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  conv_rate: number;
  roas: number;
  cpa: number;
  date: string;
}

export interface GoogleAdsMetrics extends MetricData {
  quality_score?: number;
  device_data?: Record<string, any>;
  location_data?: Record<string, any>;
}

export interface MetaAdsMetrics extends MetricData {
  reach: number;
  frequency: number;
  cpm: number;
  spend: number;
  lead: number;
  cost_per_lead: number;
  link_clicks: number;
  cpc: number;
  ctr: number;
  demographics?: Record<string, any>;
  placement_data?: Record<string, any>;
}

export interface Log {
  id: string;
  user_id: string;
  action: string;
  metadata: any;
  created_at: string;
  user?: Partial<User>;
}
