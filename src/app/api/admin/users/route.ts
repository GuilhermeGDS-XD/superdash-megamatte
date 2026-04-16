import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/users — Lista todos os usuários (exceto SUPER_ADMIN)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, created_at')
    .neq('role', 'SUPER_ADMIN')
    .order('full_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

// DELETE /api/admin/users — Remove um usuário pelo id
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('users').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
