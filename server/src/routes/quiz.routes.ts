import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import * as quizController from '../controllers/quiz.controller.js';

const router: ReturnType<typeof Router> = Router();

// | Validation schemas ||||||||||||||||||||||||||||

const createQuizSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        timeLimit: z.number().int().positive().optional(),
        passMark: z.number().int().min(0).max(100).optional(),
        courseId: z.string().min(1, 'courseId is required'),
    }),
});

const updateQuizSchema = z.object({
    body: z.object({
        title: z.string().min(1).optional(),
        timeLimit: z.number().int().positive().nullable().optional(),
        passMark: z.number().int().min(0).max(100).optional(),
    }).refine(b => Object.keys(b).length > 0, { message: 'No fields to update' }),
});

const optionSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1),
});

const addQuestionSchema = z.object({
    body: z.object({
        text: z.string().min(1, 'Question text is required'),
        type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']),
        options: z.array(optionSchema).optional(),
        correctAnswer: z.string().min(1, 'Correct answer is required'),
        points: z.number().int().positive().optional(),
        position: z.number().int().positive().optional(),
    }),
});

const updateQuestionSchema = z.object({
    body: z.object({
        text: z.string().min(1).optional(),
        type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']).optional(),
        options: z.array(optionSchema).optional(),
        correctAnswer: z.string().min(1).optional(),
        points: z.number().int().positive().optional(),
    }).refine(b => Object.keys(b).length > 0, { message: 'No fields to update' }),
});

const reorderSchema = z.object({
    body: z.object({
        orderedIds: z.array(z.string().min(1)).min(1, 'orderedIds must not be empty'),
    }),
});

const submitSchema = z.object({
    body: z.object({
        startedAt: z.string().datetime({ message: 'startedAt must be ISO datetime' }),
        answers: z.array(
            z.object({
                questionId: z.string().min(1),
                answer: z.string().min(1),
            }),
        ).min(1, 'answers array must not be empty'),
    }),
});

// | TEACHER routes ||||||||||||||||||||||||||||||

// Create quiz
router.post(
    '/',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    validate(createQuizSchema),
    quizController.createQuiz,
);

// Get all quizzes for a course (any authenticated user)
router.get(
    '/course/:courseId',
    auth,
    quizController.getCourseQuizzes,
);

// Get quiz with questions — teacher view (includes correctAnswer)
router.get(
    '/:quizId/detail',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    quizController.getQuizDetail,
);

// Update quiz
router.patch(
    '/:quizId',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    validate(updateQuizSchema),
    quizController.updateQuiz,
);

// Delete quiz + all its questions + all results
router.delete(
    '/:quizId',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    quizController.deleteQuiz,
);

// | Question routes |||||||||||||||||||||||||||||─
// NOTE: /reorder must be registered BEFORE /:questionId to avoid "reorder"
//       being matched as an ID by Express.

// Add question
router.post(
    '/:quizId/questions',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    validate(addQuestionSchema),
    quizController.addQuestion,
);

// Reorder questions
router.patch(
    '/:quizId/questions/reorder',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    validate(reorderSchema),
    quizController.reorderQuestions,
);

// Update single question
router.patch(
    '/:quizId/questions/:questionId',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    validate(updateQuestionSchema),
    quizController.updateQuestion,
);

// Delete question
router.delete(
    '/:quizId/questions/:questionId',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    quizController.deleteQuestion,
);

//  STUDENT routes 

// Start quiz — returns questions WITHOUT correctAnswer
router.get(
    '/:quizId/start',
    auth,
    quizController.startQuiz,
);

// Submit answers — auto-grades MCQ + TF, returns score + pass/fail
router.post(
    '/:quizId/submit',
    auth,
    validate(submitSchema),
    quizController.submitQuiz,
);

// Get my past results for this quiz
router.get(
    '/:quizId/results/me',
    auth,
    quizController.getMyResults,
);

export default router;