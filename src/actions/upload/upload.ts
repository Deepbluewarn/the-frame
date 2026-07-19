'use server';
import { ImageInterface, MetaFileInterface } from "@/interface/Upload";
import { Upload } from "@aws-sdk/lib-storage";
import { createImage } from "@/services/Image";
import { getImageDimensions } from "@/utils/file";
import { extractExif } from "@/utils/exif";
import { makeThumb, makeMedium, makeBlurhash, computeOrientation } from "@/utils/image-pipeline";
import { s3, S3_BUCKET, ensureBucket } from "@/utils/s3";
import connectDB from '@/db/init';
import { Types } from "mongoose";
import { assertAdmin } from "@/utils/auth-wrapper";

async function putObject(buffer: Buffer, key: string, contentType: string) {
    await new Upload({
        client: s3,
        params: { Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: contentType },
    }).done();
}

export const UploadAction = async (metadata: ImageInterface[] | null, data: FormData) => {
    assertAdmin();
    await connectDB();
    await ensureBucket();

    if (!metadata) return { success: false, error: 'Metadata not found' };

    const metaFiles: MetaFileInterface[] = [];

    for (const e of metadata) {
        const fileObject = Array.from(data.entries()).find(([key, file]) => {
            if (file instanceof File) return e.originalFileName === decodeURIComponent(key);
        });
        if (!fileObject) continue;

        const fileObj = fileObject[1] as File;
        const dimensions = await getImageDimensions(fileObj);
        const meta = e as MetaFileInterface;
        meta.fileObject = fileObj;
        meta.width = dimensions.width;
        meta.height = dimensions.height;
        metaFiles.push(meta);
    }

    try {
        for (const metaFile of metaFiles) {
            const fileObj = metaFile.fileObject;
            const buffer = Buffer.from(await fileObj.arrayBuffer());
            const stamp = Date.now();
            const key = `${fileObj.name}_${stamp}`;
            const keyThumb = `${fileObj.name}_${stamp}_thumb.jpg`;
            const keyMedium = `${fileObj.name}_${stamp}_medium.jpg`;

            const [thumbBuf, mediumBuf, blurhash, exif] = await Promise.all([
                makeThumb(buffer),
                makeMedium(buffer),
                makeBlurhash(buffer),
                extractExif(buffer),
            ]);

            await Promise.all([
                putObject(buffer, key, fileObj.type),
                putObject(thumbBuf, keyThumb, 'image/jpeg'),
                putObject(mediumBuf, keyMedium, 'image/jpeg'),
            ]);

            await createImage({
                _id: new Types.ObjectId().toString(),
                url: '',
                s3_key: key,
                s3_key_thumb: keyThumb,
                s3_key_medium: keyMedium,
                width: metaFile.width,
                height: metaFile.height,
                orientation: computeOrientation(metaFile.width, metaFile.height),
                blurhash,
                title: metaFile?.name,
                description: metaFile.description,
                tags: metaFile.tags,
                uploadedAt: new Date(),
                likeCount: 0,
                likeVisitors: [],
                visibility: metaFile.visibility,
                exif,
            });
        }
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }

    return { success: true };
};
