'use server';

import { Upload } from '@aws-sdk/lib-storage';
import { Types } from 'mongoose';
import { createImage } from './Image';
import { getS3, ensureBucket, attachUrls } from '@/utils/s3';
import { config } from '@/config/env';
import {
    makeThumb, makeMedium, makeBlurhash, computeOrientation,
    needsNormalize, normalizeToJpeg, getDimensions,
} from '@/utils/image-pipeline';
import { extractExif } from '@/utils/exif';
import type { ImageInterface, Visibility, Exif, Orientation } from '@/db/models/Image';

// 업로드 파이프라인이 산재되어 이해가 어려웠던 문제 해결.
// 두 단계로 압축: process (버퍼→파생물) → save (S3+DB).

export interface ProcessedImage {
    buffer: Buffer;
    bufferThumb: Buffer;
    bufferMedium: Buffer;
    dimensions: { width: number; height: number };
    orientation: Orientation;
    blurhash?: string;
    exif?: Exif;
    contentType: string;
    filename: string;  // 정규화 후 파일명 (확장자 반영)
}

export interface UploadMetadata {
    title: string;
    description: string;
    tags: string[];
    visibility: Visibility;
}

async function putObject(buffer: Buffer, key: string, contentType: string) {
    await new Upload({
        client: getS3(),
        params: { Bucket: config.S3_BUCKET, Key: key, Body: buffer, ContentType: contentType },
    }).done();
}

// Step 1: 원본 버퍼에서 파생물 전부 계산.
export async function processUploadedFile(
    rawBuffer: Buffer, originalFilename: string, contentType: string
): Promise<ProcessedImage> {
    const normalize = needsNormalize(contentType);
    const buffer = normalize ? await normalizeToJpeg(rawBuffer) : rawBuffer;
    const filename = normalize ? originalFilename.replace(/\.[^.]+$/, '.jpg') : originalFilename;
    const finalContentType = normalize ? 'image/jpeg' : contentType;

    const [dims, bufferThumb, bufferMedium, blurhash, exif] = await Promise.all([
        getDimensions(buffer),
        makeThumb(buffer),
        makeMedium(buffer),
        makeBlurhash(buffer),
        extractExif(rawBuffer), // EXIF는 원본에서
    ]);

    return {
        buffer,
        bufferThumb,
        bufferMedium,
        dimensions: dims,
        orientation: computeOrientation(dims.width, dims.height),
        blurhash,
        exif,
        contentType: finalContentType,
        filename,
    };
}

// Step 2: S3 3개 저장 + DB 문서 저장.
export async function uploadAndSaveImage(
    processed: ProcessedImage, meta: UploadMetadata
): Promise<ImageInterface> {
    await ensureBucket();
    const stamp = Date.now();
    const keyOriginal = `${processed.filename}_${stamp}`;
    const keyThumb = `${processed.filename}_${stamp}_thumb.jpg`;
    const keyMedium = `${processed.filename}_${stamp}_medium.jpg`;

    await Promise.all([
        putObject(processed.buffer, keyOriginal, processed.contentType),
        putObject(processed.bufferThumb, keyThumb, 'image/jpeg'),
        putObject(processed.bufferMedium, keyMedium, 'image/jpeg'),
    ]);

    const doc = await createImage({
        _id: new Types.ObjectId().toString(),
        url: '',
        s3_key: keyOriginal,
        s3_key_thumb: keyThumb,
        s3_key_medium: keyMedium,
        width: processed.dimensions.width,
        height: processed.dimensions.height,
        orientation: processed.orientation,
        blurhash: processed.blurhash,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        uploadedAt: new Date(),
        likeCount: 0,
        likeVisitors: [],
        visibility: meta.visibility,
        exif: processed.exif,
    });

    // 업로드 직후 URL이 필요한 경우 (즉시 preview 등)를 위해 attached 결과 반환.
    // DB 저장은 url 없이, 조회는 매번 presign — 일관 모델.
    return (await attachUrls([doc.toObject() as ImageInterface]))[0];
}
