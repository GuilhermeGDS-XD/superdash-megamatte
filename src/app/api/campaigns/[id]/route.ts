import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/campaigns/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });

  return NextResponse.json({ campaign: data });
}

// PATCH /api/campaigns/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, platforms, google_campaign_id, meta_campaign_id, google_start_date, meta_start_date, user_id } = body;

  const updateData = {
    name,
    platforms,
    google_campaign_id: platforms.includes('GOOGLE_ADS') ? google_campaign_id : null,
    meta_campaign_id: platforms.includes('META_ADS') ? meta_campaign_id : null,
    google_start_date: platforms.includes('GOOGLE_ADS') ? (google_start_date || null) : null,
    meta_start_date: platforms.includes('META_ADS') ? (meta_start_date || null) : null,
  };

  const { error } = await supabaseAdmin
    .from('campaigns')
    .update(updateData)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (user_id) {
    await supabaseAdmin.from('logs').insert({
      user_id,
      action: 'UPDATE_CAMPAIGN',
      metadata: { campaign_id: id, campaign_name: name }
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { user_id, campaign_name } = body;

  const { error } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (user_id) {
    await supabaseAdmin.from('logs').insert({
      user_id,
      action: 'DELETE_CAMPAIGN',
      metadata: { campaign_id: id, campaign_name }
    });
  }

  return NextResponse.json({ success: true });
}
