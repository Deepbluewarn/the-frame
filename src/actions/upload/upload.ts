'use server';
import { ImageInterface, MetaFileInterface } from "@/interface/Upload";
import { Upload } from "@aws-sdk/lib-storage";
import { createImage } from "@/services/Image";
import { getImageDimensions } from "@/utils/file";
import { extractExif } from "@/utils/exif";
import { s3, S3_BUCKET } from "@/utils/s3";
import connectDB from '@/db/init';
import { Types } from "mongoose";
import { assertAdmin } from "@/utils/auth-wrapper";

async function uploadImageToS3(buffer: Buffer, key: string, contentType: string) {
    await new Upload({
        client: s3,
        params: {
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        },
    }).done();
}

export const UploadAction = async (metadata: ImageInterface[] | null, data: FormData) => {
    assertAdmin();
    await connectDB();

    if (!metadata) return { success: false, error: 'Metadata not found' };

    const metaFiles: MetaFileInterface[] = [];

    for (const e of metadata) {
        const fileObject = Array.from(data.entries()).find(([key, file]) => {
            if (file instanceof File) {
                return e.originalFileName === decodeURIComponent(key);
            }
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
            const key = `${fileObj.name}_${new Date().getTime()}`;
            await uploadImageToS3(buffer, key, fileObj.type);

            const exif = await extractExif(buffer);

            await createImage({
                _id: new Types.ObjectId().toString(),
                url: '', // ponytail: URL은 조회 시 presign. 필드는 스키마 호환용 빈 값.
                s3_key: key,
                width: metaFile.width,
                height: metaFile.height,
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
