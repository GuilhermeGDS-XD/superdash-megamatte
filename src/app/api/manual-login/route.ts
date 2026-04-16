import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase'; 
import { comparePassword } from '@/lib/auth-utils';

/**
 * ROTA DE LOGIN DEFINITIVA (ISOLAMENTO TOTAL)
 * - NUNCA utiliza supabase.auth.signInWithPassword (Nativo do Supabase Auth)
 * - Consulta EXCLUSIVAMENTE a tabela public.users
 * - Utiliza bCrypt para comparação de hash
 * - Gerencia sessões manualmente na tabela public.sessions
 */

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // 1. Busca o usuário diretamente na tabela public.users (Bypass RLS via Service Role)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', (email as string).trim())
      .maybeSingle();

    if (userError) {
      console.error('[AUTH ERROR] Falha na consulta de usuário:', userError.message);
      return NextResponse.json({ error: 'Erro de conexão com o banco.' }, { status: 500 });
    }

    if (!user) {
      console.error('[AUTH ERROR] Usuário não encontrado:', email);
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // 2. Validação bCrypt (Comparação de hash seguro)
    const isMatched = await comparePassword(password, user.encrypted_password);
    
    // Fallback de transição: se o usuário ainda tiver senha em texto plano, permite o acesso (opcional)
    const isPlainMatched = password === user.encrypted_password;

    if (!isMatched && !isPlainMatched) {
      console.error('[AUTH ERROR] Senha incorreta para o usuário:', email);
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // 3. Gerenciamento Manual de Sessão (public.sessions)
    // Limpa sessões expiradas antes de criar uma nova
    await supabase.from('sessions').delete().lt('expires_at', new Date().toISOString());

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token_hash: 'mm_' + Math.random().toString(36).substring(2) + Date.now(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .maybeSingle();

    if (sessionError || !session) {
      console.error('[AUTH ERROR] Falha ao gravar sessão no banco:', sessionError?.message);
      return NextResponse.json({ error: 'Não foi possível iniciar sua sessão.' }, { status: 500 });
    }

    // 4. Resposta com Cookie de Sessão Protegido
    const response = NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        name: user.full_name 
      } 
    });

    response.cookies.set('sb-manual-token', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 dias (em segundos)
    });

    return response;

  } catch (err: any) {
    console.error('[CRITICAL LOGIN ERROR]', err.message);
    return NextResponse.json({ error: 'Falha interna crítica no serviço de autenticação.' }, { status: 500 });
  }
}
