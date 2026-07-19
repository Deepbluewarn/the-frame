import { actionGetImageById, actionGetSurroundingImagesById, actionHasLiked } from "@/actions/image";
import { notFound } from 'next/navigation';
import { isValidObjectId } from 'mongoose';
import { Metadata } from "next";
import { cache } from 'react';
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import PhotoNavigator from "@/components/PhotoNavigator";
import PhotoZoom from "@/components/PhotoZoom";
import ExifBlock from "@/components/ExifBlock";
import { generateImageSchema } from "@/lib/imageSchema";
import { config } from "@/config/env";
import type { ImageInterface } from "@/db/models/Image";

export const dynamic = 'force-dynamic';

// generateMetadata와 Page가 같은 요청에서 이 함수를 호출하면 캐시되어 DB 1회만 조회.
const getImage = cache(async (id: string) => actionGetImageById(id));

export async function generateMetadata({ params }: { params: { imageId: string } }): Promise<Metadata> {
    const noindex = { robots: { index: false, follow: false } };
    if (!isValidObjectId(params.imageId)) return noindex;
    const image = await getImage(params.imageId);
    if (!image) return noindex;
    if (image.visibility === 'private') return noindex;

    const tagsPart = image.tags?.length ? `태그: ${image.tags.join(', ')}` : '';
    const descBase = image.description || image.title;
    const description = tagsPart ? `${descBase} — ${tagsPart}` : descBase;

    return {
        title: image.title,
        description,
        alternates: { canonical: `/image/${params.imageId}` },
        openGraph: {
            title: image.title,
            description,
            images: [{ url: image.url, width: image.width, height: image.height }],
            type: 'article',
        },
        twitter: { card: 'summary_large_image', images: [image.url] },
    };
}

export default async function Page({ params }: { params: { imageId: string } }) {
    if (!isValidObjectId(params.imageId)) notFound();

    // 3개 fetch 병렬화. 이전엔 순차라 첫 렌더까지 왕복 3번 걸림.
    const [image, alreadyLiked, surrounding] = await Promise.all([
        getImage(params.imageId),
        actionHasLiked(params.imageId),
        actionGetSurroundingImagesById(params.imageId, 1),
    ]) as [ImageInterface | undefined, boolean, ImageInterface[]];

    if (!image) notFound();

    const currIdx = surrounding.findIndex((i: ImageInterface) => i._id === params.imageId);
    const prev = currIdx > 0 ? surrounding[currIdx - 1] : undefined;
    const next = currIdx >= 0 && currIdx < surrounding.length - 1 ? surrounding[currIdx + 1] : undefined;

    const authorName = config.AUTHOR_NAME;
    const authorUrl = config.SITE_URL;
    const jsonLd = generateImageSchema(image, authorName, authorUrl);

    return (
        <article className="h-[calc(100vh-3.5rem)] max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-col justify-center overflow-hidden">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <PhotoNavigator
                prevId={prev?._id} nextId={next?._id}
                prevUrl={prev?.url} nextUrl={next?.url}
            />

            <figure className="flex justify-center max-h-[calc(100vh-8rem)]">
                <PhotoZoom src={image.urlMedium || image.url} zoomSrc={image.url} alt={image.title} width={image.width} height={image.height} blurhash={image.blurhash} />
                <figcaption className="sr-only">{image.title}</figcaption>
            </figure>

            <div className="shrink-0 pt-2 grid gap-4 md:grid-cols-[1fr_auto] items-start">
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xs font-medium text-neutral-500 truncate leading-none">{image.title}</h1>
                        <LikeButton
                            imageId={image._id}
                            initialLiked={alreadyLiked}
                            initialCount={image.likeCount ?? 0}
                        />
                        <ShareButton />
                    </div>
                    <p className="text-[10px] text-neutral-300">
                        {new Date(image.exif?.takenAt || image.uploadedAt).toLocaleDateString('ko-KR')}
                    </p>
                    {image.description && (
                        <p className="text-[11px] text-neutral-400 whitespace-pre-line max-h-16 overflow-y-auto pr-2">{image.description}</p>
                    )}
                    {image.tags?.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5">
                            {image.tags.map(t => (
                                <li key={t} className="text-[10px] text-neutral-300">#{t}</li>
                            ))}
                        </ul>
                    )}
                </div>
                <ExifBlock exif={image.exif} />
            </div>
        </article>
    );
}
