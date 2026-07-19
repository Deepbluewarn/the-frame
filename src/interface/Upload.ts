import { Visibility } from "@/db/models/Image";

export interface UploadMeta {
    originalFileName: string;
    name: string;
    description: string;
    tags: string[];
    visibility: Visibility;
}

// Server-only: filled during action
export interface MetaFileInterface extends UploadMeta {
    fileObject: File;
    width: number;
    height: number;
}

// Back-compat export name (used by upload action signature)
export type ImageInterface = UploadMeta;
