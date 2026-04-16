import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/creatives — Lista criativos de campanhas específicas
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignIds = searchParams.getAll('campaignId');

  if (!campaignIds || campaignIds.length === 0) {
    return NextResponse.json({ creatives: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('creatives')
      .select('campaign_id, conversions, spend, ctr, platform')
      .in('campaign_id', campaignIds)
      .order('spend', { ascending: false });

    if (error) {
      console.error('Erro ao buscar criativos:', error);
      return NextResponse.json({ creatives: [] });
    }

    return NextResponse.json({ creatives: data || [] });
  } catch (err: any) {
    console.error('Route error fetching creatives:', err.message);
    return NextResponse.json({ creatives: [] });
  }
}
