// PhotoZoom의 순수 계산 로직. React·DOM 무관.
// 테스트 가능하도록 분리 (interface = test surface).

export interface Viewport {
    width: number;
    height: number;
    padding: number;   // 뷰포트 가장자리 여백
}

export interface Rel {
    x: number;   // 0..1
    y: number;
}

// 이미지 원본 크기 vs 뷰포트 크기로 줌 단계 배열 계산.
// step 0 = fit, 마지막 = 원본 100%. 배율이 클수록 단계 많음.
export function computeZoomSteps(imgW: number, imgH: number, viewportW: number, viewportH: number): number[] {
    const fit = Math.min(viewportW / imgW, viewportH / imgH, 1);
    const ratio = 1 / fit;
    let count: number;
    if (ratio >= 4) count = 4;
    else if (ratio >= 2.5) count = 3;
    else if (ratio >= 1.5) count = 2;
    else count = 1;
    if (count === 1) return [fit];
    return Array.from({ length: count }, (_, i) => fit * Math.pow(1 / fit, i / (count - 1)));
}

// 마우스 위치 → rel (0..1). 뷰포트 padding 안쪽에서 0/1 도달.
export function relFromPoint(clientX: number, clientY: number, vp: Viewport): Rel {
    const availW = vp.width - 2 * vp.padding;
    const availH = vp.height - 2 * vp.padding;
    return {
        x: Math.min(1, Math.max(0, (clientX - vp.padding) / availW)),
        y: Math.min(1, Math.max(0, (clientY - vp.padding) / availH)),
    };
}

// 터치 드래그 → rel. delta 기반, 모바일 자연스러운 이동.
// 손가락 이동 방향 = 이미지 이동 방향 (아이폰 사진앱 방식).
export function relFromTouchDrag(
    startClientX: number, startClientY: number,
    currentClientX: number, currentClientY: number,
    startRel: Rel,
    scale: number,
    imgW: number, imgH: number,
    vp: Viewport,
): Rel {
    const dw = imgW * scale;
    const dh = imgH * scale;
    const overflowX = Math.max(1, dw - (vp.width - 2 * vp.padding));
    const overflowY = Math.max(1, dh - (vp.height - 2 * vp.padding));
    const dx = currentClientX - startClientX;
    const dy = currentClientY - startClientY;
    return {
        x: Math.min(1, Math.max(0, startRel.x - dx / overflowX)),
        y: Math.min(1, Math.max(0, startRel.y - dy / overflowY)),
    };
}

// scale + rel → CSS transform 문자열.
export function transformString(scale: number, rel: Rel, imgW: number, imgH: number, vp: Viewport): string {
    const dw = imgW * scale;
    const dh = imgH * scale;
    const overflowX = Math.max(0, dw - (vp.width - 2 * vp.padding));
    const overflowY = Math.max(0, dh - (vp.height - 2 * vp.padding));
    const tx = overflowX > 0 ? vp.padding - overflowX * rel.x : (vp.width - dw) / 2;
    const ty = overflowY > 0 ? vp.padding - overflowY * rel.y : (vp.height - dh) / 2;
    return `translate(${tx}px, ${ty}px) scale(${scale})`;
}

// --- Self-check (개발 중 sanity) ---
// 이 파일이 서버 컴포넌트에서 import될 때 실행되지 않도록 조건부.
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production' && process.env.ZOOM_SELFCHECK === '1') {
    // 5000x3000 이미지, 1920x1080 뷰포트 → fit ≈ 0.36, ratio ≈ 2.78, count = 3
    const steps = computeZoomSteps(5000, 3000, 1920, 1080);
    console.assert(steps.length === 3, 'expected 3 steps for 2.78x ratio');
    console.assert(Math.abs(steps[0] - 0.36) < 0.01, 'first step = fit');
    console.assert(Math.abs(steps[steps.length - 1] - 1) < 0.001, 'last step = 1');
    const vp: Viewport = { width: 1920, height: 1080, padding: 48 };
    const r1 = relFromPoint(1920 - 48, 1080 - 48, vp);
    console.assert(Math.abs(r1.x - 1) < 0.001 && Math.abs(r1.y - 1) < 0.001, 'edge = 1');
    const r0 = relFromPoint(48, 48, vp);
    console.assert(Math.abs(r0.x) < 0.001 && Math.abs(r0.y) < 0.001, 'inner-edge = 0');
    console.log('zoomTransform self-check OK');
}
