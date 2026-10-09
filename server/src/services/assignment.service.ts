import { prisma } from '../config/database.js';

// | Types  |

interface CreateAssignmentInput {
    title: string;
    instructions: string;
    dueDate?: string;
    maxScore?: number;
    courseId: string;
}

interface UpdateAssignmentInput {
    title?: string;
    instructions?: string;
    dueDate?: string | null;
    maxScore?: number;
}

interface SubmitAssignmentInput {
    content?: string;
    fileUrl?: string;
}

interface GradeSubmissionInput {
    score: number;
    feedback?: string;
}

function createError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode, isOperational: true });
}

// | Ownership guards |||||||||||||||||||||||||||||

async function assertCourseOwner(courseId: string, userId: string, role: string) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true },
    });
    if (!course) throw createError('Course not found', 404);
    if (role !== 'ADMIN' && course.instructorId !== userId) {
        throw createError('Forbidden — you do not own this course', 403);
    }
}

async function assertAssignmentOwner(assignmentId: string, userId: string, role: string) {
    const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: { select: { instructorId: true } } },
    });
    if (!assignment) throw createError('Assignment not found', 404);
    if (role !== 'ADMIN' && assignment.course.instructorId !== userId) {
        throw createError('Forbidden — you do not own this assignment', 403);
    }
    return assignment;
}

// | Service  

export const assignmentService = {

    // | TEACHER   |

    async createAssignment(data: CreateAssignmentInput, userId: string, role: string) {
        await assertCourseOwner(data.courseId, userId, role);
        return prisma.assignment.create({
            data: {
                title: data.title,
                instructions: data.instructions,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                maxScore: data.maxScore ?? 100,
                courseId: data.courseId,
            },
        });
    },

    async updateAssignment(
        assignmentId: string,
        data: UpdateAssignmentInput,
        userId: string,
        role: string,
    ) {
        await assertAssignmentOwner(assignmentId, userId, role);
        return prisma.assignment.update({
            where: { id: assignmentId },
            data: {
                ...data,
                dueDate: data.dueDate === null
                    ? null
                    : data.dueDate
                        ? new Date(data.dueDate)
                        : undefined,
            },
        });
    },

    async deleteAssignment(assignmentId: string, userId: string, role: string) {
        await assertAssignmentOwner(assignmentId, userId, role);
        // Delete submissions first — no DB cascade in our schema
        await prisma.submission.deleteMany({ where: { assignmentId } });
        await prisma.assignment.delete({ where: { id: assignmentId } });
    },

    async getCourseAssignments(courseId: string) {
        return prisma.assignment.findMany({
            where: { courseId },
            include: { _count: { select: { submissions: true } } },
            orderBy: { dueDate: 'asc' },
        });
    },

    async getAssignment(assignmentId: string) {
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: { _count: { select: { submissions: true } } },
        });
        if (!assignment) throw createError('Assignment not found', 404);
        return assignment;
    },

    // Teacher: see all submissions for an assignment
    async getSubmissions(assignmentId: string, userId: string, role: string) {
        await assertAssignmentOwner(assignmentId, userId, role);
        return prisma.submission.findMany({
            where: { assignmentId },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
                },
            },
            orderBy: { submittedAt: 'desc' },
        });
    },

    // Teacher: grade a submission
    async gradeSubmission(
        assignmentId: string,
        submissionId: string,
        data: GradeSubmissionInput,
        userId: string,
        role: string,
    ) {
        const assignment = await assertAssignmentOwner(assignmentId, userId, role);

        if (data.score < 0 || data.score > assignment.maxScore) {
            throw createError(`Score must be between 0 and ${assignment.maxScore}`, 400);
        }

        const submission = await prisma.submission.findFirst({
            where: { id: submissionId, assignmentId },
        });
        if (!submission) throw createError('Submission not found', 404);

        return prisma.submission.update({
            where: { id: submissionId },
            data: {
                score: data.score,
                feedback: data.feedback ?? null,
                status: 'GRADED' as any,
                gradedAt: new Date(),
            },
        });
    },

    // | STUDENT   |

    async submitAssignment(
        assignmentId: string,
        data: SubmitAssignmentInput,
        studentId: string,
    ) {
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            select: { id: true, courseId: true, dueDate: true },
        });
        if (!assignment) throw createError('Assignment not found', 404);

        // Must be enrolled
        const enrollment = await prisma.enrollment.findFirst({
            where: { courseId: assignment.courseId, studentId, status: 'ACTIVE' },
        });
        if (!enrollment) throw createError('You are not enrolled in this course', 403);

        // Due date check
        if (assignment.dueDate && new Date() > assignment.dueDate) {
            throw createError('The due date for this assignment has passed', 400);
        }

        // One submission per student — re-submit overwrites if still PENDING
        const existing = await prisma.submission.findFirst({
            where: { assignmentId, studentId },
        });

        if (existing) {
            if (existing.status === 'GRADED') {
                throw createError('This assignment has already been graded and cannot be resubmitted', 400);
            }
            // Overwrite pending submission
            return prisma.submission.update({
                where: { id: existing.id },
                data: {
                    content: data.content ?? null,
                    fileUrl: data.fileUrl ?? null,
                    submittedAt: new Date(),
                },
            });
        }

        return prisma.submission.create({
            data: {
                studentId,
                assignmentId,
                content: data.content ?? null,
                fileUrl: data.fileUrl ?? null,
                status: 'PENDING' as any,
            },
        });
    },

    async getMySubmission(assignmentId: string, studentId: string) {
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            select: { id: true },
        });
        if (!assignment) throw createError('Assignment not found', 404);

        const submission = await prisma.submission.findFirst({
            where: { assignmentId, studentId },
        });
        if (!submission) throw createError('No submission found for this assignment', 404);
        return submission;
    },
};
