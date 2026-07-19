'use client';

import { useState } from 'react';
import { UploadAction } from '@/actions/upload/upload';
import { UploadMeta } from '@/interface/Upload';
import { Visibility } from '@/db/models/Image';

type Draft = UploadMeta & { file: File; preview: string; key: string };

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
    };
}

export default function UploadPage() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const onFiles = (list: FileList | null) => {
        if (!list) return;
        const next = Array.from(list).map(makeDraft);
        setDrafts(prev => [...prev, ...next]);
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
        const fd = new FormData();
        drafts.forEach(d => fd.append(d.originalFileName, d.file));
        const meta: UploadMeta[] = drafts.map(d => ({
            originalFileName: d.originalFileName,
            name: d.name,
            description: d.description,
            tags: d.tags,
            visibility: d.visibility,
        }));
        const res = await UploadAction(meta, fd);
        setBusy(false);
        if (res.success) {
            setDrafts([]);
            setMsg('업로드 완료');
        } else {
            setMsg(`실패: ${res.error}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
            <h1 className="text-lg font-medium">사진 업로드</h1>

            <label className="block border-2 border-dashed border-neutral-300 rounded p-8 text-center cursor-pointer hover:border-neutral-500 transition-colors">
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={e => { onFiles(e.currentTarget.files); e.currentTarget.value = ''; }}
                />
                <span className="text-sm text-neutral-500">클릭하여 사진 선택 (여러 장 가능)</span>
            </label>

            {drafts.length > 0 && (
                <ul className="space-y-6">
                    {drafts.map(d => (
                        <li key={d.key} className="flex gap-4 border-b border-neutral-200 pb-6">
                            <img src={d.preview} alt="" className="w-32 h-32 object-cover bg-neutral-100" />
                            <div className="flex-1 space-y-2">
                                <input
                                    type="text"
                                    value={d.name}
                                    onChange={e => patch(d.key, { name: e.currentTarget.value })}
                                    placeholder="제목"
                                    className="w-full text-sm border-b border-neutral-200 pb-1 focus:border-neutral-500 outline-none"
                                />
                                <textarea
                                    value={d.description}
                                    onChange={e => patch(d.key, { description: e.currentTarget.value })}
                                    placeholder="설명"
                                    rows={2}
                                    className="w-full text-sm border border-neutral-200 rounded p-2 focus:border-neutral-500 outline-none"
                                />
                                <input
                                    type="text"
                                    value={d.tags.join(' ')}
                                    onChange={e => patch(d.key, { tags: e.currentTarget.value.split(/\s+/).filter(Boolean) })}
                                    placeholder="태그 (공백 구분)"
                                    className="w-full text-xs border-b border-neutral-200 pb-1 focus:border-neutral-500 outline-none"
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
                    className="ml-auto px-4 py-2 text-sm bg-neutral-900 text-white rounded disabled:opacity-40"
                >
                    {busy ? '업로드 중...' : `업로드 (${drafts.length})`}
                </button>
            </div>
        </div>
    );
}
