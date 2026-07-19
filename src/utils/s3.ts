import { S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

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

// ponytail: 앱 시작 시 버킷 없으면 만든다. 프로덕션에선 미리 있는 게 자연스럽지만
// dev/셀프호스트에선 한 줄로 해결되는 편의성이 낫다.
let bucketEnsured = false;
export async function ensureBucket() {
    if (bucketEnsured) return;
    try {
        await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    } catch {
        try {
            await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
        } catch (e) {
            console.warn('버킷 생성 실패 (이미 있으면 무시):', (e as Error).message);
        }
    }
    bucketEnsured = true;
}

// ponytail: 1시간 고정. 홈 revalidate 60초 대비 훨씬 여유. 만료 오차로 이미지 깨질 일 없음.
const PRESIGN_TTL = 60 * 60;

export async function presign(s3_key: string): Promise<string> {
    // ponytail: aws-sdk v3 타입 문제로 캐스팅. 런타임 문제 없음.
    return await getSignedUrl(
        s3 as any,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3_key }),
        { expiresIn: PRESIGN_TTL }
    );
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
