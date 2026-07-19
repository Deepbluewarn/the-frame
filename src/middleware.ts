import { NextRequest, NextResponse } from 'next/server';

const REALM = 'THE FRAME admin';

function unauthorized() {
  return new NextResponse('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` },
  });
}

export function middleware(req: NextRequest) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;
  if (!expectedUser || !expectedPass) return unauthorized();

  const header = req.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return unauthorized();

  const [user, pass] = Buffer.from(header.slice(6), 'base64').toString().split(':');
  if (user !== expectedUser || pass !== expectedPass) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ['/upload/:path*', '/manage/:path*'],
};
