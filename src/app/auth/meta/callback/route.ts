import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MetaOAuthService } from '@/services/metaOAuthService';

/**
 * GET /auth/meta/callback
 *
 * Callback que Meta redireciona após usuário autorizar.
 * IMPORTANTE: Este arquivo deve ficar em src/app/auth/meta/callback/route.ts
 * para corresponder ao REDIRECT_URI registrado no Meta App.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  console.log('🔵 [CALLBACK] Iniciando tratamento...', {
    hasCode: !!code,
    hasState: !!state,
    error,
    path: '/auth/meta/callback',
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://buckskin-scoreless-barstool.ngrok-free.dev';

  try {
    // 1. Verifica se usuário recusou a autorização
    if (error) {
      console.warn(`❌ Usuário recusou autorização: ${error} - ${errorDescription}`);
      return redirectToError('user_denied', errorDescription || error, baseUrl);
    }

    // 2. Valida se recebeu o code
    if (!code) {
      console.error('❌ Code não recebido');
      return redirectToError('missing_code', 'No authorization code received', baseUrl);
    }

    console.log('✅ Code recebido:', code.substring(0, 20) + '...');

    // 3. Valida CSRF token (state)
    const cookieState = request.cookies.get('meta_oauth_state')?.value;
    console.log('🔐 Validando CSRF:', {
      hasCookieState: !!cookieState,
      match: cookieState === state,
    });

    if (!cookieState || cookieState !== state) {
      console.error('❌ CSRF validation failed');
      return redirectToError('csrf_validation_failed', 'CSRF token mismatch', baseUrl);
    }

    // 4. Troca authorization_code por access_token
    console.log('🔄 Trocando code por access_token...');
    const tokenData = await MetaOAuthService.exchangeCodeForToken(code);
    const { access_token } = tokenData;

    if (!access_token) {
      console.error('❌ Falha ao obter access_token');
      return redirectToError('token_exchange_failed', 'Failed to exchange code for token', baseUrl);
    }

    console.log('✅ Access token obtido');

    // 5. Busca contas Meta do usuário
    console.log('📱 Buscando contas Meta do usuário...');
    const accounts = await MetaOAuthService.getUserAdAccounts(access_token);
    console.log('✅ Contas encontradas:', accounts?.length || 0);

    if (!accounts || accounts.length === 0) {
      console.warn('⚠️ Usuário não tem contas Meta');
      return redirectToError('no_accounts', 'User has no Meta ad accounts', baseUrl);
    }

    // 6. Armazena sessão no Supabase (evita limite de ~4KB do cookie)
    console.log('💾 Salvando sessão temporária no Supabase...');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const { data: session, error: sessionError } = await supabase
      .from('meta_sessions')
      .insert({
        access_token,
        accounts,
        state,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('❌ Falha ao salvar sessão no Supabase:', sessionError);
      return redirectToError('session_save_failed', sessionError?.message || 'Failed to save session', baseUrl);
    }

    console.log('✅ Sessão salva. ID:', session.id);

    const response = NextResponse.redirect(new URL('/auth/meta/select', baseUrl));

    // Salva apenas o ID da sessão no cookie (pequeno, sem limite de tamanho)
    response.cookies.set('meta_session_id', session.id, {
      maxAge: 600,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.cookies.delete('meta_oauth_state');

    console.log('✅ [CALLBACK] Sucesso!');

    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ [CALLBACK] Erro:', errorMsg);
    return redirectToError('callback_failed', errorMsg, baseUrl);
  }
}

function redirectToError(errorCode: string, message: string, baseUrl: string) {
  return NextResponse.redirect(
    new URL(`/?auth_error=${errorCode}&message=${encodeURIComponent(message)}`, baseUrl)
  );
}
