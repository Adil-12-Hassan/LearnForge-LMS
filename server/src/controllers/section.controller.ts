import { Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sectionService } from '../services/section.service.js';
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

export const getCurriculum = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const sections = await sectionService.getCurriculum(courseId);
    return sendSuccess(res, sections);
});

export const createSection = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { title } = z.object({ title: z.string().min(2).max(100) }).parse(req.body);
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const section = await sectionService.create(courseId, req.user!.id, title);
    return sendSuccess(res, section, 201);
});

export const updateSection = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { title } = z.object({ title: z.string().min(2).max(100) }).parse(req.body);
    const sectionId = requiredParam(req.params.sId, 'Section ID');
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const section = await sectionService.update(sectionId, courseId, req.user!.id, title);
    return sendSuccess(res, section);
});

export const reorderSections = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderedIds } = z.object({ orderedIds: z.array(z.string()) }).parse(req.body);
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    await sectionService.reorder(courseId, req.user!.id, orderedIds);
    return sendSuccess(res, { message: 'Sections reordered' });
});

export const deleteSection = asyncHandler(async (req: AuthRequest, res: Response) => {
    const sectionId = requiredParam(req.params.sId, 'Section ID');
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    await sectionService.delete(sectionId, courseId, req.user!.id);
    return sendSuccess(res, { message: 'Section deleted' });
});
