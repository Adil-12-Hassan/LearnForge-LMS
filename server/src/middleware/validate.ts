import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { sendError } from '../utils/apiResponse.js';

export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const message = result.error.issues
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            return sendError(res, message, 422);
        }
        req.body = result.data;
        next();
    };
};
