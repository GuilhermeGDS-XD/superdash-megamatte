import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { MetaOAuthService } from '@/services/metaOAuthService';

/**
 * GET /auth/meta/connect
 * 
 * Inicia o fluxo OAuth2 Meta
 * Gera um state token e redireciona para o login Meta em popup
 * 
 * Fluxo:
 * 1. Gera state token para CSRF protection
 * 2. Gera URL de login Meta
 * 3. Redireciona (popup vai abrir essa URL)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Gera state token para CSRF protection
    const state = MetaOAuthService.generateStateToken();

    // 2. Salva state em cookie httpOnly (temporário, 5 minutos)
    const response = NextResponse.redirect(MetaOAuthService.getLoginUrl(state));
    
    response.cookies.set('meta_oauth_state', state, {
      maxAge: 300, // 5 minutos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OAuth connect error:', error);
    
    // Redireciona de volta pro dashboard com erro
    return NextResponse.redirect(
      new URL(
        '/dashboard?auth_error=connect_failed&message=' + 
        encodeURIComponent(error instanceof Error ? error.message : 'Unknown error'),
        request.url
      )
    );
  }
}
