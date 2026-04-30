import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const apiToken = process.env.META_ADS_ACCESS_TOKEN;
    if (!apiToken) {
      return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN não configurado no .env' }, { status: 500 });
    }

    // Busca campanhas com meta_campaign_id no banco
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('id, meta_campaign_id, status')
      .not('meta_campaign_id', 'is', null);

    if (error || !campaigns?.length) {
      return NextResponse.json({ error: 'Nenhuma campanha com meta_campaign_id encontrada' }, { status: 404 });
    }

    // Para cada campanha, busca o effective_status real na Meta
    const baseUrl = 'https://graph.facebook.com/v19.0';
    let updated = 0;
    let failed = 0;

    // Processa em lotes de 50 para não sobrecarregar
    const BATCH = 50;
    for (let i = 0; i < campaigns.length; i += BATCH) {
      const batch = campaigns.slice(i, i + BATCH);
      const ids = batch.map(c => c.meta_campaign_id).join(',');

      try {
        const res = await fetch(
          `${baseUrl}/?ids=${ids}&fields=id,effective_status&access_token=${apiToken}`
        );
        const data: any = await res.json();

        if (data.error) {
          console.error('Meta API error:', data.error.message);
          failed += batch.length;
          continue;
        }

        for (const camp of batch) {
          const metaData = data[camp.meta_campaign_id];
          if (!metaData) continue;

          const newStatus = metaData.effective_status === 'ACTIVE' ? 'Ativa' : 'Pausada';
          if (camp.status !== newStatus) {
            await supabaseAdmin
              .from('campaigns')
              .update({ status: newStatus })
              .eq('id', camp.id);
            updated++;
          }
        }
      } catch (err: any) {
        console.error('Erro no batch:', err.message);
        failed += batch.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      total: campaigns.length,
      updated,
      failed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
