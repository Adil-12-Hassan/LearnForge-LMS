import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleGuard.js';
import {
    listCourses, getCourse, createCourse,
    updateCourse, publishCourse, deleteCourse, myTeacherCourses,
} from '../controllers/course.controller.js';

const router: ReturnType<typeof Router> = Router();

// Public
router.get('/', listCourses);
router.get('/:slug', getCourse);

// Teacher
router.post('/', auth, requireRole('TEACHER', 'ADMIN'), createCourse);
router.patch('/:id', auth, requireRole('TEACHER', 'ADMIN'), updateCourse);
router.patch('/:id/status', auth, requireRole('TEACHER', 'ADMIN'), publishCourse);
router.delete('/:id', auth, requireRole('TEACHER', 'ADMIN'), deleteCourse);
router.get('/teacher/my-courses', auth, requireRole('TEACHER', 'ADMIN'), myTeacherCourses);

export default router;