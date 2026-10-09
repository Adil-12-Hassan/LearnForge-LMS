import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const isValidationError = err instanceof ZodError;
    const statusCode = isValidationError ? 422 : err.statusCode || 500;
    const message = isValidationError
        ? err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
        : err.isOperational ? err.message : 'Internal Server Error';

    if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error:', err);
    }

    return res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
