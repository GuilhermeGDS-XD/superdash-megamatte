// src/scripts/backfill-creatives.ts
import * as dotenv from 'dotenv';
import path from 'path';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Usa o ambiente de desenvolvimento por padrao local.
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env');
  process.exit(1);
}

// Criar cliente localmente para evitar problemas de importação circular/inicialização
const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);

import { AdSyncService } from '../services/adSyncService';

async function backfill() {
  console.log('🚀 Iniciando sincronização em massa de criativos...');

  // 1. Buscar todas as campanhas que têm um ID da Meta vinculado
  const { data: campaigns, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, meta_campaign_id, name')
    .not('meta_campaign_id', 'is', null);

  if (error) {
    console.error('❌ Erro ao buscar campanhas:', error.message);
    return;
  }

  if (!campaigns || campaigns.length === 0) {
    console.log('⚠️ Nenhuma campanha com meta_campaign_id encontrada para sincronizar.');
    return;
  }

  console.log(`\n📦 Encontradas ${campaigns.length} campanhas para processar.\n`);

  let successCampaigns = 0;
  let failedCampaigns = 0;
  let totalCreativesSynced = 0;

  for (const campaign of campaigns) {
    if (!campaign.meta_campaign_id) continue;

    console.log(`🔄 Sincronizando criativos para: "${campaign.name}" (Meta ID: ${campaign.meta_campaign_id})...`);
    
    try {
      // Usamos o serviço que já criamos
      const result = await AdSyncService.syncMetaTopCreatives(campaign.meta_campaign_id, campaign.id);

      if (!result.success) {
        failedCampaigns += 1;
        console.error(`❌ Falha ao sincronizar "${campaign.name}": ${result.error || 'erro desconhecido'}\n`);
        continue;
      }

      successCampaigns += 1;
      totalCreativesSynced += result.syncedCount;
      console.log(`✅ Sincronização concluída para: ${campaign.name} (${result.syncedCount} criativos)\n`);
    } catch (err: unknown) {
      failedCampaigns += 1;
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: string }).message)
          : 'erro inesperado';

      console.error(`❌ Falha ao sincronizar "${campaign.name}": ${message}`);
    }
  }

  console.log('✨ Processo de sincronização em massa finalizado!');
  console.log(`📊 Resumo: campanhas OK=${successCampaigns} | campanhas com erro=${failedCampaigns} | criativos sincronizados=${totalCreativesSynced}`);

  if (failedCampaigns > 0) {
    process.exitCode = 1;
  }
}

backfill().catch(console.error);
