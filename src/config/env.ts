// 환경변수 중앙 검증. 부팅 시 필수값 누락 감지.
// process.env 직접 접근을 이 모듈로 대체.

function required(name: string): string {
    const v = process.env[name];
    if (!v || v.trim() === '') {
        throw new Error(`환경변수 누락: ${name}`);
    }
    return v;
}

function optional(name: string, fallback?: string): string | undefined {
    const v = process.env[name];
    return v && v.trim() !== '' ? v : fallback;
}

// 즉시 평가하지 않고 lazy — build 시점에는 없어도 됨.
class Config {
    get ADMIN_USER() { return required('ADMIN_USER'); }
    get ADMIN_PASS() { return required('ADMIN_PASS'); }

    get MONGODB_URI() { return required('MONGODB_URI'); }

    get S3_ENDPOINT() { return required('S3_ENDPOINT'); }
    get S3_REGION() { return optional('S3_REGION', 'us-east-1')!; }
    get S3_ACCESS_KEY() { return required('S3_ACCESS_KEY'); }
    get S3_SECRET_KEY() { return required('S3_SECRET_KEY'); }
    get S3_BUCKET() { return required('S3_BUCKET'); }

    get SITE_URL() { return optional('SITE_URL'); }
    get AUTHOR_NAME() { return optional('AUTHOR_NAME', 'THE FRAME')!; }

    get UMAMI_URL() { return optional('NEXT_PUBLIC_UMAMI_URL'); }
    get UMAMI_WEBSITE_ID() { return optional('NEXT_PUBLIC_UMAMI_WEBSITE_ID'); }

    get isDev() { return process.env.NODE_ENV === 'development'; }
}

export const config = new Config();
