import { prisma } from '../config/database.js';
import { redis, REDIS_KEYS } from '../config/redis.js';

export const enrollmentService = {

    //   Enroll in free course                       ─
    async enrollFree(studentId: string, courseId: string) {
        const course = await prisma.course.findUnique({
            where: { id: courseId, status: 'PUBLISHED' },
            select: { id: true, price: true, title: true },
        });

        if (!course) throw Object.assign(
            new Error('Course not found or not published'), { statusCode: 404 }
        );

        if (Number(course.price) > 0) throw Object.assign(
            new Error('This is a paid course. Please use checkout.'), { statusCode: 400 }
        );

        const existing = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId } },
        });

        if (existing) throw Object.assign(
            new Error('Already enrolled in this course'), { statusCode: 409 }
        );

        const enrollment = await prisma.enrollment.create({
            data: { studentId, courseId, pricePaid: 0 },
            include: {
                course: { select: { title: true, slug: true, thumbnailUrl: true } },
            },
        });

        return enrollment;
    },

    //   Get student's enrollments                     ─
    async getMyEnrollments(studentId: string) {
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId, status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            include: {
                course: {
                    select: {
                        id: true, slug: true, title: true,
                        thumbnailUrl: true, totalLectures: true,
                        instructor: { select: { firstName: true, lastName: true } },
                    },
                },
                lectureProgresses: {
                    select: { isCompleted: true },
                },
            },
        });

        // Calculate completion % for each enrollment
        return enrollments.map(e => {
            const total = e.course.totalLectures;
            const completed = e.lectureProgresses.filter(p => p.isCompleted).length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            return {
                ...e,
                lectureProgresses: undefined,
                progress: { completed, total, percentage },
            };
        });
    },

    //   Get course progress                        ─
    async getCourseProgress(studentId: string, courseId: string) {
        const enrollment = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId } },
            include: {
                lectureProgresses: {
                    include: {
                        lecture: { select: { title: true, type: true, duration: true } },
                    },
                },
                course: { select: { totalLectures: true } },
            },
        });

        if (!enrollment) throw Object.assign(
            new Error('Not enrolled in this course'), { statusCode: 404 }
        );

        const total = enrollment.course.totalLectures;
        const completed = enrollment.lectureProgresses.filter(p => p.isCompleted).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            enrollmentId: enrollment.id,
            status: enrollment.status,
            progress: { completed, total, percentage },
            lectures: enrollment.lectureProgresses,
        };
    },

    //   Check if student is enrolled                   ─
    async isEnrolled(studentId: string, courseId: string): Promise<boolean> {
        const enrollment = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId } },
            select: { id: true, status: true },
        });
        return !!enrollment && enrollment.status === 'ACTIVE';
    },

    //   Mark course complete                        
    async markComplete(studentId: string, courseId: string) {
        const enrollment = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId } },
            include: { course: { select: { totalLectures: true } } },
        });

        if (!enrollment) throw Object.assign(
            new Error('Enrollment not found'), { statusCode: 404 }
        );

        const completedCount = await prisma.lectureProgress.count({
            where: { enrollmentId: enrollment.id, isCompleted: true },
        });

        const total = enrollment.course.totalLectures;
        if (total > 0 && completedCount < total) throw Object.assign(
            new Error(`Complete all lectures first. Progress: ${completedCount}/${total}`),
            { statusCode: 400 }
        );

        const updated = await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
        });

        // Generate certificate
        await this._issueCertificate(studentId, courseId);

        return updated;
    },

    //  Issue certificate 
    async _issueCertificate(studentId: string, courseId: string) {
        const existing = await prisma.certificate.findUnique({
            where: { studentId_courseId: { studentId, courseId } },
        });
        if (existing) return existing;

        const count = await prisma.certificate.count();
        const certificateNo = `LF-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        return prisma.certificate.create({
            data: { studentId, courseId, certificateNo },
        });
    },
};