import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { notificationService } from '../services/notification.service.js';
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

// Get my notifications
export const getMyNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await notificationService.getMyNotifications(req.user!.id, page, limit);
    return sendSuccess(res, data);
});

// Get unread count
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await notificationService.getUnreadCount(req.user!.id);
    return sendSuccess(res, { unreadCount: count });
});

// Mark single as read
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const notificationId = requiredParam(req.params.notificationId, 'Notification ID');
    const notification = await notificationService.markAsRead(notificationId, req.user!.id);
    return sendSuccess(res, { message: 'Notification marked as read', notification });
});

// Mark all as read
export const markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await notificationService.markAllAsRead(req.user!.id);
    return sendSuccess(res, { message: 'All notifications marked as read', ...result });
});

// Delete a notification
export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const notificationId = requiredParam(req.params.notificationId, 'Notification ID');
    await notificationService.deleteNotification(notificationId, req.user!.id);
    return sendSuccess(res, { message: 'Notification deleted' });
});