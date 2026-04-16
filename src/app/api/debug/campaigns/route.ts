import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, status, meta_campaign_id, platforms, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Análise
    const totalCampaigns = campaigns?.length || 0;
    const activeCampaigns = campaigns?.filter((c: any) => (c.status || '').toUpperCase() === 'ATIVA').length || 0;
    const withMetaCampaignId = campaigns?.filter((c: any) => c.meta_campaign_id).length || 0;
    const withMetaCampaignIdAndActive = campaigns?.filter(
      (c: any) => c.meta_campaign_id && (c.status || '').toUpperCase() === 'ATIVA'
    ).length || 0;

    return NextResponse.json({
      stats: {
        total: totalCampaigns,
        active: activeCampaigns,
        with_meta_campaign_id: withMetaCampaignId,
        active_with_meta_id: withMetaCampaignIdAndActive,
      },
      campaigns: campaigns?.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        meta_campaign_id: c.meta_campaign_id,
        platforms: c.platforms,
        created_at: c.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
