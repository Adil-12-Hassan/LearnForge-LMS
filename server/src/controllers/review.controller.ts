import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { reviewService } from '../services/review.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// | Param helper   

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

// | PUBLIC  ─

export const getCourseReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const data = await reviewService.getCourseReviews(courseId);
    return sendSuccess(res, data);
});

// | STUDENT  

export const createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const review = await reviewService.createReview(req.body, req.user!.id);
    return sendSuccess(res, { message: 'Review submitted', review }, 201);
});

export const updateReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reviewId = requiredParam(req.params.reviewId, 'Review ID');
    const review = await reviewService.updateReview(
        reviewId,
        req.body,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Review updated', review });
});

export const deleteReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reviewId = requiredParam(req.params.reviewId, 'Review ID');
    await reviewService.deleteReview(reviewId, req.user!.id, req.user!.role);
    return sendSuccess(res, { message: 'Review deleted' });
});

export const getMyReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const review = await reviewService.getMyReview(courseId, req.user!.id);
    return sendSuccess(res, { review });
});