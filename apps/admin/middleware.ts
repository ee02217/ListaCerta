import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_COOKIE_NAME, getAdminToken } from './lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth');

  if (isPublicPath) {
    return NextResponse.next();
  }

  const cookieToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const expectedToken = getAdminToken();

  if (cookieToken !== expectedToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\.).*)'],
};
