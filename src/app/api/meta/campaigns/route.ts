import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase'; // Usar root admin para gravar as campanhas

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { account_id, account_name } = body;
    const apiToken = process.env.META_ADS_ACCESS_TOKEN;

    if (!account_id) {
      return NextResponse.json({ error: 'account_id é obrigatório' }, { status: 400 });
    }

    if (!apiToken) {
      return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN não configurado' }, { status: 400 });
    }

    const normalizedAccountId = account_id.startsWith('act_') ? account_id : `act_${account_id}`;
    const baseUrl = `https://graph.facebook.com/v19.0/${normalizedAccountId}/campaigns`;

    const campaigns: any[] = [];
    let nextPageUrl: string | null = `${baseUrl}?fields=id,name,status,created_time,effective_status&access_token=${apiToken}&limit=500`;

    while (nextPageUrl) {
      const metaResponse: any = await fetch(nextPageUrl as string);
      const data: any = await metaResponse.json();

      if (data.error) {
        console.error('Meta API Error:', data.error);
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      campaigns.push(...(data.data || []));
      nextPageUrl = data?.paging?.next || null;
    }

    // Detecta colunas opcionais para evitar falha silenciosa em ambientes com schema diferente.
    let hasMetaAccountName = false;
    let hasUpdatedAt = false;
    const { error: detectColumnsError } = await supabaseAdmin
      .from('campaigns')
      .select('id, meta_account_name, updated_at')
      .limit(1);

    if (!detectColumnsError) {
      hasMetaAccountName = true;
      hasUpdatedAt = true;
    }

    let successCount = 0;
    let errorCount = 0;
    const errorSamples: string[] = [];

    // Inserir as campanhas no supabase
    for (const campaign of campaigns) {
      try {
        const { data: existing, error: existingError } = await supabaseAdmin
          .from('campaigns')
          .select('id')
          .eq('meta_campaign_id', campaign.id)
          .single();

        const notFound = existingError && (existingError as any).code === 'PGRST116';
        if (existingError && !notFound) {
          throw new Error(`Erro ao consultar campanha existente ${campaign.id}: ${existingError.message}`);
        }

        const payload: Record<string, any> = {
          meta_campaign_id: campaign.id,
          name: campaign.name,
          status: campaign.effective_status === 'ACTIVE' ? 'Ativa' : 'Pausada',
          meta_account_id: normalizedAccountId,
        };

        if (hasMetaAccountName) {
          payload.meta_account_name = account_name || null;
        }

        if (hasUpdatedAt) {
          payload.updated_at = new Date().toISOString();
        }
          
        if (existing) {
            const { error: updateError } = await supabaseAdmin
              .from('campaigns')
              .update(payload)
              .eq('id', existing.id);

            if (updateError) {
              throw new Error(`Erro ao atualizar ${campaign.id}: ${updateError.message}`);
            }
        } else {
            const insertPayload: Record<string, any> = {
              ...payload,
              platforms: ['META_ADS'],
              created_at: new Date().toISOString(),
            };

            const { error: insertError } = await supabaseAdmin
              .from('campaigns')
              .insert(insertPayload);

            if (insertError) {
              throw new Error(`Erro ao inserir ${campaign.id}: ${insertError.message}`);
            }
        }

        successCount++;
      } catch (err: any) {
        errorCount++;
        console.error('Erro ao gravar campanha no db:', err);
        if (errorSamples.length < 10) {
          errorSamples.push(err?.message || `Erro desconhecido na campanha ${campaign.id}`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      campaignsFound: campaigns.length,
      synced: successCount,
      failed: errorCount,
      sampleErrors: errorSamples,
    });
  } catch (error: any) {
    console.error('Route error syncing meta campaigns:', error.message);
    return NextResponse.json({ error: 'Falha ao sincronizar contas da Meta' }, { status: 500 });
  }
}
