import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/campaigns — Lista campanhas com suporte a filtros
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const platform = searchParams.get('platform');
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');

  let query = supabaseAdmin.from('campaigns').select('*');

  if (search && search.length >= 3) {
    query = query.ilike('name', `%${search}%`);
  }

  if (platform) {
    query = query.contains('platforms', [platform]);
  }

  if (userId) {
    query = query.eq('created_by', userId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const envAccountId = process.env.META_AD_ACCOUNT_ID;
  const apiToken = process.env.META_ADS_ACCESS_TOKEN;

  // Se o banco estiver vazio e tivermos configurações na ENV, tenta carregar da Meta automaticamente
  if ((!data || data.length === 0) && envAccountId && apiToken) {
    console.log(`[AutoSync] Banco vazio. Iniciando sincronização automática para conta ${envAccountId}...`);
    try {
      // Fazemos o fetch interno da rota de sincronização
      const syncUrl = new URL(request.url).origin + '/api/meta/campaigns';
      const syncRes = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: envAccountId, account_name: 'Conta Principal (ENV)' })
      });
      
      if (syncRes.ok) {
        // Recarrega os dados do banco após a sincronização
        const { data: syncedData } = await query.order('created_at', { ascending: false });
        return NextResponse.json({ campaigns: syncedData || [] });
      }
    } catch (syncErr) {
      console.error('[AutoSync] Falha na sincronização automática:', syncErr);
    }
  }

  return NextResponse.json({ campaigns: data || [] });
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
