import { S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// MinIO / S3 공통 클라이언트. forcePathStyle=true는 MinIO 필수, S3에서도 문제 없음.
export const s3 = new S3({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
});

export const S3_BUCKET = process.env.S3_BUCKET!;

// ponytail: 1시간 고정. 홈 revalidate 60초 대비 훨씬 여유. 만료 오차로 이미지 깨질 일 없음.
const PRESIGN_TTL = 60 * 60;

export async function presign(s3_key: string): Promise<string> {
    return await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3_key }),
        { expiresIn: PRESIGN_TTL }
    );
}

export async function attachUrls<T extends { s3_key: string; url?: string }>(images: T[]): Promise<T[]> {
    return Promise.all(images.map(async img => ({ ...img, url: await presign(img.s3_key) })));
}
