'use server';
import { ImageInterface, MetaFileInterface } from "@/interface/Upload";
import connectDB from '@/db/init';
import { assertAdmin } from "@/utils/auth-wrapper";
import { processUploadedFile, uploadAndSaveImage } from '@/services/ImageUpload';

export const UploadAction = async (metadata: ImageInterface[] | null, data: FormData) => {
    assertAdmin();
    await connectDB();

    if (!metadata) return { success: false, error: 'Metadata not found' };

    const pairs: { meta: MetaFileInterface; file: File }[] = [];
    for (const e of metadata) {
        const entry = Array.from(data.entries()).find(([key, file]) => {
            if (file instanceof File) return e.originalFileName === decodeURIComponent(key);
        });
        if (!entry) continue;
        pairs.push({ meta: e as MetaFileInterface, file: entry[1] as File });
    }

    try {
        for (const { meta, file } of pairs) {
            const rawBuffer = Buffer.from(await file.arrayBuffer());
            const processed = await processUploadedFile(rawBuffer, file.name, file.type);
            await uploadAndSaveImage(processed, {
                title: meta.name,
                description: meta.description,
                tags: meta.tags,
                visibility: meta.visibility,
            });
        }
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }

    return { success: true };
};
