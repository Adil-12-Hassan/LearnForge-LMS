import type { Response } from 'express';

export const sendSuccess = (
    res: Response,
    data: unknown,
    statusCode = 200,
    pagination?: object
) => {
    return res.status(statusCode).json({
        success: true,
        data,
        ...(pagination && { pagination }),
    });
};

export const sendError = (
    res: Response,
    message: string,
    statusCode = 400
) => {
    return res.status(statusCode).json({
        success: false,
        error: message,
    });
};
