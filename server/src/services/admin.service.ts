import { prisma } from '../config/database.js';

// | Error helper 

function createError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode, isOperational: true });
}

// | Service  

export const adminService = {

    // Platform-wide stats for dashboard
    async getStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalUsers,
            newUsersThisMonth,
            usersByRole,
            totalCourses,
            coursesByStatus,
            totalEnrollments,
            completedEnrollments,
            revenue,
            totalReviews,
            avgRatingRaw,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
            prisma.course.count(),
            prisma.course.groupBy({ by: ['status'], _count: { id: true } }),
            prisma.enrollment.count(),
            prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
            prisma.enrollment.aggregate({ _sum: { pricePaid: true } }),
            prisma.review.count(),
            prisma.review.aggregate({ _avg: { rating: true } }),
        ]);

        return {
            users: {
                total: totalUsers,
                newThisMonth: newUsersThisMonth,
                byRole: Object.fromEntries(
                    usersByRole.map(r => [r.role, r._count.id]),
                ),
            },
            courses: {
                total: totalCourses,
                byStatus: Object.fromEntries(
                    coursesByStatus.map(c => [c.status, c._count.id]),
                ),
            },
            enrollments: {
                total: totalEnrollments,
                completed: completedEnrollments,
                active: totalEnrollments - completedEnrollments,
            },
            revenue: {
                total: Number(revenue._sum.pricePaid ?? 0),
            },
            reviews: {
                total: totalReviews,
                avgRating: avgRatingRaw._avg.rating
                    ? Math.round(avgRatingRaw._avg.rating * 10) / 10
                    : 0,
            },
        };
    },

    // Paginated user list with search
    async getUsers(page = 1, limit = 20, search?: string) {
        const skip = (page - 1) * limit;
        const where = search
            ? {
                OR: [
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                    { username: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    isVerified: true,
                    createdAt: true,
                    _count: { select: { enrollments: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        return { users, total, page, totalPages: Math.ceil(total / limit) };
    },

    // Change a user's role
    async updateUserRole(targetId: string, role: string, adminId: string) {
        if (targetId === adminId) throw createError('You cannot change your own role', 400);

        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user) throw createError('User not found', 404);

        const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
        if (!validRoles.includes(role)) throw createError('Invalid role', 400);

        return prisma.user.update({
            where: { id: targetId },
            data: { role: role as any },
            select: { id: true, email: true, role: true },
        });
    },

    // Activate / deactivate a user
    async updateUserStatus(targetId: string, isActive: boolean, adminId: string) {
        if (targetId === adminId) throw createError('You cannot deactivate yourself', 400);

        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user) throw createError('User not found', 404);

        return prisma.user.update({
            where: { id: targetId },
            data: { isActive },
            select: { id: true, email: true, isActive: true },
        });
    },

    // Paginated course list for admin (all statuses)
    async getCourses(page = 1, limit = 20, search?: string) {
        const skip = (page - 1) * limit;
        const where = search
            ? {
                OR: [
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { slug: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const [courses, total] = await Promise.all([
            prisma.course.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    status: true,
                    price: true,
                    createdAt: true,
                    instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
                    _count: { select: { enrollments: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.course.count({ where }),
        ]);

        return { courses, total, page, totalPages: Math.ceil(total / limit) };
    },

    // Force-delete a course (regardless of status) — admin power
    async deleteCourse(courseId: string) {
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) throw createError('Course not found', 404);

        // Delete in dependency order
        await prisma.quizResult.deleteMany({
            where: { quiz: { courseId } },
        });
        await prisma.question.deleteMany({
            where: { quiz: { courseId } },
        });
        await prisma.quiz.deleteMany({ where: { courseId } });
        await prisma.submission.deleteMany({
            where: { assignment: { courseId } },
        });
        await prisma.assignment.deleteMany({ where: { courseId } });
        await prisma.review.deleteMany({ where: { courseId } });
        await prisma.certificate.deleteMany({ where: { courseId } });
        await prisma.lectureProgress.deleteMany({
            where: { enrollment: { courseId } },
        });
        await prisma.enrollment.deleteMany({ where: { courseId } });
        await prisma.lecture.deleteMany({
            where: { section: { courseId } },
        });
        await prisma.section.deleteMany({ where: { courseId } });
        await prisma.courseTag.deleteMany({ where: { courseId } });
        await prisma.course.delete({ where: { id: courseId } });
    },
};