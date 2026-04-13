const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ggxuvuwpfifliffwnbsn.supabase.co'; // PRODUÇÃO
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DIAGNÓSTICO: Banco de Dados de Produção');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Teste 1: Tentar ler as colunas
    console.log('1️⃣  Teste de Leitura: Verificando se as colunas existem...\n');
    const { data, error } = await supabase
      .from('campaigns')
      .select('ecompay_product_id, spotter_list_id')
      .limit(1);

    if (error) {
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        console.log('❌ ERRO: Colunas não encontradas!');
        console.log(`   Mensagem: ${error.message}\n`);
        console.log('📋 SOLUÇÃO: Execute o SQL em https://app.supabase.com/project/ggxuvuwpfifliffwnbsn\n');
        console.log('SQL a executar:');
        console.log(`
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS ecompay_product_id TEXT DEFAULT NULL;

ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS spotter_list_id TEXT DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
        `);
      } else {
        console.log('⚠️  Erro ao verificar:', error.message);
      }
    } else {
      console.log('✅ Colunas encontradas!');
      console.log('   Dados lidos:', data);
      console.log();

      // Teste 2: Tentar fazer UPDATE
      console.log('2️⃣  Teste de Update: Tentando salvar dados...\n');
      
      // Buscar uma campanha para testar
      const { data: campaigns, error: fetchError } = await supabase
        .from('campaigns')
        .select('id, name, ecompay_product_id, spotter_list_id')
        .limit(1);

      if (fetchError) {
        console.log('❌ Erro ao buscar campanhas:', fetchError.message);
      } else if (!campaigns || campaigns.length === 0) {
        console.log('⚠️  Nenhuma campanha encontrada. Crie uma para testar.');
      } else {
        const campaign = campaigns[0];
        console.log('📝 Campanha encontrada:', campaign.name, `(ID: ${campaign.id})`);
        console.log('   Valores atuais:');
        console.log(`     - ecompay_product_id: ${campaign.ecompay_product_id || 'vazio'}`);
        console.log(`     - spotter_list_id: ${campaign.spotter_list_id || 'vazio'}\n`);

        // Tenta fazer um update de teste
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            ecompay_product_id: 'TEST_VALUE_' + Date.now(),
            spotter_list_id: 'TEST_VALUE_' + Date.now(),
          })
          .eq('id', campaign.id);

        if (updateError) {
          console.log('❌ Erro ao fazer update:', updateError.message);
        } else {
          console.log('✅ Update realizado com sucesso!');
          
          // Verificar se os valores foram salvos
          const { data: updatedCampaign, error: verifyError } = await supabase
            .from('campaigns')
            .select('ecompay_product_id, spotter_list_id')
            .eq('id', campaign.id)
            .single();

          if (verifyError) {
            console.log('❌ Erro ao verificar atualização:', verifyError.message);
          } else {
            console.log('   Novos valores lidos do banco:');
            console.log(`     - ecompay_product_id: ${updatedCampaign.ecompay_product_id}`);
            console.log(`     - spotter_list_id: ${updatedCampaign.spotter_list_id}\n`);
          }
        }
      }
    }

    // Teste 3: Verificar RLS policies
    console.log('3️⃣  Verificação: Row Level Security (RLS)\n');
    console.log('⚠️  Se os updates falharem silenciosamente, pode ser RLS.');
    console.log('   Verifique em: https://app.supabase.com/project/ggxuvuwpfifliffwnbsn/auth/policies\n');

  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testDatabase();
