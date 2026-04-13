import { NextResponse } from 'next/server';
import { MetaAdsService } from '@/services/metaAdsService';
import { AdSyncService } from '@/services/adSyncService';
import { supabaseAdmin } from '@/lib/supabase';
import { EncryptionService } from '@/services/encryptionService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');
  const supabaseId = searchParams.get('supabaseId') || campaignId; // ID interno para o Sync
  const period = searchParams.get('period') ? parseInt(searchParams.get('period')!) : 7;

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
  }

  try {
    // 1. Disparar a sincronização dos Top 3 criativos (Assíncrona para não atrasar a resposta do dash)
    // IMPORTANTE: Passa o period para garantir coerência entre métricas e criativos
    if (supabaseId) {
      console.log(`[MetaMetrics] Disparando sync de criativos para campanha ${campaignId} (period: ${period})`);
      AdSyncService.syncMetaTopCreatives(campaignId, supabaseId, period)
        .then((syncResult) => {
          console.log(`[MetaMetrics] Sync resultado: success=${syncResult.success}, count=${syncResult.syncedCount}, error=${syncResult.error || 'none'}`);
          if (!syncResult.success) {
            console.error('Falha na sincronizacao de criativos:', syncResult.error || 'erro desconhecido');
          }
        })
        .catch((err) =>
          console.error('Falha na sincronizacao silenciosa:', err)
        );
    }

    // 2. Busca token OAuth do banco (primeira conta ativa)
    const { data: metaAccount } = await supabaseAdmin
      .from('meta_accounts')
      .select('access_token')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let apiToken = '';
    if (metaAccount?.access_token) {
      try {
        apiToken = EncryptionService.decrypt(metaAccount.access_token);
      } catch { /* token inválido, continua com string vazia */ }
    }

    // 3. Busca os dados de performance geral da campanha
    const metrics = await MetaAdsService.getCampaignMetrics(
      campaignId, 
      period, 
      apiToken
    );
    
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API Route Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch Meta metrics' }, { status: 500 });
  }
}
