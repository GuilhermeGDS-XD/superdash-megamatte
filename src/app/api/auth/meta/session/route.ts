import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/meta/session
 * 
 * Lê os dados de sessão OAuth do cookie httpOnly
 * Usado pela página /auth/meta/select para preencher lista de contas
 */
export async function GET(request: NextRequest) {
  try {
    // Lê cookie de sessão
    const sessionCookie = request.cookies.get('meta_oauth_session')?.value;

    if (!sessionCookie) {
      console.warn('No meta_oauth_session cookie found');
      return NextResponse.json(
        { error: 'Sessão expirou ou inválida' },
        { status: 401 }
      );
    }

    // Parse dos dados
    const sessionData = JSON.parse(sessionCookie);

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
      accounts: sessionData.accounts,
      createdAt: sessionData.created_at,
    });
  } catch (error) {
    console.error('Error reading session:', error);
    return NextResponse.json(
      { error: 'Erro ao ler sessão' },
      { status: 500 }
    );
  }
}
