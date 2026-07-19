import { MetadataRoute } from 'next';
import Image from '@/db/models/Image';
import dbConnect from '@/db/init';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    await dbConnect();
    const base = process.env.SITE_URL || 'http://localhost:3031';
    const images = await Image.find({ visibility: 'public' }, { _id: 1, uploadedAt: 1 }).lean();

    const years = Array.from(new Set(images.map(i => new Date(i.uploadedAt).getFullYear())));

    return [
        { url: base, changeFrequency: 'daily', priority: 1.0 },
        { url: `${base}/archive`, changeFrequency: 'weekly', priority: 0.7 },
        ...years.map(y => ({
            url: `${base}/archive/${y}`,
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        })),
        ...images.map(img => ({
            url: `${base}/image/${img._id}`,
            lastModified: img.uploadedAt,
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        })),
    ];
}
