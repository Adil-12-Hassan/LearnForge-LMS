import type { NextFunction, Response } from 'express';
import { allowedOrigins } from '../config/origins.js';
import type { AuthRequest } from '../types/index.js';
import { sendError } from '../utils/apiResponse.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfProtection = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (safeMethods.has(req.method)) return next();

    const origin = req.get('origin');
    const fetchSite = req.get('sec-fetch-site');

    if (origin && !allowedOrigins.includes(origin)) {
        return sendError(res, 'Request origin is not allowed', 403);
    }

    if (!origin && fetchSite === 'cross-site') {
        return sendError(res, 'Cross-site requests are not allowed', 403);
    }

    return next();
};
