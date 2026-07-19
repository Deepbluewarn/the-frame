import { MetadataRoute } from 'next';
import { config } from '@/config/env';

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
