import { prisma } from '../config/database.js';

// | Types  |

type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';

interface OptionInput {
    id: string;    // 'a' | 'b' | 'c' | 'd'
    text: string;
}

interface CreateQuizInput {
    title: string;
    timeLimit?: number;
    passMark?: number;
    courseId: string;
}

interface UpdateQuizInput {
    title?: string;
    timeLimit?: number | null;
    passMark?: number;
}

interface QuestionInput {
    text: string;
    type: QuestionType;
    options?: OptionInput[];     // required for MCQ / TRUE_FALSE
    correctAnswer: string;       // option id for MCQ/TF | 'true'/'false' for TF | raw text for SHORT
    points?: number;
    position?: number;
}

interface AnswerInput {
    questionId: string;
    answer: string;
}

function createError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode, isOperational: true });
}

// Ownership guards 
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

async function assertQuizOwner(quizId: string, userId: string, role: string) {
    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { course: { select: { instructorId: true } } },
    });
    if (!quiz) throw createError('Quiz not found', 404);
    if (role !== 'ADMIN' && quiz.course.instructorId !== userId) {
        throw createError('Forbidden — you do not own this quiz', 403);
    }
    return quiz;
}

// | Auto-grader   ─
// MCQ / TRUE_FALSE  → exact match (case-insensitive)
// SHORT_ANSWER      → not auto-graded; earns 0 until teacher review (Phase 4)

function grade(questions: any[], answers: AnswerInput[]) {
    let earned = 0;
    let total = 0;
    const detail: Record<
        string,
        { correct: boolean; pointsEarned: number; correctAnswer: string; studentAnswer: string }
    > = {};

    for (const q of questions) {
        total += q.points;
        const hit = answers.find(a => a.questionId === q.id);
        const studentAnswer = hit?.answer ?? '';
        let correct = false;

        if (hit && (q.type === 'MCQ' || q.type === 'TRUE_FALSE')) {
            correct = studentAnswer.toLowerCase() === q.correctAnswer.toLowerCase();
        }

        const pointsEarned = correct ? q.points : 0;
        earned += pointsEarned;

        detail[q.id] = { correct, pointsEarned, correctAnswer: q.correctAnswer, studentAnswer };
    }

    return { earned, total, detail };
}

// | Service  

