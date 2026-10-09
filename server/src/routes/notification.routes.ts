import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import * as notificationController from '../controllers/notification.controller.js';
import { Return } from '@prisma/client/runtime/client';

const router: ReturnType<typeof Router> = Router();

// All routes require auth

// Get my notifications (paginated)
router.get(
    '/',
    auth,
    notificationController.getMyNotifications,
);

// Get unread count only
router.get(
    '/unread-count',
    auth,
    notificationController.getUnreadCount,
);

// Mark all as read
router.patch(
    '/read-all',
    auth,
    notificationController.markAllAsRead,
);

// Mark single as read
router.patch(
    '/:notificationId/read',
    auth,
    notificationController.markAsRead,
);

// Delete a notification
router.delete(
    '/:notificationId',
    auth,
    notificationController.deleteNotification,
);

export default router;