import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleGuard.js';
import * as adminController from '../controllers/admin.controller.js';

const router: ReturnType<typeof Router> = Router();

router.use(auth, requireRole('ADMIN'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.get('/courses', adminController.getCourses);
router.delete('/courses/:courseId', adminController.deleteCourse);

export default router;
