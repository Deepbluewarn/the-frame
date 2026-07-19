import { headers } from 'next/headers';
import { config } from '@/config/env';

export function isAdmin(): boolean {
    const header = headers().get('authorization');
    if (!header?.startsWith('Basic ')) return false;
    try {
        const [user, pass] = Buffer.from(header.slice(6), 'base64').toString().split(':');
        return user === config.ADMIN_USER && pass === config.ADMIN_PASS;
    } catch {
        return false;
    }
}

export function assertAdmin(): void {
    if (!isAdmin()) throw new Error('관리자 권한이 필요합니다.');
}
