import { NextRequest, NextResponse } from 'next/server';
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

  console.log('🔵 [CALLBACK] Iniciando tratamento...', {
    hasCode: !!code,
    hasState: !!state,
    error,
    url: request.url,
  });

  try {
    // 1. Verifica se usuário recusou a autorização
    if (error) {
      console.warn(`❌ Usuário recusou autorização: ${error} - ${errorDescription}`);
      return redirectToError('user_denied', errorDescription || error);
    }

    // 2. Valida se recebeu o code
    if (!code) {
      console.error('❌ Code não recebido');
      return redirectToError('missing_code', 'No authorization code received');
    }

    console.log('✅ Code recebido:', code.substring(0, 20) + '...');

    // 3. Valida CSRF token (state)
    const cookieState = request.cookies.get('meta_oauth_state')?.value;
    console.log('🔐 Validando CSRF:', {
      cookieState: cookieState?.substring(0, 10),
      paramState: state?.substring(0, 10),
      match: cookieState === state,
    });

    if (!cookieState || cookieState !== state) {
      console.error('❌ CSRF validation failed');
      return redirectToError('csrf_validation_failed', 'CSRF token mismatch');
    }

    // 4. Troca authorization_code por access_token
    console.log('🔄 Trocando code por access_token...');
    const tokenData = await MetaOAuthService.exchangeCodeForToken(code);
    const { access_token } = tokenData;

    if (!access_token) {
      console.error('❌ Falha ao obter access_token');
      return redirectToError('token_exchange_failed', 'Failed to exchange code for token');
    }

    console.log('✅ Access token obtido:', access_token.substring(0, 20) + '...');

    // 5. Busca contas Meta do usuário
    console.log('📱 Buscando contas Meta do usuário...');
    const accounts = await MetaOAuthService.getUserAdAccounts(access_token);
    console.log('✅ Contas encontradas:', accounts?.length || 0);

    if (!accounts || accounts.length === 0) {
      console.warn('⚠️ Usuário não tem contas Meta');
      return redirectToError('no_accounts', 'User has no Meta ad accounts');
    }

    // 6. Armazena dados temporários em cookie
    const sessionData = {
      access_token,
      accounts,
      created_at: Date.now(),
      expires_at: Date.now() + 10 * 60 * 1000, // 10 minutos
    };

    console.log('💾 Salvando sessão temporária...');

    const response = NextResponse.redirect(
      new URL('/auth/meta/select', request.url)
    );

    // Salva dados da sessão em cookie seguro
    response.cookies.set('meta_oauth_session', JSON.stringify(sessionData), {
      maxAge: 600, // 10 minutos
      httpOnly: false, // Deixar acessível ao JS pra poder usar sessionStorage
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Remove o state cookie após usar
    response.cookies.delete('meta_oauth_state');

    console.log('✅ [CALLBACK] Sucesso! Redirecionando para /auth/meta/select');

    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('❌ [CALLBACK] Erro:', {
      message: errorMsg,
      stack: errorStack,
      code: searchParams.get('code')?.substring(0, 20),
    });

    return redirectToError('callback_failed', errorMsg);
  }
}

/**
 * Helper para redirecionar com erro visível
 */
function redirectToError(errorCode: string, message: string) {
  try {
    return NextResponse.redirect(
      new URL(
        `/dashboard?auth_error=${errorCode}&message=${encodeURIComponent(message)}`,
        process.env.NEXT_PUBLIC_SITE_URL || 'https://buckskin-scoreless-barstool.ngrok-free.dev'
      )
    );
  } catch (e) {
    // Se redirect falhar, retornar HTML com mensagem
    console.error('Redirect falhou, retornando HTML de erro');
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Erro de Autenticação</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
            h1 { color: #d32f2f; margin-top: 0; }
            p { color: #666; line-height: 1.6; }
            .code { background: #f5f5f5; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #d32f2f; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Erro de Autenticação</h1>
            <p><strong>Código:</strong></p>
            <div class="code">${errorCode}</div>
            <p><strong>Mensagem:</strong></p>
            <p>${message}</p>
            <p style="margin-top: 24px; font-size: 12px; color: #999;">
              <a href="/dashboard" style="color: #1976d2; text-decoration: none;">← Voltar ao dashboard</a>
            </p>
          </div>
        </body>
      </html>
      `,
      {
        status: 400,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }
}
