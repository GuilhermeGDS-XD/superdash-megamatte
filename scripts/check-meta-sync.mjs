import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

const token = process.env.META_ADS_ACCESS_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!token || !supabaseUrl || !serviceKey) {
  console.error('Variaveis ausentes para diagnostico Meta/Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeAccountId(rawId) {
  if (!rawId) return '';
  const value = String(rawId);
  return value.startsWith('act_') ? value : `act_${value}`;
}

async function fetchAll(url) {
  const all = [];
  let nextUrl = url;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Erro ao consultar Meta API');
    }

    all.push(...(data.data || []));
    nextUrl = data?.paging?.next || null;
  }

  return all;
}

async function run() {
  const accounts = await fetchAll(`https://graph.facebook.com/v19.0/me/adaccounts?fields=account_id,name,account_status&access_token=${token}&limit=200`);

  console.log(`Contas encontradas: ${accounts.length}`);

  for (const account of accounts) {
    const accountId = normalizeAccountId(account.account_id || account.id);
    if (!accountId) continue;

    const metaCampaigns = await fetchAll(`https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,name,effective_status&access_token=${token}&limit=500`);

    const { count: dbCountWithoutPrefix, error: errorWithoutPrefix } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('meta_account_id', accountId.replace('act_', ''))
      .contains('platforms', ['META_ADS']);

    const { count: dbCountWithPrefix, error: errorWithPrefix } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('meta_account_id', accountId)
      .contains('platforms', ['META_ADS']);

    if (errorWithoutPrefix) {
      console.log(`Erro db (sem prefixo) ${accountId}: ${errorWithoutPrefix.message}`);
    }

    if (errorWithPrefix) {
      console.log(`Erro db (com prefixo) ${accountId}: ${errorWithPrefix.message}`);
    }

    const dbCount = (dbCountWithoutPrefix || 0) + (dbCountWithPrefix || 0);
    console.log(`${accountId} | Meta=${metaCampaigns.length} | DB=${dbCount} | ${account.name}`);
  }
}

run().catch((error) => {
  console.error('Falha no diagnostico:', error.message);
  process.exit(1);
});
