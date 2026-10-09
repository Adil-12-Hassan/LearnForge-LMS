import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import * as assignmentController from '../controllers/assignment.controller.js';

const router: ReturnType<typeof Router> = Router();

// | Validation schemas ||||||||||||||||||||||||||||

const createAssignmentSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        instructions: z.string().min(1, 'Instructions are required'),
        dueDate: z.string().datetime({ message: 'dueDate must be ISO datetime' }).optional(),
        maxScore: z.number().int().positive().optional(),
        courseId: z.string().min(1, 'courseId is required'),
    }),
});

const updateAssignmentSchema = z.object({
    body: z.object({
        title: z.string().min(1).optional(),
        instructions: z.string().min(1).optional(),
        dueDate: z.string().datetime().nullable().optional(),
        maxScore: z.number().int().positive().optional(),
    }).refine(b => Object.keys(b).length > 0, { message: 'No fields to update' }),
});

const submitAssignmentSchema = z.object({
    body: z.object({
        content: z.string().min(1).optional(),
        fileUrl: z.string().url('fileUrl must be a valid URL').optional(),
    }).refine(
        b => b.content !== undefined || b.fileUrl !== undefined,
        { message: 'Provide at least content or fileUrl' },
    ),
});

const gradeSubmissionSchema = z.object({
    body: z.object({
        score: z.number().int().min(0, 'Score cannot be negative'),
        feedback: z.string().min(1).optional(),
    }),
});

// | TEACHER routes ||||||||||||||||||||||||||||||

// Create assignment
router.post(
    '/',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    validate(createAssignmentSchema),
    assignmentController.createAssignment,
);

// Get all assignments for a course
router.get(
    '/course/:courseId',
    auth,
    assignmentController.getCourseAssignments,
);

// Get single assignment
router.get(
    '/:assignmentId',
    auth,
    assignmentController.getAssignment,
);

// Update assignment
router.patch(
    '/:assignmentId',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    validate(updateAssignmentSchema),
    assignmentController.updateAssignment,
);

// Delete assignment + all its submissions
router.delete(
    '/:assignmentId',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    assignmentController.deleteAssignment,
);

// Get all submissions (Teacher view)
router.get(
    '/:assignmentId/submissions',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    assignmentController.getSubmissions,
);

// Grade a submission
router.patch(
    '/:assignmentId/submissions/:submissionId/grade',
    auth,
    requireRole('TEACHER', 'ADMIN'),
    validate(gradeSubmissionSchema),
    assignmentController.gradeSubmission,
);

// | STUDENT routes ||||||||||||||||||||||||||||||

// Submit assignment (create or overwrite if still PENDING)
router.post(
    '/:assignmentId/submit',
    auth,
    validate(submitAssignmentSchema),
    assignmentController.submitAssignment,
);

// Get my own submission
router.get(
    '/:assignmentId/my-submission',
    auth,
    assignmentController.getMySubmission,
);

export default router;