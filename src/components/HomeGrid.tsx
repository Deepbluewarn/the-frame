'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { actionGetRecentImages } from '@/actions/image';
import { ImageInterface } from '@/db/models/Image';

const PAGE = 30;

export default function HomeGrid({ initial }: { initial: ImageInterface[] }) {
    const [images, setImages] = useState<ImageInterface[]>(initial);
    const [done, setDone] = useState(initial.length < PAGE);
    const [loading, setLoading] = useState(false);
    const sentinel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (done) return;
        const el = sentinel.current;
        if (!el) return;
        const io = new IntersectionObserver(async ([entry]) => {
            if (!entry.isIntersecting || loading) return;
            setLoading(true);
            const last = images[images.length - 1]?._id;
            const more = await actionGetRecentImages({ limit: PAGE, last_image_id: last });
            setImages(prev => [...prev, ...more]);
            if (more.length < PAGE) setDone(true);
            setLoading(false);
        }, { rootMargin: '400px' });
        io.observe(el);
        return () => io.disconnect();
    }, [images, done, loading]);

    if (images.length === 0) {
        return <div className="text-center text-neutral-400 dark:text-neutral-500 py-24 text-sm">아직 사진이 없습니다.</div>;
    }

    return (
        <>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {images.map(img => (
                    <li key={img._id} className="aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                        <Link href={`/image/${img._id}`} className="block w-full h-full group">
                            <img
                                src={img.url}
                                alt={img.title}
                                loading="lazy"
                                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                            />
                        </Link>
                    </li>
                ))}
            </ul>
            {!done && <div ref={sentinel} className="h-10" />}
            {loading && <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 py-4">불러오는 중...</p>}
        </>
    );
}
