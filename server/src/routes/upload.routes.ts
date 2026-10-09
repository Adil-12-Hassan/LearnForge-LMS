import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { uploadImage, uploadVideo, uploadPdf, handleUploadError } from '../middleware/uploadMiddleware.js';
import { uploadAvatar, uploadThumbnail, uploadVideo as uploadVideoCtrl, uploadPdf as uploadPdfCtrl } from '../controllers/upload.controller.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router: ReturnType<typeof Router> = Router();

router.post('/avatar', auth, uploadLimiter, uploadImage.single('file'), handleUploadError, uploadAvatar);
router.post('/thumbnail', auth, uploadLimiter, uploadImage.single('file'), handleUploadError, uploadThumbnail);
router.post('/video', auth, uploadLimiter, uploadVideo.single('file'), handleUploadError, uploadVideoCtrl);
router.post('/pdf', auth, uploadLimiter, uploadPdf.single('file'), handleUploadError, uploadPdfCtrl);

export default router;
