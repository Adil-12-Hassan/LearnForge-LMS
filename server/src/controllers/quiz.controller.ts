import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { quizService } from '../services/quiz.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

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

// | TEACHER 

export const createQuiz = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quiz = await quizService.createQuiz(req.body, req.user!.id, req.user!.role);
    return sendSuccess(res, { message: 'Quiz created', quiz }, 201);
});

export const updateQuiz = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    const quiz = await quizService.updateQuiz(
        quizId,
        req.body,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Quiz updated', quiz });
});

export const deleteQuiz = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    await quizService.deleteQuiz(quizId, req.user!.id, req.user!.role);
    return sendSuccess(res, { message: 'Quiz deleted' });
});

export const getCourseQuizzes = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const quizzes = await quizService.getCourseQuizzes(courseId);
    return sendSuccess(res, { quizzes });
});

// Teacher-only: includes correctAnswer in response
export const getQuizDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    const quiz = await quizService.getQuizDetail(
        quizId,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { quiz });
});

// | QUESTIONS   |─

export const addQuestion = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    const question = await quizService.addQuestion(
        quizId,
        req.body,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Question added', question }, 201);
});

export const updateQuestion = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    const questionId = requiredParam(req.params.questionId, 'Question ID');
    const question = await quizService.updateQuestion(
        quizId,
        questionId,
        req.body,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Question updated', question });
});

export const deleteQuestion = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    const questionId = requiredParam(req.params.questionId, 'Question ID');
    await quizService.deleteQuestion(
        quizId,
        questionId,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Question deleted' });
});

export const reorderQuestions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    await quizService.reorderQuestions(
        quizId,
        req.body.orderedIds,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Questions reordered' });
});

// | STUDENT  

export const startQuiz = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    const data = await quizService.startQuiz(quizId, req.user!.id);
    return sendSuccess(res, data);
});

export const submitQuiz = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { answers, startedAt } = req.body;
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    const result = await quizService.submitQuiz(
        quizId,
        answers,
        startedAt,
        req.user!.id,
    );
    return sendSuccess(res, result);
});

export const getMyResults = asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = requiredParam(req.params.quizId, 'Quiz ID');
    const results = await quizService.getMyResults(quizId, req.user!.id);
    return sendSuccess(res, { results });
});
