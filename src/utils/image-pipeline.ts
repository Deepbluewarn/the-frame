import sharp from 'sharp';
import { encode as blurhashEncode } from 'blurhash';
import type { Orientation } from '@/db/models/Image';

export const THUMB_WIDTH = 400;
export const MEDIUM_WIDTH = 1200;

export async function makeThumb(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).resize({ width: THUMB_WIDTH, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}

export async function makeMedium(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).resize({ width: MEDIUM_WIDTH, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

// blurhash는 작은 raw pixel array로 만들어야 빠름. 32x32면 충분.
export async function makeBlurhash(buffer: Buffer): Promise<string | undefined> {
    try {
        const { data, info } = await sharp(buffer)
            .resize(32, 32, { fit: 'inside' })
            .raw()
            .ensureAlpha()
            .toBuffer({ resolveWithObject: true });
        return blurhashEncode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
    } catch {
        return undefined;
    }
}

// 브라우저가 못 여는 포맷(TIFF 등)은 JPEG로 변환. 브라우저 렌더 가능한 원본은 그대로.
const BROWSER_RENDERABLE = /^image\/(jpeg|jpg|png|webp|avif|gif)$/;

export function needsNormalize(contentType: string): boolean {
    return !BROWSER_RENDERABLE.test(contentType);
}

export async function normalizeToJpeg(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer).jpeg({ quality: 92 }).toBuffer();
}

export async function getDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    const meta = await sharp(buffer).metadata();
    return { width: meta.width || 0, height: meta.height || 0 };
}

export function computeOrientation(width: number, height: number): Orientation {
    const ratio = width / height;
    if (ratio > 1.05) return 'landscape';
    if (ratio < 0.95) return 'portrait';
    return 'square';
}
