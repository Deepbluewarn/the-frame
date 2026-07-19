import type { Exif } from '@/db/models/Image';

// 상세 페이지·업로드 미리보기 공용 EXIF 표시 컴포넌트.
export type ExifDisplay = {
    camera?: string;
    lens?: string;
    focalLength?: number;
    aperture?: number;
    shutterSpeed?: string;
    iso?: number;
    takenAt?: Date | string;  // Date (server) or ISO string (client parsed)
};

function toDisplay(exif?: Exif): ExifDisplay | undefined {
    if (!exif) return undefined;
    return exif as ExifDisplay;
}

function ExifRow({ label, value }: { label: string; value?: string | number | null }) {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-neutral-300 dark:text-neutral-600">{label}</dt>
            <dd className="text-neutral-400 dark:text-neutral-500">{value}</dd>
        </div>
    );
}

export default function ExifBlock({ exif, showTakenAt = false }: { exif?: Exif | ExifDisplay; showTakenAt?: boolean }) {
    const e = toDisplay(exif as Exif);
    if (!e) return <p className="text-[10px] text-neutral-400 dark:text-neutral-600">EXIF 없음</p>;

    const rows: Array<[string, string | number | undefined]> = [];
    if (showTakenAt) {
        const taken = e.takenAt;
        const takenStr = taken ? (typeof taken === 'string' ? taken : new Date(taken).toLocaleString('ko-KR')) : undefined;
        rows.push(['촬영일', takenStr]);
    }
    rows.push(
        ['카메라', e.camera],
        ['렌즈', e.lens],
        ['초점거리', e.focalLength ? `${e.focalLength}mm` : undefined],
        ['조리개', e.aperture ? `f/${e.aperture}` : undefined],
        ['셔터', e.shutterSpeed],
        ['ISO', e.iso],
    );

    const hasAny = rows.some(([, v]) => v !== undefined && v !== null && v !== '');
    if (!hasAny) return <p className="text-[10px] text-neutral-400 dark:text-neutral-600">EXIF 없음</p>;

    return (
        <dl className="text-[10px] space-y-1">
            {rows.map(([k, v]) => (
                <ExifRow key={k} label={k} value={v} />
            ))}
        </dl>
    );
}
