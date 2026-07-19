'use client';

import { useEffect, useRef } from 'react';
import { decode } from 'blurhash';

// 32x32 캔버스에 blurhash 그린 뒤 CSS로 늘려 보여줌. 성능 저렴.
export default function Blurhash({ hash, className }: { hash: string; className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            const pixels = decode(hash, 32, 32);
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const imageData = ctx.createImageData(32, 32);
            imageData.data.set(pixels);
            ctx.putImageData(imageData, 0, 0);
        } catch { /* 잘못된 hash 무시 */ }
    }, [hash]);

    return <canvas ref={canvasRef} width={32} height={32} className={className} />;
}
