import { NextResponse } from 'next/server';

// GET /api/meta/accounts — busca todas as contas de anúncio vinculadas ao token
export async function GET() {
  const token = process.env.META_ADS_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN não configurado.' }, { status: 500 });
  }

  try {
    // Buscar todas as contas de anúncio vinculadas ao token
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&access_token=${token}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Meta API Error:', error);
      return NextResponse.json({ error: 'Falha ao buscar contas da Meta' }, { status: response.status });
    }

    const data = await response.json();
    const metaAccounts = data.data || [];
    const envAccountId = process.env.META_AD_ACCOUNT_ID?.replace('act_', '');

    // Mapear para formato esperado pelo frontend
    const accounts = metaAccounts.map((acc: any) => {
      const id = acc.id.replace('act_', '');
      return {
        account_id: id,
        name: acc.name || acc.id,
        account_status: acc.account_status,
        currency: acc.currency || 'BRL',
        token_valid: true,
        is_env_account: id === envAccountId
      };
    });

    // Se temos uma conta na env, garantimos que ela apareça primeiro ou seja a única se o user preferir
    // Por enquanto, apenas marcamos.
    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('Route error fetching meta accounts:', error.message);
    return NextResponse.json({ error: 'Falha ao buscar contas da Meta' }, { status: 500 });
  }
}
