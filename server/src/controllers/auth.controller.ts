import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';

//   Zod Schemas   
const registerSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    password: z.string().min(8),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    role: z.enum(['STUDENT', 'TEACHER']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
});

//   Cookie config  
const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1',
    maxAge: 15 * 60 * 1000,
};

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

//   Controllers   
export const register = asyncHandler(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    const user = await authService.register(data);
    return sendSuccess(res, {
        message: 'Registration successful. Please check your email to verify your account.',
        user,
    }, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.login(email, password);
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return sendSuccess(res, { user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken;
    if (!token) return sendError(res, 'No refresh token', 401);
    const { accessToken, refreshToken } = await authService.refresh(token);
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return sendSuccess(res, { message: 'Session refreshed' });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    return sendSuccess(res, { message: 'Logged out successfully' });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    if (!token) return sendError(res, 'Verification token is required', 400);
    await authService.verifyEmail(token);
    return sendSuccess(res, { message: 'Email verified successfully' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = forgotSchema.parse(req.body);
    await authService.forgotPassword(email);
    return sendSuccess(res, { message: 'If that email exists, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = resetSchema.parse(req.body);
    await authService.resetPassword(token, password);
    return sendSuccess(res, { message: 'Password reset successfully. You can now log in.' });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prisma } = await import('../config/database.js');
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
            id: true, email: true, username: true, firstName: true,
            lastName: true, role: true, avatarUrl: true, bio: true,
            headline: true, website: true, isVerified: true, createdAt: true,
        },
    });
    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, user);
});
