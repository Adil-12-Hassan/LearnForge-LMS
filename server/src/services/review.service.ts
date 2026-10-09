import { prisma } from '../config/database.js';

// | Types  |

interface CreateReviewInput {
    rating: number;
    body?: string;
    courseId: string;
}

interface UpdateReviewInput {
    rating?: number;
    body?: string;
}

// | Error helper   

function createError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode, isOperational: true });
}

// | Service  

export const reviewService = {

    // | STUDENT   |

    async createReview(data: CreateReviewInput, studentId: string) {
        // Must be enrolled and course must exist
        const enrollment = await prisma.enrollment.findFirst({
            where: { courseId: data.courseId, studentId, status: 'ACTIVE' },
        });
        if (!enrollment) throw createError('You must be enrolled in this course to leave a review', 403);

        // One review per student per course
        const existing = await prisma.review.findFirst({
            where: { courseId: data.courseId, studentId },
        });
        if (existing) throw createError('You have already reviewed this course', 409);

        return prisma.review.create({
            data: {
                rating: data.rating,
                body: data.body ?? null,
                studentId,
                courseId: data.courseId,
            },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
    },

    async updateReview(reviewId: string, data: UpdateReviewInput, studentId: string, role: string) {
        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) throw createError('Review not found', 404);

        // Only the author or admin can update
        if (role !== 'ADMIN' && review.studentId !== studentId) {
            throw createError('Forbidden — you did not write this review', 403);
        }

        return prisma.review.update({
            where: { id: reviewId },
            data: {
                rating: data.rating,
                body: data.body,
            },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
    },

    async deleteReview(reviewId: string, studentId: string, role: string) {
        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) throw createError('Review not found', 404);

        if (role !== 'ADMIN' && review.studentId !== studentId) {
            throw createError('Forbidden — you did not write this review', 403);
        }

        await prisma.review.delete({ where: { id: reviewId } });
    },

    // | PUBLIC   |─

    async getCourseReviews(courseId: string) {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true },
        });
        if (!course) throw createError('Course not found', 404);

        const reviews = await prisma.review.findMany({
            where: { courseId },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Compute summary stats
        const total = reviews.length;
        const avgRating = total > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
            : 0;

        // Distribution: how many reviews per star (1-5)
        const distribution = [1, 2, 3, 4, 5].reduce<Record<number, number>>((acc, star) => {
            acc[star] = reviews.filter(r => r.rating === star).length;
            return acc;
        }, {});

        return { reviews, total, avgRating, distribution };
    },

    async getMyReview(courseId: string, studentId: string) {
        const review = await prisma.review.findFirst({
            where: { courseId, studentId },
        });
        if (!review) throw createError('You have not reviewed this course yet', 404);
        return review;
    },
};