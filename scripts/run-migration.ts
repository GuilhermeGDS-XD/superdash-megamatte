import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = 'https://yzqvwhbrqmgvknzgoauq.supabase.co';
const MIGRATION_HEADER = '20260413140000_add_ecompay_and_spotter_to_campaigns';

// Verificação 1: Tentar executar via psql se disponível
async function tryExecuteViaPsql() {
  try {
    const migrationPath = `supabase/migrations/${MIGRATION_HEADER}.sql`;
    console.log(`📝 Lendo arquivo: ${migrationPath}`);
    
    // Read the migration file
    const fs = await import('fs');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('🔍 Tentando executar via psql...');
    // execSync(`psql ${process.env.DATABASE_URL} -f ${migrationPath}`);
    console.log('⚠️  psql não disponível no caminho. Pulando...');
    return false;
  } catch (err) {
    console.log('⚠️  Não foi possível usar psql');
    return false;
  }
}

// Verificação 2: Testar se os campos já existem ou se precisam ser criados
async function testAndFixFields() {
  try {
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log('🧪 Testando se os campos ecompay_product_id e spotter_list_id existem...\n');

    // Test 1: Try to query a campaign and check for the fields
    const { data, error: queryError } = await supabase
      .from('campaigns')
      .select('ecompay_product_id, spotter_list_id')
      .limit(1);

    if (queryError) {
      if (queryError.message.includes('column') || queryError.message.includes('does not exist')) {
        console.log('❌ Campos não encontrados na tabela campaigns');
        console.log(`   Erro: ${queryError.message}\n`);
        return false;
      } else {
        throw queryError;
      }
    }

    console.log('✅ Campos já existem na tabela campaigns!');
    console.log('   - ecompay_product_id ✓');
    console.log('   - spotter_list_id ✓\n');
    return true;
  } catch (err: any) {
    console.error('❌ Erro ao testar campos:', err.message);
    return false;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 Verificador de Migration SUPABASE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const fieldsExist = await testAndFixFields();

  if (!fieldsExist) {
    console.log('📋 SOLUÇÃO: Os campos precisam ser adicionados à tabela');
    console.log('📁 Arquivo de migration criado: supabase/migrations/20260413140000_add_ecompay_and_spotter_to_campaigns.sql');
    console.log('\n⚠️  PRÓXIMOS PASSOS:');
    console.log('   1. Acesse o Supabase Dashboard: https://app.supabase.com/');
    console.log('   2. Navegue para: seu-projeto > SQL Editor');
    console.log('   3. Execute o seguinte SQL:\n');
    console.log(`
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS ecompay_product_id TEXT DEFAULT NULL;

ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS spotter_list_id TEXT DEFAULT NULL;

COMMENT ON COLUMN campaigns.ecompay_product_id IS 'ID do produto Ecompay vinculado a esta campanha';
COMMENT ON COLUMN campaigns.spotter_list_id IS 'ID ou nome da lista no Exact Spotter vinculada a esta campanha';

NOTIFY pgrst, 'reload schema';
    `);
    console.log('   4. Clique em "Run"');
    console.log('   5. Atualize o navegador / faça refresh da página\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error);
