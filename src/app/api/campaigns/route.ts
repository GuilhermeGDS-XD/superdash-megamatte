import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/campaigns — Lista todas as campanhas
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaigns: data });
}

// POST /api/campaigns — Cria nova campanha
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, platforms, google_campaign_id, meta_campaign_id, google_start_date, meta_start_date, user_id } = body;

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .insert({
      name,
      platforms,
      google_campaign_id: platforms.includes('GOOGLE_ADS') ? google_campaign_id : null,
      meta_campaign_id: platforms.includes('META_ADS') ? meta_campaign_id : null,
      google_start_date: platforms.includes('GOOGLE_ADS') ? (google_start_date || null) : null,
      meta_start_date: platforms.includes('META_ADS') ? (meta_start_date || null) : null,
      created_at: new Date().toISOString(),
      status: 'Ativa'
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log da ação
  if (user_id) {
    await supabaseAdmin.from('logs').insert({
      user_id,
      action: 'CAMPAIGN_CREATE',
      metadata: { campaign_id: data.id, campaign_name: name, platforms }
    });
  }

  return NextResponse.json({ campaign: data });
}
