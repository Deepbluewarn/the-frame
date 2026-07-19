import { NextRequest, NextResponse } from 'next/server';
import { config as env } from '@/config/env';

const REALM = 'THE FRAME admin';

function unauthorized() {
  return new NextResponse('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` },
  });
}

export function middleware(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return unauthorized();

  try {
    const [user, pass] = Buffer.from(header.slice(6), 'base64').toString().split(':');
    if (user !== env.ADMIN_USER || pass !== env.ADMIN_PASS) return unauthorized();
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/upload/:path*', '/manage/:path*'],
};
