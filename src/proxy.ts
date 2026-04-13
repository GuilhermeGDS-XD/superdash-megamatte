import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeRole } from '@/lib/roles';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  
  // Apenas a rota de login é pública.
  const isPublicRoute = url.pathname === '/login';

  // Proteção de rotas: Se não houver usuário e não estiver em rota pública, redireciona para login
  if (!user && !isPublicRoute) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Se estiver logado, evita a página de login
  if (user && url.pathname === '/login') {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Verificação de Roles (Apenas se o banco estiver sincronizado no Cloud)
  if (user && !isPublicRoute) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.warn('Profile sync error (Cloud):', profileError.message);
      } else if (profile) {
        const role = normalizeRole(profile.role);
        if (url.pathname.startsWith('/admin') && role === 'MANAGER') {
          url.pathname = '/';
          return NextResponse.redirect(url);
        }
      }
    } catch (e) {
      console.error('Middleware Profile Logic Error:', e);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
