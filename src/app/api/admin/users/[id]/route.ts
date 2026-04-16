import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/users/[id] — Busca um usuário por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, can_view_logs')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

  return NextResponse.json({ user: data });
}

// PATCH /api/admin/users/[id] — Atualiza um usuário
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, role, password, can_view_logs } = await request.json();

  const updates: Record<string, any> = {
    full_name: name,
    role,
    can_view_logs: role === 'ADMIN' ? (can_view_logs ?? false) : false
  };

  if (password && password.trim() !== '') {
    updates.password = password;
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
