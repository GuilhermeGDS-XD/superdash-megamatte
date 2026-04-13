import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
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

    // 3. Busca sessão + usuário autenticado em paralelo
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Lê usuário autenticado via cookies do request (Supabase Auth)
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value ?? ''; },
          set() {},
          remove() {},
        },
      }
    );

    const [sessionResult, authResult] = await Promise.all([
      supabase.from('meta_sessions').select('id, access_token, accounts, expires_at').eq('id', sessionId).single(),
      supabaseAuth.auth.getUser(),
    ]);

    const { data: sessionData, error: sessionError } = sessionResult;
    const { data: { user }, error: authError } = authResult;

    if (!user) {
      console.error('❌ Usuário não autenticado:', authError?.message);
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    console.log('✅ Usuário autenticado:', user.email);

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

    // 7. Salva em meta_accounts usando o user_id real do Supabase Auth
    console.log('💾 Salvando meta_account no Supabase...');

    // Delete+Insert em vez de upsert (constraint UNIQUE é em (user_id,account_id))
    await supabase.from('meta_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('account_id', selectedAccount.account_id);

    const { error: insertError, data: savedAccount } = await supabase
      .from('meta_accounts')
      .insert({
        user_id: user.id,
        account_id: selectedAccount.account_id,
        account_name: selectedAccount.account_name,
        access_token: encryptedToken,
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .select();

    const upsertError = insertError;

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
