'use client';

import { useEffect, useRef, useState } from 'react';
import Blurhash from './Blurhash';
import {
    computeZoomSteps, relFromPoint, relFromTouchDrag, transformString,
    type Viewport, type Rel,
} from '@/lib/zoomTransform';

const VIEWPORT_PAD = 48;

export default function PhotoZoom({
    src, zoomSrc, alt, width, height, blurhash,
}: {
    src: string; zoomSrc?: string; alt: string; width: number; height: number; blurhash?: string;
}) {
    const zoom = zoomSrc || src;
    const dlgRef = useRef<HTMLDialogElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const previewRef = useRef<HTMLImageElement>(null);
    const [steps, setSteps] = useState<number[]>([1]);
    const [step, setStep] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const relRef = useRef<Rel>({ x: 0.5, y: 0.5 });

    // 하이드레이션 전에 로드 완료된 경우 onLoad가 안 걸림 → 마운트 시 체크
    useEffect(() => {
        if (previewRef.current?.complete && previewRef.current?.naturalWidth > 0) setLoaded(true);
    }, []);

    const viewport = (): Viewport => ({
        width: window.innerWidth,
        height: window.innerHeight,
        padding: VIEWPORT_PAD,
    });

    const applyTransform = (scale: number) => {
        const img = imgRef.current;
        if (!img) return;
        img.style.transform = transformString(scale, relRef.current, width, height, viewport());
    };

    const open = () => {
        const s = computeZoomSteps(width, height, window.innerWidth, window.innerHeight);
        setSteps(s);
        setStep(0);
        relRef.current = { x: 0.5, y: 0.5 };
        const img = imgRef.current;
        if (img) {
            img.style.transition = 'none';
            applyTransform(s[0]);
        }
        dlgRef.current?.showModal();
        requestAnimationFrame(() => {
            if (img) img.style.transition = '';
        });
    };
    const close = () => dlgRef.current?.close();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const opened = dlgRef.current?.open;
            if (e.key === 'ArrowUp' && !opened) { e.preventDefault(); open(); }
            if ((e.key === 'ArrowDown' || e.key === 'Escape') && opened) close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // step 변경 시: transition 잠깐 켜서 부드럽게
    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;
        img.style.transition = 'transform 200ms ease';
        applyTransform(steps[step]);
        const t = setTimeout(() => { img.style.transition = ''; }, 220);
        return () => clearTimeout(t);
    }, [step, steps]);

    const onMouseMove = (e: React.MouseEvent<HTMLDialogElement>) => {
        relRef.current = relFromPoint(e.clientX, e.clientY, viewport());
        applyTransform(steps[step]);
    };

    // 모바일 드래그: 시작 지점 + rel 기억, 이동량만큼 반대로.
    const touchStartRef = useRef<{ x: number; y: number; rel: Rel } | null>(null);

    const onTouchStart = (e: React.TouchEvent<HTMLDialogElement>) => {
        e.stopPropagation();
        if (e.touches.length !== 1) return;
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            rel: { ...relRef.current },
        };
    };

    const onTouchMove = (e: React.TouchEvent<HTMLDialogElement>) => {
        e.stopPropagation();
        if (e.touches.length !== 1 || !touchStartRef.current) return;
        const t = e.touches[0];
        relRef.current = relFromTouchDrag(
            touchStartRef.current.x, touchStartRef.current.y,
            t.clientX, t.clientY,
            touchStartRef.current.rel,
            steps[step], width, height, viewport(),
        );
        applyTransform(steps[step]);
    };

    const onTouchEnd = (e: React.TouchEvent<HTMLDialogElement>) => {
        e.stopPropagation();
        touchStartRef.current = null;
    };

    const onClickDialog = () => {
        if (step >= steps.length - 1) close();
        else setStep(s => s + 1);
    };

    const aspectStyle: React.CSSProperties = { aspectRatio: `${width} / ${height}` };

    return (
        <>
            <div className="relative max-w-full max-h-full flex" style={aspectStyle}>
                {blurhash && !loaded && (
                    <Blurhash hash={blurhash} className="absolute inset-0 w-full h-full" />
                )}
                <img
                    ref={previewRef}
                    src={src} alt={alt} width={width} height={height}
                    onClick={open}
                    onLoad={() => setLoaded(true)}
                    className={`max-w-full max-h-full object-contain bg-transparent cursor-zoom-in transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                />
            </div>
            <dialog
                ref={dlgRef}
                onClick={onClickDialog}
                onMouseMove={onMouseMove}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="p-0 m-0 max-w-none max-h-none w-screen h-screen bg-black backdrop:bg-black/90 overflow-hidden touch-none"
            >
                <img
                    ref={imgRef}
                    src={zoom} alt={alt}
                    width={width} height={height}
                    className="block max-w-none max-h-none select-none origin-top-left"
                    style={{ cursor: step < steps.length - 1 ? 'zoom-in' : 'zoom-out' }}
                    draggable={false}
                />
            </dialog>
        </>
    );
}
