import mongoose, { Model, Schema, Types } from 'mongoose';

export type Visibility = 'public' | 'private';
export const visibilityArray: Visibility[] = ['public', 'private'];

export interface Exif {
    camera?: string;
    lens?: string;
    focalLength?: number;    // mm
    aperture?: number;        // f-number
    shutterSpeed?: string;    // "1/200"
    iso?: number;
    takenAt?: Date;
    lat?: number;
    lng?: number;
}

export interface ImageInterface {
    _id: string;
    url: string;
    s3_key: string;
    width: number;
    height: number;
    title: string;
    description: string;
    tags: string[];
    uploadedAt: Date;
    likeCount: number;
    likeVisitors: string[]; // ponytail: 방문자 UUID 목록. 어뷰징 감지 없음. 필요하면 IP 해시 추가.
    visibility: Visibility;
    exif?: Exif;
}

type ImageModel = Model<ImageInterface>;

const ExifSchema = new Schema<Exif>({
    camera: String,
    lens: String,
    focalLength: Number,
    aperture: Number,
    shutterSpeed: String,
    iso: Number,
    takenAt: Date,
    lat: Number,
    lng: Number,
}, { _id: false });

export const ImageSchema: Schema = new Schema<ImageInterface, ImageModel>({
    _id: { type: String, default: () => new Types.ObjectId().toString() },
    url: { type: String, default: '' },
    s3_key: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    tags: { type: [String], required: true },
    uploadedAt: { type: Date, default: Date.now },
    likeCount: { type: Number, default: 0 },
    likeVisitors: { type: [String], default: [] },
    visibility: { type: String, enum: visibilityArray, default: 'public' },
    exif: { type: ExifSchema },
});

const Image = mongoose.models.Image as ImageModel || mongoose.model<ImageInterface, ImageModel>('Image', ImageSchema);

export default Image;
