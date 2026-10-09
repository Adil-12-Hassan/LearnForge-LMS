import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { messageService } from '../services/message.service.js';
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

// Send a message
export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { receiverId, body } = req.body;
    const sentMessage = await messageService.sendMessage(req.user!.id, receiverId, body);
    return sendSuccess(res, { message: 'Message sent', sentMessage }, 201);
});

// Get conversation with a specific user
export const getConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const otherUserId = requiredParam(req.params.userId, 'User ID');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const data = await messageService.getConversation(req.user!.id, otherUserId, page, limit);
    return sendSuccess(res, data);
});

// Get all conversations list
export const getConversationList = asyncHandler(async (req: AuthRequest, res: Response) => {
    const threads = await messageService.getConversationList(req.user!.id);
    return sendSuccess(res, { threads });
});

// Get unread message count
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await messageService.getUnreadCount(req.user!.id);
    return sendSuccess(res, { unreadCount: count });
});