export const quizService = {

    // | TEACHER   |

    async createQuiz(data: CreateQuizInput, userId: string, role: string) {
        await assertCourseOwner(data.courseId, userId, role);
        return prisma.quiz.create({
            data: {
                title: data.title,
                timeLimit: data.timeLimit ?? null,
                passMark: data.passMark ?? 70,
                courseId: data.courseId,
            },
        });
    },

    async updateQuiz(quizId: string, data: UpdateQuizInput, userId: string, role: string) {
        await assertQuizOwner(quizId, userId, role);
        return prisma.quiz.update({ where: { id: quizId }, data });
    },

    async deleteQuiz(quizId: string, userId: string, role: string) {
        await assertQuizOwner(quizId, userId, role);
        // Must delete children first (no cascade in Supabase SQL schema)
        await prisma.quizResult.deleteMany({ where: { quizId } });
        await prisma.question.deleteMany({ where: { quizId } });
        await prisma.quiz.delete({ where: { id: quizId } });
    },

    async getCourseQuizzes(courseId: string) {
        return prisma.quiz.findMany({
            where: { courseId },
            include: {
                _count: { select: { questions: true, quizResult: true } },
            },
            orderBy: { title: 'asc' },
        });
    },

    // Teacher sees questions WITH correctAnswer
    async getQuizDetail(quizId: string, userId: string, role: string) {
        await assertQuizOwner(quizId, userId, role);
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { questions: { orderBy: { position: 'asc' } } },
        });
        if (!quiz) throw createError('Quiz not found', 404);
        return quiz;
    },

    // | QUESTIONS   

    async addQuestion(quizId: string, data: QuestionInput, userId: string, role: string) {
        await assertQuizOwner(quizId, userId, role);

        // Auto-position: append after last question
        if (data.position === undefined) {
            const last = await prisma.question.findFirst({
                where: { quizId },
                orderBy: { position: 'desc' },
            });
            data.position = last ? last.position + 1 : 1;
        }

        return prisma.question.create({
            data: {
                text: data.text,
                type: data.type as any,
                options: (data.options ?? []) as any,
                correctAnswer: data.correctAnswer,
                points: data.points ?? 1,
                position: data.position,
                quizId,
            },
        });
    },

    async updateQuestion(
        quizId: string,
        questionId: string,
        data: Partial<QuestionInput>,
        userId: string,
        role: string,
    ) {
        await assertQuizOwner(quizId, userId, role);
        const question = await prisma.question.findFirst({ where: { id: questionId, quizId } });
        if (!question) throw createError('Question not found', 404);
        return prisma.question.update({ where: { id: questionId }, data: data as any });
    },

    async deleteQuestion(quizId: string, questionId: string, userId: string, role: string) {
        await assertQuizOwner(quizId, userId, role);
        const question = await prisma.question.findFirst({ where: { id: questionId, quizId } });
        if (!question) throw createError('Question not found', 404);
        await prisma.question.delete({ where: { id: questionId } });
    },

    async reorderQuestions(quizId: string, orderedIds: string[], userId: string, role: string) {
        await assertQuizOwner(quizId, userId, role);
        await Promise.all(
            orderedIds.map((id, idx) =>
                prisma.question.updateMany({
                    where: { id, quizId },
                    data: { position: idx + 1 },
                }),
            ),
        );
    },

    // | STUDENT   |

    // Returns questions WITHOUT correctAnswer — safe to send to client
    async startQuiz(quizId: string, studentId: string) {
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    orderBy: { position: 'asc' },
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        points: true,
                        position: true,
                        // correctAnswer intentionally omitted
                    },
                },
            },
        });
        if (!quiz) throw createError('Quiz not found', 404);

        const enrollment = await prisma.enrollment.findFirst({
            where: { courseId: quiz.courseId, studentId, status: 'ACTIVE' },
        });
        if (!enrollment) throw createError('You are not enrolled in this course', 403);

        return {
            quizId: quiz.id,
            title: quiz.title,
            timeLimit: quiz.timeLimit,
            passMark: quiz.passMark,
            questions: quiz.questions,
            startedAt: new Date().toISOString(),
        };
    },

    async submitQuiz(
        quizId: string,
        answers: AnswerInput[],
        startedAt: string,
        studentId: string,
    ) {
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { questions: { orderBy: { position: 'asc' } } },
        });
        if (!quiz) throw createError('Quiz not found', 404);

        const enrollment = await prisma.enrollment.findFirst({
            where: { courseId: quiz.courseId, studentId, status: 'ACTIVE' },
        });
        if (!enrollment) throw createError('You are not enrolled in this course', 403);

        const { earned, total, detail } = grade(quiz.questions, answers);

        // Score stored as percentage (0-100), consistent with passMark
        const scorePercent = total > 0 ? Math.round((earned / total) * 100) : 0;
        const passed = scorePercent >= quiz.passMark;

        const result = await prisma.quizResult.create({
            data: {
                studentId,
                quizId,
                score: scorePercent,
                passed,
                answers: detail as any,
                startedAt: new Date(startedAt),
                completedAt: new Date(),
            },
        });

        return {
            resultId: result.id,
            score: scorePercent,
            passed,
            passMark: quiz.passMark,
            earnedPoints: earned,
            totalPoints: total,
            detail,
        };
    },

    async getMyResults(quizId: string, studentId: string) {
        const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true } });
        if (!quiz) throw createError('Quiz not found', 404);

        return prisma.quizResult.findMany({
            where: { quizId, studentId },
            orderBy: { completedAt: 'desc' },
        });
    },
};
