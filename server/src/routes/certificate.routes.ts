import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import * as certificateController from '../controllers/certificate.controller.js';
import { Return } from '@prisma/client/runtime/client';

const router: ReturnType<typeof Router> = Router();

// Public — verify any certificate by its number
router.get(
    '/verify/:certificateNo',
    certificateController.verifyCertificate,
);

// Student — get all their own certificates
router.get(
    '/me',
    auth,
    certificateController.getMyCertificates,
);

export default router;