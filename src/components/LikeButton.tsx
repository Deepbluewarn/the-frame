'use client';

import { useState, useTransition } from 'react';
import { actionToggleLike } from '@/actions/image';
import { cn } from '@/utils/cn';

export default function LikeButton({
    imageId, initialLiked, initialCount,
}: {
    imageId: string; initialLiked: boolean; initialCount: number;
}) {
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [pending, start] = useTransition();

    const onClick = () => {
        if (pending) return;
        const next = !liked;
        setLiked(next);
        setCount(c => c + (next ? 1 : -1));
        start(async () => {
            const res = await actionToggleLike(imageId, next);
            if (!res.changed) {
                // 서버가 무시(중복) — 상태 되돌림
                setLiked(!next);
                setCount(c => c + (next ? -1 : 1));
            }
        });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={pending}
            aria-pressed={liked}
            aria-label={liked ? '좋아요 취소' : '좋아요'}
            className={cn(
                "inline-flex items-center gap-1 text-[11px] transition-colors leading-none",
                liked ? "text-neutral-700" : "text-neutral-400 hover:text-neutral-700"
            )}
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <span className="tabular-nums">{count}</span>
        </button>
    );
}
