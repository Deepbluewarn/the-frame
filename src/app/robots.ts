import { MetadataRoute } from 'next';
import { config } from '@/config/env';

// robots.txt를 빌드 시점에 정적 생성하면 SITE_URL이 없어 sitemap이 localhost로 박힘.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
    const base = config.SITE_URL || 'http://localhost:3031';
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/manage', '/upload', '/api', '/random'],
        },
        sitemap: `${base}/sitemap.xml`,
    };
}
