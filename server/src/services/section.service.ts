import { prisma } from '../config/database.js';

export const sectionService = {

    async verifyOwner(courseId: string, instructorId: string) {
        const course = await prisma.course.findFirst({ where: { id: courseId, instructorId } });
        if (!course) throw Object.assign(new Error('Course not found or access denied'), { statusCode: 404 });
        return course;
    },

    async create(courseId: string, instructorId: string, title: string) {
        await this.verifyOwner(courseId, instructorId);
        const count = await prisma.section.count({ where: { courseId } });
        return prisma.section.create({
            data: { courseId, title, position: count + 1 },
        });
    },

    async update(id: string, courseId: string, instructorId: string, title: string) {
        await this.verifyOwner(courseId, instructorId);
        const section = await prisma.section.updateMany({ where: { id, courseId }, data: { title } });
        if (!section.count) throw Object.assign(new Error('Section not found'), { statusCode: 404 });
        return prisma.section.findUnique({ where: { id } });
    },

    async reorder(courseId: string, instructorId: string, orderedIds: string[]) {
        await this.verifyOwner(courseId, instructorId);
        const updates = orderedIds.map((id, index) =>
            prisma.section.updateMany({ where: { id, courseId }, data: { position: index + 1 } })
        );
        await prisma.$transaction(updates);
    },

    async delete(id: string, courseId: string, instructorId: string) {
        await this.verifyOwner(courseId, instructorId);
        const deleted = await prisma.section.deleteMany({ where: { id, courseId } });
        if (!deleted.count) throw Object.assign(new Error('Section not found'), { statusCode: 404 });
    },

    async getCurriculum(courseId: string) {
        return prisma.section.findMany({
            where: { courseId },
            orderBy: { position: 'asc' },
            include: {
                lectures: {
                    orderBy: { position: 'asc' },
                    select: {
                        id: true, title: true, type: true,
                        duration: true, isFree: true, position: true,
                        videoStatus: true,
                    },
                },
            },
        });
    },
};
