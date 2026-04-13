require('dotenv').config({ path: '.env.development' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sortCampaigns = (campaignList) => {
    const statuses = { 'ATIVA': 0, 'PAUSADA': 1, 'FINALIZADA': 2 };
    return [...campaignList].sort((a, b) => {
        const statusA = (a.status || '').toUpperCase();
        const statusB = (b.status || '').toUpperCase();

        if (statuses[statusA] !== statuses[statusB]) {
            return (statuses[statusA] ?? 3) - (statuses[statusB] ?? 3);
        }

        const scoreA = (Number(a.conversions) || 0) * 100 + (Number(a.leads) || 0) * 50 + (Number(a.spend) || 0);
        const scoreB = (Number(b.conversions) || 0) * 100 + (Number(b.leads) || 0) * 50 + (Number(b.spend) || 0);

        if (scoreA !== scoreB) {
            return scoreB - scoreA;
        }

        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
    });
};

async function test() {
    const { data } = await supabase.from('campaigns').select('*');
    const sorted = sortCampaigns(data || []);

    console.log("== TOP 10 CAMPANHAS ORDENADAS ==");
    sorted.slice(0, 10).forEach((c, i) => {
        const score = (Number(c.conversions) || 0) * 100 + (Number(c.leads) || 0) * 50 + (Number(c.spend) || 0);
        console.log(`${i + 1}. [${c.status}] ${c.name.substring(0, 30)} | Score: ${score.toFixed(2)}`);
    });
}
test();
