'use client';

import { useEffect, useRef, useState } from 'react';
import exifr from 'exifr';
import { UploadAction } from '@/actions/upload/upload';
import { UploadMeta } from '@/interface/Upload';
import { Visibility } from '@/db/models/Image';

type DraftStatus = 'pending' | 'uploading' | 'done' | 'error';
type ClientExif = {
    camera?: string;
    lens?: string;
    focalLength?: number;
    aperture?: number;
    shutterSpeed?: string;
    iso?: number;
    takenAt?: string;
};
type Draft = UploadMeta & {
    file: File;
    preview: string;
    key: string;
    status: DraftStatus;
    errorMsg?: string;
    exif?: ClientExif;
};

const MAX_SIZE = 300 * 1024 * 1024;
const ALLOWED = /^image\/(jpeg|jpg|png|webp|avif|tiff|tif)$/;
const EXIF_PICK = ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal'];

async function readExif(file: File): Promise<ClientExif | undefined> {
    try {
        const data: any = await exifr.parse(file, { pick: EXIF_PICK });
        if (!data) return undefined;
        const camera = [data.Make, data.Model].filter(Boolean).join(' ').trim() || undefined;
        let shutterSpeed: string | undefined;
        if (typeof data.ExposureTime === 'number' && data.ExposureTime > 0) {
            shutterSpeed = data.ExposureTime < 1
                ? `1/${Math.round(1 / data.ExposureTime)}`
                : `${data.ExposureTime}"`;
        }
        return {
            camera,
            lens: data.LensModel || undefined,
            focalLength: typeof data.FocalLength === 'number' ? data.FocalLength : undefined,
            aperture: typeof data.FNumber === 'number' ? data.FNumber : undefined,
            shutterSpeed,
            iso: typeof data.ISO === 'number' ? data.ISO : undefined,
            takenAt: data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toLocaleString('ko-KR') : undefined,
        };
    } catch {
        return undefined;
    }
}

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

function ExifPreview({ exif }: { exif?: ClientExif }) {
    if (!exif) return <p className="text-[10px] text-neutral-400 dark:text-neutral-600">EXIF 없음</p>;
    const rows = [
        ['촬영일', exif.takenAt],
        ['카메라', exif.camera],
        ['렌즈', exif.lens],
        ['초점거리', exif.focalLength ? `${exif.focalLength}mm` : undefined],
        ['조리개', exif.aperture ? `f/${exif.aperture}` : undefined],
        ['셔터', exif.shutterSpeed],
        ['ISO', exif.iso],
    ].filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (rows.length === 0) return <p className="text-[10px] text-neutral-400 dark:text-neutral-600">EXIF 없음</p>;
    return (
        <dl className="text-[10px] space-y-0.5 text-neutral-400 dark:text-neutral-500">
            {rows.map(([k, v]) => (
                <div key={k as string} className="flex gap-2">
                    <dt className="w-12 shrink-0 text-neutral-300 dark:text-neutral-600">{k}</dt>
                    <dd>{v as any}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function UploadPage() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const previewDlg = useRef<HTMLDialogElement>(null);

    const patch = (key: string, patch: Partial<Draft>) => {
        setDrafts(prev => prev.map(d => d.key === key ? { ...d, ...patch } : d));
    };

    const onFiles = async (list: FileList | null | File[]) => {
        if (!list) return;
        const rejected: string[] = [];
        const arr = Array.from(list).filter(f => {
            if (!ALLOWED.test(f.type)) { rejected.push(`${f.name} (형식 불가)`); return false; }
            if (f.size > MAX_SIZE) { rejected.push(`${f.name} (300MB 초과)`); return false; }
            return true;
        });
        if (rejected.length) setMsg(`제외됨: ${rejected.join(', ')}`);
        const newDrafts = arr.map(makeDraft);
        setDrafts(prev => [...prev, ...newDrafts]);
        // EXIF는 비동기로 뒤이어 붙임
        for (const d of newDrafts) {
            readExif(d.file).then(exif => {
                if (exif) patch(d.key, { exif });
            });
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(e.dataTransfer.files);
    };

    const remove = (key: string) => {
        setDrafts(prev => prev.filter(d => d.key !== key));
    };

    const openPreview = (url: string) => {
        setPreview(url);
        previewDlg.current?.showModal();
    };
    const closePreview = () => {
        previewDlg.current?.close();
        setPreview(null);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && previewDlg.current?.open) closePreview();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

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
                            <div className="shrink-0 space-y-2">
                                <button
                                    type="button"
                                    onClick={() => openPreview(d.preview)}
                                    className="relative w-32 h-32 block group bg-neutral-100 dark:bg-neutral-900"
                                    aria-label="크게 보기"
                                >
                                    <img
                                        src={d.preview}
                                        alt=""
                                        className="w-32 h-32 object-cover cursor-zoom-in"
                                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    {/* 브라우저가 못 여는 포맷 (TIFF 등) 대체 표기 */}
                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-neutral-400 dark:text-neutral-600 pointer-events-none -z-10">
                                        {d.file.type.replace('image/', '').toUpperCase()}
                                    </div>
                                    {d.status === 'uploading' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs">업로드 중…</div>
                                    )}
                                    {d.status === 'done' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-green-400 text-xs">완료</div>
                                    )}
                                    {d.status === 'error' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-red-400 text-xs" title={d.errorMsg}>실패</div>
                                    )}
                                </button>
                                <ExifPreview exif={d.exif} />
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

            <dialog
                ref={previewDlg}
                onClick={closePreview}
                className="p-0 m-0 max-w-none max-h-none w-screen h-screen bg-black backdrop:bg-black/90"
            >
                {preview && (
                    <img
                        src={preview}
                        alt=""
                        className="w-full h-full object-contain cursor-zoom-out select-none"
                        draggable={false}
                    />
                )}
            </dialog>
        </div>
    );
}
