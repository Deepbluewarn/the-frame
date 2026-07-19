import { actionGetAvailableYears } from '@/actions/image';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
    title: '아카이브',
    description: '연도별 사진 아카이브',
};

export default async function ArchiveIndex() {
    const years = await actionGetAvailableYears();
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <h1 className="text-lg font-medium mb-6">아카이브</h1>
            {years.length === 0 ? (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">사진이 없습니다.</p>
            ) : (
                <ul className="flex flex-wrap gap-4">
                    {years.map(y => (
                        <li key={y}>
                            <Link href={`/archive/${y}`} className="text-lg font-light hover:underline">
                                {y}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
