import { Router } from 'express';
import {
    loginLimiter,
    loginAccountLimiter,
    passwordResetLimiter,
    registerLimiter,
} from '../middleware/rateLimiter.js';
import { auth } from '../middleware/authMiddleware.js';
import {
    register, login, refresh, logout,
    verifyEmail, forgotPassword, resetPassword, getMe,
} from '../controllers/auth.controller.js';

const router: ReturnType<typeof Router> = Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, loginAccountLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/me', auth, getMe);

export default router;
