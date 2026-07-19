'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { actionGetRecentImages } from '@/actions/image';
import { ImageInterface, Orientation } from '@/db/models/Image';
import Blurhash from './Blurhash';
import GridSkeleton from './GridSkeleton';
import { cn } from '@/utils/cn';

const PAGE = 30;

function Thumb({ img }: { img: ImageInterface }) {
    const [loaded, setLoaded] = useState(false);
    const [broken, setBroken] = useState(false);
    const ref = useRef<HTMLImageElement>(null);
    const src = img.urlThumb || img.url;
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (el.complete && el.naturalWidth > 0) setLoaded(true);
        if (el.complete && el.naturalWidth === 0) setBroken(true);
    }, []);
    if (broken) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 text-[10px]">
                이미지 없음
            </div>
        );
    }
    return (
        <div className="relative w-full h-full">
            {img.blurhash && !loaded && (
                <Blurhash hash={img.blurhash} className="absolute inset-0 w-full h-full" />
            )}
            <img
                ref={ref}
                src={src}
                alt={img.title}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                onError={() => setBroken(true)}
                className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
}

const FILTERS: { label: string; value?: Orientation }[] = [
    { label: '전체' },
    { label: '가로', value: 'landscape' },
    { label: '세로', value: 'portrait' },
    { label: '정사각', value: 'square' },
];

export default function HomeGrid({ initial }: { initial: ImageInterface[] }) {
    const [orientation, setOrientation] = useState<Orientation | undefined>(undefined);
    const [images, setImages] = useState<ImageInterface[]>(initial);
    const [done, setDone] = useState(initial.length < PAGE);
    const [loading, setLoading] = useState(false);
    const sentinel = useRef<HTMLDivElement>(null);

    // 필터 변경 시 리셋 후 다시 로드
    useEffect(() => {
        (async () => {
            setLoading(true);
            const list = await actionGetRecentImages({ limit: PAGE, orientation });
            setImages(list);
            setDone(list.length < PAGE);
            setLoading(false);
        })();
    }, [orientation]);

    useEffect(() => {
        if (done) return;
        const el = sentinel.current;
        if (!el) return;
        const io = new IntersectionObserver(async ([entry]) => {
            if (!entry.isIntersecting || loading) return;
            setLoading(true);
            const last = images[images.length - 1]?._id;
            const more = await actionGetRecentImages({ limit: PAGE, last_image_id: last, orientation });
            setImages(prev => [...prev, ...more]);
            if (more.length < PAGE) setDone(true);
            setLoading(false);
        }, { rootMargin: '400px' });
        io.observe(el);
        return () => io.disconnect();
    }, [images, done, loading, orientation]);

    return (
        <>
            <nav className="flex gap-1 text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                {FILTERS.map(f => (
                    <button
                        key={f.label}
                        onClick={() => setOrientation(f.value)}
                        className={cn(
                            "px-3 py-1 rounded-full transition-colors",
                            orientation === f.value
                                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                                : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </nav>

            {loading && images.length === 0 ? (
                <GridSkeleton count={12} />
            ) : images.length === 0 ? (
                <div className="text-center text-neutral-400 dark:text-neutral-500 py-24 text-sm">사진이 없습니다.</div>
            ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {images.map(img => (
                        <li key={img._id} className="aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                            <Link href={`/image/${img._id}`} className="block w-full h-full group">
                                <Thumb img={img} />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {!done && <div ref={sentinel} className="h-10" />}
            {loading && images.length > 0 && <GridSkeleton count={4} />}
        </>
    );
}
