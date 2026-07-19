'use client';

import { useState } from 'react';
import { UploadAction } from '@/actions/upload/upload';
import { UploadMeta } from '@/interface/Upload';
import { Visibility } from '@/db/models/Image';

type DraftStatus = 'pending' | 'uploading' | 'done' | 'error';
type Draft = UploadMeta & { file: File; preview: string; key: string; status: DraftStatus; errorMsg?: string };

const MAX_SIZE = 300 * 1024 * 1024; // 300MB
const ALLOWED = /^image\/(jpeg|jpg|png|webp|avif)$/;

function makeDraft(file: File): Draft {
    return {
        file,
        preview: URL.createObjectURL(file),
        key: `${file.name}-${file.size}-${file.lastModified}`,
        originalFileName: file.name,
        name: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        tags: [],
        visibility: 'public',
        status: 'pending',
    };
}

export default function UploadPage() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const onFiles = (list: FileList | null | File[]) => {
        if (!list) return;
        const rejected: string[] = [];
        const arr = Array.from(list).filter(f => {
            if (!ALLOWED.test(f.type)) { rejected.push(`${f.name} (형식 불가)`); return false; }
            if (f.size > MAX_SIZE) { rejected.push(`${f.name} (300MB 초과)`); return false; }
            return true;
        });
        if (rejected.length) setMsg(`제외됨: ${rejected.join(', ')}`);
        setDrafts(prev => [...prev, ...arr.map(makeDraft)]);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(e.dataTransfer.files);
    };

    const patch = (key: string, patch: Partial<Draft>) => {
        setDrafts(prev => prev.map(d => d.key === key ? { ...d, ...patch } : d));
    };

    const remove = (key: string) => {
        setDrafts(prev => prev.filter(d => d.key !== key));
    };

    const submit = async () => {
        if (drafts.length === 0) return;
        setBusy(true);
        setMsg(null);
        const targets = drafts.filter(d => d.status !== 'done');
        let okCount = 0;
        for (const d of targets) {
            patch(d.key, { status: 'uploading', errorMsg: undefined });
            const fd = new FormData();
            fd.append(d.originalFileName, d.file);
            const meta: UploadMeta[] = [{
                originalFileName: d.originalFileName,
                name: d.name,
                description: d.description,
                tags: d.tags,
                visibility: d.visibility,
            }];
            try {
                const res = await UploadAction(meta, fd);
                if (res.success) { patch(d.key, { status: 'done' }); okCount++; }
                else { patch(d.key, { status: 'error', errorMsg: res.error }); }
            } catch (e) {
                patch(d.key, { status: 'error', errorMsg: (e as Error).message });
            }
        }
        setBusy(false);
        setMsg(`업로드 완료: ${okCount} / ${targets.length}`);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
            <h1 className="text-lg font-medium">사진 업로드</h1>

            <label
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`block border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900' : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-500'}`}
            >
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={e => { onFiles(e.currentTarget.files); e.currentTarget.value = ''; }}
                />
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {dragOver ? '여기에 놓기' : '클릭하거나 사진을 끌어놓기'}
                </span>
            </label>

            {drafts.length > 0 && (
                <ul className="space-y-6">
                    {drafts.map(d => (
                        <li key={d.key} className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
                            <div className="relative w-32 h-32 shrink-0">
                                <img src={d.preview} alt="" className="w-32 h-32 object-cover bg-neutral-100 dark:bg-neutral-900" />
                                {d.status === 'uploading' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs">업로드 중…</div>
                                )}
                                {d.status === 'done' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-green-400 text-xs">완료</div>
                                )}
                                {d.status === 'error' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-red-400 text-xs">실패</div>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <input
                                    type="text"
                                    value={d.name}
                                    onChange={e => patch(d.key, { name: e.currentTarget.value })}
                                    placeholder="제목"
                                    className="w-full text-sm bg-transparent border-b border-neutral-200 dark:border-neutral-700 pb-1 focus:border-neutral-500 dark:focus:border-neutral-400 outline-none"
                                />
                                <textarea
                                    value={d.description}
                                    onChange={e => patch(d.key, { description: e.currentTarget.value })}
                                    placeholder="설명"
                                    rows={2}
                                    className="w-full text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded p-2 focus:border-neutral-500 dark:focus:border-neutral-400 outline-none"
                                />
                                <input
                                    type="text"
                                    value={d.tags.join(' ')}
                                    onChange={e => patch(d.key, { tags: e.currentTarget.value.split(/\s+/).filter(Boolean) })}
                                    placeholder="태그 (공백 구분)"
                                    className="w-full text-xs bg-transparent border-b border-neutral-200 dark:border-neutral-700 pb-1 focus:border-neutral-500 dark:focus:border-neutral-400 outline-none"
                                />
                                <div className="flex items-center gap-4 text-xs">
                                    <label className="flex items-center gap-1">
                                        <input
                                            type="radio"
                                            checked={d.visibility === 'public'}
                                            onChange={() => patch(d.key, { visibility: 'public' as Visibility })}
                                        />
                                        공개
                                    </label>
                                    <label className="flex items-center gap-1">
                                        <input
                                            type="radio"
                                            checked={d.visibility === 'private'}
                                            onChange={() => patch(d.key, { visibility: 'private' as Visibility })}
                                        />
                                        비공개
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => remove(d.key)}
                                        className="ml-auto text-neutral-400 hover:text-red-600"
                                    >
                                        제거
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex items-center justify-between">
                {msg && <p className="text-sm text-neutral-500">{msg}</p>}
                <button
                    type="button"
                    disabled={busy || drafts.length === 0}
                    onClick={submit}
                    className="ml-auto px-4 py-2 text-sm bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded disabled:opacity-40"
                >
                    {busy
                        ? `업로드 중… (${drafts.filter(d => d.status === 'done').length} / ${drafts.length})`
                        : `업로드 (${drafts.filter(d => d.status !== 'done').length})`}
                </button>
            </div>
        </div>
    );
}
