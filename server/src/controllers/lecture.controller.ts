import { Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { lectureService } from '../services/lecture.service.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';

const requiredParam = (value: string | string[] | undefined, name: string): string => {
    const param = Array.isArray(value) ? value[0] : value;
    if (!param) {
        throw Object.assign(new Error(`${name} is required`), {
            statusCode: 400,
            isOperational: true,
        });
    }
    return param;
};

const createSchema = z.object({
    title: z.string().min(2).max(150),
    type: z.enum(['VIDEO', 'ARTICLE', 'PDF', 'QUIZ', 'ASSIGNMENT']),
    isFree: z.boolean().optional(),
    content: z.string().optional(),
});

const updateSchema = z.object({
    title: z.string().min(2).max(150).optional(),
    isFree: z.boolean().optional(),
    content: z.string().optional(),
    videoUrl: z.string().url().optional(),
    resourceUrl: z.string().url().optional(),
    duration: z.number().optional(),
    videoStatus: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']).optional(),
});

export const createLecture = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createSchema.parse(req.body);
    const sectionId = requiredParam(req.params.sId, 'Section ID');
    const lecture = await lectureService.create(sectionId, req.user!.id, data);
    return sendSuccess(res, lecture, 201);
});

export const updateLecture = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = updateSchema.parse(req.body);
    const lectureId = requiredParam(req.params.lId, 'Lecture ID');
    const sectionId = requiredParam(req.params.sId, 'Section ID');
    const lecture = await lectureService.update(lectureId, sectionId, req.user!.id, data);
    return sendSuccess(res, lecture);
});

export const reorderLectures = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderedIds } = z.object({ orderedIds: z.array(z.string()) }).parse(req.body);
    const sectionId = requiredParam(req.params.sId, 'Section ID');
    await lectureService.reorder(sectionId, req.user!.id, orderedIds);
    return sendSuccess(res, { message: 'Lectures reordered' });
});

export const deleteLecture = asyncHandler(async (req: AuthRequest, res: Response) => {
    const lectureId = requiredParam(req.params.lId, 'Lecture ID');
    const sectionId = requiredParam(req.params.sId, 'Section ID');
    await lectureService.delete(lectureId, sectionId, req.user!.id);
    return sendSuccess(res, { message: 'Lecture deleted' });
});

export const updateProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { enrollmentId, watchedSecs } = z.object({
        enrollmentId: z.string(),
        watchedSecs: z.number().min(0),
    }).parse(req.body);
    const lectureId = requiredParam(req.params.lId, 'Lecture ID');
    const progress = await lectureService.updateProgress(lectureId, enrollmentId, req.user!.id, watchedSecs);
    return sendSuccess(res, progress);
});
