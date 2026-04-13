require('dotenv').config({path: '.env.development'});
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const token = process.env.META_ADS_ACCESS_TOKEN;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const campaignId = '120235416971810338'; // meta campaign
const dbCampId = 'ccc0590d-080d-4d7d-99b7-c963fe6295f8'; // supabase campaign

async function run() {
  const adsUrl = `https://graph.facebook.com/v20.0/${campaignId}/ads?fields=id,name,creative{image_url,thumbnail_url}&access_token=${token}`;
  
  try {
    const res = await axios.get(adsUrl);
    const metaAds = res.data.data;
    
    // Fetch db creatives
    const { data: dbCreatives } = await supabase.from('creatives').select('id, name').eq('campaign_id', dbCampId);
    
    for (const dbAd of dbCreatives) {
      // Parear por nome do ad
      const match = metaAds.find(m => m.name === dbAd.name || (m.creative && m.creative.name === dbAd.name));
      if (match && match.creative) {
        const url = match.creative.image_url || match.creative.thumbnail_url || '';
        if (url) {
           await supabase.from('creatives').update({ image_url: url }).eq('id', dbAd.id);
           console.log(`Updated ${dbAd.name} with URL`);
        }
      } else {
        console.log(`Ad ${dbAd.name} não pareou com nenhum ad do Meta.`);
      }
    }
  } catch (e) {
    console.error("ERRO:", e.message);
  }
}

run();
