import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleGuard.js';
import {
    enrollFree, getMyEnrollments,
    getCourseProgress, checkEnrollment, markCourseComplete,
} from '../controllers/enrollment.controller.js';

const router: ReturnType<typeof Router> = Router();

router.post('/free', auth, requireRole('STUDENT', 'ADMIN'), enrollFree);
router.get('/me', auth, getMyEnrollments);
router.get('/:courseId/check', auth, checkEnrollment);
router.get('/:courseId/progress', auth, getCourseProgress);
router.post('/:courseId/complete', auth, requireRole('STUDENT'), markCourseComplete);

export default router;