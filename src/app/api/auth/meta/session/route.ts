import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/meta/session
 * 
 * Lê os dados de sessão OAuth do cookie httpOnly
 * Usado pela página /auth/meta/select para preencher lista de contas
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== GET /api/auth/meta/session ===');
    console.log('Cookies:', request.cookies.getSetCookie());
    
    // Lê cookie de sessão
    const sessionCookie = request.cookies.get('meta_oauth_session')?.value;

    console.log('Session cookie value:', sessionCookie ? 'EXISTS' : 'NOT FOUND');

    if (!sessionCookie) {
      console.warn('No meta_oauth_session cookie found');
      console.log('All cookies:', Array.from(request.cookies.getSetCookie()));
      
      return NextResponse.json(
        { 
          error: 'Sessão expirou ou inválida',
          debug: {
            hasCookie: false,
            cookies: Array.from(request.cookies.getSetCookie()),
          }
        },
        { status: 401 }
      );
    }

    // Parse dos dados
    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
      console.log('Session parsed successfully, accounts:', sessionData.accounts?.length || 0);
    } catch (parseError) {
      console.error('Failed to parse session cookie:', parseError);
      console.error('Cookie content:', sessionCookie.substring(0, 100));
      
      return NextResponse.json(
        { 
          error: 'Sessão inválida (parse error)',
          debug: {
            parseError: parseError instanceof Error ? parseError.message : 'Unknown',
            cookieStart: sessionCookie.substring(0, 50),
          }
        },
        { status: 400 }
      );
    }

    // Valida se ainda dentro do prazo
    if (sessionData.expires_at < Date.now()) {
      console.warn('Session expired');
      return NextResponse.json(
        { error: 'Sessão expirada. Tente novamente.' },
        { status: 401 }
      );
    }

    // Retorna apenas as contas (sem o token sensível)
    return NextResponse.json({
      success: true,
      accounts: sessionData.accounts,
      createdAt: sessionData.created_at,
    });
  } catch (error) {
    console.error('Error reading session:', error);
    return NextResponse.json(
      { error: 'Erro ao ler sessão', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
