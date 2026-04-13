import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EncryptionService } from '@/services/encryptionService';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Busca todas as contas Meta salvas no banco (OAuth)
    const { data: metaAccounts, error } = await supabase
      .from('meta_accounts')
      .select('account_id, account_name, access_token, status')
      .eq('status', 'active');

    if (error) {
      console.error('Erro ao buscar meta_accounts:', error);
      return NextResponse.json({ error: 'Erro ao buscar contas salvas' }, { status: 500 });
    }

    if (!metaAccounts || metaAccounts.length === 0) {
      return NextResponse.json({ accounts: [] });
    }

    // Mapeia sem expor o token ao frontend
    const accounts = metaAccounts.map((acc) => {
      let tokenValid = false;
      try {
        tokenValid = !!EncryptionService.decrypt(acc.access_token);
      } catch {
        tokenValid = false;
      }
      return {
        account_id: acc.account_id,
        name: acc.account_name,
        account_status: 1,
        currency: 'BRL',
        token_valid: tokenValid,
      };
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('Route error fetching meta accounts:', error.message);
    return NextResponse.json({ error: 'Falha ao buscar contas da Meta' }, { status: 500 });
  }
}
