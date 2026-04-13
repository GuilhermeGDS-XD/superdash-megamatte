import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Credentials não encontradas no .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicates() {
  console.log('🧹 Iniciando varredura por campanhas duplicadas...');

  // 1. Buscar todas as campanhas que tenham meta_campaign_id
  const { data: campaigns, error } = await supabaseAdmin
    .from('campaigns')
    .select('id, meta_campaign_id, created_at')
    .not('meta_campaign_id', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Erro ao buscar campanhas:', error.message);
    return;
  }

  // Agrupar por meta_campaign_id
  const campaignsMap = new Map<string, string[]>();

  for (const campaign of campaigns) {
    if (!campaign.meta_campaign_id) continue;
    
    if (!campaignsMap.has(campaign.meta_campaign_id)) {
      campaignsMap.set(campaign.meta_campaign_id, []);
    }
    campaignsMap.get(campaign.meta_campaign_id)!.push(campaign.id);
  }

  let totalDeleted = 0;

  for (const [metaId, ids] of campaignsMap.entries()) {
    if (ids.length > 1) {
      console.log(`⚠️ Encontradas ${ids.length} duplicatas para a campanha Meta ID: ${metaId}`);
      
      // Manter a primeira (mais antiga, devido ao order by created_at)
      const idsToDelete = ids.slice(1);
      
      console.log(`🗑️ Deletando IDs duplicados: ${idsToDelete.join(', ')}`);

      // 1. Excluir criativos amarrados a essas campanhas duplicadas (caso não haja ON DELETE CASCADE)
       const { error: errorCreatives } = await supabaseAdmin
       .from('creatives')
       .delete()
       .in('campaign_id', idsToDelete);

       if (errorCreatives) {
         console.error(`Erro ao deletar criativos das campanhas duplicadas:`, errorCreatives.message);
       } else {
         console.log(`Criativos apagados com sucesso.`);
       }

      // 2. Excluir as campanhas duplicadas
      const { error: deleteError } = await supabaseAdmin
        .from('campaigns')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error(`❌ Erro ao deletar campanhas duplicadas: ${deleteError.message}`);
      } else {
        totalDeleted += idsToDelete.length;
        console.log(`✅ Duplicatas resolvidas para ${metaId}.`);
      }
    }
  }

  console.log(`\n✨ Limpeza concluída! ${totalDeleted} campanhas duplicadas removidas.`);
}

cleanupDuplicates().catch(console.error);
