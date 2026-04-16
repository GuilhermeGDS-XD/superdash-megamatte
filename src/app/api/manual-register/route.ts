import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar se quem está chamando é ADMIN ou SUPER_ADMIN (opcional, mas recomendado)
    // Para simplificar agora, vamos focar na lógica de criação
    
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    const supabase = createClient();

    // 2. Hash da senha
    const hashedPassword = await hashPassword(password);

    // 3. Inserção direta na tabela public.users
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email,
        encrypted_password: hashedPassword,
        full_name: name,
        role: role || 'MANAGER'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir usuário:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Erro ao criar conta no banco de dados.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: newUser });

  } catch (error) {
    console.error('Erro na rota de registro:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
