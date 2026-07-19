'use server'

import dbConnect from "@/db/init";
import Image, { ImageInterface, Visibility } from "@/db/models/Image";
import { PipelineStage } from "mongoose";
import { SearchResult } from "./types";
import { DeletedObject } from "@aws-sdk/client-s3";
import { getS3, attachUrls } from "@/utils/s3";
import { config } from "@/config/env";

// ponytail: viewer 권한은 관리자 아니면 public만. 미들웨어와 auth-wrapper.isAdmin이 게이팅.
function visibilityMatch(admin: boolean): PipelineStage.Match | null {
    return admin ? null : { $match: { visibility: 'public' } };
}

function pipeWithVisibility(admin: boolean, stages: PipelineStage[]): PipelineStage[] {
    const vis = visibilityMatch(admin);
    return vis ? [vis, ...stages] : stages;
}

export async function createImage(image: ImageInterface) {
    await dbConnect();
    return new Image(image).save();
}

export async function getImageById(_id: string, admin: boolean) {
    await dbConnect();
    const res = await Image.aggregate<ImageInterface>(
        pipeWithVisibility(admin, [{ $match: { _id } }])
    );
    return (await attachUrls(res))[0];
}

export async function getRecentImages(admin: boolean, limit: number = 20, _id?: string, orientation?: 'landscape' | 'portrait' | 'square') {
    await dbConnect();
    const stages: PipelineStage[] = [{ $sort: { _id: -1 } }];
    const matches: any = {};
    if (_id) matches._id = { $lt: _id };
    if (orientation) matches.orientation = orientation;
    if (Object.keys(matches).length) stages.push({ $match: matches });
    if (limit) stages.push({ $limit: limit });
    return await attachUrls(await Image.aggregate<ImageInterface>(pipeWithVisibility(admin, stages)));
}

export async function getNextImagesById(admin: boolean, _id: string, limit: number = 1) {
    await dbConnect();
    return await attachUrls(await Image.aggregate<ImageInterface>(pipeWithVisibility(admin, [
        { $match: { _id: { $gt: _id } } },
        { $limit: limit },
    ])));
}

export async function getPrevImagesById(admin: boolean, _id: string, limit: number = 1) {
    await dbConnect();
    return await attachUrls(await Image.aggregate<ImageInterface>(pipeWithVisibility(admin, [
        { $match: { _id: { $lt: _id } } },
        { $sort: { _id: -1 } },
        { $limit: limit },
    ])));
}

export async function getSurroundingImagesById(admin: boolean, imageId: string, radius: number) {
    await dbConnect();
    const visMatch = visibilityMatch(admin);
    const forwardStages: PipelineStage[] = [];
    if (visMatch) forwardStages.push(visMatch);
    forwardStages.push(
        { $match: { _id: { $gte: imageId } } },
        { $sort: { _id: 1 } },
        { $limit: radius + 1 },
        {
            $unionWith: {
                coll: 'images',
                pipeline: [
                    ...(visMatch ? [visMatch] : []),
                    { $match: { _id: { $lt: imageId } } },
                    { $sort: { _id: -1 } },
                    { $limit: radius },
                ],
            },
        },
        { $sort: { _id: 1 } },
    );
    return await attachUrls(await Image.aggregate<ImageInterface>(forwardStages));
}

export async function addImageTags(imageId: string, tags: string[]) {
    await dbConnect();
    return await Image.updateOne(
        { _id: imageId },
        { $addToSet: { tags: { $each: tags } } }
    );
}

export async function removeImageTag(imageId: string, tag: string) {
    await dbConnect();
    return await Image.updateOne({ _id: imageId }, { $pull: { tags: tag } });
}

// 태그는 replace(덮어쓰기) 또는 append(추가) 중 선택 가능.
// 이전엔 무조건 append였음. 관리 페이지에서 태그 지우려면 replace 필요.
export interface MetadataUpdate {
    title?: string;
    description?: string;
    visibility?: Visibility;
    tags?: { mode: 'replace' | 'append'; values: string[] };
}

export async function updateImagesMetadata(imageIds: string[], update: MetadataUpdate) {
    await dbConnect();
    const $set: any = {};
    if (update.title !== undefined) $set.title = update.title;
    if (update.description !== undefined) $set.description = update.description;
    if (update.visibility !== undefined) $set.visibility = update.visibility;
    if (update.tags?.mode === 'replace') $set.tags = update.tags.values;

    const query: any = {};
    if (Object.keys($set).length) query.$set = $set;
    if (update.tags?.mode === 'append' && update.tags.values.length) {
        query.$addToSet = { tags: { $each: update.tags.values } };
    }

    return await Image.updateMany({ _id: { $in: imageIds } }, query);
}

