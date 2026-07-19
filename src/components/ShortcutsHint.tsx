'use client';

import { useEffect, useRef } from 'react';

export default function ShortcutsHint() {
    const dlgRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                if (dlgRef.current?.open) dlgRef.current.close();
                else dlgRef.current?.showModal();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <dialog
            ref={dlgRef}
            onClick={() => dlgRef.current?.close()}
            className="rounded p-0 backdrop:bg-black/60 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 w-full max-w-sm"
        >
            <div className="p-6 space-y-3">
                <h2 className="text-sm font-medium mb-4">키보드 단축키</h2>
                <dl className="text-xs space-y-2">
                    <Row keys={['←', '→']} label="이전 / 다음 사진" />
                    <Row keys={['↑']} label="확대 보기" />
                    <Row keys={['↓', 'Esc']} label="확대 닫기" />
                    <Row keys={['?']} label="이 창 열기 / 닫기" />
                </dl>
            </div>
        </dialog>
    );
}

function Row({ keys, label }: { keys: string[]; label: string }) {
    return (
        <div className="flex items-center gap-3">
            <dt className="flex gap-1 shrink-0">
                {keys.map(k => (
                    <kbd key={k} className="px-1.5 py-0.5 text-[10px] font-mono border border-neutral-300 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-800">
                        {k}
                    </kbd>
                ))}
            </dt>
            <dd className="text-neutral-500 dark:text-neutral-400">{label}</dd>
        </div>
    );
}
