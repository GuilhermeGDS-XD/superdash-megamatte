import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/logs — Lista logs (join com users para pegar nome)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('logs')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data });
}
