import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeRole } from '@/lib/roles';

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Rotas públicas que não precisam de autenticação
  const isPublicRoute = url.pathname === '/login';
  const isApiAuthRoute = url.pathname.startsWith('/api/');

  // Não bloqueia rotas de API (elas cuidam da própria autenticação)
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Lê o cookie de sessão manual
  const sessionId = request.cookies.get('session_id')?.value;

  // Se não tem sessão e não é rota pública, redireciona para login
  if (!sessionId && !isPublicRoute) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Se tem sessão e está tentando acessar /login, redireciona para home
  if (sessionId && isPublicRoute) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Verificação de role para rotas de admin
  if (sessionId && url.pathname.startsWith('/admin')) {
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('users(role)')
        .eq('id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!session || !session.users) {
        // Sessão inválida ou expirada
        url.pathname = '/login';
        const response = NextResponse.redirect(url);
        response.cookies.set('session_id', '', { maxAge: 0, path: '/' });
        return response;
      }

      const userData = session.users as any;
      const role = normalizeRole(userData.role);

      // MANAGER não tem acesso a rotas de admin
      if (role === 'MANAGER') {
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    } catch (e) {
      console.error('Middleware: Erro ao verificar role:', e);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
