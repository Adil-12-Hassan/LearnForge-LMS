import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { certificateService } from '../services/certificate.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const requiredParam = (value: string | string[] | undefined, name: string): string => {
    const param = Array.isArray(value) ? value[0] : value;
    if (!param) {
        throw Object.assign(new Error(`${name} is required`), {
            statusCode: 400,
            isOperational: true,
        });
    }
    return param;
};

// Get all my certificates
export const getMyCertificates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const certificates = await certificateService.getMyCertificates(req.user!.id);
    return sendSuccess(res, { certificates });
});

// Public verify endpoint — anyone can check if a cert is real
export const verifyCertificate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const certificateNo = requiredParam(req.params.certificateNo, 'Certificate number');
    const certificate = await certificateService.verify(certificateNo);
    return sendSuccess(res, { valid: true, certificate });
});