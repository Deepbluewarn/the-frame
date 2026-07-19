'use server'

import {
    addImageTags,
    deleteImages,
    deleteS3Images,
    getAvailableYears,
    getImageById,
    getImagesByYear,
    getNextImagesById,
    getPrevImagesById,
    getRandomImageId,
    getRecentImages,
    getSurroundingImagesById,
    hasVisitorLiked,
    removeImageTag,
    searchImages,
    toggleLike,
    updateImageDescription,
    updateImagesMetadata,
    updateImageTitle,
} from "@/services/Image";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import Image, { Visibility } from "@/db/models/Image";
import { assertAdmin, isAdmin } from "@/utils/auth-wrapper";

const VISITOR_COOKIE = 'visitor_id';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5년

function getOrCreateVisitorId(): string {
    const jar = cookies();
    const existing = jar.get(VISITOR_COOKIE)?.value;
    if (existing) return existing;
    const id = randomUUID();
    // ponytail: server action에서 쿠키 세팅 가능. 첫 방문 시 발급.
    jar.set(VISITOR_COOKIE, id, {
        maxAge: VISITOR_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
    });
    return id;
}

import type { Orientation } from "@/db/models/Image";

export interface ImagePaginationParams {
    limit?: number;
    last_image_id?: string;
    orientation?: Orientation;
}

export async function actionGetImageById(_id: string) {
    return await getImageById(_id, isAdmin());
}

export async function actionGetRecentImages(params: ImagePaginationParams) {
    return await getRecentImages(isAdmin(), params.limit, params.last_image_id, params.orientation);
}

export async function actionGetNextImagesById(_current_id: string, limit?: number) {
    return await getNextImagesById(isAdmin(), _current_id, limit);
}

export async function actionGetPrevImagesById(_current_id: string, limit?: number) {
    return await getPrevImagesById(isAdmin(), _current_id, limit);
}

export async function actionGetSurroundingImagesById(_id: string, radius: number) {
    return await getSurroundingImagesById(isAdmin(), _id, radius);
}

export async function actionAddImageTags(_id: string, tags: string[]) {
    assertAdmin();
    return await addImageTags(_id, tags);
}

export async function actionRemoveImageTag(_id: string, tag: string) {
    assertAdmin();
    return await removeImageTag(_id, tag);
}

export async function actionUpdateImagesMetadata(
    imageIds: string[], title?: string, description?: string, tags?: string[],
    visibility?: Visibility,
) {
    assertAdmin();
    return (await updateImagesMetadata(imageIds, title, description, tags, visibility)).acknowledged;
}

export async function actionToggleLike(imageId: string, liked: boolean) {
    const visitorId = getOrCreateVisitorId();
    const changed = await toggleLike(imageId, visitorId, liked);
    return { changed, liked };
}

export async function actionHasLiked(imageId: string) {
    const jar = cookies();
    const visitorId = jar.get(VISITOR_COOKIE)?.value;
    if (!visitorId) return false;
    return await hasVisitorLiked(imageId, visitorId);
}

export async function actionUpdateImageTitle(imageId: string, new_title: string) {
    assertAdmin();
    return await updateImageTitle(imageId, new_title);
}

export async function actionUpdateImageDescription(imageId: string, new_description: string) {
    assertAdmin();
    return await updateImageDescription(imageId, new_description);
}

export async function actionSearchImages(query: string, page: number = 1, pageSize: number = 10) {
    return await searchImages(isAdmin(), query, page, pageSize);
}

export async function actionGetImagesByYear(year: number) {
    return await getImagesByYear(isAdmin(), year);
}

export async function actionGetAvailableYears() {
    return await getAvailableYears(isAdmin());
}

export async function actionGetRandomImageId() {
    return await getRandomImageId(isAdmin());
}

export async function actionDeleteImages(imageIds: string[]) {
    assertAdmin();
    const images = await Image.find({ _id: { $in: imageIds } });
    const s3Keys = images.flatMap(img => [img.s3_key, img.s3_key_thumb, img.s3_key_medium].filter(Boolean) as string[]);
    const dbOk = await deleteImages(imageIds);
    const s3Ok = await deleteS3Images(s3Keys);
    return { images_deleted: dbOk, s3_deleted: s3Ok };
}
