import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleGuard.js';
import {
    createLecture, updateLecture, reorderLectures,
    deleteLecture, updateProgress,
} from '../controllers/lecture.controller.js';
import { Return } from '@prisma/client/runtime/client';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

router.post('/', auth, requireRole('TEACHER', 'ADMIN'), createLecture);
router.patch('/reorder', auth, requireRole('TEACHER', 'ADMIN'), reorderLectures);
router.patch('/:lId', auth, requireRole('TEACHER', 'ADMIN'), updateLecture);
router.delete('/:lId', auth, requireRole('TEACHER', 'ADMIN'), deleteLecture);
router.patch('/:lId/progress', auth, updateProgress);

export default router;