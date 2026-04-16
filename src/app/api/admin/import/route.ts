import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/admin/import — Importa campanhas via CSV
export async function POST(request: NextRequest) {
  const { rows, user_id } = await request.json();

  let successCount = 0;
  const errorList: string[] = [];

  for (const row of rows) {
    try {
      if (!row.id_campanha || !row.plataforma || !row.nome_campanha) {
        errorList.push(`Linha ignorada: Dados incompletos.`);
        continue;
      }

      const plat = row.plataforma.toUpperCase().includes('GOOGLE') ? 'GOOGLE_ADS' : 'META_ADS';

      const insertData: Record<string, unknown> = {
        name: row.nome_campanha,
        platforms: [plat],
        created_at: new Date().toISOString(),
        status: 'Ativa',
        google_campaign_id: plat === 'GOOGLE_ADS' ? row.id_campanha : null,
        meta_campaign_id: plat === 'META_ADS' ? row.id_campanha : null,
      };

      const { data: inserted, error } = await supabaseAdmin
        .from('campaigns')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;

      successCount++;

      if (plat === 'META_ADS' && inserted?.id) {
        fetch(`/api/meta-metrics?campaignId=${row.id_campanha}&supabaseId=${inserted.id}&period=1`).catch(() => {});
      }
    } catch (err: any) {
      errorList.push(`Erro na campanha "${row.nome_campanha}": ${err.message}`);
    }
  }

  if (user_id) {
    await supabaseAdmin.from('logs').insert({
      user_id,
      action: 'CSV_IMPORT',
      metadata: { total: rows.length, success: successCount, errors: errorList.length }
    });
  }

  return NextResponse.json({ success: successCount, errors: errorList });
}
