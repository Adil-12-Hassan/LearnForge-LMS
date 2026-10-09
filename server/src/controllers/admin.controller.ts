import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../types/index.js';
import { adminService } from '../services/admin.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const userIdParam = (value: string | string[] | undefined): string => {
    const userId = Array.isArray(value) ? value[0] : value;
    if (!userId) {
        throw Object.assign(new Error('User ID is required'), {
            statusCode: 400,
            isOperational: true,
        });
    }
    return userId;
};

const courseIdParam = (value: string | string[] | undefined): string => {
    const courseId = Array.isArray(value) ? value[0] : value;
    if (!courseId) {
        throw Object.assign(new Error('Course ID is required'), {
            statusCode: 400,
            isOperational: true,
        });
    }
    return courseId;
};

const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
});

export const getStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await adminService.getStats();
    return sendSuccess(res, { stats });
});

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, search } = listQuerySchema.parse(req.query);
    const data = await adminService.getUsers(page, limit, search);
    return sendSuccess(res, data);
});

export const updateUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = userIdParam(req.params.userId);
    const { role } = z.object({
        role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
    }).parse(req.body);
    const user = await adminService.updateUserRole(userId, role, req.user!.id);
    return sendSuccess(res, { user });
});

export const updateUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = userIdParam(req.params.userId);
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const user = await adminService.updateUserStatus(userId, isActive, req.user!.id);
    return sendSuccess(res, { user });
});

export const getCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, search } = listQuerySchema.parse(req.query);
    const data = await adminService.getCourses(page, limit, search);
    return sendSuccess(res, data);
});

export const deleteCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = courseIdParam(req.params.courseId);
    await adminService.deleteCourse(courseId);
    return sendSuccess(res, { message: 'Course deleted' });
});
