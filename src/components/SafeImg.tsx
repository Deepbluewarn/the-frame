'use client';

import { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react';

export default function SafeImg({ className = '', alt, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
    const [broken, setBroken] = useState(false);
    const ref = useRef<HTMLImageElement>(null);

    useEffect(() => {
        // 이미 캐시된 이미지가 로드 실패했으면 onError가 안 걸림 → complete + naturalWidth=0 체크
        const img = ref.current;
        if (img && img.complete && img.naturalWidth === 0) setBroken(true);
    }, []);

    if (broken) {
        return (
            <div className={`flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 text-[10px] ${className}`}>
                이미지 없음
            </div>
        );
    }

    return <img ref={ref} alt={alt} onError={() => setBroken(true)} className={className} {...rest} />;
}
