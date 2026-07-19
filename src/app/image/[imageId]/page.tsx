import { actionGetImageById, actionGetSurroundingImagesById, actionHasLiked } from "@/actions/image";
import { notFound } from 'next/navigation';
import { isValidObjectId } from 'mongoose';
import { Metadata } from "next";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import PhotoNavigator from "@/components/PhotoNavigator";
import PhotoZoom from "@/components/PhotoZoom";
import type { ImageInterface, Exif } from "@/db/models/Image";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { imageId: string } }): Promise<Metadata> {
    if (!isValidObjectId(params.imageId)) return { robots: { index: false, follow: false } };
    const image = await actionGetImageById(params.imageId);
    if (!image) return { robots: { index: false, follow: false } };
    if (image.visibility === 'private') return { robots: { index: false, follow: false } };

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

function ExifRow({ label, value }: { label: string; value?: string | number | null }) {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-neutral-300">{label}</dt>
            <dd className="text-neutral-400">{value}</dd>
        </div>
    );
}

function ExifBlock({ exif }: { exif?: Exif }) {
    return (
        <dl className="text-[10px] space-y-1">
            <ExifRow label="카메라" value={exif?.camera} />
            <ExifRow label="렌즈" value={exif?.lens} />
            <ExifRow label="초점거리" value={exif?.focalLength ? `${exif.focalLength}mm` : undefined} />
            <ExifRow label="조리개" value={exif?.aperture ? `f/${exif.aperture}` : undefined} />
            <ExifRow label="셔터" value={exif?.shutterSpeed} />
            <ExifRow label="ISO" value={exif?.iso} />
        </dl>
    );
}

export default async function Page({ params }: { params: { imageId: string } }) {
    if (!isValidObjectId(params.imageId)) notFound();

    const image: ImageInterface | undefined = await actionGetImageById(params.imageId);
    if (!image) notFound();

    const alreadyLiked = await actionHasLiked(params.imageId);
    const surrounding = await actionGetSurroundingImagesById(params.imageId, 1);
    const currIdx = surrounding.findIndex((i: ImageInterface) => i._id === params.imageId);
    const prev = currIdx > 0 ? surrounding[currIdx - 1] : undefined;
    const next = currIdx >= 0 && currIdx < surrounding.length - 1 ? surrounding[currIdx + 1] : undefined;

    const authorName = process.env.AUTHOR_NAME || 'THE FRAME';
    const authorUrl = process.env.SITE_URL || undefined;

    const jsonLd = {
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