export async function updateImageTitle(imageId: string, new_title: string) {
    const res = await Image.updateOne({ _id: imageId }, { $set: { title: new_title } });
    return res.acknowledged && res.modifiedCount > 0 ? { title: new_title } : null;
}

export async function updateImageDescription(imageId: string, new_description: string) {
    const res = await Image.updateOne({ _id: imageId }, { $set: { description: new_description } });
    return res.acknowledged && res.modifiedCount > 0 ? { description: new_description } : null;
}

export async function searchImages(admin: boolean, query: string, page: number = 1, pageSize: number = 10): Promise<SearchResult<ImageInterface>> {
    await dbConnect();
    const words = decodeURI(query).split(' ').map(word => new RegExp(word, 'i'));
    const stages: PipelineStage[] = [
        {
            $match: {
                $or: [
                    { title: { $in: words } },
                    { tags: { $in: words } },
                    { description: { $in: words } },
                ],
            },
        },
        {
            $facet: {
                results: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
                totalCount: [{ $count: 'count' }],
            },
        },
    ];
    const images = await Image.aggregate(pipeWithVisibility(admin, stages));
    const totalCount = images[0].totalCount[0] ? images[0].totalCount[0].count : 0;
    return {
        results: await attachUrls(images[0].results as ImageInterface[]),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
    };
}

// 익명 좋아요: visitorId(쿠키 UUID)로 1회 dedupe. addToSet 실패=이미 좋아요됨.
// ponytail: IP 해시 보조 검증 없음, 어뷰징 심하면 추가.
export async function toggleLike(imageId: string, visitorId: string, liked: boolean) {
    await dbConnect();
    // 좋아요는 공개 사진에만. 비공개 ID 안다고 카운트 조작 못 하게 필터에 포함.
    const base = { _id: imageId, visibility: 'public' as const };
    if (liked) {
        const res = await Image.updateOne(
            { ...base, likeVisitors: { $ne: visitorId } },
            { $push: { likeVisitors: visitorId }, $inc: { likeCount: 1 } }
        );
        return res.modifiedCount > 0;
    } else {
        const res = await Image.updateOne(
            { ...base, likeVisitors: visitorId },
            { $pull: { likeVisitors: visitorId }, $inc: { likeCount: -1 } }
        );
        return res.modifiedCount > 0;
    }
}

export async function hasVisitorLiked(imageId: string, visitorId: string): Promise<boolean> {
    await dbConnect();
    const found = await Image.findOne({ _id: imageId, likeVisitors: visitorId }, { _id: 1 }).lean();
    return !!found;
}

export async function deleteS3Images(s3_keys: string[]) {
    let _deleted: DeletedObject[] | undefined = [];
    try {
        const { Deleted } = await getS3().deleteObjects({
            Bucket: config.S3_BUCKET,
            Delete: { Objects: s3_keys.map(k => ({ Key: k })) },
        });
        _deleted = Deleted;
    } catch (err) {
        console.log('S3 Bucket Object 삭제 실패 ', err);
    }
    return _deleted ? _deleted.length > 0 : false;
}

// 연도 기준: exif.takenAt 우선, 없으면 uploadedAt.
export async function getImagesByYear(admin: boolean, year: number) {
    await dbConnect();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const stages: PipelineStage[] = [
        {
            $addFields: {
                _effectiveDate: { $ifNull: ['$exif.takenAt', '$uploadedAt'] },
            },
        },
        { $match: { _effectiveDate: { $gte: start, $lt: end } } },
        { $sort: { _effectiveDate: -1 } },
        { $project: { _effectiveDate: 0 } },
    ];
    return await attachUrls(await Image.aggregate<ImageInterface>(pipeWithVisibility(admin, stages)));
}

export async function getAvailableYears(admin: boolean): Promise<number[]> {
    await dbConnect();
    const stages: PipelineStage[] = [
        {
            $group: {
                _id: { $year: { $ifNull: ['$exif.takenAt', '$uploadedAt'] } },
            },
        },
        { $sort: { _id: -1 } },
    ];
    const rows = await Image.aggregate<{ _id: number }>(pipeWithVisibility(admin, stages));
    return rows.map(r => r._id).filter(y => y);
}

export async function getRandomImageId(admin: boolean): Promise<string | undefined> {
    await dbConnect();
    const rows = await Image.aggregate<{ _id: string }>(pipeWithVisibility(admin, [
        { $sample: { size: 1 } },
        { $project: { _id: 1 } },
    ]));
    return rows[0]?._id;
}

export async function deleteImages(imageIds: string[]) {
    await dbConnect();
    return (await Image.deleteMany({ _id: { $in: imageIds } })).acknowledged;
}
