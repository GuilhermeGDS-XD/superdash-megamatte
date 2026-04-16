import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // Verifica se o e-mail já existe
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('email', (email as string).trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 400 });
    }

    // Insere diretamente na tabela public.users (sem criptografia)
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        email: (email as string).trim().toLowerCase(),
        password: password,
        full_name: name,
        role: role || 'MANAGER'
      })
      .select('id, email, full_name, role')
      .maybeSingle();

    if (insertError) {
      console.error('[REGISTRO] Erro ao inserir usuário:', insertError.message);
      return NextResponse.json({ error: 'Não foi possível salvar o usuário.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      user: newUser
    });

  } catch (err: any) {
    console.error('[REGISTRO] Erro crítico:', err.message);
    return NextResponse.json({ error: 'Falha interna no servidor.' }, { status: 500 });
  }
}
