import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MetaAdsService } from '@/services/metaAdsService';

export async function POST(request: Request) {
  try {
    const { campaigns } = await request.json();
    
    if (!campaigns || !Array.isArray(campaigns)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updatedStatuses: Record<string, string> = {};
    
    // Ignorar as "Finalizadas" e as que não tem ID da Meta
    const relevantCampaigns = campaigns.filter(c => c.status !== 'Finalizada' && c.meta_campaign_id);

    // Limitamos concorrência do Promise.all para não estourar rate limit da Meta (opcional, faremos tudo em paralelo por ser pouca campanha)
    const promises = relevantCampaigns.map(async (camp) => {
      try {
        const metrics = await MetaAdsService.getCampaignMetrics(
          camp.meta_campaign_id,
          7,
          process.env.META_ADS_ACCESS_TOKEN || ''
        );

        // Verifica se há pelo menos UM dia com qualquer métrica acima de 0 (custo, impressões, cliques ou conversões)
        const hasActivity = metrics.some(m => m.cost > 0 || m.impressions > 0 || m.conversions > 0 || m.clicks > 0);
        
        // Se tem atividade e a campanha não foi finalizada, consideramos Ativa.
        // Se não tem atividade NENHUMA em 7 dias, consideramos Pausada.
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
