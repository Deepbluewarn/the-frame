'use client';

import { useState } from 'react';
import { cn } from '@/utils/cn';

export default function ShareButton() {
    const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

    const share = async () => {
        const url = window.location.href;
        try {
            // 모바일 브라우저면 네이티브 공유 시트, 아니면 클립보드 복사
            if (navigator.share) {
                await navigator.share({ url, title: document.title });
                return;
            }
            await navigator.clipboard.writeText(url);
            setState('copied');
            setTimeout(() => setState('idle'), 1500);
        } catch {
            setState('failed');
            setTimeout(() => setState('idle'), 1500);
        }
    };

    return (
        <button
            type="button"
            onClick={share}
            aria-label="공유"
            className={cn(
                "inline-flex items-center gap-1.5 text-[11px] transition-colors leading-none",
                state === 'copied' ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeLinecap="round" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeLinecap="round" />
            </svg>
            <span>{state === 'copied' ? '복사됨' : state === 'failed' ? '실패' : '공유'}</span>
        </button>
    );
}
