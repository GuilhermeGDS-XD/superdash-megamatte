import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await s
    .from('campaigns')
    .select('meta_account_id, meta_account_name')
    .limit(1);

  if (error) {
    console.log('❌ Colunas NÃO existem:', error.message);
    console.log('\n📋 Para aplicar manualmente, abra o SQL Editor no Supabase Studio:');
    console.log('https://supabase.com/dashboard/project/yzqvwhbrqmgvknzgoauq/sql/new');
    console.log('\nSQL a executar:');
    console.log('ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS meta_account_id TEXT;');
    console.log('ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS meta_account_name TEXT;');
  } else {
    console.log('✅ Colunas já existem no banco!');
    console.log('Dados de exemplo:', data);
  }
}

check().catch(console.error);
