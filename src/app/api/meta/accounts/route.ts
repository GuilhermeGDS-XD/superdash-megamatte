import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const apiToken = process.env.META_ADS_ACCESS_TOKEN;

    if (!apiToken) {
      return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN não configurado no .env' }, { status: 400 });
    }

    // Buscando as contas de anuncio associadas ao usuário/token
    const url = `https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,account_status,currency,timezone_name&access_token=${apiToken}&limit=100`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('Meta API Error:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ accounts: data.data || [] });
  } catch (error: any) {
    console.error('Route error fetching meta accounts:', error.message);
    return NextResponse.json({ error: 'Falha ao buscar contas da Meta' }, { status: 500 });
  }
}
