'use client';

import { useEffect, useRef, useState } from 'react';

// 사진의 원본크기와 뷰포트를 비교해 줌 단계를 정한다.
// step 0 = 뷰포트에 맞추기(fit), 마지막 step = 원본 100%.
// 사진이 뷰포트보다 얼마나 큰지에 따라 단계 수가 자동 조정.
function computeSteps(w: number, h: number, vw: number, vh: number): number[] {
    const fit = Math.min(vw / w, vh / h, 1);
    const ratio = 1 / fit; // 자연크기가 fit의 몇 배인지
    let count: number;
    if (ratio >= 4) count = 4;
    else if (ratio >= 2.5) count = 3;
    else if (ratio >= 1.5) count = 2;
    else count = 1; // 확대 여지 없음
    if (count === 1) return [fit];
    // 등비 보간: step i → fit * (1/fit)^(i/(count-1))
    return Array.from({ length: count }, (_, i) => fit * Math.pow(1 / fit, i / (count - 1)));
}

export default function PhotoZoom({
    src, alt, width, height,
}: {
    src: string; alt: string; width: number; height: number;
}) {
    const dlgRef = useRef<HTMLDialogElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [steps, setSteps] = useState<number[]>([1]);
    const [step, setStep] = useState(0);
    const relRef = useRef({ x: 0.5, y: 0.5 });

    const open = () => {
        const s = computeSteps(width, height, window.innerWidth, window.innerHeight);
        setSteps(s);
        setStep(0);
        relRef.current = { x: 0.5, y: 0.5 };
        const img = imgRef.current;
        if (img) {
            // 초기 프레임: transition off → identity에서 튀지 않게
            img.style.transition = 'none';
            applyTransform(s[0]);
        }
        dlgRef.current?.showModal();
        requestAnimationFrame(() => {
            if (img) img.style.transition = '';
        });
    };
    const close = () => dlgRef.current?.close();

    // 뷰포트 가장자리에 여백. 코너 볼 때 이미지가 화면 끝에 붙지 않게 함.
    const PAD = 48;

    const applyTransform = (scale: number) => {
        const img = imgRef.current;
        if (!img) return;
        const vw = window.innerWidth, vh = window.innerHeight;
        const availW = vw - 2 * PAD, availH = vh - 2 * PAD;
        const dw = width * scale, dh = height * scale;
        const overflowX = Math.max(0, dw - availW);
        const overflowY = Math.max(0, dh - availH);
        const tx = overflowX > 0 ? PAD - overflowX * relRef.current.x : (vw - dw) / 2;
        const ty = overflowY > 0 ? PAD - overflowY * relRef.current.y : (vh - dh) / 2;
        img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const opened = dlgRef.current?.open;
            if (e.key === 'ArrowUp' && !opened) { e.preventDefault(); open(); }
            if ((e.key === 'ArrowDown' || e.key === 'Escape') && opened) close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // step 변경 시: transition 잠깐 켜서 부드럽게, 끝나면 해제
    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;
        img.style.transition = 'transform 200ms ease';
        applyTransform(steps[step]);
        const clear = () => { img.style.transition = ''; };
        const t = setTimeout(clear, 220);
        return () => clearTimeout(t);
    }, [step, steps]);

    const onMouseMove = (e: React.MouseEvent<HTMLDialogElement>) => {
        // 마우스가 PAD 안쪽으로 들어가야 relX가 0/1에 도달 → 코너를 완전히 볼 수 있음.
        const vw = window.innerWidth, vh = window.innerHeight;
        const availW = vw - 2 * PAD, availH = vh - 2 * PAD;
        relRef.current = {
            x: Math.min(1, Math.max(0, (e.clientX - PAD) / availW)),
            y: Math.min(1, Math.max(0, (e.clientY - PAD) / availH)),
        };
        applyTransform(steps[step]);
    };

    const onClickDialog = (e: React.MouseEvent) => {
        // 마지막 단계면 닫기, 아니면 다음 단계
        if (step >= steps.length - 1) close();
        else setStep(s => s + 1);
    };

    return (
        <>
            <img
                src={src} alt={alt} width={width} height={height}
                onClick={open}
                className="max-w-full max-h-full object-contain bg-neutral-50 cursor-zoom-in"
            />
            <dialog
                ref={dlgRef}
                onClick={onClickDialog}
                onMouseMove={onMouseMove}
                className="p-0 m-0 max-w-none max-h-none w-screen h-screen bg-black backdrop:bg-black/90 overflow-hidden"
            >
                <img
                    ref={imgRef}
                    src={src} alt={alt}
                    width={width} height={height}
                    className="block max-w-none max-h-none select-none origin-top-left"
                    style={{ cursor: step < steps.length - 1 ? 'zoom-in' : 'zoom-out' }}
                    draggable={false}
                />
            </dialog>
        </>
    );
}
