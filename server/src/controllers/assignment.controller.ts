import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { assignmentService } from '../services/assignment.service.js';
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

export const createAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await assignmentService.createAssignment(
        req.body,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Assignment created', assignment }, 201);
});

export const updateAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignmentId = requiredParam(req.params.assignmentId, 'Assignment ID');
    const assignment = await assignmentService.updateAssignment(
        assignmentId,
        req.body,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Assignment updated', assignment });
});

export const deleteAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignmentId = requiredParam(req.params.assignmentId, 'Assignment ID');
    await assignmentService.deleteAssignment(
        assignmentId,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Assignment deleted' });
});

export const getCourseAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const courseId = requiredParam(req.params.courseId, 'Course ID');
    const assignments = await assignmentService.getCourseAssignments(courseId);
    return sendSuccess(res, { assignments });
});

export const getAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignmentId = requiredParam(req.params.assignmentId, 'Assignment ID');
    const assignment = await assignmentService.getAssignment(assignmentId);
    return sendSuccess(res, { assignment });
});

export const getSubmissions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignmentId = requiredParam(req.params.assignmentId, 'Assignment ID');
    const submissions = await assignmentService.getSubmissions(
        assignmentId,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { submissions });
});

export const gradeSubmission = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignmentId = requiredParam(req.params.assignmentId, 'Assignment ID');
    const submissionId = requiredParam(req.params.submissionId, 'Submission ID');
    const submission = await assignmentService.gradeSubmission(
        assignmentId,
        submissionId,
        req.body,
        req.user!.id,
        req.user!.role,
    );
    return sendSuccess(res, { message: 'Submission graded', submission });
});

// | STUDENT  

export const submitAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignmentId = requiredParam(req.params.assignmentId, 'Assignment ID');
    const submission = await assignmentService.submitAssignment(
        assignmentId,
        req.body,
        req.user!.id,
    );
    return sendSuccess(res, { message: 'Assignment submitted', submission }, 201);
});

export const getMySubmission = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignmentId = requiredParam(req.params.assignmentId, 'Assignment ID');
    const submission = await assignmentService.getMySubmission(
        assignmentId,
        req.user!.id,
    );
    return sendSuccess(res, { submission });
});
