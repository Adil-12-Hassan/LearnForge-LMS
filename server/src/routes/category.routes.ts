import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { auth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleGuard.js';
const router: ReturnType<typeof Router> = Router();
router.get('/', getCategories);
router.post('/', auth, requireRole('ADMIN'), createCategory);
router.patch('/:id', auth, requireRole('ADMIN'), updateCategory);
router.delete('/:id', auth, requireRole('ADMIN'), deleteCategory);

export default router;