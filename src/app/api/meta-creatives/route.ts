import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabaseAdmin } from '@/lib/supabase';
import { EncryptionService } from '@/services/encryptionService';

interface MetaAction {
  action_type?: string;
  value?: string;
}

interface MetaInsight {
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  actions?: MetaAction[];
  inline_link_click_ctr?: string;
  clicks?: string;
  reach?: string;
  impressions?: string;
}

interface MetaAdRow {
  id?: string;
  creative?: {
    image_url?: string;
    thumbnail_url?: string;
    object_story_spec?: any;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');
  const period = parseInt(searchParams.get('period') || '7');

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
  }

  // Buscar token OAuth do banco
  let apiToken = '';
  try {
    const { data: metaAccount } = await supabaseAdmin
      .from('meta_accounts')
      .select('access_token')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (metaAccount?.access_token) {
      apiToken = EncryptionService.decrypt(metaAccount.access_token);
    }
  } catch { /* continua */ }

  if (!apiToken) apiToken = process.env.META_ADS_ACCESS_TOKEN || '';

  if (!apiToken) {
    return NextResponse.json({ error: 'Token não configurado' }, { status: 500 });
  }

  const baseUrl = 'https://graph.facebook.com/v17.0';

  try {
    // Calcular time_range IDÊNTICO ao usado em /api/meta-metrics
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - period);
    const timeRange = JSON.stringify({
      since: startDate.toISOString().split('T')[0],
      until: today.toISOString().split('T')[0],
    });

    // 1. Buscar insights por AD com o MESMO período do dashboard
    const fields = 'ad_id,ad_name,spend,actions,inline_link_click_ctr,clicks,reach,impressions';
    const insightsUrl = `${baseUrl}/${campaignId}/insights?level=ad&fields=${fields}&time_range=${encodeURIComponent(timeRange)}&access_token=${apiToken}`;

    const [insightsRes, adsRes] = await Promise.all([
      axios.get(insightsUrl),
      axios.get(`${baseUrl}/${campaignId}/ads?fields=id,creative{image_url,thumbnail_url,object_story_spec}&access_token=${apiToken}`),
    ]);

    const insights: MetaInsight[] = insightsRes.data.data || [];
    const adsData: MetaAdRow[] = adsRes.data.data || [];

    // 2. Mapear imagens dos ads
    const adImageMap: Record<string, string> = {};
    for (const ad of adsData) {
      if (!ad.id || !ad.creative) continue;
      const spec = ad.creative.object_story_spec;
      let img = '';
      if (spec) {
        img = spec.video_data?.image_url || spec.photo_data?.url || spec.link_data?.picture || '';
      }
      adImageMap[ad.id] = img || ad.creative.image_url || ad.creative.thumbnail_url || '';
    }

    // 3. Processar criativos
    const creatives = insights
      .filter((item) => Boolean(item.ad_id) && Number(item.spend) > 0)
      .map((item) => {
        const actions = item.actions || [];

        const leads = Number(
          actions.find((a) =>
            ['lead', 'on_facebook_lead', 'off_facebook_lead'].includes(a.action_type || '')
          )?.value || 0
        );

        const conversions = Number(
          actions.find((a) =>
            ['offsite_conversion', 'omni_purchase', 'purchase'].includes(a.action_type || '')
          )?.value || leads
        );

        const spendNum = Number(item.spend) || 0;
        const clicksNum = Number(item.clicks) || 0;
        const reachNum = Number(item.reach) || 0;

        const impressionsNum = Number(item.impressions) || 0;

        return {
          ad_id: item.ad_id || '',
          name: item.ad_name || 'Criativo sem nome',
          image_url: adImageMap[item.ad_id || ''] || '',
          conversions: leads || conversions,
          leads,
          spend: spendNum,
          clicks: clicksNum,
          reach: reachNum,
          impressions: impressionsNum,
          ctr: Number(item.inline_link_click_ctr) || 0,
          platform: 'META_ADS' as const,
        };
      });

    return NextResponse.json(creatives);
  } catch (error: any) {
    console.error('[MetaCreatives] Erro:', error?.response?.data || error.message);
    return NextResponse.json({ error: 'Falha ao buscar criativos' }, { status: 500 });
  }
}
