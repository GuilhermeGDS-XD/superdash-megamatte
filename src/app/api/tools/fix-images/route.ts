import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AdSyncService } from '@/services/adSyncService';

export async function GET(request: Request) {
  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('id, meta_campaign_id')
      .not('meta_campaign_id', 'is', null)
      .eq('status', 'Ativa');

    if (error) throw error;

    const results = [];
    for (const campaign of campaigns) {
      if (!campaign.meta_campaign_id || !campaign.id) continue;
      
      const result = await AdSyncService.syncMetaTopCreatives(campaign.meta_campaign_id, campaign.id);
      results.push({ campaign: campaign.id, result });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
