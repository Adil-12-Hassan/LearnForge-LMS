import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwtHelpers.js';
import { sendError } from '../utils/apiResponse.js';
import { AuthRequest } from '../types/index.js';

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken;
    if (!token) {
        return sendError(res, 'No token provided', 401);
    }
    try {
        const payload = verifyAccessToken(token);
        if (!payload.sub || !['STUDENT', 'TEACHER', 'ADMIN'].includes(payload.role ?? '')) {
            return sendError(res, 'Invalid or expired token', 401);
        }
        req.user = { id: payload.sub, role: payload.role as any, email: '' };
        next();
    } catch {
        return sendError(res, 'Invalid or expired token', 401);
    }
};
