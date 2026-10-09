import { prisma } from '../config/database.js';

export const lectureService = {

    async verifyOwner(sectionId: string, instructorId: string) {
        const section = await prisma.section.findFirst({
            where: { id: sectionId },
            include: { course: { select: { instructorId: true } } },
        });
        if (!section || section.course.instructorId !== instructorId) {
            throw Object.assign(new Error('Section not found or access denied'), { statusCode: 404 });
        }
        return section;
    },

    async create(sectionId: string, instructorId: string, data: {
        title: string;
        type: string;
        isFree?: boolean;
        content?: string;
    }) {
        await this.verifyOwner(sectionId, instructorId);
        const count = await prisma.lecture.count({ where: { sectionId } });

        const lecture = await prisma.lecture.create({
            data: {
                sectionId,
                title: data.title,
                type: data.type as any,
                isFree: data.isFree ?? false,
                content: data.content,
                position: count + 1,
            },
        });

        // Update totalLectures on course
        const section = await prisma.section.findUnique({ where: { id: sectionId } });
        await prisma.course.update({
            where: { id: section!.courseId },
            data: { totalLectures: { increment: 1 } },
        });

        return lecture;
    },

    async update(id: string, sectionId: string, instructorId: string, data: {
        title?: string;
        isFree?: boolean;
        content?: string;
        videoUrl?: string;
        resourceUrl?: string;
        duration?: number;
        videoStatus?: string;
    }) {
        await this.verifyOwner(sectionId, instructorId);
        const lecture = await prisma.lecture.findFirst({ where: { id, sectionId }, select: { id: true } });
        if (!lecture) throw Object.assign(new Error('Lecture not found'), { statusCode: 404 });
        return prisma.lecture.update({
            where: { id },
            data: {
                ...data,
                ...(data.videoStatus && { videoStatus: data.videoStatus as any }),
            },
        });
    },

    async reorder(sectionId: string, instructorId: string, orderedIds: string[]) {
        await this.verifyOwner(sectionId, instructorId);
        const updates = orderedIds.map((id, index) =>
            prisma.lecture.updateMany({ where: { id, sectionId }, data: { position: index + 1 } })
        );
        await prisma.$transaction(updates);
    },

    async delete(id: string, sectionId: string, instructorId: string) {
        await this.verifyOwner(sectionId, instructorId);
        const deleted = await prisma.lecture.deleteMany({ where: { id, sectionId } });
        if (!deleted.count) throw Object.assign(new Error('Lecture not found'), { statusCode: 404 });

        // Decrement totalLectures
        const section = await prisma.section.findUnique({ where: { id: sectionId } });
        await prisma.course.update({
            where: { id: section!.courseId },
            data: { totalLectures: { decrement: 1 } },
        });
    },

    async updateProgress(lectureId: string, enrollmentId: string, studentId: string, watchedSecs: number) {
        const lecture = await prisma.lecture.findUnique({
            where: { id: lectureId },
            select: { duration: true, section: { select: { courseId: true } } },
        });
        if (!lecture) throw Object.assign(new Error('Lecture not found'), { statusCode: 404 });
        const enrollment = await prisma.enrollment.findFirst({
            where: { id: enrollmentId, studentId, courseId: lecture.section.courseId, status: 'ACTIVE' },
            select: { id: true },
        });
        if (!enrollment) throw Object.assign(new Error('Enrollment not found or access denied'), { statusCode: 403 });
        const existing = await prisma.lectureProgress.findUnique({
            where: { enrollmentId_lectureId: { enrollmentId, lectureId } },
        });

        const isCompleted = lecture?.duration
            ? watchedSecs >= lecture.duration * 0.9
            : watchedSecs > 0;

        if (existing) {
            return prisma.lectureProgress.update({
                where: { enrollmentId_lectureId: { enrollmentId, lectureId } },
                data: {
                    watchedSecs,
                    isCompleted,
                    ...(isCompleted && !existing.isCompleted && { completedAt: new Date() }),
                },
            });
        }

        return prisma.lectureProgress.create({
            data: {
                enrollmentId, lectureId, watchedSecs, isCompleted,
                ...(isCompleted && { completedAt: new Date() }),
            },
        });
    },
};
