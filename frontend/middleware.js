import { NextResponse } from 'next/server';

export async function middleware(request) {
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  const authToken = request.cookies.get('auth_token')?.value;
  if (!isPublicRoute && !authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (isPublicRoute && authToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};