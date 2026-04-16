import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase'; 
import { comparePassword } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // 1. Busca o usuário via Service Role (Bypass RLS)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', (email as string).trim())
      .maybeSingle(); // Usar maybeSingle para evitar erro se não encontrar nada

    if (userError || !user) {
      console.error('Login: Usuário não encontrado ou erro de banco.', userError);
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // 2. Validação de Senha (bCrypt)
    const isMatched = await comparePassword(password, user.encrypted_password);
    
    // Fallback de segurança para texto plano (apenas durante a transição se necessário)
    const isPlainMatched = password === user.encrypted_password;

    if (!isMatched && !isPlainMatched) {
      console.error('Login: Senha incorreta.');
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // 3. Gerir Sessão na tabela public.sessions
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token_hash: 'mm_' + Math.random().toString(36).substring(2) + Date.now(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
      })
      .select()
      .maybeSingle();

    if (sessionError || !session) {
      console.error('Erro ao gerar sessão:', sessionError);
      throw new Error('Falha ao gerar sessão no banco.');
    }

    // 4. Resposta com Cookie
    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, role: user.role, name: user.full_name } 
    });

    response.cookies.set('sb-manual-token', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });

    return response;

  } catch (err: any) {
    console.error('CRITICAL LOGIN ERROR:', err.message);
    return NextResponse.json({ error: 'Erro interno no servidor de autenticação.' }, { status: 500 });
  }
}
