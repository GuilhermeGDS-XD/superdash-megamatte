import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MetaOAuthService } from '@/services/metaOAuthService';

/**
 * GET /auth/meta/callback
 * 
 * Callback que Meta redireciona após usuário autorizar
 * 
 * Fluxo:
 * 1. Valida authorization_code recebido
 * 2. Verifica CSRF token (state)
 * 3. Troca code por access_token
 * 4. Busca contas Meta do usuário
 * 5. Salva dados temporários em meta_sessions
 * 6. Redireciona para /auth/meta/select
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  try {
    // 1. Verifica se usuário recusou a autorização
    if (error) {
      console.warn(`User denied authorization: ${error} - ${errorDescription}`);
      return NextResponse.redirect(
        new URL(
          `/dashboard?auth_error=user_denied&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // 2. Valida se recebeu o code
    if (!code) {
      console.error('Missing authorization code');
      return NextResponse.redirect(
        new URL('/dashboard?auth_error=missing_code', request.url)
      );
    }

    // 3. Valida CSRF token (state)
    const cookieState = request.cookies.get('meta_oauth_state')?.value;
    if (!cookieState || cookieState !== state) {
      console.error('CSRF validation failed');
      return NextResponse.redirect(
        new URL('/dashboard?auth_error=csrf_validation_failed', request.url)
      );
    }

    // 4. Inicializa Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5. Troca authorization_code por access_token
    const { access_token } = await MetaOAuthService.exchangeCodeForToken(code);

    // 6. Busca contas Meta do usuário
    const accounts = await MetaOAuthService.getUserAdAccounts(access_token);

    if (!accounts || accounts.length === 0) {
      console.warn('User has no Meta ad accounts');
      return NextResponse.redirect(
        new URL('/dashboard?auth_error=no_accounts', request.url)
      );
    }

    // 7. Armazena dados temporários em cookie
    const sessionData = {
      access_token,
      accounts,
      created_at: Date.now(),
      expires_at: Date.now() + 10 * 60 * 1000, // 10 minutos
    };

    console.log('OAuth callback sucesso - redirecionando para /auth/meta/select');

    const response = NextResponse.redirect(
      new URL('/auth/meta/select', request.url)
    );

    // Salva dados da sessão em cookie seguro
    response.cookies.set('meta_oauth_session', JSON.stringify(sessionData), {
      maxAge: 600, // 10 minutos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Remove o state cookie após usar
    response.cookies.delete('meta_oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);

    return NextResponse.redirect(
      new URL(
        '/dashboard?auth_error=callback_failed&message=' +
        encodeURIComponent(error instanceof Error ? error.message : 'Unknown error'),
        request.url
      )
    );
  }
}
