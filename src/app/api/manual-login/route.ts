import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // Busca o usuário diretamente na tabela public.users
    // Seleciona 'encrypted_password' pois é o nome atual da coluna no banco
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, encrypted_password')
      .ilike('email', (email as string).trim())
      .maybeSingle();

    if (userError) {
      console.error('[LOGIN] Erro ao consultar banco:', userError.message, JSON.stringify(userError));
      return NextResponse.json({ error: 'Erro ao consultar banco de dados: ' + userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'E-mail não encontrado.' }, { status: 401 });
    }

    // Comparação simples de senha (texto plano)
    if (user.encrypted_password !== password) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
    }

    // Cria a sessão na tabela public.sessions
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: user.id,
        token_hash: 'sess_' + Math.random().toString(36).substring(2) + Date.now(),
        expires_at: expiresAt.toISOString()
      })
      .select('id')
      .maybeSingle();

    if (sessionError || !session) {
      console.error('[LOGIN] Erro ao criar sessão:', sessionError?.message);
      return NextResponse.json({ error: 'Não foi possível criar a sessão.' }, { status: 500 });
    }

    // Retorna resposta com cookie de sessão
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role
      }
    });

    response.cookies.set('session_id', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;

  } catch (err: any) {
    console.error('[LOGIN] Erro crítico:', err.message);
    return NextResponse.json({ error: 'Falha interna no servidor.' }, { status: 500 });
  }
}
