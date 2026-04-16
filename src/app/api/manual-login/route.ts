import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase'; 
import { comparePassword } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // 1. Busca o usuário diretamente na tabela public.users
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .single();

    if (error || !user) {
      console.error('Usuário não encontrado ou erro na query:', { 
        email: email.trim(), 
        error: error?.message,
        code: error?.code 
      });
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    console.log('Usuário encontrado:', user.email);
    
    // Suporte temporário para texto plano ou hash
    let isPasswordCorrect = false;
    if (user.encrypted_password === password) {
      console.log('Login via texto plano (sucesso temporário)');
      isPasswordCorrect = true;
    } else {
      isPasswordCorrect = await comparePassword(password, user.encrypted_password);
      console.log('Login via bCrypt:', isPasswordCorrect);
    }

    if (!isPasswordCorrect) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // 3. Cria uma sessão manual na tabela sessions
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Sessão de 7 dias

    // Usamos um token aleatório (pode ser expandido para JWT se necessário, 
    // mas para simplicidade usaremos o ID da sessão como token no cookie)
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token_hash: 'manual_session_' + Math.random().toString(36).substring(2),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Erro ao criar sessão:', sessionError);
      return NextResponse.json({ error: 'Erro interno ao criar sessão.' }, { status: 500 });
    }

    // 4. Define o cookie de sessão
    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

    response.cookies.set('sb-manual-token', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });

    return response;

  } catch (error) {
    console.error('Erro na rota de login:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
