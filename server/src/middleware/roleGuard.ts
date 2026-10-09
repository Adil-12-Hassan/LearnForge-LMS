import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { sendError } from '../utils/apiResponse.js';
import { UserRole } from '../types/index.js';

export const requireRole = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return sendError(res, 'Forbidden', 403);
        }
        next();
    };
};