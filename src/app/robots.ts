import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const base = process.env.SITE_URL || 'http://localhost:3031';
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/manage', '/upload', '/api', '/random'],
        },
        sitemap: `${base}/sitemap.xml`,
    };
}
