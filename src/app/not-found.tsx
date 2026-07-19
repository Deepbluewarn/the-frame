import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-6 text-neutral-500 dark:text-neutral-400">
            <p className="text-6xl font-light tracking-widest">404</p>
            <p className="text-sm">이 프레임엔 아무것도 없습니다.</p>
            <Link href="/" className="text-xs underline hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                홈으로
            </Link>
        </div>
    );
}
