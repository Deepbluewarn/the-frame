'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error(error); }, [error]);
    return (
        <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-6 text-neutral-500 dark:text-neutral-400">
            <p className="text-4xl font-light tracking-widest">업로드 실패</p>
            <p className="text-xs max-w-md text-center break-words">{error.message}</p>
            <div className="flex gap-4 text-xs">
                <button onClick={reset} className="underline hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                    다시 시도
                </button>
                <Link href="/" className="underline hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                    홈으로
                </Link>
            </div>
        </div>
    );
}
