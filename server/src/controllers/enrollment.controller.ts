import { Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { enrollmentService } from '../services/enrollment.service.js';
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

export const enrollFree = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = z.object({ courseId: z.string() }).parse(req.body);
    const enrollment = await enrollmentService.enrollFree(req.user!.id, courseId);
    return sendSuccess(res, enrollment, 201);
});

export const getMyEnrollments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const enrollments = await enrollmentService.getMyEnrollments(req.user!.id);
    return sendSuccess(res, enrollments);
});

export const getCourseProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const progress = await enrollmentService.getCourseProgress(
        req.user!.id, courseId
    );
    return sendSuccess(res, progress);
});

export const checkEnrollment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const enrolled = await enrollmentService.isEnrolled(req.user!.id, courseId);
    return sendSuccess(res, { enrolled });
});

export const markCourseComplete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const result = await enrollmentService.markComplete(req.user!.id, courseId);
    return sendSuccess(res, { message: 'Course completed! Certificate issued.', enrollment: result });
});
