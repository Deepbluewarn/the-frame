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

export function computeOrientation(width: number, height: number): Orientation {
    const ratio = width / height;
    if (ratio > 1.05) return 'landscape';
    if (ratio < 0.95) return 'portrait';
    return 'square';
}
