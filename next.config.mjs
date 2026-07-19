/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    experimental: {
        serverComponentsExternalPackages: ['pino', 'pino-pretty']
    },
    // ponytail: MinIO presigned URL은 임의 host + 쿼리 파라미터. Next.js <Image> 대신 <img>만 쓰므로 remotePatterns 불필요.
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
