import { actionGetImagesByYear } from '@/actions/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SafeImg from '@/components/SafeImg';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { year: string } }): Promise<Metadata> {
    return {
        title: `${params.year}년 아카이브`,
        description: `${params.year}년에 촬영·업로드된 사진 모음`,
    };
}

export default async function ArchiveYear({ params }: { params: { year: string } }) {
    const year = parseInt(params.year, 10);
    if (!year || year < 1970 || year > 2200) notFound();
    const images = await actionGetImagesByYear(year);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <h1 className="text-lg font-medium mb-6">{year}</h1>
            {images.length === 0 ? (
                <p className="text-sm text-neutral-400 dark:text-neutral-500 py-10 text-center">
                    이 해에 촬영된 사진이 없습니다.
                </p>
            ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {images.map(img => (
                        <li key={img._id} className="aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                            <Link href={`/image/${img._id}`} className="block w-full h-full group">
                                <SafeImg src={img.urlThumb || img.url} alt={img.title} loading="lazy" className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
