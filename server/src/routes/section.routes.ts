import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleGuard.js';
import {
    getCurriculum, createSection, updateSection,
    reorderSections, deleteSection,
} from '../controllers/section.controller.js';

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

router.get('/', getCurriculum);
router.post('/', auth, requireRole('TEACHER', 'ADMIN'), createSection);
router.patch('/reorder', auth, requireRole('TEACHER', 'ADMIN'), reorderSections);
router.patch('/:sId', auth, requireRole('TEACHER', 'ADMIN'), updateSection);
router.delete('/:sId', auth, requireRole('TEACHER', 'ADMIN'), deleteSection);

export default router;