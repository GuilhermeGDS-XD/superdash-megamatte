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
  console.log('📤 [CONFIRM] Iniciando...', {
    method: request.method,
    url: request.url,
  });

  try {
    // 1. Faz parse do body
    const body = await request.json();
    const { account_id } = body;

    if (!account_id) {
      console.error('❌ account_id não fornecido');
      return NextResponse.json(
        { error: 'account_id obrigatório' },
        { status: 400 }
      );
    }

    console.log('✅ Body parseado:', { account_id });

    // 2. Resgata dados da sessão temporária do cookie
    const sessionCookie = request.cookies.get('meta_oauth_session')?.value;
    if (!sessionCookie) {
      console.error('❌ Cookie de sessão não encontrado');
      return NextResponse.json(
        { error: 'Sessão expirou. Tente novamente.' },
        { status: 401 }
      );
    }

    console.log('✅ Cookie encontrado');

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch (e) {
      console.error('❌ Erro ao fazer parse do cookie:', e);
      return NextResponse.json(
        { error: 'Dados de sessão inválidos' },
        { status: 400 }
      );
    }

    // 3. Valida se a sessão não expirou
    if (sessionData.expires_at < Date.now()) {
      console.error('❌ Sessão expirada:', {
        expiresAt: new Date(sessionData.expires_at),
        now: new Date(),
      });
      return NextResponse.json(
        { error: 'Sessão expirada' },
        { status: 401 }
      );
    }

    console.log('✅ Sessão válida. Contas disponíveis:', sessionData.accounts?.length);

    // 4. Encontra a conta selecionada
    const selectedAccount = sessionData.accounts.find(
      (acc: any) => acc.account_id === account_id
    );

    if (!selectedAccount) {
      console.error('❌ Conta não encontrada:', {
        searchedId: account_id,
        availableAccounts: sessionData.accounts?.map((a: any) => a.account_id),
      });
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      );
    }

    console.log('✅ Conta selecionada encontrada:', selectedAccount.account_name);

    // 5. Inicializa Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 6. Criptografa o access_token antes de salvar
    let encryptedToken: string;
    try {
      encryptedToken = EncryptionService.encrypt(sessionData.access_token);
      console.log('✅ Token criptografado');
    } catch (encError) {
      console.error('❌ Falha na criptografia:', encError);
      return NextResponse.json(
        { error: 'Falha ao processar dados de segurança' },
        { status: 500 }
      );
    }

    // 7. IMPORTANTE: Verificar se usuário está autenticado
    // Por enquanto, vamos usar um placeholder e avisar no console
    // TODO: Implementar autenticação adequada
    const userId = 'demo-user-1'; // Placeholder - será melhorado
    console.warn('⚠️  USANDO PLACEHOLDER DE USER - IMPLEMENTAR AUTENTICAÇÃO REAL');

    // 8. Salva em meta_accounts
    console.log('💾 Salvando meta_account no Supabase...');
    const { error: upsertError, data: savedAccount } = await supabase
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
      )
      .select();

    if (upsertError) {
      console.error('❌ Falha ao salvar meta_account:', upsertError);
      return NextResponse.json(
        { error: 'Falha ao salvar conta Meta', details: upsertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Meta account salvo com sucesso:', savedAccount);

    // 9. Retorna sucesso
    console.log('✅ [CONFIRM] Sucesso! Retornando resposta...');
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
    console.error('❌ [CONFIRM] Erro:', error);

    return NextResponse.json(
      {
        error: 'Erro ao confirmar conexão',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

    if (upsertError) {
      console.error('Failed to save meta account:', upsertError);
      return NextResponse.json(
        { error: 'Falha ao salvar conta Meta' },
        { status: 500 }
      );
    }

    console.log('✅ Meta account saved:', savedAccount);

    // 9. Retorna sucesso
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
