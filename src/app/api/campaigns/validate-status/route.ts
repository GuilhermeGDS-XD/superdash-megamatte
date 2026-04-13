import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MetaAdsService } from '@/services/metaAdsService';
import { EncryptionService } from '@/services/encryptionService';

export async function POST(request: Request) {
  try {
    const { campaigns } = await request.json();
    
    if (!campaigns || !Array.isArray(campaigns)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updatedStatuses: Record<string, string> = {};

    // Busca o token OAuth salvo no banco (primeira conta ativa)
    const { data: metaAccount } = await supabaseAdmin
      .from('meta_accounts')
      .select('access_token')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!metaAccount?.access_token) {
      // Sem conta Meta conectada — não altera nada
      return NextResponse.json({ updatedStatuses });
    }

    let apiToken: string;
    try {
      apiToken = EncryptionService.decrypt(metaAccount.access_token);
    } catch {
      return NextResponse.json({ updatedStatuses });
    }

    // Ignorar as "Finalizadas" e as que não tem ID da Meta
    const relevantCampaigns = campaigns.filter(c => c.status !== 'Finalizada' && c.meta_campaign_id);

    // Limitamos concorrência do Promise.all para não estourar rate limit da Meta (opcional, faremos tudo em paralelo por ser pouca campanha)
    const promises = relevantCampaigns.map(async (camp) => {
      try {
        const metrics = await MetaAdsService.getCampaignMetrics(
          camp.meta_campaign_id,
          7,
          apiToken
        );

        const hasActivity = metrics.some(m => m.cost > 0 || m.impressions > 0 || m.conversions > 0 || m.clicks > 0);
        const newStatus = hasActivity ? 'Ativa' : 'Pausada';

        if (camp.status !== newStatus) {
          updatedStatuses[camp.id] = newStatus;
          await supabaseAdmin.from('campaigns').update({ status: newStatus }).eq('id', camp.id);
        }
      } catch (err: any) {
        console.error(`Erro ao validar status da campanha ${camp.id}:`, err.message);
      }
    });

    await Promise.allSettled(promises);

    return NextResponse.json({ updatedStatuses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
