import { Response } from 'express';
import { Readable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import { AuthRequest } from '../types/index.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { CLOUDINARY_FOLDERS } from '../config/cloudinary.js';

const uploadToCloudinary = (
    buffer: Buffer,
    folder: string,
    resourceType: 'image' | 'video' | 'raw'
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        Readable.from([buffer]).pipe(stream);
    });
};

const hasFileSignature = (buffer: Buffer, kind: 'image' | 'video' | 'pdf') => {
    if (kind === 'image') {
        return (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
            || buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
            || (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP');
    }
    if (kind === 'pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    return (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp')
        || buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
};

const validateSignature = (req: AuthRequest, res: Response, kind: 'image' | 'video' | 'pdf') => {
    if (!req.file) return sendError(res, 'No file provided', 400);
    if (!hasFileSignature(req.file.buffer, kind)) return sendError(res, 'File content does not match an allowed file type', 400);
    return null;
};

export const uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
    const invalid = validateSignature(req, res, 'image');
    if (invalid) return invalid;
    if (!req.file) return sendError(res, 'No file provided', 400);
    const result = await uploadToCloudinary(req.file.buffer, CLOUDINARY_FOLDERS.avatars, 'image');
    return sendSuccess(res, { url: result.secure_url, publicId: result.public_id });
});

export const uploadThumbnail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const invalid = validateSignature(req, res, 'image');
    if (invalid) return invalid;
    if (!req.file) return sendError(res, 'No file provided', 400);
    const result = await uploadToCloudinary(req.file.buffer, CLOUDINARY_FOLDERS.thumbnails, 'image');
    return sendSuccess(res, { url: result.secure_url, publicId: result.public_id });
});

export const uploadVideo = asyncHandler(async (req: AuthRequest, res: Response) => {
    const invalid = validateSignature(req, res, 'video');
    if (invalid) return invalid;
    if (!req.file) return sendError(res, 'No file provided', 400);
    const result = await uploadToCloudinary(req.file.buffer, CLOUDINARY_FOLDERS.videos, 'video');
    return sendSuccess(res, { url: result.secure_url, publicId: result.public_id, duration: result.duration });
});

export const uploadPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
    const invalid = validateSignature(req, res, 'pdf');
    if (invalid) return invalid;
    if (!req.file) return sendError(res, 'No file provided', 400);
    const result = await uploadToCloudinary(req.file.buffer, CLOUDINARY_FOLDERS.pdfs, 'raw');
    return sendSuccess(res, { url: result.secure_url, publicId: result.public_id });
});
