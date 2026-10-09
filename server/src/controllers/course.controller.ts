import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { courseService } from '../services/course.service.js';
import { AuthRequest } from '../types/index.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { z } from 'zod';

const routeParam = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value[0] ?? '' : value ?? '';

const createSchema = z.object({
    title: z.string().min(5).max(150),
    description: z.string().min(20),
    shortDesc: z.string().min(10).max(300),
    categoryId: z.string().min(1),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    language: z.string().default('en'),
    price: z.number().min(0).default(0),
    thumbnailUrl: z.string().url().optional(),
    previewVideoUrl: z.string().url().optional(),
});

export const listCourses = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPagination(req.query);
    const { search, category, level, language, sort } = req.query as any;

    const { courses, total } = await courseService.list({
        page, limit, skip, search, category, level, language, sort,
    });

    return sendSuccess(res, courses, 200, buildPaginationMeta(page, limit, total));
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
    const slug = routeParam(req.params.slug);
    if (!slug) return sendError(res, 'Course slug is required', 400);
    const course = await courseService.getBySlug(slug);
    if (!course) return sendError(res, 'Course not found', 404);
    return sendSuccess(res, course);
});

export const createCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = createSchema.parse(req.body);
    const course = await courseService.create(req.user!.id, data);
    return sendSuccess(res, course, 201);
});

export const updateCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = routeParam(req.params.id);
    if (!id) return sendError(res, 'Course ID is required', 400);
    const data = createSchema.partial().parse(req.body);
    const course = await courseService.update(id, req.user!.id, data);
    return sendSuccess(res, course);
});

export const publishCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = routeParam(req.params.id);
    if (!id) return sendError(res, 'Course ID is required', 400);
    const { status } = z.object({
        status: z.enum(['REVIEW', 'PUBLISHED', 'ARCHIVED', 'DRAFT']),
    }).parse(req.body);
    const course = await courseService.setStatus(id, req.user!.id, status);
    return sendSuccess(res, course);
});

export const deleteCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = routeParam(req.params.id);
    if (!id) return sendError(res, 'Course ID is required', 400);
    await courseService.delete(id, req.user!.id);
    return sendSuccess(res, { message: 'Course deleted' });
});

export const myTeacherCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courses = await courseService.listByInstructor(req.user!.id);
    return sendSuccess(res, courses);
});
