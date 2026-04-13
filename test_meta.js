require('dotenv').config({path: '.env.development'});
const axios = require('axios');
const token = process.env.META_ADS_ACCESS_TOKEN;
const campaignId = '120235416971810338'; 

async function run() {
  const adsUrl = `https://graph.facebook.com/v20.0/${campaignId}/ads?fields=id,name,creative{image_url,thumbnail_url}&thumbnail_width=500&thumbnail_height=500&access_token=${token}`;
  
  try {
    const res = await axios.get(adsUrl);
    console.log(JSON.stringify(res.data.data[0].creative, null, 2));
  } catch (e) {
    console.error("ERRO:", e.message);
  }
}

run();
