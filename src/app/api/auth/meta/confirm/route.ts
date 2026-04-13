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
  console.log('📤 [CONFIRM] Iniciando...');

  try {
    // 1. Faz parse do body
    const body = await request.json();
    const { account_id } = body;

    if (!account_id) {
      console.error('❌ account_id não fornecido');
      return NextResponse.json({ error: 'account_id obrigatório' }, { status: 400 });
    }

    console.log('✅ Body parseado:', { account_id });

    // 2. Lê session_id do cookie (httpOnly, pequeno)
    const sessionId = request.cookies.get('meta_session_id')?.value;
    if (!sessionId) {
      console.error('❌ Cookie meta_session_id não encontrado');
      return NextResponse.json(
        { error: 'Sessão expirou. Tente novamente.' },
        { status: 401 }
      );
    }

    // 3. Busca sessão no Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: sessionData, error: sessionError } = await supabase
      .from('meta_sessions')
      .select('id, access_token, accounts, expires_at')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.error('❌ Sessão não encontrada no Supabase:', sessionError?.message);
      return NextResponse.json(
        { error: 'Sessão não encontrada. Tente novamente.' },
        { status: 401 }
      );
    }

    // 4. Valida expiração
    if (new Date(sessionData.expires_at) < new Date()) {
      console.error('❌ Sessão expirada');
      await supabase.from('meta_sessions').delete().eq('id', sessionId);
      return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
    }

    console.log('✅ Sessão válida. Contas disponíveis:', sessionData.accounts?.length);

    // 5. Encontra a conta selecionada
    const selectedAccount = sessionData.accounts.find(
      (acc: any) => acc.account_id === account_id
    );

    if (!selectedAccount) {
      console.error('❌ Conta não encontrada:', account_id);
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    console.log('✅ Conta selecionada:', selectedAccount.account_name);

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

    // 7. TODO: Implementar autenticação real
    const userId = 'demo-user-1';
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
          token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,account_id' }
      )
      .select();

    if (upsertError) {
      console.error('❌ Falha ao salvar meta_account:', upsertError);
      return NextResponse.json(
        { error: 'Falha ao salvar conta Meta', details: upsertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Meta account salvo:', savedAccount);

    // 9. Limpa a sessão temporária do Supabase
    await supabase.from('meta_sessions').delete().eq('id', sessionId);
    console.log('🧹 Sessão temporária removida');

    // 10. Retorna sucesso
    console.log('✅ [CONFIRM] Sucesso!');
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

    // Remove cookie de sessão
    response.cookies.delete('meta_session_id');

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
