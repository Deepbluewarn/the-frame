'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PhotoNavigator({
    prevId, nextId, prevUrl, nextUrl,
}: {
    prevId?: string; nextId?: string;
    prevUrl?: string; nextUrl?: string;
}) {
    const router = useRouter();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && prevId) router.push(`/image/${prevId}`);
            if (e.key === 'ArrowRight' && nextId) router.push(`/image/${nextId}`);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [prevId, nextId, router]);

    // 모바일 스와이프
    useEffect(() => {
        let startX = 0, startY = 0;
        const SWIPE_MIN = 60;
        const onStart = (e: TouchEvent) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        };
        const onEnd = (e: TouchEvent) => {
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) return;
            if (dx < 0 && nextId) router.push(`/image/${nextId}`);
            if (dx > 0 && prevId) router.push(`/image/${prevId}`);
        };
        window.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('touchend', onEnd, { passive: true });
        return () => {
            window.removeEventListener('touchstart', onStart);
            window.removeEventListener('touchend', onEnd);
        };
    }, [prevId, nextId, router]);

    return (
        <>
            {/* 이웃 사진 브라우저 캐시 프리로드 */}
            {prevUrl && <img src={prevUrl} alt="" style={{ display: 'none' }} aria-hidden />}
            {nextUrl && <img src={nextUrl} alt="" style={{ display: 'none' }} aria-hidden />}

            {prevId && (
                <Link
                    href={`/image/${prevId}`}
                    aria-label="이전 사진"
                    className="fixed left-0 top-1/2 -translate-y-1/2 h-24 w-10 flex items-center justify-center text-neutral-300 hover:text-neutral-800 hover:bg-white/60 transition-colors z-10"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
            )}
            {nextId && (
                <Link
                    href={`/image/${nextId}`}
                    aria-label="다음 사진"
                    className="fixed right-0 top-1/2 -translate-y-1/2 h-24 w-10 flex items-center justify-center text-neutral-300 hover:text-neutral-800 hover:bg-white/60 transition-colors z-10"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
            )}
        </>
    );
}
