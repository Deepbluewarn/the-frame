import { headers } from 'next/headers';

export function isAdmin(): boolean {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;
  if (!expectedUser || !expectedPass) return false;

  const header = headers().get('authorization');
  if (!header?.startsWith('Basic ')) return false;

  const [user, pass] = Buffer.from(header.slice(6), 'base64').toString().split(':');
  return user === expectedUser && pass === expectedPass;
}

export function assertAdmin(): void {
  if (!isAdmin()) throw new Error('관리자 권한이 필요합니다.');
}
