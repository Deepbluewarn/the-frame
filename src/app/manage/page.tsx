'use client';

import { useEffect, useRef, useState } from 'react';
import { actionGetRecentImages, actionDeleteImages, actionUpdateImagesMetadata } from '@/actions/image';
import { ImageInterface, Visibility } from '@/db/models/Image';
import Link from 'next/link';
import SafeImg from '@/components/SafeImg';

const PAGE = 24;

export default function ManagePage() {
    const [images, setImages] = useState<ImageInterface[]>([]);
    const [editing, setEditing] = useState<ImageInterface | null>(null);
    const [deleting, setDeleting] = useState<ImageInterface | null>(null);
    const editDlg = useRef<HTMLDialogElement>(null);
    const delDlg = useRef<HTMLDialogElement>(null);

    const load = async (last?: string) => {
        const more = await actionGetRecentImages({ limit: PAGE, last_image_id: last });
        setImages(prev => last ? [...prev, ...more] : more);
    };

    useEffect(() => { load(); }, []);

    const openEdit = (img: ImageInterface) => { setEditing(img); editDlg.current?.showModal(); };
    const openDelete = (img: ImageInterface) => { setDeleting(img); delDlg.current?.showModal(); };

    const saveEdit = async (patch: { title: string; description: string; tags: string[]; visibility: Visibility }) => {
        if (!editing) return;
        await actionUpdateImagesMetadata([editing._id], patch.title, patch.description, patch.tags, patch.visibility);
        editDlg.current?.close();
        setEditing(null);
        await load();
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        await actionDeleteImages([deleting._id]);
        delDlg.current?.close();
        setDeleting(null);
        await load();
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-medium">사진 관리</h1>
                <Link href="/upload" className="text-sm underline text-neutral-500 hover:text-neutral-900">
                    업로드
                </Link>
            </div>

            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {images.map(img => (
                    <li key={img._id} className="relative group">
                        <div className="aspect-square overflow-hidden bg-neutral-100">
                            <SafeImg src={img.urlThumb || img.url} alt={img.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <button onClick={() => openEdit(img)} className="text-xs px-2 py-1 bg-white text-neutral-900 rounded">편집</button>
                            <button onClick={() => openDelete(img)} className="text-xs px-2 py-1 bg-red-600 text-white rounded">삭제</button>
                        </div>
                        {img.visibility === 'private' && (
                            <span className="absolute top-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">비공개</span>
                        )}
                    </li>
                ))}
            </ul>

            <button
                onClick={() => load(images[images.length - 1]?._id)}
                className="mx-auto block text-sm text-neutral-500 hover:text-neutral-900 underline"
            >
                더 보기
            </button>

            <EditDialog ref={editDlg} image={editing} onSave={saveEdit} onCancel={() => editDlg.current?.close()} />
            <DeleteDialog ref={delDlg} image={deleting} onConfirm={confirmDelete} onCancel={() => delDlg.current?.close()} />
        </div>
    );
}

// --- Dialogs ---

import { forwardRef } from 'react';

const EditDialog = forwardRef<HTMLDialogElement, {
    image: ImageInterface | null;
    onSave: (patch: { title: string; description: string; tags: string[]; visibility: Visibility }) => void;
    onCancel: () => void;
}>(function EditDialog({ image, onSave, onCancel }, ref) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [visibility, setVisibility] = useState<Visibility>('public');

    useEffect(() => {
        if (image) {
            setTitle(image.title);
            setDescription(image.description || '');
            setTags((image.tags || []).join(' '));
            setVisibility(image.visibility);
        }
    }, [image]);

    return (
        <dialog ref={ref} className="rounded p-0 backdrop:bg-black/50 w-full max-w-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            <form method="dialog" className="p-6 space-y-4">
                <h2 className="font-medium">사진 편집</h2>
                <input value={title} onChange={e => setTitle(e.currentTarget.value)} placeholder="제목" className="w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 pb-1 text-sm outline-none focus:border-neutral-700 dark:focus:border-neutral-400" />
                <textarea value={description} onChange={e => setDescription(e.currentTarget.value)} placeholder="설명" rows={3} className="w-full bg-transparent border border-neutral-300 dark:border-neutral-700 rounded p-2 text-sm outline-none focus:border-neutral-700 dark:focus:border-neutral-400" />
                <input value={tags} onChange={e => setTags(e.currentTarget.value)} placeholder="태그 (공백 구분)" className="w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 pb-1 text-xs outline-none focus:border-neutral-700 dark:focus:border-neutral-400" />
                <div className="flex gap-4 text-xs">
                    <label className="flex items-center gap-1">
                        <input type="radio" checked={visibility === 'public'} onChange={() => setVisibility('public')} /> 공개
                    </label>
                    <label className="flex items-center gap-1">
                        <input type="radio" checked={visibility === 'private'} onChange={() => setVisibility('private')} /> 비공개
                    </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onCancel} className="text-sm px-3 py-1.5 text-neutral-500 dark:text-neutral-400">취소</button>
                    <button
                        type="button"
                        onClick={() => onSave({ title, description, tags: tags.split(/\s+/).filter(Boolean), visibility })}
                        className="text-sm px-3 py-1.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded"
                    >
                        저장
                    </button>
                </div>
            </form>
        </dialog>
    );
});

const DeleteDialog = forwardRef<HTMLDialogElement, {
    image: ImageInterface | null;
    onConfirm: () => void;
    onCancel: () => void;
}>(function DeleteDialog({ image, onConfirm, onCancel }, ref) {
    const [typed, setTyped] = useState('');
    useEffect(() => { setTyped(''); }, [image?._id]);
    const canDelete = typed === '삭제';
    return (
        <dialog ref={ref} className="rounded p-0 backdrop:bg-black/50 w-full max-w-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            <div className="p-6 space-y-4">
                <h2 className="font-medium">삭제 확인</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    &ldquo;{image?.title}&rdquo; 사진을 삭제합니다. 되돌릴 수 없습니다.
                </p>
                <div className="space-y-1">
                    <label className="text-xs text-neutral-500 dark:text-neutral-400">
                        확인을 위해 <span className="font-medium text-red-600 dark:text-red-400">삭제</span>를 입력하세요.
                    </label>
                    <input
                        value={typed}
                        onChange={e => setTyped(e.currentTarget.value)}
                        placeholder="삭제"
                        className="w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 pb-1 text-sm outline-none focus:border-red-500"
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="text-sm px-3 py-1.5 text-neutral-500 dark:text-neutral-400">취소</button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!canDelete}
                        className="text-sm px-3 py-1.5 bg-red-600 text-white rounded disabled:opacity-40"
                    >
                        삭제
                    </button>
                </div>
            </div>
        </dialog>
    );
});
