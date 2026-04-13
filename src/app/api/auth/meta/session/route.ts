import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/auth/meta/session
 *
 * Lê a sessão OAuth temporária do Supabase a partir do session_id no cookie.
 * Retorna apenas as contas (sem o token sensível).
 */
export async function GET(request: NextRequest) {
  console.log('🔵 [SESSION] Buscando sessão OAuth...');

  const sessionId = request.cookies.get('meta_session_id')?.value;

  if (!sessionId) {
    console.error('❌ [SESSION] Cookie meta_session_id não encontrado');
    return NextResponse.json(
      { error: 'Sessão não encontrada. Inicie o fluxo novamente.' },
      { status: 401 }
    );
  }

  console.log('✅ [SESSION] Session ID encontrado:', sessionId);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: session, error } = await supabase
      .from('meta_sessions')
      .select('id, accounts, expires_at, created_at')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      console.error('❌ [SESSION] Sessão não encontrada no Supabase:', error?.message);
      return NextResponse.json(
        { error: 'Sessão expirou ou é inválida. Tente novamente.' },
        { status: 401 }
      );
    }

    // Valida expiração
    if (new Date(session.expires_at) < new Date()) {
      console.warn('⏰ [SESSION] Sessão expirada:', session.expires_at);
      await supabase.from('meta_sessions').delete().eq('id', sessionId);
      return NextResponse.json(
        { error: 'Sessão expirada. Inicie o fluxo novamente.' },
        { status: 401 }
      );
    }

    console.log('✅ [SESSION] Sessão válida. Contas:', session.accounts?.length || 0);

    return NextResponse.json({
      success: true,
      accounts: session.accounts,
      createdAt: session.created_at,
    });
  } catch (err) {
    console.error('❌ [SESSION] Erro inesperado:', err);
    return NextResponse.json(
      { error: 'Erro interno ao buscar sessão.', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
