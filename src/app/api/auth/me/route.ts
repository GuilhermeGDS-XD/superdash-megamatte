import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/auth/me
 * Valida o cookie de sessão e retorna os dados do usuário logado.
 * Como o cookie é httpOnly, o frontend não consegue lê-lo diretamente.
 * Esta rota é o único ponto de acesso ao usuário da sessão atual.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Valida a sessão e retorna os dados do usuário (JOIN via foreign key)
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('id, expires_at, users(id, email, full_name, role)')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !session || !session.users) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const userData = session.users as any;

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.full_name,
        full_name: userData.full_name,
        role: userData.role
      }
    });

  } catch (err: any) {
    console.error('[AUTH/ME] Erro crítico:', err.message);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/me
 * Faz o logout removendo a sessão do banco e limpando o cookie.
 */
export async function DELETE(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;

  if (sessionId) {
    await supabaseAdmin.from('sessions').delete().eq('id', sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('session_id', '', { maxAge: 0, path: '/' });
  return response;
}
