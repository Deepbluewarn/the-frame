import exifr from 'exifr';
import type { Exif } from '@/db/models/Image';

const PICK = ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal', 'latitude', 'longitude'];

export async function extractExif(buffer: Buffer): Promise<Exif | undefined> {
    let data: any;
    try {
        data = await exifr.parse(buffer, { pick: PICK });
    } catch {
        return undefined;
    }
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
        takenAt: data.DateTimeOriginal ? new Date(data.DateTimeOriginal) : undefined,
        lat: typeof data.latitude === 'number' ? data.latitude : undefined,
        lng: typeof data.longitude === 'number' ? data.longitude : undefined,
    };
}
