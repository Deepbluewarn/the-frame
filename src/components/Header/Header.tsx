import Link from "next/link";
import { isAdmin } from "@/utils/auth-wrapper";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
    const admin = isAdmin();
    return (
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
                <Link href="/" className="text-sm tracking-[0.3em] font-medium">
                    THE FRAME
                </Link>
                <nav className="ml-auto flex items-center gap-5 text-xs text-neutral-500 dark:text-neutral-400">
                    <Link href="/archive" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">아카이브</Link>
                    <Link href="/random" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">랜덤</Link>
                    {admin && (
                        <>
                            <Link href="/upload" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">업로드</Link>
                            <Link href="/manage" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">관리</Link>
                        </>
                    )}
                    <ThemeToggle />
                </nav>
            </div>
        </header>
    );
}
