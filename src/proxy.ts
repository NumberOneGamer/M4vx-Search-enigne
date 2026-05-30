import { NextResponse, type NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';

const publicPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/search',
  '/api/suggestions',
];

const adminPaths = [
  '/api/admin',
  '/admin',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/analytics/click') {
    return NextResponse.next();
  }

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  const authCookie = request.cookies.get('auth_token');

  if (adminPaths.some((p) => pathname.startsWith(p))) {
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authCookie?.value;

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required', statusCode: 401 },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const payload = await verifyTokenEdge(token);
    if (!payload) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid token', statusCode: 401 },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (payload.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required', statusCode: 403 },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
