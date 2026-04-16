import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-utils';

/**
 * ROTA DE REGISTRO MANUAL (RESTRITO A ADMINS/SUPER_ADMINS)
 * - NUNCA utiliza supabase.auth.signUp (Isolamento total do Supabase Auth)
 * - Registra EXCLUSIVAMENTE na tabela pública public.users
 * - EXECUTADO SOMENTE POR QUEM JÁ ESTÁ AUTÊNTICADO NO DASHBOARD E É ADMIN
 */

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'E-mail, Nome e Senha são obrigatórios.' }, { status: 400 });
    }

    // 1. Validação Simples (opcional, como este registro é interno, você confia no Admin)
    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    // 2. Hash da Senha com bCrypt
    const hashedPassword = await hashPassword(password);

    // 3. Inserção direta na tabela public.users (Bypass RLS via Service Role)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: (email as string).trim().toLowerCase(),
        encrypted_password: hashedPassword,
        full_name: name,
        role: role || 'MANAGER'
      })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('[REGISTRATION ERROR] Falha ao inserir usuário:', insertError.message);
      
      // Erro de e-mail duplicado
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });
      }
      
      return NextResponse.json({ error: 'Não foi possível salvar o usuário no banco de dados.' }, { status: 500 });
    }

    // 4. Sucesso (O usuário não é logado automaticamente aqui, o Admin apenas cria)
    return NextResponse.json({ 
      success: true, 
      message: 'Usuário cadastrado com sucesso!', 
      user: { id: newUser.id, email: newUser.email, name: newUser.full_name } 
    });

  } catch (error: any) {
    console.error('[CRITICAL REGISTRATION ERROR]', error.message);
    return NextResponse.json({ error: 'Erro interno ao processar cadastro.' }, { status: 500 });
  }
}
