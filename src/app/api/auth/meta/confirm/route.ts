import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EncryptionService } from '@/services/encryptionService';

/**
 * POST /auth/meta/confirm
 * 
 * Último passo do fluxo OAuth2
 * Usuário selecionou qual conta Meta conectar
 * 
 * Fluxo:
 * 1. Valida request
 * 2. Resgata dados da sessão temporária (meta_sessions ou cookie)
 * 3. Encontra a conta selecionada
 * 4. Criptografa o access_token
 * 5. Salva em meta_accounts
 * 6. Limpa dados temporários
 * 7. Retorna sucesso
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse do body
    const body = await request.json();
    const { account_id } = body;

    if (!account_id) {
      return NextResponse.json(
        { error: 'account_id é obrigatório' },
        { status: 400 }
      );
    }

    // 2. Resgata dados da sessão temporária do cookie
    const sessionCookie = request.cookies.get('meta_oauth_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Sessão expirou. Tente novamente.' },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(sessionCookie);

    // 3. Valida se a sessão não expirou
    if (sessionData.expires_at < Date.now()) {
      return NextResponse.json(
        { error: 'Sessão expirada' },
        { status: 401 }
      );
    }

    // 4. Encontra a conta selecionada
    const selectedAccount = sessionData.accounts.find(
      (acc: any) => acc.account_id === account_id
    );

    if (!selectedAccount) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      );
    }

    // 5. Inicializa Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 6. Pega user autenticado (assumindo que já passou por auth)
    // TODO: Implementar autenticação adequada
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 7. Criptografa o access_token antes de salvar
    let encryptedToken: string;
    try {
      encryptedToken = EncryptionService.encrypt(sessionData.access_token);
    } catch (encError) {
      console.error('Encryption failed:', encError);
      return NextResponse.json(
        { error: 'Falha ao processar dados de segurança' },
        { status: 500 }
      );
    }

    // 8. Salva em meta_accounts
    // Para agora, vamos usar um user_id placeholder
    // TODO: Substituir por user_id real da autenticação
    const userId = 'placeholder-user-id'; // Será substituído com user real

    const { error: upsertError } = await supabase
      .from('meta_accounts')
      .upsert(
        {
          user_id: userId,
          account_id: selectedAccount.account_id,
          account_name: selectedAccount.account_name,
          access_token: encryptedToken,
          token_expires_at: new Date(
            Date.now() + 60 * 24 * 60 * 60 * 1000 // 60 dias
          ).toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,account_id',
        }
      );

    if (upsertError) {
      console.error('Failed to save meta account:', upsertError);
      return NextResponse.json(
        { error: 'Falha ao salvar conta Meta' },
        { status: 500 }
      );
    }

    // 9. Limap dados temporários
    const response = NextResponse.json(
      {
        success: true,
        message: 'Conta Meta conectada com sucesso',
        account: {
          id: selectedAccount.account_id,
          name: selectedAccount.account_name,
        },
      },
      { status: 200 }
    );

    // Remove o cookie de sessão
    response.cookies.delete('meta_oauth_session');

    return response;
  } catch (error) {
    console.error('OAuth confirm error:', error);

    return NextResponse.json(
      {
        error: 'Erro ao confirmar conexão',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
