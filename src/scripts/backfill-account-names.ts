// Script de backfill para preencher meta_account_id e meta_account_name nas campanhas existentes
import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const metaToken = process.env.META_ADS_ACCESS_TOKEN!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function getMetaAccounts(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id&limit=500&access_token=${metaToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return (data.data || []).map((a: any) => ({
    id: a.id, // ex: act_XXXXXXXXX
    name: a.name
  }));
}

async function getCampaignsForAccount(accountId: string): Promise<string[]> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id&limit=500&access_token=${metaToken}`
  );
  const data = await res.json();
  if (data.error) return [];
  return (data.data || []).map((c: any) => c.id as string);
}

async function backfillAccountNames() {
  console.log('🔍 Buscando contas de anúncios na Meta API...');
  const accounts = await getMetaAccounts();
  console.log(`✅ ${accounts.length} contas encontradas.\n`);

  let totalUpdated = 0;

  for (const account of accounts) {
    console.log(`🔄 Processando conta: "${account.name}" (${account.id})...`);
    
    const campaignIds = await getCampaignsForAccount(account.id);
    
    if (campaignIds.length === 0) {
      console.log(`  ⚠️ Nenhuma campanha encontrada para essa conta.\n`);
      continue;
    }

    // Atualizar campanhas no banco que tenham esse meta_campaign_id mas sem account_name
    const { data: dbCampaigns, error } = await supabase
      .from('campaigns')
      .select('id, meta_campaign_id')
      .in('meta_campaign_id', campaignIds);

    if (error) {
      console.error(`  ❌ Erro ao buscar campanhas no banco:`, error.message);
      continue;
    }

    if (!dbCampaigns || dbCampaigns.length === 0) {
      console.log(`  ℹ️ Nenhuma campanha desta conta encontrada no banco local.\n`);
      continue;
    }

    const idsToUpdate = dbCampaigns.map(c => c.id);

    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        meta_account_id: account.id,
        meta_account_name: account.name
      })
      .in('id', idsToUpdate);

    if (updateError) {
      console.error(`  ❌ Erro no update:`, updateError.message);
    } else {
      console.log(`  ✅ ${dbCampaigns.length} campanhas atualizadas com "${account.name}".\n`);
      totalUpdated += dbCampaigns.length;
    }
  }

  console.log(`\n🎉 Backfill concluído! Total: ${totalUpdated} campanhas atualizadas com nome de conta.`);
}

backfillAccountNames().catch(console.error);
