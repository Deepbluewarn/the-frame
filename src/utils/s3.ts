import { S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { config } from '@/config/env';

// 클라이언트는 lazy로 생성. 빌드 시점에 env 없어도 module import 성공.
let _s3: S3 | null = null;
export function getS3(): S3 {
    if (_s3) return _s3;
    _s3 = new S3({
        endpoint: config.S3_ENDPOINT,
        region: config.S3_REGION,
        credentials: {
            accessKeyId: config.S3_ACCESS_KEY,
            secretAccessKey: config.S3_SECRET_KEY,
        },
        forcePathStyle: true,
    });
    return _s3;
}

// ponytail: 1시간 고정. 홈 revalidate 60초 대비 훨씬 여유.
const PRESIGN_TTL = 60 * 60;

export async function presign(s3_key: string): Promise<string> {
    // @ts-expect-error S3/S3Client 제네릭 mismatch
    return await getSignedUrl(getS3(), new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: s3_key }), { expiresIn: PRESIGN_TTL });
}

export async function attachUrls<T extends { s3_key: string; s3_key_thumb?: string; s3_key_medium?: string; url?: string; urlThumb?: string; urlMedium?: string }>(images: T[]): Promise<T[]> {
    return Promise.all(images.map(async img => {
        const [url, urlThumb, urlMedium] = await Promise.all([
            presign(img.s3_key),
            img.s3_key_thumb ? presign(img.s3_key_thumb) : Promise.resolve(undefined),
            img.s3_key_medium ? presign(img.s3_key_medium) : Promise.resolve(undefined),
        ]);
        return { ...img, url, urlThumb, urlMedium };
    }));
}

let bucketEnsured = false;
export async function ensureBucket() {
    if (bucketEnsured) return;
    try {
        await getS3().send(new HeadBucketCommand({ Bucket: config.S3_BUCKET }));
    } catch {
        try {
            await getS3().send(new CreateBucketCommand({ Bucket: config.S3_BUCKET }));
        } catch (e) {
            console.warn('버킷 생성 실패 (이미 있으면 무시):', (e as Error).message);
        }
    }
    bucketEnsured = true;
}
