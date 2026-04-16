import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// PATCH /api/admin/profile — Atualiza o perfil do usuário logado
export async function PATCH(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { session } = await supabaseAdmin
    .from('sessions')
    .select('user_id')
    .eq('id', sessionId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
    .then(r => ({ session: r.data }));

  if (!session) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });

  const { name } = await request.json();

  const { error } = await supabaseAdmin
    .from('users')
    .update({ full_name: name })
    .eq('id', session.user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
