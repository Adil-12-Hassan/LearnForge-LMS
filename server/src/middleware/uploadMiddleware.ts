import multer from 'multer';
import { sendError } from '../utils/apiResponse.js';
import { Request, Response, NextFunction } from 'express';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_PDF_TYPES = ['application/pdf'];

const storage = multer.memoryStorage();

const createFilter = (allowed: string[]) =>
    (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
        }
    };

export const uploadImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: createFilter(ALLOWED_IMAGE_TYPES),
});

export const uploadVideo = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB; memory storage buffers the complete file
    fileFilter: createFilter(ALLOWED_VIDEO_TYPES),
});

export const uploadPdf = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: createFilter(ALLOWED_PDF_TYPES),
});

// Error handler for multer
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError || err.message) {
        return sendError(res, err.message, 400);
    }
    next(err);
};
