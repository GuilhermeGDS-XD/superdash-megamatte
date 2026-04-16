import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/users/list — Lista usuários para o filtro
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name')
      .order('full_name');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return NextResponse.json({ users: [] });
    }

    return NextResponse.json({ users: data || [] });
  } catch (err: any) {
    console.error('Route error fetching users:', err.message);
    return NextResponse.json({ users: [] });
  }
}
