import { NextResponse } from 'next/server';

export function middleware(request) {
  // Daftar route yang boleh diakses tanpa login
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  const authToken = request.cookies.get('auth_token')?.value;
  
  if (!authToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (authToken && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// Konfigurasi middleware untuk route mana saja yang dilindungi
export const config = {
  matcher: [
    /*
     * Match semua request paths kecuali:
     * 1. /api (API routes)
     * 2. /_next/static (static files)
     * 3. /_next/image (image optimization files)
     * 4. /favicon.ico (favicon file)
     * 5. Route public (/login, /register, /forgot-password)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};