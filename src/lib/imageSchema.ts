import type { ImageInterface } from '@/db/models/Image';

// schema.org ImageObject JSON-LD 스키마 생성.
// 페이지 곳곳에서 재사용 가능하도록 순수 함수로 분리.
export function generateImageSchema(image: ImageInterface, authorName: string, authorUrl?: string) {
    return {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        contentUrl: image.url,
        name: image.title,
        description: image.description || undefined,
        keywords: image.tags?.length ? image.tags.join(', ') : undefined,
        width: image.width,
        height: image.height,
        uploadDate: image.uploadedAt,
        datePublished: image.exif?.takenAt || image.uploadedAt,
        author: {
            "@type": "Person",
            name: authorName,
            url: authorUrl,
        },
    };
}
