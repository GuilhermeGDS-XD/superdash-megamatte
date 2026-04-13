import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/auth/meta/session
 *
 * Limpa a sessão OAuth temporária após todas as contas serem salvas.
 */
export async function DELETE(request: NextRequest) {
  const sessionId = request.cookies.get('meta_session_id')?.value;

  if (sessionId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from('meta_sessions').delete().eq('id', sessionId);
    console.log('🧹 [SESSION CLEANUP] Sessão removida:', sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('meta_session_id');
  return response;
}
