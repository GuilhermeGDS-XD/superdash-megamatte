import axios from 'axios';
import { supabaseAdmin } from '../lib/supabase';

export interface AdCreativeData {
  ad_id: string;
  ad_name: string;
  image_url: string;
  conversions: number;
  leads: number;
  spend: number;
  clicks: number;
  ctr: number;
  cost_per_result: number;
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  error?: string;
}

interface MetaAction {
  action_type?: string;
  value?: string;
}

interface MetaInsight {
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  actions?: MetaAction[];
  inline_link_click_ctr?: string;
  clicks?: string;
}

interface MetaAdRow {
  id?: string;
  creative?: {
    image_url?: string;
    thumbnail_url?: string;
    object_story_spec?: any;
  };
}

export class AdSyncService {
  private static baseUrl = 'https://graph.facebook.com/v17.0';

  /**
   * Sincroniza os Top 3 criativos de uma campanha do Meta para o banco de dados
   * @param periodDays - Período em dias para filtrar os dados (coerente com dashboard)
   */
  static async syncMetaTopCreatives(campaignId: string, supabaseCampaignId: string, periodDays?: number): Promise<SyncResult> {
    // Busca token OAuth do banco (primeira conta ativa)
    let apiToken: string | undefined;
    try {
      const { supabaseAdmin } = await import('../lib/supabase');
      const { EncryptionService } = await import('./encryptionService');
      const { data: metaAccount } = await supabaseAdmin
        .from('meta_accounts')
        .select('access_token')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (metaAccount?.access_token) {
        apiToken = EncryptionService.decrypt(metaAccount.access_token);
      }
    } catch { /* fallback para env var */ }

    if (!apiToken) apiToken = process.env.META_ADS_ACCESS_TOKEN;

    if (!apiToken) {
      return {
        success: false,
        syncedCount: 0,
        error: 'Token da Meta não configurado.',
      };
    }

    try {
      // 1. Buscar insights por AD (anúncio individual)
      // Usa o MESMO período do dashboard para garantir coerência de dados
      const fields = 'ad_id,ad_name,spend,actions,inline_link_click_ctr,clicks';
      let periodParam: string;
      if (periodDays && periodDays > 0) {
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - periodDays);
        const timeRange = JSON.stringify({
          since: startDate.toISOString().split('T')[0],
          until: today.toISOString().split('T')[0]
        });
        periodParam = `time_range=${encodeURIComponent(timeRange)}`;
      } else {
        periodParam = 'date_preset=maximum';
      }
      const url = `${this.baseUrl}/${campaignId}/insights?level=ad&fields=${fields}&${periodParam}&access_token=${apiToken}`;
      
      console.log(`[AdSync] Buscando criativos para campanha ${campaignId} (período: ${periodDays || 'maximum'} dias)`);
      console.log(`[AdSync] URL: ${url.replace(apiToken, '***TOKEN***')}`);
      
      const response = await axios.get(url);
      const insights: MetaInsight[] = response.data.data || [];

      console.log(`[AdSync] Insights retornados: ${insights.length} ads encontrados`);

      if (insights.length === 0) {
        console.warn(`[AdSync] Nenhum insight de ad retornado para campanha ${campaignId}`);
        return {
          success: true,
          syncedCount: 0,
        };
      }

      // 2. Buscar as imagens/previews dos Ads
      // Precisamos fazer outra chamada para pegar a URL da imagem do criativo em alta resolução
      const adsUrl = `${this.baseUrl}/${campaignId}/ads?fields=id,creative{image_url,thumbnail_url,object_story_spec}&access_token=${apiToken}`;
      const adsResponse = await axios.get(adsUrl);
      const adsData: MetaAdRow[] = adsResponse.data.data || [];
      
      const adImageMap: Record<string, string> = {};
      adsData.forEach((ad) => {
        if (!ad.id || !ad.creative) return;
        
        let highResImage = '';
        const storySpec = ad.creative.object_story_spec;
        
        if (storySpec) {
          if (storySpec.video_data?.image_url) {
            highResImage = storySpec.video_data.image_url;
          } else if (storySpec.photo_data?.url) {
            highResImage = storySpec.photo_data.url;
          } else if (storySpec.link_data?.picture) {
            highResImage = storySpec.link_data.picture;
          }
        }

        // Se ainda não tiver, tenta a image_url base, e removemos eventuais stp se for possivel, ou usamos thumbnail_url
        // Frequentemente thumbnail_url é maior para videos, e image_url é padrão para imagens
        adImageMap[ad.id] = highResImage || ad.creative.image_url || ad.creative.thumbnail_url || '';
      });

      // 3. Processar e formatar os dados
      const processedCreatives = insights
        .filter((item) => Boolean(item.ad_id))
        .map((item): AdCreativeData => {
        const actions = item.actions || [];
        const leads = actions.find((a) => 
          ['lead', 'on_facebook_lead', 'off_facebook_lead'].includes(a.action_type || '')
        )?.value || 0;

        const leadsNum = Number(leads) || 0;
        const spendNum = Number(item.spend) || 0;
        const costPerResult = leadsNum > 0 ? spendNum / leadsNum : 0;

        return {
          ad_id: item.ad_id || '',
          ad_name: item.ad_name || 'Criativo sem nome',
          image_url: adImageMap[item.ad_id || ''] || '',
          conversions: leadsNum,
          leads: leadsNum,
          spend: spendNum,
          clicks: Number(item.clicks) || 0,
          ctr: Number(item.inline_link_click_ctr) || 0,
          cost_per_result: costPerResult
        };
      });

      // 4. Ordenar por custo por resultado (crescente = mais eficiente/menor custo)
      // Se não há leads/conversões, ordena por spend (quem gastou mais = mais ativo)
      const top3 = processedCreatives
        .filter((c: AdCreativeData) => c.spend > 0)
        .sort((a: AdCreativeData, b: AdCreativeData) => {
          // Se ambos têm cost_per_result > 0, ordena por eficiência
          if (a.cost_per_result > 0 && b.cost_per_result > 0) {
            return a.cost_per_result - b.cost_per_result;
          }
          // Se apenas um tem resultado, ele vai primeiro
          if (a.cost_per_result > 0) return -1;
          if (b.cost_per_result > 0) return 1;
          // Sem resultado: ordena por gasto (mais ativo primeiro)
          return b.spend - a.spend;
        })
        .slice(0, 3);

      if (top3.length === 0) {
        return {
          success: true,
          syncedCount: 0,
        };
      }

      // 5. Salvar no Supabase (Upsert para manter atualizado)
      // Usamos o supabaseAdmin para bypassar RLS e garantir a escrita via Server API
      let syncedCount = 0;

      // Detecta se o erro é sobre coluna faltante no schema
      const isSchemaColumnError = (msg?: string) =>
        msg != null && (msg.includes('schema cache') || msg.includes('Could not find'));

      // Payload completo (requer migração 20260324120000 aplicada)
      const fullPayload = (creative: AdCreativeData) => ({
        campaign_id: supabaseCampaignId,
        external_id: creative.ad_id,
        name: creative.ad_name,
        image_url: creative.image_url,
        conversions: creative.conversions,
        leads: creative.leads,
        spend: creative.spend,
        clicks: creative.clicks,
        ctr: creative.ctr,
        cost_per_result: creative.cost_per_result,
        synced_at: new Date().toISOString(),
        platform: 'META_ADS'
      });

      // Payload mínimo (compatível com schema base sem colunas extras)
      const minimalPayload = (creative: AdCreativeData) => ({
        campaign_id: supabaseCampaignId,
        external_id: creative.ad_id,
        name: creative.ad_name,
        image_url: creative.image_url,
        conversions: creative.conversions,
        spend: creative.spend,
        ctr: creative.ctr,
        platform: 'META_ADS'
      });

      const persistWithExternalId = async (useMinimal = false): Promise<SyncResult> => {
        for (const creative of top3) {
          const payload = useMinimal ? minimalPayload(creative) : fullPayload(creative);
          const { error: upsertError } = await supabaseAdmin.from('creatives').upsert(payload, {
            onConflict: 'campaign_id,platform,external_id'
          });

          if (upsertError) {
            // Coluna faltante: retenta com payload mínimo antes de desistir
            if (!useMinimal && isSchemaColumnError(upsertError.message)) {
              console.warn('[AdSync] Colunas extras ausentes no banco, usando payload mínimo');
              return persistWithExternalId(true);
            }
            return {
              success: false,
              syncedCount,
              error: upsertError.message,
            };
          }

          syncedCount += 1;
        }

        return {
          success: true,
          syncedCount,
        };
      };

      const persistWithoutExternalId = async (): Promise<SyncResult> => {
        const { error: deleteError } = await supabaseAdmin
          .from('creatives')
          .delete()
          .eq('campaign_id', supabaseCampaignId)
          .eq('platform', 'META_ADS');

        if (deleteError) {
          return {
            success: false,
            syncedCount,
            error: deleteError.message,
          };
        }

        for (const creative of top3) {
          const { error: insertError } = await supabaseAdmin.from('creatives').insert({
            campaign_id: supabaseCampaignId,
            name: creative.ad_name,
            image_url: creative.image_url,
            conversions: creative.conversions,
            spend: creative.spend,
            ctr: creative.ctr,
            platform: 'META_ADS'
          });

          if (insertError) {
            return {
              success: false,
              syncedCount,
              error: insertError.message,
            };
          }

          syncedCount += 1;
        }

        return {
          success: true,
          syncedCount,
        };
      };

      const withExternalId = await persistWithExternalId();
      if (withExternalId.success) {
        return withExternalId;
      }

      if (!withExternalId.error?.includes('external_id')) {
        return withExternalId;
      }

      // Fallback para bancos antigos onde a coluna external_id ainda nao existe.
      return await persistWithoutExternalId();
    } catch (error: unknown) {
      const maybeAxios = error as {
        message?: string;
        response?: { data?: unknown };
      };

      const apiDetails = maybeAxios?.response?.data
        ? JSON.stringify(maybeAxios.response.data)
        : undefined;

      const message = apiDetails || maybeAxios?.message || 'Erro desconhecido ao sincronizar criativos da Meta';

      return {
        success: false,
        syncedCount: 0,
        error: message,
      };
    }
  }

  /**
   * Placeholder para Google Ads (Implementação futura baseada em GAQL)
   */
  static async syncGoogleTopCreatives(campaignId: string, supabaseCampaignId: string): Promise<void> {
    console.warn('Sync Google Ads: Funcionalidade em desenvolvimento (Requer GAQL).');
  }
}
