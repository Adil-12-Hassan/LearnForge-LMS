import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import * as reviewController from '../controllers/review.controller.js';

const router: ReturnType<typeof Router> = Router();

// | Validation schemas ||||||||||||||||||||||||||||

const createReviewSchema = z.object({
    body: z.object({
        rating: z.number().int().min(1, 'Rating min is 1').max(5, 'Rating max is 5'),
        body: z.string().min(1).optional(),
        courseId: z.string().min(1, 'courseId is required'),
    }),
});

const updateReviewSchema = z.object({
    body: z.object({
        rating: z.number().int().min(1).max(5).optional(),
        body: z.string().min(1).optional(),
    }).refine(b => Object.keys(b).length > 0, { message: 'No fields to update' }),
});

// | PUBLIC routes (no auth needed) |||||||||||||||||||||─

// Get all reviews + stats for a course
router.get(
    '/course/:courseId',
    reviewController.getCourseReviews,
);

// | AUTHENTICATED routes |||||||||||||||||||||||||||

// Create review (student must be enrolled, 1 per course)
router.post(
    '/',
    auth,
    validate(createReviewSchema),
    reviewController.createReview,
);

// Get my review for a course
router.get(
    '/course/:courseId/me',
    auth,
    reviewController.getMyReview,
);

// Update my review (or Admin)
router.patch(
    '/:reviewId',
    auth,
    validate(updateReviewSchema),
    reviewController.updateReview,
);

// Delete my review (or Admin)
router.delete(
    '/:reviewId',
    auth,
    reviewController.deleteReview,
);

export default router;