import { NextResponse } from 'next/server';
import { MetaAdsService } from '@/services/metaAdsService';
import { AdSyncService } from '@/services/adSyncService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');
  const supabaseId = searchParams.get('supabaseId') || campaignId;
  const period = searchParams.get('period') ? parseInt(searchParams.get('period')!) : 7;

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
  }

  if (!process.env.META_ADS_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN não configurado.' }, { status: 500 });
  }

  try {
    // Dispara sync de criativos em paralelo (sem bloquear resposta)
    if (supabaseId) {
      AdSyncService.syncMetaTopCreatives(campaignId, supabaseId, period).catch((err) =>
        console.error('Falha na sincronizaçao silenciosa:', err)
      );
    }

    const metrics = await MetaAdsService.getCampaignMetrics(campaignId, period);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API Route Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch Meta metrics' }, { status: 500 });
  }
}
